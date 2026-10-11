# Onboarding Redesign — Phase A Audit (read-only)

**Date:** 2026-10-04. **No code, rules, config or data were changed to produce this document.**
Baseline (CLAUDE.md): 38 suites / 687 tests passed, 0 failed, 127 skipped. Tests were *not* re-run
in this phase because nothing changed; the baseline stands.

Evidence is cited as `file:line` where it was read directly. Items marked **(unverified)** were
inferred and need checking before the phase that depends on them.

---

## 1. CURRENT FLOW

```
LANDING  (/)                       src/app/page.tsx → LandingPage
  ├─ hero prompt box  → /signup?business=<text>      (query param is NEVER read anywhere → dropped)
  ├─ "Get Started"    → /signup
  └─ already signed in → router.push('/dashboard')

SIGNUP  (/signup)  PublicOnlyRoute redirectTo="/onboarding"
  ├─ Email+password + Terms checkbox
  │     signupWithEmailPassword → recordConsentAcceptance (failure only console.error'd)
  │     → shows "Verification email sent" notice
  │     BUT the user is already signed in, so PublicOnlyRoute sends them to /onboarding
  │     (emailVerified is not enforced by any guard, rule or function — only authService reads it)
  └─ Google (GoogleSignInButton)
        isNewUser → explicit consent step → recordConsentAcceptance → window.location = /onboarding
        returning → onSuccess → /onboarding   (SignupForm hard-codes /onboarding for both)

LOGIN  (/login)  PublicOnlyRoute (default redirectTo '/dashboard')
  └─ success → window.location = ?redirect || '/dashboard'   (never checks onboarding state)

VERIFY-EMAIL (/verify-email) → "I've verified" → /onboarding

ON FIRST AUTH USER CREATE (Auth trigger onUserCreated, functions/.../auth/onUserCreated.ts)
  users/{uid} {businessIds: []}, subscriptions (free), usage, welcome-credit transaction,
  custom claims {role:'user', businessIds: []}

ONBOARDING  (/onboarding)   src/app/onboarding/page.tsx   — NO ProtectedRoute, NO layout guard
  mount → businessService.getByUserId (client Firestore read)
          ≥1 non-archived business with category → step 100 (completion screen)
  steps (all state in one useState; nothing persisted until the end):
    1 name, category(3), tagline            ─┐
    2 city, state, locality, address, pin    │ client-validated, "required" = name/category/
    3 phone, whatsapp, email, hours, dining  │ city/state/phone/whatsapp
    4 (salon: services/packages | RE: properties) — conditional
    4/5 language, goals, regional style, content style
    5/6 review → submit
  submit → createBusiness (callable) → getIdToken(true) → step 100

createBusiness  (functions/.../business/createBusiness.ts)
  App Check + Zod → requireBusinessAllowance → build Business + seeded businessBrain
  → createBusinessDoc → users.businessIds arrayUnion → trackEvent(ONBOARDING_COMPLETE)
  → setCustomClaims  (all sequential, NOT transactional)

COMPLETION (Step8Completion)  → /campaigns/new  or  /dashboard

DASHBOARD (/dashboard, ProtectedRoute via layout)
  0 businesses → "No business set up yet" empty state with a link to /onboarding (not forced)
```

---

## 2. Inventory

| Area | Where |
|---|---|
| Routes | `/`, `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`, `/onboarding`, `/dashboard`, `/business/*` (profile, brand, audience, localization, locations, offers, preferences, products, rules), `/business-profile`, `/brand`, `/campaigns/new`, `/welcome` (Paddle post-checkout — unrelated to onboarding) |
| Guards | `ProtectedRoute` / `PublicOnlyRoute` (client-side, `src/features/auth/components/ProtectedRoute.tsx`); `src/proxy.ts` only does launch-scope gating (not auth) |
| Auth | `authService.ts`, `useAuth`/`useAuthStatus`, `LoginForm`, `SignupForm`, `GoogleSignInButton` |
| Business Brain | embedded `businesses/{id}.businessBrain` (type `functions/src/types/index.ts:382`), written by `createBusiness`, partially edited by `updateBusinessBrain` / `updateBusiness`; UI at `/business/*` and `BusinessBrainDashboard` |
| Brand data (2nd source) | `brand_kits/{businessId}` via `createBrandKit`/`updateBrandKit` (+ one direct client write path `brandKitService.upsert` on `/brand`, per prior audit) |
| AI | factory `services/ai/factory/aiProviderFactory.ts`; Gemini text/vision (`@google/generative-ai`), DALL-E image, Photoroom bg removal; `VisionAI` interface has **only** `analyzeReferenceStyle(imageUrl)` |
| Uploads | `getUploadUrl` (V4 signed URL; jpeg/png/webp; ≤10 MB; `assetType` includes `logo`, `brand-kit`), `confirmUpload` (re-verifies size/type) |
| Rules | Firestore: client **read** on own business/brand_kit; all business writes `if false` (Cloud Functions only). Storage: `businesses/**` write `false`, `temp/**` closed |
| Mascot | `components/mascot/*` — states incl. `curious`, `analyzing`, `discovering`, `thinking`, `waving`, `success`, `proud`, `love`, `rocket`, `sleeping`; three mascot components exist (`ui/MitraMascot`, `mascot/MitraMascot`, `mascot/Mascot`) |
| Motion | `components/motion/*`: `Reveal`, `CountUp`, `MagneticButton/Wrap`, `AmbientBackground`, `BusinessBrainGraph`, `AIGenerationTimeline`, `InteractiveCard` |
| Landing | already implements most of the animation brief: `KineticEffects`, `MarqueeTicker`, `InteractiveDeviceMockup`, `LiveImpactSection`, `FloatingCards`, `ConnectingLines`, `AmbientBackground`, `JournalResourceSection` |
| Analytics | `ANALYTICS_EVENTS` has only `SIGNUP`, `ONBOARDING_COMPLETE` for this flow; `trackAnalyticsEvent` has a hard allow-list (7 events) |
| Tests touching onboarding | `src/app/onboarding/page.test.tsx`, `functions/.../createBusiness.test.ts`, `onboardingToCampaignE2E.test.ts`, `tests/e2e/mvp-golden-path.spec.ts`, auth component tests |

---

## 3. Preserve / Refactor / Remove / Missing

### Preserve
- Auth stack (email + Google), consent recording (`recordConsentAcceptance`), `onUserCreated` provisioning.
- `createBusiness` server-side authority: App Check, Zod, entitlement check, claims minting from `context.token`.
- Firestore/Storage rules posture (server-only writes). Do not loosen.
- Signed-URL upload + `confirmUpload` re-verification.
- `getIdToken(true)` after claims change.
- `updateBusinessBrain` as the single post-onboarding write path; Truth Check and vertical configs.
- Mascot and motion primitives (`Reveal`, `MagneticButton`, `BusinessBrainGraph`, `AIGenerationTimeline`).
- Landing page animation work.

### Refactor
- `/onboarding` page: replace the monolithic form wizard with a question-engine shell (state is one 500-line component).
- `createBusiness`: make creation atomic/idempotent; accept the richer Brain shape additively.
- Post-auth routing: one decision function (new / partial / complete) used by login, signup, verify-email, landing.
- `BusinessBrain` types are **duplicated** in `functions/src/types/index.ts` and `functions/src/types/enums.ts`, and again in `src/types` — consolidate before extending.
- Landing nudge: wire the dead `?business=` param or remove it.

### Remove
- `ScrollReactiveBackground`, mouse parallax and scroll-velocity listeners in the onboarding page.
- Orphaned `Step6BrandStyle` (not imported anywhere); misnamed step files (`Step2BusinessType` is actually step 4).
- `category === 'other' ? 'restaurant'` silent coercion.
- Duplicate mascot component(s) once one canonical one is chosen.

### Missing
- Auth guard on `/onboarding` (an anonymous visitor can fill the whole wizard, then fails at submit).
- Any progress persistence / resume (only "has business → completion screen").
- Server-side or guard-level "onboarding complete" signal; `login` never checks it.
- Provenance/confidence metadata on Brain fields.
- Fields for: owner context, subcategory/industry, USP/positioning, offerings beyond vertical profile, content pillars, preferred formats, logo variants, detected colors/tagline.
- Campaign Brain as a persisted/typed concept (today the wizard builds it per request client-side: `CampaignWizard.tsx:198`).
- Central context builder (see §5).
- Logo analysis (no `VisionAI` method, no image-processing library in `functions/package.json`: no sharp/jimp).
- Onboarding analytics events beyond `SIGNUP` / `ONBOARDING_COMPLETE`.

---

## 4. Findings that change the plan (architectural)

These are the items most likely to bite later phases. Flagged now, per CLAUDE.md "document and stop rather than expand scope".

**F1 — Draft-vs-business ordering conflict (blocks Phases I–K, 28).**
Logo upload (`getUploadUrl`) and brand kit both require an existing `businessId`
(`verifyBusinessAccess`), and `businesses/**` is server-write-only. But the redesign wants to save
progressively and create the Brain at the *end*. Options: (a) create the business doc early as a
`status: 'draft'` and finalize at the end; (b) add a user-scoped onboarding draft doc plus a
user-scoped upload path (new Storage rule). **Needs a decision before Phase D.** Recommendation: (b)
for answers (`onboarding_drafts/{uid}`, server-written via callable, debounced) and (a) only at the
logo step, or create the business after the category/name steps.

**F2 — Logo upload is entitlement-gated.**
`createBrandKit` calls `requireFeature(…, 'brandKit')`; `brandKit: false` for Free and Starter
(`entitlements.ts:47,62`). Onboarding's logo step would fail for exactly the users onboarding targets.
Needs a product decision: store the logo on the Business Brain (ungated) and keep BrandKit as the
paid feature, or ungate logo-only at onboarding.

**F3 — New categories vs the generation engine.**
`BusinessCategory = 'restaurant' | 'salon' | 'real_estate'`; `VERTICAL_CONFIGS` is a
`Record<BusinessCategory, …>`, and `assertVerticalImplemented` blocks unimplemented verticals.
Retail/Healthcare/Education/Fitness/etc. cannot generate campaigns today. Recommendation: keep
`category` as the *engine vertical* and add additive `industry` + `subcategory` fields; decide
explicitly what an unsupported industry can do (generic vertical vs "coming soon").

**F4 — Two sources of brand truth.**
`businessBrain.brand` vs `brand_kits/*` already drift (documented in
`docs/BUSINESS_BRAIN_ARCHITECTURE_AUDIT.md` §B). Onboarding must write to one and derive the other,
not add a third.

**F5 — AI cost model.**
AI calls run through `executeWithUsageControl` and spend credits. Free = 100 credits/month and a
campaign costs 140 (from prior QA notes, `prod_qa_session_2026_10_04`). Logo analysis during
onboarding must either be free/uncapped by design or have its own cost, and the "first campaign"
CTA is currently unreachable on Free. Decide before Phase J/Q.

**F6 — Full-object AI context.**
`generateCampaignStrategy` passes the whole `businessBrain` and `getBrandCreativeContext(brandKit)`
into the pipeline (`generateCampaignStrategy.ts:470-475`). `getBrandCreativeContext` only adapts
BrandKit. There is no `buildMitraContext`. Phase 26 is a net-new module and must be introduced
without breaking the 12-stage pipeline (additive adapter first).

**F7 — Hard allow-list on analytics events.**
`trackAnalyticsEvent` rejects anything not in a 7-item list. New onboarding events need the
allow-list and `ANALYTICS_EVENTS` extended in Phase D/E.

---

## 5. Bugs in the current flow (carried from earlier audit + this pass)

1. Tamil (`ta`) selectable in UI but rejected by `createBusiness` / `updateBusinessBrain` Zod enums.
2. `email`, `pincode`, `businessHours`, `goals` collected but never sent.
3. `requireBusinessAllowance` is check-then-write; concurrent submits can exceed the plan limit.
4. Partial-failure trap: if analytics/claims throw after the doc is written, retry hits
   `BUSINESS_LIMIT_REACHED` and claims were never minted.
5. `/onboarding` has no auth guard.
6. Email signup lets an unverified user straight into onboarding; verification is advisory only.
7. `login` ignores onboarding state, so an authenticated user with no business lands on an empty dashboard.
8. Hero `?business=` param is dropped.
9. Existing-business fetch failure is swallowed (`console.error`), so a returning user can see a blank wizard.

---

## 6. Potential regressions to guard

- Existing businesses created by the old flow (`businessBrain` without new fields) must keep
  loading: all new fields optional; `getBusiness`/`updateBusinessBrain` merges must tolerate absence.
- `generateCampaignStrategy` / `createCampaignFromCalendarItem` read `businessBrain.*` directly.
- `firestore.rules` `users/{uid}` update rule pins `businessIds`/`role`/`agencyId`; any onboarding
  state on the user doc must not touch those.
- `onboardingToCampaignE2E.test.ts`, `createBusiness.test.ts`, `onboarding/page.test.tsx` encode the
  current behavior and will need updates (not deletion).
- Custom-claims refresh timing (`getIdToken(true)`) must survive any new multi-step finish.
- `AGENTS.md`: this Next.js has breaking changes — read `node_modules/next/dist/docs/` before writing
  routing/guard code in Phase B/C.

---

## 7. Proposed design (for confirmation, not yet implemented)

**Three user states (Phase 41):**
- A new — no business, no draft → full flow.
- B partial — draft exists → resume at last answered question ("Welcome back…").
- C complete — business with required fields → dashboard, no interruption.
- Legacy business (old flow) → treated as C; missing high-value fields (USP, audience, tagline…)
  surface through Progressive Completion, never a forced restart.

**Single routing decision** `resolvePostAuthDestination(user)` → `/onboarding | /onboarding?resume | redirectParam | /dashboard`,
used by login, signup, verify-email, landing and `/onboarding` itself.

**Question engine (config, not branching JSX):**
`QuestionDefinition { id, field, purpose, type, options(ctx), required|useful|optional|discoverable,
condition(known), priority }` + `nextQuestions(known) → ≤2`. Category→subcategory→offering options
live in a data file keyed by industry. UI renders any definition; no per-question components.

**Brain provenance (additive):** a sibling `knowledge` map keyed by field path →
`{ value?, source: USER_CONFIRMED|AI_DETECTED|AI_INFERRED|UNKNOWN, confidence, confirmed, updatedAt }`.
Existing flat fields stay the read model for the current pipeline; provenance is written alongside.
Rule: an `AI_*` write never overwrites a `USER_CONFIRMED` entry (enforced server-side, unit-tested).

**Campaign Brain** stays per-campaign input (already how it works); formalize its type and add
`buildMitraContext({businessBrain, campaignBrain, request, prefs})` as an additive adapter used first
by new code, then adopted by the pipeline.

---

## 8. Recommended phase order (adjusted from the spec)

1. **B** Landing nudge (+ wire/remove `?business=`), after reading Next docs.
2. **C** `resolvePostAuthDestination` + `/onboarding` auth guard + login routing (fixes bugs 5–8).
3. **Decision gate:** F1 (draft storage), F2 (logo gating), F3 (categories), F5 (credits).
4. **D–G** shell, question engine, personal/category/subcategory (draft persistence lands here).
5. **H** schema + provenance + atomic/idempotent create (fixes bugs 1–4).
6. **I–K** logo/vision/tagline/colors (needs F1, F2, F5 settled).
7. **L–O**, **P–Q**, **R–S** as specified.

## 9. Decisions needed from you

1. Draft storage: separate `onboarding_drafts/{uid}` (recommended) vs early `status:'draft'` business?
2. Logo at onboarding: store on Brain (ungated) vs keep gated behind the paid Brand Kit?
3. Non-restaurant/salon/real-estate industries: generic engine path, or "coming soon" until a vertical is implemented?
4. Does onboarding AI (logo analysis, pillar generation) cost credits, or is it free?
5. Enforce email verification before onboarding, or keep it advisory?
