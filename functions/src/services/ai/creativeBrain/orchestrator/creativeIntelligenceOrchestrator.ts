/**
 * PHASE 10.41 — Master Creative Intelligence Orchestrator
 * High-level facade executing the 6-Layer IP Flywheel across Context,
 * Knowledge, Composition, Expression, Evaluation, and Learning.
 */

import type {
  CreativeContext,
  CreativeOpportunity,
  CreativeStrategy,
  CreativeExpressionArtifact,
  CreativeEvaluation,
  CreativeFingerprint,
  RefusalResult,
  BusinessContextContract,
  CampaignIntentContract} from "../types/creativeArchitecture.types";

import type { ContextBuilderInput } from "../context/contextBuilderService";
import { ContextBuilderService } from "../context/contextBuilderService";
import { CreativeComposerService } from "../composer/creativeComposerService";
import { OpportunityEngine } from "../opportunityEngine";
import { CreativeRecipeService } from "../recipes/creativeRecipeService";

export interface MasterCreativeInput {
  business: BusinessContextContract;
  campaignIntent: CampaignIntentContract;
  localCity?: string;
  diversityHistory?: string[];
  userMechanismOverride?: string;
}

export class CreativeIntelligenceOrchestrator {
  private contextBuilder: ContextBuilderService;
  private composer: CreativeComposerService;
  private opportunityEngine: OpportunityEngine;
  private recipeService: CreativeRecipeService;

  constructor() {
    this.contextBuilder = new ContextBuilderService();
    this.recipeService = new CreativeRecipeService();
    this.composer = new CreativeComposerService(this.recipeService);
    this.opportunityEngine = new OpportunityEngine();
  }

  /**
   * Step 1: Build Creative Context (IP Layer 2).
   */
  public buildCreativeContext(input: ContextBuilderInput): CreativeContext {
    return this.contextBuilder.buildContext(input);
  }

  /**
   * Step 2: Generate Creative Opportunity.
   */
  public async generateCreativeOpportunity(context: CreativeContext): Promise<CreativeOpportunity> {
    return {
      opportunityId: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      coreInsight: `Address ${context.campaign.audienceSituation} for ${context.business.name} customers`,
      strategicProblem: context.campaign.audienceSituation,
      desiredAudienceShift: `Shift from awareness to ${context.campaign.campaignObjective.toLowerCase()}`,
      recommendedAngle: `Lead with verified ${context.business.subVertical} capability and value delivery`,
    };
  }

  /**
   * Step 3: Compose Creative Strategy (IP Layer 3).
   */
  public composeCreativeStrategy(
    context: CreativeContext,
    opportunity: CreativeOpportunity,
    userMechanismOverride?: string
  ): CreativeStrategy | RefusalResult {
    return this.composer.compose({
      context,
      opportunity,
      userMechanismOverride,
    });
  }

  /**
   * Step 4: Generate Creative Expression (IP Layer 4).
   */
  public generateCreativeExpression(
    strategy: CreativeStrategy,
    context: CreativeContext
  ): CreativeExpressionArtifact {
    return {
      artifactId: `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      strategyId: strategy.strategyId,
      headline: `Experience ${context.business.name} — ${strategy.strategicDirection}`,
      bodyCopy: `Designed for ${context.campaign.targetAudience}. Resolves ${strategy.audienceSituation} through ${strategy.mechanismIds[0]}.`,
      hookText: `Looking for ${strategy.audienceSituation}? Here is why ${context.business.name} delivers.`,
      visualConcept: `High impact visual showcasing ${strategy.visualStructureId || "product quality"} with ${context.business.brandVoice.tone} mood.`,
      callToAction: `Book now or visit ${context.business.name} today.`,
      styleConfig: {
        tone: context.business.brandVoice.tone,
        visualMood: context.business.brandVoice.formality,
        layoutType: "CLEAN_CENTERED",
      },
      platformFormat: context.platform ? `${context.platform.platform}_${context.platform.format}` : "INSTAGRAM_POST",
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Step 5: Evaluate Creative (IP Layer 5).
   */
  public evaluateCreative(
    artifact: CreativeExpressionArtifact,
    context: CreativeContext
  ): CreativeEvaluation {
    const violations: any[] = [];

    // Brand Voice Violation check
    for (const forbidden of context.business.brandVoice.forbiddenWords) {
      if (
        artifact.headline.toLowerCase().includes(forbidden.toLowerCase()) ||
        artifact.bodyCopy.toLowerCase().includes(forbidden.toLowerCase())
      ) {
        violations.push({
          code: "BRAND_VOICE_VIOLATION",
          severity: "CRITICAL",
          message: `Expression contains forbidden word: '${forbidden}'`,
        });
      }
    }

    const passed = violations.length === 0;

    return {
      evaluationId: `eval_${Date.now()}`,
      artifactId: artifact.artifactId,
      truth: { passed: true, score: 0.95 },
      brand: { passed, score: passed ? 0.95 : 0.40 },
      quality: { passed: true, score: 0.90 },
      platform: { passed: true, score: 0.95 },
      cultural: { passed: true, score: 0.92 },
      overallStatus: passed ? "PASS" : "FAIL",
      violations,
      improvements: [],
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Step 6: Create Fingerprint & Record Learning (IP Layer 6).
   */
  public generateFingerprint(
    strategy: CreativeStrategy,
    context: CreativeContext
  ): CreativeFingerprint {
    return {
      fingerprintId: `fp_${Date.now()}`,
      campaignId: `cmp_${Date.now()}`,
      businessId: context.business.businessId,
      tenantId: context.business.tenantId,
      strategyId: strategy.strategyId,
      psychologyIds: strategy.psychologyIds,
      mechanismIds: strategy.mechanismIds,
      recipeIds: strategy.recipeId ? [strategy.recipeId] : [],
      storyPatternIds: strategy.storyStructureId ? [strategy.storyStructureId] : [],
      hookPatternIds: strategy.hookPatternId ? [strategy.hookPatternId] : [],
      visualPatternIds: strategy.visualStructureId ? [strategy.visualStructureId] : [],
      copyPatternIds: strategy.copyStructureId ? [strategy.copyStructureId] : [],
      offerFramingIds: strategy.offerMechanismId ? [strategy.offerMechanismId] : [],
      ctaPatternIds: strategy.ctaMechanismId ? [strategy.ctaMechanismId] : [],
      platform: context.platform?.platform,
      format: context.platform?.format,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Master End-to-End Execution Flow.
   */
  public async createEndToEndCreativeStrategy(input: MasterCreativeInput): Promise<{
    context: CreativeContext;
    opportunity: CreativeOpportunity;
    strategy?: CreativeStrategy;
    refusal?: RefusalResult;
    expression?: CreativeExpressionArtifact;
    evaluation?: CreativeEvaluation;
    fingerprint?: CreativeFingerprint;
  }> {
    // 1. Build Context
    const context = this.buildCreativeContext({
      business: input.business,
      campaignIntent: input.campaignIntent,
      localIntelligence: input.localCity ? { city: input.localCity } : undefined,
      diversityHistory: input.diversityHistory,
    });

    // 2. Opportunity
    const opportunity = await this.generateCreativeOpportunity(context);

    // 3. Compose Strategy
    const strategyOrRefusal = this.composeCreativeStrategy(context, opportunity, input.userMechanismOverride);

    if ("refused" in strategyOrRefusal) {
      return {
        context,
        opportunity,
        refusal: strategyOrRefusal,
      };
    }

    const strategy = strategyOrRefusal;

    // 4. Expression
    const expression = this.generateCreativeExpression(strategy, context);

    // 5. Evaluation
    const evaluation = this.evaluateCreative(expression, context);

    // 6. Fingerprint
    const fingerprint = this.generateFingerprint(strategy, context);

    return {
      context,
      opportunity,
      strategy,
      expression,
      evaluation,
      fingerprint,
    };
  }
}
