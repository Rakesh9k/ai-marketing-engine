# Billing / Paddle changeset — manifest (as committed)

Branch: `consolidate/phases-and-paddle-billing` (from `master` @ `b129ab7`, 2026-09-23). **Local only — not pushed.
Nothing has been deployed.** Every commit below was verified by checking it out in an isolated `git worktree`
(only that commit's files; shared `node_modules`) and running the checks listed.

## Why four commits, and why not "billing only"

`HEAD` was 9 days old and **~1,100 paths** were uncommitted across many phases. Several files that carry the
billing work also carry earlier-phase hunks in the same file (e.g. `functions/src/services/firestore.ts`
+494 lines against one billing function), and the earlier-phase `planDetails.ts` + billing page were rewritten
**together** with the Paddle UI. A billing-only commit would either not compile or need invented intermediate
file versions. So: earlier phases first, then billing on top, each commit compiling and tested on its own.

## Commits (oldest first)

| # | Commit | Contents | Verified in isolation |
| - | ------ | -------- | --------------------- |
| 1 | `cf5d8e9` docs: consolidate phase reports, audits and project housekeeping | `docs/` (87 files), root audit reports, `README.md`, `CLAUDE.md`, `.gitignore` (broad `.env.*`, `.env.example` un-ignored), CI workflow, already-tracked scratch scripts | docs/config only |
| 2 | `10c53d5` feat(functions): backend work from phases 23+ (baseline for billing) | `functions/**`, `firebase.json`, `firestore.*`, `storage.rules`, `services/reel-renderer`; **no Paddle functions, `index.ts` is the pre-billing version** | `tsc` clean · `npm run build` ok · jest (no emulator) **860 passed / 0 failed / 30 suites skipped** · full suite vs Firestore emulator **986 passed, 18 failed in 6 suites** — the same 6 suites that fail on the working tree (Auth/Storage-emulator dependent + analytics/onboarding), i.e. pre-existing, not caused by the split |
| 3 | `591da99` feat(web): frontend work from phases 23+, including Paddle pricing/billing UI | `src/**`, `tests/**`, `package*.json`, `next.config.ts`, `tsconfig.json`, `next-env.d.ts`, `apphosting.yaml`, `vercel.json`; **includes** `/pricing`, `/welcome`, `/cancellation`, billing page, `src/lib/paddle`, `src/features/billing/*`, copy corrections, and the **Firebase initialization fix** + subscription resolution + failure handling, with all their regression tests | `tsc` clean · jest **822 passed / 0 failed** (4 suites skipped) · `next build` ok (run on the identical working tree, because Turbopack rejects the worktree's `node_modules` junction) |
| 4 | *(this commit)* feat(functions): Paddle billing backend | the three Paddle functions + tests, `index.ts` Paddle exports, `services/paddle.ts`, catalog + legacy-subscriber scripts, `.env.example`, billing docs (`PAYMENT_GATEWAY.md`, `LEGAL_PADDLE_WORDING_DRAFT.md`, `PRODUCTION_PADDLE_DEPLOYMENT_RUNBOOK.md`, this manifest) | see §Verification of commit 4 |

### What commit 3 contains that you asked to be tracked explicitly
- **Firebase billing-state fix:** `src/lib/firebase/client.ts` (lazy `getFirebaseDb()`), `src/services/database.ts`
  (paid-over-Free subscription resolution), `src/features/billing/readState.ts`, billing/welcome failure states,
  purchases disabled when entitlement is unknown.
- **Its regression tests:** `src/lib/firebase/client.lazyDb.test.ts`, `src/services/subscriptionService.test.ts`,
  `src/features/billing/readState.test.ts`, `src/app/billing/page.test.tsx`, `src/app/welcome/page.test.tsx`,
  `src/app/billingCopy.test.tsx`, `src/app/pricing/*.test.tsx`.

## Dependencies between commits
- 3 depends on 2 only at test level (`billingCopy.test.tsx` reads `functions/src/config/pricing.ts` to keep the credit
  costs in sync) — compile does not depend on it.
- 4 depends on 2 (billing support code in `billing.ts`, `usageControl.ts`, `firestore.ts`, types, env schema) and on 3 for
  the callable names the UI calls. **Checkout works only once commit 4's three functions are deployed.**
- Billing-support code that is interleaved with earlier hunks lives in commit 2 and is inert until commit 4:
  `Usage.bonusCredits/creditsIncluded`, `getPeriodCreditAllowance`, `applyPlanEntitlement`, `resolveEntitledPlan`,
  `getSubscriptionByUser` (pointer + paid-over-Free), `PADDLE_*` env schema (`PADDLE_ENVIRONMENT` has no default), `pro` in
  `SubscriptionPlan`, rate limits for the Paddle callables.

## Legacy providers (D4 pending — nothing removed)
- **Razorpay source restored** (it had been deleted by earlier work): `razorpayWebhook(.test)`, `services/razorpay.ts`,
  `createSubscription`, `cancelSubscription(.test)`, `verifyPayment(.test)`, `src/lib/razorpay/loadCheckout.ts` are
  identical to `HEAD`. To make them compile again (the same earlier work had also removed the pieces they need) commit 2
  re-adds, additively: the legacy `razorpay*` optional fields on `Subscription`/`Transaction`, the six `RAZORPAY_*` optional
  env vars, the `razorpay@^2.9.8` dependency, and a no-op `pro: ''` entry in `razorpay.ts`'s plan map (Razorpay never sold
  Pro). **Verified:** the Razorpay and PayU suites (22 tests) pass against a Firestore emulator.
- `razorpayWebhook` is still **not exported** from `functions/src/index.ts` (as before); the deployed legacy functions are
  untouched. PayU source is unchanged and also not exported. A normal `firebase deploy --only functions` would offer to
  delete the deployed legacy functions — see the runbook; deploy the three Paddle functions **by name**.

## Deliberately excluded (not committed)
| Path | Why |
| ---- | --- |
| `public/` (79 PNG + 2 other; **~160 MB** of changes, many duplicate pairs, 2–3 MB each) | Committing ~160 MB of binaries is irreversible history bloat. **Decision needed:** optimise/dedupe (e.g. WebP, drop duplicates) or Git LFS (v3.7.1 is installed). **Until then a clean checkout lacks these images** (mascot illustrations) — fix before deploying from git. |
| `.agent/`, `.agents/`, `.claude/` (≈345 untracked files) | Local agent tooling/skills, not product code. Consider adding to `.gitignore`. |
| `scratch_test.png` | Scratch artefact. |
| `functions/.env.local`, `.env.local` | Already gitignored; contain local config only (no API key or webhook secret remain in them). |
| Build output (`functions/lib`, `.next`, logs) | Ignored. |

A secret scan over every committed file found nothing real (matches were documentation text, test fixtures with fake keys, a
`.env.example` comment, and the Firebase *web* API key that is already tracked at `HEAD` and public by design).

## Resolved / changed from the earlier manifest
- `tsconfig.json` / `next-env.d.ts` are **not** generated noise: the working tree upgrades Next 15→16, which requires
  `"jsx": "react-jsx"`. They are committed in commit 3.
- The Razorpay deletion question: **restored** (above). `createCampaign` (+2 tests) and `firestore.reserveCredits.test.ts`
  were **not** restored and their deletion is committed in commit 2. `createCampaign` was documented as never deployed and
  called the `reserveCredits` helper that the same earlier decision (P0-2) removed from `services/firestore.ts`; keeping it
  would not compile. Treat reviving it as a separate issue.

## Unresolved items (nothing here blocks the commits; all block production)
1. **D2** — legal entity details (see `docs/LEGAL_PADDLE_WORDING_DRAFT.md`). Terms/Privacy/Refund are unchanged.
2. **D4** — counts of live paid PayU/Razorpay subscriptions (run `scripts/audit-legacy-subscribers.mjs` or the Console check).
3. `public/` images (above).
4. Terms/Privacy/Refund still say PayU/Razorpay and "founder decision required" until D2/D4 arrive.
5. Not yet done: deployed Sandbox verification, Vercel env scoping, live domain / default payment link / webhook, rotation of
   the three exposed API keys, ₹499 live test, test-data cleanup (runbook).
6. Known pre-existing emulator failures (6 suites / 18 tests; need Auth+Storage emulators): `getAnalyticsDashboard.emulator`,
   `confirmUpload`, `createBusiness`, `onboardingToCampaignE2E`, `confirmReelClipUpload`, `analyzeReferenceStyle`.

## Verification of commit 4
Run in an isolated worktree of that commit: `functions` `tsc`, `npm run build`, jest (no emulator), the Paddle/subscription/usage
suites against a Firestore emulator, and the full emulator suite compared with commit 2's known failures. Results are recorded
in the commit message and in the status report that accompanied it.
