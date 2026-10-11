# Creative Brain Project — Phase 1 Architectural Overview & Master Guide

**Document Status**: Authoritative Phase 1 Master Guide  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_README.md`  

---

## 1. What Phase 1 Established

Phase 1 establishes the formal, implementation-ready architectural contract, data models, decision flows, and system boundaries for **Creative Brain** prior to any code implementation (Phase 2+).

Zero production application code was modified. The existing campaign generation pipeline (`GenerationPipeline`), Business Brain, billing engine (`usageControl`), credit ledger, tenant isolation middleware, Firestore security rules (`firestore.rules`), SVG compositor (`compositor.ts`), video renderer (`VideoRenderer`), and deterministic Truth Check (`truthCheck.ts`) remain 100% protected and untouched.

---

## 2. What Creative Brain IS

**Creative Brain** is an adaptive strategic reasoning layer that transforms:
* **Business Brain context** (who the business is, verified facts, rules, identity),
* **Product/service context** (visual attributes, pricing, catalog metadata),
* **Historical creative intelligence** (preferences, feedback, past performance), and
* **User campaign intent** (objective, offer details, audience, CTA)

into a validated **Creative Opportunity** and a small set ($N=3$) of candidate **Creative Concepts**, ultimately emitting a single, strongly-typed **Creative Blueprint** for consumption by the existing campaign execution engine.

---

## 3. What Creative Brain IS NOT

Creative Brain is strictly forbidden from owning or performing:
1. **Business Brain & Fact Ownership**: Does NOT create, mutate, or override business facts (prices, names, contact strings, operating hours).
2. **Asset Rendering**: Does NOT generate SVG layout files, rasterize images, draw canvas pixels, or encode MP4 video clips.
3. **Payments & Billing**: Does NOT handle Razorpay, PayU, Paddle, subscription plans, or transactions.
4. **Credit Accounting**: Does NOT check, reserve, deduct, or refund credits (`usageControl.ts` remains sole owner).
5. **Authentication & Tenant Security**: Does NOT verify Firebase tokens, custom claims, or tenant boundaries (`verifyBusinessAccess` remains sole owner).
6. **Fact Verification & Truth Check**: Does NOT replace or modify deterministic truth validation (`truthCheck.ts`).
7. **Database Persistence**: Does NOT directly write final assets or campaign documents to Firestore.

---

## 4. Input Model Summary

Creative Brain ingests a strongly-typed, read-only `CreativeBrainInput` struct grouped across four context domains:

* **AUTHORITATIVE BUSINESS CONTEXT**: `BusinessBrain` facts (`identity`, `products`, `verticalProfile`, `businessRules`, `brand`, `localization`, `positioning`).
* **USER INTENT**: Campaign parameters (`objective`, `offer`, `audience`, `cta`, `localization`, `occasion`).
* **CREATIVE MEMORY**: Learning signals (`activeSavedStyle`, `preferences`, `feedback`, `performanceRecs`, `previousBlueprints`).
* **SYSTEM CONSTRAINTS**: Platform limits (`verticalConfig`, `templateLibrary`, `maxImageCalls`, `creativeFormats`).

---

## 5. Output Model Summary

The single primary output contract emitted by Creative Brain is the **`CreativeBlueprint`** (wrapped in `CreativeBrainResult`), containing:
* **`opportunity`**: Strategic market leverage point (`CreativeOpportunity`).
* **`winningConcept`**: Selected top-scoring concept candidate (`CreativeConcept`).
* **`strategyDirectives`**: Messaging angle, hook, framing, and key messages for Stage 3.
* **`copyDirectives`**: Tone, keyword, and language constraints for Stage 5.
* **`visualDirectives`**: Visual emphasis, composition, and text overlay rules for Stage 6 & Stage 7.
* **`trace`**: Decision reasoning log, evaluated candidate scores, and timestamp.

---

## 6. Decision Lifecycle Flow

```
[1. INPUT]
    │
    ▼
[2. NORMALIZE CONTEXT]
    │
    ▼
[3. RESOLVE AUTHORITATIVE FACTS]
    │
    ▼
[4. UNDERSTAND CAMPAIGN INTENT]
    │
    ▼
[5. IDENTIFY OPPORTUNITY]  ───► Discovers CreativeOpportunity
    │
    ▼
[6. GENERATE CONCEPTS]     ───► Produces N=3 CreativeConcept candidates
    │
    ▼
[7. EVALUATE CONCEPTS]     ───► Scores candidates (5 dimensions + Hard Truth Gate)
    │
    ▼
[8. SELECT CONCEPT]        ───► Selects winner with TotalScore >= 70 Pts
    │
    ├──────────────────────────────┐ (Score < 70 or Exception)
    │ (Success)                    │
    ▼                              ▼
[9. BUILD BLUEPRINT]       [FALLBACK_TRIGGERED]
    │                              │ (Emits buildFallbackBlueprint)
    ▼                              │
[10. VALIDATE BLUEPRINT]           │
    │                              │
    └──────────────┬───────────────┘
                   │
                   ▼
           [11. RETURN BLUEPRINT]
```

---

## 7. Relationship with the Existing Pipeline

Creative Brain will be inserted into `GenerationPipeline.execute()` inside `functions/src/services/ai/pipeline.ts` **between Stage 2 (Product Understanding) and Stage 3 (Campaign Strategy)**.

* Stage 1 & 2 run normally to parse business facts and product visual attributes.
* `CreativeBrainService` ingests stage 1 & 2 outputs, forms the opportunity, scores candidate concepts, and emits `CreativeBlueprint`.
* Stage 3 (Campaign Strategy), Stage 4 (Localization), Stage 5 (Copy Pack), Stage 6 (Image Prompts), and Stage 7 (`compositor.ts`) execute directives directly from the `CreativeBlueprint`.
* Stage 11 (`truthCheck.ts`) deterministically verifies the final outputs against Level 0 business facts before persistence.

---

## 8. What Phase 2 IS Allowed to Implement

Phase 2 developers are strictly authorized to implement:
1. **`CreativeBrainService` Class**: Implementing `ICreativeBrainService` contract in a dedicated file (`functions/src/services/ai/creativeBrainService.ts`).
2. **Opportunity & Concept Prompts**: Structured Gemini prompts for opportunity formation and concept generation.
3. **Concept Evaluator Engine**: Deterministic 5-dimension scoring model (`scoreConcepts()`).
4. **Fallback Builder**: Implementation of `buildFallbackBlueprint()`.
5. **Pipeline Insertion**: Invoking `CreativeBrainService` inside `GenerationPipeline.execute()` between Stage 2 and Stage 3.
6. **Stage 3 Adaptor**: Updating Stage 3 prompt formatting to consume `CreativeBlueprint.strategyDirectives`.

---

## 9. What Phase 2 MUST NOT Change

Phase 2 developers are strictly forbidden from modifying or refactoring:
* **DO NOT MODIFY** [truthCheck.ts](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/functions/src/services/ai/truthCheck.ts) or Truth Check gating logic.
* **DO NOT MODIFY** [compositor.ts](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/functions/src/services/ai/compositor.ts) SVG rendering or XML escaping.
* **DO NOT MODIFY** [usageControl.ts](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/functions/src/services/usageControl.ts) credit reservation, deduction, or refunding.
* **DO NOT MODIFY** [auth.ts](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/functions/src/middleware/auth.ts) tenant access control middleware (`verifyBusinessAccess`).
* **DO NOT MODIFY** [firestore.rules](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/firestore.rules) database security rules.
* **DO NOT MODIFY** [businessCreation.ts](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/functions/src/services/businessCreation.ts) or mutate `BusinessBrain` fields.
* **DO NOT MODIFY** [videoRenderer.ts](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/functions/src/services/videoRenderer.ts) or FFmpeg rendering code.
* **DO NOT CREATE** duplicate campaign generation pipelines or new Cloud Function callable entry points.

---

## 10. Complete Documentation Index (`docs/creative-brain/`)

1. **[PHASE_1_REPOSITORY_MAP.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/PHASE_1_REPOSITORY_MAP.md)** (Phase 1A: Subsystem Mapping)
2. **[CREATIVE_BRAIN_RESPONSIBILITIES.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CREATIVE_BRAIN_RESPONSIBILITIES.md)** (Phase 1B: Responsibility Matrix)
3. **[CREATIVE_BRAIN_INPUT_CONTRACT.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CREATIVE_BRAIN_INPUT_CONTRACT.md)** (Phase 1C: Input Attribute Dictionary)
4. **[CREATIVE_OPPORTUNITY.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CREATIVE_OPPORTUNITY.md)** (Phase 1D: Opportunity Specification)
5. **[CREATIVE_CONCEPT.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CREATIVE_CONCEPT.md)** (Phase 1E: Concept Specification)
6. **[CONCEPT_EVALUATION_MODEL.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CONCEPT_EVALUATION_MODEL.md)** (Phase 1F: Scoring Model & Thresholds)
7. **[CREATIVE_BLUEPRINT.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CREATIVE_BLUEPRINT.md)** (Phase 1G: Blueprint Output Contract)
8. **[CREATIVE_BRAIN_DECISION_FLOW.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/CREATIVE_BRAIN_DECISION_FLOW.md)** (Phase 1H: Decision Lifecycle Flow)
9. **[TRUTH_AUTHORITY_AND_CONFIDENCE.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/TRUTH_AUTHORITY_AND_CONFIDENCE.md)** (Phase 1I: Truth & Authority Hierarchy)
10. **[EXISTING_SYSTEM_INTEGRATION.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/EXISTING_SYSTEM_INTEGRATION.md)** (Phase 1J: Directive Integration Mapping)
11. **[FAILURE_AND_FALLBACKS.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/FAILURE_AND_FALLBACKS.md)** (Phase 1K: 15-Scenario Fallback Matrix)
12. **[ADAPTIVE_MEMORY_BOUNDARY.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/ADAPTIVE_MEMORY_BOUNDARY.md)** (Phase 1L: Memory Boundary Limits)
13. **[IMPLEMENTATION_CONTRACT.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/IMPLEMENTATION_CONTRACT.md)** (Phase 1M: TypeScript Service Contract)
14. **[PHASE_1_ARCHITECTURE_REVIEW.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/PHASE_1_ARCHITECTURE_REVIEW.md)** (Phase 1N: Architecture Review Sign-Off)
15. **[PHASE_1_README.md](file:///d:/brainwise%20AI%20marketing%20Agent/ai-marketing-engine/docs/creative-brain/PHASE_1_README.md)** (Phase 1 Master Guide & Index)
