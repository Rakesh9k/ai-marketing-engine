/**
 * PHASE 26 — Strategic Tension Detector
 * Detects strategic trade-offs between Business Brain positioning and user campaign instructions.
 * Formulates respectful trade-off explanations, potential risks/benefits, and strategic choices.
 */

import type {
  StrategicTension,
  StrategicTensionDimension,
  StrategicTensionOption,
  StrategicEvidence,
} from './strategicTension.types';
import { StrategicTensionClassifier } from './strategicTensionClassifier';
import type { ConfidenceEngine } from '../confidence/confidenceEngine';

export interface BusinessProfileSnapshot {
  businessId: string;
  businessName?: string;
  positioning?: string; // e.g. 'Premium neighborhood dining'
  brandTone?: string;
  targetAudience?: string;
  prohibitedClaims?: string[];
  confidenceScore?: number; // Positioning confidence from Phase 24
}

export class StrategicTensionDetector {
  constructor(private confidenceEngine?: ConfidenceEngine) {}

  /**
   * Evaluates campaign intent and user instructions against business positioning.
   */
  public detectTension(
    tenantId: string,
    businessId: string,
    campaignId: string,
    userInstruction: string,
    profile: BusinessProfileSnapshot
  ): StrategicTension | null {
    const bizName = profile.businessName || 'your business';
    const pos = profile.positioning || 'Premium Quality';
    const lowerUser = userInstruction.toLowerCase();
    const lowerPos = pos.toLowerCase();

    // 1. Classify conflict category
    const category = StrategicTensionClassifier.classifyConflict({
      dimension: 'POSITIONING',
      userStatement: userInstruction,
      businessContextStatement: pos,
      isTruthClaimUnverified: userInstruction.toLowerCase().includes('#1 restaurant'),
      isExplicitBrandProhibition: profile.prohibitedClaims?.some((c) => lowerUser.includes(c.toLowerCase())),
    });

    if (category === 'CREATIVE_PREFERENCE_DIFFERENCE') {
      return null; // Silent adaptation
    }

    // 2. Identify dimension & detect price/positioning tension
    let dimension: StrategicTensionDimension = 'POSITIONING';
    let isPricePositioningTension = false;
    let isAudienceTension = false;

    if ((lowerPos.includes('premium') || lowerPos.includes('luxury') || lowerPos.includes('fine dining')) &&
        (lowerUser.includes('discount') || lowerUser.includes('cheap') || lowerUser.includes('299') || lowerUser.includes('50% off'))) {
      isPricePositioningTension = true;
      dimension = 'PRICE';
    } else if (lowerPos.includes('family') && (lowerUser.includes('youth only') || lowerUser.includes('teens only'))) {
      isAudienceTension = true;
      dimension = 'AUDIENCE';
    } else if (category === 'TRUTH_CONSTRAINT' || category === 'BRAND_CONSTRAINT_CONFLICT') {
      dimension = 'POSITIONING';
    } else {
      return null; // No tension detected
    }

    // Determine confidence & phrasing strength based on Phase 24 confidence
    const posConfidence = profile.confidenceScore ?? 0.90;
    const isFirmChallenge = posConfidence >= 0.80;

    const evidence: StrategicEvidence[] = [
      {
        source: 'BUSINESS_BRAIN',
        statement: `Business is positioned around "${pos}".`,
        confidence: posConfidence,
      },
      {
        source: 'USER_INSTRUCTION',
        statement: `User requested direction: "${userInstruction}".`,
        confidence: 0.99,
      },
    ];

    let conflictExplanation = '';
    let options: StrategicTensionOption[] = [];

    if (category === 'TRUTH_CONSTRAINT') {
      conflictExplanation = `I can't support the "${userInstruction}" claim without verified factual proof. We can create a strong campaign without that claim.`;
      options = [
        {
          id: 'opt_truth_remove',
          label: 'Proceed without unverified claim',
          tagline: 'Focus on verified product strengths',
          description: 'Keep the campaign authentic and compliant.',
          resolutionType: 'FOLLOW_BUSINESS_STRATEGY',
          strategicTradeOff: 'Ensures truth check compliance.',
        },
      ];
    } else if (category === 'BRAND_CONSTRAINT_CONFLICT') {
      conflictExplanation = `Your business profile explicitly prohibits "${userInstruction}".`;
      options = [
        {
          id: 'opt_brand_respect',
          label: 'Respect brand constraints',
          tagline: 'Adhere to non-negotiable brand rules',
          description: 'Protect brand standards.',
          resolutionType: 'FOLLOW_BUSINESS_STRATEGY',
          strategicTradeOff: 'Prevents brand rule violation.',
        },
      ];
    } else if (isPricePositioningTension) {
      conflictExplanation = isFirmChallenge
        ? `There's a strategic tension here. ${bizName} is positioned around ${pos}, while this direction leads heavily with price.`
        : `I see a possible strategic tension here. ${bizName} leans toward ${pos}, while this direction emphasizes a price offer.`;

      options = [
        {
          id: 'opt_lead_price',
          label: 'Lead with price',
          tagline: 'Make the discount offer the main story',
          description: 'Maximizes immediate attention and deal urgency, while maintaining premium visual quality.',
          resolutionType: 'FOLLOW_USER_DIRECTION',
          strategicTradeOff: 'Increases short-term conversion but may make the brand feel more price-led.',
        },
        {
          id: 'opt_lead_premium',
          label: 'Protect premium positioning',
          tagline: 'Make the experience the main story',
          description: 'Keep ${pos} as the hero message and use the offer as supporting proof.',
          resolutionType: 'FOLLOW_BUSINESS_STRATEGY',
          isRecommended: true,
          strategicTradeOff: 'Protects long-term brand equity while offering accessible value.',
        },
        {
          id: 'opt_show_both',
          label: 'Show me both',
          tagline: 'Generate two distinct strategic directions',
          description: 'Compare a price-led concept against a premium-experience-led concept.',
          resolutionType: 'COMPARE_OPTIONS',
          strategicTradeOff: 'Lets you evaluate both trade-offs visually before deciding.',
        },
      ];
    } else if (isAudienceTension) {
      conflictExplanation = `There's a strategic tension here. ${bizName} is known for family audiences, while this requested direction focuses exclusively on youth.`;
      options = [
        {
          id: 'opt_youth_lead',
          label: 'Focus on youth audience',
          tagline: 'Target young demographic',
          description: 'Attract a new customer segment.',
          resolutionType: 'FOLLOW_USER_DIRECTION',
          strategicTradeOff: 'Expands reach to youth but may alienate core family regulars.',
        },
        {
          id: 'opt_family_lead',
          label: 'Protect core family audience',
          tagline: 'Keep family positioning',
          description: 'Focus on your core customer base.',
          resolutionType: 'FOLLOW_BUSINESS_STRATEGY',
          isRecommended: true,
          strategicTradeOff: 'Reinforces family loyalty.',
        },
        {
          id: 'opt_show_both',
          label: 'Show me both',
          tagline: 'Compare both audience angles',
          description: 'Evaluate family vs youth concepts.',
          resolutionType: 'COMPARE_OPTIONS',
          strategicTradeOff: 'Visualizes trade-offs for both demographics.',
        },
      ];
    }

    return {
      id: `tension_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      campaignId,
      tenantId,
      businessId,
      dimension,
      severity: category === 'STRATEGIC_TENSION' ? 'MEDIUM' : 'HIGH',
      category,
      businessDirection: {
        name: pos,
        description: `Positioned around ${pos}.`,
        leadAttribute: pos,
        supportingAttributes: ['Quality', 'Authenticity'],
      },
      userDirection: {
        name: userInstruction,
        description: `Requested: ${userInstruction}`,
        leadAttribute: userInstruction,
        supportingAttributes: ['Promotional Urgency'],
      },
      conflictExplanation,
      evidence,
      potentialBenefits: [
        'Increases immediate campaign visibility and offer awareness.',
        'Triggers immediate customer action.',
      ],
      potentialRisks: [
        'May dilute long-term premium brand equity.',
        'May attract price-sensitive shoppers rather than loyal regulars.',
      ],
      recommendedOptions: options,
      status: 'DETECTED',
      createdAt: new Date().toISOString(),
    };
  }
}
