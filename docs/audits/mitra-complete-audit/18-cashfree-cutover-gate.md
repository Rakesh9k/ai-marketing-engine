# 18 — Cashfree cutover gate: what must pass before production, and how to roll back

**Status 2026-10-11: NOTHING here has been executed against Cashfree or production.** Production runs the Paddle trio only (`firebase functions:list`); this HEAD adds the Cashfree, onboarding and Creative Brain callables and makes the Paddle webhook inert. **Do not deploy to find out whether the webhook configuration works.** Every step below is a separate, explicit decision.

## 1. Preconditions (all must be true before any production deploy)
| # | Precondition | State |
|---|---|---|
| 1 | Prepaid fixed-term model confirmed: 30/365 days, no auto-renewal | **Decided** (2026-10-11), implemented and tested |
| 2 | Cashfree agreement confirms seller/settlement/invoicing/GST (fact sheet B2) | OPEN |
| 3 | Refund / dispute / credit-expiry rules decided (fact sheet B3–B4) and implemented | OPEN (today: manual review only) |
| 4 | Legal pages re-worded by an India-qualified adviser and ready to publish with the cutover | OPEN (`it.todo` markers) |
| 5 | Cashfree sandbox account + credentials; webhook URL registered in the sandbox dashboard | OPEN (no credentials exist locally) |
| 6 | Real sandbox end-to-end journey passed (§2) | NOT RUN |
| 7 | Clean-checkout regression green at the exact commit to be deployed | Green at last verified commit; re-run at the deploy commit |
| 8 | Deployment diff reviewed (§3) | OPEN |
| 9 | Rollback plan agreed (§4) | Proposed below |

## 2. Sandbox journey (run against Cashfree's SANDBOX with the Firebase emulators, or a non-production project; never production data)
For each row: *automated* = proven today on the emulator with Cashfree's API stubbed (`paymentProviderSwitch.test.ts`, `prepaidTermLifecycle.test.ts`, `cashfreeWebhook.test.ts`); *sandbox* = needs the real Cashfree sandbox, which has **not** been run.
| # | Journey step | Automated | Real sandbox |
|---|---|---|---|
| 1 | Checkout created with the server-calculated price (client cannot change it) | ✅ | ☐ order appears in the Cashfree sandbox dashboard with the right amount/tags |
| 2 | Successful payment with the exact amount and INR | ✅ | ☐ use Cashfree's published sandbox test payment methods |
| 3 | Webhook signature verification (valid, invalid, short, missing) | ✅ | ☐ confirm the real header names/format and that `CASHFREE_WEBHOOK_SECRET` is the dashboard's signing secret |
| 4 | Idempotent credit and entitlement grant; term = 30/365 days | ✅ | ☐ |
| 5 | Duplicate / replayed webhook (and ORDER_PAID + PAYMENT_SUCCESS pair) | ✅ | ☐ resend from the dashboard |
| 6 | Failed, pending, short-paid, wrong-currency, refunded payments | ✅ (all but a real pending state) | ☐ failed and user-dropped payment in sandbox; **confirm what Cashfree sends for a refund** (`REFUND_STATUS_WEBHOOK` shape is assumed) |
| 7 | Purchase while another entitlement is live (other plan/period/provider) | ✅ | ☐ |
| 8 | Return page while payment is pending / failed / abandoned (never claims success) | ✅ (UI tests) | ☐ in a real browser, including closing the tab mid-payment |
| 9 | Renewal extends exactly once; expiry stops paid credits; renewed after expiry works | ✅ | ☐ expiry can be exercised by editing the sandbox project's term dates |
| 10 | Browser: redirect checkout under the production CSP (script from `sdk.cashfree.com`, API to `*.cashfree.com`) | ✅ CSP pinned by test | ☐ confirm no console CSP violations on `/billing` |
| 11 | Webhook delivery to the deployed URL from Cashfree (reachability, 2xx, retries) | n/a | ☐ |

## 3. Deployment diff to review before deploying this HEAD
- **New exported functions** that do not exist in production: `createCashfreeCheckout`, `cancelCashfreeSubscription`, `cashfreeWebhook`, `saveOnboardingDraft`, `discoverOnboardingFacts`, `confirmOnboardingBusiness`, 8 Creative Brain callables. (`cancelCashfreeSubscription` is no longer reachable from the UI.)
- **Changed behaviour of deployed functions:** Paddle trio becomes inert unless `ACTIVE_PAYMENT_PROVIDER=paddle`; `expireSubscriptions` now ends all ended non-Paddle terms; credit reservation reconciles lapsed plans; campaign generation blocks unsupported claims and rejects contradictory offers; `generateReel` refuses to fall back to the mock renderer.
- **Rules/indexes:** `firestore.rules` (campaign create denied to clients, `onboarding_drafts`, usage first-read) and `firestore.indexes.json` (+ `subscriptions(status, currentPeriodEnd)`; index builds are asynchronous, deploy indexes first and wait).
- **Config/secrets to set first:** `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET` (secrets); `CASHFREE_ENVIRONMENT`, `APP_URL`, `ACTIVE_PAYMENT_PROVIDER=cashfree`; `NEXT_PUBLIC_CASHFREE_ENVIRONMENT`. Confirm `REEL_RENDERER_URL` (reels fail rather than mock without it).
- **Frontend:** whichever host serves brain-wise.com must build this commit; the CSP now allows only Cashfree.
- **Unverified in production today:** webhook destinations, secrets present, Paddle live destination (last known: pointing at the site root, not the function), hosting target.

## 4. Cutover and rollback (proposed)
**Order:** (1) deploy indexes and wait until built → (2) set secrets/config → (3) deploy rules → (4) deploy functions: Cashfree callables/webhook and the guarded Paddle trio together → (5) register the production webhook URL in the Cashfree dashboard, send a Cashfree test event, confirm a 200 and an ignored/recorded result → (6) deploy the frontend **together with** the approved legal pages → (7) controlled first purchase by the owner using a small credit pack, verify the grant, then refund it manually and verify the recorded refund.
**Do not** switch the Paddle notification destination or delete Paddle data during cutover; leave Paddle inert for one full billing cycle.
**Rollback triggers:** webhook failures/5xx, a paid order flagged `needsManualReview`, unexpected 400s on legitimate signatures, any grant mismatch.
**Rollback:** (a) frontend: redeploy the previous release (checkout unavailable rather than wrong); (b) functions: roll the Cloud Run revisions back (previous revisions of the deployed functions are retained; record their names before deploying); (c) if Paddle is to take payments again it needs its own go-live (live API key, price IDs and webhook destination were not complete on 2026-10-03), so the realistic fallback is "payments paused", not "Paddle on"; (d) paid-but-ungranted orders are listed in `cashfree_grants` (`status: flagged`) and `transactions` (`pending` with a Cashfree order id) for manual fulfilment or refund.
**Monitoring for the first week:** count of `cashfree_grants` by status (granted vs flagged), `provider_ignored_events` (should be empty except Paddle noise), webhook 4xx/5xx, `transactions` pending older than 1 hour, `expireSubscriptions` run result.

## 5. What is deliberately not part of launch
Automatic renewal / mandates, proration or in-place plan switching, automated refunds that revoke access, a Merchant-of-Record arrangement.
