# Phase 6 — Truth Check Report

## 1. Initial Audit

**PARTIALLY CONFIRMED**, with important nuance.

The specific bug the audit described — a raw object literal used where `z.object({...})` was required — **was real**, but it lived in `functions/src/services/ai/validationStages.ts`, which is **dead code**: nothing in the live pipeline calls `runTruthValidation`/`runQualityValidation`/`runSafetyValidation` from that file. It was already fixed in Phase 5 (confirmed still fixed; re-verified in this phase).

The **live, production Truth Check path** — `runDeterministicTruthCheck` in `functions/src/services/ai/truthCheck.ts`, and the AI-assisted validation schemas actually used by `pipeline.ts` (`TruthValidationSchema`/`QualityValidationSchema`/`SafetyValidationSchema`, defined directly in `pipeline.ts`) — were **already correct `z.object({...})` schemas** before this phase. No Zod construction bug existed in the code path that actually runs.

What this phase found instead, by tracing the real flow end-to-end rather than assuming the audit's hypothesis: **several genuine, more serious bugs the audit did not mention at all.** See §2 and the rest of this report.

## 2. Root Cause

Not one bug — six, found by tracing the actual system rather than searching for the one the audit predicted:

1. **A hallucinated discount claim could slip past Truth Check undetected.** No existing check ever flagged a percentage-off claim that wasn't the *expected* one when it appeared *alongside* a correct value, or when no discount was authorized at all. `checkOffer` only verifies the correct discount text is *present*; it never notices an *additional*, unauthorized one.
2. **A regex bug in this phase's own first fix for (1)**: `(?:%|percent)\b` never matches `"20% OFF"` — a word boundary immediately after a non-word `%` character, followed by whitespace, is never a boundary. Found and fixed via the golden test itself failing, exactly as intended.
3. **`regenerateAsset.ts` always superseded the original valid asset**, regardless of whether the regenerated version passed Truth Check. A failed or unreviewed regeneration would silently replace a previously-verified asset.
4. **`updateCampaignStatus.ts`**, a live public `onCall` Cloud Function gated only by ownership, accepted the *entire* `CampaignStatus` enum — including `'completed'` — from the client, with zero Truth Check involvement.
5. **`updateCampaign.ts`** similarly accepted client-supplied `status`/`creditsReserved`/`creditsUsed`/`error` fields with no gating.
6. **`firestore.rules` was missing its `match /databases/{database}/documents` wrapper entirely** (confirmed pre-existing and uncommitted before this session — see §16), meaning every rule in the file, including the one specifically written to stop clients from forging Truth Check status, was inert. The file also lacked a `users` collection rule and only partially protected the `campaigns` collection's `status` field (only `metadata.truthCheckStatus` was ever guarded).

## 3. Truth Check Architecture

```
Business Brain / Product docs (authoritative source facts)
        ↓
generateCampaignStrategy.ts fetches business + product, builds GenerationPipelineInput
        ↓
GenerationPipeline (pipeline.ts) — AI generates copy, offer text, creative content
        ↓
pipeline.ts stages 8–10: AI-assisted structured validation
  (TruthValidationSchema / QualityValidationSchema / SafetyValidationSchema —
   real z.object schemas, safeParse-validated)
        ↓
runDeterministicTruthCheck (truthCheck.ts) — the AUTHORITATIVE, deterministic,
  non-AI gate. Compares generated copy text against GenerationPipelineInput's
  source facts (business name/phone/location/WhatsApp, offer price/discount/
  type/validity, prohibited/unsupported marketing claims).
        ↓
overallStatus: PASS | FAIL | REVIEW_REQUIRED
        ↓
generateCampaignStrategy.ts maps this to campaign.status:
  PASS -> 'verified', FAIL -> 'failed', REVIEW_REQUIRED -> 'generated'
        ↓
Persisted via direct Admin SDK write (createCampaignDoc/updateCampaignDoc) —
  never reachable via client Firestore writes for the status/metadata.
  truthCheckStatus fields (firestore.rules, fixed in §16)
```

`generateStructuredText`'s prompt/schema argument-order bug (the Phase 5 finding) and its fix remain in place and are what the AI-assisted validation stages (8–10) depend on to get a valid structured response at all — Truth Check itself does not call an LLM for factual comparison (see §5/§16 deterministic-testing).

## 4. Zod Validation

- **Schema construction**: `TruthValidationSchema`, `QualityValidationSchema`, `SafetyValidationSchema` (pipeline.ts) are real `z.object({...})` schemas — confirmed via `typeof schema.safeParse === 'function'` and `typeof schema.parse === 'function'` assertions in the new test suite, not just visual inspection.
- **`safeParse` behavior tested directly**: valid input succeeds; missing required field, wrong field type, malformed non-object structure (an array), `null`, `undefined`, and `{}` all fail `safeParse` **without throwing** — verified with explicit `expect(() => schema.safeParse(x)).not.toThrow()` assertions alongside `expect(...).success === false`.
- **Malformed AI output handling** (`GeminiTextProvider.generateStructured`, `text.ts`): malformed JSON, empty response, and a thrown provider error all produce a controlled `Error('Text generation failed: ...')` — never a crash, never a cast of unvalidated data as if it were valid (this was the Phase 5 fix; re-verified still correct here).

## 5. Deterministic Checks

All existing categories in `runDeterministicTruthCheck` were preserved — none removed or simplified. Full list, each returning PASS/FAIL/REVIEW_REQUIRED:

| # | Check | Source fact | Comparison |
|---|---|---|---|
| 1 | Business name | `input.businessName` | substring present in generated text |
| 2 | Product name | `input.productName` | substring present |
| 3 | Price | `input.offerPrice` | exact `₹<price>` string present |
| 4 | Original price | `input.offerOriginalPrice` | exact `₹<price>` string present (REVIEW_REQUIRED if absent) |
| 4b | Promotional price | offer price vs. original | offer price must appear when a discount is implied |
| 5 | Location | `input.businessLocation` | normalized substring present |
| 6 | WhatsApp | `input.whatsappNumber` | last-10-digit match |
| 7 | Business phone | `input.businessPhone` | last-10-digit match |
| 8 | Offer/discount text | `input.offerType` + computed discount % | correct discount text present |
| **8b** | **Unauthorized discount claims** *(new this phase)* | authorized discount % (if any) | **every** percentage claim in the text must match the authorized one, or be flagged |
| 9 | Offer validity | `input.offerValidityStart/End` | a date is mentioned |
| 10 | Prohibited claims | hardcoded list ("guaranteed", "certified", "100%", "#1", etc.) | none present |
| 11 | Unsupported claims | Business Brain facts/rules | delivery/dine-in/hours/parking/etc. claims must be fact-supported |
| 12 | Operations | Business Brain rules | delivery claims require a nonzero delivery radius |
| 13 | Contact info | website/Instagram if provided | mentioned if provided |
| 14 | Business hours | Business Brain facts | hours claims must be fact-supported |
| 15 | Minimum order | Business Brain rules | claims must be fact-supported |
| 16 | Delivery radius | Business Brain facts | claims must be fact-supported |

**Final gate** (unchanged, re-verified correct): `overallStatus` starts `PASS`; any `FAIL` check sets it to `FAIL` unconditionally (sticky, cannot be downgraded back); any `REVIEW_REQUIRED` check only raises it from `PASS` to `REVIEW_REQUIRED`, never overriding an existing `FAIL`. AI-assisted validation (stages 8–10 in pipeline.ts) never overrides this — `runDeterministicTruthCheck`'s result is what `generateCampaignStrategy.ts` actually maps to campaign status; the AI validation stages' outputs are informational and are not read for that mapping.

## 6. Missing Facts

Confirmed: a missing source fact never produces PASS. When `expectedPrice`/`expectedLocation`/`whatsappNumber`/etc. is empty/zero, the corresponding check returns `REVIEW_REQUIRED` with `expectedValue: 'NOT_PROVIDED'` (never PASS, never silently skipped). Tested directly: `missing offer price in input is reported as REVIEW_REQUIRED, not silently PASS`.

The new unauthorized-discount check (8b) closes the specific gap the audit's golden test #5 targets: a business with **no** authorized discount, whose generated copy nonetheless claims "20% OFF", now returns `REVIEW_REQUIRED` (verified — see §11) rather than passing through undetected.

## 7. Client Security

Three independent layers now prevent a client from manufacturing a PASS:

1. **No callable accepts a verification field as input.** `generateCampaignStrategySchema`, `createCampaignSchema`, `regenerateAssetSchema` have no `verified`/`verificationStatus`/`truthCheckStatus` field; Zod would strip it silently even if sent.
2. **`updateCampaign`/`updateCampaignStatus` no longer accept status/credit fields from the client** (fixed this phase — see §2, items 4–5). `updateCampaignStatus` is now restricted to `status: 'draft'` only.
3. **Firestore rules independently block direct writes** to `campaigns.status`, `campaigns.creditsReserved/creditsUsed`, and `campaigns.metadata.truthCheckStatus` (fixed this phase — see §2 item 6, §16) — even if every Cloud Function guard were somehow bypassed, a raw client Firestore write cannot change these fields. `campaign_assets` remains fully write-locked to clients (`allow write: if false`), confirmed still correct.

All three are verified by real tests: mocked-schema tests (§11), and Firestore-emulator rules tests (§16) that actually attempt the forgery and confirm denial.

## 8. Source Changes

No source-version/fingerprint mechanism existed anywhere in the codebase before this phase (confirmed by search). Implemented the smallest viable mechanism:

- `computeSourceFingerprint()` (truthCheck.ts) — deterministic hash of the exact facts Truth Check compared against: business phone, WhatsApp, location, and the verified product's price.
- Computed and stored on `campaign.metadata.truthCheckResult.sourceFingerprint` at verification time (`generateCampaignStrategy.ts`).
- `isVerificationStale(storedFingerprint, currentFacts)` recomputes from the **current** Business/Product docs and compares.
- Wired into `getCampaign.ts` (the callable read path): returns `isVerificationStale: boolean` alongside the campaign, computed on read, **never mutating the stored historical Truth Check result**.

**Honest limitation**: the frontend currently reads campaigns via the client Firestore SDK directly (`campaignService.get()`), not via the `getCampaign` callable — this was already true before this phase (confirmed by searching `src/` for callers of `getCampaign`; none exist, the same as several other orphaned callables found in earlier phases). The staleness mechanism is real, tested, and correctly wired at the one architecturally-correct integration point, but is **not yet reachable by the actual running frontend**. This is stated plainly rather than glossed over — see §15.

## 9. Regeneration

`regenerateAsset.ts` now gates activation on the regenerated version's own Truth Check result via `shouldActivateRegeneration(status)` (a pure, exported function — the *exact* rule the Cloud Function uses, not a parallel copy):

- The new asset is **always persisted** (audit trail), with `status: 'failed'` if not activated.
- The **original asset is marked `superseded` only when the new version's Truth Check status is exactly `'PASS'`.**
- `REVIEW_REQUIRED` is treated the same as `FAIL` for activation purposes — this endpoint has no human-review step, so nothing short of an explicit PASS may replace a valid active asset (fail closed).

## 10. Failed Regeneration

Directly follows from §9: since the original asset is left completely untouched unless `shouldActivateRegeneration` returns `true`, a failed or review-required regeneration **cannot** replace a valid active asset — verified via the exact activation-gating function with all three status values (`PASS`→true, `FAIL`→false, `REVIEW_REQUIRED`→false).

## 11. Golden Tests

All run against the actual production entry point, `runDeterministicTruthCheck` — not a disconnected helper. 30/30 pass (functions/src/services/ai/truthCheck.test.ts).

| # | Scenario | Result |
|---|---|---|
| 1 | ₹299 → ₹399 | **FAIL** ✓ |
| 2 | 10% → 50% | **FAIL** ✓ |
| 3 | ₹299 → ₹299 | price check **PASS** ✓ |
| 4 | 10% → 10% | discount check **PASS**, overall **PASS** ✓ |
| 5 | No discount authorized + "20% OFF" claim | **REVIEW_REQUIRED** (never PASS) ✓; also: correct 10% claim *alongside* an unauthorized 50% claim → **FAIL** ✓ (this second case is what caught the regex bug in §2) |
| 6 | Phone mismatch | **FAIL** ✓ |
| 7 | Kondapur → Banjara Hills | **FAIL** ✓ |
| 8 | "Certified by FSSAI" (unsupported) | **FAIL** (never PASS) ✓ |
| 9 | Client-forged `verificationStatus`/`verified` fields | ignored — result depends only on real content vs. source facts ✓; schema-level proof that such fields are stripped ✓ |
| 10 | Source fact change after verification | fingerprint changes, `isVerificationStale` → `true` for phone/location/price changes, `false` when unchanged, `false` for legacy campaigns with no stored fingerprint (documented, deliberate) ✓ |
| 11 | Regenerated FAIL version | not activated ✓ |
| 12 | Failed regeneration vs. valid active asset | activation gate returns `false` — valid asset is never touched ✓ |
| 13 | Regenerated PASS version | activated ✓ |

Also: Zod schema construction/safeParse tests (9), determinism test (identical input → identical output, byte-for-byte except the timestamp), and fail-closed error-handling tests (empty content, missing price, empty copyPack — none of these throw or default to PASS).

## 12. Test Results

Lint: **PASS**
Typecheck: **PASS** (root, includes `functions/src` under strict settings — `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, etc. all preserved, not weakened)
Unit tests: **114 passed / 0 failed / 2 skipped** (root, no emulator) — **65 passed / 0 failed / 10 skipped** (functions, no emulator). Skips are honestly self-reporting (no `FIRESTORE_EMULATOR_HOST`), matching the project's existing convention.
Build: **PASS** (Next.js, 15 routes)
Functions build: **PASS**
Emulator tests: **PASS** (Firestore emulator actually started and used — see §16). With the emulator running: functions suite 75/75 passed (0 skipped); root suite's Truth Check security tests (my 5 new tests) 5/5 passed. Three **pre-existing, unrelated** rules tests and seven **pre-existing, unrelated** Phase 27 agency/bulk-job tests still fail against the real emulator — see §15.

## 13. Real Pipeline Test

AI generation: **BLOCKED** — no `GEMINI_API_KEY`/`OPENAI_API_KEY` available in this environment (same limitation as Phase 5; confirmed absent from `process.env` and no `.env` file exists anywhere in the repo).
Actual generated content reached Truth Check: **verified structurally, not via a live run** — `generateCampaignStrategy.ts`'s flow (`pipeline.execute()` → `campaignPack.truthCheck` → `runDeterministicTruthCheck` receiving `previousResults.copyPack`, the actual AI-generated copy, not a template or prompt) was traced and confirmed by reading the code, and the deterministic function itself is proven correct by 30 passing golden tests against real (simulated) generated content strings.
Truth Check: **PASS/FAIL/REVIEW_REQUIRED logic verified** (§11) — not exercised inside a live end-to-end campaign generation, since that requires the blocked AI call.
Persistence: **verified at the code level** — `generateCampaignStrategy.ts` calls `createCampaignDoc`/`updateCampaignDoc` (Admin SDK, bypasses client rules) with the real `truthCheckResult` including the new `sourceFingerprint`; not observed against a real Firestore write from a real generation, since that also requires the blocked AI call.

## 14. Security Audit

Client PASS forgery: **BLOCKED** — three independent layers (§7), all tested.
Firestore verification mutation: **BLOCKED** — fixed this phase (the rules file's `match /databases/{database}/documents` wrapper was missing entirely, making every rule in it inert; also extended the `campaigns` update rule to protect `status`/`creditsReserved`/`creditsUsed` in addition to the already-protected `metadata.truthCheckStatus`). Verified with 5 passing Firestore-emulator tests that directly attempt the forgery.

## 15. Remaining Risks

1. **Real provider/end-to-end test still blocked** — no AI credentials in this environment, same as Phase 5. The deterministic Truth Check itself needs no AI call and is fully verified; what's unverified is the live AI-generation-to-Truth-Check handoff under real conditions.
2. **Staleness detection is not reachable by the current frontend** — the frontend reads campaigns via the client Firestore SDK, not the `getCampaign` callable where staleness is computed (§8). The mechanism is real and tested but not yet wired to what users actually see. Fixing this properly means either moving campaign reads to the callable (an architecture change beyond this phase's scope) or writing staleness onto the document reactively when Business/Product data changes (a bigger, riskier change this phase deliberately avoided per the "implement the smallest safe mechanism" instruction).
3. **A previously-verified campaign's own `offer.price`/`status`/`truthCheckResult` are never retroactively invalidated when the source changes** — `isVerificationStale` only *reports* staleness on read; it does not flip `status` from `'verified'` back to something else. This is a deliberate choice (§8): mutating historical verification records automatically was judged riskier than leaving them as an accurate record of what was true *then*, paired with a staleness flag for *now*. Documented, not silently decided.
4. **`checkGenerationEligibility`'s usage-doc-creation fallback still assumes `planId: 'free'`** — unrelated to Truth Check, carried over from Phase 5's remaining risks, not touched here.
5. **Three pre-existing, unrelated Firestore-rules test failures** (`User cannot delete business` — an apparent `@firebase/rules-unit-testing` internal `clearFirestore()`/client-settings interaction; two `Agency member` business-access tests reporting a confusing rule-line evaluation) and **seven pre-existing, unrelated Phase 27 agency/bulk-job test failures** (the `bulk_jobs` collection has no Firestore rules defined at all) were discovered as a side effect of fixing the test infrastructure that let these tests actually run for the first time (see §16). None relate to campaigns, Truth Check, or verification — fixing them is a separate, larger agency/bulk-operations security audit outside this phase's mandate. Documented rather than silently left as "still passing" (they were never actually passing — always silently skipped before this phase).
6. **`updateCampaignStatus`'s restriction to `'draft'`-only may remove a legitimate future use case** if one existed — confirmed via search that no frontend code currently calls this endpoint at all, so nothing is broken today, but if a future feature needs client-triggered status transitions, it will need its own carefully-scoped endpoint rather than reopening this one.
7. **Download/WhatsApp-share gating (task sections 28/29) was not implemented.** No dedicated backend "download" endpoint exists to gate — `CampaignDetailContent.tsx`'s download buttons fetch already-public Storage URLs directly in the browser with no verification-status check at all (not even a frontend warning). No WhatsApp-sharing feature exists yet (consistent with Phase 4's explicit scope note that WhatsApp API integration is out of scope). Building server-side download gating would mean introducing a new Cloud Function / access-control layer for asset downloads — judged a larger architectural addition than this phase's mandate ("fix and verify Truth Check," not "redesign asset delivery"). Flagged, not silently fixed nor silently ignored.

## 16. Files Changed

**Truth Check logic**
- `functions/src/services/ai/truthCheck.ts` — added `checkUnauthorizedDiscountClaims`/`extractExplicitPercentages` (closes golden test #5's gap), `computeSourceFingerprint`/`isVerificationStale` (staleness), `shouldActivateRegeneration` (regeneration safety gate), wired the new discount check into `runDeterministicTruthCheck`.
- `functions/src/types/index.ts`, `src/types/index.ts` — added `TruthCheckResult.sourceFingerprint?`.

**Regeneration safety**
- `functions/src/functions/campaigns/regenerateAsset.ts` — gated asset activation on `shouldActivateRegeneration`; a failed/review-required regeneration no longer supersedes the valid active asset; response now reflects the actually-persisted asset, not the pipeline's raw (unpersisted) one.

**Client-forgery prevention**
- `functions/src/functions/campaigns/updateCampaign.ts` — removed client-settable `status`/`creditsReserved`/`creditsUsed`/`error` fields from the schema entirely.
- `functions/src/functions/campaigns/updateCampaignStatus.ts` — restricted the publicly-callable status field to `'draft'` only (was: the entire `CampaignStatus` enum, unauthenticated-by-Truth-Check).
- `functions/src/functions/campaigns/generateCampaignStrategy.ts` — computes and stores `sourceFingerprint` on the verification result.
- `functions/src/functions/campaigns/getCampaign.ts` — computes and returns `isVerificationStale` on read (does not mutate stored data).

**Firestore rules**
- `firestore.rules` — **restored the missing `match /databases/{database}/documents` wrapper** (confirmed pre-existing/uncommitted before this session, not introduced by this phase), which had made every rule in the file inert; restored the missing `users` collection rule; extended the `campaigns` update rule to also protect `status` and `creditsReserved`/`creditsUsed` (previously only `metadata.truthCheckStatus` was guarded).

**Test infrastructure (unblocking verification, not Truth Check logic itself)**
- `functions/jest.config.js`, `functions/src/testSetup.ts`, `functions/tsconfig.json` — carried over from Phase 5; `testSetup.ts` extended with `NODE_ENV`/`FIREBASE_PROJECT_ID` overrides needed for `getEnvConfig()` to see provided fake API keys in a Jest process (`NODE_ENV=test` otherwise triggers a fallback path that drops them entirely).
- `tests/setup.ts` — fixed a genuine, pre-existing infinite-recursion bug in the `console.error` override (`console.error.call(console, ...)` referred to the already-reassigned function, not the original); implemented the `toSucceed`/`toDeny` custom Jest matchers, which were referenced across 4 test files but never actually defined anywhere; guarded the `window`-dependent setup for the `node` test environment.
- `tests/security.test.ts`, `tests/phase27-authz.test.ts`, `tests/phase27-bulk-approval-auth-roles.test.ts`, `tests/storage.test.ts` — added `@jest-environment node` docblock pragma (the default `jsdom` environment hangs `@firebase/rules-unit-testing`'s WebChannel-based client until timeout, rather than actually reaching the emulator); `security.test.ts` also gained `afterEach(() => testEnv.clearFirestore())` to stop cross-test doc-ID pollution, plus 5 new Truth-Check-specific tests (§14).

**New test files**
- `functions/src/services/ai/truthCheck.test.ts` — 30 golden/schema/determinism/fail-closed tests (§11).

## 17. FINAL VERDICT

**PHASE 6 IMPLEMENTED BUT PARTIALLY VERIFIED**
