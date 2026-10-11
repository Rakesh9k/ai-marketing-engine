# Creative Blueprint Contract (Phase 1G)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1G)  
**Location**: `docs/creative-brain/CREATIVE_BLUEPRINT.md`  

---

## 1. Overview & Purpose

The **Creative Blueprint** is the primary, strongly-typed output contract emitted by Creative Brain. It contains all strategic, messaging, grammar, visual, and constraint directives required for the existing `GenerationPipeline` execution engine to produce campaign assets **without requiring Creative Brain to render any image bytes, compose SVG layout files, or encode video files**.

---

## 2. Complete Field-Level Attribute Dictionary

Below is the field-by-field specification for every property in `CreativeBlueprint`.

| Property Name | TypeScript Type | Req / Opt | Source | Authority Level | Generated / Derived | Allowed Values / Constraints | Validation Requirements | Downstream Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`blueprintId`** | `string` | Required | System | Authoritative | Generated | UUID v7 format | Non-empty UUID | Pipeline Trace, Logging |
| **`campaignId`** | `string` | Required | User Intent | Authoritative | Derived | Valid campaign ID | Non-empty string | Firestore `campaigns` |
| **`businessId`** | `string` | Required | User Intent | Authoritative | Derived | Valid business ID | Non-empty string | Firestore `campaigns` |
| **`opportunity`** | `CreativeOpportunity` | Required | Creative Brain | Derived | Generated | Valid opportunity struct | Non-null `CreativeOpportunity` | Stage 3 Campaign Strategy |
| **`objective`** | `CreativeObjective` | Required | Intent / Brain | Level 1 (System Rule)| Derived | `awareness`, `engagement`, `conversion`, `launch`, `promotion`, `retention` | Must be allowed in `VerticalConfig` | Stage 3, Stage 5, Trace |
| **`selectedConcept`** | `CreativeConcept` | Required | Creative Brain | Derived | Generated | Valid concept struct | Must pass score threshold $\ge 70$ | Stage 3, Stage 5, Trace |
| **`messaging.angle`** | `string` | Required | Winning Concept | Derived | Generated | Max 200 chars | Non-empty string | Stage 3 `runStage3()` |
| **`messaging.hook`** | `string` | Required | Winning Concept | Derived | Generated | Max 100 chars | Non-empty string | Stage 3, Stage 5 Copy Pack |
| **`messaging.offerFraming`**| `string` | Required | Winning Concept | Derived | Generated | Max 300 chars | Non-empty string | Stage 3 `runStage3()` |
| **`messaging.keyMessages`**| `string[]` | Required | Creative Brain | Derived | Generated | Array of exactly 5 strings | Min 5 strings, max 200 chars each | Stage 3 `runStage3()` |
| **`creativeGrammar`** | `CreativeGrammarStep[]`| Required | Winning Concept | Level 1 (System Rule)| Generated | Valid grammar steps from template | Array of `CreativeGrammarStep` | Stage 5 Copy Pack |
| **`visualDirection.emphasis`**| `VisualEmphasis` | Required | Winning Concept | Level 1 (System Rule)| Generated | `product-led`, `text-led`, `image-led`, `offer-led` | Valid `VisualEmphasis` enum | Stage 6 Image Prompts |
| **`visualDirection.composition`**| `VisualComposition`| Required | Winning Concept | Level 1 (System Rule)| Generated | `hero-product`, `split-composition`, `editorial`, `minimal`, `high-contrast` | Valid `VisualComposition` enum | Stage 6 Image Prompts |
| **`visualDirection.mood`**| `string` | Required | Winning Concept | Derived | Generated | Max 100 chars | Non-empty string | Stage 6 Image Prompts |
| **`visualDirection.heroPromptGuidance`**| `string` | Required | Creative Brain | Derived | Generated | Max 500 chars | Non-empty string | Stage 6 Image Prompts |
| **`visualDirection.textOverlayRules`**| `object` | Required | Business Brain | Level 0 (Authoritative)| Derived | `{ showPrice, showOriginalPrice, showOfferBadge, ctaPlacement }` | Valid boolean flags | Stage 7 `compositor.ts` |
| **`localization.primaryLanguage`**| `LanguageCode` | Required | Intent / Brain | Level 1 (System Rule)| Derived | `en`, `te`, `hi`, `te_en`, `hi_en` | Valid `LanguageCode` | Stage 4, Stage 5 Copy Pack |
| **`localization.regionalStyle`**| `RegionalStyle` | Required | Intent / Brain | Level 1 (System Rule)| Derived | `neutral`, `hyderabadi`, `telangana`, `mumbai`, `bangalore`, `delhi`, `chennai`, `kolkata` | Valid `RegionalStyle` | Stage 4 Localization |
| **`executionRequirements.templateId`**| `string` | Required | Winning Concept | Level 1 (System Rule)| Derived | Valid template ID in registry | Template MUST exist in registry | Stage 3, Stage 5, Stage 6 |
| **`executionRequirements.maxImageCalls`**| `number` | Required | System Constraint| Level 1 (System Rule)| Derived | Fixed value: `1` | Must equal `1` | Stage 7 Image Gen |
| **`constraints.toneBoundary`**| `string` | Required | BrandKit / Style | Level 1 (System Rule)| Derived | Max 200 chars | Non-empty string | Stage 5 Copy Pack |
| **`constraints.prohibitedTerms`**| `string[]` | Required | Conflict Resolver| Level 0 (Authoritative)| Derived | Array of strings | Non-null array | Stage 5 Copy Pack |
| **`confidence`** | `number` | Required | Creative Brain | Derived | Generated | Float between `0.0` and `100.0` | $70 \le \text{confidence} \le 100$ | Pipeline Trace, Logging |
| **`reasoning.traceId`** | `string` | Required | System | Derived | Generated | UUID v7 format | Non-empty UUID | Pipeline Trace |
| **`reasoning.winningScore`**| `number` | Required | Winning Concept | Derived | Generated | Total score float | Must match concept total score | Pipeline Trace |
| **`reasoning.summary`** | `string` | Required | Creative Brain | Derived | Generated | Max 500 chars summary | Non-empty summary | Pipeline Trace |

---

## 3. Structural Contract Integrity

1. **No Free-Form Blobs**: Every single field in `CreativeBlueprint` is strongly typed, validated by Zod schema, and mapped to a specific downstream execution function.
2. **Execution Sufficiency**: The directives in `messaging`, `creativeGrammar`, `visualDirection`, and `executionRequirements` provide complete instructions for Stages 3 through 7 without requiring any additional LLM strategic reasoning calls downstream.
