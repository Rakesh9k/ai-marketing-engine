import type { ID, Money } from "./primitives";
import type { MarketingObjective } from "./enums";
import type { BusinessContext, BrandPositioning } from "./business";
import type { LocationContext } from "./location";
import type { AudienceContext, AudienceSituationReference } from "./audience";
import type { OfferContext } from "./offers";
import type { PlatformContext, FormatContext } from "./platforms";
import type { InsightPatternReference } from "./opportunity";

export interface IndustryContext {
  id: ID;
  name: string;
  category: string;
  subCategory?: string;
  supportedByMitra: boolean;
  characteristics?: string[];
  typicalSituations?: ID[];
  typicalProducts?: ID[];
  typicalServices?: ID[];
}

export interface ProductContext {
  productId?: ID;
  serviceId?: ID;
  name: string;
  type: "PRODUCT" | "SERVICE";
  category?: string;
  description?: string;
  verified: boolean;
  attributes?: Record<string, string | number | boolean>;
  price?: Money;
  proofIds?: ID[];
}

export type CampaignStage =
  | "DISCOVERY"
  | "AWARENESS"
  | "CONSIDERATION"
  | "CONVERSION"
  | "RETENTION"
  | "REACTIVATION"
  | "LOYALTY";

export interface CreativeContext {
  business: BusinessContext;
  industry: IndustryContext;
  audience: AudienceContext;
  location?: LocationContext;
  objective: MarketingObjective;
  offer?: OfferContext;
  product?: ProductContext;
  platform: PlatformContext;
  format: FormatContext;
  campaignStage: CampaignStage;
  situation?: AudienceSituationReference;
  insight?: InsightPatternReference;
  brand?: BrandPositioning;
}

export interface CreativeConstraints {
  brand?: string[];
  requiredClaims?: string[];
  prohibitedClaims?: string[];
  requiredAssets?: string[];
  unavailableAssets?: string[];
  platformRestrictions?: string[];
  culturalRestrictions?: string[];
  operationalRestrictions?: string[];
  userInstructions?: string[];
}
