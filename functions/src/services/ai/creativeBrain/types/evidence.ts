import type { ID, ISODateTime } from "./primitives";
import type { ConfidenceLevel, EvidenceType } from "./enums";

export { EvidenceType };

export interface EvidenceReference {
  id: ID;
  type: EvidenceType;
  title: string;
  source?: string;
  url?: string;
  citation?: string;
  summary: string;
  context?: string;
  strength: ConfidenceLevel;
  relevantTo: ID[];
  verified: boolean;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

export interface EvidenceRequirement {
  claim: string;
  claimType:
    | "PRICE"
    | "SAVINGS"
    | "SCARCITY"
    | "URGENCY"
    | "SOCIAL_PROOF"
    | "PERFORMANCE"
    | "TRANSFORMATION"
    | "AUTHORITY"
    | "OTHER";
  required: boolean;
  satisfied: boolean;
  evidenceIds: ID[];
}
