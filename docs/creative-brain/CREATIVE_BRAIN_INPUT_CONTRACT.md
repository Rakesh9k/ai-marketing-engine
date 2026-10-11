# Creative Brain Input Contract (Phase 1C)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1C)  
**Location**: `docs/creative-brain/CREATIVE_BRAIN_INPUT_CONTRACT.md`  

---

## 1. Overview & Input Categorization

The **Creative Brain** receives a strongly-typed, read-only input context categorized into four primary domains:

1. **AUTHORITATIVE BUSINESS CONTEXT**: Factual identity, product catalog, pricing, business rules, brand parameters, and knowledge provenance.
2. **USER INTENT**: Specific campaign parameters submitted for the current run (objective, offer details, audience, requested format).
3. **CREATIVE MEMORY**: Historical learning signals (saved styles, template preferences, explicit user feedback, real-world performance metrics).
4. **SYSTEM CONSTRAINTS**: Hard platform, vertical, template, and execution engine limitations.

---

## 2. Exhaustive Input Attribute Dictionary

The matrix below defines every input field consumable by Creative Brain, detailing its source, authority, requirement status, freshness, determinism, AI reinterpretation rules, and AI override rules.

### A. Authoritative Business Context

| Field | Source File / Location | Authority Level | Req / Opt | Freshness | Deterministic / Derived | AI Reinterpretation Allowed? | AI Override Allowed? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `identity.name` | `BusinessBrain.identity.name` | Level 0 (Authoritative) | Required | Static | Deterministic | **NO**. Exact string match required. | **STRICTLY NO**. |
| `identity.category` | `BusinessBrain.identity.category` | Level 0 (Authoritative) | Required | Static | Deterministic | **NO**. Immutable vertical enum. | **STRICTLY NO**. |
| `identity.location` | `BusinessBrain.identity.location` | Level 0 (Authoritative) | Required | Live | Deterministic | **YES (Formatting only)**. E.g. locality joining. | **STRICTLY NO**. |
| `identity.contact` | `BusinessBrain.identity.contact` | Level 0 (Authoritative) | Required | Live | Deterministic | **NO**. Exact phone/WhatsApp required. | **STRICTLY NO**. |
| `identity.industry` | `BusinessBrain.identity.industry` | Level 0 (Authoritative) | Optional | Live | Deterministic | **YES**. For industry nuance understanding. | **STRICTLY NO**. |
| `products` | `BusinessBrain.products[]` | Level 0 (Authoritative) | Optional | Live | Deterministic | **YES**. For angle generation. | **STRICTLY NO (Prices/Names)**. |
| `verticalProfile` | `BusinessBrain.verticalProfile` | Level 0 (Authoritative) | Optional | Live | Deterministic | **YES**. Services/properties selection. | **STRICTLY NO (Prices/Names)**. |
| `businessRules` | `BusinessBrain.businessRules` | Level 0 (Authoritative) | Required | Live | Deterministic | **NO**. Operational boundaries. | **STRICTLY NO**. |
| `brand.tone` | `BusinessBrain.brand.tone` | Level 1 (System Rule) | Required | Live | Deterministic | **YES**. For creative mood mapping. | **NO (Unless SavedStyle set)**. |
| `brand.colors` | `BusinessBrain.brand.colors` | Level 1 (System Rule) | Required | Live | Deterministic | **NO**. Exact hex color codes. | **STRICTLY NO**. |
| `localization` | `BusinessBrain.localization` | Level 1 (System Rule) | Required | Live | Deterministic | **YES**. Language mixing rules. | **STRICTLY NO**. |
| `audience` | `BusinessBrain.audience` | Level 2 (Memory) | Required | Live | Deterministic | **YES**. Segment extraction. | **YES (By Campaign Intent)**. |
| `positioning.usp` | `BusinessBrain.positioning.usp` | Level 0 (Authoritative) | Optional | Live | Deterministic | **YES**. Framing for differentiator. | **STRICTLY NO**. |
| `factuality` | `toCreativeBriefBusinessRules()` | Level 0 (Authoritative) | Required | Runtime | Deterministic | **NO**. Truth check rules enforcer. | **STRICTLY NO**. |

---

### B. User Intent

| Field | Source File / Location | Authority Level | Req / Opt | Freshness | Deterministic / Derived | AI Reinterpretation Allowed? | AI Override Allowed? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `intent.objective` | `generateCampaignStrategySchema` | Level 1 (System Rule) | Required | Per-Run | Deterministic | **NO**. Objective enum. | **STRICTLY NO**. |
| `intent.offer.headline`| `generateCampaignStrategySchema` | Level 0 (Authoritative) | Required | Per-Run | Deterministic | **YES**. For copy variations. | **NO (Core fact preserved)**. |
| `intent.offer.price` | `generateCampaignStrategySchema` | Level 0 (Authoritative) | Required | Per-Run | Deterministic | **NO**. Exact numerical price. | **STRICTLY NO**. |
| `intent.offer.validity`| `generateCampaignStrategySchema` | Level 0 (Authoritative) | Required | Per-Run | Deterministic | **NO**. Exact validity dates. | **STRICTLY NO**. |
| `intent.audience` | `generateCampaignStrategySchema` | Level 1 (System Rule) | Required | Per-Run | Deterministic | **YES**. Segment targeting. | **NO**. Localities preserved. |
| `intent.cta` | `generateCampaignStrategySchema` | Level 1 (System Rule) | Required | Per-Run | Deterministic | **NO**. Validated CTA enum. | **STRICTLY NO**. |
| `intent.localization` | `generateCampaignStrategySchema` | Level 1 (System Rule) | Required | Per-Run | Deterministic | **YES**. Regional style tuning. | **NO**. Languages preserved. |
| `intent.occasion` | `generateCampaignStrategySchema` | Level 2 (Memory) | Optional | Per-Run | Deterministic | **YES**. Contextual hook tuning. | **YES**. |

---

### C. Creative Memory

| Field | Source File / Location | Authority Level | Req / Opt | Freshness | Deterministic / Derived | AI Reinterpretation Allowed? | AI Override Allowed? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `activeSavedStyle` | `SavedStyle` collection | Level 1 (System Rule) | Optional | Live | Mixed | **YES**. Stylistic adaptation. | **NO (If explicitly chosen)**. |
| `preferences` | `CreativePreference` collection | Level 2 (Memory) | Optional | Aggregated| Deterministic | **YES**. Influences scoring weight. | **YES (If conflict with L0)**. |
| `feedback` | `CreativeFeedback` collection | Level 2 (Memory) | Optional | Live | Deterministic | **YES**. Influences scoring weight. | **YES (If conflict with L0)**. |
| `performanceRecs` | `CampaignPerformance` collection| Level 2 (Memory) | Optional | Aggregated| Derived | **YES**. CTR heuristic scoring. | **YES (If conflict with L0)**. |
| `previousBlueprints` | `pipelineTrace` in `campaigns` | Level 2 (Memory) | Optional | Historical| Derived | **YES**. Novelty & variety check. | **YES**. |

---

### D. System Constraints

| Field | Source File / Location | Authority Level | Req / Opt | Freshness | Deterministic / Derived | AI Reinterpretation Allowed? | AI Override Allowed? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `verticalConfig` | `functions/src/config/verticals.ts` | Level 0 (Authoritative) | Required | Static | Deterministic | **NO**. Allowed CTAs/Objectives.| **STRICTLY NO**. |
| `templateLibrary` | `creativeTemplateRegistry.ts` | Level 1 (System Rule) | Required | Static | Deterministic | **NO**. Template definitions. | **STRICTLY NO**. |
| `maxImageCalls` | `MAX_IMAGE_GENERATION_CALLS` (1) | Level 1 (System Rule) | Required | Static | Deterministic | **NO**. Budget restriction. | **STRICTLY NO**. |
| `creativeFormats` | `CREATIVE_DIMENSIONS` (4:5, 9:16) | Level 1 (System Rule) | Required | Static | Deterministic | **NO**. Canvas dimensions. | **STRICTLY NO**. |
| `rateLimitRules` | `functions/src/middleware/rateLimit.ts` | Level 0 (Authoritative) | Required | Static | Deterministic | **NO**. Infrastructure limit. | **STRICTLY NO**. |

---

## 3. Strict Rules on AI Reinterpretation vs. Overriding

1. **AI Reinterpretation Allowed**: The AI may rephrase, format, or generate creative variations of text *provided the underlying factual truth remains identical*. For example, an offer headline "Get 20% Off All Pizzas" may be reinterpreted as "Enjoy a Delicious 20% Discount Across Every Pizza!"
2. **AI Override Forbidden (Level 0 Facts)**: The AI is **strictly forbidden** from changing numerical prices, phone numbers, WhatsApp numbers, business names, or operational rules. Any candidate concept that attempts to override a Level 0 fact receives a score of 0 ($S_{\text{truth}} = 0$) and is discarded instantly.
