# Creative Brain Decision Lifecycle Flow (Phase 1H)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1H)  
**Location**: `docs/creative-brain/CREATIVE_BRAIN_DECISION_FLOW.md`  

---

## 1. End-to-End Decision Flow

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
[5. IDENTIFY OPPORTUNITY]
    │
    ▼
[6. GENERATE CANDIDATE CONCEPTS]
    │
    ▼
[7. EVALUATE CANDIDATES]
    │
    ▼
[8. SELECT CONCEPT]
    │
    ▼
[9. BUILD BLUEPRINT]
    │
    ▼
[10. VALIDATE BLUEPRINT]
    │
    ▼
[11. RETURN BLUEPRINT] (or Fallback Triggered)
```

---

## 2. Stage-by-Stage Specifications

### Stage 1: Input Ingestion (`INPUT`)
* **Inputs**: Raw `GenerationPipelineInput` payload from host call.
* **Outputs**: Initial `CreativeBrainInput` container.
* **Deterministic Logic**: Schema structure check.
* **AI Reasoning**: None.
* **Validation**: Validates required fields (`businessId`, `objective`, `offer`).
* **Failure Behavior**: Throws `ValidationError` (400 Bad Request).

---

### Stage 2: Context Normalization (`NORMALIZE CONTEXT`)
* **Inputs**: Raw `BusinessBrain`, product catalog, `BrandKit`, active `SavedStyle`.
* **Outputs**: Normalized, stripped context (`brainForGeneration`).
* **Deterministic Logic**: Strips owner personal details, sanitizes hex color codes, maps default language settings.
* **AI Reasoning**: None.
* **Validation**: Checks for missing required business fields.
* **Failure Behavior**: Throws `BrainMappingError`.

---

### Stage 3: Authoritative Fact Resolution (`RESOLVE AUTHORITATIVE FACTS`)
* **Inputs**: Business contact, verified prices, delivery radius, vertical profile facts.
* **Outputs**: Immutable Level 0 Fact Dictionary (`sourceFingerprint`).
* **Deterministic Logic**: Extracts exact prices, WhatsApp numbers, locality text, and operating mode defaults.
* **AI Reasoning**: None.
* **Validation**: Ensures product price $\ge 0$ and contact numbers are valid.
* **Failure Behavior**: Rejects run before credit reservation.

---

### Stage 4: Campaign Intent Understanding (`UNDERSTAND CAMPAIGN INTENT`)
* **Inputs**: Submitted `objective`, `offer`, `audience`, `cta`, `localization`.
* **Outputs**: `CreativeBrainCampaignIntent` object.
* **Deterministic Logic**: Validates `objective` and `cta` against `VerticalConfig.allowedObjectives` and `allowedCTAs`.
* **AI Reasoning**: None.
* **Validation**: Rejects invalid CTAs or objectives for business vertical.
* **Failure Behavior**: Throws `ValidationError` (400 Bad Request).

---

### Stage 5: Opportunity Identification (`IDENTIFY OPPORTUNITY`)
* **Inputs**: Resolved facts, campaign intent, Stage 1 Business Understanding & Stage 2 Product Understanding.
* **Outputs**: `CreativeOpportunity` struct.
* **Deterministic Logic**: Applies factual limits (`constraints.factualLimits`) and text density limits.
* **AI Reasoning**: Analyzes customer tension, motivation, and strategic market leverage point via Gemini.
* **Validation**: Verifies `opportunityStatement` is non-empty and `confidence` $\ge 60$.
* **Failure Behavior**: Triggers Fallback Blueprint (`buildFallbackBlueprint`).

---

### Stage 6: Candidate Concept Generation (`GENERATE CANDIDATE CONCEPTS`)
* **Inputs**: `CreativeOpportunity`, template registry, active `SavedStyle`.
* **Outputs**: Array of 3 `CreativeConcept` candidate structs.
* **Deterministic Logic**: Filters template library by compatible verticals and objective; enforces 2 distinct narrative angles and visual emphasis types.
* **AI Reasoning**: Generates 3 distinct concept angles, hooks, and visual directions.
* **Validation**: Verifies 3 structs emitted matching `CreativeConcept` Zod schema.
* **Failure Behavior**: Triggers Fallback Blueprint (`buildFallbackBlueprint`).

---

### Stage 7: Candidate Evaluation (`EVALUATE CANDIDATES`)
* **Inputs**: Candidate concepts, Level 0 facts, `BrandKit`, memory signals.
* **Outputs**: Array of candidates with attached `ConceptScore` structs.
* **Deterministic Logic**: Calculates $S_{\text{truth}}$ (hard gate), $S_{\text{offer}}$, $S_{\text{history}}$, $S_{\text{feasibility}}$.
* **AI Reasoning**: Evaluates $S_{\text{brand}}$ and $S_{\text{audience}}$ alignment scores.
* **Validation**: Forces Total Score to 0 if $S_{\text{truth}} < 25$.
* **Failure Behavior**: Tags candidate with specific rejection code.

---

### Stage 8: Winner Selection (`SELECT CONCEPT`)
* **Inputs**: Scored candidate concepts.
* **Outputs**: Single Winning `CreativeConcept`.
* **Deterministic Logic**: Selects highest scoring candidate with $\text{TotalScore} \ge 70$. Applies tie-breaking rules if necessary.
* **AI Reasoning**: None.
* **Validation**: Verifies winning score $\ge 70$.
* **Failure Behavior**: If no candidate scores $\ge 70$, triggers Fallback Blueprint (`buildFallbackBlueprint`).

---

### Stage 9: Blueprint Composition (`BUILD BLUEPRINT`)
* **Inputs**: Selected winning concept, `CreativeOpportunity`, system parameters.
* **Outputs**: `CreativeBlueprint` struct.
* **Deterministic Logic**: Formats strategy directives, copy directives, visual directives, and overlay rules.
* **AI Reasoning**: None.
* **Validation**: Validates `CreativeBlueprint` against Zod schema.
* **Failure Behavior**: Triggers Fallback Blueprint.

---

### Stage 10: Pre-Execution Blueprint Validation (`VALIDATE BLUEPRINT`)
* **Inputs**: `CreativeBlueprint`, Level 0 facts.
* **Outputs**: Pre-validated `CreativeBlueprint`.
* **Deterministic Logic**: Runs pre-validation check ensuring text overlay rules match exact verified prices and contact facts.
* **AI Reasoning**: None.
* **Validation**: Ensures zero factual discrepancy.
* **Failure Behavior**: Triggers Fallback Blueprint.

---

### Stage 11: Handoff & Return (`RETURN BLUEPRINT`)
* **Inputs**: Validated `CreativeBlueprint`.
* **Outputs**: `CreativeBlueprint` returned to host `GenerationPipeline.execute()`.
* **Deterministic Logic**: Logs reasoning trace and execution timestamp.
* **AI Reasoning**: None.
* **Validation**: Verification of return payload structure.
* **Failure Behavior**: Emits Fallback Blueprint.
