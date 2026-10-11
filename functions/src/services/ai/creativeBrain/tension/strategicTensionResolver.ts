/**
 * PHASE 26 — Strategic Tension Resolver
 * Applies user strategic choices (Lead with price, Protect premium, Show me both, Hybrid),
 * updates campaign strategy directives, and stores decisions in Strategic Tension Memory.
 */

import type {
  StrategicTension,
  StrategicTensionResolution,
  StrategicTensionMemory,
} from './strategicTension.types';

export interface TensionResolutionOutcome {
  tensionId: string;
  campaignId: string;
  resolution: StrategicTensionResolution;
  selectedOptionId: string;
  strategicOverride: boolean;
  adaptedStrategyDirectives: {
    heroMessage: string;
    supportingMessage: string;
    offerRole: string;
    brandTone: string;
    visualQuality: string;
  };
  comparedDirections?: Array<{
    name: string;
    reasonToCare: string;
    messageHierarchy: string;
    emotionalTerritory: string;
    offerRole: string;
  }>;
  memoryRecord: StrategicTensionMemory;
}

export class StrategicTensionResolver {
  /**
   * Resolves a strategic tension based on user option selection.
   */
  public resolveTension(
    tension: StrategicTension,
    selectedOptionId: string
  ): TensionResolutionOutcome {
    const selectedOpt = tension.recommendedOptions.find((o) => o.id === selectedOptionId) || tension.recommendedOptions[0];
    const resolution = selectedOpt.resolutionType;

    let strategicOverride = false;
    let heroMessage = '';
    let supportingMessage = '';
    let offerRole = '';
    let brandTone = 'Warm & Refined';
    let comparedDirections: TensionResolutionOutcome['comparedDirections'] = undefined;

    switch (resolution) {
      case 'FOLLOW_USER_DIRECTION':
        strategicOverride = true;
        heroMessage = `Price-led value: ${tension.userDirection.name}`;
        supportingMessage = `Grounded in ${tension.businessDirection.name} quality`;
        offerRole = 'Hero Conversion Message';
        brandTone = 'Energetic & Accessible';
        break;

      case 'FOLLOW_BUSINESS_STRATEGY':
        strategicOverride = false;
        heroMessage = `Premium experience: ${tension.businessDirection.name}`;
        supportingMessage = `Accessible value offer (${tension.userDirection.name})`;
        offerRole = 'Supporting Accessibility Proof';
        brandTone = 'Warm & Refined';
        break;

      case 'CREATE_HYBRID':
        strategicOverride = false;
        heroMessage = `${tension.businessDirection.name} made accessible with ${tension.userDirection.name}`;
        supportingMessage = 'Uncompromising quality meets surprising value';
        offerRole = 'Balanced Value Element';
        brandTone = 'Warm, Inviting & Value-conscious';
        break;

      case 'COMPARE_OPTIONS':
        strategicOverride = false;
        heroMessage = 'Comparative strategic evaluation';
        supportingMessage = 'Evaluating Price-led vs Premium-led options';
        offerRole = 'Contextual to selected direction';
        comparedDirections = [
          {
            name: 'Direction A — Price-Led Value',
            reasonToCare: 'Unexpected value for premium quality',
            messageHierarchy: `${tension.userDirection.name} (Hero) → ${tension.businessDirection.name} (Supporting)`,
            emotionalTerritory: 'Surprise & Urgent Delight',
            offerRole: 'Hero Focus',
          },
          {
            name: 'Direction B — Premium Experience-Led',
            reasonToCare: 'Uncompromising experience and family memory',
            messageHierarchy: `${tension.businessDirection.name} (Hero) → ${tension.userDirection.name} (Supporting)`,
            emotionalTerritory: 'Warmth, Connection & Reassurance',
            offerRole: 'Supporting Proof',
          },
        ];
        break;

      default:
        heroMessage = tension.businessDirection.name;
        supportingMessage = tension.userDirection.name;
        offerRole = 'Supporting Element';
        break;
    }

    tension.status = strategicOverride ? 'OVERRIDDEN' : 'RESOLVED';
    tension.resolution = resolution;
    tension.resolvedAt = new Date().toISOString();

    const memoryRecord: StrategicTensionMemory = {
      id: `mem_tension_${Date.now()}`,
      businessId: tension.businessId,
      campaignId: tension.campaignId,
      dimension: tension.dimension,
      businessDirection: tension.businessDirection.name,
      requestedDirection: tension.userDirection.name,
      resolution,
      selectedDirection: selectedOpt.label,
      createdAt: new Date().toISOString(),
    };

    return {
      tensionId: tension.id,
      campaignId: tension.campaignId,
      resolution,
      selectedOptionId,
      strategicOverride,
      adaptedStrategyDirectives: {
        heroMessage,
        supportingMessage,
        offerRole,
        brandTone,
        visualQuality: 'High-end production standards maintained',
      },
      comparedDirections,
      memoryRecord,
    };
  }
}
