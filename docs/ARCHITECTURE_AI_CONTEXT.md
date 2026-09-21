# Mitra Architecture — AI Context

> Primary architectural context for AI coding agents working on this repository.
> Produced by a read-only architecture-discovery pass (no code, rules, config, or
> data were modified to produce this document). Every non-obvious claim below cites
> a file and, where useful, a line number. Where documentation and code disagreed,
> both are stated explicitly rather than silently reconciled.

## 1. Product

**Mitra by BrainWise** — "Upload one product photo. Get 30 days of marketing."
Generates a local-market campaign pack (5 posters, 5 headlines, 5 ad copies, 5
captions, 3 Story concepts, 3 Reel concepts, 1 WhatsApp promo) from one product
photo + business context, in localized Hyderabadi Telugu-English copy.

Three verticals exist **and are genuinely implemented** in code, not just as
enum values: `restaurant` (original/primary), `salon`, `real_estate` (added
Phases 29-31). All three have `implemented: true` in
`functions/src/config/verticals.ts:241-245`, real onboarding/business-brain
schema branches, vertical-specific prompt personas actually substituted into
the generation pipeline, vertical-specific allowed objectives/CTAs enforced
**server-side**, and dedicated Truth Check fact-checkers (catalog claims for
salon, property facts for real_estate). This is a **documentation-vs-history
note, not a doc-vs-code drift**: `docs/PHASE_28_GAP_AUDIT.md` correctly found
salon/real_estate were cosmetic-only at that point in time; `docs/PHASE_29-31`
reports document the subsequent real implementation. Trust the current code
(verified above), not the Phase 28 snapshot, for vertical support status.

There is no live production deployment as of the last verification pass
(`README.md` "Remaining Issues"; `docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md`).

## 2. Technology Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind. Deployed via **Vercel's own Git integration** (not driven by this repo's CI/CD).
- **Backend**: Firebase Cloud Functions Gen2 (Node 20, TypeScript), region `asia-south1` for every callable. Deployed via `firebase deploy --only functions` from GitHub Actions.
- **Database**: Cloud Firestore.
- **Storage**: Firebase Storage, signed-URL upload/download pattern.
- **Auth**: Firebase Authentication. **Only email/password is actually implemented** in the UI (`LoginForm`/`SignupForm`). `authService.ts` exports `signInWithGoogle`/phone-OTP functions, but no UI wires them up — README's stack table claiming "Email/Password, Phone OTP, Google" is **broader than what's live**; treat Google/phone auth as dead/unused code, not a shipped feature.
- **App Check**: `ReCaptchaEnterpriseProvider` (not v3) — `src/lib/firebase/client.ts:91`. Enforced declaratively per-function via `enforceAppCheck: true`.
- **AI**: Gemini (`gemini-flash-latest`) for all text/structured-text/vision calls; OpenAI DALL-E 3 (`quality:'hd'`) for the single hero image per campaign. NVIDIA is mentioned in README's stack table but **no NVIDIA provider implementation was found** in `functions/src/services/ai/` — flag as a documentation/code mismatch (Documentation gap).
- **Payments**: Razorpay (subscriptions + webhooks).
- **Video (Reels)**: a separate Cloud Run ffmpeg-based renderer, called via `REEL_RENDERER_URL` (`functions/src/services/videoRenderer.ts`).
- **Testing**: Jest + React Testing Library (frontend + functions), Firestore/Storage emulator rules tests, Playwright (present but effectively unexercised in CI — see §26/§32).

## 3. Repository Structure

```
src/                         Next.js frontend
  app/                       App Router routes (one dir per route)
  components/                Shared/composite UI (e.g. campaign detail view)
  features/                  Feature-sliced modules: auth, asset, business-brain, campaign, reel
  hooks/                     Cross-cutting hooks (theme, toast)
  lib/                       Firebase client init, Razorpay checkout loader, utils, validation
  services/                  Central direct-Firestore data access layer (database.ts)
  types/                     Frontend TS types

functions/src/                Firebase Cloud Functions Gen2 backend
  functions/                  One dir per domain: analytics, assets, auth, brandKit,
                               business, campaigns, products, reels, subscriptions,
                               usage, webhooks
  services/                   ai/ (provider abstraction + pipeline + truthCheck),
                               firestore.ts (Admin SDK data layer), razorpay.ts,
                               usageControl.ts, analyticsService.ts, videoRenderer.ts
  middleware/                 auth.ts, validation.ts, rateLimit.ts, idempotency.ts
  config/                     env.ts, pricing.ts, reels.ts, verticals.ts
  types/                      Backend TS types (shared shapes for Campaign, Business, etc.)

firestore.rules, storage.rules, firestore.indexes.json   Security/data-model source of truth
firebase.json, .firebaserc, vercel.json, .github/workflows/ci-cd.yml   Deployment config
docs/                         PERFORMANCE_ENGINE.md, PERFORMANCE_DATA_READINESS.md,
                               PHASE_4 .. PHASE_36 historical reports (see §31)
tests/                        Root-level Firestore/Storage rules tests + Playwright e2e spec
```

**Documents named in standard architecture-discovery checklists do NOT exist**:
`docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`,
`DESIGN_SYSTEM.md`, `SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`,
`PROMPT_SYSTEM.md`, `FIRST_CUSTOMERS.md`, `SALES_PLAYBOOK.md`,
`CUSTOMER_FEEDBACK.md`, `CUSTOMER_BLOCKERS.md`, `OBSERVATION*.md`,
`EXPERIMENT_LOG.md` are all absent. The root `README.md` (rewritten in Phase 36)
is the closest thing to a living product/architecture doc. **`.cursorrules` is
stale Phase-1 scaffolding** that still says "DO NOT BUILD: Authentication UI,
Business Brain, Campaign Wizard, AI generation..." and references the nine
missing docs above — it actively contradicts 36 phases of shipped work and
should not be trusted or followed.

## 4. System Architecture

The actual architecture is a **hybrid**, not a pure "browser → callable
Functions only" design:

```
Browser (Next.js, client components)
  ├─→ Firebase Auth SDK (signup/login/logout — direct, no backend involvement)
  ├─→ Direct Firestore reads (dashboard, campaigns list, products list, usage —
  │     via src/services/database.ts, gated only by firestore.rules)
  ├─→ Direct Firestore write (ONE path: brandKitService.upsert on /brand route —
  │     src/app/brand/page.tsx:419 — bypasses Cloud Functions entirely)
  ├─→ Direct Storage PUT via signed URL (asset/reel-clip upload, after a
  │     Cloud Function issues the URL)
  ├─→ Direct Firestore realtime listener (reels/{id} progress — reelService.ts:248)
  ├─→ Razorpay Checkout.js (third-party, loaded client-side, public key only)
  └─→ Callable Cloud Functions (httpsCallable) for every mutation that touches
        credits, Truth Check, business-brain writes, campaign generation,
        payments verification, analytics aggregation
         └─→ Cloud Functions Gen2 (asia-south1)
               ├─→ middleware: Auth check + App Check (enforceAppCheck) + Zod validation
               ├─→ verifyBusinessAccess (authorization)
               ├─→ Firestore (Admin SDK, bypasses rules)
               ├─→ Storage (Admin SDK)
               ├─→ AI provider abstraction (Gemini text/vision, OpenAI image)
               ├─→ usageControl.ts (credit reservation/finalize/refund)
               ├─→ Razorpay SDK / webhook HMAC verification
               └─→ Cloud Run video renderer (Reels only)
```

This is **not** a clean layered (presentation→application→domain→infrastructure)
architecture. It is closer to:

```
UI components → feature services (some call Functions, some call Firestore directly)
             → Firebase client SDK (Auth/Firestore/Storage/Functions, one shared app instance)
```

with the **actual security boundary living in `firestore.rules`/`storage.rules`
+ Cloud Function authorization**, not in "the frontend only talks to Functions."
Direct client Firestore reads are pervasive and intentional; direct client
Firestore **writes** are almost entirely eliminated except one (see §29).

## 5. Frontend Architecture

Routing is Next.js App Router under `src/app/*`. Auth gating uses two
components (`src/features/auth/components/ProtectedRoute.tsx:13,46`), both
driven by `useAuthStatus()`: `ProtectedRoute` (redirect to `/login` if
unauthenticated, wraps children in each route's `layout.tsx`) and
`PublicOnlyRoute` (redirect to `/dashboard` if authenticated, used inline in
login/signup/forgot-password, which have no `layout.tsx`).

| Route | Auth gate | Backend interaction |
|---|---|---|
| `/` | public | none |
| `/login`, `/signup`, `/forgot-password` | `PublicOnlyRoute` | Firebase Auth SDK only |
| `/onboarding` | **no `ProtectedRoute`/`layout.tsx`** — relies on inline `useAuth()` check only | `createBusiness` callable |
| `/dashboard` | `ProtectedRoute` | direct Firestore reads only |
| `/business-profile` | `ProtectedRoute` | `updateBusiness`, `updateBusinessBrain` callables (6 wizard-step submits) |
| `/brand` | `ProtectedRoute` | direct Firestore read **and write** (`brandKitService.upsert`, client `setDoc`) |
| `/campaigns`, `/campaigns/[id]` | `ProtectedRoute` | direct reads + `getCampaign`/`getCampaignPerformance` callables (staleness/perf checks) |
| `/campaigns/new` | `ProtectedRoute` | `generateCampaignStrategy` callable |
| `/products`, `/products/new` | `ProtectedRoute` | direct reads + `createProduct` callable; upload via signed-URL flow |
| `/reels`, `/reels/new` | **no `layout.tsx`/`ProtectedRoute` found** | `reelService` callables + direct Firestore realtime listener for progress |
| `/analytics` | `ProtectedRoute` | `getAnalyticsDashboard` callable (deliberately not a direct read — it's a server-side aggregation) |
| `/billing` | `ProtectedRoute` | `createSubscription`/`verifyPayment` callables + client-side Razorpay Checkout.js |
| `/usage` | `ProtectedRoute` | direct Firestore reads only |

**Gap to verify further**: `/onboarding` and `/reels*` have no route-level auth
guard — an unauthenticated visitor is not redirected before the in-page
`useAuth()` check runs. Low severity (no data exposure — these pages just
render broken/blank without a user), but inconsistent with every other route.

There is **no global auth Context/Provider** — every component calling
`useAuth()`/`useAuthStatus()` independently subscribes to Firebase's own
`onAuthStateChanged` (`useAuth.ts:19-36,73-82`). Functionally fine (Firebase
Auth SDK caches this internally) but architecturally a re-subscribe-per-component
pattern, not a single shared context.

No direct client-side AI API calls exist anywhere in `src/` (confirmed by
exhaustive grep). `src/features/ai/*.ts` are type-only interfaces with no
implementation — a dead/vestigial client-side mirror of the real backend AI
abstraction.

## 6. Backend Architecture

Every domain (`auth`, `business`, `products`, `assets`, `campaigns`,
`subscriptions`, `webhooks`, `analytics`, `reels`, `brandKit`) is a folder of
`onCall` Cloud Functions under `functions/src/functions/`. Cross-cutting
concerns live in `functions/src/middleware/`, not duplicated per-function:

- **`middleware/validation.ts`**: `validatedCallable(schema, handler)` — checks
  `request.auth` first, then Zod-validates `request.data`, then invokes the
  handler. **Every callable except `trackAnalyticsEvent` uses this wrapper.**
  `trackAnalyticsEvent.ts` does its own manual auth+whitelist checking instead
  of Zod — this is architectural drift (one function doesn't follow the shared
  pattern) and has a real consequence (see §10).
- **`middleware/auth.ts`**: `verifyBusinessAccess(userId, businessId)` is the
  authorization primitive used by nearly every business-scoped callable —
  checks `business.userId === userId`, falling back to an `agency_member`
  custom-claim match. App Check is **not** checked in middleware code; it is
  enforced purely via the declarative `enforceAppCheck: true` option passed to
  each `onCall(...)`.
- **`middleware/rateLimit.ts`**: Firestore-transaction sliding-window limiter,
  named configs per action (`generateCampaign` 10/hr, `createCampaign` 50/hr,
  `regenerateAsset` 20/hr, `upload` 30/hr, `createRazorpayOrder` 5/hr, etc.).
  **Two call sites pass keys that don't match any config** (`generateCampaignStrategy.ts`
  calls with `'generateCampaignStrategy'`, `getUploadUrl.ts` with `'getUploadUrl'`),
  silently falling back to a lenient 100-req/60s default instead of the
  intended stricter limit — see §31 Architectural Drift.
- **`middleware/idempotency.ts`**: generic key-based idempotency guard
  (non-transactional get-then-set, a real race window), used only by
  `recordWhatsAppClick.ts`. The credit system (§20) uses its own, properly
  transactional idempotency instead.

## 7. Firebase Architecture

Client init (`src/lib/firebase/client.ts:98-143`), exact order:
1. SSR guard (`typeof window === 'undefined'` → all exports `undefined`) — every consumer function checks-and-throws rather than crashing silently.
2. `initializeApp()` (or reuse existing app via `getApps()`).
3. **App Check initializes immediately after `initializeApp`, before Auth/Firestore/Storage/Functions** (explicit, documented design choice — comment at lines 44-49).
4. `getAuth`, `getFirestore`, `getStorage`, `getFunctions(app, 'asia-south1')`.
5. Emulator connection gated by `NEXT_PUBLIC_USE_EMULATORS === 'true'` (fixed localhost ports 9099/8080/9199/5001).
6. Runs once at module scope (`const firebaseInstances = initializeFirebase()` at import time) — singleton, not per-render.

Firebase JS SDK version `^10.12.5`. All of Auth/Firestore/Storage/Functions
share **one app instance**, which is why callable requests automatically carry
both the ID token and the App Check token with no manual header code anywhere
in the codebase.

## 8. Authentication

- Signup/login/logout/reset all via `src/features/auth/services/authService.ts`, thin wrappers over the Firebase Auth JS SDK (`createUserWithEmailAndPassword` + auto `sendEmailVerification`, `signInWithEmailAndPassword`, `signOut`, `sendPasswordResetEmail`).
- Session persistence: default Firebase Auth SDK persistence; no explicit `setPersistence()` call anywhere.
- Token reaches backend automatically via the shared Firebase `app` instance passed to `getFunctions()` — no manual `getIdToken()`/header code exists.
- Backend verification: `request.auth` populated by the Functions runtime after verifying the ID token; checked first in `validatedCallable` (unauthenticated → immediate reject, logged, payload never logged).
- Custom claims (`role`, `businessIds`, `agencyId`) are the actual authorization substrate — set server-side only, via `onUserCreated` (Auth trigger) and refreshed by `createBusiness`. **`createBusiness.ts` explicitly re-derives claims from `context.token`, never from client input** (anti-privilege-escalation design, comment lines 288-298).
- **Historical security fix, now closed**: `firestore.rules` for `/users/{userId}` previously allowed any authenticated owner to self-write `role`/`businessIds`/`agencyId`, which `createBusiness.ts` would then bake into real custom claims — full cross-tenant privilege escalation. Fixed with an explicit field-lock (rules lines 52-57) and regression-tested (`firestore-security.phase11.test.ts`). This is the single most serious historical vulnerability found in the codebase, and it is confirmed fixed.

## 9. App Check

- Provider: `ReCaptchaEnterpriseProvider` (not v3) — `client.ts:91`, site key from `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- Debug-token flow for emulators: `self.FIREBASE_APPCHECK_DEBUG_TOKEN` set before `initializeAppCheck()` runs, per Firebase's documented requirement.
- If no site key and not using emulators, App Check silently never initializes and every enforced callable will return `UNAUTHENTICATED` — this exact failure mode was a real, previously-shipped bug (client never called `initializeAppCheck()` while 24 functions had `enforceAppCheck: true` deployed), documented and fixed across Phases 20A/20B/20C.
- **Enforcement is declarative per-function** (`enforceAppCheck: true` on the `onCall` options), not centralized middleware.
- **Critical caveat, confirmed by direct experiment (Phase 20C)**: the local Firebase Functions emulator does **not** cryptographically verify App Check or Auth tokens — `FIREBASE_DEBUG_MODE=true` under the emulator causes an "unsafe decode" path instead of real verification. So all local/emulator testing proves token **presence**, never token **validity**. Real cryptographic verification has never been exercised in any documented phase — it only happens against a genuinely deployed, real Firebase project.
- The `razorpayWebhook` function correctly has **no** `enforceAppCheck` (App Check cannot apply to a third-party webhook caller); its trust boundary is HMAC signature verification instead.

## 10. Authorization

Authoritative boundary is **Cloud Function handler code + Firestore/Storage
rules together**, not the frontend. Primitive: `verifyBusinessAccess(userId,
businessId)` (`middleware/auth.ts:21-44`) — checks direct ownership
(`business.userId === userId`) or agency-member custom-claim match. Nearly
every business-scoped callable calls this explicitly (not via a wrapper).

Known gap: **`trackAnalyticsEvent.ts`** skips `validatedCallable`/Zod
entirely and has explicitly stubbed-out ownership verification for
`asset_downloaded`/`whatsapp_clicked` events — an authenticated user can
attribute an analytics event to a `businessId`/`campaignId` they don't own
via this endpoint (code comments admit this: "skip the full verification to
avoid type issues"). `recordWhatsAppClick.ts` was later built as the
authoritative, properly-verified replacement for the WhatsApp-click case
specifically, but the generic endpoint remains live with the gap intact.

Firestore rules field-lock pattern (see §11) is the second layer: e.g. a
client can call `updateCampaign` but the Zod schema **and** the rules layer
both independently exclude `status`/`creditsReserved`/`creditsUsed` from
client-writable fields — defense in depth, not a single point of trust.

## 11. Firestore

`firestore.rules` (245 lines) enforces per-collection owner/business/agency
access via custom claims, not document-field inspection alone. Notable
patterns:

- **Credits/balance-bearing collections (`usage`, `transactions`,
  `subscriptions`) are fully server-locked**: `write: if false` unconditionally.
  This is a materially good design — **no rule anywhere allows a client to
  write a `credits`/`creditsUsed`/`balanceAfter` field directly.**
- `campaigns` update rule (lines 128-144) explicitly freezes `status`,
  `creditsReserved`, `creditsUsed` once set, and freezes
  `metadata.truthCheckStatus` once set — preventing client self-certification
  of a verified/completed campaign.
- `campaign_assets`, `reels`: `write: if false` entirely — fully server-owned.
- **Latent, currently-unreachable risks** (both features have zero code
  references anywhere in `functions/src`/`src` — dead schema, not live risk):
  - `/agencies/{id}`: combined `read, write` for any `agency_member`, with
    **no field lock** — any member could rewrite `ownerUserId`/`members` if
    this collection is ever wired up without revisiting the rule.
  - `/clients/{id}` `create` rule compares `agencyId` against the
    `businessIds` token array instead of the `agencyId` claim — looks like a
    bug, currently unreachable since nothing writes this collection.
- Style inconsistency (non-exploitable): `products` read rule lacks the
  parenthesized OR-grouping used elsewhere, relying on short-circuit
  evaluation rather than explicit precedence.
- All document IDs are **server-generated** in every real, active write path
  (`uuidv7()` minted inside the Cloud Function, or a deterministic composite
  key like `usage`'s `{userId}_{periodStart}`). No client-generated Firestore
  document ID exists anywhere in `src/` — client-side `crypto.randomUUID()`
  calls are used only to mint `idempotencyKey` argument values, never as a
  Firestore document ID.
- **Possible ID-format mismatch, unconfirmed**: `onUserCreated.ts` computes a
  usage-doc ID inline (`${userId}_${periodStart-date}`) rather than calling
  the shared `getUsageDocId()` helper used by every other credit operation
  (`usageControl.ts`, `razorpayWebhook.ts`). If the two formats disagree, a
  brand-new user's very first `usage` doc could be keyed differently from what
  later credit operations read/write. **Flagged as Unknown — needs direct
  byte-for-byte comparison, not yet confirmed as a bug.**

Full data-model map (owner/parent, real vs. schema-only):

| Collection | Owner | Status |
|---|---|---|
| `users` | self | Real |
| `businesses` (incl. embedded `businessBrain`) | `userId` | Real |
| `brand_kits` | 1:1 `businessId` | Real |
| `products` | `businessId` | Real |
| `campaigns` | `businessId`+`userId` | Real |
| `campaign_assets` | `campaignId` | Real |
| `assets` | `userId`+`businessId` | Real |
| `usage`, `transactions`, `subscriptions` | `userId` | Real, server-locked |
| `analytics_events`, `generation_logs` | `userId`/`businessId`/`campaignId` | Real |
| `campaign_performance` | `campaignId` (1:1) | Real, but `inquiries` is permanently `null` (no source exists) |
| `reels` | `businessId`+`userId` | Real, fully server-owned |
| `idempotency_keys`, `rate_limits`, `processed_webhook_events` | internal | Real, Admin-SDK-only, intentionally absent from rules (default-deny) |
| `agencies`, `clients` | schema/rules only | **Not real** — zero code references anywhere |
| `partners`, `partner_referrals` | schema/rules/indexes only | **Not real** — explicitly labeled "Post-MVP" in rules comments |
| `whatsapp_leads` | schema/rules/indexes only | **Not real** — zero code references |

Business Brain, Business Profile, Brand Profile, and Localization Profile are
**embedded fields/shapes, not standalone top-level collections** — see §13.

No client-writable path to any credit/balance field exists. No client-generated
document IDs. No committed secrets found (`.env.local` files exist locally with
real-looking keys but are correctly gitignored/untracked — confirmed via
`git ls-files`).

## 12. Storage

`storage.rules` (27 lines): `/businesses/{businessId}/**` — read+write for any
authenticated user whose token `businessIds` claim contains that business, or
a matching agency member (via `resource.metadata.agencyId`, which is a no-op
on `create` since it only exists on already-uploaded objects). `/temp/{userId}/**`
restricted to that uid (used by the upload-then-confirm flow). `/shared/reel-music/**`
read-only, write-never (deployment-time asset library). Storage is **not**
independently gated by App Check (Storage security rules cannot reference App
Check tokens the way Firestore's `request.auth` can) — only by Firebase Auth
custom claims.

Upload flow: `getUploadUrl` (callable) issues a v4 signed **write** URL (15 min
expiry) for `businesses/{businessId}/{assetType}s/{assetId}/{timestamp}_{fileName}`,
client `fetch()`-PUTs the file directly to that URL (not the Storage SDK), then
calls `confirmUpload` (callable) which verifies the object exists, issues a
7-day signed **read** URL, and writes the `assets/{assetId}` Firestore doc.
**No idempotency**: repeat `confirmUpload` calls with the same `storagePath`
create duplicate `assets` docs (minor, non-security gap).

## 13. Business Brain

Not a separate collection — it is the `businesses.businessBrain` field
(`functions/src/types/index.ts:777-792`), containing `identity`, `products[]`,
`brand`, `audience`, `localization`, `businessRules`, `verticalProfile`
(salon services/packages/appointment settings, or real-estate properties), and
`campaignHistory[]`. Written at `createBusiness` time, updated via
`updateBusinessBrain` (schema-restricted to brand/audience/localization/
businessRules-subset/verticalProfile only — credits/Truth-Check/ownership/
billing fields are excluded by the Zod schema, not just by convention).
Consumed as the primary input to every stage of the AI generation pipeline
(`GenerationPipelineInput.businessBrain`).

**Confirmed dead field**: `campaignHistory[].performance` — initialized once,
never written to by any Cloud Function found. Real campaign performance data
lives in the separate `campaign_performance` collection instead (§22). This
matches `docs/PERFORMANCE_ENGINE.md`'s own explicit statement that this field
is dead.

There is a UI for editing Business Brain (`/business-profile`, six wizard-step
callable submits), but also a **client-side-only, apparently-dead** mirror
(`src/features/business-brain/services/businessBrainService.ts`) that reads
Firestore directly with a JS-level ownership check — grep found no call sites
importing this service from anywhere else in `src/`, suggesting unused/legacy
frontend code (Architectural Drift — see §32).

## 14. Assets

Two-phase signed-URL flow (§12). Asset metadata authority: the server (Admin
SDK) creates the record on `confirmUpload`; the client is then allowed a
best-effort direct Firestore `setDoc` (`assetService.ts` `saveAssetRecord`) to
patch `width`/`height` after the fact — explicitly documented in code comments
as non-authoritative/best-effort, not a security-relevant deviation. Campaigns
reference existing products/assets by ID; `newProduct.images` (base64 or
already-uploaded asset references) feed directly into the AI vision stage.

## 15. Campaign Engine

Real entry point: **`generateCampaignStrategy`**
(`functions/src/functions/campaigns/generateCampaignStrategy.ts`). Order,
verified from code (not assumed):

1. `verifyBusinessAccess` → rate-limit check (config-key mismatch, see §6).
2. Fetch business; 404 if missing.
3. `assertVerticalImplemented(business.category)` — **before** credit reservation, by explicit design.
4. Validate objective/CTA against the vertical's allowed lists (server-side, not just UI-side).
5. `executeWithUsageControl(...)` reserves credits, then runs everything below inside its closure — any thrown error auto-refunds via `usageControl.ts`:
   a. Build pipeline input (existing product or new-product-with-images).
   b. Write `campaigns/{id}` doc, `status: 'validating'` → `'analyzing'`.
   c. Run the internal 13-stage `GenerationPipeline.execute()` (below).
   d. `status: 'generating_creatives'` → `'validating_output'` (coarse bookend markers, not real-time per-stage progress).
   e. Persist `campaign_assets/{id}` docs.
   f. Map Truth Check result to final campaign status: `PASS → 'verified'`, `FAIL → 'failed'`, `REVIEW_REQUIRED → 'generated'`.
   g. Compute and store two independent staleness fingerprints (source facts, vertical facts).
   h. `finalizeReservation` (credits **charged even on Truth Check FAIL** — explicit design: "AI compute was genuinely spent on the attempt").
6. On any thrown error: campaign status set to `'failed'` with a client-safe error message (so frontend polling terminates), reservation refunded.

**Internal 13-stage pipeline** (`functions/src/services/ai/pipeline.ts:435-539`):
1. Business Understanding (Gemini structured text)
2. Product/Image Understanding (Gemini Vision if images present, then structured text)
3. Campaign Strategy (Gemini structured text, vertical-specific persona)
4. Localization Strategy (Gemini structured text)
5. Copy Generation (Gemini structured text — 5 headlines/ad copies/captions, 3 story/reel concepts, 1 WhatsApp message; hard-injects exact price/name/WhatsApp/location as mandatory requirements)
6. Creative Direction / Image Prompts (Gemini structured text)
7. Image Generation — **exactly one** real DALL-E-3 call per campaign (`MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN=1`), re-hosted to Firebase Storage for a permanent URL; all poster/story/reel variants are then produced **deterministically** by compositing verified facts onto that one hero image (`compositor.ts`, SVG, no further AI). If hero generation fails, the stage throws (whole generation refunded) — explicit fix for a prior bug where customers were charged for text-only output.
8. Truth Validation (AI-based) — **computed but not found to gate anything downstream**
9. Quality Validation (AI-based) — **same**
10. Safety Validation (AI-based) — **same**
11. **Truth Check (deterministic)** — the real gate (§18)
12. Campaign Assembly (deterministic — builds final asset list, sets pack status from Truth Check result)
13. Save Results — deferred to the caller (the pipeline class itself doesn't write to Firestore except the image-upload side effect in stage 7)

**Open question, flagged not confirmed**: stages 8-10's AI validation output does
not appear in `assembleCampaignPack`'s returned object and no call site was
found branching on `truthValidation.passed`/`qualityValidation`/`safetyValidation`
— they cost latency/tokens with no found effect on the outcome. Needs
independent confirmation before treating as dead weight vs. a wiring gap
(Unknown classification).

There is also a **`createCampaign`** callable (`functions/src/functions/campaigns/createCampaign.ts`)
that is a **separate, seemingly-vestigial path**: it reserves credits via a
*different* reservation function (`services/firestore.ts:reserveCredits`, not
`usageControl.ts`), writes a draft campaign doc, and **never finalizes or
refunds** the reservation — a live inconsistency (§20, §31). It does not run
the AI pipeline. In-code comments confirm the frontend actually calls
`generateCampaignStrategy`, not this function, but `createCampaign` remains
deployed and publicly callable.

## 16. AI Architecture

Provider abstraction under `functions/src/services/ai/`:
- `text.ts`: `GeminiTextProvider` (`gemini-flash-latest`, JSON response mode).
- `vision.ts`: `GeminiVisionProvider`, output Zod-validated before returning.
- `image.ts`: `OpenAIImageProvider` (DALL-E 3). **Lazily constructs the OpenAI client on first call, not at module import** — deliberate fix for a real deploy-breaking bug (the OpenAI SDK throws synchronously on missing key at construction).
- `retry.ts`: `withTimeout` + `withRetry` (max 3 attempts, exponential backoff); retries network/5xx/429/timeout errors only, never retries auth/api-key/schema-validation errors. **Image generation is deliberately never retried** (cost control).
- `index.ts`: wraps every provider call in timeout+retry (text 30s, vision 45s, image 60s).

API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) come exclusively from
`functions/src/config/env.ts` reading `process.env` (Cloud Functions
runtime/secrets) — **confirmed never accepted as request input and never
returned in any response** (no `apiKey` field in any Zod schema or output).
No client-side AI calls exist anywhere (§5). This matches the intended
architecture (`Browser → authenticated backend → AI abstraction → provider`)
exactly — no deviation found.

**README's stack table claims an NVIDIA provider; no NVIDIA implementation
was found in code.** Classify as a Documentation gap.

## 17. Prompt System

There is no `docs/PROMPT_SYSTEM.md`. The real prompt system lives entirely in
`functions/src/services/ai/pipeline.ts`'s stage builders, which pull
vertical-specific persona/system-rule strings from
`VerticalConfig.promptContext` (`config/verticals.ts`) and inject business
brain facts, localization rules, and campaign context per stage. A previously
separate `promptRegistry.ts` module was found (Phase 28) to be dead code never
imported by the pipeline, and was **deleted** in Phase 29 in favor of the
current single-source-of-truth `verticals.ts` config — this is documented,
resolved architectural drift, not a current issue.

## 18. Truth Check

**Fully deterministic** — confirmed by direct code read of the entire
`truthCheck.ts` module: every check is plain string/regex matching against
`JSON.stringify(copyPack).toLowerCase()`. **No AI/LLM call is made inside
Truth Check itself.** Runs synchronously as Stage 11 of the pipeline.

Checks include business name, product name, price (original/promotional),
location, WhatsApp/phone, offer validity, prohibited/unsupported claims,
operations/hours/minimum-order/delivery-radius, plus vertical-gated checks:
`checkVerticalCatalogClaims` (salon) and `checkPropertyFactClaims`
(real_estate, verifying bedroom/bathroom/area/possession-status/amenities
against the actual property catalog).

Statuses: `PASS`, `FAIL`, `REVIEW_REQUIRED`. Rollup: any `FAIL` → overall
`FAIL`; else any `REVIEW_REQUIRED` → overall `REVIEW_REQUIRED`; else `PASS`.

**Authority — confirmed server-authoritative, and confirmed enforced before
"active" status**:
- New campaigns: only `PASS` → `'verified'` (both `FAIL` and `REVIEW_REQUIRED` produce a non-verified status, though credits are still charged either way).
- Regeneration: `shouldActivateRegeneration` (the sole named gate) requires **exactly `PASS`** — `REVIEW_REQUIRED` is deliberately treated identically to `FAIL` ("fail closed" — there is no human-review UI in this codebase to unblock a `REVIEW_REQUIRED` asset).
- Reels have **no equivalent deterministic Truth Check at all** — correctness relies only on the AI edit-plan's own Zod schema validation and a 0.15 clip-quality-score filter. This is a real, confirmed asymmetry between the two generation pipelines.

Staleness detection: two independent, deliberately non-merged fingerprints
(source facts: phone/whatsapp/location/price; vertical facts: delivery
radius/minimum order/vertical profile snapshot). `isVerificationStale` is
read-only/informational (surfaced on `getCampaign`), never auto-revokes a
`verified` status.

## 19. Regeneration

`regenerateAsset.ts`: ownership double-checked (campaign↔asset↔type), credits
reserved keyed by the **client-supplied `idempotencyKey`** (not `campaignId` —
explicitly fixed after a bug where every regeneration after a campaign's
first one failed with `ALREADY_FINALIZED`). Runs the **full 13-stage pipeline
again** (not a targeted single-asset regen), then filters the resulting pack
down to the requested asset type.

**Confirmed invariant, unit-tested**: a `FAIL`/`REVIEW_REQUIRED` regeneration
is persisted as a new, separate `campaign_assets` doc with `status:'failed'`,
but the *original* active asset is **never overwritten or superseded** unless
the new one is `PASS`. This directly answers the audit question "can an
invalid regenerated version accidentally replace a valid active one?" —
**no**, by design and by an explicit regression test cited in code comments
("Phase 6 golden test: valid active asset + failed regeneration → valid asset
remains active").

## 20. Credits

**1 credit = ₹1**, enforced at `functions/src/config/pricing.ts:18`
(`creditValueINR: 1`) — a pricing convention, not something computed against
at runtime elsewhere. Costs: campaign generation = 140 credits (100 base + 2×20
image, though only 1 image call actually happens per §15 — worth reconciling
the "2×" constant against the confirmed single-call behavior, flagged Unknown),
regeneration = 10, reel generation = 80.

**Primary, correct system**: `functions/src/services/usageControl.ts`, used
by `generateCampaignStrategy`, `regenerateAsset`, `generateReel`:
- `reserveCreditsForOperation`: idempotency+eligibility decision made **inside
  a single Firestore transaction** (reads both `usage` and
  `transactions/{operationId}` via `tx.get()`), returning a discriminated
  outcome (`fresh`/`idempotent-pending`/`already-completed`/`already-refunded`/`insufficient`).
  This fixed a real, documented double-reservation bug (confirmed via a
  concurrency emulator test) where 140 credits could be reserved twice.
- `finalizeReservation` / `refundReservation`: both idempotent (no-op if
  already in the terminal state), both ownership-checked, both transactional.
- `executeWithUsageControl`: reserve → run generation → finalize on success /
  refund on any thrown error (refund failures are logged but never swallow
  the original error).

**Confirmed inconsistency**: `services/firestore.ts` contains a **second,
independent** `reserveCredits`/`confirmCredits` implementation, used only by
the vestigial `createCampaign.ts` callable, which reserves and never
finalizes/refunds. `confirmCredits` has zero call sites anywhere. This is a
live architectural-drift risk, not just historical — `createCampaign` remains
deployed and callable (§31).

Firestore rules independently guarantee no client can write to
`usage`/`transactions`/`subscriptions` (§11) — credit authority is enforced at
two independent layers (application logic + rules), which is good defense in
depth, but the two-reservation-system inconsistency above means "credit
authority" is not a single, uniform code path today.

## 21. Razorpay

`services/razorpay.ts`: HMAC-SHA256 webhook signature verification
(`verifyWebhookSignature`), **not constant-time compare** (`===` on hex
strings — theoretical timing-attack weakness, low real-world risk for a
32+ byte hex HMAC output, but worth normalizing to a constant-time compare).

`razorpayWebhook` (`onRequest`, HTTP not callable, correctly **no**
`enforceAppCheck`): rejects non-POST, requires the signature header, verifies
HMAC over the raw body, requires `event.id`, then **atomically claims**
`processed_webhook_events/{eventId}` inside a Firestore transaction before
processing — correctly transactional idempotency, with an explicit fix
documented for a prior race condition. On processing failure, deletes the
claim so Razorpay's own retry can reprocess. Per-event handlers write
`usage`/`transactions`/`subscriptions` inside further `db.runTransaction`
blocks for the actual credit grant.

**`verifyPayment.ts`** (client-invoked, UX-acceleration path): fetches the
payment from Razorpay's API and checks `status === 'captured'`. **Accepts a
`razorpaySignature` field in its Zod schema but never validates it in the
handler body** — the real trust boundary for this endpoint is Razorpay's own
API response, not a local signature check. This is not a security hole per se
(the webhook is the authoritative grant path — see below) but the accepted-
and-unused field is misleading and should be flagged.

**Source of truth for payment completion is the webhook**, not
`verifyPayment` — `createSubscription` writes `status:'incomplete',
creditsIncluded:0`; the actual credit grant happens only inside
`razorpayWebhook`'s transactional handlers.

## 22. Analytics

`trackAnalyticsEvent` (callable): the one function that bypasses
`validatedCallable`/Zod, does manual auth+whitelist validation, and has
explicitly stubbed-out ownership checks for `asset_downloaded`/
`whatsapp_clicked` events (§10). `getAnalyticsDashboard`: Admin-SDK read of
`analytics_events`, in-memory aggregation (pure, unit-tested function), capped
at 5000 events per query with a `truncated` flag surfaced to the caller rather
than silently under-reporting. `getCampaignPerformance` reads the separate
`campaign_performance` collection (written only by `recordWhatsAppClick`,
which is the sole authoritative, idempotent, ownership-checked WhatsApp-click
write path). Both events **and** rendered aggregation exist — there is a real
`/analytics` dashboard UI, not just stored-but-unused data.

## 23. Performance Engine

Per `docs/PERFORMANCE_ENGINE.md` (verified, not just asserted): **no scoring,
ranking, or recommendation logic reads performance data anywhere in this
codebase.** Only one real metric exists end-to-end: `whatsappClicks`
(event-sourced via `recordWhatsAppClick`, idempotent, real). `inquiries` is
**always `null`** — no WhatsApp Business API integration, booking webhook, or
lead-capture form exists anywhere (`whatsapp_leads` collection is
schema/rules/indexes only, zero code references). `docs/PERFORMANCE_DATA_READINESS.md`
explicitly warns future engineers not to flip this status just because a
schema/collection exists — this document's own caveat is confirmed accurate
by code inspection.

## 24. Vertical Architecture

See §1 and §7 above. All three verticals (`restaurant`, `salon`,
`real_estate`) have `implemented: true` and genuinely differentiated:
allowed-objectives/CTAs enforced server-side, distinct prompt personas
substituted into the pipeline, vertical-specific Business Brain schema
(`verticalProfile.services/packages` for salon, `.properties` for
real_estate), and dedicated Truth Check fact-checkers. This is real
implementation, not "an enum exists." The one confirmed cross-vertical gap:
`imagePromptBuilder.ts` (hero-image prompt builder) is **not** vertical-aware —
hardcodes food-photography language regardless of vertical, documented as a
known, unfixed gap in both Phase 30 and 31 reports, affecting only the 1
AI-generated hero image per campaign (poster/story/reel text and layout are
correctly vertical-aware via deterministic compositing).

## 25. Deployment

- **Frontend**: Vercel, via Vercel's own Git integration (`vercel.json` at root: `{"framework":"nextjs", "projectName":"brainwise-ai-marketing-engine", ...}`). **Not driven by this repo's CI/CD** — the workflow's own comments explain that Firebase-Hosting deploy jobs for the frontend were removed in Phase 19A because `firebase.json` has no `hosting` block at all.
- **Backend**: Firebase — Functions (`firebase deploy --only functions`), Firestore rules/indexes, Storage rules. Predeploy step builds `functions/` via `npm --prefix functions run build`.
- **`.firebaserc`** declares only **one** real project (`brainwise-ai-marketing-engine`) for both `default` and `dev` aliases. **`.github/workflows/ci-cd.yml` references `FIREBASE_PROJECT_ID_STAGING`/`FIREBASE_PROJECT_ID_PROD` as if two separate projects exist** — this cannot be confirmed or denied from repo state alone (GitHub Actions secrets aren't visible in the repo), and no phase report ever resolved this. **Documentation/config gap: Unknown whether a real staging/production split exists.**
- CI/CD pipeline (`.github/workflows/ci-cd.yml`): `frontend-lint`, `functions-lint`, `security-rules-test`, `test` (full emulator suite), then `deploy-backend-staging` (on push to `develop`) / `deploy-backend-production` (on push to `main`, gated by GitHub's `environment: production`). **The `test` job invokes `npm run test:unit`/`npm run test:integration`, but root `package.json` defines no such scripts** (only `test`, `test:coverage`, `test:e2e`) — this job would fail with "missing script" as currently checked in. This is a genuine, previously-unflagged CI defect.
- **No phase report, across 31 reports read, ever confirms a real production or staging URL was tested.** README's own "Remaining Issues" section states the repo "has not been deployed to a live production environment," and this is never contradicted by any later report through Phase 36.

## 26. Testing

Real, substantial automated coverage exists for: campaigns (creation,
strategy generation consistency/recovery/vertical-filtering tests), credits
(named "GOLDEN" concurrency/idempotency/refund-race tests in
`usageControl.concurrency.test.ts`), Truth Check (53 tests including
vertical-specific fact-checkers), Firestore/Storage security rules (4 files,
emulator-required), Razorpay webhook idempotency. Phase 36's last measured
totals: frontend 28 suites/280 tests, functions 32 suites/254 tests, root
rules suite 10 suites/116 passed.

**Confirmed weak/absent**:
- **App Check**: no dedicated automated test file exists at all — every App Check verification in the historical record was a manual, ad-hoc script run once by a phase-report author, never committed as a repeatable test.
- **Real Razorpay checkout**: never exercised end-to-end in any phase report — only the external `window.Razorpay` boundary is mocked in frontend tests; backend logic is proven only against a mocked Razorpay client.
- **Playwright E2E** (`tests/e2e/mvp-golden-path.spec.ts`): the spec's own header states it has never actually been executed via `npm run test:e2e` — Phase 28 explicitly rules this "zero verified coverage, not partial," despite the file existing and looking complete. Real-browser verification that *did* happen (Phases 20, 20B, 20C) was via ad-hoc, uncommitted Playwright scripts run directly by phase-report authors in their own sessions — not part of the repeatable, automated suite.
- **`golden-path-manual.mjs`** (root): a standalone, hand-invoked Playwright script, not referenced by `package.json` or CI — leftover tooling from a prior phase-report session (its hardcoded screenshot path literally contains a different session's temp directory ID), not reusable infrastructure.

**Do not equate "test suite passes" with "production system is verified."**
Every "PASS"/"FULLY VERIFIED" phase-report label found was a self-audit by the
same class of agent that built the feature, backed by real command output and
file citations (strong internal QA evidence) but never by independent
third-party or real-production verification.

## 27. Golden User Journey

```
Signup (Firebase Auth, direct) 
  → onUserCreated trigger (server): creates users/{uid}, subscriptions (free plan, 100 credits), usage doc, welcome transaction, sets custom claims
  → Onboarding UI → createBusiness callable (App Check + Auth + Zod + verifyBusinessAccess N/A for creation) → businesses/{id} + businessBrain written, users.businessIds updated, claims refreshed
  → /business-profile → updateBusinessBrain callable (schema-restricted fields only)
  → /products/new → getUploadUrl → client PUT to Storage → confirmUpload callable → createProduct callable
  → /campaigns/new (CampaignWizard) → generateCampaignStrategy callable:
      verifyBusinessAccess → rate limit → assertVerticalImplemented → objective/CTA validation
      → executeWithUsageControl (reserve 140 credits, transactional)
        → 13-stage GenerationPipeline (Gemini text/vision ×N, one DALL-E-3 call, deterministic Truth Check)
        → campaign status set from Truth Check result (verified/generated/failed)
        → finalizeReservation (charged regardless of PASS/FAIL/REVIEW_REQUIRED)
  → /campaigns/[id] → review, getCampaign (staleness check), download assets
  → WhatsApp click → recordWhatsAppClick callable (idempotent) → campaign_performance.whatsappClicks++
  → /analytics → getAnalyticsDashboard callable (server-side aggregation)
  → /billing → createSubscription callable → Razorpay Checkout.js (client) → razorpayWebhook (server, HMAC-verified, transactional, authoritative credit grant) [+ verifyPayment as a UX-acceleration confirmation, not authoritative]
  → Second campaign generation, using refreshed credit balance
  → Logout / Login → Firebase Auth session persistence (SDK default)
```

Every step that touches credits, Truth Check, or payment state goes through a
Cloud Function with App Check + Auth + Zod validation + explicit authorization
checks; every step that only reads non-sensitive, owned data goes directly to
Firestore from the client, gated by `firestore.rules`.

## 28. Source of Truth

| Information | Authoritative source |
|---|---|
| User identity | Firebase Auth |
| Business ownership | `businesses.userId` + custom claims, checked server-side (`verifyBusinessAccess`) |
| Business profile / Business Brain | Firestore (`businesses.businessBrain`), written only by `createBusiness`/`updateBusinessBrain` |
| Product | Firestore (`products`), server-generated ID |
| Asset binary | Firebase Storage |
| Asset metadata | Firestore (`assets`), server-created on `confirmUpload`; best-effort client patch for width/height only |
| Campaign | Firestore (`campaigns`), server-generated ID, field-locked on `status`/credits/Truth-Check |
| Truth Check status | Server-authoritative, deterministic, computed in `truthCheck.ts`, frozen once set by rules |
| Credits | Server-authoritative via `usageControl.ts` (primary path) — **but a second, non-finalizing path exists via `services/firestore.ts:reserveCredits`, used by the vestigial `createCampaign`** |
| Payment completion | `razorpayWebhook`'s HMAC-verified, transactional handler — **not** `verifyPayment` (which is UX-only) |
| AI secrets | `functions/src/config/env.ts` reading Cloud Functions runtime env — never client-exposed |
| App Check | Firebase App Check (ReCaptchaEnterprise), enforced per-function, never cryptographically verified locally (only in a real deployed project) |

## 29. Security Boundaries

The frontend directly reads Firestore extensively — this is safe **only**
because `firestore.rules` is the actual enforcement layer, not because the
frontend chooses not to write. The one confirmed direct client **write** path
(`brandKitService.upsert` on `/brand`, `src/app/brand/page.tsx:419`) is safe
because `brand_kits` contains no credit/billing/Truth-Check-authoritative
field — but it is architecturally inconsistent with every other mutation in
the app going through a Cloud Function, and should be treated as a candidate
for tightening (move to a callable) rather than a template to follow
elsewhere.

**What the client can never be trusted to control** (confirmed, not assumed):
credits/balance fields (rules `write: if false`), campaign `status`/Truth
Check result (rules field-lock + Zod schema exclusion, double-enforced),
custom claims (`role`/`businessIds`/`agencyId`, rules field-lock on `users`
after the Phase 11 fix), payment completion (webhook-only, HMAC-verified).

**Confirmed live authorization gap**: `trackAnalyticsEvent`'s stubbed
ownership check (§10, §22) — real but low-severity (write-only pollution of
analytics data, no financial or Truth-Check impact).

## 30. Architectural Constraints

- Every callable must remain wrapped in `validatedCallable` (or, if not,
  independently perform equivalent auth+validation — `trackAnalyticsEvent` is
  the one exception and it shows why deviating is risky).
- App Check enforcement is declarative per-function (`enforceAppCheck: true`)
  — never remove it as a debugging shortcut; the correct fix for local App
  Check friction is the documented debug-token flow, not disabling
  enforcement.
- Credit mutations must go through `usageControl.ts`'s
  reserve/finalize/refund pattern inside a Firestore transaction — the
  `services/firestore.ts:reserveCredits` path is a cautionary example of what
  happens when a second implementation exists (permanently-pending
  reservations, never reconciled).
- Truth Check must remain deterministic and must remain the sole gate for
  "verified"/asset-activation status — the AI-based validation stages (8-10)
  exist alongside it but do not (and per current design should not, unless
  deliberately re-architected) gate activation themselves.
- Vertical-specific logic belongs in `config/verticals.ts`'s `VerticalConfig`
  shape, consumed via `getVerticalConfigOrDefault` — not hardcoded per-vertical
  branches scattered through the pipeline (the one known exception,
  `imagePromptBuilder.ts`, is a documented, deliberately-deferred gap, not a
  pattern to copy).

## 31. Known Gaps

1. Two independent, non-interoperating credit-reservation systems (`usageControl.ts` vs. `services/firestore.ts:reserveCredits`); the latter's sole caller (`createCampaign.ts`) never finalizes/refunds its reservations.
2. `verifyPayment.ts` accepts but never validates a `razorpaySignature` field — dead/misleading input, not a security hole (webhook is authoritative).
3. `trackAnalyticsEvent.ts` bypasses the shared validation middleware and has stubbed ownership checks.
4. Rate-limit config key mismatches (`generateCampaignStrategy`, `getUploadUrl`) silently fall back to a lenient default limit.
5. AI-based Truth/Quality/Safety validation stages (8-10 of the pipeline) appear computed and discarded — unconfirmed whether this is intentional or a wiring gap.
6. Reels have no deterministic Truth Check equivalent.
7. Possible `usage` doc ID format mismatch between `onUserCreated.ts` and the shared `getUsageDocId()` helper — unconfirmed, needs direct verification.
8. `/onboarding` and `/reels*` routes lack route-level `ProtectedRoute` guards (relies on in-page checks only).
9. CI/CD's `test` job invokes `npm run test:unit`/`test:integration`, scripts that do not exist in `package.json` — this job would fail as checked in.
10. No confirmed real staging/production Firebase project split (`.firebaserc` declares only one project; CI/CD assumes two via secrets that can't be verified from the repo).
11. Content calendar and agency workspace UI were never built (acknowledged in README itself).
12. No error-tracking/Sentry integration (acknowledged in README).
13. Performance Engine has no scoring/ranking logic and only one real metric (`whatsappClicks`) — by design/documented status, not an oversight, but future agents must not treat the richer schema as operational.
14. Responsive UI has never been visually verified in a real browser viewport per the most recent (Phase 36) report — Tailwind classes are structurally consistent but unconfirmed visually.

## 32. Known Architectural Drift

- `functions/src/types/index.ts` declares `TruthCheckResult`/`TruthCheckItem` **twice** (lines ~58-93 and ~808-822) with slightly different shapes — maintenance risk, not currently a functional bug since call sites appear to consistently use one or the other.
- `src/features/ai/*.ts` — client-side type-only AI abstraction with zero implementation, seemingly a dead mirror of the real backend abstraction.
- `src/features/business-brain/services/businessBrainService.ts` — direct-Firestore client service with no confirmed call sites from any UI component; likely dead/legacy code.
- `.cursorrules` — stale Phase-1 instructions contradicting 36 phases of shipped work; should not be trusted by future agents (human or AI) who might otherwise read it as current guidance.
- `promptRegistry.ts` (dead code, deleted in Phase 29) — resolved drift, kept here as a historical note in case any stale reference to it remains in comments/docs.
- `agencies`, `clients`, `partners`, `partner_referrals`, `whatsapp_leads` collections: fully speculative, rules/indexes/types exist with zero implementation — safe (default-deny) but represent audit noise for future agents scanning the schema.

## 33. Future Architecture (FUTURE / PROPOSED — not implemented)

The following are referenced only as roadmap intent (README "Next Steps",
rules-file comments) and are **not implemented in any form**:
- Agency workspace UI (authorization primitives for it already exist and are tested — `verifyBusinessAccess`'s agency-member branch, `tests/phase27-authz.test.ts` — but no dedicated UI or `agencies`/`clients` collection usage exists).
- WhatsApp Business API lead capture (`whatsapp_leads` schema/rules/indexes are pre-provisioned).
- Content calendar.
- Partner referral program (`partners`/`partner_referrals` schema/rules/indexes are pre-provisioned).
- Any performance-driven ranking/recommendation logic (Performance Engine is currently read-only telemetry, not a decision system).
- A distinct staging Firebase project, if `.firebaserc`'s single-project declaration is in fact the current real state (unconfirmed either way).

## 34. Rules For Future AI Agents

1. Read this document (`docs/ARCHITECTURE_AI_CONTEXT.md`) before modifying code.
2. Read the relevant Phase report(s) in `docs/` before modifying domain behavior they cover — but treat every phase report as a point-in-time self-audit, not a current-state guarantee; cross-check against the code.
3. Never assume documentation (including this file, in six months) is current — verify actual implementation before acting on any claim.
4. Never weaken Firebase security rules to make a test pass.
5. Never disable App Check (`enforceAppCheck`) as a debugging workaround — use the documented debug-token flow for local development instead.
6. Never trust client-provided ownership (`businessId`, `userId` in payloads) — always re-derive from `request.auth`/custom claims and re-verify via `verifyBusinessAccess`.
7. Never trust a client-provided credit balance or reservation state.
8. Never trust a client-provided Truth Check status — it is deterministic, server-computed, and rules-frozen for a reason.
9. Never expose AI provider secrets (`GEMINI_API_KEY`, `OPENAI_API_KEY`) to the client, in responses, or in logs.
10. Never expose Razorpay secrets (webhook secret, key secret) to the client.
11. Never put Admin SDK credentials in the browser bundle.
12. AI generation must remain behind the Cloud Functions boundary — the client-side `src/features/ai/*` type-only files are not a pattern to extend with real implementations.
13. Authorization must remain server-enforced (`verifyBusinessAccess` + Firestore/Storage rules) — a frontend check is UX only, never a security boundary.
14. Payment completion must remain webhook-authoritative (`razorpayWebhook`'s HMAC-verified path) — `verifyPayment` is a UX accelerator only, never treat it as the source of truth.
15. Truth Check must remain server-authoritative and deterministic — do not add an AI-based override that can flip a `FAIL`/`REVIEW_REQUIRED` result to `PASS`.
16. Credit mutations must remain server-authoritative and must go through `usageControl.ts`'s transactional reserve/finalize/refund pattern — do not add a third parallel reservation system; if anything, retire `services/firestore.ts:reserveCredits`/`confirmCredits` and its sole caller `createCampaign.ts` rather than building around them.
17. Do not add a new implementation when an existing shared service should be reused (e.g. do not build a third credit-reservation path; do not duplicate `verifyBusinessAccess`).
18. Do not duplicate campaign/AI/credit/Truth-Check logic for a new UI surface (e.g. Reels correctly reuses `usageControl.ts` but currently lacks a Truth Check equivalent — closing that gap should reuse `truthCheck.ts`, not invent a parallel checker).
19. A future MCP server or agent surface should call the existing Cloud Functions / shared services layer, never reimplement business logic against Firestore directly.
20. Do not call a feature "implemented" merely because a type, enum, Firestore rule, or index exists — `agencies`, `clients`, `partners`, `whatsapp_leads` all have schema/rules with zero real implementation; verticals looked the same way at Phase 28 before Phase 29-31 made them real. Always distinguish schema from implementation from integration from real-world validation.
21. Never fabricate test results or claim coverage that doesn't exist — this document's testing section (§26) is based on direct file enumeration and grep, not phase-report claims alone; keep that standard.
22. Never claim browser verification without real, current browser evidence — Phase 36 itself explicitly declined to claim this ("no browser tool available in this environment"), and Phase 20C's real-browser success was environment-specific, not a standing guarantee.
23. Never claim production verification when only emulator testing occurred — remember that the local Functions emulator does not cryptographically verify Auth/App Check tokens (`FIREBASE_DEBUG_MODE` unsafe-decode path); "passes in the emulator" and "passes in production" are not the same claim.
