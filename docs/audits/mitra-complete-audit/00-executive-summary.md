# Mitra Complete Audit — Executive Summary (Pass 1: Discovery & Static Evidence)

Date: 2026-10-11 · Branch: `consolidate/phases-and-paddle-billing` · Mode: audit-only (no application code changed)

> **Status: PROVISIONAL.** This is Pass 1 only: repository discovery, static code inspection of the
> highest-risk paths, and a fresh test/typecheck baseline. Nothing here was verified against production,
> a live browser, live AI providers, or a live Paddle account. Anything not listed under "Verified" is
> **UNVERIFIED**. Scores and completion percentages are deliberately NOT issued yet (see §6).

## 1. The most important truth

Mitra's **backend is substantially more mature than the evidence for the product as a whole**. Billing,
credits and Firestore/Storage rules show deliberate, defect-driven hardening and strong tests. But:

1. **~470 files of the Creative Brain/Intelligence stack are untracked in git** (`functions/src/services/ai/creativeBrain/`, 0 tracked of 470 on disk; plus ~210 untracked paths overall). A disk failure or a bad `git clean` loses the product's core differentiator, and what was tested/deployed is not reproducible from the repo.
2. **The Creative Brain is only thinly reachable from the UI.** Of the 8 exported Creative Brain callables, the frontend references exactly one (`exploreCreativeDirectionEndpoint`, in `src/features/campaign/components/ConceptSelectorModal.tsx`). `createCreativeBrainSession`, `submitStrategicDecision`, `generateStrategicConfirmation` etc. have no UI caller in `src/` (grep, non-test). The session/state-machine flow is BACKEND ONLY. The live campaign path (`CampaignWizard` → `generateCampaignStrategy` → `pipeline.ts`) invokes an adaptive state machine internally.
3. **No evidence yet that the end-to-end journey (signup → onboarding → campaign → download → pay) works in production.** Prior in-repo docs claim readiness; per the audit rules those are claims, not evidence.

## 2. Verified in this pass (commands actually run)

| Check | Command | Result |
|---|---|---|
| Root typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Functions typecheck | `npm --prefix functions run typecheck` | exit 0, no errors |
| Functions tests | `npx jest --silent` (in `functions/`) | **210 suites passed, 0 failed, 45 skipped; 2344 tests passed, 0 failed, 286 skipped** (75.8 s) |

Not run in this pass: root (frontend) jest, lint, `next build`, Playwright e2e, emulator-backed rules tests, live Gemini tests.

**Baseline discrepancy:** `CLAUDE.md` records the baseline as 38 suites / 687 tests / 127 skipped. Current reality is
210 / 2344 / 286. The CLAUDE.md baseline is stale by ~5×; the "compare against baseline" rule is currently meaningless until it is updated.
Skipped tests (286, mostly `*.live.test.ts` / emulator) are **not** counted as passing.

## 3. Strongest areas (evidence-based)

1. **Paddle webhook design** — raw-body HMAC verification, grants only on `transaction.completed`, once-only ledger `paddle_grants/{transactionId}` written in the same Firestore transaction as the entitlement, stale-event ordering guard (`lastPaddleEventAt`), plan derived from server-side price-ID config not payload. (`functions/src/functions/webhooks/paddleWebhook.ts`)
2. **Credit reservation** — reserve/finalize/refund inside Firestore transactions with idempotency keys; orphan `createCampaign` and its competing credit path were deleted; stale-reservation reconciler exists. (`services/usageControl.ts`, `functions/usage/reconcileStaleReservations.ts`)
3. **Firestore/Storage rules** — privilege-escalation (role/businessIds/agencyId/subscriptionId) fields locked; campaign verification, credit and offer fields server-authoritative; all Storage writes `false` (signed-URL + Admin SDK only); usage/subscriptions/transactions read-only to clients. Findings in comments reference emulator-confirmed exploits that were fixed.
4. **Launch-scope gating** — unfinished surfaces (Meta publishing, scheduling, admin, canned `/api/generate-content`) are 404/redirected server-side in `src/proxy.ts` and not exported from `functions/src/index.ts`, rather than shown as fake features.
5. **Test volume and typing** — 2,344 passing backend tests, clean strict typecheck on both packages, App Check enforced on 82 callable files.

## 4. Top problems found so far (ranked)

| # | Problem | Severity | Evidence |
|---|---|---|---|
| 1 | Creative Brain stack (~470 files) untracked in git | **P0** | `git ls-files functions/src/services/ai/creativeBrain` → 0; on disk 470 |
| 2 | Production state of renderer, Paddle webhook destination and model keys unverified from repo; renderer silently mock-gated on `REEL_RENDERER_URL` | P0 (verify) | `videoRenderer.ts:192`, `DEPLOYMENT_RUNBOOK.md:272` |
| 3 | Creative Brain session API has no UI consumer (BACKEND ONLY) | P1 | grep of `src/` |
| 4 | Legacy payment providers (Cashfree exported and deployed; PayU/Razorpay code retained) alongside Paddle — duplicate billing surface | P1 | `functions/src/index.ts:67-75`, `services/{cashfree,payu,razorpay}.ts` |
| 5 | Dead/misleading config: `modelRouting.ts` fallback providers referenced only by itself (image fallback implies Gemini-Imagen that does not exist) | P2 | grep: only `config/modelRouting.ts` matches |
| 6 | Webhook functions (`paddleWebhook`, `cashfreeWebhook`) lack `enforceAppCheck` — expected for `onRequest`, but must rely solely on signature verification; confirm Cashfree signature + idempotency parity | P1 (verify) | files lacking `enforceAppCheck` |
| 7 | Stale baseline and stale docs (e.g. `PRODUCTION_API_INTEGRATION_MATRIX.md` dated 2026-09-22 still describes Razorpay placeholder keys, orphaned `createCampaign`, which has since been removed) | P2 | doc vs `index.ts:42-49` |
| 8 | 560 modified + 211 untracked paths in the working tree on a long-lived consolidation branch; repo root cluttered with audit markdown, `coverage/`, `firestore-debug.log`, `filelist.txt`, `patch.js/patch2.js` | P2 | `git status` |
| 9 | `.test` volume vs live evidence: AI output quality, Telugu/Hindi copy, image/composition and reel MP4 output rest on a few live runs recorded in memory, not on a repeatable suite | P1 (verify) | 286 skipped tests; `*.live.test.ts` |
| 10 | `firestore.rules` `usage` `list` rule uses `resource.data.userId` (fine) but relies on prefix match for `get` of missing docs — acceptable, but add a rules test for the month-rollover path | P3 | `firestore.rules` usage block |

## 5. Launch verdict (provisional)

**NOT VERIFIED — leaning "Ready with limitations" for code, "Not verified" for production.**
No credible cross-tenant or payment-integrity defect was found in the code paths read. The blockers are
verification gaps and repo hygiene, not demonstrated breakage:
- commit the Creative Brain stack,
- prove the paid path in production (sandbox → live Paddle webhook delivery, live-price checkout, entitlement update),
- prove a real MP4 from the deployed renderer (or hide reels),
- run the 12-scenario campaign matrix against live providers.

## 6. What is intentionally withheld

Per Rule 4 (never fabricate), I am **not** issuing the 30 dimension scores, the weighted score, or the four
completion percentages yet. They need Pass 2–3 evidence (browser journeys, live campaign matrix, production
config check). Method and denominators for those are defined in `12-prioritized-remediation-plan.md` §4.

## 7. Reports in this directory

- `01-repository-and-architecture.md` — system map, dependency map, duplicates, limitations
- `07-security-and-data-integrity.md` — rules and callable authorization findings so far
- `08-billing-and-subscriptions.md` — Paddle/credit lifecycle assessment
- `10-testing-and-deployment.md` — test baseline, coverage gaps, deployment checklist
- `12-prioritized-remediation-plan.md` — P0–P3 plan and what Pass 2 must still verify

Not yet written (no evidence gathered): 02, 03, 04, 05, 06, 09, 11, 13.
