/**
 * PHASE 10.38 — Creative Recipe Library Types
 * Defines the 5-layer Creative Recipe schema and composable variation interfaces.
 */

export type IndustryVertical =
  | "RESTAURANT"
  | "SALON"
  | "REAL_ESTATE"
  | "RETAIL"
  | "HEALTHCARE"
  | "B2B"
  | "EDUCATION"
  | "AUTOMOTIVE"
  | "UNIVERSAL";

export type RecipeMechanismRole = "PRIMARY" | "SECONDARY" | "SUPPORTING";

export type RecipeVariationAxis =
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY"
  | "EMOTION"
  | "OFFER_FRAMING"
  | "CTA";

export interface StrategicInputLayer {
  businessObjectives: string[];
  audienceSituations: string[];
  customerPainPoints: string[];
  targetSubVerticals?: string[];
}

export interface CreativeLogicLayer {
  primaryPsychologyId: string;
  secondaryPsychologyIds?: string[];
  primaryMechanismId: string;
  secondaryMechanismIds?: string[];
  insightPatternId?: string;
  mechanismRoles: Record<string, RecipeMechanismRole>;
}

export interface CreativeExpressionLayer {
  hookPatternIds: string[];
  storyStructureIds: string[];
  visualStructureIds: string[];
  copyStructureIds: string[];
  styleSystemIds?: string[];
  emotionalTerritories?: string[];
}

export interface CommercialActionLayer {
  offerMechanismIds: string[];
  ctaMechanismIds: string[];
  conversionIntent: string;
}

export interface ConstraintsLayer {
  allowedVariationAxes: RecipeVariationAxis[];
  antiPatternIds: string[];
  combinationRuleIds?: string[];
  unsupportedIndustries: IndustryVertical[];
  maxFrequencyDays?: number;
}

export interface CreativeRecipe {
  id: string;
  name: string;
  description: string;
  vertical: IndustryVertical;
  maturity: "DRAFT" | "ACTIVE" | "DEPRECATED";
  version: number;
  confidenceScore: number;

  // 5 Major Layers
  strategicInput: StrategicInputLayer;
  creativeLogic: CreativeLogicLayer;
  creativeExpression: CreativeExpressionLayer;
  commercialAction: CommercialActionLayer;
  constraints: ConstraintsLayer;

  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
  };
}

export interface RecipeRetrievalContext {
  industry: IndustryVertical;
  businessType: string;
  targetAudience?: string;
  campaignObjective?: string;
  offerType?: string;
  seasonality?: string;
  locationContext?: string;
  excludeRecipeIds?: string[];
}

export interface RecipeScoreBreakdown {
  strategicFit: number;
  audienceFit: number;
  objectiveFit: number;
  businessFit: number;
  mechanismFit: number;
  evidenceScore: number;
  diversityContribution: number;
  culturalFit: number;
}

export interface RankedRecipe {
  recipe: CreativeRecipe;
  totalScore: number;
  scoreBreakdown: RecipeScoreBreakdown;
  explanation: string;
}

export interface RecipeSandboxResult {
  isValid: boolean;
  recipeId: string;
  errors: string[];
  warnings: string[];
  generatedVariationsCount: number;
  sampleDirections?: Array<{
    hookId: string;
    storyId: string;
    visualId: string;
    copyId: string;
    offerId: string;
    ctaId: string;
  }>;
}
