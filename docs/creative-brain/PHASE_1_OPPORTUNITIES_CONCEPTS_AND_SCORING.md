# Phase 1D, 1E & 1F — Creative Opportunities, Concepts, and Scoring Model

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_OPPORTUNITIES_CONCEPTS_AND_SCORING.md`  

---

## Phase 1D — Creative Opportunity Definition

A **Creative Opportunity** represents the strategic space discovered by synthesizing business truth, product attributes, target audience desires, and market timing. It answers: *"What specific market leverage point should this campaign capitalize on right now?"*

### TypeScript Contract: `CreativeOpportunity`

```typescript
import type { CreativeObjective, BusinessCategory } from '../types';

export interface CreativeOpportunityConstraints {
  /** Maximum copy text density to maintain legibility */
  readonly maxTextDensity: 'low' | 'medium' | 'high';
  /** Strict tone boundaries (e.g. "Do not use sarcastic humor for luxury salon") */
  readonly toneBoundary: string;
  /** Non-negotiable pricing/factual limits extracted from Business Brain */
  readonly factualLimits: readonly string[];
}

export interface CreativeOpportunity {
  /** Unique identifier for the opportunity */
  readonly opportunityId: string;
  
  /** Business category vertical */
  readonly vertical: BusinessCategory;
  
  /** Resolved creative objective */
  readonly coreObjective: CreativeObjective;
  
  /** Targeted customer segment or demographic insight */
  readonly primaryTargetAudience: string;
  
  /** Underlying psychological insight driving customer behavior */
  readonly keyInsight: string;
  
  /** The core positioning angle that sets the campaign apart */
  readonly strategicAngle: string;
  
  /** Market barriers or customer objections to overcome */
  readonly competingForces: readonly string[];
  
  /** Potential perception risks or compliance flags */
  readonly riskFactors: readonly string[];
  
  /** Execution and boundary constraints */
  readonly constraints: CreativeOpportunityConstraints;
  
  /** Confidence score of this opportunity (0 to 100) */
  readonly confidenceScore: number;
}
```

---

## Phase 1E — Creative Concept Definition

A **Creative Concept** is a concrete expression of a Creative Opportunity. It defines the narrative hook, grammar structure, visual emphasis, and template mapping needed to bring the opportunity to life.

### TypeScript Contract: `CreativeConcept`

```typescript
import type {
  CreativeGrammarStep,
  VisualEmphasis,
  VisualComposition,
  SavedStyleTone,
  SavedStyleComposition,
} from '../types';

export interface VisualDirectionSpecification {
  /** Primary visual focus (product-led, text-led, image-led, offer-led) */
  readonly emphasis: VisualEmphasis;
  /** Spatial layout composition (hero-product, split-composition, editorial, minimal, high-contrast) */
  readonly composition: VisualComposition;
  /** Desired emotional mood of the visual */
  readonly mood: string;
  /** Color palette hints derived from BrandKit / SavedStyle */
  readonly colorPaletteHints?: readonly string[];
  /** Composition guidance for hero image generation */
  readonly compositionHints: readonly string[];
}

export interface CreativeConcept {
  /** Unique concept identifier */
  readonly conceptId: string;
  
  /** Parent opportunity identifier */
  readonly opportunityId: string;
  
  /** Concept title for internal tracking and trace logging */
  readonly title: string;
  
  /** Attention-grabbing opening line or visual hook concept */
  readonly hook: string;
  
  /** The specific narrative angle used to present the product/offer */
  readonly narrativeAngle: string;
  
  /** Ordered sequence of creative grammar roles (hook -> problem -> product -> offer -> cta) */
  readonly grammar: readonly CreativeGrammarStep[];
  
  /** Art direction & visual specifications */
  readonly visualDirection: VisualDirectionSpecification;
  
  /** Selected template ID from CreativeTemplateRegistry */
  readonly templateId: string;
  
  /** Quantitative evaluation score (defined in Phase 1F) */
  readonly score: ConceptScore;
}
```

---

## Phase 1F — Concept Evaluation & Scoring Model

To select the single winning **Creative Concept** deterministically, Creative Brain scores each candidate concept against five weighted dimensions.

### 1. Scoring Dimensions & Point Allocation

Total Score = **100 Points Max**

| Dimension | Weight | Max Points | Description |
| :--- | :--- | :--- | :--- |
| **Truth Alignment** | 25% | **25 Pts** | Compliance with Business Brain, verified product price, WhatsApp contact, and offer terms. |
| **Brand Fit** | 25% | **25 Pts** | Alignment with `BrandKit` tone, personality, color rules, and active `SavedStyle`. |
| **Audience Relevance** | 20% | **20 Pts** | Resonance with target audience profile, locality preferences, and regional style. |
| **Historical Performance**| 15% | **15 Pts** | Positive affinity from `CreativePreference`, `CreativeFeedback`, and `CampaignPerformance`. |
| **Execution Feasibility** | 15% | **15 Pts** | Compatibility with selected `CreativeTemplate` constraints and rendering budgets. |

---

### 2. TypeScript Contract: `ConceptScore`

```typescript
export interface ConceptScoreBreakdown {
  /** Truth Alignment Score (0 - 25 points) */
  readonly truthAlignment: number;
  
  /** Brand Fit Score (0 - 25 points) */
  readonly brandFit: number;
  
  /** Audience Relevance Score (0 - 20 points) */
  readonly audienceRelevance: number;
  
  /** Historical Performance Score (0 - 15 points) */
  readonly historicalPerformance: number;
  
  /** Execution Feasibility Score (0 - 15 points) */
  readonly executionFeasibility: number;
}

export interface ConceptScore {
  /** Combined Total Score (0 - 100) */
  readonly totalScore: number;
  
  /** Detailed dimension score breakdown */
  readonly breakdown: ConceptScoreBreakdown;
  
  /** Specific reasons or penalties applied during evaluation */
  readonly evaluationNotes: readonly string[];
  
  /** Whether the concept meets the minimum viability threshold (>= 70 Pts) */
  readonly isViable: boolean;
}
```

---

### 3. Evaluation Formula & Winner Selection Rules

1. **Calculated Total**:
   $$\text{TotalScore} = S_{\text{truth}} + S_{\text{brand}} + S_{\text{audience}} + S_{\text{history}} + S_{\text{feasibility}}$$

2. **Hard Truth Gating Rule**:
   * If $S_{\text{truth}} < 25$ (i.e. any factual conflict or price discrepancy is detected), **$\text{TotalScore}$ is instantly forced to 0**, and `isViable` is set to `false`.

3. **Viability Threshold**:
   * A concept is considered viable if $\text{TotalScore} \ge 70$.

4. **Winner Selection**:
   * Out of a generated candidate set of $N$ concepts (typically 3), the concept with the highest $\text{TotalScore} \ge 70$ is selected as the **Winning Concept**.
   * If **no concept** achieves $\text{TotalScore} \ge 70$, Creative Brain triggers a **Fallback Blueprint** using static baseline defaults (see Phase 1K).
