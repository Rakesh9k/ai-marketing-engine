# 10b — Pass 2B Local Verification (2026-10-11)

Branch `consolidate/phases-and-paddle-billing` @ checkpoint fast-forward (966 source files + audit docs). Node v24.15.0, npm 11.12.1, Java 21, firebase-tools 15.32.1. Raw outputs: `../_mitra_checkpoints/p2b_*.txt` (outside repo).

## Merge safety
Checkpoint was a pure descendant of consolidate (0 modified files in the commit, 966 added). Merged with `--ff-only`; no reset/clean/force. The 345 tracked modifications (earlier "560" counted all status lines incl. untracked) were fingerprinted before/after: identical, except the two audit docs I committed. Mascot images, `filelist.txt`, `functions/nul` remain untracked; backups kept.

## Results
| # | Command | Exit | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| 1 | `npx jest --silent` (root, no emulator) | 0 | 1491 tests / 106 suites | 0 | 110 tests / 6 suites (emulator-gated) |
| 2 | `npx eslint . --ext .ts,.tsx --max-warnings 0` | 1 | — | 10,959 errors | — |
| 3 | `npx next build` | 0 | build OK | 0 | — |
| 4 | Root jest under `firebase emulators:exec --only firestore,storage` | 0 (tests) | 1594 tests / 112 suites | 0 | 7 |
| 5 | Rules suites (6 files) under emulators | tests 0 / wrapper 2* | 103 | 0 | 5 |
| 6 | `functions/` jest, Firestore+Storage emulators only | 1 | 2543 tests / 242 suites | 37 / 6 suites | 50 / 7 suites |
| 7 | the 6 failing suites rerun with Auth emulator added | 1 | 41 | 1 | 0 |

\* Emulator shutdown timed out (`Error: Timed out`, SIGINT) after all tests passed; tooling noise, not a test failure.

Compare earlier no-emulator functions run: 210 suites / 2344 tests passed, 286 skipped. With emulators: **all but one pass**.

## Failures, classified
1. **Lint (10,959):** 100% `prettier/prettier` "Delete ␍" — CRLF working copy (`core.autocrlf=true`) vs `.prettierrc endOfLine: lf`. Environmental, not code defects; zero other rule violations. Not auto-fixed (would touch ~every file). Fix: normalise via `.gitattributes` (`* text=auto eol=lf`) in a dedicated change.
2. **36 failures in 5 suites** (createBusiness, createBusiness.atomic, confirmOnboardingBusiness, both onboarding→campaign E2Es): my harness error — they need the Auth emulator; with it, all 41 pass. Disclosure: without it the Admin SDK tried to fetch a Google OAuth token and got `invalid_grant`; no data was read or written anywhere (demo project ID, request rejected).
3. **REAL DEFECT — `cashfreeWebhook` invalid signature returns 500, expected 400** (`cashfreeWebhook.test.ts:226`). Root cause: `services/cashfree.ts:62` calls `crypto.timingSafeEqual` on buffers of unequal length, which throws `RangeError` → caught by the handler's generic 500. Impact: rejected anyway (no state change), but unauthenticated callers can generate 500s/error logs and trigger provider retries; Cashfree webhook is exported/deployed. Razorpay and PayU already guard length (comments in `razorpay.ts:28`, `payu.ts:163`). Severity P2. Minimum fix: compare lengths first (or hash both). Left unfixed per your instruction to classify first. Regression test already exists and fails.

## Build
Compiled all routes, `exit=0`, no warnings matched in log. Limitation: it used the local `.env.local` (not production secrets); production-env behaviour on App Hosting/Vercel remains unverified.

## Security-rule coverage
Exercised and passing against the CURRENT `firestore.rules`/`storage.rules` (tests read the files): unauthenticated denial, role/agencyId/businessIds escalation, cross-tenant read/write, campaign Truth Check / status / offer / credit field protection, usage/transactions/subscriptions client-write denial, Storage signed-path-only writes.
Gaps (no rule test references): `whatsapp_leads`, `marketingPlans`, `marketingCalendarItems`, `partners`, `partner_referrals`; weak coverage for `subscriptionId` pointer (3 mentions), explicit businessId re-pointing on campaigns. Storage emulator logs "Property role is undefined" evaluation errors for users lacking claims — these resolve to deny (fail-closed) but show claims are assumed present. Five rule tests are `test.skip` for features that don't exist (agency_admin, bulk_jobs) — expected.

## Credit finalisation (targeted check)
`getGenerationCost('campaign_generation')` = 60 + 2×20 = 100 is reserved; `finalizeReservation`/`executeWithUsageControl` then records `creditsUsed: creditsRequired` — **a flat 100, with no partial refund** if fewer images are generated (`MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN = 1`). So an unused image slot is charged, not refunded. This may be intentional flat pricing (a 1-image pipeline may still deliver poster + story), but it is undocumented. Status: UNVERIFIED intent; no targeted test exists. Needs: decision + a test asserting charged credits == documented price for a successful campaign and 0 net on failure.

## Files changed during testing
None tracked. Created: `docs/audits/mitra-complete-audit/10b-…md` (this file), backups/outputs in `../_mitra_checkpoints/`, ignored artefacts (`.next`, `firebase-debug.log`).

## Access confirmation
No production services, live AI providers, billing systems or deployments were used. All emulators ran under project `demo-mitra-audit`. (Only the benign failed OAuth token attempt above.)

## Recommendation
Consolidation branch is safe to proceed to Pass 2C: typecheck clean, builds, 100% of rule/credit/webhook tests pass except one real, low-severity Cashfree bug. Before 2C: decide on CRLF normalisation (lint gate is currently unusable), and the flat-credit question. Update CLAUDE.md baseline to: functions 255 suites (210 pass/45 skipped without emulator; 248 run/242+5 pass with it), root 112 suites.

---

# Pass 2B follow-up (decisions executed, 2026-10-11)

Separate commits on `consolidate/phases-and-paddle-billing`:

| Commit | Change |
|---|---|
| `3516f79` | Cashfree: wrong-length webhook signature now returns 400 (was 500). Length checked before `timingSafeEqual`. Tests: 3 unit (shorter, longer, same-length-wrong) + 3 emulator webhook tests asserting 400 and unchanged usage doc, transaction still `pending`, no grant doc. 94/94 pass across cashfree, paddleWebhook, billing, entitlements, usageControl (incl. concurrency). Valid-signature flow unchanged (existing tests). Malformed requests are NOT acknowledged as 200. |
| `f02eb9d` | `.gitattributes` (`* text=auto eol=lf`, binaries listed). Index already stored LF everywhere (`git ls-files --eol`: i/lf), so no content changes: the temporary-index renormalisation check showed 0 changed files and the 345 tracked modifications were unchanged. An LF copy of a file lints clean. Caveat: existing Windows working copies stay CRLF until re-checked-out/rewritten, so lint on THIS machine still reports CRLF errors; CI (ubuntu) already sees LF. I did not mass-convert the working tree. |
| `ab21263` | `CLAUDE.md` baseline replaced with verified numbers (below). |
| `b1271b7` | `tests/security.rulesCoverage.test.ts`: 25 emulator tests, all pass. |

## Verified baseline (all three emulators, one clean run each)
| Suite | Suites | Tests passed | Failed | Skipped |
|---|---|---|---|---|
| functions (`cd functions && npx jest`) | 248 passed, 7 skipped | 2586 | 0 | 50 |
| root (`npx jest`) | 112 passed | 1594 | 0 | 7 |
Unchanged from Pass 2B: typecheck clean, `next build` passes.

## Rules coverage added
`whatsapp_leads` (owner read only, phone data not readable cross-tenant, no client writes), `marketingPlans`, `marketingCalendarItems`, `partners`, `partner_referrals` (owner read, no client writes incl. self-granted tier/amount), `users.subscriptionId` (cannot be changed, nulled or added; role/businessIds/agencyId escalation denied), campaign `businessId`/`userId` re-pointing, campaign credit/status fields, campaign forge-on-create, asset re-pointing. Each denial has a positive control. Limitation: I did not mutate `firestore.rules` to prove each test fails on a weakened rule (that file has uncommitted edits I will not touch); the positive controls guard against fixture failure only.

## Flat 100-credit charge — decision input
Customer-facing copy sells **outputs per month, not metered usage**: plan `campaignsPerMonth` is free 1 / starter 5 / business 12 / pro 25 / agency 50 (`entitlements.ts`, mirrored in `usage/page.tsx` and pinned by `entitlements.pricingParity.test.ts`), and credits ÷ 100 gives the same numbers for the tiers checked (500→5, 1200→12). `terms/page.tsx:120` says only that credits "are consumed as you generate campaign content"; `refund/page.tsx:71` promises automatic release of credits only when a generation **fails**. Conclusion: a flat 100 per successful campaign is consistent with the product promise; refunding an unused image slot would give customers more than advertised. **No pricing logic changed.** Remaining actions are copy/tests, not code: (a) state "a campaign uses 100 credits" on the pricing page/terms, (b) add a test that a successful campaign charges exactly `getGenerationCost('campaign_generation')` and a failed one nets 0, (c) clarify the pricing card's "Social Creatives 5/mo" (free plan = 1 campaign) so the two units don't conflict.

## New observation
`next.config.ts` CSP still allows `checkout.razorpay.com`, `*.cashfree.com`, `api.razorpay.com` in script/connect/frame sources although Paddle is the active provider and Razorpay is unexported — unnecessary attack surface; trim when the provider decision (Cashfree live or not) is made.

## Mascot asset inventory (read-only; nothing deleted or moved)
77 files, 114.0 MB: 76 PNG (RGBA, e.g. 1157×1359, ~2–3 MB each) + `metadata.json`. 35 files (34.5 MB) are referenced from `src/`; **41 files (79.5 MB) have no reference** in `src`, `functions/src` or the renderer. Many are byte-identical aliases (md5): e.g. `mascot-cheer` = `mascot-cheer-chair`, `mascot-analyst` = `mascot-analyzing`, `mascot-thinking` = `mascot-thinking-chin` = `mascot-remembering`, `mascot-concerned` = `mascot-sad`, `mascot-explain` = `mascot-helper`, `mascot-hero-presenting` = `mascot-phone`, `mascot-curious` = `mascot-idea`, plus un-prefixed twins (`cheer.png`, `idea.png`, …) and `hands_in_pockets` = `waving_standing`. 35 files are already tracked; 42 were untracked and are backed up in `_mitra_checkpoints/mascot-2026-10-11.tar.gz`.
Still to decide before choosing optimise vs LFS: how each referenced file is rendered (`next/image` resizes at the edge; a plain `<img>` ships the full 2–3 MB), the largest rendered size, and App Hosting/Vercel build-size limits. Likely direction (not executed): de-duplicate aliases, then convert the ~35 used images to WebP/AVIF at ≤2× display size (expected >90% reduction) — LFS only if the originals must stay in git. 
