# Implementation Contract Specification (Phase 1M)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1M)  
**Location**: `docs/creative-brain/IMPLEMENTATION_CONTRACT.md`  

---

## 1. Overview & Insertion Target

This document provides the implementation-ready TypeScript contracts for the `CreativeBrainService`. 

**Target Insertion Point**:  
`functions/src/services/ai/pipeline.ts` inside `GenerationPipeline.execute()`, after Stage 2 (Product Understanding) and before Stage 3 (Campaign Strategy).

---

## 2. Exhaustive TypeScript Interfaces

```typescript
import type {
  BusinessBrain,
  BusinessCategory,
  CampaignObjective,
  OfferType,
  CTAType,
  LocalizationProfile,
  SavedStyleContext,
  CreativePreference,
  CreativeFeedback,
  CreativeGrammarStep,
  VisualEmphasis,
  VisualComposition,
  SavedStyleTone,
  LanguageCode,
  RegionalStyle,
} from '../types';
import type { BusinessUnderstandingOutput, ProductUnderstandingOutput } from './pipeline';

// ============================================================================
// 1. INPUT CONTRACT: CreativeBrainInput
// ============================================================================

export interface CreativeBrainMemoryContext {
  readonly preferences: readonly CreativePreference[];
  readonly feedback: readonly CreativeFeedback[];
  readonly activeSavedStyle?: SavedStyleContext;
  readonly performanceRecommendations?: {
    readonly topPerformingAngles?: readonly string[];
    readonly topPerformingCTAs?: readonly string[];
    readonly historicalCTR?: number;
    readonly totalWhatsAppClicks?: number;
  };
}

export interface CreativeBrainCampaignIntent {
  readonly campaignId?: string;
  readonly businessId: string;
  readonly objective: CampaignObjective;
  readonly templateId?: string;
  readonly styleId?: string;
  readonly offer: {
    readonly headline: string;
    readonly description?: string;
    readonly price: number;
    readonly originalPrice?: number;
    readonly type: OfferType;
    readonly validityStart: string;
    readonly validityEnd: string;
    readonly terms?: string;
  };
  readonly duration: {
    readonly start: string;
    readonly end: string;
  };
  readonly audience: {
    readonly localities: readonly string[];
    readonly ageRange?: { readonly min: number; readonly max: number };
    readonly occasion?: string;
  };
  readonly cta: CTAType;
  readonly localization: LocalizationProfile;
}

export interface CreativeBrainConflictConstraints {
  readonly nonNegotiableRules: Record<string, string>;
  readonly directives: readonly string[];
  readonly detectedConflictsCount: number;
}

export interface CreativeBrainInput {
  readonly businessBrain: BusinessBrain;
  readonly vertical: BusinessCategory;
  readonly productContext?: {
    readonly productId?: string;
    readonly name: string;
    readonly description?: string;
    readonly price: number;
    readonly category?: string;
    readonly images: readonly string[];
  };
  readonly intent: CreativeBrainCampaignIntent;
  readonly businessUnderstanding: BusinessUnderstandingOutput;
  readonly productUnderstanding?: ProductUnderstandingOutput;
  readonly memory: CreativeBrainMemoryContext;
  readonly conflictConstraints: CreativeBrainConflictConstraints;
}

// ============================================================================
// 2. CREATIVE OPPORTUNITY CONTRACT: CreativeOpportunity
// ============================================================================

export interface OpportunityConstraintSet {
  readonly maxTextDensity: 'low' | 'medium' | 'high';
  readonly toneBoundary: string;
  readonly factualLimits: readonly string[];
}

export interface CreativeOpportunity {
  readonly opportunityId: string;
  readonly vertical: BusinessCategory;
  readonly problem: string;
  readonly tension: string;
  readonly motivation: string;
  readonly occasion?: string;
  readonly audienceInsight: string;
  readonly opportunityStatement: string;
  readonly desiredBusinessOutcome: string;
  readonly desiredAudienceResponse: string;
  readonly supportingSignals: readonly string[];
  readonly constraints: OpportunityConstraintSet;
  readonly confidence: number; // 0 - 100
  readonly rationale: string;
}

// ============================================================================
// 3. CONCEPT SCORE CONTRACT: CreativeConceptScore
// ============================================================================

export interface ConceptScoreBreakdown {
  readonly truthAlignment: number;       // Max 25 (100% Deterministic Hard Gate)
  readonly brandFit: number;             // Max 20
  readonly audienceRelevance: number;    // Max 20
  readonly offerFit: number;             // Max 15
  readonly historicalPerformance: number;// Max 10
  readonly executionFeasibility: number; // Max 10
}

export interface CreativeConceptScore {
  readonly totalScore: number;          // 0 - 100
  readonly breakdown: ConceptScoreBreakdown;
  readonly evaluationNotes: readonly string[];
  readonly isViable: boolean;           // Total Score >= 70
}

// ============================================================================
// 4. CREATIVE CONCEPT CONTRACT: CreativeConcept
// ============================================================================

export interface VisualPremiseSpecification {
  readonly emphasis: VisualEmphasis;
  readonly composition: VisualComposition;
  readonly mood: string;
  readonly compositionHints: readonly string[];
}

export interface CreativeConcept {
  readonly conceptId: string;
  readonly opportunityId: string;
  readonly title: string;
  readonly angle: string;
  readonly coreIdea: string;
  readonly hookDirection: string;
  readonly emotionalDriver: SavedStyleTone;
  readonly audienceFraming: string;
  readonly message: string;
  readonly offerFraming: string;
  readonly ctaDirection: string;
  readonly visualPremise: VisualPremiseSpecification;
  readonly differentiation: string;
  readonly expectedResponse: string;
  readonly templateId: string;
  readonly grammar: readonly CreativeGrammarStep[];
  readonly score: CreativeConceptScore;
}

// ============================================================================
// 5. CREATIVE BLUEPRINT CONTRACT: CreativeBlueprint
// ============================================================================

export interface BlueprintStrategyDirectives {
  readonly angle: string;
  readonly hook: string;
  readonly offerFraming: string;
  readonly audienceInsight: string;
  readonly keyMessages: readonly string[];
  readonly ctaPrimary: string;
  readonly differentiators: readonly string[];
}

export interface BlueprintCopyDirectives {
  readonly headlineTone: string;
  readonly requiredKeywords: readonly string[];
  readonly prohibitedTerms: readonly string[];
  readonly maxHeadlineLength: number;
  readonly primaryLanguage: LanguageCode;
  readonly regionalStyle: RegionalStyle;
}

export interface BlueprintVisualDirectives {
  readonly emphasis: VisualEmphasis;
  readonly composition: VisualComposition;
  readonly visualMood: string;
  readonly heroPromptGuidance: string;
  readonly textOverlayRules: {
    readonly showPrice: boolean;
    readonly showOriginalPriceStrikethrough: boolean;
    readonly showOfferBadge: boolean;
    readonly ctaPlacement: 'bottom' | 'top' | 'integrated';
  };
}

export interface CreativeBlueprintTrace {
  readonly traceId: string;
  readonly evaluatedConceptsCount: number;
  readonly winningConceptId: string;
  readonly winningScore: number;
  readonly reasoningSummary: string;
  readonly generatedAt: string;
}

export interface CreativeBlueprint {
  readonly blueprintId: string;
  readonly campaignId: string;
  readonly businessId: string;
  readonly opportunity: CreativeOpportunity;
  readonly winningConcept: CreativeConcept;
  readonly selectedTemplateId: string;
  readonly strategyDirectives: BlueprintStrategyDirectives;
  readonly copyDirectives: BlueprintCopyDirectives;
  readonly visualDirectives: BlueprintVisualDirectives;
  readonly trace: CreativeBlueprintTrace;
}

// ============================================================================
// 6. CREATIVE BRAIN RESULT CONTRACT: CreativeBrainResult
// ============================================================================

export interface CreativeBrainResult {
  readonly success: boolean;
  readonly blueprint: CreativeBlueprint;
  readonly fallbackTriggered: boolean;
  readonly executionTimeMs: number;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}
```
