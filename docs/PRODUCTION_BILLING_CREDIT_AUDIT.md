# Production Billing & Credit Audit

**Date:** 2026-09-22. Evidence-based, cross-checked against `docs/PHASE_10_CREDITS_PAYMENT_INTEGRITY_REPORT.md` (prior claims verified against current code, not assumed).

## Credit reservation system

Two implementations exist in `functions/src/services/`:

- **`usageControl.ts`** — `reserveCreditsForOperation` / `finalizeReservation` / `refundReservation` / `executeWithUsageControl`, keyed by an `operationId`, Firestore-transactional, idempotency check performed _inside_ the transaction. **This is the live, used system.**
- **`firestore.ts`** — legacy `reserveCredits` / `confirmCredits` / `refundCredits`. `confirmCredits` and `refundCredits` have **zero call sites anywhere in the repo** — dead code, except that `reserveCredits` (the reservation half only) is still called by `createCampaign.ts` (see Critical Finding below).

## Operation → credit pipeline

| Operation                                          | Check                                                                                                                 | Reserve                            | Execute (AI) strictly after reserve                                        | Finalize                                               | Refund on failure    | Idempotent vs retry                                                                | Verdict                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| `generateCampaignStrategy`                         | `executeWithUsageControl`, cost from server-side `getGenerationCost('campaign_generation')`                           | Yes                                | Yes (pipeline runs inside the callback)                                    | Yes, incl. on Truth Check FAIL (intentionally charged) | Yes, on thrown error | Yes (checked in-transaction)                                                       | **REAL/PRODUCTION-READY** |
| `regenerateAsset`                                  | Same pattern, cost `getGenerationCost('regeneration')`                                                                | Yes                                | Yes                                                                        | Yes                                                    | Yes                  | Yes, keyed by client-supplied per-attempt `idempotencyKey`, checked in-transaction | **REAL/PRODUCTION-READY** |
| `generateReel`                                     | Same pattern, plus a pre-check that short-circuits if reel status already in `analyzing/planning/rendering/completed` | Yes                                | Yes (AI clip analysis + ffmpeg render both inside the controlled callback) | Yes                                                    | Yes                  | Yes                                                                                | **REAL/PRODUCTION-READY** |
| `createCampaign` (legacy callable, still deployed) | Computes its own cost independently (`campaignBaseCredits + extraImages * imageGenerationCredits`)                    | Yes, via legacy `reserveCredits()` | N/A — **does no AI work at all**                                           | **Never called**                                       | **Never called**     | N/A                                                                                | **BROKEN / CRITICAL**     |

## CRITICAL FINDING — `createCampaign` orphaned reservation

`functions/src/functions/campaigns/createCampaign.ts` is exported live in `functions/src/index.ts` with `enforceAppCheck: true` — a real, currently-deployed, directly-invocable Cloud Function. It:

- Reserves credits (increments `creditsUsed`, writes a `pending` transaction) via the legacy path.
- Creates a `status: 'draft'` campaign document. No AI generation is invoked.
- Never finalizes (`confirmCredits`) and never refunds (`refundCredits`) the reservation — both are dead code with zero call sites elsewhere.
- **Effect: every invocation permanently burns the caller's credits for zero output, with no recovery path.**
- Not exercised by the current shipped frontend (`CampaignWizard.tsx` only calls `generateCampaignStrategy`), but reachable by any client holding a valid auth + App Check token — e.g. a modified client, a future frontend regression, or direct API probing.
- Independently computes credit cost from `data.newProduct.images.length`, unrelated to `generateCampaignStrategy`'s cost model — if a client called both for the same intent, credits would double-reserve with no cross-check.

**Recommendation (not actioned in this audit pass):** remove the `createCampaign` export from `functions/src/index.ts`, or migrate it onto `executeWithUsageControl` with a real finalize/refund path.

## Bypass check

Grepped every callable in `functions/src/functions/**` for AI-pipeline imports (`GenerationPipeline`, `analyzeReelClips`, `generateValidatedReelEditPlan`) — exactly 3 call sites, all inside `generateCampaignStrategy.ts`, `regenerateAsset.ts`, `generateReel.ts`, all wrapped in `executeWithUsageControl`. **No callable performs AI work outside credit control.** `createCampaign` is a credit-loss defect, not a free-AI-generation bypass.

## Double-spend / retry safety

`reserveCreditsForOperation` and legacy `reserveCredits` both perform their existing-transaction/idempotency check _inside_ a single `db.runTransaction`, before any write — confirmed via code read, and per an in-code comment documenting a previously-real concurrency bug (140-credit double-reservation under load) that this in-transaction check now fixes. **REAL/PRODUCTION-READY** for the three live-used operations.

## Server-side cost authority

`getGenerationCost()` and `PRICING` (`functions/src/config/pricing.ts`) are server-only constants; clients never supply a credit amount for the three live-used operations. `createCampaign`'s cost scales with a client-supplied image count but only upward (no under-charge vector found).

## Plan/tier enforcement (credits)

- `usage.planId` lives in Firestore, and `firestore.rules` denies all client writes to it (`allow write: if false`) — not client-spoofable.
- Enforcement is **credits-only**: `checkGenerationEligibility` checks exactly `creditsAvailable >= creditsRequired`. There is **no separate feature-tier gate** anywhere — `USAGE_ERROR_CODES.SUBSCRIPTION_REQUIRED` exists as scaffolding but is never thrown. See `docs/PRODUCTION_READINESS_AUDIT_REPORT.md` and the Razorpay findings for the broader plan-tier-bypass implication (Brand Kit, multi-business, etc. invocable regardless of plan, as long as credits exist).

## Credit cost vs. actual technical cost

Not independently re-derived this pass (would require live AI provider cost data not available in this session). `functions/src/config/pricing.ts` is the single server-side source of truth for both credit costs and monthly plan allotments — no client-side override path found. Recommend a founder-level review of margin only if/when real usage volume exists to model against.

## Summary verdicts

| Item                                                               | Verdict                                                                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign strategy / regeneration / reel generation credit pipeline | REAL/PRODUCTION-READY                                                                                                                   |
| `createCampaign` legacy callable                                   | **BROKEN — CRITICAL, live credit-loss bug**                                                                                             |
| Double-spend/retry protection                                      | REAL/PRODUCTION-READY                                                                                                                   |
| Server-side cost authority                                         | REAL/PRODUCTION-READY                                                                                                                   |
| Plan-tier feature enforcement                                      | **NOT IMPLEMENTED** (credits-only; not a security vulnerability per se, but confirms no tier differentiation beyond raw credit balance) |
