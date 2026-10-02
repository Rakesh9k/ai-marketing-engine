# API Reference — Firebase Callable Functions

This is the canonical inventory of Mitra's backend API surface. It exists because no such
inventory existed before this document — the closest prior source was reading `functions/src/index.ts`
directly. Every function below was confirmed to exist by reading its export in
`functions/src/index.ts` and its `onCall`/`onRequest` registration in its own file (not inferred
from naming).

**Do not treat this table's Input/Output columns as a full schema reproduction.** Every callable
validates its input with a Zod schema defined in its own source file; this document names that
schema and points to its file/line rather than re-typing every field, so this document cannot go
stale relative to the schema the way a hand-copied payload example would. Read the linked file for
the authoritative, current field list.

## How every callable is protected (verified, not assumed)

Confirmed by `grep enforceAppCheck` across `functions/src/functions/**` (see
`docs/DOCUMENTATION_AUDIT_REPORT.md` §API Documentation for the exact command/result): **all 33
`onCall` functions** register with `{ region: 'asia-south1', enforceAppCheck: true, ... }`. None
were found with `enforceAppCheck: false` or omitted. This means every callable below requires:

1. A valid Firebase Auth ID token (`context.userId` populated by `validatedCallable`/`verifyAuth`).
2. A valid Firebase App Check token (reCAPTCHA Enterprise on the client — see
   `docs/PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md` §6).
3. Zod input validation via `validatedCallable(schema, handler)` (`functions/src/middleware/validation.ts`) —
   a request that fails schema validation never reaches the handler.

Two exceptions, by design, not oversight:

- `healthCheck` (`functions/src/functions/healthCheck.ts`) — a public liveness endpoint, intentionally
  reachable without auth/App Check (confirmed reachable without App Check in
  `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` §7, noted there as "likely intentional,
  not investigated" — flagged again here as a documented, not silently discovered, exception).
- `razorpayWebhook` (`onRequest`, not `onCall`) — authenticated by Razorpay's HMAC webhook signature
  (`verifyWebhookSignature`), not by Firebase Auth/App Check, because the caller is Razorpay's
  servers, not a signed-in user. See §Webhooks below.
- `onUserCreatedHandler` / `onUserDeletedHandler` — Firebase Auth _triggers_ (not callables), invoked
  by Firebase itself on account creation/deletion; App Check does not apply to triggers.

Authorization (which business/campaign/product a caller may act on) is a separate layer on top of
authentication, enforced per-function by `verifyBusinessAccess`/`verifyAuthAndBusinessAccess`
(`functions/src/middleware/auth.ts`) — see individual function rows for which check applies.

## Rate limiting

Confirmed present (via `functions/src/middleware/rateLimit.ts`, imported by grep) in: `getUploadUrl`,
`confirmUpload`, `createCampaign`, `generateCampaignStrategy`, `regenerateAsset`,
`createReelProject`, `getReelClipUploadUrl`, `confirmReelClipUpload`, `generateReel`,
`createSubscription`, `verifyPayment`. These are the credit-consuming, AI-triggering, or
payment-triggering operations — i.e., the ones where abuse has a direct cost. Exact quota numbers,
window sizes, and `Retry-After` behavior are implementation details of `rateLimit.ts` and its own
tests (`functions/src/middleware/rateLimit.test.ts`, `rateLimit.failSafe.test.ts`) — this document
intentionally does not restate specific limit values here, because doing so risks silently going
stale the next time those values are tuned (`docs/PHASE_38_RATE_LIMIT_PRECISION_AUDIT_REPORT.md` and
`docs/PHASE_38B_RATE_LIMIT_FOLLOWUP_REPORT.md` are the current, evidence-based source for the actual
tuned values, and are themselves subject to change).

## Errors — what every callable can throw

`validatedCallable` and each handler funnel errors through `mapErrorToHttpsError`
(`functions/src/utils/errors.ts`), which maps internal errors to Firebase's standard `HttpsError`
codes. Common codes seen across the functions read for this audit:

| Code                  | Meaning                                                                                | Client-facing translation                                        | Retry?                  |
| --------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------- |
| `unauthenticated`     | No/invalid Firebase Auth token                                                         | "Please sign in again."                                          | Yes, after re-auth      |
| `permission-denied`   | Authenticated, but not authorized for this business/campaign/agency                    | "You don't have access to this."                                 | No                      |
| `not-found`           | Referenced business/campaign/product doesn't exist                                     | "This item couldn't be found."                                   | No                      |
| `invalid-argument`    | Zod schema validation failed                                                           | "Please check the form and try again."                           | Yes, after fixing input |
| `resource-exhausted`  | Rate limit hit (see §Rate limiting)                                                    | "You've reached the current limit. Please wait and try again."   | Yes, after the window   |
| `failed-precondition` | e.g. insufficient credits, Truth Check not in the right state for the requested action | Operation-specific — see the calling feature's own error message | Depends                 |
| `internal`            | Unexpected server/provider error                                                       | "Something went wrong. Please try again."                        | Yes, generally          |

Stack traces and provider-internal error detail are logged server-side
(`logFunctionError`/`utils/logging.ts`) and never returned to the client — confirmed by
`mapErrorToHttpsError` returning a fixed, redacted message set, not the raw error.

## Canonical Function Inventory

| Function                   | Type                        | Domain         | Purpose                                                                                                                                         | Source                                                          |
| -------------------------- | --------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `healthCheck`              | `onCall`, no auth/App Check | Ops            | Liveness check                                                                                                                                  | `functions/src/functions/healthCheck.ts`                        |
| `createBusiness`           | `onCall`                    | Business       | Create a business (any vertical) and its Business Brain                                                                                         | `functions/src/functions/business/createBusiness.ts`            |
| `getBusiness`              | `onCall`                    | Business       | Fetch one business, authorization-checked                                                                                                       | `functions/src/functions/business/getBusiness.ts`               |
| `listBusinesses`           | `onCall`                    | Business       | List businesses the caller owns/has agency access to                                                                                            | `functions/src/functions/business/listBusinesses.ts`            |
| `updateBusiness`           | `onCall`                    | Business       | Update business profile/contact/location fields                                                                                                 | `functions/src/functions/business/updateBusiness.ts`            |
| `updateBusinessBrain`      | `onCall`                    | Business Brain | Update brand/localization/business-rules/vertical-profile data                                                                                  | `functions/src/functions/business/updateBusinessBrain.ts`       |
| `createBrandKit`           | `onCall`                    | Brand Kit      | Create a business's brand kit (colors/fonts)                                                                                                    | `functions/src/functions/brandKit/createBrandKit.ts`            |
| `getBrandKit`              | `onCall`                    | Brand Kit      | Fetch a business's brand kit                                                                                                                    | `functions/src/functions/brandKit/getBrandKit.ts`               |
| `updateBrandKit`           | `onCall`                    | Brand Kit      | Update a business's brand kit                                                                                                                   | `functions/src/functions/brandKit/updateBrandKit.ts`            |
| `createProduct`            | `onCall`                    | Products       | Create a product/service/property (vertical-aware)                                                                                              | `functions/src/functions/products/createProduct.ts`             |
| `listProducts`             | `onCall`                    | Products       | List a business's products                                                                                                                      | `functions/src/functions/products/listProducts.ts`              |
| `getProduct`               | `onCall`                    | Products       | Fetch one product                                                                                                                               | `functions/src/functions/products/getProduct.ts`                |
| `updateProduct`            | `onCall`                    | Products       | Update a product                                                                                                                                | `functions/src/functions/products/updateProduct.ts`             |
| `archiveProduct`           | `onCall`                    | Products       | Soft-delete (archive) a product                                                                                                                 | `functions/src/functions/products/archiveProduct.ts`            |
| `getUploadUrl`             | `onCall`, rate-limited      | Assets         | Mint a signed Storage upload URL for a product/asset image                                                                                      | `functions/src/functions/assets/getUploadUrl.ts`                |
| `confirmUpload`            | `onCall`, rate-limited      | Assets         | Confirm/validate an upload after the client PUTs to the signed URL                                                                              | `functions/src/functions/assets/confirmUpload.ts`               |
| `createCampaign`           | `onCall`, rate-limited      | Campaigns      | Create a campaign draft from an offer/product                                                                                                   | `functions/src/functions/campaigns/createCampaign.ts`           |
| `generateCampaignStrategy` | `onCall`, rate-limited      | Campaigns / AI | Run the AI pipeline (strategy → copy → creatives → Truth Check) for a campaign                                                                  | `functions/src/functions/campaigns/generateCampaignStrategy.ts` |
| `getCampaign`              | `onCall`                    | Campaigns      | Fetch one campaign, including live Truth Check staleness check                                                                                  | `functions/src/functions/campaigns/getCampaign.ts`              |
| `listCampaigns`            | `onCall`                    | Campaigns      | List a business's campaigns                                                                                                                     | `functions/src/functions/campaigns/listCampaigns.ts`            |
| `updateCampaign`           | `onCall`                    | Campaigns      | Update campaign fields (pre-generation)                                                                                                         | `functions/src/functions/campaigns/updateCampaign.ts`           |
| `updateCampaignStatus`     | `onCall`                    | Campaigns      | Transition a campaign's status (e.g. approve/reject)                                                                                            | `functions/src/functions/campaigns/updateCampaignStatus.ts`     |
| `regenerateAsset`          | `onCall`, rate-limited      | Campaigns / AI | Regenerate one creative asset; re-runs Truth Check on the regenerated output                                                                    | `functions/src/functions/campaigns/regenerateAsset.ts`          |
| `createReelProject`        | `onCall`, rate-limited      | Reels          | Start a new Reel project                                                                                                                        | `functions/src/functions/reels/createReelProject.ts`            |
| `getReelClipUploadUrl`     | `onCall`, rate-limited      | Reels          | Mint a signed Storage upload URL for a Reel clip                                                                                                | `functions/src/functions/reels/getReelClipUploadUrl.ts`         |
| `confirmReelClipUpload`    | `onCall`, rate-limited      | Reels          | Confirm/validate an uploaded Reel clip                                                                                                          | `functions/src/functions/reels/confirmReelClipUpload.ts`        |
| `generateReel`             | `onCall`, rate-limited      | Reels / AI     | Trigger the Reel rendering pipeline                                                                                                             | `functions/src/functions/reels/generateReel.ts`                 |
| `getReel`                  | `onCall`                    | Reels          | Fetch one Reel project's status/output                                                                                                          | `functions/src/functions/reels/getReel.ts`                      |
| `listReels`                | `onCall`                    | Reels          | List a business's Reel projects                                                                                                                 | `functions/src/functions/reels/listReels.ts`                    |
| `createSubscription`       | `onCall`, rate-limited      | Billing        | Create a Razorpay subscription                                                                                                                  | `functions/src/functions/subscriptions/createSubscription.ts`   |
| `verifyPayment`            | `onCall`, rate-limited      | Billing        | Server-side verification of a Razorpay payment/signature                                                                                        | `functions/src/functions/subscriptions/verifyPayment.ts`        |
| `trackAnalyticsEvent`      | `onCall`                    | Analytics      | Record a business-scoped analytics event                                                                                                        | `functions/src/functions/analytics/trackAnalyticsEvent.ts`      |
| `getAnalyticsDashboard`    | `onCall`                    | Analytics      | Aggregate `analytics_events` into dashboard totals/daily activity (see §8 of the Performance Optimization report for a recent latency fix here) | `functions/src/functions/analytics/getAnalyticsDashboard.ts`    |
| `recordWhatsAppClick`      | `onCall`                    | Analytics      | Idempotently record a WhatsApp CTA click against `campaign_performance`                                                                         | `functions/src/functions/analytics/recordWhatsAppClick.ts`      |
| `getCampaignPerformance`   | `onCall`                    | Analytics      | Fetch a campaign's performance aggregate                                                                                                        | `functions/src/functions/analytics/getCampaignPerformance.ts`   |
| `generateMarketingPlan`    | `onCall`, usage-controlled  | Calendar       | Generate low-cost 30-day marketing plan via TextAI (10 credits)                                                                                 | `functions/src/functions/calendar/generateMarketingPlan.ts`     |
| `getMarketingPlan`         | `onCall`                    | Calendar       | Fetch active 30-day plan and calendar items                                                                                                     | `functions/src/functions/calendar/getMarketingPlan.ts`          |
| `updateCalendarItem`       | `onCall`                    | Calendar       | Update calendar item topic, hook, CTA, suggested date/time, or status                                                                           | `functions/src/functions/calendar/updateCalendarItem.ts`        |
| `skipCalendarItem`         | `onCall`                    | Calendar       | Mark a calendar item status as skipped                                                                                                          | `functions/src/functions/calendar/skipCalendarItem.ts`          |
| `razorpayWebhook`          | `onRequest`, HMAC-signed    | Billing        | Razorpay server-to-server payment/subscription event delivery                                                                                   | `functions/src/functions/webhooks/razorpayWebhook.ts`           |
| `onUserCreatedHandler`     | Auth trigger                | Auth           | Post-signup bootstrap (custom claims, initial docs)                                                                                             | `functions/src/functions/auth/onUserCreated.ts`                 |
| `onUserDeletedHandler`     | Auth trigger                | Auth           | Post-deletion cleanup                                                                                                                           | `functions/src/functions/auth/onUserCreated.ts`                 |

34 `onCall` functions + 1 `onRequest` webhook + 2 Auth triggers = 37 total exports, matching the
count in `functions/src/index.ts` and the "37 live" figure in
`docs/PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md` §1 (that count includes the 2 Auth triggers
separately, consistent with this inventory).

## Credits, Truth Check, and Payments — pointers, not restatements

This document deliberately does not restate the credit-reservation state machine, Truth Check
verdict semantics, or Razorpay verification flow in full — each already has an authoritative,
evidence-based writeup, and duplicating them here would create a second copy that can drift out of
sync:

- **Credits**: server-authoritative reservation/finalization/refund — see
  `docs/PHASE_10_CREDITS_PAYMENT_INTEGRITY_REPORT.md` and `functions/src/services/usageControl.ts`.
  The client never computes or trusts its own credit balance as authoritative.
- **Truth Check**: `PASS` / `FAIL` / `REVIEW_REQUIRED`, server-computed, re-run on every regeneration
  — see `docs/PHASE_6_TRUTH_CHECK_REPORT.md` and `functions/src/services/ai/truthCheck.ts`. A failed
  regenerated version cannot replace a valid active version (enforced in `regenerateAsset.ts`).
- **Payments**: Razorpay checkout → server `verifyPayment` (signature-checked) → webhook
  (HMAC-checked, idempotent) → credit entitlement — see `docs/PHASE_19A_PRODUCTION_BLOCKER_FIXES_REPORT.md`
  and `functions/src/services/razorpay.ts`. `NEXT_PUBLIC_RAZORPAY_KEY_ID` currently configured as
  `rzp_test_...` (test mode) per `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` §6 — **not**
  live production credentials; do not treat test-mode configuration as production-ready without
  re-verifying the deployed environment.
