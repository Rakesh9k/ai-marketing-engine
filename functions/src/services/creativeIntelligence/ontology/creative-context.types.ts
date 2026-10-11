// File: functions/src/services/creativeIntelligence/ontology/creative-context.types.ts

import type { ConfidenceLevel } from './ontology-types';

/**
 * CreativeContext aggregates all relevant contextual signals required for retrieval.
 * Fields reuse canonical models where they exist; otherwise we define minimal placeholders.
 */
export interface CreativeContext {
  // Business information (authoritative source)
  business: any; // TODO: replace with BusinessContext type when available

  industry: any; // IndustryContext placeholder

  audience: any; // AudienceContext placeholder

  location: any; // LocationContext placeholder

  objective: any; // MarketingObjective placeholder

  offer?: any; // OfferContext optional placeholder

  product?: any; // ProductContext optional placeholder

  platform: any; // PlatformContext placeholder

  format: any; // FormatContext placeholder

  campaignStage: any; // CampaignStage placeholder

  awarenessStage?: any; // AwarenessStage optional placeholder

  purchaseIntent?: any; // PurchaseIntent optional placeholder

  seasonality?: any; // SeasonalityContext optional placeholder

  culturalContext?: any; // CulturalContext optional placeholder

  brandContext?: any; // BrandContext optional placeholder

  existingCreative?: any; // ExistingCreativeContext optional placeholder

  constraints?: any; // CreativeConstraints optional placeholder
}

/**
 * Context field completeness status for each signal.
 */
export interface ContextCompleteness {
  field: string;
  status: 'KNOWN' | 'UNKNOWN' | 'INFERRED' | 'NOT_APPLICABLE';
  confidence: ConfidenceLevel;
  source?: string;
}
