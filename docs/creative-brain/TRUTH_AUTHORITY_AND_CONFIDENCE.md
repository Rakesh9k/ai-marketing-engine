# Truth, Authority, and Confidence Model (Phase 1I)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1I)  
**Location**: `docs/creative-brain/TRUTH_AUTHORITY_AND_CONFIDENCE.md`  

---

## 1. Information Hierarchy & Data Categorization

Creative Brain enforces a strict four-tier information hierarchy. Lower-tier data can NEVER override higher-tier facts.

```
+-------------------------------------------------------------------------------+
|  TIER 0: AUTHORITATIVE BUSINESS FACTS                                         |
|  - Examples: Product price (₹299), WhatsApp (+91-9876543210), Locality text    |
|  - Authority: Absolute (100%). Immutable. Enforced by Deterministic Truth Check.|
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  TIER 1: INFERRED INSIGHTS                                                    |
|  - Examples: "Office workers in Hitec City seek fast, budget-friendly lunches" |
|  - Authority: Derived (75%). Formed by synthesizing Tier 0 facts + history.  |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  TIER 2: CREATIVE HYPOTHESES                                                  |
|  - Examples: "Leading with ₹299 price point in the hook will increase CTR"    |
|  - Authority: Candidate (50%). Tested during candidate scoring.               |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  TIER 3: EXECUTION DECISIONS                                                  |
|  - Examples: "Use hero-product split composition with gold accent fill"       |
|  - Authority: Directive (Operational). Directs downstream pipeline stages.    |
+-------------------------------------------------------------------------------+
```

---

## 2. Examples & Disambiguation

| Example Statement | Data Category | Authority Level | Can AI Override? | Handling Rule |
| :--- | :--- | :--- | :--- | :--- |
| `"Special Paneer Biryani is ₹299"` | **Authoritative Business Fact** | **Tier 0** | **STRICTLY NO** | Must match exact numeric price in catalog. |
| `"WhatsApp ordering is available at 9876543210"`| **Authoritative Business Fact** | **Tier 0** | **STRICTLY NO** | Must match exact contact string. |
| `"Diners prefer quick lunch seating on weekdays"`| **Inferred Insight** | **Tier 1** | **NO** (Contextual) | Inferred from subcategory + business hours. |
| `"Highlighting ₹299 price will drive weekend FOMO"`| **Creative Hypothesis** | **Tier 2** | **YES** | Evaluated via scoring model ($S_{\text{audience}}$). |
| `"Use split-composition SVG with #FFD700 badge"`| **Execution Decision** | **Tier 3** | **YES** | Emitted in `CreativeBlueprint.visualDirectives`.|

---

## 3. Core Principle: Preference for "Insufficient Evidence"

Creative Brain operates under a strict truth-preservation mandate:
> *"When facing missing, ambiguous, or unconfirmed business information, Creative Brain MUST state 'insufficient evidence' and fall back to conservative baseline directives, rather than inventing or hallucinating a marketing insight."*

### Handling Scenarios

1. **Insufficient Data**: If a business has no recorded USP or target audience profile in `BusinessBrain`, Creative Brain defaults to generic, verifiable category facts (e.g. "Quality food prepared fresh") rather than fabricating a specific brand story.
2. **Conflicting Signals**: If user prompt requests "Claim 100% Organic" but `BusinessBrain.knowledge.facts` lacks explicit organic certification confirmation, `conflictResolver.ts` suppresses the claim and Creative Brain flags a factual risk.
3. **Unsupported Assumptions**: AI prompts are constrained by negative directives ("Do NOT assume delivery if operatingMode is dine-in only"). Candidate concepts making unsupported assumptions receive $S_{\text{truth}} = 0$.

---

## 4. Hallucination Protection Mechanisms

1. **Pre-Execution Fact Anchoring**: Factual anchors (prices, names, contact strings) are injected into LLM prompts as non-negotiable XML blocks (`<authoritative_facts>`).
2. **Post-Reasoning String Fingerprinting**: Prior to emitting a `CreativeBlueprint`, text overlays are compared against `computeSourceFingerprint()`. Any mismatch triggers an immediate fallback to `buildFallbackBlueprint()`.
3. **Deterministic Truth Check Integration**: Downstream Stage 11 (`runDeterministicTruthCheck`) provides a final safety net, guaranteeing that no hallucinated claim can reach campaign persistence or user delivery.
