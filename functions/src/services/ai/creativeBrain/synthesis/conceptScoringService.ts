/**
 * PHASE 13 — Concept Scoring Service
 * Evaluates candidate concepts deterministically using the 8-Dimension Quality Rubric.
 * Enforces Factuality Hard Gates, Business Brain Precedence, and Minimum Viability Thresholds.
 */

import type { CreativeConcept, ConceptScoreBreakdown, ConceptSynthesisInput } from './synthesis.types';

export const MIN_CONCEPT_SCORE = 70;

export interface ConceptEvaluationResult {
  concept: CreativeConcept;
  passedHardGates: boolean;
  hardFailures: string[];
  score: ConceptScoreBreakdown;
  meetsThreshold: boolean;
}

export class ConceptScoringService {
  /**
   * Evaluates and scores a single candidate concept against the 8-dimension rubric and hard gates.
   */
  public static evaluateConcept(
    candidate: CreativeConcept,
    input: ConceptSynthesisInput
  ): ConceptEvaluationResult {
    const hardFailures: string[] = [];

    // -------------------------------------------------------------
    // HARD GATE 1: Business Brain Precedence & Forbidden Words
    // -------------------------------------------------------------
    const forbiddenWords = input.businessBrain.brandVoice?.forbiddenWords || [];
    const fullConceptText = `${candidate.name} ${candidate.oneLineIdea} ${candidate.hook} ${candidate.visualDirection} ${candidate.whyThisBusiness}`.toLowerCase();

    for (const forbidden of forbiddenWords) {
      if (forbidden && fullConceptText.includes(forbidden.toLowerCase())) {
        hardFailures.push(`Contains forbidden brand word: "${forbidden}"`);
      }
    }

    // -------------------------------------------------------------
    // HARD GATE 2: Truth & Factuality (No invented discounts/prices/proof)
    // -------------------------------------------------------------
    const offerDetails = input.campaignIntent.offerDetails;
    if (!offerDetails?.hasOffer || !offerDetails?.offerPrice) {
      // If no official offer price is set in input, check if concept invents a specific price or fake discount
      const inventedPriceRegex = /₹\d+|\$\d+|\d+%\s*off/i;
      if (inventedPriceRegex.test(candidate.hook) || inventedPriceRegex.test(candidate.offerIntegration)) {
        hardFailures.push('Invented price or discount percentage not present in Business/Campaign context');
      }
    }

    // Check for fake social proof claims
    const fakeProofRegex = /\b(100%|guaranteed|#1|best in world|thousands of 5-star)\b/i;
    if (!input.businessBrain.verifiedEvidence?.hasTestimonials && fakeProofRegex.test(fullConceptText)) {
      hardFailures.push('Contains unverified claim or fake proof guarantee');
    }

    // -------------------------------------------------------------
    // DETERMINISTIC 8-DIMENSION SCORING
    // -------------------------------------------------------------

    // 1. Strategic Relevance (Max 20)
    let strategicRelevance = 12;
    if (candidate.evidence.creativeOpportunity.length > 0) strategicRelevance += 4;
    if (candidate.cta.toLowerCase().includes(input.campaignIntent.campaignObjective.toLowerCase()) || candidate.cta.length > 5) strategicRelevance += 4;
    strategicRelevance = Math.min(20, strategicRelevance);

    // 2. Audience Relevance (Max 15)
    let audienceRelevance = 10;
    if (candidate.whyThisAudience.length > 20) audienceRelevance += 3;
    if (candidate.humanInsight.length > 30) audienceRelevance += 2;
    audienceRelevance = Math.min(15, audienceRelevance);

    // 3. Business Fit (Max 15)
    let businessFit = 10;
    if (candidate.whyThisBusiness.length > 20) businessFit += 3;
    if (candidate.evidence.businessBrain.length > 0) businessFit += 2;
    businessFit = Math.min(15, businessFit);

    // 4. Human Insight (Max 15)
    let humanInsight = 9;
    if (candidate.humanInsight.includes('because') || candidate.humanInsight.includes('want') || candidate.humanInsight.includes('feel') || candidate.humanInsight.length > 40) {
      humanInsight += 6;
    }
    humanInsight = Math.min(15, humanInsight);

    // 5. Creative Distinctiveness (Max 15)
    let creativeDistinctiveness = 10;
    if (candidate.creativeMechanism?.explanation?.length > 15) creativeDistinctiveness += 3;
    if (candidate.hook.length > 15 && !candidate.hook.toLowerCase().includes('best')) creativeDistinctiveness += 2;
    creativeDistinctiveness = Math.min(15, creativeDistinctiveness);

    // 6. Emotional Strength (Max 10)
    let emotionalStrength = 6;
    if (candidate.emotionalResponse?.primary) emotionalStrength += 2;
    if (candidate.emotionalResponse?.secondary) emotionalStrength += 2;
    emotionalStrength = Math.min(10, emotionalStrength);

    // 7. Execution Feasibility (Max 5)
    let executionFeasibility = 3;
    if (candidate.requiredAssets?.required && candidate.requiredAssets.required.length > 0) executionFeasibility += 2;
    executionFeasibility = Math.min(5, executionFeasibility);

    // 8. Offer Integration (Max 5)
    let offerIntegration = 3;
    if (candidate.offerIntegration && candidate.offerIntegration.length > 15) offerIntegration += 2;
    offerIntegration = Math.min(5, offerIntegration);

    const total = passedHardGates(hardFailures)
      ? strategicRelevance + audienceRelevance + businessFit + humanInsight + creativeDistinctiveness + emotionalStrength + executionFeasibility + offerIntegration
      : 0;

    const scoreBreakdown: ConceptScoreBreakdown = {
      total,
      strategicRelevance,
      audienceRelevance,
      businessFit,
      humanInsight,
      creativeDistinctiveness,
      emotionalStrength,
      executionFeasibility,
      offerIntegration,
    };

    const passedGates = hardFailures.length === 0;
    const meetsThreshold = passedGates && total >= MIN_CONCEPT_SCORE;

    const updatedConcept: CreativeConcept = {
      ...candidate,
      score: scoreBreakdown,
      status: meetsThreshold ? 'recommended' : 'rejected',
    };

    return {
      concept: updatedConcept,
      passedHardGates: passedGates,
      hardFailures,
      score: scoreBreakdown,
      meetsThreshold,
    };
  }
}

function passedHardGates(failures: string[]): boolean {
  return failures.length === 0;
}
