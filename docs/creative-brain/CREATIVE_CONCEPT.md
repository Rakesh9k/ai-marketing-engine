# Creative Concept (Phase 1E)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1E)  
**Location**: `docs/creative-brain/CREATIVE_CONCEPT.md`  

---

## 1. What is a Creative Concept?

A **Creative Concept** is an executable creative idea designed to exploit a specific `CreativeOpportunity`. It translates strategic market leverage into an actionable blueprint for copy generation, visual direction, and asset composition.

Core Principle:
> *"A Creative Concept defines how an opportunity will be expressed creatively, without rendering the actual assets or executing the campaign."*

---

## 2. Strict Boundary Safeguards

To prevent scope creep and architectural leakage, a Creative Concept:

1. **MUST NOT Contain Rendered Assets**: No image URLs, base64 strings, SVG markup, binary audio, or MP4 video files. Rendering belongs exclusively to the **Execution Engine** (`compositor.ts`, `VideoRenderer`).
2. **MUST NOT Become a Full Campaign**: No credit reservations, payment allocations, transaction logs, post schedules, or final campaign pack persistence.
3. **MUST NOT Modify Business Truth**: No override of product prices, WhatsApp numbers, or business locations.

---

## 3. Minimum Viable Concept Schema: `CreativeConcept`

The schema below defines the minimum viable structure for a `CreativeConcept`, matching existing types (`CreativeGrammarStep`, `VisualEmphasis`, `VisualComposition`, `SavedStyleTone`).

```typescript
import type {
  CreativeGrammarStep,
  VisualEmphasis,
  VisualComposition,
  SavedStyleTone,
} from '../types';
import type { ConceptScore } from './PHASE_1_OPPORTUNITIES_CONCEPTS_AND_SCORING';

export interface VisualPremiseSpecification {
  /** Visual emphasis focus (product-led, text-led, image-led, offer-led) */
  readonly emphasis: VisualEmphasis;

  /** Visual composition layout (hero-product, split-composition, editorial, minimal, high-contrast) */
  readonly composition: VisualComposition;

  /** Emotional mood of the visual creative */
  readonly mood: string;

  /** Composition hints for hero image generation */
  readonly compositionHints: readonly string[];
}

export interface CreativeConcept {
  /** Unique concept identifier */
  readonly conceptId: string;

  /** Parent opportunity identifier */
  readonly opportunityId: string;

  /** Concept title for internal tracking and logging */
  readonly title: string;

  /** Creative messaging angle (e.g. "Contrast of Stress vs. Comfort") */
  readonly angle: string;

  /** Core creative idea in one sentence */
  readonly coreIdea: string;

  /** Direction for the opening visual/textual hook */
  readonly hookDirection: string;

  /** Key emotional driver (e.g. "Relief", "FOMO", "Pride", "Urgency") */
  readonly emotionalDriver: SavedStyleTone;

  /** Perspective used to address the audience (e.g. "Busy working parent") */
  readonly audienceFraming: string;

  /** Primary value message to communicate */
  readonly message: string;

  /** How the offer is framed relative to the problem (e.g. "Save ₹150 on your family feast") */
  readonly offerFraming: string;

  /** Direction for the CTA execution */
  readonly ctaDirection: string;

  /** Visual premise & composition directives */
  readonly visualPremise: VisualPremiseSpecification;

  /** Unique selling point that differentiates this concept from competitors */
  readonly differentiation: string;

  /** Expected customer psychological response */
  readonly expectedResponse: string;

  /** Selected creative template ID from CreativeTemplateRegistry */
  readonly templateId: string;

  /** Ordered grammar roles (hook -> problem -> product -> offer -> cta) */
  readonly grammar: readonly CreativeGrammarStep[];

  /** Quantitative evaluation score (5-dimension model) */
  readonly score: ConceptScore;
}
```

---

## 4. Concept Lifecycle & Execution Handoff

```
[Creative Opportunity]
          │
          ▼
[Creative Brain Concept Generation] ---> Generates 3 candidate CreativeConcept structs
          │
          ▼
[Concept Evaluation & Scoring]      ---> Scores candidates (ConceptScore)
          │
          ▼
[Winning Concept Selected]          ---> Concept with highest score >= 70 Pts
          │
          ▼
[Creative Blueprint Assembled]      ---> Encloses winning concept + execution directives
          │
          ▼
[Handoff to Execution Engine]       ---> GenerationPipeline receives Blueprint (No rendered assets yet)
```

By keeping `CreativeConcept` lightweight, structured, and free of rendered assets, Creative Brain maintains pure strategic authority while handing clean, unambiguous directives to the Execution Engine.
