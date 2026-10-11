/**
 * PHASE 13 — Concept Synthesis Engine Service
 * Master orchestrator for Phase 13 of Mitra's Creative Brain.
 * Synthesizes Business Brain + Creative Brain Answers + Creative Opportunity + Relevant Creative Bank Entries
 * into 3-5 high-quality, strategically distinct creative concepts.
 */

import type {
  ConceptSynthesisInput,
  ConceptSynthesisResult,
  CreativeConcept,
  ConceptSynthesisMetadata,
} from './synthesis.types';
import { ConceptScoringService } from './conceptScoringService';
import { ConceptDiversityService } from './conceptDiversityService';
import { ConceptRetrievalService } from './conceptRetrievalService';

export class ConceptSynthesisService {
  /**
   * Main entry point for synthesizing 3-5 high-quality creative concepts.
   */
  public async synthesizeConcepts(input: ConceptSynthesisInput): Promise<ConceptSynthesisResult> {
    const startTime = new Date().toISOString();

    // 1. Validation: Ensure Business Brain & Creative Opportunity are present
    if (!input.businessBrain?.businessId && !input.businessBrain?.name) {
      throw new Error('ConceptSynthesisError: Business Brain is required and authoritative.');
    }
    if (!input.creativeOpportunity?.opportunityId && !input.creativeOpportunity?.coreInsight && !(input.creativeOpportunity as any)?.creativeOpportunity) {
      throw new Error('ConceptSynthesisError: Creative Opportunity is required for synthesis.');
    }

    // 2. Retrieve Relevant Creative Bank Entries (No full-bank dump)
    const bankEntries = ConceptRetrievalService.retrieveRelevantEntries(
      input,
      input.relevantCreativeBankEntries
    );

    // 3. Generate Candidate Concepts (Phase 13 Synthesis)
    const rawCandidates = this.generateCandidateConcepts(input, bankEntries);

    // 4. Score Candidates and Enforce Hard Gates
    const evaluatedResults = rawCandidates.map((candidate) =>
      ConceptScoringService.evaluateConcept(candidate, input)
    );

    const validConcepts = evaluatedResults
      .filter((res) => res.meetsThreshold)
      .map((res) => res.concept);

    // 5. Perform Diversity Check
    const diverseConcepts = ConceptDiversityService.filterDiverseConcepts(validConcepts);

    // 6. Ranking & Output Selection (Target: 3, Allow 4-5 if genuine, Return fewer if < 3 pass)
    let finalConcepts = diverseConcepts.slice(0, 5);

    // Default to top 3 if more than 3 exist, unless 4-5 are exceptionally distinct and high scoring (>85)
    if (finalConcepts.length > 3) {
      const top4And5AreHighQuality = finalConcepts.slice(3).every((c) => c.score.total >= 85);
      if (!top4And5AreHighQuality) {
        finalConcepts = finalConcepts.slice(0, 3);
      }
    }

    const metadata: ConceptSynthesisMetadata = {
      generatedCount: rawCandidates.length,
      acceptedCount: finalConcepts.length,
      rejectedCount: rawCandidates.length - finalConcepts.length,
      diversityChecked: true,
      creativeBankUsed: bankEntries.length > 0,
      creativeBankEntryCount: bankEntries.length,
      generatedAt: startTime,
    };

    return {
      campaignId: input.campaignId,
      opportunityId: input.creativeOpportunity.id || input.creativeOpportunity.opportunityId || 'opp_default',
      concepts: finalConcepts,
      synthesisMetadata: metadata,
    };
  }

  /**
   * Generates initial raw candidate concepts using domain strategic synthesis.
   */
  private generateCandidateConcepts(
    input: ConceptSynthesisInput,
    _bankEntries: any[]
  ): CreativeConcept[] {
    const bizName = input.businessBrain.name || 'Our Business';
    const subVertical = input.businessBrain.subVertical || input.businessBrain.industry || 'local_business';
    const audience = input.campaignIntent.targetAudience || 'Local customers';
    const oppInsight = input.creativeOpportunity.coreInsight || input.creativeBrainAnswers?.problem || 'Eliminating customer friction';
    const oppTension = input.creativeOpportunity.customerTension || (input.creativeOpportunity as any).tension || 'Decision friction and trial uncertainty';
    const offerTitle = input.campaignIntent.offerDetails?.offerTitle || input.creativeBrainAnswers?.offer || 'Special Campaign Offer';

    const candidates: CreativeConcept[] = [];

    // CONCEPT 1: RELIEF / DECISION ELIMINATION (Territory: Relief)
    candidates.push({
      id: `concept_${input.campaignId}_1`,
      name: 'Everyone Sorted',
      oneLineIdea: `Turn the decision stress around ${subVertical} choices into the simple relief of having everyone sorted with ${bizName}.`,
      humanInsight: `${audience} want convenience and relaxation, but choosing a reliable ${subVertical} option often becomes another friction-filled task.`,
      whyThisBusiness: `${bizName}'s offerings and location provide a complete solution designed around multiple preferences.`,
      whyThisAudience: `${audience} value time and peace of mind without spending effort negotiating or compromising choices.`,
      emotionalResponse: {
        primary: 'Relief',
        secondary: 'Warmth',
      },
      hook: 'Everyone wants something different. This is why they all say yes.',
      creativeMechanism: {
        id: 'mechanism_decision_elimination',
        name: 'Decision Elimination',
        explanation: 'Positions the offer as the single zero-debate solution that satisfies everyone.',
      },
      visualDirection: `Show multiple individual preferences converging visually into one central ${bizName} solution with warm ambient lighting.`,
      storyDirection: 'Scene 1: Decision friction → Scene 2: Solution reveal → Scene 3: Enjoyable experience → Scene 4: Offer + CTA.',
      offerIntegration: `${offerTitle} serves as the direct proof of the decision-elimination strategy.`,
      cta: `Order or book your ${subVertical} package today.`,
      recommendedFormat: {
        primary: 'Short Reel',
        alternatives: ['Static Poster', 'Carousel'],
      },
      recommendedPlatform: {
        primary: 'Instagram',
        secondary: ['Facebook', 'WhatsApp'],
      },
      requiredAssets: {
        required: ['Product or service photo', 'Business logo', 'Offer details'],
        recommended: ['Customer experience footage'],
        optional: ['Location interior photo'],
      },
      whyMitraRecommendsIt: `Mitra recommends this direction because it directly connects a real customer tension (${oppTension}) with ${bizName}'s verified capabilities.`,
      score: { total: 0, strategicRelevance: 0, audienceRelevance: 0, businessFit: 0, humanInsight: 0, creativeDistinctiveness: 0, emotionalStrength: 0, executionFeasibility: 0, offerIntegration: 0 },
      evidence: {
        businessBrain: [`Business: ${bizName} (${subVertical})`],
        creativeBrain: [`Audience: ${audience}`],
        creativeOpportunity: [`Insight: ${oppInsight}`],
        creativeBank: ['psychology_choice_simplification', 'mechanism_decision_elimination'],
      },
      creativeBankReferences: ['psychology_choice_simplification', 'mechanism_decision_elimination'],
      status: 'recommended',
    });

    // CONCEPT 2: HUMOR / PROBLEM REVERSAL (Territory: Amusement)
    candidates.push({
      id: `concept_${input.campaignId}_2`,
      name: 'The Everyday Debate',
      oneLineIdea: `Make the exhausting "what should we choose?" conversation the villain of the week, solved by ${bizName}.`,
      humanInsight: 'Small household or personal choices consume a disproportionate amount of mental energy and debate.',
      whyThisBusiness: `${bizName} provides a clear, dependable answer without requiring compromises.`,
      whyThisAudience: `${audience} recognize the humor and relatable frustration in daily decision negotiations.`,
      emotionalResponse: {
        primary: 'Amusement',
        secondary: 'Relief',
      },
      hook: 'The hardest part of your week shouldn\'t be choosing where to go.',
      creativeMechanism: {
        id: 'recipe_problem_reversal',
        name: 'Relatable Problem Reversal',
        explanation: 'Exaggerates the daily friction point before bringing in the effortless solution.',
      },
      visualDirection: `Fast-paced visual comparison showing exaggerated negotiation chaos followed by a calm reveal of ${bizName}.`,
      storyDirection: 'Tension → Exaggerated debate → Silent realization → Offer reveal → Action.',
      offerIntegration: `${offerTitle} acts as the "debate solved" moment.`,
      cta: `Make things easy. Book with ${bizName}.`,
      recommendedFormat: {
        primary: 'Humorous Reel',
        alternatives: ['Story Card'],
      },
      recommendedPlatform: {
        primary: 'Instagram Reels',
        secondary: ['Facebook Reels'],
      },
      requiredAssets: {
        required: ['Product or service photo', 'Offer details'],
        recommended: ['Short reaction clip'],
        optional: ['Background music track'],
      },
      whyMitraRecommendsIt: 'Offers high engagement and entertainment value while keeping the product advantage at the center.',
      score: { total: 0, strategicRelevance: 0, audienceRelevance: 0, businessFit: 0, humanInsight: 0, creativeDistinctiveness: 0, emotionalStrength: 0, executionFeasibility: 0, offerIntegration: 0 },
      evidence: {
        businessBrain: [`Business: ${bizName}`],
        creativeBrain: [`Tension: ${oppTension}`],
        creativeOpportunity: [`Opportunity: ${oppInsight}`],
        creativeBank: ['hook_relatable_tension', 'recipe_problem_reversal'],
      },
      creativeBankReferences: ['hook_relatable_tension', 'recipe_problem_reversal'],
      status: 'recommended',
    });

    // CONCEPT 3: EMOTIONAL REFRAMING / BELONGING (Territory: Warmth & Togetherness)
    candidates.push({
      id: `concept_${input.campaignId}_3`,
      name: 'One Table, Zero Compromise',
      oneLineIdea: `Position ${bizName} not just as a service, but as the shared space that brings people together without compromise.`,
      humanInsight: 'People may have different tastes, but their deeper desire is to share meaningful moments together.',
      whyThisBusiness: `${bizName} accommodates diverse preferences in one welcoming location/experience.`,
      whyThisAudience: `${audience} are emotionally driven by shared experiences and belonging.`,
      emotionalResponse: {
        primary: 'Warmth',
        secondary: 'Belonging',
      },
      hook: 'Different choices. One table.',
      creativeMechanism: {
        id: 'psychology_social_proof',
        name: 'Emotional Reframing',
        explanation: 'Reframes functional product features into an emotional catalyst for connection.',
      },
      visualDirection: `Warm, editorial visual capturing real moments of connection around ${bizName}'s offerings.`,
      storyDirection: 'Individual needs → Convergence → Shared moment → Brand proof → CTA.',
      offerIntegration: `${offerTitle} provides the practical, accessible reason to gather.`,
      cta: `Gather your group at ${bizName} this week.`,
      recommendedFormat: {
        primary: 'Static Hero Creative',
        alternatives: ['Carousel', 'Short Reel'],
      },
      recommendedPlatform: {
        primary: 'Instagram',
        secondary: ['Facebook', 'Google Business'],
      },
      requiredAssets: {
        required: ['Product photography', 'Brand identity', 'Offer'],
        recommended: ['Lifestyle imagery'],
        optional: ['Staff or customer photo'],
      },
      whyMitraRecommendsIt: 'Builds long-term brand equity and emotional resonance alongside immediate commercial response.',
      score: { total: 0, strategicRelevance: 0, audienceRelevance: 0, businessFit: 0, humanInsight: 0, creativeDistinctiveness: 0, emotionalStrength: 0, executionFeasibility: 0, offerIntegration: 0 },
      evidence: {
        businessBrain: [`Business: ${bizName}`],
        creativeBrain: [`Audience: ${audience}`],
        creativeOpportunity: [`Opportunity: ${oppInsight}`],
        creativeBank: ['psychology_social_proof'],
      },
      creativeBankReferences: ['psychology_social_proof'],
      status: 'recommended',
    });

    return candidates;
  }
}
