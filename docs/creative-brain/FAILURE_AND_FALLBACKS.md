# Failure and Fallback Model (Phase 1K)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1K)  
**Location**: `docs/creative-brain/FAILURE_AND_FALLBACKS.md`  

---

## 1. Primary Protection Principle

> **CRITICAL ARCHITECTURAL SAFEGUARD**:  
> Under no circumstances may a failure, exception, timeout, or low-confidence state within Creative Brain corrupt:
> * **Credits & Usage Control**: No double charging, lost reservations, or un-refunded failures (`usageControl.ts`).
> * **Campaign Persistence**: No half-written or orphan Firestore documents sitting in invalid states.
> * **Business Brain**: No mutation or corruption of authoritative business documents.
> * **Deterministic Truth Check**: No bypass or weakening of `truthCheck.ts` factual verification.
> * **Tenant State**: No cross-tenant document leaks or unauthorized business access.

---

## 2. Comprehensive 15-Scenario Failure & Fallback Matrix

The table below defines the exact action, resolution mechanism, logging level, and state impact across 15 failure scenarios.

| # | Failure Scenario | Action Type | System Resolution Mechanism | Trace / Log Event | Impact on User / Execution Engine |
|---|---|---|---|---|---|
| **1** | **No campaign intent** | **Hard Failure** | Rejects at Cloud Function boundary via `generateCampaignStrategySchema`. | `ValidationError` | Returns 400 Bad Request; zero credits consumed. |
| **2** | **Missing Business Brain data** | **Hard Failure** | `getBusinessDoc()` returns null or throws `BrainMappingError`. | `BusinessNotFoundError` | Rejects request before credit reservation. |
| **3** | **Missing product data** | **Graceful Fallback**| If `productId` missing or invalid, falls back to general business-level promotion. | `WARN: ProductFallback` | Campaign generates using business-level facts. |
| **4** | **Missing audience details** | **Default Behavior**| Populates audience from `BusinessBrain.audience.targetCustomer` or "Local customers". | `INFO: DefaultAudience` | Generation proceeds with default local audience. |
| **5** | **Conflicting preferences** | **Bypass Preference**| `conflictResolver.ts` prioritizes Level 0 rules over conflicting `CreativePreference`. | `WARN: PreferenceIgnored` | Conflicting preference suppressed; Level 0 rules enforced. |
| **6** | **Conflicting perf. signals**| **Use Baseline** | Disregards conflicting performance metrics and uses neutral scoring weight. | `INFO: NeutralPerfWeight` | Scoring proceeds with neutral weight. |
| **7** | **No strong concept ($\text{Score} < 70$)**| **Use Baseline Strategy**| Emits `buildFallbackBlueprint()` using static template defaults. | `WARN: FallbackBlueprintEmitted` | Generation completes using verified baseline blueprint. |
| **8** | **Low confidence ($< 60$)** | **Use Baseline Strategy**| Emits `buildFallbackBlueprint()` using baseline positioning. | `WARN: LowConfidenceFallback` | Generation completes using verified baseline blueprint. |
| **9** | **Unsupported campaign type** | **Hard Failure** | `assertObjectiveAndCtaAllowedForVertical()` rejects invalid vertical objective. | `ValidationError` | Returns 400 Bad Request; zero credits consumed. |
| **10**| **Unsupported format** | **Hard Failure** | Schema validation rejects unsupported formats outside `poster`/`story`/`reel`. | `ValidationError` | Returns 400 Bad Request; zero credits consumed. |
| **11**| **Invalid Blueprint Schema** | **Bypass Adaptive Layer**| Blueprint Zod validation fails; emits `buildFallbackBlueprint()`. | `ERROR: InvalidBlueprintSchema` | Pipeline uses fallback baseline blueprint. |
| **12**| **AI provider failure (API 5xx)**| **Retry -> Fallback**| Retries API call once; if secondary failure occurs, emits fallback blueprint. | `ERROR: AIProviderFailure` | Pipeline uses fallback baseline blueprint. |
| **13**| **Malformed AI response** | **Retry -> Fallback**| Schema repair retried once; on failure, emits fallback blueprint. | `ERROR: MalformedAIOutput` | Pipeline uses fallback baseline blueprint. |
| **14**| **Safety Concern (Stage 10)**| **Hard Failure / Discard**| Stage 10 Safety Validation flags critical violation; campaign status set to `failed`. | `WARN: SafetyViolation` | Storage files deleted, 0 assets saved, credits refunded. |
| **15**| **Factual Uncertainty** | **Prefer Insufficient Evid.**| Creative Brain outputs generic verified facts instead of inventing unverified claims. | `INFO: InsufficientEvidence` | Copy leads with confirmed prices/facts only. |

---

## 3. Fallback Classification Summary

1. **Hard Failure**: Input validation errors, missing business doc, or safety violations. Handled before credit reservation or results in credit refund.
2. **Graceful Fallback / Baseline Strategy**: LLM failures, low concept scores ($< 70$), malformed outputs, or low confidence. Instantly emits `buildFallbackBlueprint()` derived from static template rules.
3. **Default Behavior**: Missing optional fields (audience, occasion). Filled using safe Business Brain defaults.
4. **Bypass Adaptive Layer**: Triggered when preferences or performance signals conflict with Level 0 authoritative truth.
