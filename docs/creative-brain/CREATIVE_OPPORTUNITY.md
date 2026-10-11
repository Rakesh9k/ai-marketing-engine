# Creative Opportunity (Phase 1D)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1D)  
**Location**: `docs/creative-brain/CREATIVE_OPPORTUNITY.md`  

---

## 1. What is a Creative Opportunity?

A **Creative Opportunity** is a first-class strategic abstraction representing a **validated market leverage point**. It identifies a temporary or structural alignment between a business's verified value proposition and an unaddressed customer tension, desire, or occasion.

It answers the core strategic question:
> *"Why should this target audience care about this offer right now, and what specific psychological or situational tension allows our message to break through?"*

---

## 2. What a Creative Opportunity IS NOT

* **It is NOT a Campaign Objective**: An objective (`weekend_offer`, `new_dish`) is a business goal. An opportunity is the market dynamics that make that goal achievable.
* **It is NOT an Audience Insight**: An audience insight ("Office workers in Hitec City want quick lunches") is an observation. An opportunity is the strategic bridge connecting that insight to a specific offer.
* **It is NOT a Campaign Angle**: An angle ("Speed & Health Combined") is a messaging slant. An opportunity explains *why* that angle will succeed based on customer tension.
* **It is NOT a Hook**: A hook ("Too busy for a healthy lunch?") is a copy line. An opportunity is the underlying strategy.
* **It is NOT a Creative Concept**: A concept ("3-step workday lunch reveal video") is an execution idea. An opportunity is the strategic rationale that precedes concept generation.
* **It is NOT a Strategy Output**: It is the precursor input to strategy generation.

---

## 3. Disambiguation Matrix

| Strategic Construct | Question Answered | Granularity | Owner | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Campaign Objective** | What business outcome do we want? | Business Goal | User / Business | `weekend_offer` |
| **Audience Insight** | What does the customer experience? | Observation | Business Brain | "Weekend diners want quick family seats without waiting 45 minutes." |
| **Creative Opportunity** | What market leverage point can we capture? | Strategic Space | **Creative Opportunity** | "Capture high-intent weekend family diners by leveraging guaranteed table booking alongside a limited-time combo discount." |
| **Creative Concept** | How do we execute this leverage point? | Creative Idea | Creative Concept | "Visual comparison showing a stressful waiting queue vs. a smooth reserved table dining experience." |
| **Campaign Angle** | How do we frame the core message? | Messaging Slant | Execution Engine | "Skip the Line, Enjoy the Feast" |
| **Hook** | How do we grab attention in 2 seconds? | Copy / Visual | Execution Engine | "Tired of waiting 45 minutes for a table this Sunday?" |

---

## 4. Validated Repository Schema: `CreativeOpportunity`

The schema below has been strictly validated against the Mitra repository structure, preserving compatibility with `BusinessBrain`, `VerticalConfig`, and `GenerationPipelineInput`.

```typescript
import type { CreativeObjective, BusinessCategory } from '../types';

export interface OpportunityConstraintSet {
  /** Maximum copy text density allowed */
  readonly maxTextDensity: 'low' | 'medium' | 'high';
  /** Strict tone boundary (e.g. "professional and warm, no dark comedy") */
  readonly toneBoundary: string;
  /** Non-negotiable pricing/factual limits from Business Brain */
  readonly factualLimits: readonly string[];
}

export interface CreativeOpportunity {
  /** Unique opportunity identifier */
  readonly opportunityId: string;

  /** Business vertical category */
  readonly vertical: BusinessCategory;

  /** Business problem or market friction being addressed */
  readonly problem: string;

  /** Psychological or situational customer tension */
  readonly tension: string;

  /** Customer motivation driving purchase behavior */
  readonly motivation: string;

  /** Occasion or seasonal context (e.g. "Sunday Family Lunch", "Diwali Festival") */
  readonly occasion?: string;

  /** Target customer segment insight */
  readonly audienceInsight: string;

  /** Concise statement summarizing the leverage point */
  readonly opportunityStatement: string;

  /** Intended business outcome (e.g. "Drive 30% more weekend dine-in bookings") */
  readonly desiredBusinessOutcome: string;

  /** Intended customer cognitive/emotional response (e.g. "Relief and eagerness to book ahead") */
  readonly desiredAudienceResponse: string;

  /** Historical or contextual signals supporting this opportunity */
  readonly supportingSignals: readonly string[];

  /** Boundary constraints governing concept creation */
  readonly constraints: OpportunityConstraintSet;

  /** System confidence score (0 - 100) */
  readonly confidence: number;

  /** Strategic rationale explaining why this opportunity was selected */
  readonly rationale: string;
}
```

---

## 5. Repository Validation & Product Philosophy Alignment

1. **No Invented Facts**: `supportingSignals` and `factualLimits` tie directly back to `BusinessBrain.knowledge.facts` (`USER_CONFIRMED`).
2. **Vertical Specificity**: `vertical` and `constraints` enforce `VerticalConfig.allowedObjectives` and `allowedCTAs` without exception.
3. **Execution Ready**: `opportunityStatement` provides a clear, actionable directive for downstream concept generation.
