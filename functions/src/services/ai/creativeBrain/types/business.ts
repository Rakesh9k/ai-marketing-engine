import type { ID, Money, ISODateTime, DurationRange } from "./primitives";
import type { LocationContext } from "./location";
import type { AudienceProfileReference } from "./audience";

export type PremiumLevel =
  | "PREMIUM"
  | "MID_MARKET"
  | "MASS_MARKET"
  | "UNKNOWN";

export interface BrandPositioning {
  positioning?: string;
  personality?: string[];
  tone?: string[];
  premiumLevel: PremiumLevel;
  prohibitedTreatments?: string[];
  preferredTreatments?: string[];
  brandValues?: string[];
}

export type CapabilityState = true | false | "UNKNOWN";

export interface BusinessCapabilities {
  booking: CapabilityState;
  reservation: CapabilityState;
  purchase: CapabilityState;
  whatsapp: CapabilityState;
  phone: CapabilityState;
  physicalLocation: CapabilityState;
  delivery: CapabilityState;
  onlineOrdering: CapabilityState;
}

export interface ContactDestination {
  available: CapabilityState;
  destination?: string;
  verified: boolean;
}

export interface ContactCapabilities {
  phone: ContactDestination;
  whatsapp: ContactDestination;
  website: ContactDestination;
  bookingUrl: ContactDestination;
  orderingUrl: ContactDestination;
  reservationUrl: ContactDestination;
}

export interface ProductReference {
  id: ID;
  name: string;
  category?: string;
  description?: string;
  verified: boolean;
  available: boolean;
  price?: Money;
  attributes?: Record<string, string | number | boolean>;
  evidenceIds?: ID[];
}

export interface ServiceReference {
  id: ID;
  name: string;
  category?: string;
  description?: string;
  verified: boolean;
  available: boolean;
  price?: Money;
  duration?: DurationRange;
  attributes?: Record<string, string | number | boolean>;
  evidenceIds?: ID[];
}

export type VerifiedFactCategory =
  | "PRODUCT"
  | "SERVICE"
  | "PRICE"
  | "OFFER"
  | "LOCATION"
  | "CAPABILITY"
  | "BUSINESS"
  | "PROOF"
  | "POLICY"
  | "OTHER";

export interface VerifiedBusinessFact {
  id: ID;
  statement: string;
  category: VerifiedFactCategory;
  source: string;
  verified: boolean;
  validFrom?: ISODateTime;
  validUntil?: ISODateTime;
}

export type BusinessRestrictionType =
  | "CLAIM"
  | "STYLE"
  | "CHANNEL"
  | "OFFER"
  | "AUDIENCE"
  | "LEGAL"
  | "BRAND"
  | "OPERATIONAL";

export type RestrictionSeverity = "WARNING" | "HARD";

export interface BusinessRestriction {
  id: ID;
  type: BusinessRestrictionType;
  rule: string;
  severity: RestrictionSeverity;
  source: string;
}

export type OperationalConstraintCategory =
  | "CAPACITY"
  | "INVENTORY"
  | "STAFF"
  | "TIMING"
  | "LOCATION"
  | "DELIVERY"
  | "BOOKING"
  | "PRODUCTION"
  | "OTHER";

export interface OperationalConstraint {
  id: ID;
  description: string;
  category: OperationalConstraintCategory;
  verified: boolean;
  severity: "SOFT" | "HARD";
}

export interface CulturalContext {
  country?: string;
  region?: string;
  city?: string;
  language?: string;
  dialect?: string;
  culturalNorms?: string[];
  festivals?: string[];
  seasonalContext?: string[];
  localReferences?: string[];
  platformCulture?: string[];
  prohibitedStereotypes?: string[];
}

export interface BusinessContext {
  businessId: ID;
  name: string;
  industry: string;
  subIndustry?: string;
  location?: LocationContext;
  description?: string;
  products: ProductReference[];
  services: ServiceReference[];
  audienceProfiles?: AudienceProfileReference[];
  brandPositioning?: BrandPositioning;
  capabilities: BusinessCapabilities;
  contactCapabilities: ContactCapabilities;
  operationalConstraints?: OperationalConstraint[];
  verifiedFacts: VerifiedBusinessFact[];
  restrictions: BusinessRestriction[];
  culturalContext?: CulturalContext;
  status: "ACTIVE" | "INCOMPLETE" | "RESTRICTED";
}
