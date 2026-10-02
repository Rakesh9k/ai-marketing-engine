# P0 Hardening Tracker

Started 2026-09-29. Supersedes narrative "phase report" style tracking for P0
work (see `docs/_quarantine/unverified-phase-reports/README.md` for why).

## Evidence rule

Every item below is tracked with exactly these five fields:

- **STATUS** — one of: `NOT STARTED`, `IN PROGRESS`, `CODE VERIFIED`, `TEST VERIFIED`, `PRODUCTION VERIFIED`
- **IMPLEMENTATION** — the actual diff/file/lines, or "none yet"
- **TEST** — the actual test added/run and its real output, or "none yet"
- **PRODUCTION VERIFICATION** — actual observed behavior in the deployed app (URL, screenshot, log line, HTTP response), or "not verified"
- **EVIDENCE** — command output, file path + line numbers, or log excerpt backing the above. No claim without a pointer to the artifact that proves it.

An item is never marked done because code merely exists. `CODE VERIFIED` means
the code was read and reasoned about; `TEST VERIFIED` means an automated test
exercises it and passes; `PRODUCTION VERIFIED` means it was observed working
in the actual deployed environment.

## Baseline (established 2026-09-29, real command output)

**Root** (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`):

- lint: **FAIL** — 38 errors, 1 warning (prettier formatting + 2 real `@typescript-eslint` errors: `import()` type annotation in `src/app/billing/page.tsx:83`, unused `topUpCredits` in `src/app/billing/page.tsx:104`). Files: `src/app/billing/page.tsx`, `src/app/pricing/page.tsx`, `src/app/privacy-policy/page.tsx`, `src/app/refund-policy/page.tsx`, `src/app/terms/page.tsx`, `src/lib/gsap.ts`. 36 of 38 errors are `--fix`-able (quote style/formatting).
- typecheck: **PASS** — `tsc --noEmit` produced no errors
- test: **PASS** — 45 suites passed / 0 failed (4 skipped), 491 tests passed / 0 failed (83 skipped), out of 49 suites / 574 tests total
- build: **PASS** — `next build` completed, all routes compiled including `/terms`, `/privacy`, `/refund`, `/cancellation`, `/contact`, `/support` as static pages

**functions** (`npm run build`, `npm test`):

- build: **PASS**
- test: **PASS** — 64 suites passed / 0 failed (28 skipped), 815 tests passed / 0 failed (139 skipped), out of 92 suites / 954 tests total

Note: these totals (45+64=109 suites, 491+815=1306 tests) do not match the
CLAUDE.md-recorded baseline (38 suites/687 tests) — the test suite has grown
since that number was written; treat the numbers above, not the CLAUDE.md
figure, as current ground truth, and update CLAUDE.md's baseline once this is
reconciled with the user.

Full raw logs preserved at (local machine, not committed):
`%TEMP%\mitra_root_baseline.log`, `%TEMP%\mitra_functions_baseline.log`

## Items

### P0-1 — Truth Check does not gate initial generation download

- STATUS: TEST VERIFIED
- IMPLEMENTATION: Reordered `functions/src/functions/campaigns/generateCampaignStrategy.ts` so the Truth Check verdict (`truthCheckStatus`/`finalStatus`) is computed BEFORE any persistence, not after (was computed at the old line ~506, after `createCampaignAssets` at line ~502). On `finalStatus === 'failed'`: no `CampaignAsset` docs are created at all (DISCARD branch, `generateCampaignStrategy.ts` ~line 498-509), and every Storage object the pipeline uploaded is deleted via a new `deleteGeneratedAssets()` helper (`functions/src/services/ai/generatedAssetStorage.ts`). On PASS/REVIEW_REQUIRED: unchanged persist path. `functions/src/services/ai/pipeline.ts` `runStage7` now collects every uploaded object's storagePath (hero + poster + each story frame) into `allStoragePaths`, threaded through `GenerationPipelineOutput.allGeneratedStoragePaths` — this is necessary because the raw hero image's storagePath was previously never attached to any persisted asset, so it couldn't otherwise be found for cleanup. Frontend defense-in-depth: `src/components/campaign/CampaignDetailContent.tsx` `handleDownloadImage` now also refuses on `campaign.status === 'failed'` (belt-and-suspenders only — the real fix is that no imageUrl exists in Firestore/Storage anymore for a failed campaign).
- TEST: New file `functions/src/functions/campaigns/generateCampaignStrategy.truthCheckGating.test.ts` (Firestore+Storage emulator-gated, matching existing `describeIfEmulator` convention). Two tests: (1) FAIL verdict → asserts zero `campaign_assets` docs exist for the campaign AND `deleteGeneratedAssets` called with exactly the pipeline's reported storage paths; (2) PASS verdict → asserts the asset doc IS persisted with its `imageUrl` intact and `deleteGeneratedAssets` is never called. Both passed against the real Firestore/Storage emulator (`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 npx jest generateCampaignStrategy.truthCheckGating.test.ts` → `Tests: 2 passed, 2 total`). Full functions suite re-run against the same emulator afterward: only 4 pre-existing, unrelated suites failed (all due to `admin.auth()` needing the Auth emulator, which wasn't started for this pass — `createBusiness.test.ts`, `getAnalyticsDashboard.emulator.test.ts`, `onboardingToCampaignE2E.test.ts`, and a timing-sensitive `usageControl.test.ts` case); none touch the files changed here. Plain `npm test` (no emulator, matches the CI baseline) re-run after the change: **64 suites passed / 0 failed (29 skipped, was 28), 815 tests passed / 0 failed (141 skipped, was 139), 956 total (was 954)** — the new suite/2 tests are the only delta, correctly skipped without an emulator, confirming no regression against the P0-0 baseline. Root `npm test`, `npm run typecheck`, `functions npm run build` all re-run clean after the frontend/backend edits (45/45 root suites, 491/491 root tests, typecheck clean, functions build clean).
- PRODUCTION VERIFICATION: not verified (requires a real end-to-end generation against a fabricated-price/dish/hours scenario in a deployed or emulator-backed staging environment — TC-TRUTH-001/002/003's exact scenarios from the acceptance criteria were exercised at the persistence-mechanics level via the mocked-pipeline test above, not via a real AI call through the actual Truth Check prompt/deterministic-check logic in `truthCheck.ts`. That remains open.)
- EVIDENCE: `functions/src/functions/campaigns/generateCampaignStrategy.ts` (reordered block ~line 482-530); `functions/src/services/ai/generatedAssetStorage.ts` (`deleteGeneratedAssets`, new); `functions/src/services/ai/pipeline.ts` (`runStage7` `allStoragePaths`, `GenerationPipelineOutput.allGeneratedStoragePaths`); `functions/src/functions/campaigns/generateCampaignStrategy.truthCheckGating.test.ts` (new, 2 tests); `src/components/campaign/CampaignDetailContent.tsx` `handleDownloadImage`. Known residual gap (documented, not fixed — out of this item's stated scope): `truthCheckStatus === 'REVIEW_REQUIRED'` still maps to `finalStatus: 'generated'` and persists assets exactly like PASS — an unreviewed, ambiguous verdict currently ships identically to a verified one. Also: `getDurableDownloadUrl` (`functions/src/services/storageUrls.ts`) issues Firebase Storage download-token URLs, which bypass `storage.rules` entirely (confirmed by reading Firebase's token-URL mechanism) — this is why deleting the Storage object, not just withholding the URL from Firestore, was required for TC-TRUTH-005 (direct URL access to a rejected asset) to actually fail closed.

### P0-2 / P0-4 — Plan-tier enforcement absent

(Referred to as "P0-3" in the hardening plan that drove this work; kept as
P0-4 here per this tracker's own pre-existing numbering — see the note under
P0-3 above. Same item either way.)

Docs corroboration found this session: `docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md`
finding F7 / candidate C10 had already flagged this exact gap and explicitly
asked "is credits-only gating the intended model, or should tiers be
enforced?" as a founder decision — resolved implicitly by the hardening plan
itself (which assumes enforcement is wanted) rather than re-asked.

- STATUS: TEST VERIFIED
- IMPLEMENTATION: New canonical service `functions/src/services/entitlements.ts`
  — `PLAN_ENTITLEMENTS` table (campaignsPerMonth/maxBusinesses/features per
  plan, sourced from `src/app/pricing/page.tsx`'s live customer-facing
  feature bullets, not invented), `getUserEntitlements`, `requireFeature`,
  `requirePlan`, `requireCampaignAllowance`, `requireBusinessAllowance`,
  matching the requested API shape exactly. Wired into 3 concrete,
  unambiguous gates that already existed in the product but were previously
  unenforced:
  - `generateCampaignStrategy.ts`: `requireCampaignAllowance(userId)` called
    BEFORE `executeWithUsageControl` — a quota-exceeded rejection consumes
    zero credits and makes zero AI calls (TC-PLAN-002).
  - `createBusiness.ts`: `requireBusinessAllowance(userId)` before creating
    the business doc — Free/Starter/Business capped at 1 profile, Agency at
    1000 (pricing page: "1 business profile" vs. "Multi-business account
    management") (TC-PLAN-003/004).
  - `createBrandKit.ts` / `updateBrandKit.ts`: `requireFeature(userId,
'brandKit')` — Business/Agency-only per the pricing page ("Brand Kit &
    Logo Integration") (TC-PLAN-003/004/005).
    `campaignsCreated` (existed on the `Usage` type and was initialized
    everywhere but **never incremented anywhere** — a second, independent gap
    found while wiring this) is now incremented atomically alongside
    `creditsUsed` in `usageControl.ts`'s `reserveCreditsForOperation` (for
    `operationType === 'campaign_generation'` only), and correctly released
    again in both `refundReservation` and `cleanupExpiredReservations` so a
    failed/refunded/abandoned generation never permanently consumes a
    campaign-quota slot.
    TC-PLAN-006 (canceled subscription): `getUserEntitlements` derives the
    FEATURE-gating plan from `getSubscriptionByUser` (firestore.ts), whose
    existing query already filters to `status in ('active','trialing',
'past_due')` — a canceled subscription is invisible to it, so features
    fall back to Free automatically, with no new query or field needed. The
    credit ceiling (`billingPlan`, from `Usage.planId`) is deliberately left
    untouched by this — whatever credits remain stay governed by the existing,
    separate mechanism, so "remaining credits stay usable" holds without
    inventing a new policy.
- TEST: New `functions/src/services/entitlements.test.ts` (7 tests, emulator-gated) —
  TC-PLAN-002 (quota exceeded/not-exceeded), TC-PLAN-003 (Free/Starter lack
  brandKit), TC-PLAN-004 (Agency has brandKit+multiBusiness, business-count
  allowance both directions), TC-PLAN-006 (canceled subscription → plan
  'free' for features, billingPlan untouched), TC-PLAN-001-shape (rejection
  makes zero credit-ledger writes). New
  `functions/src/functions/brandKit/createBrandKit.entitlement.test.ts`
  (**TC-PLAN-005, explicitly mandatory**): calls the real `createBrandKit`
  callable directly — no frontend involved — as a Free-plan user, asserts
  rejection AND that no `brand_kits` document was created as a side effect.
  All 7 new tests passed against the real Firestore+Auth+Storage emulator.
  Full functions suite re-run against all 3 emulators after this work: 88/90
  suites, 948/953 tests — the 2 failing suites
  (`getAnalyticsDashboard.emulator.test.ts`,
  `onboardingToCampaignE2E.test.ts`) were verified via `git diff --stat HEAD`
  to be **pre-existing, already-uncommitted local modifications to
  `analyticsService.ts`/`getAnalyticsDashboard.ts` that predate this
  session** (their test-mock/assertion drift is unrelated to entitlements —
  confirmed neither failing test nor its dependency files appear in this
  session's own diff). Plain `npm test` (no emulator, matches CI baseline)
  re-run after all changes: **64 suites passed / 0 failed (28 skipped), 815
  tests passed / 0 failed (138 skipped), 953 total** — identical 815 passing
  to every prior baseline in this tracker, confirming no regression. Root:
  typecheck clean, 45/45 suites, 491/491 tests, unaffected (functions-only
  change). `functions npm run build`: clean.
- PRODUCTION VERIFICATION: not verified — needs a real signed-in Free/
  Starter/Business/Agency account exercised against a deployed environment
  for each of TC-PLAN-001 through 006, not just emulator-backed unit/
  integration tests.
- EVIDENCE: `functions/src/services/entitlements.ts` (new),
  `functions/src/services/entitlements.test.ts` (new),
  `functions/src/functions/brandKit/createBrandKit.entitlement.test.ts` (new),
  `functions/src/services/usageControl.ts` (`campaignsCreated` increment/
  release in `reserveCreditsForOperation`/`refundReservation`/
  `cleanupExpiredReservations`), `functions/src/functions/campaigns/generateCampaignStrategy.ts`
  (~line 296, `requireCampaignAllowance` call site),
  `functions/src/functions/business/createBusiness.ts` (~line 140,
  `requireBusinessAllowance` call site), `functions/src/functions/brandKit/createBrandKit.ts`
  and `updateBrandKit.ts` (`requireFeature('brandKit')` call sites),
  `functions/src/utils/errors.ts` (new HttpsError code mappings for the 4
  entitlement error codes), `src/app/pricing/page.tsx` (source of the
  per-plan feature claims encoded in `PLAN_ENTITLEMENTS`).
  **Known gap, explicitly not fixed here (documented, not silently
  expanded):** "premium templates" (TC-PLAN-001 as literally specified) has
  no real data to gate against — `creativeTemplateRegistry.ts` carries no
  tier/premium flag on any of its ~30 templates, and inventing which
  specific templates are Business/Agency-only would be a content/product
  decision, not an engineering one. `requireFeature(userId,
'premiumTemplates')` exists and is fully functional in the entitlement
  service (tested at the unit level), but is not yet wired into any template
  selection code path. **Separately discovered, unrelated bug, also not
  fixed here:** the frontend (`src/app/billing/page.tsx`) calls a callable
  named `cancelSubscription`, but no such Cloud Function is exported from
  `functions/src/index.ts` or exists anywhere in `functions/src/functions/`
  — the cancel-subscription button would fail at runtime today. This
  predates this session and is orthogonal to entitlement logic (it's a
  missing-endpoint bug, not a tier-enforcement gap), but it directly affects
  whether TC-PLAN-006 can ever be exercised for real, so it belongs in the
  next phase that touches billing/subscription lifecycle.

### P0-3 — `createCampaign` orphaned handler / competing credit reservation path

Note on numbering: this item was referred to as "P0-2" in the hardening plan
that drove this work. Kept as P0-3 here since that ID was already assigned
in this tracker to plan-tier enforcement (below) before that plan arrived —
same underlying issue either way, no work lost.

- STATUS: TEST VERIFIED
- IMPLEMENTATION: Deleted rather than repaired, per the explicit decision
  ("do not leave a known-buggy production handler sitting around... one
  credit reservation implementation, not multiple competing versions").
  Confirmed unused first: `createCampaign` was never exported from
  `functions/src/index.ts` (already excluded before this session) and grep
  across `src/` (the frontend) found zero callers. Removed entirely:
  `functions/src/functions/campaigns/createCampaign.ts`, its two test files
  (`createCampaign.test.ts`, `createCampaign.rateLimit.test.ts`), the legacy
  `reserveCredits`/`confirmCredits`/`refundCredits` functions in
  `functions/src/services/firestore.ts` (only consumer was the deleted
  handler; `reserveCredits` additionally read a `creditsIncluded` Firestore
  field that no code ever wrote — a second, independent bug beyond the
  missing refund path), `firestore.reserveCredits.test.ts`, and the
  `createCampaign` entry in `functions/src/middleware/rateLimit.ts`'s
  `rateLimitConfigs`. `functions/src/index.ts`'s explanatory comment updated
  to reflect full removal rather than exclusion. One credit reservation
  implementation now exists: `services/usageControl.ts`
  (`reserveCreditsForOperation` / `finalizeReservation` / `refundReservation`
  via `executeWithUsageControl`), already the sole path used by both
  `generateCampaignStrategy` and `regenerateAsset` — confirmed by reading
  both files' imports.
  Idempotency-key-as-billing-identity (the other part of this item's
  required flow) was **already correct**, not changed: `generateCampaignStrategy.ts`
  calls `executeWithUsageControl(userId, data.idempotencyKey, 'campaign_generation', ...)`
  — the client's idempotencyKey, not the freshly-generated `campaignId`
  (`uuidv7()`), is the operation/transaction identity. No fix needed there.
- TEST: Pre-existing, already-passing tests in `services/usageControl.test.ts`
  cover the full required flow at the canonical layer (the only layer left
  after deletion): TC-CREDIT-001 (insufficient credits never reserves —
  "insufficient credits genuinely blocks reservation", "ZERO BALANCE"),
  TC-CREDIT-002 (success, exactly one deduction — "CASE 1", "CASE 6", "EXACT
  CREDITS" boundary), TC-CREDIT-003 (failure after reservation → refund —
  "CASE 2/5", "CASE 4", "DATABASE FAILURE AFTER AI SUCCESS"), TC-CREDIT-005/
  006 (same/concurrent idempotency key → exactly one operation/charge —
  "CASE 8", the `M3: duplicate/retry does not re-run generation` describe
  block including the literal concurrent-calls test). TC-CREDIT-004 (Truth
  Check FAIL → refund) is **not** implemented as specified — see the
  decision below. Full functions suite re-run after all deletions: **64
  suites passed / 0 failed (26 skipped, was 29 — exactly the 3 deleted test
  files), 815 tests passed / 0 failed (131 skipped, was 141 — exactly the 10
  deleted tests), 946 total (was 956)** — same 815 passing as the P0-1
  baseline, confirming no regression. `functions npm run build`: clean.
- PRODUCTION VERIFICATION: not verified (requires confirming the currently
  deployed Cloud Functions set in the real Firebase project doesn't already
  have an old `createCampaign` deployment lingering from before it was
  excluded from `index.ts` — deleting the source doesn't retroactively
  undeploy a function; that needs a `firebase deploy` or explicit
  `functions:delete` against production, out of scope for a local-only pass)
- EVIDENCE: `functions/src/index.ts` (export list + comment), `functions/src/services/firestore.ts`
  (functions removed, replaced with an explanatory comment), `functions/src/middleware/rateLimit.ts`,
  `functions/src/functions/campaigns/generateCampaignStrategy.ts` line ~308 (`executeWithUsageControl(userId, data.idempotencyKey, ...)`),
  `functions/src/functions/campaigns/regenerateAsset.ts` line ~140 (same canonical call)
- **DECISION (user-confirmed, 2026-09-29): keep charging (not refunding) credits on a Truth Check FAIL.**
  TC-CREDIT-004 as literally written ("500 effective balance" after a Truth
  Check failure) contradicts existing, intentional, previously-tested
  behavior: `generateCampaignStrategy.recovery.test.ts` explicitly asserts
  credits are "FINALIZED (charged), not refunded — consistent, documented,
  intentional behavior" for a Truth Check FAIL, matching `regenerateAsset`'s
  existing behavior (Phase 6/10 rationale: real AI/compute cost was
  genuinely spent on the attempt, billed like a completed-but-rejected job).
  Flagged to the user rather than silently changed or silently left
  contradicting the spec; user chose to keep current behavior. No code or
  test change made for this sub-item — TC-CREDIT-004 in any future spec
  should read "charged, not refunded" to match reality.

### P0-4 — Domain / TLS / Razorpay production credentials

- STATUS: NOT STARTED (re-verification)
- IMPLEMENTATION: n/a
- TEST: n/a
- PRODUCTION VERIFICATION: last checked 2026-09-22 — `www.brain-wise.com` live, apex `brain-wise.com` TLS failing, 6 legal routes 404 in prod; Razorpay production key previously a placeholder string
- EVIDENCE: `docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md`, `docs/PRODUCTION_READINESS_AUDIT_REPORT.md` — needs a fresh live check, not just doc citation
