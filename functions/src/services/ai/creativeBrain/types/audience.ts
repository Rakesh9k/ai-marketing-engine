import type { ID } from "./primitives";
import type { ConfidenceLevel, AwarenessStage, PurchaseIntentLevel } from "./enums";
import type { CulturalContext } from "./business";
import type { Assumption } from "./assumptions";

export interface AudienceProfileReference {
  id: ID;
  name: string;
  description: string;
  motivations: string[];
  barriers: string[];
  characteristics?: string[];
}

export interface AudienceContext {
  description: string;
  profileId?: ID;
  situationId?: ID;
  motivations: string[];
  barriers: string[];
  desiredOutcomes: string[];
  awarenessStage: AwarenessStage;
  purchaseIntent: PurchaseIntentLevel;
  trustLevel?: ConfidenceLevel;
  uncertaintyLevel?: ConfidenceLevel;
}

export interface AudienceSituationReference {
  id: ID;
  name: string;
  description: string;
  industry?: string;
  trigger?: string;
  audience?: AudienceProfileReference;
  motivations: string[];
  barriers: string[];
  desiredOutcome: string;
  awarenessStage?: AwarenessStage;
  purchaseIntent?: PurchaseIntentLevel;
  seasonality?: string[];
  daypart?: string;
  culturalContext?: CulturalContext;
  confidence: ConfidenceLevel;
  evidenceIds: ID[];
  assumptions: Assumption[];
}
