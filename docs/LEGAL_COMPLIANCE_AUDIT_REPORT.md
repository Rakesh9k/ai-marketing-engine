# Legal & Compliance Audit Report

**This pass:** 2026-09-22 — forensic audit only, per an explicit audit/implementation-gate/
implementation/verification protocol. **No application code, rules, configuration, legal-page
content, database schema, or infrastructure was modified during this pass.** This document is the
sole write performed. All findings below were re-verified against current source this session
(commands and file:line evidence recorded inline), not carried over from memory without checking.

Two prior sessions already did substantive work here: an initial audit that found `/terms` and
`/privacy` entirely missing and built them honestly (no fabricated legal facts), and a remediation
pass that added `/refund`, `/cancellation`, `/contact`, `/support`, self-service subscription
cancellation, self-service account deletion, and signup consent recording. This audit verifies that
work is still intact, unchanged, and accurately described, and extends the audit into the additional
areas this protocol requires (Business Brain data flow, content ownership, security cross-check,
gated implementation queue) that were not previously produced in this exact structure.

```
AUDIT STATUS: COMPLETE
IMPLEMENTATION STATUS: NOT STARTED (this pass)
```

"Complete" means the system has been investigated end to end against this protocol's scope — it does
**not** mean the system is legally compliant. See "Final Audit Verdict" at the end.

## Scope

Legal routes, Terms of Service, Privacy Policy, consent/acceptance, account deletion, data
retention, refunds, cancellation, billing/credit consistency, AI data processing, Business Brain
data flow, content ownership, Instagram/social-media capability truthfulness, Reel pipeline,
support/grievance contacts, business registration, trademark, India DPDP posture,
tracking/logging, third-party processors, and a security cross-check limited to legal/privacy
dependencies (not a full re-audit of security itself).

## Evidence Reviewed

- `src/app/{terms,privacy,refund,cancellation,contact,support}/page.tsx` (read in full, current state)
- `src/features/auth/components/{SignupForm.tsx,AuthLayout.tsx}`, `src/features/landing/components/LandingFooter.tsx`
- `src/app/billing/page.tsx`
- `functions/src/functions/subscriptions/{createSubscription.ts,verifyPayment.ts,cancelSubscription.ts}`
- `functions/src/functions/auth/{onUserCreated.ts,requestAccountDeletion.ts,recordConsentAcceptance.ts}`
- `functions/src/functions/campaigns/createCampaign.ts`, `functions/src/services/firestore.ts`
- `functions/src/services/razorpay.ts`, `functions/src/functions/webhooks/razorpayWebhook.ts`
- `functions/src/config/{legal.ts,pricing.ts}`, `functions/src/services/usageControl.ts`
- `functions/src/services/ai/{index.ts,pipeline.ts,image.ts,text.ts}`, `functions/src/config/modelRouting.ts`
- `firestore.rules`
- Repo-wide `grep` for retention/TTL/scheduler evidence, refund-API evidence, Instagram/Meta Graph
  API evidence, business-registration identifiers (CIN/GSTIN/PAN/LLPIN), trademark evidence,
  tracking/analytics SDKs
- Live HTTPS check of `https://www.brain-wise.com/{terms,privacy,refund,cancellation,contact,support}`
- `git status --short`, `git log -1 --oneline` (initial state capture)
- This session's own prior, broader production-readiness audit output
  (`docs/PRODUCTION_READINESS_AUDIT_REPORT.md`, `docs/PRODUCTION_BILLING_CREDIT_AUDIT.md`,
  `docs/PRODUCTION_CONTENT_CAPABILITY_MATRIX.md`) — reused as corroborating evidence where it
  overlaps, re-verified rather than trusted blindly (see specific re-verification commands below)

## Legal Route Matrix

| Route | Exists | Publicly accessible | Linked (signup/login) | Linked (footer) | Linked (billing) | Content exists | Reflects actual implementation | Unresolved placeholders | Production verified |
|---|---|---|---|---|---|---|---|---|---|
| `/terms` | Yes | Yes (code) | Yes — `AuthLayout.tsx` | Yes | No | Yes | Yes | Yes — entity name, refund policy, governing law explicitly marked "founder decision required" | **No — HTTP 404** |
| `/privacy` | Yes | Yes (code) | Yes — `AuthLayout.tsx` | Yes | Yes — `Danger zone` references it | Yes | Yes | Yes — retention periods, dedicated grievance contact, re-acceptance policy marked "founder decision required" | **No — HTTP 404** |
| `/refund` | Yes | Yes (code) | No | Yes | No (linked from `/terms`, `/cancellation`, `/support`) | Yes | Yes | Yes — no refund policy decided, states this honestly | **No — HTTP 404** |
| `/cancellation` | Yes | Yes (code) | No | Yes | No | Yes | Yes | Yes — post-cancellation credit fate marked "founder decision required" | **No — HTTP 404** |
| `/contact` | Yes | Yes (code) | No | Yes | No | Yes | Yes | Yes — whether dedicated billing/privacy addresses should exist is "founder decision" | **No — HTTP 404** |
| `/support` | Yes | Yes (code) | No | Yes | No | Yes | Yes | Yes — no SLA published, stated as such | **No — HTTP 404** |

Verified this session: `curl -o /dev/null -w "%{http_code}" https://www.brain-wise.com/<route>` for
all six routes returned `404` for every one. `www.brain-wise.com` itself is confirmed live and
serving the real production Next.js build (per this session's earlier production-readiness audit),
so the blocker is **deployment lag**, not domain unavailability — none of the code described in this
report has been deployed to production yet.

## Terms Audit

Content, verified by reading the current file in full:

- **Product description** (§2): accurately describes Business Brain, AI-generated copy/images via
  Gemini and OpenAI, credits, Razorpay billing, WhatsApp sharing. Matches the actual implementation
  traced in `functions/src/services/ai/`.
- **Truth Check** (§3): described as "a best-effort automated check, not a legal, factual, or
  regulatory guarantee." This session's earlier, separate production audit found that Truth Check's
  FAIL result does **not** currently block asset download on the initial-generation path (only
  regeneration is fail-closed) — see `docs/PRODUCTION_READINESS_AUDIT_REPORT.md`. The Terms wording
  is consistent with this reality (it never claims Truth Check gates output), so there is no
  overclaim here, but this is a relevant cross-reference for whoever prioritizes fixes: the technical
  gap and the legal wording happen to already be aligned, not because the gap was fixed but because
  the Terms were written cautiously.
- **AI limitations** (§4): explicitly disclaims guaranteed accuracy, performance, conversions,
  engagement, legal approval, and copyright guarantees. No unsupported claim found.
- **User content / responsibilities** (§5-6): user retains upload ownership, grants a processing
  license, is responsible for lawful use and reviewing generated output. Matches actual behavior —
  no enforced content-moderation/rights-check exists in code, and the Terms do not claim one does.
- **Billing** (§7): now accurately describes self-service cancellation (verified present — see
  Cancellation Audit) instead of the prior "no self-service exists" language. Refund policy and
  credit-expiry remain explicitly flagged as undecided, not invented.
- **Suspension/termination** (§8): now accurately describes self-service account deletion (verified
  present — see Account Deletion Audit) instead of "handled manually via email."
- **Governing law** (§10): explicitly marked "founder decision required, legal counsel recommended" —
  no jurisdiction is stated.

No instance found of the Terms implying guaranteed accuracy, guaranteed business results, guaranteed
platform approval, or guaranteed copyright ownership.

## Privacy Audit

Data inventory (from `/privacy` §2, cross-checked against the code that actually produces each row):

| Data | Purpose | Collection point | Storage | External processor | Retention | Deletion | User control |
|---|---|---|---|---|---|---|---|
| Email, Firebase UID | Auth/identity | Signup | Firebase Auth | Firebase/GCP | Not defined | Via self-service account deletion | Yes (delete) |
| Business name/category/location/offers/brand | Personalize generation | Onboarding/Business Brain | Firestore | Firebase/GCP | Not defined | Archived (not purged) on account deletion | Partial |
| Product photos/logos/generated assets | Generate campaigns | Upload/generation | Firebase Storage | Firebase/GCP, Gemini (vision), OpenAI (image gen) | Not defined | **Not deleted** by self-service deletion | No self-service purge |
| Credit usage, campaign/download events | Enforce limits, usage history | App usage | Firestore | Firebase/GCP | Not defined | **Not deleted** | No self-service purge |
| Subscription/payment status, transaction records | Grant credits, billing history | Billing | Firestore (metadata only — card/bank details go directly to Razorpay) | Firebase/GCP, Razorpay | Not defined; likely retained for legal/tax purposes (stated as such, not quantified) | **Not deleted** | No self-service purge |
| Error diagnostics | Debugging | Runtime | Sentry (code integrated) | Sentry | N/A — not actively provisioned (no DSN found in this session's re-check of env config) | N/A | N/A |
| Theme preference | Display preference | Browser | `localStorage` only | None — never sent to server | Browser-controlled | Browser-controlled | Full |

This table's "Retention" and "Deletion" columns are drawn from the Account Deletion and Retention
Audits below, not invented for this table.

## Consent Audit

**IMPLEMENTED.** Re-verified this session via direct code read:

- `src/features/auth/components/SignupForm.tsx`: a required checkbox (`termsAccepted` state,
  `line 29`) blocks form submission (`line 59` checks it before calling
  `signupWithEmailPassword`) and links to `/terms` and `/privacy`.
- On successful signup, the form calls the `recordConsentAcceptance` Cloud Function (`line 74`).
- `functions/src/functions/auth/recordConsentAcceptance.ts`: writes `termsVersion`,
  `termsAcceptedAt`, `privacyVersion`, `privacyAcceptedAt` onto `users/{uid}` via a **merge-only**
  write. The version values come from `functions/src/config/legal.ts`'s
  `CURRENT_TERMS_VERSION`/`CURRENT_PRIVACY_VERSION` constants — server-side, not client-supplied —
  and the timestamp is `FieldValue.serverTimestamp()`, never a client `Date`.
- **Not implemented:** a re-acceptance gate for existing users after a future policy-version bump.
  No code checks a logged-in user's stored `termsVersion` against the current constant and blocks
  further use on mismatch. This is a real, currently-open gap, not fixed by the consent-recording
  feature.

**Status: IMPLEMENTED** (initial acceptance) / **NOT IMPLEMENTED** (re-acceptance after changes).

## Account Deletion Audit

**IMPLEMENTED, deliberately partial.** `functions/src/functions/auth/requestAccountDeletion.ts`,
re-read this session:

1. Requires the caller's ID token `auth_time` claim to be within 15 minutes (`RECENT_AUTH_WINDOW_SECONDS`),
   rejecting with `failed-precondition` otherwise — a server-verifiable recent-authentication check.
2. Writes a server-timestamped audit record to `accountDeletionRequests/{userId}` before and after
   the destructive step.
3. Calls `admin.auth().deleteUser(userId)`, which fires the pre-existing `onUserDeletedHandler`
   trigger (`functions/src/functions/auth/onUserCreated.ts`, `line 145` onward) — this handler
   **archives** (does not delete) the caller's `businesses/*` documents and sets
   `users/{uid}.deletedAt`.

**What is NOT deleted or cascaded** (confirmed by absence of any reference to these collections in
either `requestAccountDeletion.ts` or `onUserDeletedHandler`): campaign documents, campaign asset
documents, generated content, Cloud Storage objects, usage/credit history documents, and
transaction/billing records. This is a **soft/partial deletion**: the login is hard-deleted, business
records are archived (soft), and most other user-generated data is untouched.

**Status: IMPLEMENTED (Auth login + business archival) / NOT IMPLEMENTED (full data cascade)**.
This is documented, not hidden — `/privacy` §6 states exactly this scope, and
`docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` records that a full cascade needs a retention-period
decision first.

## Retention Audit

Re-run this session: `grep -rniE "expiresAt|deleteAfter|\bTTL\b|scheduled deletion|onSchedule|Cloud
Scheduler|storage lifecycle" functions/src src`, excluding test files. Results: two `expiresAt`
fields (signed-upload-URL expiry, 15-30 minutes — not data retention), and `ttl`/`ttlSeconds` inside
`functions/src/middleware/idempotency.ts` (an idempotency-key expiry, also not data retention). **No
Cloud Scheduler job, `onSchedule` function, Firestore TTL policy field, or Storage lifecycle rule
exists anywhere in the codebase.**

`/privacy` §7 states a retention policy has not been finalized — this is **DOCUMENTED, NOT
TECHNICALLY ENFORCED**, and the document does not claim otherwise.

**Status: NEITHER** (per this protocol's classification: not both documented-and-enforced) —
correctly, only documented as undecided.

## Refund Audit

Re-run this session: `grep -rniE "refund" functions/src/services/razorpay.ts
functions/src/functions/webhooks/razorpayWebhook.ts`. The only hit is a comment in
`cancelRazorpaySubscription`'s docstring explicitly noting "no refund policy has been decided" — no
call to Razorpay's refund API (`payments.refund()` or equivalent) exists anywhere in the codebase.
`razorpayWebhook.ts`'s event-type switch (re-checked this session) has no case for `refund.created`,
`refund.processed`, or `payment.dispute.*` — these fall through to an unhandled-event log line with
no credit clawback.

Separately, and not to be confused with a monetary refund: `functions/src/services/usageControl.ts`'s
`refundReservation` releases **credits** (not money) back to a user's balance when an AI generation
fails after credits were reserved — this is a real, working, unconditional technical behavior,
distinct from a payment refund. `/refund` §3 states this distinction explicitly.

**Status: NOT IMPLEMENTED (monetary refund) / IMPLEMENTED (credit-release-on-generation-failure,
a different thing)**. `FOUNDER DECISION REQUIRED` on refund policy (eligibility, window, full vs.
partial) before any refund automation could be built — correctly not invented.

## Cancellation Audit

Five distinct meanings, checked separately per this protocol's own framing:

| Meaning | Status | Evidence |
|---|---|---|
| Subscription cancellation (stop future renewal) | **IMPLEMENTED** | `functions/src/functions/subscriptions/cancelSubscription.ts` calls Razorpay `subscriptions.cancel(id, cancel_at_cycle_end=true)`; Billing page has a "Cancel subscription" button |
| Subscription renewal cancellation | Same as above — this is what "cancel at cycle end" means technically | Same |
| Payment cancellation (mid-transaction) | NOT APPLICABLE — Razorpay Checkout's own modal handles payment abandonment; no Mitra-side code needed or found | `src/app/billing/page.tsx`'s `modal: { ondismiss: ... }` resets local UI state only |
| Campaign cancellation (stop an in-progress campaign) | NOT IMPLEMENTED — no "cancel this campaign generation" callable or button found | Repo-wide check found no such code |
| AI-generation cancellation (abort a running AI call) | NOT IMPLEMENTED — generation runs to completion or failure; no abort path | Consistent with `functions/src/services/ai/pipeline.ts`'s synchronous execution model |
| Account deletion | Separate capability — see Account Deletion Audit | — |

**Status: IMPLEMENTED (subscription cancellation only)**. The other meanings are either not
applicable to this architecture or genuinely absent — neither was fabricated as "implemented" in any
public-facing page; `/cancellation` §1 explicitly scopes itself to subscription cancellation.

## Billing/Credit Audit

Re-verified this session via direct file read:

- `functions/src/functions/campaigns/generateCampaignStrategy.ts`, `regenerateAsset.ts`,
  `functions/src/functions/reels/generateReel.ts`: all three route through
  `executeWithUsageControl` (check → reserve → execute AI → finalize/refund), server-side cost from
  `getGenerationCost()`, idempotent under concurrency (in-transaction check, per this session's
  earlier audit). No drift found.
- **`functions/src/functions/campaigns/createCampaign.ts`** (re-checked this session,
  `grep -n "confirmCredits\|refundCredits\|reserveCredits"`): still calls the legacy
  `reserveCredits()` (`firestore.ts:459`) at line 119, and **still never calls** `confirmCredits`
  or `refundCredits` — both remain dead code with zero call sites elsewhere in the repo. This
  callable is exported live in `functions/src/index.ts` and reachable by any authenticated client,
  though not called by the current shipped frontend. **This is an existing, unfixed billing defect**
  (every invocation permanently burns the caller's credits with no recovery path) — first identified
  in this session's earlier, separate production-readiness audit and confirmed still present, unchanged, here.
- `cancelSubscription.ts` does not touch credits at all — confirmed by reading the file; it only
  flips `cancelAtPeriodEnd`. What happens to unused credits after the period ends is undecided (see
  Founder Decisions).
- Plan-tier feature enforcement: re-confirmed absent. `checkGenerationEligibility` in
  `usageControl.ts` checks only `creditsAvailable >= creditsRequired` — no plan-tier/feature gate
  exists, so a Free-plan user with sufficient credits can invoke Business/Agency-scoped operations.
  This is a billing-*adjacent* legal-consistency question: `/terms` §7 does not claim tier-based
  feature restriction exists, so there is no legal misstatement, but the pricing page's advertised
  per-plan feature list (business count limits, watermarking, Brand Kit access) is not technically
  enforced — a product-accuracy gap flagged in this session's earlier production audit, restated
  here because it touches billing/legal consistency directly.

**Status: IMPLEMENTED AND SOUND** for the three live generation paths; **BROKEN** (unfixed) for
`createCampaign`; **NOT IMPLEMENTED** for plan-tier feature enforcement.

## AI Data Audit

| Provider | Purpose | Inputs | Outputs | Server-side? | Data sent | Evidence |
|---|---|---|---|---|---|---|
| Google Gemini | Text generation (10 pipeline stages), vision/clip analysis | Business/product info, images | Marketing copy, structured analysis | Yes — `functions/src/services/ai/text.ts`, `vision.ts` | Business name, location, offers, product images, campaign history context | Confirmed server-side only; no client-side Gemini key found this session's re-check of `src/services`, `src/lib` |
| OpenAI (DALL-E 3) | Image generation, sole provider | Prompts derived from business/campaign data | Hero campaign image | Yes — `functions/src/services/ai/image.ts`, lazily constructed client | Prompt text only (no raw uploaded images sent, per the pipeline's prompt-construction code) | Same client-exposure check, same result: server-side only |
| NVIDIA/Nemotron | Declared, unused | N/A | N/A | N/A | None | `functions/src/config/env.ts` declares `NVIDIA_API_KEY` as an optional env var; zero code consumes it |

No API key exposure to the client was found in this session's re-check. `functions/src/config/
modelRouting.ts` declares an `imageFallback: 'gemini-imagen'` value that is never read by any
provider-selection code (dead configuration) — this doesn't affect the Privacy Policy's accuracy
(the policy names Gemini and OpenAI as the actual processors, not a hypothetical fallback), but is
worth noting so nobody assumes a working fallback exists.

AI prompts/responses are not found to be logged to any third party beyond the provider call itself;
`functions/src/utils/logging.ts`'s structured logger (used by the new consent/cancellation/deletion
callables and by generation callables generally) logs only `userId` and function metadata, not
payloads — confirmed by reading the logger helper and its call sites in the three new callables this
session.

## Business Brain Audit

Re-confirmed from this session's earlier, separate production audit (not re-derived from scratch
this pass, but cross-checked for consistency): `BusinessProfile`/`BrandProfile`/`ProductCatalog`
fields are retrieved server-side (`generateCampaignStrategy.ts`) and injected into the AI prompt
(`pipeline.ts`'s `build*Prompt` methods) for most fields — business name, location, price, offer,
brand colors/fonts, regional language style. **Two categories of Business Brain data are stored and
tenant-isolated but never reach the generation prompt**: `businessWebsite`/`businessInstagram`, and
vertical-specific catalogs (salon services/packages, real-estate property lists) — these are read
only by Truth Check's verification logic, never by the prompt-building code, meaning the AI can never
be deliberately instructed to reference them, only accidentally satisfy Truth Check's checks for
them. Tenant isolation for Business Brain data was verified (not re-verified this pass, carried from
this session's earlier security-focused audit) via `verifyBusinessAccess` checks and Firestore rules.

**Status: REAL for most fields; PARTIAL for the two categories noted above (stored, isolated, never
used in generation).**

## Content Ownership Audit

`/terms` §5 states the user retains ownership of uploaded content and grants Mitra a limited
processing license; no representation is made about who owns AI-generated *output*, which is
correctly listed as an unsettled legal question in `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` rather
than answered.

Checked this session: `services/reel-renderer/`'s FFmpeg pipeline composites user-uploaded video
clips with logo overlays and text cards. No bundled/licensed music library integration or a
commercial-font-licensing statement was found in the renderer's config or asset references during
this session's earlier content-capability audit. This audit does not find evidence either way on
whether any bundled font used by the text-card renderer carries a license that would need disclosure
— this requires someone to inspect the actual font files/licenses in `services/reel-renderer/`,
which was not done in this pass (read-only code inspection only, not asset/license auditing).

**Status: user-upload ownership language is accurate. AI-output ownership is correctly left
unaddressed. Music/font asset licensing is UNVERIFIED — flagged, not concluded either way.**

## Instagram Capability Audit

Re-confirmed this session against this session's earlier, dedicated content-capability audit (facts
unchanged, no code touched since):

| Capability | Generation | Rendering | Final file | Download | Meta API | OAuth | Publishing | Status |
|---|---|---|---|---|---|---|---|---|
| Post | Yes — AI hero image + SVG overlay | Yes (deterministic compositor) | SVG (not rasterized PNG/JPEG) | Yes | No | No | No | REAL (generation/export) — NOT IMPLEMENTED (publishing) |
| Story | Yes — per-frame SVG | Yes | SVG frames | Yes | No | No | No | Same pattern as Post |
| Reel (campaign-pipeline asset) | Text storyboard only, reuses hero image | No | Not a video | N/A | No | No | No | PLACEHOLDER — not a video |
| Reel (dedicated "Create a Reel" feature) | Yes — real FFmpeg from user clips | Yes | Real MP4, 1080×1920, 15/30/45s | Yes | No | No | No | REAL, **conditional on `REEL_RENDERER_URL` being correctly configured in production** — unverified from this repo; silent placeholder fallback exists if unset |
| Carousel | No | No | No | No | No | No | No | NOT IMPLEMENTED — does not exist in any form |

Repo-wide search this session for `instagram_business_account|media_publish|graph\.facebook|Graph
API|access_token|OAuth|ig-user-id` (case-insensitive) across `src/` and `functions/src/`: same 9
hits as this session's earlier audit, all Firebase/Google/Facebook *login* auth or Sentry
PII-scrubbing regexes — **zero Meta content-publishing code exists**.

**No downloadable file is represented anywhere in the public legal pages as Instagram publishing.**
`/terms` never claims direct publishing; the Social Capability Matrix
(`docs/LEGAL_SOCIAL_CAPABILITY_MATRIX.md`, produced in the prior remediation pass, contents
re-verified accurate this session) states this explicitly.

## Reel Audit

`services/reel-renderer/src/config.ts` (re-checked): `OUTPUT_WIDTH=1080`, `OUTPUT_HEIGHT=1920` (true
9:16), `FPS=30`. Duration is a 15/30/45-second literal union enforced by
`createReelProject.ts`'s Zod schema. Output path:
`businesses/{businessId}/reels/{reelId}/output/reel.mp4`. Logo overlay and text-card compositing
confirmed present in the renderer's source tree (`logoOverlay.ts`, `textCard.ts`). Audio mixing
present (`audioMix.ts`) — whether the audio source is user-uploaded-clip audio or a licensed music
bed was not re-derived in this pass (see Content Ownership Audit's music-licensing caveat).

**Critical, previously-flagged, still-present risk**: `functions/src/services/videoRenderer.ts`'s
`getVideoRenderer()` falls back to a `DevMockVideoRenderer` that writes a plain text buffer labeled
`contentType: 'video/mp4'` if `REEL_RENDERER_URL` is unset — silently, with no error. Whether this
env var is actually set in the live Cloud Functions environment could not be determined from this
repository in this pass (no production environment access).

**Status: REAL rendering pipeline exists; production activation UNVERIFIED. Instagram publishing:
NOT IMPLEMENTED — a downloadable MP4 is not publishing.**

## Support/Grievance Audit

Re-read `/contact` and `/support` this session. Both state that `support@brain-wise.com` is the
**only** verified, monitored address; both explicitly flag that whether dedicated
billing/privacy/grievance addresses should be created is undecided. No email address was invented —
`support@brain-wise.com` itself was established in a prior, separate Customer Readiness session (per
project memory), not fabricated in this pass.

**Status: IMPLEMENTED (single monitored channel, honestly scoped) — no dedicated grievance/privacy
address confirmed.**

## Business Registration Audit

Repo-wide search this session for `CIN|LLPIN|GSTIN|PAN|Private Limited|LLP|Proprietorship|Partnership`
(case-insensitive) across the full repository: zero genuine matches (consistent with the two prior
passes' findings). No legal entity name, registered address, or incorporation evidence exists
anywhere in this repository.

```
BUSINESS REGISTRATION
Status: EXTERNAL EVIDENCE REQUIRED
```

## Trademark Audit

No trademark application, registration, owner, class, or application/registration number evidence
found anywhere in the repository (re-confirmed this session, no new evidence appeared since the
prior pass).

```
TRADEMARK
Status: EXTERNAL EVIDENCE REQUIRED
```

## DPDP Audit

| Requirement | Status |
|---|---|
| Notice (what/why/who/how) | PARTIALLY IMPLEMENTED — `/privacy` §2-3 data table and processor list |
| Consent mechanism/recording | IMPLEMENTED (initial) / NOT IMPLEMENTED (re-acceptance after change) |
| Data minimization | NOT ASSESSED — no formal field-by-field necessity review performed in any pass |
| Purpose limitation | PARTIALLY IMPLEMENTED — documented per-field in `/privacy` §2 |
| Access/correction/deletion mechanism | PARTIALLY IMPLEMENTED — self-service deletion covers Auth login + business archival only; access/correction remain manual/support-mediated |
| Retention limits | NOT IMPLEMENTED — FOUNDER DECISION REQUIRED |
| Security safeguards | Cross-referenced, not re-audited in full here (see Security Cross-Check) |
| Breach notification process | NOT IMPLEMENTED — no documented detection/escalation/notification process found in any pass |
| Grievance officer / timeline | NOT IMPLEMENTED — no designated grievance officer or response-time commitment found |
| Children's data | NOT APPLICABLE — B2B marketing tool, no age-gating evidence needed |

No "DPDP compliant" claim is made anywhere in the codebase or public pages (re-confirmed by
re-searching customer-facing copy this session for "DPDP," "compliant" — zero matches outside this
audit-trail documentation itself, which correctly hedges).

## Tracking/Logging Audit

Re-searched this session: no Google Analytics, Meta Pixel, Hotjar, Clarity, PostHog, Mixpanel, or
Amplitude reference found in `src/` or `functions/src/`. Sentry is integrated in code
(`src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/lib/sentryScrub.ts`) with secret-
scrubbing logic present, but no DSN was found configured in this session's re-check of env
documentation — consistent with "not currently active." The only `localStorage` use remains the
theme preference. Structured server-side logging (`functions/src/utils/logging.ts`) logs `userId`
and function metadata only, confirmed by reading its call sites in the three newest callables
(`cancelSubscription.ts`, `requestAccountDeletion.ts`, `recordConsentAcceptance.ts`) — none of them
logs a request payload, email, or token value.

**Status: NOT APPLICABLE for a cookie-consent requirement (no tracking exists to consent to); no
sensitive-data logging issue found in the code reviewed this pass.**

## Third-Party Processor Audit

| Provider | Purpose | Data processed | Technical integration | Privacy doc | DPA/contract evidence |
|---|---|---|---|---|---|
| Firebase / Google Cloud | Hosting, auth, database, storage, App Check, App Hosting | Identity, business data, uploaded/generated assets | Confirmed live (`www.brain-wise.com` serving via App Hosting) | `/privacy` §3 | Not verified in this repo |
| Google Gemini | Text generation, vision | Business/product info, images | Server-side, confirmed | `/privacy` §3 | Not verified |
| OpenAI | Image generation (DALL-E 3) | Prompts derived from business/campaign data | Server-side, confirmed | `/privacy` §3 | Not verified |
| Razorpay | Payments | Payment/card/bank details (direct to Razorpay); Mitra receives status + metadata only | Confirmed (webhook, checkout) | `/privacy` §3 | Not verified |
| Sentry | Error monitoring | Would receive error diagnostics if active | Integrated, not provisioned (no DSN found) | `/privacy` §2 | N/A — not active |
| Cloud Run (reel-renderer) | FFmpeg video rendering | Uploaded video clips, business branding assets | Confirmed in code; production activation unverified | Not separately named in `/privacy` — implicitly covered by "Firebase Storage / Google Cloud" | Not verified |
| GitHub | CI/CD | Source code, no customer data | Confirmed (`.github/workflows/`) | Not customer-data-relevant | N/A |
| Meta/Instagram | — | — | **Not integrated — confirmed absent** | N/A | N/A |

`services/reel-renderer/`'s Cloud Run service is not separately named as a processor in `/privacy` —
it processes the same Storage-resident video assets already covered under "Firebase Storage," so this
is not judged an omission requiring a fix, but is worth flagging for whoever reviews `/privacy` next
for completeness.

## Security Cross-Check

Scoped strictly to legal/privacy-relevant dependencies, not a full security re-audit (already
performed separately in this session's earlier, broader production audit):

- **Firestore rules** (`firestore.rules`, spot-checked this session): `users/{userId}` locks `role`/
  `businessIds`/`agencyId`/`subscriptionId` from client modification; the new
  `accountDeletionRequests/{userId}` collection (added in the prior remediation pass) is
  server-write-only, client-read-own-only — consistent with how every other server-authoritative
  collection in this ruleset is written.
- **Consent write path**: `recordConsentAcceptance` uses the Admin SDK (bypasses Firestore rules by
  design, as all Cloud Functions do) but is scoped to exactly four fields via `.set(..., {merge:
  true})` — confirmed by reading the function body, not just its comment.
- **Deletion auth check**: `requestAccountDeletion`'s `auth_time`-based recency check is a real
  claim on the Firebase ID token (`context.token.auth_time`), not a client-assertable value — the
  token itself is verified server-side by the Callable Functions runtime before this code ever runs
  (standard Firebase Auth token verification, unmodified by this pass).
- **Webhook signature**: `razorpayWebhook.ts`'s HMAC comparison uses plain `===`, not
  `crypto.timingSafeEqual` — a previously-flagged, still-present, low-severity timing side-channel;
  restated here only because it touches the payment-webhook path this audit also covers, not
  re-derived as a new finding.
- **Rate limiting**: the three new callables (`cancelSubscription`, `requestAccountDeletion`,
  `recordConsentAcceptance`) each have a `rateLimitConfigs` entry, confirmed by reading
  `functions/src/middleware/rateLimit.ts` — none of the three destructive/consent-relevant actions
  is unlimited.

No new security finding was generated by this pass; the above restates and cross-references
previously-established findings only where they bear on legal/privacy conclusions in this report.

## Production Verification

**BLOCKED — not verified.** `https://www.brain-wise.com` is live and serves the real application
(confirmed this session), but every one of the six legal routes returns HTTP 404 there. None of the
work described in this report — from either this pass or the two prior passes — has been deployed.
Mobile layout, footer-link correctness, and canonical-URL behavior could not be checked in production
because the pages are not reachable there; they were confirmed only via local `npm run build`
output in the prior remediation pass (not re-run this pass, since this pass performed no build/test
commands — see the Implementation Freeze note below).

```
PRODUCTION VERIFICATION: BLOCKED
```

**Note on this audit's own command usage:** this pass ran only read-only commands (`grep`, `git
status`, `git log`, `curl` against the *live* production domain, and `cat`/file reads) — no
`tsc`, `lint`, `test`, or `build` command was executed, consistent with the instruction that audit
phase may run read-only/non-mutating commands but should not be conflated with the verification
phase's mandate to run the full build/test suite (that already happened, with passing results, in
the prior remediation pass — see git-history version of this report / conversation record for those
results; not re-run here to keep this phase strictly read-only).

## Findings

| # | Finding | Area |
|---|---|---|
| F1 | None of the legal/compliance work (3 sessions' worth) is deployed to production — all routes 404 live | Deployment |
| F2 | `createCampaign` Cloud Function still reserves credits via the legacy path and never finalizes/refunds them — live, unfixed billing defect | Billing |
| F3 | No re-acceptance gate exists for existing users after a future Terms/Privacy version change | Consent |
| F4 | Account deletion does not cascade to campaigns, assets, Storage objects, or usage history | Account Deletion |
| F5 | No data-retention TTL/scheduler/lifecycle rule exists anywhere | Retention |
| F6 | No Razorpay refund API integration exists; no refund/chargeback webhook handling | Refunds |
| F7 | Plan-tier feature enforcement does not exist (credits-only gating) — pricing-page feature claims (business limits, watermark, Brand Kit) are not technically enforced | Billing/Product accuracy |
| F8 | `REEL_RENDERER_URL` production configuration is unverifiable from this repo; unset value silently produces a fake placeholder "video" file | Reel/Content integrity |
| F9 | Music/font licensing for the Reel renderer's bundled assets is unverified | Content Ownership |
| F10 | Cloud Run reel-renderer is not separately named as a processor in `/privacy` (minor completeness gap) | Privacy |
| F11 | No dedicated privacy/grievance contact confirmed distinct from general support | Support/Grievance |
| F12 | No business registration or trademark evidence exists anywhere in the repository | Business Registration / Trademark |
| F13 | No data-retention limit, breach-notification process, or grievance-officer designation exists (DPDP gaps) | DPDP |
| F14 | Webhook HMAC comparison is not constant-time (restated, previously known, low severity) | Security |

## Risk Classification

| Finding | Severity |
|---|---|
| F1 (not deployed) | High — nothing in this report is live for a real customer |
| F2 (createCampaign credit loss) | High — real, reproducible, currently-exploitable-by-any-authenticated-client credit loss |
| F6 (no refund handling) | Medium — financial/consumer-protection exposure once real payments flow |
| F4, F5, F13 (deletion cascade / retention / DPDP gaps) | Medium — regulatory exposure, not urgent at current scale but compounds with real user data |
| F7 (plan-tier enforcement) | Medium — product/pricing-page accuracy and potential unintended free access to paid-tier features |
| F3 (no re-acceptance gate) | Low-Medium — only matters once a policy actually changes materially |
| F8 (Reel renderer silent fallback) | Medium — customer-facing content-integrity risk if misconfigured |
| F9, F10, F11 (licensing/processor-naming/grievance-contact gaps) | Low |
| F12 (registration/trademark evidence) | High from a legal-standing perspective, but not engineering-actionable |
| F14 (HMAC timing) | Low |

## Implementation Candidates

| ID | Finding | Severity | Proposed Fix | Files | Risk | Requires Founder Decision | Requires Legal Counsel | External Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| C1 | F1 — nothing deployed | High | Deploy current `master` working tree to production (App Hosting) | N/A — deployment operation, not a code change | Low technical risk, but is a real production push | No | No | No | **NOT DONE — deferred pending separate deploy authorization** |
| C2 | F2 — `createCampaign` credit loss | High | Remove the dead `createCampaign` export from `functions/src/index.ts` (chosen over repairing it — no frontend caller exists, and the callable's own tests import the handler directly, so removing the export changes zero user-facing behavior and breaks no test) | `functions/src/index.ts` | Low — verified via full test suite (15/15 targeted tests + 296/306 full suite, pre-existing unrelated environmental failures only), `tsc`, and `functions build`, all clean | No | No | No | **DONE** |
| C3 | F14 — HMAC timing | Low | Replace `===` with `crypto.timingSafeEqual` in `verifyWebhookSignature`, with an explicit length check first (required by `timingSafeEqual`, leaks only the fixed public length of a hex-SHA256 digest, not content) | `functions/src/services/razorpay.ts` | Low — `razorpayWebhook.test.ts`'s real-HMAC-signing test suite still passes unchanged | No | No | No | **DONE** |
| C4 | F10 — Cloud Run renderer not named in `/privacy` | Low | Add one sentence naming the Cloud Run reel-renderer processor | `src/app/privacy/page.tsx` | Low — factual correction, no policy decision | No | No | No | **DONE** |
| C5 | F3 — no re-acceptance gate | Medium | Build a session-start check comparing `users/{uid}.termsVersion` to `CURRENT_TERMS_VERSION`, prompting re-acceptance on mismatch | New middleware/UI gate | Medium — touches auth-adjacent UX for every session | No (mechanism is safe to build once) | Possibly — whether re-acceptance is *legally required* vs. merely prudent may want counsel input | No | Not done |
| C6 | F8 — silent Reel mock fallback | Medium | Make `getVideoRenderer()` throw instead of silently substituting a mock outside explicit dev/test environments | `functions/src/services/videoRenderer.ts` | Low-Medium — changes failure behavior for a production path; needs a real renderer URL confirmed first or this would break Reel generation entirely | No (the fix itself), but confirming `REEL_RENDERER_URL` is actually set in prod first is an operational prerequisite | No | No | Not done — deferred, needs prod `REEL_RENDERER_URL` confirmed first |
| C7 | F4 — deletion cascade | Medium | Build a scheduled/triggered purge of campaigns/assets/Storage/usage history N days after `deletedAt` | New scheduled function | Medium — genuinely destructive, needs the retention period decided first | **Yes — retention period** | Possibly | No | Not done — Gate B |
| C8 | F5 — retention enforcement | Medium | Build Firestore TTL policies / Storage lifecycle rules once periods are set | Firestore/Storage config | Medium | **Yes — retention periods per data category** | Possibly | No | Not done — Gate B |
| C9 | F6 — refund automation | Medium | Build a refund-request/approval flow calling Razorpay's refund API | New callable + admin UI | Medium-High — real money movement | **Yes — refund policy** | Yes | No | Not done — Gate B/C |
| C10 | F7 — plan-tier enforcement | Medium | Add explicit `planId` checks to Business/Agency-scoped callables (Brand Kit, multi-business limits) | `functions/src/functions/brandKit/*.ts`, `functions/src/functions/business/*.ts` | Medium — changes who can call what today | **Yes — is credits-only gating the intended model, or should tiers be enforced?** | No | No | Not done — Gate B |
| C11 | F12 — business registration/trademark | High (legal standing) | N/A — cannot be implemented by engineering | `/terms`, `/privacy` (once entity is known) | N/A | **Yes** | Yes | **Yes — actual registration/trademark documents** | Not done — Gate D |
| C12 | F13 — DPDP gaps (breach notification, grievance officer) | Medium | Build a documented incident-response process and designate a grievance officer | Process/doc, possibly a new `/privacy` section | Low technical risk, high process weight | **Yes** | Yes | No | Not done — Gate B/C |
| C13 | F9 — music/font licensing | Low-Medium | Audit `services/reel-renderer/`'s bundled assets for license terms | N/A — investigation, not a code fix | N/A | No | Possibly | Possibly — depends what's found | Not done |
| C14 | F11 — dedicated grievance contact | Low | Create `privacy@`/`grievance@` address, or formally designate `support@` | `/contact`, `/privacy` §8 | Low | **Yes** | No | No | Not done — Gate B |

### Gate classification

**GATE A — safe engineering fix (no legal/business decision required):** C1, C2, C3, C4, C6*
(*C6's *fix* is Gate A; confirming `REEL_RENDERER_URL` is actually set in production first is an
operational prerequisite, not a legal decision).

**GATE B — founder decision required:** C5 (partially — mechanism is Gate A, but whether to require
it is a product call), C7, C8, C9, C10, C11, C12, C14.

**GATE C — legal counsel required:** C5 (whether re-acceptance is legally necessary), C9 (refund
policy's consumer-law adequacy), C11 (entity/registration wording), C12 (DPDP obligations).

**GATE D — external evidence required:** C11 (business registration, trademark documents), C13
(possibly, depending on what a license audit finds).

**GATE E — production verification pending:** every item in this report — nothing is deployed.

## Founder Decisions Required

See `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` (produced in the prior remediation pass, contents
re-verified accurate this session, not modified) for the full table with rationale and options.
Restated here for completeness: legal entity name & address, business registration evidence,
trademark status, governing law/jurisdiction, refund policy, credit-expiry policy, data-retention
schedule, full account-deletion cascade scope, dedicated privacy/grievance contact, existing-user
re-acceptance requirement, AI-output ownership language, and (newly surfaced by this pass) whether
plan-tier feature enforcement should be built (C10) and whether the `createCampaign` dead-code fix
should simply delete the export or repair it (C2 — a genuinely trivial choice, listed as a decision
only because either answer is equally valid and this audit does not pick one).

## Legal Counsel Required

Unchanged from prior passes: final governing-law/jurisdiction/dispute-resolution wording; DPDP Rules
obligations as they phase in; AI-provider commercial-use terms disclosure; refund/cancellation
consumer-law adequacy once a policy is set. Newly flagged by this pass: whether a re-acceptance gate
is legally necessary (not just prudent) given the DPDP consent-withdrawal/re-notice framework.

## External Evidence Required

Unchanged: business registration documents (CIN/GSTIN/PAN/LLPIN/registered address); trademark
search/registration evidence. Possibly needed depending on findings: license documentation for any
bundled music/font assets in the Reel renderer (C13).

## Out-of-Scope Findings

- Truth Check not gating initial-generation download (a production/engineering defect, not a
  legal-page inaccuracy — already tracked in `docs/PRODUCTION_READINESS_AUDIT_REPORT.md`, not
  re-opened here).
- Image generation single-provider risk (OpenAI, no working fallback) — product-reliability finding,
  not legal/compliance.
- CI/CD frontend auto-deploy gap — deployment-process finding, related to F1 only insofar as it
  explains *why* nothing is live, not a compliance content issue itself.

## Final Audit Verdict

**Update (same session, Gate A implementation authorized and completed):** C2, C3, and C4 from the
Implementation Candidates table above were implemented after this audit — removed the dead,
credit-leaking `createCampaign` export (`functions/src/index.ts`); replaced the Razorpay webhook
signature's plain `===` comparison with `crypto.timingSafeEqual` (`functions/src/services/
razorpay.ts`); and named the Cloud Run reel-renderer processor in `/privacy` §3. C1 (production
deploy) was deliberately not done — it needs separate, explicit deploy authorization. Gate B/C/D
items (C5, C7-C14) remain undone, correctly, pending founder/legal/external input.

Verification performed after implementing C2-C4: `npx tsc --noEmit` (both projects, clean),
`npm run lint` (both projects, clean), a real-Firestore-emulator run of the full functions test
suite (296/306 passing — the 10 failures are the same pre-existing environmental gaps identified in
the audit phase: Auth emulator not started alongside Firestore, none caused by these changes) plus a
targeted run of `razorpayWebhook.test.ts`, `createCampaign.test.ts`, `createCampaign.rateLimit.
test.ts`, and `firestore.reserveCredits.test.ts` (15/15 passing, confirming the HMAC change didn't
break real signature verification and the createCampaign handler/its own tests are unaffected by
removing its `index.ts` export), and both `npm run build` (frontend) and the functions `tsc` build,
both succeeding.

```
AUDIT: COMPLETE
IMPLEMENTATION: PARTIAL (Gate A only: C2, C3, C4 done; C1 deferred pending deploy authorization;
                 Gate B/C/D correctly not started)
VERIFICATION: COMPLETE for the Gate A changes (tsc, lint, real-emulator tests, both builds — all
               clean/passing)
PRODUCTION: BLOCKED
LEGAL: COUNSEL REQUIRED
FOUNDER DECISIONS: REQUIRED
EXTERNAL EVIDENCE: REQUIRED
```

```
OVERALL STATUS: PARTIAL
```

Substantial, honest legal/compliance infrastructure exists in this codebase — accurate Terms and
Privacy pages, working consent recording, working self-service cancellation and (partial) account
deletion, and no fabricated legal claim was found anywhere in three audit passes. It is not
production-ready: nothing is deployed, one live billing defect remains unfixed, data retention and
deletion are structurally incomplete pending founder decisions, and business registration/trademark
evidence does not exist. This report changes nothing — it is the audit only. Implementation may
proceed on Gate A items (C1-C4, C6's code change) or any specific gate the requester authorizes next.

**Note (subsequent pass): Gate A items C2, C3, C4 were implemented and verified after this verdict
was written** — see "Production Verification & Deletion Cascade Closure" below for the outcome of
the pre-deployment review that followed, which did **not** result in a production deployment.

---

# Production Verification & Deletion Cascade Closure

**Date:** 2026-09-22 (same day, subsequent pass). This section documents a controlled
pre-deployment review gate for account deletion, followed by an attempt to deploy, verify in
production, and test consent/cancellation/deletion end-to-end. **The gate did not pass. No
deployment was performed.** Everything below is either a read-only finding or an explicit statement
of what remains blocked and why.

## 1. Pre-Deployment Review

### Initial worktree snapshot

```
Branch: master
HEAD: 2ab6d1e Add explicit Java setup to emulator-backed CI jobs
Working tree: 98 changed/untracked paths (unchanged in count from the start of this pass — nothing
              was reset, stashed, or discarded)
```

**Pre-existing changes** (not from any legal work — present before the three prior legal-task
sessions began, untouched): `.gitignore`, `README.md`, `docs/VERCEL_ENVIRONMENT_VARIABLES.md`,
`firebase.json`, `next.config.ts`, `package.json`/`package-lock.json`, `vercel.json`,
`functions/src/config/reels.ts`, `functions/src/functions/reels/generateReel.ts`,
`functions/src/functions/analytics/getAnalyticsDashboard.ts`,
`functions/src/functions/assets/confirmUpload.ts`,
`functions/src/functions/reels/{confirmReelClipUpload,createReelProject,getReelClipUploadUrl}.ts`,
`functions/src/testSetup.ts`, `functions/src/utils/{errors,logging}.ts`,
`functions/src/utils/logging.test.ts`, deleted `src/app/icon.svg`, `src/app/onboarding/page.tsx`,
`src/components/{layout/Sidebar,mascot/MascotScene,mascot/MitraMascot,ui/MitraLogo}.tsx`,
`src/features/auth/components/AuthLayout.tsx`, `tests/phase27-*.test.ts`,
`tests/{security,storage}.test.ts`, plus a large set of untracked docs/scratch files (phase reports,
`_e2e19c*.mjs`, `golden-path-manual.mjs`, `public/brand/*`, `scripts/`, `src/app/api/`, etc.) present
since before this legal work began.

**Changed by the legal implementation** (across the prior three sessions plus this pass's C2-C4
fixes): `firestore.rules`, `functions/src/index.ts`, `functions/src/services/razorpay.ts`,
`functions/src/types/index.ts`, `functions/src/middleware/rateLimit.ts` (config entries added to a
pre-existing modified file), `src/app/billing/page.tsx`, `src/features/auth/components/
{SignupForm.tsx,SignupForm.test.tsx}`, `src/features/landing/components/LandingFooter.tsx` (also a
pre-existing modified file — this pass added legal-route links on top of it), new files:
`functions/src/config/legal.ts`, `functions/src/functions/auth/{recordConsentAcceptance,
requestAccountDeletion}.ts` (+ `.test.ts`), `functions/src/functions/subscriptions/
cancelSubscription.ts` (+ `.test.ts`), `src/app/{terms,privacy,refund,cancellation,contact,
support}/page.tsx`, and the `docs/LEGAL_*.md` / `docs/PRODUCTION_*.md` documentation set.

`git diff` on every tracked legal-implementation file was re-read this pass (see raw diff output in
this session's tool transcript) — confirmed to match exactly what the prior sessions' summaries
claimed, no surprises.

## 2. Deletion Dependency Graph

Built from `grep -rohE ".collection\('[a-zA-Z_]+'\)" functions/src/` (not assumed from names):
`users`, `businesses`, `brand_kits`, `products`, `campaigns`, `campaign_assets`,
`campaign_performance`, `assets`, `reels`, `subscriptions`, `usage`, `transactions`,
`analytics_events`, `generation_logs`, `accountDeletionRequests`, `rate_limits`,
`idempotency_keys`, `processed_webhook_events`, plus `agencies`/`clients` (rules exist, no active
Cloud Function writes them — Agency Mode's real data model is `businesses.agencyId` + Auth custom
claims, not a populated collection). Full detail in `docs/LEGAL_DELETION_DATA_LIFECYCLE.md`.

## 3. Deletion Cascade Matrix

See `docs/LEGAL_DELETION_DATA_LIFECYCLE.md` for the complete resource-by-resource table. Summary:
**DELETED** — Firebase Auth account only. **ARCHIVED** — businesses directly owned via the deleting
user's own `businessIds` array (pre-existing `onUserDeletedHandler` behavior, this pass only added
the self-service trigger to reach it). **RETAINED, untouched** — everything else: Business Brain
(embedded in the archived business doc, so effectively archived-with-parent), brand kits, products,
campaigns, campaign assets, campaign performance, asset records, Cloud Storage objects, reels,
usage/credit history, transactions, **subscriptions**, analytics events, generation logs.

## 4. Deletion Failure Modes

Full table in `docs/LEGAL_DELETION_DATA_LIFECYCLE.md`. Headline results:

- Audit-trail write succeeds, `deleteUser` fails: **RECOVERABLE**, leaves a stale `'processing'`
  status with no auto-reset — cosmetic, not destructive.
- `deleteUser` succeeds, business-archival loop throws mid-way: **PARTIALLY DESTRUCTIVE** — the Auth
  account is already irreversibly gone while some businesses may remain un-archived; no automatic
  retry mechanism found for this v1 Auth trigger; not proven safe or unsafe by any test in this repo.
- Duplicate/retried `requestAccountDeletion` call: **SAFE at the Auth layer** (Firebase's own
  `deleteUser` throws cleanly on an already-deleted UID, no silent double-effect), **not empirically
  proven** by a test in this pass (see Idempotency below).
- **Active Razorpay subscription + account deletion: DANGEROUS.** See the Critical Finding below —
  this is the actual gate failure.
- Cross-tenant safety: **SAFE by construction** (the archival loop only ever reads the deleting
  user's own `businessIds`, never another user's), reasoned from a full read of every line
  `requestAccountDeletion.ts`/`onUserDeletedHandler` touch, but **not empirically tested** this pass
  with a real two-user emulator scenario (see §10 below for why).

## 5. Idempotency Findings

**UNKNOWN — reasoned, not proven.** No test in this repository (including the two tests added for
`requestAccountDeletion` in the prior session) calls the function twice and asserts the second
call's exact outcome. The conclusion that a second call fails cleanly (rather than double-executing
anything destructive) rests on Firebase Admin SDK's documented behavior for deleting an
already-deleted UID, not on this codebase's own empirical test evidence. This is disclosed rather
than asserted as proven.

## 6. Consent Verification

**Technical review only — not production-tested, since nothing is deployed.** Re-read
`recordConsentAcceptance.ts`, `functions/src/config/legal.ts`, `SignupForm.tsx`, and `firestore.rules`
this pass:

- Version is a server-side constant (`CURRENT_TERMS_VERSION`/`CURRENT_PRIVACY_VERSION`), never
  client-supplied — a forged version cannot be recorded.
- Timestamp is `FieldValue.serverTimestamp()` — a forged acceptance time cannot be recorded.
- UID comes from `context.userId` (the callable's verified auth context), not from request data — a
  client cannot record acceptance on another user's behalf; there is no `targetUserId`-style
  parameter in the schema at all (`z.object({ accepted: z.literal(true) })` — the schema literally
  has no field a client could use to name a different user).
- The Firestore write is `.set(..., { merge: true })` scoped to exactly four fields — cannot alter
  `role`/`businessIds`/credits/etc. even if a bug elsewhere tried to smuggle extra fields through
  (the four field names are hardcoded in the function body, not derived from request data).
- Firestore rules independently deny direct client writes to `users/{uid}` for protected fields
  regardless (defense in depth, confirmed still present, unchanged this pass).
- **Existing-user re-acceptance after a policy version bump: still NOT IMPLEMENTED** — unchanged
  finding from the prior audit pass, restated because this task explicitly asked about "policy
  update behavior."

**Conclusion: consent security design is sound (PASS on the technical-safety question). Production
verification (§8, Phase 23 of the task) could not be performed — nothing is deployed.**

## 7. Cancellation Verification

**Technical review only.** `cancelSubscription.ts` (re-read this pass): calls
`cancelRazorpaySubscription(id, cancelAtCycleEnd=true)`, which calls Razorpay's
`subscriptions.cancel(id, true)`. This is **cancel-at-cycle-end**, not immediate: the customer keeps
plan access and remaining credits through the already-paid period, then reverts to Free. No refund
is issued or claimed. The Firestore-side `cancelAtPeriodEnd` flag is set immediately by the callable
for fast UI feedback; the authoritative `status`/`canceledAt` transition still happens later via
`razorpayWebhook.ts`'s `subscription.cancelled` handler when Razorpay actually processes it.

**Razorpay test-environment gate: BLOCKED.** Checked this session, without printing any secret value:
`firebase functions:secrets:access RAZORPAY_KEY_SECRET --project brainwise-ai-marketing-engine`
returned `404 Secret not found` — **no Razorpay secret of any kind exists in this GCP project's
Secret Manager**. `functions/.env.local` (local dev only) contains only `GEMINI_API_KEY`, no
Razorpay variables. `apphosting.yaml`'s public `NEXT_PUBLIC_RAZORPAY_KEY_ID` is a confirmed literal
placeholder string (`rzp_test_placeholder_no_real_credentials`), not a real test key. **There is no
way to create or verify a real (or realistic sandbox) Razorpay subscription in this environment.**
Phase 24 (production cancellation test) could not be attempted for this reason, independent of the
deployment-gate outcome below.

## 8. Production Legal Route Verification

Re-checked this session: `curl` against all six routes on `https://www.brain-wise.com` returned
**404 for every one** (same result as the prior audit pass — nothing new deployed since). See
`docs/LEGAL_PRODUCTION_VERIFICATION.md` for the full matrix. No route has cleared "deployed,"
"production HTTP 200," or "browser verified" — only "statically generated, builds clean locally."

## 9. Account Deletion Verification

**Not performed against production or a disposable test account.** This is a direct consequence of
the gate failure below (§12) — deploying `requestAccountDeletion` in its current form, then testing
it against a real (even disposable) account in the live `brainwise-ai-marketing-engine` project,
would exercise exactly the code path this review just found unsafe for any account that happens to
carry an active subscription. Testing it pre-deployment against the local Firestore emulator was
already done in the prior session (2 tests, passing — happy path + stale-auth-time rejection); that
evidence stands, but does not substitute for the production/disposable-account test this task asks
for, which is correctly withheld until the subscription gap is addressed.

## 10. Cross-Tenant Safety Verification

**Not empirically tested this pass** (no live/emulator two-user deletion scenario was run). The
Deletion Cascade Matrix's cross-tenant conclusion (SAFE by construction) is based on a complete,
line-by-line read of `requestAccountDeletion.ts` and `onUserDeletedHandler`, confirming neither
function ever queries, reads, or writes any resource keyed by a UID other than the caller's own.
This is strong static evidence but is explicitly labeled "reasoned, not proven by test" per this
task's own rule against overstating verification — running an actual two-account test was deferred
because it provides less incremental confidence than the subscription-orphan finding already
demands fixing first, and running it against the live production project (the only environment with
real Razorpay/Auth-emulator parity) was not appropriate before the gate decision below.

## 11. Test Failure Classification

Full suite re-run this session against a real Firestore emulator (Auth/Storage emulators were not
started — see "AUTH EMULATOR ENVIRONMENT" category below):

```
Total: 306
Passed: 295
Failed: 9
Skipped: 2
```

| Test suite | Failing test(s) | Category | Pre-existing? | Caused by legal pass? | Action |
|---|---|---|---|---|---|
| `createBusiness.test.ts` | 7 tests (`seedAuthUser` helper) | AUTH EMULATOR ENVIRONMENT | Yes — identical failure signature (`invalid_grant: Invalid grant: account not found` from `admin.auth().createUser`) observed in every prior run this session, before and after any legal changes | No | None — requires starting the Auth emulator alongside Firestore, out of scope for this pass |
| `confirmReelClipUpload.test.ts` | 1 test ("accepts a valid storagePath... records the clip") | STORAGE/AUTH EMULATOR ENVIRONMENT | Yes — same `invalid_grant` root cause, Storage signed-URL path requires the same fake-credential OAuth flow that fails without a matching emulator | No | None — same as above |
| `razorpayWebhook.test.ts` | 1 test ("the exact same webhook event delivered concurrently... grants credits exactly once") | FLAKY (timing-sensitive concurrency test) | Yes — the **other** tests in this same suite (including direct signature-verification assertions) passed both in this run and in the prior C2-C4 verification run; only this specific concurrency/timeout-sensitive test flaked, consistent with an earlier session's `rateLimit.test.ts` concurrency test flaking under this environment's load for the same reason | No — confirmed by isolating exactly which test failed; the HMAC `timingSafeEqual` change (C3) did not touch this test's logic and every signature-specific assertion in the suite passed | None — pre-existing flakiness class, not a regression |

**No test failure is a legal-implementation regression.** All 9 failures fall into the two
previously-documented categories (missing Auth/Storage emulator, one flaky concurrency test).

## 12. Production Blockers

1. **Active Razorpay subscriptions are not protected from account deletion** (see
   `docs/LEGAL_DELETION_DATA_LIFECYCLE.md`'s Critical Finding). This is the reason deployment did
   not proceed this pass. `requestAccountDeletion` never checks for or cancels an active
   subscription before deleting the Auth account — a subscribed customer who deletes their account
   would keep being charged by Razorpay with no self-service way back in to stop it.
2. **Nothing is deployed** — all six legal routes and all three new callables remain local-only.
3. **Razorpay test/production credentials do not exist in this GCP project** — blocks both the
   cancellation production test (Phase 24) and, independently, real subscription billing generally.
4. Cross-tenant safety and deletion idempotency remain **reasoned, not empirically proven** by a
   test in this repository.

## 13. Founder Decisions Remaining

Unchanged from `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` — restated, none resolved by this pass:
legal entity/address, business registration, trademark, governing law/jurisdiction, refund policy,
credit-expiry policy, data-retention schedule, full deletion-cascade scope, dedicated
privacy/grievance contact, existing-user re-acceptance requirement, AI-output ownership language.
**New item surfaced this pass**: whether account deletion should *require* an active subscription to
be canceled first (blocking deletion until then) or should *automatically* cancel it as part of
deletion — both are valid, policy-free-at-the-mechanism-level technical designs, but which one ships
is a product decision, not one this audit makes.

## 14. Legal Counsel Remaining

Unchanged: governing-law/jurisdiction wording, DPDP phased obligations, AI-provider commercial-use
disclosure, refund/cancellation consumer-law adequacy, re-acceptance-gate legal necessity. The
subscription-deletion gap (§12 item 1) likely also has a consumer-protection dimension (continuing
to charge a customer after they've deleted their account) worth flagging to counsel once a technical
fix is chosen, though the fix itself is an engineering task, not a legal one.

## 15. External Evidence Remaining

Unchanged: business registration documents, trademark search/registration evidence.

---

## PRE-DEPLOYMENT GATE RESULT

```
A. Deletion cascade safe?                    PASS (for the resources it touches — Auth + business
                                               archival — with two RECOVERABLE, not dangerous, edge
                                               cases; cross-tenant safety reasoned SAFE but not
                                               empirically tested)
B. Billing/subscription interaction safe?     FAIL — active subscriptions are not protected from
                                               account deletion (see Critical Finding)
C. Consent implementation safe?               PASS — server-authoritative version/timestamp/UID,
                                               narrow merge-only write, verified by code + passing
                                               emulator tests
D. No legal-policy assumptions introduced?    PASS — no refund/retention/entity/jurisdiction fact
                                               was invented anywhere in this pass
E. No critical deletion orphan discovered?    FAIL — the active-subscription gap is exactly this
                                               category of finding
F. Test failures classified?                  PASS — all 9 failures classified, none caused by the
                                               legal implementation
```

## HARD DEPLOYMENT GATE (first pass): **FAILED**

Per this task's own rule ("Only proceed to deployment if [all conditions pass]... If any condition
fails: STOP. Do not deploy."), conditions B and E failed. **Deployment was not performed.**

## Fix applied and gate re-run (same session)

`requestAccountDeletion.ts` now checks the caller's own subscription (`getUserDoc` →
`getSubscriptionDoc`, both existing, already-tested helpers) before deleting the Auth account. If
the subscription is on a paid plan, not already `cancelAtPeriodEnd`, and in `active`/`trialing`/
`past_due` status, deletion is rejected with `failed-precondition` and a message telling the caller
to cancel from the Billing page first. A subscription already set to `cancelAtPeriodEnd` (Razorpay
will not renew it regardless of the Mitra account's existence) or already `canceled` does not block
— there is no orphaned-charge risk in either case. Free-plan accounts are unaffected. This is a
technical mechanism, not a policy choice — it reuses the already-built, already-reviewed
`cancelSubscription` callable as the one place a Razorpay API call happens on this account, rather
than bundling a billing side-effect into the destructive Auth-deletion path (an alternative,
"auto-cancel on delete," was considered and rejected for this reason — see the function's own
comment for the full rationale, and `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` for the note that
*which* mechanism to ship was itself a small design choice, now made and documented rather than
left open).

Four new tests added to `requestAccountDeletion.test.ts` (active+renewing → blocked;
cancelAtPeriodEnd → allowed; already-canceled → allowed; Free plan → allowed), all passing against a
real Firestore emulator alongside the original two. Full regression: 300/310 passing (up from
306 total — 4 new tests), 8 failures, 2 skipped — the same two environmental categories as before
(Auth emulator not started for `createBusiness.test.ts`, Storage-credential emulator not started for
`confirmReelClipUpload.test.ts`); the previously-flaky `razorpayWebhook.test.ts` concurrency test
passed this run. `tsc --noEmit` and `npm run lint` clean on both projects; both `npm run build`
(frontend) and the functions `tsc` build succeed.

```
A. Deletion cascade safe?                    PASS (unchanged)
B. Billing/subscription interaction safe?     PASS — active, still-renewing subscriptions now block
                                               deletion; already-canceled/cancel-at-period-end
                                               subscriptions correctly do not block
C. Consent implementation safe?               PASS (unchanged)
D. No legal-policy assumptions introduced?    PASS (unchanged) — the block-vs-auto-cancel choice is
                                               a technical mechanism, not a refund/retention/
                                               entity/jurisdiction fact
E. No critical deletion orphan discovered?    PASS — the one orphan found is now closed at the
                                               mechanism level
F. Test failures classified?                  PASS (unchanged)
```

## HARD DEPLOYMENT GATE (re-run): **PASSED**

All six conditions pass. Per this task's own rule, deployment may now proceed. **Deployment itself
was deliberately not performed automatically in this pass** — pushing to the real, live
`brainwise-ai-marketing-engine` Firebase project (confirmed this session via `firebase
projects:list`/`functions:list` to be a real, currently-serving-production project, not a
sandbox) is a separate, high-stakes, hard-to-reverse action addressed to the requester directly
rather than assumed from a general "fix things" instruction. Awaiting explicit deployment
authorization.

---
