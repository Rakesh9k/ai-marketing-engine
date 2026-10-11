import type { ID } from "./primitives";
import type { ConfidenceLevel, MarketingObjective, PurchaseIntentLevel } from "./enums";
import type { ContactDestination } from "./business";

export type CTAIntent =
  | "EXPLORE"
  | "SAVE"
  | "SHARE"
  | "FOLLOW"
  | "VISIT"
  | "MESSAGE"
  | "WHATSAPP"
  | "TRY"
  | "CLAIM"
  | "BOOK"
  | "RESERVE"
  | "CALL"
  | "DIRECT_PURCHASE";

export interface CTAIntentReference {
  id: ID;
  name: string;
  definition: string;
  intent: CTAIntent;
  friction: "LOW" | "MEDIUM" | "HIGH";
  typicalIntentLevel: "COLD" | "WARM" | "HOT";
  typicalDecisionStages: Array<"TOFU" | "MOFU" | "BOFU">;
  businessCapabilityRequirements: string[];
  compatibleObjectives: MarketingObjective[];
  compatiblePlatforms: ID[];
  risks: string[];
  antiPatterns: string[];
  ethicalBoundaries: string[];
  confidence: ConfidenceLevel;
}

export interface CTADirection {
  intent: CTAIntentReference;
  desiredBehavior: string;
  friction: "LOW" | "MEDIUM" | "HIGH";
  readiness: PurchaseIntentLevel;
  rationale: string;
  destination?: ContactDestination;
  constraints: string[];
}
