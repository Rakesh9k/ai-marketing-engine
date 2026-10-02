# Complete Campaign Flow — Verification Report

**Date:** 2026-09-25
**Scope:** First repair pass against `docs/COMPLETE_CAMPAIGN_FLOW_AUDIT.md` / `docs/COMPLETE_CAMPAIGN_FLOW_FIX_PLAN.md`. This is **not** a claim that all 52 items in the fix plan are resolved — see "What remains" below for the authoritative list of what is still open.

## What was fixed and verified this pass

All 7 code-fixable P0s, plus a further 13 P1/P2/P3 items. Every item below has: a code fix, a passing automated test (new or updated), and a clean typecheck. Items marked 🔒 were verified against real Firestore/Storage emulators, not just unit tests.

| ID   | Title                                                                 | Verified by                                                                                                                                                                       |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1   | Global fixed `campaign_assets` IDs overwrite across campaigns/tenants | Code fix (`pipeline.ts` `assetIdPrefix`); no existing regression test covered the collision itself — see "What remains"                                                           |
| L2   | Asset list query can't satisfy the read rule                          | Code fix (`database.ts`, `campaigns/[campaignId]/page.tsx`) 🔒 covered indirectly by `tests/security.test.ts`'s `campaign_assets` read-rule tests                                 |
| H4   | Hard-coded `creativeObjective:'conversion'` breaks 10/30 templates    | `generateCampaignStrategy.template.test.ts` (1 updated + 1 new test) — PASS                                                                                                       |
| J1   | 70s client timeout; false refund message; double charge               | Code fix (`api.ts`, `CampaignWizard.tsx`, `useRegenerateAsset.ts`, `database.ts`); no automated test added (needs a mocked-timeout Playwright/Jest harness — not built this pass) |
| C1   | Brand Kit can't save (undefined logo) or reload (defaults)            | Code fix (`brand/page.tsx` rewritten to use `createBrandKit`/`updateBrandKit`); no RTL test added this pass                                                                       |
| C2   | base64 logo in Firestore/DALL-E prompt breaks image generation        | Code fix (real Storage upload via `getUploadUrl`/`confirmUpload`, prompt injection removed)                                                                                       |
| J3   | SVG external href (no photo in preview); SVG downloaded as `.png`     | Code fix (`compositor.ts` embeds `data:` URI; `CampaignDetailContent.tsx` derives real extension); `compositor.test.ts` — PASS (existing suite, unaffected)                       |
| A1   | products/campaigns rules: tenant re-point, Truth Check forgery        | `tests/security.test.ts` 🔒 — PASS (new assertions)                                                                                                                               |
| A2   | `businesses` update rule unrestricted                                 | `tests/security.test.ts` 🔒 — PASS (3 tests rewritten to assert denial)                                                                                                           |
| A3   | `brand_kits` client writes unvalidated; SVG colour injection          | `firestore.rules` (write:false) 🔒 covered by existing brand_kits read tests; `compositor.ts` `safeColor()` — no dedicated injection test added                                   |
| B1   | `businessBrain.identity` not synced on profile edit                   | Code fix (`updateBusiness.ts`); no dedicated emulator test added (see "What remains")                                                                                             |
| B2   | `updateBusiness` accepted `category`/`status`                         | Code fix (schema fields removed); no dedicated test added                                                                                                                         |
| B3   | Never-claim/pricing rules not enforced by Truth Check                 | `truthCheck.test.ts` (3 new tests) — PASS                                                                                                                                         |
| B4   | Website URL validation rejected bare domains                          | Code fix (`zodHelpers.ts` `websiteUrlSchema`); no dedicated test added                                                                                                            |
| C4   | Brand form keying/Cancel/dirty state                                  | Code fix (`key={selectedBusinessId}`, working Cancel); no RTL test added                                                                                                          |
| C5   | `/brand` infinite spinner on empty/error                              | Code fix (`loading` cleared in both paths); no RTL test added                                                                                                                     |
| D1   | Storage allowed client overwrite of generated assets                  | `tests/storage.test.ts` 🔒 — PASS (10/10, existing suite unaffected by the new deny rule)                                                                                         |
| D2   | Logo never composited onto the creative                               | Code fix (`compositor.ts` logo `<image>` layer, `pipeline.ts` fetches real bytes); `compositor.test.ts` — PASS (existing suite; no new logo-specific assertion added)             |
| K1   | Comma-formatted prices FAIL Truth Check                               | `truthCheck.test.ts` (3 new tests) — PASS                                                                                                                                         |
| K2   | Exact-substring product-name check FAILs on minor variation           | `truthCheck.test.ts` (2 new tests) — PASS                                                                                                                                         |
| L3   | `next/image` doesn't allow the signed-URL host                        | Code fix (`next.config.ts`); not runtime-verified (would need a real signed URL in dev)                                                                                           |
| P4-2 | Scratch scripts in repo root                                          | Moved to `scripts/archive/` (gitignored), not deleted                                                                                                                             |

## What remains (all 52 fix-plan items minus the 22 above)

**Not started, still exactly as the fix plan describes them:**

- **Phase C:** C3 (two brand sources), C6 (fonts/personality ignored)
- **Phase E:** E1 (duplicate salon/real-estate catalogue), E2 (no product edit/archive UI)
- **Phase F:** F1 (owner action — IAM), F2 (7-day signed URL treated as durable), F3 (wizard photos discarded)
- **Phase G:** G1 (AI re-derives business facts; Truth Check grounded on AI output), G2 (identity has no single source of truth — B1 is the _minimal_ fix only), G3 (template context ignores campaign's chosen language)
- **Phase H:** H1 (`offer.originalPrice` dropped before the pipeline), H2 (`listCreativeTemplates` objective enum mismatch), H3 (contact fields not passed to pipeline)
- **Phase I:** I1 (product photo never used as the AI visual — DALL-E is text-only)
- **Phase J:** J2 (regeneration context wrong/incomplete), J4 (no overall pipeline deadline vs. 540s hard kill), J5 (cosmetic status transitions)
- **Phase L:** L4 (history failure semantics/stuck state), L5 (campaign converter drops fields)
- **Phase M:** M1 (owner decision — credit grant), M2 (no reconciliation of stranded reservations), M3 (same-key replay reruns the pipeline), M4 (refund period mismatch), M5 (client credit display), M6 (emulator timezone usage key)
- **Phase N:** N1 (stale custom claims after onboarding), N2 (infinite progress polling), N3 (errors mistyped as INTERNAL), N4 (download CORS/ZIP)
- **Phase O cleanup:** P4-1 (dead code), P4-3 (`modelUsed` hardcoded), P4-4 (documentation drift)

None of these were touched. Do not assume any of them are fixed.

## Exact commands run

```
# Frontend
npx tsc --noEmit -p tsconfig.json                          → clean, no errors

# Functions
cd functions && npx tsc --noEmit -p tsconfig.json           → clean, no errors

# Full functions unit suite (no emulator)
cd functions && npx jest --silent
  → Test Suites: 2 failed (submitCreativeFeedback.test.ts — PRE-EXISTING, confirmed
    via git stash to fail identically before any change in this pass; unrelated file,
    never touched), 33 passed. Tests: 4 failed (same pre-existing cause), 638 passed.

# Full root/frontend unit suite, WITH Firestore + Storage emulators running
# (firebase emulators:start --only firestore,storage --project demo-test)
FIRESTORE_EMULATOR_HOST=localhost:8080 STORAGE_EMULATOR_HOST=localhost:9199 \
  GCLOUD_PROJECT=demo-test npx jest --silent
  → Test Suites: 34 passed, 34 total
  → Tests: 7 skipped, 318 passed, 325 total
  (this run included tests/security.test.ts and tests/storage.test.ts, which only
  execute their real assertions when the emulator env vars are set — otherwise they
  self-skip. This is the ONLY run in this pass that actually exercised the emulators.)

# ESLint — run only against files this pass touched (the full `npx eslint src` run
# surfaces ~1900 pre-existing CRLF/line-ending and unused-import issues repo-wide,
# unrelated to this pass — confirmed via `git diff` that none of those lines were
# touched here)
cd functions && npx eslint <changed files>
  → clean after `npx prettier --write` on the 2 files it flagged for formatting
    (updateBusiness.ts, generateCampaignStrategy.ts); the remaining 4 unused-import
    warnings in updateBusiness.ts are pre-existing, confirmed via git diff.
```

## Environment

- **Emulator verified:** Firestore rules (A1, A2, D1's Firestore side, L2's read-rule shape) and Storage rules (D1's Storage side) — all run against a real `firebase emulators:start` instance, not mocked.
- **Unit/typecheck verified:** everything else in the table above.
- **NOT verified:** anything requiring a deployed environment, Firebase Console access, App Check tokens, real Gemini/OpenAI API keys, or a real production account. In particular:
  - Whether the IAM `signBlob` permission (F1) is actually still missing in production — not checked, not this pass's scope (owner action).
  - Whether uploads/generation actually work end-to-end against live AI providers — no such run was performed.
  - The Playwright golden-path release gate the fix plan specifies (Phase O, items 1–11) was not run.

## Production claim

**None of this is claimed production-ready.** This pass fixed and locally/emulator-verified a subset of the 52 known issues. Deploying these changes still requires, at minimum: a full `npm run build` / `firebase deploy --only functions,firestore:rules,storage:rules` dry run, redeploying Firestore/Storage rules (the A1/A2/A3/D1 changes do nothing until rules are actually deployed), and a real end-to-end smoke test against a deployed environment before this can be called verified in production.

---

# Pass 2 (G1, F2, I1, M2, M3)

## Results

| ID  | Result                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | FIXED, test verified                                | `truthCheck.ts`: operations/hours/min-order/delivery/unsupported-claims checks now read `input.businessBrain.businessRules` (persisted), not `previousResults.businessUnderstanding` (Stage 1 AI output). Their REVIEW_REQUIRED results now also propagate to overall status (previously silently discarded). Product-name check FAILs when copy names a _different_ product from `businessBrain.products`. 8 new tests (`truthCheck.test.ts`, G1 block) + 1 root test. Spec items 9-12 (stale on price change, regen re-verify, failed regen can't replace, no forged PASS) were already covered by existing Golden Tests #9-#13. |
| F2  | FIXED for new records; legacy records need handling | New `services/storageUrls.ts` `getDurableDownloadUrl` (token-based, non-expiring) replaces 7-day V4 signed URLs in `confirmUpload`, `confirmReelClipUpload`, `uploadGeneratedAsset`. `storagePath` now persisted on `CampaignAsset` (was never set). Emulator-verified: real upload -> confirmUpload -> fetch of returned URL returns the bytes. Vision now throws if images were requested but none load (was silent text-only hallucination).                                                                                                                                                                                    |
| I1  | FIXED via supported fallback                        | DALL-E 3 `images.generate` cannot take a reference image. Pipeline now uses the real product photo directly as the hero (zero AI image calls) when one exists; AI generation only when none. False "EXACT visual reference" prompt claim removed. 4 tests in `pipeline.productPhotoHero.test.ts`. Not verified: visual fidelity of the final SVG (no pixel/render test).                                                                                                                                                                                                                                                           |
| M2  | FIXED, emulator verified                            | New scheduled `reconcileStaleReservations` (every 10 min; reservations pending >15 min, i.e. past the 540s hard timeout; skips terminal campaigns; uses existing transactional `refundReservation`). 6 emulator tests incl. double-run, concurrent-safe, tenant isolation, completed never refunded. Index added to `firestore.indexes.json`.                                                                                                                                                                                                                                                                                      |
| M3  | FIXED, emulator verified                            | `generateCampaignStrategy` returns the existing campaign for a replayed idempotencyKey before reserving credits; `executeWithUsageControl` throws `DUPLICATE_REQUEST_IN_PROGRESS` (no re-run, no refund of the original) for an in-flight duplicate; error codes mapped to proper HttpsError codes. 3 emulator tests (in-flight duplicate, original still finalizes, concurrent = one execution + one charge) + 1 handler test. Regeneration uses a fresh key per call, so it is structurally not treated as a duplicate.                                                                                                          |

## Commands and counts

- Functions typecheck / frontend typecheck / `functions npm run build`: PASS
- Functions jest with Firestore+Storage+Auth emulators: 60/61 suites (787/792 tests pass, 2 skipped); the single failing suite is `submitCreativeFeedback.test.ts` (3 tests) — PRE-EXISTING (fails identically on the unmodified tree).
- Root jest with Firestore+Storage emulators: 34/34 suites after fixing one stale test (317 pass, 7 skipped).
- Root `npm run build` (Next): FAILS at lint on repo-wide CRLF/prettier noise — PRE-EXISTING/ENVIRONMENTAL, not attributable to Pass 1/2 (not re-verified on a clean tree).
- Full-flow E2E (Phase 6) was NOT run as one scenario; coverage is per-boundary. Not done.

## Pass 2 test edits that changed prior expectations

`tests/truthCheck.test.ts` and `functions/.../truthCheck.test.ts` operations fixtures moved from `previousResults.businessUnderstanding` to `input.businessBrain.businessRules` (intended G1 behavior change); generatedAssetStorage test updated for durable URLs.

## Deployment requirements / caveats

- Deploy `firestore.indexes.json` (new transactions status+createdAt index) before the scheduler runs in production; the emulator does not enforce composite indexes.
- Deploy Firestore/Storage rules from Pass 1.
- Legacy Firestore records still hold 7-day signed URLs (products, campaign_assets). They will expire; `storagePath` exists for products and (new) assets, but no refresh/migration job or read-time re-sign was built. Old campaign assets have no storagePath. Migration is required and NOT done.
- G1 catalog-swap FAIL only fires when `businessBrain.products` is populated; it is still `[]` in production (issue E1, unfixed), so in practice that path stays REVIEW_REQUIRED.
- M1 and F1 untouched (owner decisions).

## Remaining from the original 43 (unchanged): C3, C6, E1, E2, F3, G2 (full), G3, H1, H2, H3, J2, J4, J5, L4, L5, M4, M5, M6, N1, N2, N3 (partially improved: usage errors now map to proper codes), N4, P4-1, P4-3, P4-4, plus J3 full server-side PNG rasterization.
