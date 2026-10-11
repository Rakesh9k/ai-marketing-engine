import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { generateStructuredText } from './index';
import { creativeTemplateRegistry } from '../creativeTemplateRegistry';
import { getVerticalConfigOrDefault } from '../../config/verticals';
import {
  CREATIVE_BRAIN_CONFIG,
  CreativeOpportunitySchema,
  CandidateConceptGenerationItemSchema,
  type CreativeBrainInput,
  type CreativeBrainResult,
  type CreativeOpportunity,
  type CreativeConcept,
  type CandidateConceptGenerationItem,
  type CreativeConceptScore,
  type ConceptScoreBreakdown,
  type CreativeBlueprint,
} from './creativeBrain.types';
import {
  buildOpportunityFormationPrompt,
  buildCandidateConceptsPrompt,
} from './prompts/creativeBrainPrompts';
import type { CreativeGrammarStep, CreativeTemplate } from '../../types';

import { CreativeBrainStateMachine } from './creativeBrainStateMachine';
import { OpportunityEngine } from './creativeBrain/opportunityEngine';
import {
  creativeBrainSessionService,
  type CreativeBrainSessionService,
} from './creativeBrain/session/creativeBrainSession.service';
import type { StrategicConfirmationActor } from './creativeBrain/session/strategicConfirmation.types';

export class CreativeBrainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_INPUT'
      | 'OPPORTUNITY_FORMATION_FAILED'
      | 'CONCEPT_EVALUATION_FAILED'
      | 'SCORE_BELOW_THRESHOLD',
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CreativeBrainError';
  }
}

/** What the model is asked for: the concept schema, with the id optional (assigned by us when it is missing). */
const CandidateConceptsLenientOutputSchema = z.object({
  concepts: z
    .array(CandidateConceptGenerationItemSchema.extend({ conceptId: z.string().optional() }))
    .min(2)
    .max(5),
});

/**
 * Opportunities that are NOT the model's: the deterministic baseline the OpportunityEngine builds when the model
 * call fails or its opportunity fails the quality / factuality gate. The Creative Brain keeps going with it (that is
 * the design), but it must never be reported as the model succeeding, so each one is remembered here with its reason
 * and surfaced as a labelled fallback on the result.
 */
const opportunityFallbackReasons = new WeakMap<object, string>();

export class CreativeBrainService {
  /**
   * Main entry point: Transforms input context into a validated Creative Blueprint.
   * Guarantees fallback emission on error — never throws unhandled exceptions.
   */
  async evaluateAndFormBlueprint(input: CreativeBrainInput): Promise<CreativeBrainResult> {
    const startTime = Date.now();
    let lastOpportunityFallbackReason: string | undefined;

    try {
      this.validateInput(input);

      // State Machine Knowledge-Resolution Audit & Transitioning
      const stateMachine = new CreativeBrainStateMachine(input);
      stateMachine.determineNextState(stateMachine.auditKnowledge());
      const audit = stateMachine.auditKnowledge();
      stateMachine.determineNextState(audit);

      // 1. Discover Strategic Opportunity
      const opportunity = await this.discoverOpportunity(input);
      const opportunityFallback = opportunityFallbackReasons.get(opportunity);
      lastOpportunityFallbackReason = opportunityFallback;
      stateMachine.determineNextState(audit);

      // 2. Generate Candidate Concepts (N = 3 default)
      const candidateCount = input.candidateCount || CREATIVE_BRAIN_CONFIG.DEFAULT_CANDIDATE_COUNT;
      const rawCandidates = await this.generateConceptCandidates(
        opportunity,
        input,
        candidateCount
      );
      stateMachine.determineNextState(audit);

      // 3. Score Concepts against 5 weighted dimensions + Hard Truth Gate
      const scoredConcepts = await this.scoreConcepts(rawCandidates, input, opportunity);
      stateMachine.determineNextState(audit);

      // 4. Select Winner (Highest score >= 70)
      const winningConcept = this.selectWinner(scoredConcepts);

      if (
        !winningConcept ||
        winningConcept.score.totalScore < CREATIVE_BRAIN_CONFIG.MIN_VIABILITY_THRESHOLD
      ) {
        aiLoggerWarn(
          'No concept met the minimum viability threshold (70 Pts). Triggering fallback.'
        );
        const fallback = this.buildFallbackBlueprint(
          input,
          'No candidate concept met the minimum viability threshold (70 Pts).'
        );
        return {
          success: true,
          blueprint: fallback,
          fallbackTriggered: true,
          executionTimeMs: Date.now() - startTime,
          error: {
            code: 'NO_VIABLE_CONCEPT',
            message: 'No candidate concept met the minimum viability threshold (70 Pts).',
          },
        };
      }

      // 5. Construct & Validate Final Blueprint
      const blueprint = this.constructBlueprint(
        winningConcept,
        opportunity,
        input,
        scoredConcepts.length
      );

      if (opportunityFallback) {
        return {
          success: true,
          blueprint,
          fallbackTriggered: true,
          executionTimeMs: Date.now() - startTime,
          error: { code: 'OPPORTUNITY_FALLBACK', message: opportunityFallback },
        };
      }

      return {
        success: true,
        blueprint,
        fallbackTriggered: false,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      aiLoggerError('CreativeBrain reasoning exception:', error);
      const earlier = lastOpportunityFallbackReason;
      const reason = `${error?.message || 'CreativeBrain execution error'}${earlier ? ` (the opportunity step had already fallen back: ${earlier})` : ''}`;
      const fallback = this.buildFallbackBlueprint(
        input,
        `CreativeBrain reasoning exception: ${reason}`
      );
      return {
        success: true,
        blueprint: fallback,
        fallbackTriggered: true,
        executionTimeMs: Date.now() - startTime,
        error: {
          code: error?.code || 'CREATIVE_BRAIN_EXCEPTION',
          message: reason,
        },
      };
    }
  }

  /**
   * Discovers and evaluates strategic marketing opportunities from business context.
   */
  async discoverOpportunity(input: CreativeBrainInput): Promise<CreativeOpportunity> {
    const prompt = buildOpportunityFormationPrompt(input);
    const rawOpportunity = await generateStructuredText(prompt, CreativeOpportunitySchema, {
      temperature: 0.4,
    });

    if (!rawOpportunity || !rawOpportunity.opportunityStatement || rawOpportunity.opportunityStatement.trim() === '') {
      throw new CreativeBrainError(
        'Opportunity statement is empty or confidence is too low',
        'OPPORTUNITY_FORMATION_FAILED'
      );
    }

    const normalized = OpportunityEngine.normalizeOpportunity(rawOpportunity, input);
    const evalResult = OpportunityEngine.evaluateOpportunity(normalized, input);

    if (!evalResult.isViable || evalResult.hardFailures.length > 0) {
      aiLoggerWarn('Generated opportunity failed quality or factuality gate. Falling back to deterministic baseline opportunity.', {
        hardFailures: evalResult.hardFailures,
        score: evalResult.totalScore,
      });
      const reason = evalResult.hardFailures.join('; ') || 'Opportunity quality score below threshold.';
      const baseline = OpportunityEngine.buildDeterministicFallbackOpportunity(input, reason);
      opportunityFallbackReasons.set(baseline, `the model's opportunity was rejected: ${reason}`);
      return baseline;
    }

    return normalized;
  }

  /**
   * Phase 9 gated entry for concept generation: the ONLY path that may turn a session's locked opportunity into
   * concepts. Blocked (before any LLM call or persistence) until the user has confirmed the strategy; claims the
   * single run so a double click / retry returns the concepts already generated instead of generating again.
   * Reuses the existing generation and scoring; it does not re-run the Opportunity Engine.
   */
  async generateConceptsForConfirmedSession(
    sessionId: string,
    input: CreativeBrainInput,
    actor: StrategicConfirmationActor,
    sessions: CreativeBrainSessionService = creativeBrainSessionService
  ): Promise<readonly CreativeConcept[]> {
    const claim = await sessions.beginConceptGeneration(sessionId, actor);
    if (claim.alreadyStarted) return claim.session.concepts;

    try {
      const candidateCount = input.candidateCount || CREATIVE_BRAIN_CONFIG.DEFAULT_CANDIDATE_COUNT;
      const raw = await this.generateConceptCandidates(claim.opportunity, input, candidateCount);
      const scored = await this.scoreConcepts(raw, input, claim.opportunity);
      const saved = await sessions.saveConcepts(sessionId, scored);
      return saved.concepts;
    } catch (error) {
      await sessions.releaseConceptGeneration(sessionId, actor);
      throw error;
    }
  }

  /**
   * Generates candidate creative concept variants for a given opportunity.
   */
  async generateConceptCandidates(
    opportunity: CreativeOpportunity,
    input: CreativeBrainInput,
    candidateCount: number = CREATIVE_BRAIN_CONFIG.DEFAULT_CANDIDATE_COUNT
  ): Promise<readonly CandidateConceptGenerationItem[]> {
    const prompt = buildCandidateConceptsPrompt(opportunity, input, candidateCount);
    // The id is Mitra's own bookkeeping. The live model sometimes left it off one concept, which cost a whole repair
    // call (and, when the repair failed too, the Creative Brain). It is accepted missing and assigned here.
    const result = await generateStructuredText(prompt, CandidateConceptsLenientOutputSchema, {
      temperature: 0.7,
    });

    if (!result.concepts || result.concepts.length === 0) {
      throw new CreativeBrainError(
        'LLM returned zero concept candidates',
        'CONCEPT_EVALUATION_FAILED'
      );
    }

    return result.concepts.map((concept, index) => ({
      ...concept,
      conceptId: concept.conceptId?.trim() ? concept.conceptId : `concept-${index + 1}`,
    }));
  }

  /**
   * Scores and ranks candidate concepts using the 5-dimension scoring model.
   */
  async scoreConcepts(
    rawCandidates: readonly CandidateConceptGenerationItem[],
    input: CreativeBrainInput,
    opportunity?: CreativeOpportunity
  ): Promise<readonly CreativeConcept[]> {
    const verticalConfig = getVerticalConfigOrDefault(input.vertical);
    const availableTemplates = creativeTemplateRegistry.listCreativeTemplates();
    const defaultGrammar: CreativeGrammarStep[] = [
      { id: 'g1', role: 'hook', purpose: 'Grab attention', required: true },
      { id: 'g2', role: 'product', purpose: 'Show product/service', required: true },
      { id: 'g3', role: 'offer', purpose: 'State value offer', required: true },
      { id: 'g4', role: 'cta', purpose: 'Primary CTA', required: true },
    ];

    const scored: CreativeConcept[] = rawCandidates.map((candidate) => {
      const notes: string[] = [];

      // 1. Truth Alignment (Max 25) - 100% Deterministic Hard Gate
      let truthAlignment: number = CREATIVE_BRAIN_CONFIG.SCORING_WEIGHTS.TRUTH_ALIGNMENT_MAX;

      // Check price fidelity
      if (input.intent.offer.price > 0) {
        if (
          candidate.offerFraming.includes('Free') &&
          input.intent.offer.price > 0 &&
          input.intent.offer.type !== 'free_delivery'
        ) {
          truthAlignment = 0;
          notes.push('TRUTH VIOLATION: Claimed free offer for paid product.');
        }
      }

      // Check vertical CTA compliance
      if (!verticalConfig.allowedCTAs.includes(input.intent.cta)) {
        truthAlignment = 0;
        notes.push(
          `TRUTH VIOLATION: CTA ${input.intent.cta} not allowed for vertical ${input.vertical}`
        );
      }

      // 2. Brand & Tone Fit (Max 20)
      let brandFit = 16;
      if (input.businessBrain.brand?.tone) {
        if (candidate.emotionalDriver === input.businessBrain.brand.tone) {
          brandFit += 4;
        }
      }
      if (input.memory.activeSavedStyle) {
        if (candidate.emotionalDriver === input.memory.activeSavedStyle.tone) {
          brandFit = Math.min(20, brandFit + 2);
        }
      }

      // 3. Audience & Local Relevance (Max 20)
      let audienceRelevance = 15;
      if (candidate.audienceFraming && candidate.audienceFraming.length > 5) {
        audienceRelevance += 3;
      }
      if (
        candidate.angle.toLowerCase().includes('local') ||
        candidate.coreIdea.toLowerCase().includes(input.intent.localization.city.toLowerCase())
      ) {
        audienceRelevance = Math.min(20, audienceRelevance + 2);
      }

      // 4. Offer & Objective Alignment (Max 15)
      let offerFit = 12;
      if (verticalConfig.allowedObjectives.includes(input.intent.objective)) {
        offerFit += 3;
      }

      // 5. Historical Performance Signal (Max 10)
      let historicalPerformance = 7;
      const preferences = input.memory?.preferences || [];
      const isPreferred = preferences.some(
        (p) => p.templateId === candidate.templateId && p.preference === 'preferred'
      );
      const isAvoided = preferences.some(
        (p) => p.templateId === candidate.templateId && p.preference === 'avoided'
      );

      if (isPreferred) {
        historicalPerformance += 3;
        notes.push('HISTORICAL: Template is marked preferred by user.');
      } else if (isAvoided) {
        historicalPerformance = 0;
        notes.push('HISTORICAL: Template is marked avoided by user.');
      }

      // 6. Execution Feasibility (Max 10)
      let executionFeasibility = 8;
      const matchedTemplate = availableTemplates.find(
        (t: CreativeTemplate) => t.id === candidate.templateId
      );
      if (matchedTemplate) {
        executionFeasibility += 2;
      } else {
        notes.push('FEASIBILITY: Template ID not found in registry, using fallback template.');
      }

      // HARD GATE CALCULATION
      let totalScore = 0;
      let isViable = false;

      if (truthAlignment === 0) {
        totalScore = 0;
        isViable = false;
        notes.push('HARD GATE TRIGGERED: Factual violation forced Total Score to 0.');
      } else {
        totalScore =
          truthAlignment +
          brandFit +
          audienceRelevance +
          offerFit +
          historicalPerformance +
          executionFeasibility;
        isViable = totalScore >= CREATIVE_BRAIN_CONFIG.MIN_VIABILITY_THRESHOLD;
      }

      const scoreBreakdown: ConceptScoreBreakdown = {
        truthAlignment,
        brandFit,
        audienceRelevance,
        offerFit,
        historicalPerformance,
        executionFeasibility,
      };

      const conceptScore: CreativeConceptScore = {
        totalScore,
        breakdown: scoreBreakdown,
        evaluationNotes: notes,
        isViable,
      };

      // Resolve grammar steps from template or fallback
      const grammarSteps: readonly CreativeGrammarStep[] =
        matchedTemplate?.structure?.grammar || defaultGrammar;

      return {
        ...candidate,
        opportunityId: opportunity?.opportunityId || ('opp-' + input.intent.businessId),
        grammar: grammarSteps,
        score: conceptScore,
      };
    });

    // Sort candidates descending by total score
    return [...scored].sort((a, b) => b.score.totalScore - a.score.totalScore);
  }

  /**
   * Selects the single highest scoring viable candidate concept.
   */
  selectWinner(scoredConcepts: readonly CreativeConcept[]): CreativeConcept | null {
    if (!scoredConcepts || scoredConcepts.length === 0) return null;
    const winner = scoredConcepts[0];
    if (winner && winner.score.isViable) {
      return winner;
    }
    return null;
  }

  /**
   * Constructs the final strongly-typed CreativeBlueprint.
   */
  constructBlueprint(
    winningConcept: CreativeConcept,
    opportunity: CreativeOpportunity,
    input: CreativeBrainInput,
    evaluatedCount: number
  ): CreativeBlueprint {
    const blueprintId = `bp-${uuidv7()}`;
    const now = new Date().toISOString();

    const selectedTemplate =
      creativeTemplateRegistry.getCreativeTemplate(winningConcept.templateId) ||
      creativeTemplateRegistry.listCreativeTemplates()[0];

    const templateId = selectedTemplate?.id || winningConcept.templateId || 'festival-offer-v1';

    return {
      blueprintId,
      campaignId: input.intent.campaignId || `camp-${uuidv7()}`,
      businessId: input.intent.businessId,
      opportunity,
      winningConcept,
      selectedTemplateId: templateId,
      strategyDirectives: {
        angle: winningConcept.angle,
        hook: winningConcept.hookDirection,
        offerFraming: winningConcept.offerFraming,
        audienceInsight: opportunity.audienceInsight,
        keyMessages: [
          winningConcept.message,
          input.intent.offer.headline,
          `Special Offer: ₹${input.intent.offer.price}`,
          `Available at ${input.businessBrain.identity.name}`,
          `Call / WhatsApp: ${input.businessBrain.identity.contact.whatsapp}`,
        ],
        ctaPrimary: input.intent.cta,
        differentiators: [winningConcept.differentiation],
      },
      copyDirectives: {
        headlineTone: winningConcept.emotionalDriver,
        requiredKeywords: [input.intent.offer.headline],
        prohibitedTerms: [],
        maxHeadlineLength: 100,
        primaryLanguage: input.intent.localization.primaryLanguage,
        regionalStyle: input.intent.localization.regionalStyle,
      },
      visualDirectives: {
        emphasis: winningConcept.visualPremise.emphasis,
        composition: winningConcept.visualPremise.composition,
        visualMood: winningConcept.visualPremise.mood,
        heroPromptGuidance: winningConcept.visualPremise.compositionHints.join(', '),
        textOverlayRules: {
          showPrice: true,
          showOriginalPriceStrikethrough: Boolean(input.intent.offer.originalPrice),
          showOfferBadge: true,
          ctaPlacement: 'bottom',
        },
      },
      trace: {
        traceId: uuidv7(),
        evaluatedConceptsCount: evaluatedCount,
        winningConceptId: winningConcept.conceptId,
        winningScore: winningConcept.score.totalScore,
        reasoningSummary: `Selected winning concept '${winningConcept.title}' with total score ${winningConcept.score.totalScore}/100 based on market opportunity statement.`,
        generatedAt: now,
      },
    };
  }

  /**
   * Deterministic baseline fallback blueprint when reasoning fails or score is low.
   * Guarantees zero unhandled crashes and strictly preserves Level 0 facts.
   */
  buildFallbackBlueprint(input: CreativeBrainInput, reason?: string): CreativeBlueprint {
    const now = new Date().toISOString();
    const blueprintId = `bp-fallback-${Date.now()}`;
    const defaultTemplate = creativeTemplateRegistry.listCreativeTemplates()[0];
    const templateId = input.intent.templateId || defaultTemplate?.id || 'festival-offer-v1';
    const productName = input.productContext?.name || input.intent.offer.headline;

    const fallbackOpportunity: CreativeOpportunity = {
      opportunityId: `opp-fallback-${input.intent.businessId}`,
      vertical: input.vertical,
      problem: `Promote ${productName} effectively`,
      tension: 'Customers seeking reliable local offers',
      motivation: 'Value and convenience',
      audienceInsight: input.businessBrain.audience?.targetCustomer || 'Local customers',
      opportunityStatement: `Promote ${productName} with verified offer details to local audience.`,
      desiredBusinessOutcome: 'Increase customer inquiries and engagement',
      desiredAudienceResponse: 'Interest in visiting or contacting the business',
      supportingSignals: ['Verified catalog price', 'Active business location'],
      constraints: {
        maxTextDensity: 'medium',
        toneBoundary: input.businessBrain.brand?.tone || 'friendly',
        factualLimits: [`Price: ₹${input.intent.offer.price}`],
      },
      confidence: 50,
      rationale: reason || 'Fallback baseline blueprint triggered.',
    };

    const fallbackConcept: CreativeConcept = {
      conceptId: 'concept-fallback',
      opportunityId: fallbackOpportunity.opportunityId,
      title: 'Standard Direct Offer',
      angle: input.intent.offer.headline,
      coreIdea: `Direct presentation of ${input.intent.offer.headline}`,
      hookDirection: input.intent.offer.headline,
      emotionalDriver: (input.businessBrain.brand?.tone as any) || 'friendly',
      audienceFraming: 'Local customers',
      message: `Enjoy ${input.intent.offer.headline} at ${input.businessBrain.identity.name}`,
      offerFraming:
        input.intent.offer.price > 0
          ? `Price ₹${input.intent.offer.price}`
          : 'State the offer exactly as the business gave it',
      ctaDirection: input.intent.cta,
      visualPremise: {
        emphasis: 'product-led',
        composition: 'hero-product',
        mood: 'clean and inviting',
        compositionHints: ['Clear product placement with clean background'],
      },
      differentiation: (input.businessBrain as any).positioning?.usp || input.businessBrain.identity.name,
      expectedResponse: 'Customer interest and action',
      templateId,
      grammar: [
        { id: 'g1', role: 'hook', purpose: 'Grab attention', required: true },
        { id: 'g2', role: 'product', purpose: 'Show product', required: true },
        { id: 'g3', role: 'offer', purpose: 'State offer', required: true },
        { id: 'g4', role: 'cta', purpose: 'Call to action', required: true },
      ],
      score: {
        totalScore: 70,
        breakdown: {
          truthAlignment: 25,
          brandFit: 15,
          audienceRelevance: 10,
          offerFit: 10,
          historicalPerformance: 5,
          executionFeasibility: 5,
        },
        evaluationNotes: [reason || 'Fallback baseline blueprint triggered.'],
        isViable: true,
      },
    };

    return {
      blueprintId,
      campaignId: input.intent.campaignId || `camp-${uuidv7()}`,
      businessId: input.intent.businessId,
      opportunity: fallbackOpportunity,
      winningConcept: fallbackConcept,
      selectedTemplateId: templateId,
      strategyDirectives: {
        angle: input.intent.offer.headline,
        hook: input.intent.offer.headline,
        offerFraming: input.intent.offer.headline,
        audienceInsight: "Local customers in the business's area",
        // Only facts the business has: an unknown price, city or contact is left out, never printed as
        // "₹0" or "undefined".
        keyMessages: [
          input.intent.offer.headline,
          input.intent.offer.price ? `Price: ₹${input.intent.offer.price}` : `Offer: ${input.intent.offer.headline}`,
          `Available at ${input.businessBrain.identity.name}`,
          input.businessBrain.identity.location?.city
            ? `Location: ${input.businessBrain.identity.location.city}`
            : `Business: ${input.businessBrain.identity.name}`,
          input.businessBrain.identity.contact?.whatsapp
            ? `Contact: ${input.businessBrain.identity.contact.whatsapp}`
            : `Category: ${input.businessBrain.identity.category}`,
        ],
        ctaPrimary: input.intent.cta,
        differentiators: [(input.businessBrain as any).positioning?.usp || input.businessBrain.identity.name],
      },
      copyDirectives: {
        headlineTone: input.businessBrain.brand?.tone || 'friendly',
        requiredKeywords: [input.intent.offer.headline],
        prohibitedTerms: [],
        maxHeadlineLength: 100,
        primaryLanguage: input.intent.localization.primaryLanguage,
        regionalStyle: input.intent.localization.regionalStyle,
      },
      visualDirectives: {
        emphasis: 'product-led',
        composition: 'hero-product',
        visualMood: 'inviting',
        heroPromptGuidance: 'Professional product photograph',
        textOverlayRules: {
          showPrice: true,
          showOriginalPriceStrikethrough: Boolean(input.intent.offer.originalPrice),
          showOfferBadge: true,
          ctaPlacement: 'bottom',
        },
      },
      trace: {
        traceId: uuidv7(),
        evaluatedConceptsCount: 0,
        winningConceptId: 'concept-fallback',
        winningScore: 70,
        reasoningSummary:
          reason || 'Fallback blueprint generated due to Creative Brain exception or threshold.',
        generatedAt: now,
      },
    };
  }

  private validateInput(input: CreativeBrainInput): void {
    if (!input || !input.businessBrain || !input.intent) {
      throw new CreativeBrainError(
        'CreativeBrainInput is missing required businessBrain or intent',
        'INVALID_INPUT'
      );
    }
    if (!input.intent.businessId || !input.intent.objective) {
      throw new CreativeBrainError(
        'Campaign intent is missing businessId or objective',
        'INVALID_INPUT'
      );
    }
  }
}

function aiLoggerWarn(msg: string, meta?: Record<string, unknown>) {
  console.warn(`[CreativeBrain WARN] ${msg}`, meta || '');
}

function aiLoggerError(msg: string, error: any) {
  console.error(`[CreativeBrain ERROR] ${msg}`, error);
}

export const creativeBrainService = new CreativeBrainService();
