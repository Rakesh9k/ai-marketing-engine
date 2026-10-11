# Creative Brain Project — Phase 3 Industry Creative Knowledge Model (ICKM) Architecture & Specification

**Document Status**: Authoritative Phase 3 Architecture Document  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 3)  
**Location**: `docs/creative-brain/PHASE_3_INDUSTRY_KNOWLEDGE_MODEL.md`  
**Implementation Directory**: `functions/src/services/ai/creativeBrain/industry/`  

---

## 1. Executive Summary

Phase 3 introduces the **Industry Creative Knowledge Model (ICKM)** to Mitra Creative Brain. ICKM provides reusable, domain-specific marketing intelligence for diverse verticals (e.g. `restaurant`, `salon`, `real_estate`, and `generic_local_business`) **without introducing vertical-specific decision logic into the state machine or campaign pipeline**.

Through ICKM, Mitra understands:
* Industry subtypes and business categories (e.g., biryani house vs. fine dining cafe vs. QSR; luxury residential vs. commercial plots; unisex salon vs. bridal studio).
* Common marketing objectives, customer motivators, and decision drivers.
* High-value question candidates that resolve creative ambiguity.
* Proven offer patterns, occasion triggers, trust signals, and creative territories.

---

## 2. Core Architectural Invariants

### 2.1 Zero Industry Branches Rule (Strict Invariant)
The core orchestration layers—`AdaptiveCreativeBrainStateMachine` and `QuestionResolver`—contain **ZERO industry-specific conditional branches** (`if (vertical === 'restaurant')` or `switch (vertical)`). 

Target count = **0**.

State machine nodes and question resolvers consume domain intelligence generically via a unified, strongly-typed **`IndustryCreativeContext`** object.

### 2.2 Local & Deterministic Resolution (Zero LLM Calls)
Knowledge retrieval and subtype resolution are **100% local, synchronous, and deterministic**. ICKM resolution requires zero external network calls or LLM prompts, completing in under 1ms.

### 2.3 Subordinate to Business Brain & Fact Safety
ICKM knowledge acts strictly as **advisory strategic intelligence**. It cannot:
* Override authoritative Business Brain facts (e.g., price, operating hours, verified product names).
* Bypass deterministic `TruthCheck` rules.
* Inject unverified or false factual claims into campaign assets.

---

## 3. Key Design Verification & Boundary Safeguards

### 3.1 Authoritative Business Brain Precedence (`params.vertical` Precedence)
To prevent a caller-provided vertical hint (e.g., `vertical: 'salon'`) from accidentally corrupting the creative context of an authoritative business (e.g. `Business Brain industry = 'restaurant'`), ICKM enforces strict resolution precedence:

```
1. Authoritative Business Brain Industry  (CONFIRMED, confidence: 0.95 - 1.00)
       ↓
2. Authoritative Business Brain Category  (CONFIRMED, confidence: 0.90 - 0.95)
       ↓
3. Campaign-scoped Caller Vertical Hint   (INFERRED, confidence: 0.85)
       ↓
4. Generic Local Business Fallback        (HYPOTHESIZED, confidence: 0.50)
```

A caller-provided hint (`vertical`) is only evaluated if Business Brain lacks an authoritative industry and category.

### 3.2 Subtype Resolution Authority & Source Attribution
Subtype resolution does NOT convert keywords into factual assertions. Every resolved subtype includes explicit source and authority metadata:

```json
{
  "id": "biryani",
  "confidence": 0.75,
  "authority": "INFERRED",
  "source": "PRODUCT_CONTEXT"
}
```

Authority remains strictly `INFERRED` (or `HYPOTHESIZED`), ensuring that inferred subtypes guide creative reasoning without masquerading as user-confirmed facts.

### 3.3 Advisory Possibilities vs. Prescriptive Templates
ICKM models **creative possibilities**, NOT rigid execution templates.
* **Allowed (Advisory)**: Providing dimensions (`craving`, `occasion`, `value`, `convenience`), territories, and motivators for strategic evaluation.
* **Prohibited (Prescriptive)**: Hardcoding rules like *"always use food hero"*, *"always use craving hook"*, or *"always show offer first"*.

### 3.4 Knowledge vs. Fact Safety Boundaries
`IndustryKnowledgeValidator.validateClaimSafety` prevents domain knowledge from fabricating unverified business facts:

1. **Delivery Convenience**: Reasoning about `convenience` is allowed, but asserting `"Fast delivery"`, `"30-minute delivery"`, `"Order online"`, or `"Delivery available"` is **PROHIBITED** unless explicitly confirmed in Business Brain.
2. **Clinical Expertise & Certification**: Reasoning about `trust` is allowed, but claiming `"Certified experts"`, `"Clinically proven"`, or `"FDA approved"` is **PROHIBITED** unless confirmed in Business Brain.
3. **Real Estate RERA Compliance**: Reasoning about `documentation/trust` is allowed, but asserting `"RERA approved"` or `"RERA registered"` is **PROHIBITED** unless confirmed in Business Brain.

---

## 4. Component Architecture & Module Structure

```
functions/src/services/ai/creativeBrain/industry/
├── industryKnowledge.types.ts     # Strongly typed interfaces & domain models
├── industryKnowledge.schema.ts    # Zod schemas for runtime validation
├── restaurant.knowledge.ts        # Restaurant vertical knowledge (9 subtypes)
├── salon.knowledge.ts             # Salon vertical knowledge (6 subtypes)
├── realEstate.knowledge.ts        # Real Estate vertical knowledge (8 subtypes)
├── generic.knowledge.ts           # Generic local business fallback knowledge
├── industryKnowledge.registry.ts  # Registry for registering & retrieving domain models
├── industryKnowledge.resolver.ts  # Deterministic industry & subtype resolver
├── industryKnowledge.context.ts   # Helper utilities for filtering & candidate queries
├── industryKnowledge.validation.ts # Safety & claim validator against Business Brain
└── index.ts                       # Module barrel exports
```

---

## 5. Supported Verticals & Subtypes

### 5.1 Restaurant (`restaurant`)
* **Subtypes (9)**: `biryani`, `cafe`, `qsr`, `fine_dining`, `cloud_kitchen`, `bakery`, `dessert`, `family_restaurant`, `casual_dining`.
* **Key Dimensions**: Portion size, authenticity, aroma, hygiene, preparation time, seating capacity, delivery speed, ingredient quality.

### 5.2 Salon & Beauty (`salon`)
* **Subtypes (6)**: `premium_salon`, `unisex`, `women`, `men`, `bridal`, `beauty_clinic`.
* **Key Dimensions**: Stylist expertise, product brand quality, hygiene, ambiance, booking flexibility, package deals, transformational results.

### 5.3 Real Estate (`real_estate`)
* **Subtypes (8)**: `residential`, `luxury_residential`, `apartments`, `villas`, `plots`, `commercial`, `rentals`, `resale`.
* **Key Dimensions**: Location connectivity, RERA compliance, price per sq ft, amenities, possession timeline, construction quality, ROI / rental yield.

### 5.4 Generic Local Business (`generic_local_business`)
* Universal fallback knowledge model serving any local service or retail business.

---

## 6. Verification & Test Coverage

Phase 3 is fully validated across 6 dedicated ICKM test suites:

* **ICKM Test Suites (6/6 PASSED)**:
  1. `industryKnowledge.schema.test.ts` — Validates Zod schema constraints on knowledge objects.
  2. `industryKnowledge.registry.test.ts` — Tests registration, lookup, and generic fallbacks.
  3. `industryKnowledge.resolver.test.ts` — Tests subtype detection accuracy across restaurants, salons, real estate.
  4. `industryKnowledge.relevance.test.ts` — Tests dimension filtering and priority-based relevance scoring.
  5. `industryKnowledge.question.test.ts` — Verifies 0 industry branches in `QuestionResolver`.
  6. `industryKnowledge.factSafety.test.ts` — Verifies Business Brain precedence, INFERRED subtype attribution, and Knowledge vs. Fact safety boundaries.
* **Total AI Test Suite Execution**:
  * 54 test suites passed (0 failures).
  * 595 individual tests passed (0 failures).
  * 100% compliance with zero-branch architectural invariant.
