# Phase 1G, 1H & 1I — Creative Blueprint, Decision Lifecycle, and Authority Model

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_BLUEPRINT_AND_LIFECYCLE.md`  

---

## Phase 1G — Creative Blueprint Definition

The **Creative Blueprint** is the final, validated, structured output produced by Creative Brain. It encapsulates the winning strategic reasoning and provides concrete directives for downstream pipeline stages (Campaign Strategy, Copy Generation, Image Prompts, and Compositing).

### TypeScript Contract: `CreativeBlueprint`

```typescript
import type { CreativeOpportunity } from './PHASE_1_OPPORTUNITIES_CONCEPTS_AND_SCORING';
import type { CreativeConcept } from './PHASE_1_OPPORTUNITIES_CONCEPTS_AND_SCORING';
import type {
  CreativeObjective,
  CTAType,
  VisualEmphasis,
  VisualComposition,
  LanguageCode,
  RegionalStyle,
} from '../types';

export interface StrategyDirectives {
  readonly angle: string;
  readonly hook: string;
  readonly offerFraming: string;
  readonly audienceInsight: string;
  readonly keyMessages: readonly string[];
  readonly ctaPrimary: string;
  readonly differentiators: readonly string[];
}

export interface CopyDirectives {
  readonly headlineTone: string;
  readonly requiredKeywords: readonly string[];
  readonly prohibitedTerms: readonly string[];
  readonly maxHeadlineLength: number;
  readonly primaryLanguage: LanguageCode;
  readonly regionalStyle: RegionalStyle;
}

export interface VisualDirectives {
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
  readonly evaluatedConceptsCount: number;
  readonly winningConceptId: string;
  readonly winningScore: number;
  readonly reasoningSummary: string;
  readonly generatedAt: string;
}

export interface CreativeBlueprint {
  /** Unique blueprint identifier */
  readonly blueprintId: string;
  
  /** Target campaign ID */
  readonly campaignId: string;
  
  /** Target business ID */
  readonly businessId: string;
  
  /** Selected Creative Opportunity */
  readonly opportunity: CreativeOpportunity;
  
  /** Selected Winning Creative Concept */
  readonly winningConcept: CreativeConcept;
  
  /** Selected Template ID */
  readonly selectedTemplateId: string;
  
  /** Stage 3 Campaign Strategy Directives */
  readonly strategyDirectives: StrategyDirectives;
  
  /** Stage 5 Copy Generation Directives */
  readonly copyDirectives: CopyDirectives;
  
  /** Stage 6 & 7 Visual & Compositor Directives */
  readonly visualDirectives: VisualDirectives;
  
  /** Blueprint evaluation and trace metadata */
  readonly trace: CreativeBlueprintTrace;
}
```

---

## Phase 1H — Decision Lifecycle Definition

Creative Brain operates as a finite state machine during a campaign generation run.

### Lifecycle State Machine Diagram

```
[INITIALIZING]
      │
      ▼
[INSPECTING_CONTEXT]  ---> (Fetch Business Brain, Product, Memory & Inputs)
      │
      ▼
[FORMING_OPPORTUNITY] ---> (Discover strategic market leverage opportunity)
      │
      ▼
[GENERATING_CONCEPTS] ---> (Generate 3 candidate Creative Concepts)
      │
      ▼
[EVALUATING_CONCEPTS] ---> (Score concepts across 5 dimensions, check Truth)
      │
      ▼
[SELECTING_WINNER]    ---> (Pick highest score >= 70)
      │
      ├───────────────────────────────┐ (Score < 70 or Error)
      │ (Success: Winner Found)       │
      ▼                               ▼
[COMPOSING_BLUEPRINT]       [FALLBACK_TRIGGERED]
      │                               │
      ▼                               │ (Construct Baseline Blueprint)
[VALIDATING_BLUEPRINT]                │
      │                               │
      └──────────────┬────────────────┘
                     │
                     ▼
             [EMITTING_BLUEPRINT]
```

### State Definitions

1. `INITIALIZING`: Input validation and memory context assembly.
2. `INSPECTING_CONTEXT`: Parsing Business Brain facts, product metadata, and historical signals.
3. `FORMING_OPPORTUNITY`: Generating the strategic `CreativeOpportunity`.
4. `GENERATING_CONCEPTS`: Producing candidate `CreativeConcept` variants.
5. `EVALUATING_CONCEPTS`: Running the 5-dimension scoring model (`ConceptScore`).
6. `SELECTING_WINNER`: Identifying the top-scoring viable concept ($\text{TotalScore} \ge 70$).
7. `COMPOSING_BLUEPRINT`: Assembling `CreativeBlueprint` directives.
8. `VALIDATING_BLUEPRINT`: Verifying zero pre-execution truth check conflicts.
9. `EMITTING_BLUEPRINT`: Outputting `CreativeBlueprint` to host `GenerationPipeline`.
10. `FALLBACK_TRIGGERED`: Emergency transition to baseline blueprint on low score or reasoning timeout.

---

## Phase 1I — Truth, Authority, and Confidence Model

To guarantee that Creative Brain never hallucinates or overrides real business facts, information is organized into four hierarchical **Authority Levels**.

```
+-------------------------------------------------------------------------------+
|  LEVEL 0: AUTHORITATIVE BUSINESS TRUTH (NON-NEGOTIABLE)                      |
|  - Business Name, WhatsApp, Location, Verified Prices, Operating Hours         |
|  - Authority: Absolute (100%). Violations immediately invalidate concepts.   |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  LEVEL 1: SYSTEM RULES & CONSTRAINTS (HIGH AUTHORITY)                         |
|  - VerticalConfig allowed CTAs/Objectives, SavedStyle rules, BrandKit colors  |
|  - Authority: High (90%). Overrides user prompts that break system rules.     |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  LEVEL 2: HISTORICAL MEMORY & PREFERENCES (INFLUENTIAL / HEURISTIC)           |
|  - CreativePreference, CreativeFeedback, CampaignPerformance CTR signals       |
|  - Authority: Medium (70%). Modifies concept scoring weights.                  |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  LEVEL 3: CREATIVE REASONING & HYPOTHESES (INFERRED / CANDIDATE)              |
|  - AI-generated angles, hooks, story themes, visual composition hints          |
|  - Authority: Low (Subject to evaluation). Must satisfy Levels 0, 1 & 2.      |
+-------------------------------------------------------------------------------+
```

### Hierarchy Enforcement Rule
* **Level 0 > Level 1 > Level 2 > Level 3**
* A higher-level fact **always invalidates** a lower-level hypothesis. For example, if Level 3 reasoning suggests a hook claiming "Free Delivery Worldwide," but Level 0 Business Brain specifies `deliveryRadiusKm: 5`, Level 0 instantly rejects the hook ($S_{\text{truth}} = 0$).
