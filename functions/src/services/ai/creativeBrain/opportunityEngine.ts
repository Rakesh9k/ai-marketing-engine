import type { CreativeBrainInput, CreativeOpportunity } from '../creativeBrain.types';

export interface OpportunityEvaluationBreakdown {
  readonly truthAlignment: number; // Max 20 (Hard Gate)
  readonly audienceRelevance: number; // Max 15
  readonly tensionStrength: number; // Max 15
  readonly differentiatorFit: number; // Max 10
  readonly marketingObjective: number; // Max 10
  readonly offerAlignment: number; // Max 10
  readonly strategicSpecificity: number; // Max 10
  readonly emotionalRelevance: number; // Max 5
  readonly creativePotential: number; // Max 5
}

export interface OpportunityEvaluationResult {
  readonly totalScore: number; // 0..100
  readonly isViable: boolean; // Total Score >= 60 AND hardFailures.length === 0
  readonly hardFailures: readonly string[];
  readonly recommendation: 'ACCEPT' | 'REFINE' | 'REJECT';
  readonly breakdown: OpportunityEvaluationBreakdown;
  readonly notes: readonly string[];
}

/**
 * Creative Opportunity Engine (Phase 8)
 *
 * Dedicated strategic reasoning layer that evaluates, validates, normalizes,
 * and guards Creative Opportunity objects before concept generation.
 *
 * Principles:
 * 1. Zero hardcoded industry branches.
 * 2. Factuality Hard Gates: Rejects unsupported prices, fake discounts, unverified proof, or invented service claims.
 * 3. Quality Rubric: Scores opportunity strategic specificity, tension strength, and objective alignment.
 * 4. Normalization: Populates both Phase 8 explicit fields and legacy fields seamlessly.
 * 5. Deterministic Fallback: Builds factually guaranteed fallback opportunity if LLM generation fails or is rejected.
 */
/** "free" standing alone as a word: not part of a compound (stress-free) and not "free from / free of". */
const FREE_CLAIM = /(?<![\w-])free(?![\w-])(?!\s+(?:from|of)\b)/;

export class OpportunityEngine {
  /**
   * Normalizes a raw or partial CreativeOpportunity to guarantee all Phase 8 explicit fields are populated.
   */
  public static normalizeOpportunity(
    opp: CreativeOpportunity,
    input: CreativeBrainInput
  ): CreativeOpportunity {
    const productName =
      opp.productOrService ||
      input.productContext?.name ||
      input.intent.offer.headline;

    const offerStr =
      opp.offer ||
      (input.intent.offer.price > 0
        ? `₹${input.intent.offer.price} (${input.intent.offer.headline})`
        : input.intent.offer.headline);

    const audienceStr =
      opp.audience ||
      opp.audienceInsight ||
      input.businessBrain.audience?.targetCustomer ||
      input.intent.localization.audienceDescription ||
      'Local customers';

    const problemStr = opp.problemOrDesire || opp.problem || `Find reliable ${input.vertical} solutions`;
    const tensionStr = opp.customerTension || opp.tension || 'Seeking value and quality without complication';
    const objectiveStr = opp.marketingObjective || opp.desiredBusinessOutcome || input.intent.objective;
    const diffStr = opp.businessDifferentiator || (input.businessBrain as any).positioning?.usp || input.businessBrain.identity.name;
    const oppStmt = opp.creativeOpportunity || opp.opportunityStatement || `Position ${productName} around ${tensionStr}`;
    const stratRec = opp.strategicRecommendation || opp.rationale || `Lead with customer value and support with verified ${offerStr}`;
    const proofList = opp.relevantProof || opp.supportingSignals || (input.intent.offer.price > 0 ? [`Verified price: ₹${input.intent.offer.price}`] : []);

    const avoidList = opp.thingsToAvoid || [
      'Do not use generic "best in class" claims without proof',
      'Do not make unverified delivery or quality guarantees',
      'Do not rely solely on discount messaging',
    ];

    return {
      ...opp,
      audience: audienceStr,
      problemOrDesire: problemStr,
      marketingObjective: objectiveStr,
      productOrService: productName,
      offer: offerStr,
      customerTension: tensionStr,
      businessDifferentiator: diffStr,
      relevantProof: proofList,
      emotionalTerritory: opp.emotionalTerritory || opp.motivation || input.businessBrain.brand?.tone || 'Relief & Convenience',
      creativeOpportunity: oppStmt,
      strategicRecommendation: stratRec,
      thingsToAvoid: avoidList,
      // Retain legacy contract properties
      problem: problemStr,
      tension: tensionStr,
      motivation: opp.emotionalTerritory || opp.motivation || 'Value and convenience',
      audienceInsight: audienceStr,
      opportunityStatement: oppStmt,
      desiredBusinessOutcome: objectiveStr,
      desiredAudienceResponse: opp.desiredAudienceResponse || 'Positive interest and action',
      supportingSignals: proofList,
      rationale: stratRec,
    };
  }

  /**
   * Evaluates a CreativeOpportunity against Hard Factuality Gates and Quality Rubric.
   */
  public static evaluateOpportunity(
    opp: CreativeOpportunity,
    input: CreativeBrainInput
  ): OpportunityEvaluationResult {
    const hardFailures: string[] = [];
    const notes: string[] = [];
    const normalized = this.normalizeOpportunity(opp, input);

    // ------------------------------------------------------------------------
    // HARD GATE 1: Factuality Audit (Price, Product, Proof, Claims)
    // ------------------------------------------------------------------------
    const textToAudit = [
      normalized.opportunityStatement,
      normalized.strategicRecommendation,
      normalized.tension,
      normalized.problem,
      ...(normalized.relevantProof || []),
    ].join(' ').toLowerCase();

    // 1a. Unsupported Price / Fake Discount check
    if (input.intent.offer.price > 0) {
      // "free" as a price claim, not inside "stress-free" / "hassle-free" / "carefree" or "free from worry" (live: a real-estate
      // opportunity about a stress-free commute was rejected as claiming a free product).
      if (FREE_CLAIM.test(textToAudit) && input.intent.offer.type !== 'free_delivery' && input.intent.offer.price > 0) {
        hardFailures.push('TRUTH VIOLATION: Opportunity claims free product/service for paid item.');
      }
    }

    // 1b. Unsupported Proof Claims (e.g. "10,000 customers", "4.9 stars", "500+ reviews")
    const claimsToCheck = ['10,000', '10000', '4.9', 'certified chef', '500+ reviews', 'guaranteed 30 min'];
    for (const claim of claimsToCheck) {
      // a number is a claim only as its own figure: not inside "₹14.99" or "₹110,000"
      const claimPattern = new RegExp(`(?<![\\d.,])${claim.replace(/[.+]/g, '\\$&')}(?![\\d])`);
      if (claimPattern.test(textToAudit)) {
        // What the business and the campaign actually state: the Brain AND the offer/product of this campaign (a
        // ₹10,000 product legitimately says 10,000).
        const brainText = JSON.stringify([input.businessBrain, input.intent.offer, input.productContext]).toLowerCase();
        if (!brainText.includes(claim)) {
          hardFailures.push(`TRUTH VIOLATION: Opportunity contains unverified claim '${claim}'.`);
        }
      }
    }

    // 1c. Unsupported Delivery Claim check
    if (textToAudit.includes('30 min') || textToAudit.includes('instant delivery')) {
      const deliveryRadius = input.businessBrain.businessRules?.deliveryRadiusKm;
      if (deliveryRadius === undefined && input.vertical !== 'restaurant') {
        hardFailures.push('TRUTH VIOLATION: Opportunity claims instant/30-min delivery without verified business rules.');
      }
    }

    let truthAlignment = 20;
    if (hardFailures.length > 0) {
      truthAlignment = 0;
    }

    // ------------------------------------------------------------------------
    // QUALITY RUBRIC (Max 100)
    // ------------------------------------------------------------------------

    // 2. Audience Relevance (Max 15)
    let audienceRelevance = 10;
    if (normalized.audience && normalized.audience.length > 10 && !normalized.audience.toLowerCase().includes('everyone')) {
      audienceRelevance += 5;
    } else {
      notes.push('AUDIENCE: Audience is too broad or generic.');
    }

    // 3. Customer Tension Strength (Max 15)
    let tensionStrength = 10;
    if (normalized.customerTension && normalized.customerTension.length > 15) {
      tensionStrength += 5;
    } else {
      notes.push('TENSION: Customer tension is weak or purely descriptive.');
    }

    // 4. Business Differentiator Fit (Max 10)
    let differentiatorFit = 7;
    if (normalized.businessDifferentiator && normalized.businessDifferentiator.length > 5) {
      differentiatorFit += 3;
    }

    // 5. Marketing Objective Alignment (Max 10)
    let marketingObjective = 8;
    if (normalized.marketingObjective) {
      marketingObjective += 2;
    }

    // 6. Offer Alignment (Max 10)
    let offerAlignment = 7;
    if (normalized.offer && normalized.offer.length > 3) {
      offerAlignment += 3;
    }

    // 7. Strategic Specificity (Max 10) — Penalize generic marketing phrases
    let strategicSpecificity = 8;
    const genericPhrases = ['create engaging content', 'promote the product', 'highlight food and value', 'best in class'];
    if (genericPhrases.some((p) => textToAudit.includes(p))) {
      strategicSpecificity = 4;
      notes.push('SPECIFICITY: Opportunity contains generic marketing clichés.');
    }

    // 8. Emotional Relevance (Max 5)
    let emotionalRelevance = 4;
    if (normalized.emotionalTerritory) {
      emotionalRelevance = 5;
    }

    // 9. Creative Potential (Max 5)
    let creativePotential = 4;
    if (normalized.strategicRecommendation && normalized.strategicRecommendation.length > 15) {
      creativePotential = 5;
    }

    const totalScore = truthAlignment + audienceRelevance + tensionStrength + differentiatorFit + marketingObjective + offerAlignment + strategicSpecificity + emotionalRelevance + creativePotential;
    const isViable = hardFailures.length === 0 && totalScore >= 60;

    let recommendation: OpportunityEvaluationResult['recommendation'] = 'ACCEPT';
    if (hardFailures.length > 0) {
      recommendation = 'REJECT';
    } else if (totalScore < 60) {
      recommendation = 'REFINE';
    }

    return {
      totalScore: hardFailures.length > 0 ? 0 : totalScore,
      isViable,
      hardFailures,
      recommendation,
      breakdown: {
        truthAlignment,
        audienceRelevance,
        tensionStrength,
        differentiatorFit,
        marketingObjective,
        offerAlignment,
        strategicSpecificity,
        emotionalRelevance,
        creativePotential,
      },
      notes,
    };
  }

  /**
   * Constructs a deterministic, factually guaranteed fallback opportunity when LLM opportunity generation fails or is rejected.
   */
  public static buildDeterministicFallbackOpportunity(
    input: CreativeBrainInput,
    reason?: string
  ): CreativeOpportunity {
    const productName = input.productContext?.name || input.intent.offer.headline;
    const targetAudience = input.businessBrain.audience?.targetCustomer || input.intent.localization.audienceDescription || 'Local customers';
    const offerHeadline = input.intent.offer.headline;
    const offerPrice = input.intent.offer.price;
    const verifiedOfferStr = offerPrice > 0 ? `₹${offerPrice} (${offerHeadline})` : offerHeadline;

    return this.normalizeOpportunity(
      {
        opportunityId: `opp-fallback-${input.intent.businessId}-${Date.now()}`,
        vertical: input.vertical,
        problem: `Drive awareness and orders for ${productName}`,
        tension: `Customers want reliable ${input.vertical} options without risk or complication`,
        motivation: input.businessBrain.brand?.tone || 'Value and Quality',
        audienceInsight: targetAudience,
        opportunityStatement: `Position ${productName} around verified quality and clear offer terms for ${targetAudience}.`,
        desiredBusinessOutcome: input.intent.objective,
        desiredAudienceResponse: 'Interest in visiting or contacting the business',
        supportingSignals: offerPrice > 0 ? [`Verified price: ₹${offerPrice}`] : ['Active business location'],
        constraints: {
          maxTextDensity: 'medium',
          toneBoundary: input.businessBrain.brand?.tone || 'friendly',
          factualLimits: offerPrice > 0 ? [`Price: ₹${offerPrice}`] : [],
        },
        confidence: 65,
        rationale: reason || 'Deterministic baseline fallback opportunity generated.',

        audience: targetAudience,
        problemOrDesire: `Seeking quality ${productName} with clear value`,
        marketingObjective: input.intent.objective,
        productOrService: productName,
        offer: verifiedOfferStr,
        customerTension: `Customers want reliable ${input.vertical} options without hidden costs or friction`,
        businessDifferentiator: (input.businessBrain as any).positioning?.usp || input.businessBrain.identity.name,
        relevantProof: offerPrice > 0 ? [`Verified price: ₹${offerPrice}`] : ['Active business location'],
        emotionalTerritory: 'Trust & Satisfaction',
        creativeOpportunity: `Position ${productName} as the clear, dependable choice for ${targetAudience}.`,
        strategicRecommendation: `Lead with verified ${productName} offer and support with business reputation.`,
        thingsToAvoid: [
          'Do not use generic "best biryani/service" claims without proof',
          'Do not make unverified delivery or discount promises',
        ],
      },
      input
    );
  }
}
