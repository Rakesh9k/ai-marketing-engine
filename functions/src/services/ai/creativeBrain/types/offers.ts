import type { ID, Money } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { EvidenceRequirement } from "./evidence";
import type { OperationalConstraint } from "./business";

export interface OfferComponentReference {
  id: ID;
  name: string;
  type:
    | "CORE_PRODUCT"
    | "SERVICE"
    | "ADDON"
    | "EXPERIENCE"
    | "CONVENIENCE"
    | "PROOF"
    | "ACCESS"
    | "SUPPORT";
  description: string;
  included: boolean;
  verified: boolean;
}

export interface OfferContext {
  offerId?: ID;
  name?: string;
  description?: string;
  structureId?: ID;
  objective?: MarketingObjective;
  verified: boolean;
  components: OfferComponentReference[];
  price?: Money;
  eligibility?: string;
  validity?: string;
  capacity?: string;
  valueMechanism?: string;
  customerBarrier?: string;
  requiredEvidence: EvidenceRequirement[];
  operationalConstraints: OperationalConstraint[];
  confidence: ConfidenceLevel;
}

export interface OfferDirection {
  offerStructureId?: ID;
  offerPurpose: string;
  valueMechanism?: string;
  customerBarrier?: string;
  perceivedValueEffect?: string;
  priceRole?: string;
  riskReduction?: string;
  convenienceRole?: string;
  experienceRole?: string;
  verifiedClaims: string[];
  unverifiedClaims: string[];
  operationalConstraints: string[];
}
