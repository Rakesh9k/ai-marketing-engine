# Mitra User Guide

This guide describes the currently implemented Mitra experience, verified against the app's source
code (`src/`, `functions/src/`) as it exists today — not a product plan. Where a commonly-expected
feature is not yet implemented, that is stated explicitly rather than omitted silently. See
`docs/DOCUMENTATION_AUDIT_REPORT.md` for how this document was verified.

## 1. What Mitra Does

Mitra turns one product photo and one offer into a complete local marketing campaign — posters,
headlines, ad copy, captions, and a WhatsApp promotion — written in your business's own local style
(currently Hyderabadi Telugu-English, per the source data model's localization fields). It is built
for three business types today: **restaurants, salons, and real estate** (verified in
`src/app/onboarding/page.tsx`, which branches its form fields on exactly these three categories).

## 2. Getting Started

### Creating an Account

Sign-up is by **email and password** only (`src/features/auth/components/SignupForm.tsx` calling
`signupWithEmailPassword`). Mitra's authentication service (`authService.ts`) also contains
`signInWithGoogle` and `signInWithPhone` functions, but neither is called from any page or form in
the app today — **Google Sign-In and phone/OTP sign-in are not currently available in the product
UI**, even though the underlying code exists. Do not expect a "Sign in with Google" button; it isn't
there yet.

### Signing In

Sign in with the email and password you registered with (`LoginForm.tsx`). If you load a page
directly while your session is still being restored, you'll briefly see a loading state rather than
being bounced to the login page — this is deliberate (see `useAuth.ts`'s handling of the "session not
yet restored" case).

### Signing Out

A logout action is available (`authService.ts`'s `logout()`); it ends your Firebase session.

## 3. Onboarding

The onboarding flow (`src/app/onboarding/page.tsx`) is a multi-step form. If you already have an
active business, you skip onboarding entirely and go straight to the dashboard.

Steps (verified from the component's own step-numbering logic):

1. **Business Information** — name, category (restaurant / salon / real estate), description.
2. **Location** — city, state, locality, address.
3. **Contact** — phone and WhatsApp number, plus (for restaurants) dining style (dine-in / takeaway
   / delivery).
4. **Category-specific step** (only for salon and real estate — restaurants skip straight to step 5):
   - **Salon**: your services and packages (name + price each), and how customers should reach you
     (WhatsApp, phone, or in person).
   - **Real Estate**: your property listings (title, type, area, bedrooms/bathrooms, price,
     possession status).
5. **Marketing Preferences** — your content language (English, Telugu, Hindi, or a mixed
   Telugu-English/Hindi-English style), a regional style option, and a content tone/style option.
6. **Review** — confirm everything before your business is created.

Restaurants have 5 total steps; salon and real estate businesses have 6 (the extra category-specific
step).

### Business Brain

Business Brain is Mitra's internal name for the structured business/brand/localization data
collected during onboarding (and editable afterward — Phase 33 added a dedicated edit UI per the
project's phase history). It is what every campaign is generated *and fact-checked* against — see
§7, Truth Check.

## 4. Adding Products and Photos

### Supported Assets

Image uploads are validated server-side (`confirmUpload.ts`'s schema) to be **JPEG, PNG, or WebP,
10 MB or smaller**. Anything else is rejected before it's accepted as a real asset.

### Uploading a Product Photo

Uploading is a two-step process under the hood, though it appears as one action to you: the app
requests a secure, time-limited upload location for your file, your browser uploads the file
directly to that location, and then the app confirms the upload succeeded and records it against
your business. You never need to know this happens — it's mentioned here only so the
troubleshooting section (§10) makes sense if an upload fails partway.

### Product Information

Products/services/properties carry the fields relevant to your business category (price, name,
description, and category-specific fields per §3 above).

### Asset Requirements

- Image formats: JPEG, PNG, WebP only.
- Maximum size: 10 MB per image.
- An uploaded file must belong to your own business — the system verifies this on the server, not
  just in the app (see `docs/SECURITY.md` §Storage Path Ownership if you want the technical detail).

## 5. Creating a Campaign

### Starting a Campaign

You start from a product/offer and a set of campaign inputs.

### Choosing Campaign Inputs

Based on `createCampaign.ts`'s validated schema, a campaign requires: an **offer** (what you're
promoting), a **duration** (campaign window), a target **audience** (with an optional age range), and
a **localization** preference. Some of these are pre-filled from your Business Brain.

### Reviewing Campaign Details

Before generation, you can review and adjust these inputs.

### Truth Check

See §7 below — Truth Check is a mandatory server-side step, not optional.

### Generating the Campaign

Generation is asynchronous: the app shows a progress screen (`GenerationProgress.tsx`) that checks
your campaign's real status every 2.5 seconds until it reaches a finished state (generated, verified,
completed, or failed) — copy on that screen ("this can take up to a minute") reflects the actual
expected wait, not a guess.

## 6. Understanding Campaign Output

A generated campaign includes:

- **Copy** — headlines, ad copy, and captions.
- **Localization** — written in your chosen language/style (§3).
- **Creative** — poster/story/reel image assets. Per the project's Phase 7 record, image generation
  produces one AI-generated hero image per campaign; poster and story variants are then produced by
  compositing your verified campaign facts onto that same image, not by generating a separate AI
  image per format.
- **Call to Action** — a WhatsApp promotion is a supported CTA type in the pipeline.
- **Campaign Assets** — every generated image/asset is stored and downloadable (§8).

## 7. Truth Check

Truth Check is a server-side verification pass (`functions/src/services/ai/truthCheck.ts`) that
checks generated campaign content against your actual Business Brain and product data — not against
what the AI *assumed*. It exists so a campaign can't claim a price, phone number, or offer that
doesn't match what you actually told Mitra.

- **PASS** — every checked fact matched.
- **FAIL** — at least one checked fact (e.g. business name, product price, location, WhatsApp
  number, an unauthorized discount claim) genuinely contradicts your real data. A missing fact is
  never silently treated as passing.
- **REVIEW_REQUIRED** — something couldn't be confidently confirmed either way (e.g. an original
  price wasn't independently verifiable) and needs a human look before you rely on it.

Regeneration (§9) always re-runs Truth Check on the new version — a stale, older verification is
never carried forward onto new content. If a regenerated version comes back FAIL or
REVIEW_REQUIRED, it does **not** replace your existing valid, active version — you keep the last
good one until a regeneration actually passes (verified in `regenerateAsset.ts`, which only swaps
in the new version after a real PASS).

## 8. Downloading Marketing Assets

Once generated, campaign assets are downloadable. Downloaded assets are served via secure,
time-limited signed URLs (7-day expiry, confirmed in `confirmUpload.ts`) rather than permanently
public links.

## 9. Credits and Campaign Limits

### Credits

Credits are Mitra's usage currency (`functions/src/config/pricing.ts`, the actual, current pricing
source): **1 credit = ₹1** of underlying cost basis. A full campaign generation costs **100
credits** as its base price (more if extra images or a premium model are used, capped at a maximum
of 300 credits per campaign). Regenerating one asset costs **10 credits**; generating one additional
image costs **20 credits**. Creating a Reel costs **80 credits**.

Credit reservation, spending, and refunds are handled entirely on the server — the app's displayed
balance reflects what the server has recorded, not a number the browser calculates on its own (see
`docs/SECURITY.md` §Credits for why this matters).

### Campaign Usage

If a generation fails before completing, the reservation for that attempt is refunded rather than
silently spent — this is a tested, explicit behavior of the credit system
(`functions/src/services/usageControl.ts`'s `refundReservation`), not an assumption.

### Free Plan

The **Free** plan includes 100 credits per month, at ₹0 — enough for exactly one base campaign
generation per month at current pricing.

### Paid Plans

| Plan | Monthly Credits | Price |
|---|---|---|
| Starter | 500 | ₹499 |
| Business | 1,200 | ₹999 |
| Agency | 3,000 | ₹2,499 |

(Source: `PRICING.subscriptionTiers` in `functions/src/config/pricing.ts` — current as of this
document's verification, but pricing can change; this table is not a contractual guarantee.)

### Top-ups

One-time credit top-up packs are available: 500 credits for ₹499, 1,200 credits for ₹999, and 3,000
credits for ₹1,999 (`PRICING.topUpPacks`).

## 10. Billing and Payments

Billing is handled through Razorpay. When you upgrade a plan or buy a top-up, the app opens
Razorpay's own checkout; after you pay, the app asks the server to verify the payment before
updating what you see. **Credits themselves are only ever granted by Mitra's server after Razorpay
independently confirms the payment via its webhook** — the checkout screen updating is a UI
convenience, not what actually grants your credits (verified directly in `billing/page.tsx`'s own
comment and `verifyPayment.ts`'s behavior). This matters mainly so you understand why a credit
balance update can occasionally lag a few seconds behind a successful payment screen.

**Production payment verification: NOT INDEPENDENTLY VERIFIED in this documentation pass.** The
publicly configured Razorpay key was recorded elsewhere in this project's history as a **test-mode**
key (`rzp_test_...`), not a live production key — see `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md`.
Do not assume real payments are being processed in every deployed environment without checking the
current configuration first.

## 11. Regenerating Content

If you're not happy with a specific generated asset, you can regenerate it individually rather than
regenerating the whole campaign. Regeneration costs 10 credits (§9) and always re-runs Truth Check
(§7) before the new version can become your active version.

## 12. Localization

Mitra generates content in your chosen language setting from onboarding (English, Telugu, Hindi, or
a mixed Telugu-English/Hindi-English style) plus a regional style preference. This is configured
once during onboarding and can be changed by editing your Business Brain afterward.

## 13. Agency Mode

**Partially implemented, no dedicated UI.** The backend has real, tested authorization for an
"agency member" role that can be granted access to a specific client business it's assigned to (and
is correctly denied access to a business belonging to a *different* agency — this exact scenario is
covered by an automated test using a real Firestore emulator). However, there is currently **no
separate agency workspace screen** in the app — an agency member uses the same business-scoped pages
as any other user, for whichever client business they've been granted access to. If you're looking
for a multi-client agency dashboard, it does not exist yet.

## 14. Current Limitations

Verified against the current implementation (no `docs/MVP_SCOPE.md` exists in this repository to
cross-check against, so this list is derived from what the code does and does not do, plus the
project's own phase history in `README.md`):

- **No dedicated agency workspace UI** (§13).
- **No WhatsApp Business API integration** — "WhatsApp CTA" in a generated campaign means content
  designed to open a WhatsApp chat draft; Mitra cannot see whether that chat was ever actually sent
  or replied to (confirmed in `docs/PERFORMANCE_DATA_READINESS.md`: the `inquiries` metric is
  permanently null because no such integration exists).
- **No content calendar / scheduling feature.**
- **No social-network posting integration** (Instagram/Facebook auto-post, etc.) was found anywhere
  in the source.
- **No Google or phone/OTP sign-in in the UI**, despite the service-layer code existing (§2).
- **No learning/optimization engine** — campaign performance data (WhatsApp clicks) is tracked and
  displayed, but nothing in the codebase currently uses it to automatically improve future campaigns
  (`docs/PERFORMANCE_ENGINE.md`: explicitly "DATA NOT YET SUFFICIENT").

## 15. Troubleshooting

| Problem | What happened | What to check | What you can do |
|---|---|---|---|
| **Can't sign in** | Wrong email/password, or your session hasn't finished restoring yet on page load | Double-check your credentials; if a page seems stuck loading right after opening it, wait a moment before assuming it failed | Try again after a few seconds; use "forgot password" if you're sure the credentials are right |
| **Upload failed** | The file may be the wrong format/too large, or the upload didn't reach the server before confirmation | Confirm the file is JPEG/PNG/WebP and under 10 MB | Re-select the file and try again |
| **Campaign can't be generated** | A required input is missing, or the request was rejected before reaching the AI pipeline | Check that all required campaign fields are filled in | Review the campaign form for validation messages |
| **Insufficient credits** | Your account's server-recorded credit balance is below what this action costs | Check your current plan/credits on the Billing page | Wait for your next monthly credit refresh, or buy a top-up/upgrade your plan |
| **Campaign generation failed partway** | An internal error occurred during generation | — | Your credits for that attempt are refunded automatically (§9) — you can retry without being charged twice |
| **Asset unavailable / broken image** | A download link may have expired, or (see `docs/PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md`'s Closure Validation) a currently-known production defect exists in how the app serves optimized images on some deployments | — | Try reloading the page; if the problem persists, this may be a known backend issue rather than something on your end |
| **Payment issue** | A Razorpay payment didn't complete, or your credits haven't updated yet | Check whether Razorpay showed a successful payment | Credits are granted once Razorpay's server confirms the payment, which can lag a few seconds behind the checkout screen — wait briefly before assuming it failed |
| **Session expired / logged out unexpectedly** | Your Firebase session ended | — | Sign in again |
| **Permission denied on a business/campaign** | You're trying to access a business or campaign your account isn't authorized for | Confirm you're signed into the correct account | This is enforced by the server and is not adjustable from the client |

This document does not include a support contact — none is defined in this repository at the time
of writing.
