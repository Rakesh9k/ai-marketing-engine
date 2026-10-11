/**
 * PHASE 27 — Industry Creative Intelligence Pack Types & Contracts
 * Structured schemas for Industry & Sub-Industry Models, Audience Situations,
 * Creative Mechanisms, Concept Patterns, Visual & Copy Principles, Proof Types,
 * Offer & CTA Patterns, Anti-Patterns, Strategic Tensions, Truth Rules, and Creative Bank Mappings.
 */

export type IndustryType = 'RESTAURANT' | 'SALON' | 'REAL_ESTATE' | 'GENERIC_LOCAL';

export type IndustryPackStatus = 'DRAFT' | 'TESTING' | 'ACTIVE' | 'DEPRECATED';

export interface SubIndustryPack {
  id: string;
  name: string;
  description: string;
  focusAttributes: string[];
}

export interface AudienceSituation {
  id: string;
  name: string;
  context: string;
  triggerEvent: string;
  emotionalNeed: string;
}

export interface IndustryCreativeMechanism {
  id: string;
  globalMechanismId: string;
  industryExpression: string;
}

export interface IndustryConceptPattern {
  id: string;
  name: string;
  situation: string;
  tension: string;
  mechanism: string;
  emotionalOutcome: string;
}

export interface VisualPrinciple {
  id: string;
  rule: string;
  rationale: string;
}

export interface CopyPrinciple {
  id: string;
  preferredPatterns: string[];
  avoidPatterns: string[];
}

export interface ProofType {
  id: string;
  name: string;
  description: string;
}

export interface OfferPattern {
  id: string;
  name: string;
  strategicRole: string;
}

export interface CTAPattern {
  id: string;
  text: string;
  journeyStage: string;
}

export interface IndustryAntiPattern {
  id: string;
  pattern: string;
  warningReason: string;
}

export interface IndustryStrategicTension {
  id: string;
  businessPositioning: string;
  requestedDirection: string;
  tradeOffExplanation: string;
}

export interface IndustryTruthRule {
  id: string;
  claimType: string;
  requiredEvidence: string;
}

export interface CreativeBankMapping {
  industryPackId: string;
  bankEntryId: string;
  relevanceScore: number;
  applicableSubIndustries: string[];
  applicableAudienceSituations: string[];
  compatibleMechanisms: string[];
}

export interface IndustryCreativePack {
  id: string;
  industry: IndustryType;
  version: string;
  status: IndustryPackStatus;
  description: string;
  subIndustries: SubIndustryPack[];
  audienceSituations: AudienceSituation[];
  creativeMechanisms: IndustryCreativeMechanism[];
  conceptPatterns: IndustryConceptPattern[];
  visualPrinciples: VisualPrinciple[];
  copyPrinciples: CopyPrinciple[];
  proofTypes: ProofType[];
  offerPatterns: OfferPattern[];
  ctaPatterns: CTAPattern[];
  antiPatterns: IndustryAntiPattern[];
  strategicTensions: IndustryStrategicTension[];
  truthRules: IndustryTruthRule[];
  creativeBankMappings: CreativeBankMapping[];
}

export interface IndustryPackResolution {
  industry: IndustryType;
  subIndustry?: string;
  packId: string;
  packVersion: string;
  confidence: number;
  fallbackUsed: boolean;
  pack: IndustryCreativePack;
}
