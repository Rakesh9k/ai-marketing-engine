/**
 * PHASE 25 — Candidate Generator
 * Derives evidence-grounded hypotheses (candidates) from Business Brain, Memory,
 * product features, and industry intelligence when the user is uncertain.
 */

import type { CreativeConfidenceDimension } from '../confidence/confidence.types';
import type { CreativeCandidate } from './uncertainty.types';

export interface BusinessBrainContextPayload {
  businessId: string;
  businessName?: string;
  category?: string;
  featuredProducts?: string[];
  targetAudienceSegments?: string[];
  brandTone?: string;
  differentiators?: string[];
  proofPoints?: string[];
  memoryInsights?: string[];
}

export class CandidateGenerator {
  /**
   * Generates grounded candidates for a given dimension based on authoritative business context.
   */
  public generateCandidates(
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload,
    campaignProduct?: string
  ): CreativeCandidate[] {
    switch (dimension) {
      case 'CUSTOMER_INSIGHT':
        return this.generateMotivationCandidates(context, campaignProduct);
      case 'DIFFERENTIATOR':
        return this.generateDifferentiatorCandidates(context);
      case 'AUDIENCE':
        return this.generateAudienceCandidates(context);
      case 'OFFER':
      case 'PRODUCT':
        return this.generateProductCandidates(context);
      default:
        return this.generateGeneralCandidates(dimension, context);
    }
  }

  private generateMotivationCandidates(
    context: BusinessBrainContextPayload,
    campaignProduct?: string
  ): CreativeCandidate[] {
    const prod = campaignProduct || context.featuredProducts?.[0] || 'our service';
    const biz = context.businessName || 'our business';

    const candidates: CreativeCandidate[] = [
      {
        id: 'cand_mot_convenience',
        dimension: 'CUSTOMER_INSIGHT',
        value: 'Convenience & Quick Service',
        label: 'Convenience & Quick Service',
        description: `Customers want a hassle-free, fast way to get ${prod}.`,
        source: 'BUSINESS_BRAIN',
        confidence: 0.78,
        evidenceIds: ['bb_speed_1'],
        requiresConfirmation: true,
      },
      {
        id: 'cand_mot_quality',
        dimension: 'CUSTOMER_INSIGHT',
        value: 'Uncompromising Quality & Craftsmanship',
        label: 'Quality & Craftsmanship',
        description: `Customers trust ${biz} for superior quality and fresh preparation.`,
        source: 'BUSINESS_BRAIN',
        confidence: 0.75,
        evidenceIds: ['bb_quality_1'],
        requiresConfirmation: true,
      },
      {
        id: 'cand_mot_trust',
        dimension: 'CUSTOMER_INSIGHT',
        value: 'Local Trust & Family-Friendly Experience',
        label: 'Local Trust & Warm Experience',
        description: `Families and regulars choose ${biz} because they feel comfortable and valued.`,
        source: 'CREATIVE_MEMORY',
        confidence: 0.71,
        evidenceIds: ['mem_trust_1'],
        requiresConfirmation: true,
      },
      {
        id: 'cand_mot_value',
        dimension: 'CUSTOMER_INSIGHT',
        value: 'Great Price & Exceptional Value',
        label: 'Price & Value for Money',
        description: `Getting premium ${prod} without overpaying.`,
        source: 'INDUSTRY_KNOWLEDGE',
        confidence: 0.65,
        evidenceIds: ['ind_value_1'],
        requiresConfirmation: true,
      },
    ];

    return candidates;
  }

  private generateDifferentiatorCandidates(
    context: BusinessBrainContextPayload
  ): CreativeCandidate[] {
    const diffs = context.differentiators && context.differentiators.length > 0
      ? context.differentiators
      : ['Zero Wait Time & Speedy Delivery', 'Personal Attentive Service', 'Fresh Local Ingredients Daily'];

    return diffs.map((diff, idx) => ({
      id: `cand_diff_${idx}`,
      dimension: 'DIFFERENTIATOR',
      value: diff,
      label: diff,
      source: idx === 0 ? 'BUSINESS_BRAIN' : 'CREATIVE_MEMORY',
      confidence: 0.80 - idx * 0.05,
      evidenceIds: [`ev_diff_${idx}`],
      requiresConfirmation: true,
    }));
  }

  private generateAudienceCandidates(
    context: BusinessBrainContextPayload
  ): CreativeCandidate[] {
    const segments = context.targetAudienceSegments && context.targetAudienceSegments.length > 0
      ? context.targetAudienceSegments
      : ['Local Families with Children', 'Busy Working Professionals', 'Neighborhood Regulars'];

    return segments.map((seg, idx) => ({
      id: `cand_aud_${idx}`,
      dimension: 'AUDIENCE',
      value: seg,
      label: seg,
      source: 'BUSINESS_BRAIN',
      confidence: 0.85 - idx * 0.05,
      evidenceIds: [`ev_aud_${idx}`],
      requiresConfirmation: true,
    }));
  }

  private generateProductCandidates(
    context: BusinessBrainContextPayload
  ): CreativeCandidate[] {
    const prods = context.featuredProducts && context.featuredProducts.length > 0
      ? context.featuredProducts
      : ['Flagship Special Combo', 'Weekend Offer Package'];

    return prods.map((p, idx) => ({
      id: `cand_prod_${idx}`,
      dimension: 'PRODUCT',
      value: p,
      label: p,
      source: 'BUSINESS_BRAIN',
      confidence: 0.90 - idx * 0.05,
      evidenceIds: [`ev_prod_${idx}`],
      requiresConfirmation: true,
    }));
  }

  private generateGeneralCandidates(
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): CreativeCandidate[] {
    return [
      {
        id: `cand_gen_1`,
        dimension,
        value: `${dimension} Grounded Focus`,
        label: `${context.businessName || 'Business'} ${dimension} Direction`,
        source: 'BUSINESS_BRAIN',
        confidence: 0.70,
        evidenceIds: ['ev_gen_1'],
        requiresConfirmation: true,
      },
    ];
  }
}
