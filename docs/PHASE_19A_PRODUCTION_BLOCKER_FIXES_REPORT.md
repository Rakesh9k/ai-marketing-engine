# Phase 19A — Production Blocker Fixes & Re-Audit

Follow-up to `docs/PHASE_19_PRODUCTION_READINESS_REPORT.md`, which found two P0 blockers and left the phase verdict **BLOCKED**. This is a targeted fix + re-verification of those two specific findings — not a full re-run of the Phase 19 audit, per the scope given.

## P0 #1 — Billing: frontend now drives the existing backend payment infrastructure

**Before**: `src/app/billing/page.tsx`'s "Upgrade to this Plan" button called `console.log(...)` + `window.alert('...Razorpay integration coming soon!')`. No backend function was ever called. A customer could not purchase credits.

**After**: the button now drives the real flow, end to end, using only infrastructure that already existed and was already tested — no second payment system was introduced:

```
/billing → click "Upgrade to this Plan"
   → createSubscription (existing Cloud Function, unchanged)
   → Razorpay Checkout.js opens (loaded on demand, subscription_id from the server)
   → customer pays
   → Razorpay's success handler fires client-side
   → verifyPayment (existing Cloud Function, unchanged) confirms the signature
     and marks the subscription 'active' for immediate UI feedback
   → razorpayWebhook (existing Cloud Function, unchanged) is what actually
     grants credits, server-side, once Razorpay calls it — exactly as it
     already did before this change
```

**Files changed**:
- `src/app/billing/page.tsx` — replaced the stub handler with `handleUpgrade()`, which calls `createSubscription`, opens Razorpay Checkout with the returned `subscription_id`, and on success calls `verifyPayment` with the payment/signature Razorpay returns. Free plan and the customer's current plan remain non-purchasable (button disabled). The "Credit Top-Up Packs" cards remain display-only — they were never backed by any onCall function or webhook branch capable of granting an arbitrary one-time credit amount, and building that would be new backend work, not "wiring the frontend to what exists"; the copy now says so honestly instead of implying they're purchasable.
- `src/lib/razorpay/loadCheckout.ts` (new) — loads Razorpay's `checkout.js` on demand (only when a purchase is attempted, not globally), idempotently.
- `src/app/billing/page.test.tsx` (new) — 4 tests, all passing, that exercise this application's side of the integration for real (mocking only the external Razorpay `window.Razorpay` boundary and the Cloud Functions call, never the logic connecting them):
  1. Clicking "Upgrade" calls `createSubscription`, then opens Razorpay Checkout with the exact `subscription_id` the backend returned.
  2. A successful Razorpay callback calls `verifyPayment` **exactly once** with the correct `razorpaySubscriptionId`/`razorpayPaymentId`/`razorpaySignature`, and shows a success toast — and explicitly asserts this path never calls anything credit-granting (that stays exclusively the webhook's job).
  3. The free plan and the customer's current plan are never purchasable (buttons disabled, no backend call, no checkout opened).
  4. Without `NEXT_PUBLIC_RAZORPAY_KEY_ID` configured, clicking "Upgrade" shows an error and never calls the backend.

**No backend code was changed.** `createSubscription.ts`, `verifyPayment.ts`, `razorpayWebhook.ts`, and `services/razorpay.ts` are untouched — this was purely a frontend integration onto existing, already-tested backend surface.

### Re-verification performed

| Claim to re-verify | Result |
|---|---|
| Billing UI actually calls the backend | **PASS** — `src/app/billing/page.test.tsx`, tests 1–2 above, prove `createSubscription` and `verifyPayment` are called with real arguments, not mocked away |
| Razorpay order creation works in test mode | **NOT EXECUTED — no live/test Razorpay credentials exist in this environment** (unchanged from Phase 19's finding; this is an environment limitation, not a code defect — `createSubscription`'s own emulator-backed test suite, re-run live this pass, still confirms the function itself behaves correctly against a mocked Razorpay client boundary) |
| Successful payment grants credits exactly once | **PASS (re-confirmed, unchanged code)** — `razorpayWebhook.test.ts`'s existing test *"accepts a validly-signed webhook and grants credits for payment.captured"*, re-run live against the Firestore emulator this pass |
| Duplicate callback/webhook doesn't double-credit | **PASS (re-confirmed, unchanged code)** — `razorpayWebhook.test.ts`'s *"the exact same webhook event delivered twice sequentially grants credits exactly once"* and *"...delivered concurrently (racing deliveries) grants credits exactly once"*, both re-run live this pass. Additionally, the new frontend code cannot itself cause a double-credit under any circumstance, by construction: `verifyPayment` (which the frontend calls, possibly more than once if a user does something unusual) never grants credits — only updates a status field — so no number of frontend-triggered calls can duplicate a credit grant; only the already-idempotent webhook does that. |
| No secrets exposed | **PASS** — grepped the new/changed files for API-key/secret-shaped patterns; none found. `NEXT_PUBLIC_RAZORPAY_KEY_ID` (Razorpay's public key-id, safe to expose by design) is the only Razorpay-related value read client-side; `RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` remain backend-only, untouched |

## P0 #2 — Deployment: CI/CD no longer attempts a broken Firebase Hosting frontend deploy

**Before**: `.github/workflows/ci-cd.yml`'s `deploy-staging`/`deploy-production` jobs ran `FirebaseExtended/action-hosting-deploy@v0` against a `firebase.json` with no `hosting` configuration at all — this could not have worked, regardless of secrets being correctly set, because there is nothing for that action to deploy.

**After**: those two jobs are renamed `deploy-backend-staging`/`deploy-backend-production` and now do exactly what Firebase is actually configured to serve in this repository — Cloud Functions — and nothing else. The frontend-build step that existed only to feed the (now-removed) hosting-deploy action was removed along with it. `vercel.json` (already present, already correct for this Next.js app — confirmed again this pass: `"framework": "nextjs"`, correct build/install commands, no `output: "export"`/`"standalone"` conflict) is left as the frontend's deployment configuration, deployed by Vercel's own native Git integration outside this workflow — consistent with this project's actual, intended architecture, not a new one invented for this fix.

No hosting configuration was fabricated to make Firebase Hosting "work" — per the explicit instruction, that was not attempted.

**File changed**: `.github/workflows/ci-cd.yml` (job bodies only — `frontend-lint`, `functions-lint`, `security-rules-test`, and `test` jobs are untouched).

### Re-verification performed

| Claim to re-verify | Result |
|---|---|
| Deployment produces a real reachable Next.js application | **NOT VERIFIED — this environment has no access to trigger or inspect an actual Vercel or GitHub Actions deployment.** What *was* verified: the workflow YAML is now internally consistent (validated via `js-yaml` parse — 6 jobs, correctly structured, no orphaned references to the removed hosting-deploy step) and no longer contains a deploy step that references a non-existent hosting configuration. Whether Vercel's Git integration is actually connected to this repository cannot be confirmed from repository evidence alone — this was already true in the base Phase 19 report and remains an open item for whoever owns the Vercel account. |
| Firebase/Auth/Functions communicate with that deployment | **NOT VERIFIED** — same reason; no reachable deployment exists to test against in this environment |
| No secrets exposed | **PASS** — the workflow still only references GitHub Actions secrets by `${{ secrets.* }}` interpolation (never a literal value), unchanged from before; no new secret reference was added |

## Commands Run (this pass)

```
npm run lint            PASS (root)
npm run typecheck        PASS (root)
npm run build              PASS (17/17 pages; /billing now 3.6kB, up from 2.18kB — the new checkout logic, no bundled Razorpay SDK since it loads via script tag on demand)
npm test                   PASS — 14 suites, 164 tests, 7 legitimately skipped (was 13/160 before this pass — +1 suite, +4 tests, all new, all passing)
npm run functions:build     PASS (untouched this pass; confirmed still builds)
FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST, functions/:
  npx jest --silent          PASS — 26 suites, 160 tests (unchanged backend, re-confirmed live)
FIRESTORE_EMULATOR_HOST + STORAGE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST, root:
  npx jest --silent          PASS — 14 suites, 164 tests, 7 legitimately skipped
```

## What changed vs. what remains open

**Fixed and re-verified this pass:**
- The billing UI now genuinely calls the existing backend payment infrastructure instead of a stub. This is real, tested code — not a claim.
- CI/CD no longer attempts a deploy step that was guaranteed to fail or do nothing; the architecture it now expresses (Vercel for frontend, Firebase Functions-only for backend) matches what's actually configured in this repository (`vercel.json`).

**Still open, unchanged from Phase 19 (explicitly not claimed as fixed):**
- No live Razorpay test-mode credentials exist in this environment, so an actual end-to-end payment (real Checkout modal, real signature from Razorpay, real webhook delivery from Razorpay's servers) has still never been observed. The code paths on both sides of that boundary are tested independently and thoroughly; the boundary itself is not.
- No reachable production/staging deployment exists to smoke-test. Whether Vercel is actually connected to this repository's Git remote is unconfirmed from here.
- `.firebaserc`'s vestigial `targets.hosting` entry (referencing a hosting site that `firebase.json` never configured) was left untouched — it's inert (no `hosting` key in `firebase.json` for it to activate) and removing it wasn't necessary to fix the CI/CD conflict; noted here rather than silently cleaned up, since it wasn't part of the explicit fix scope.

## Verdict

Both P0 findings from Phase 19 have a real, tested, narrowly-scoped fix in place. Phase 19's overall verdict should move from **BLOCKED** to **IMPLEMENTED BUT PARTIALLY VERIFIED** — the remaining gap is exactly what Phase 19 already flagged as environment-dependent (live payment credentials, reachable deployment), not a new or different problem, and not something fixable from inside this environment.
