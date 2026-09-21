# Phase 33 — Business Brain: Customer UI

## Objective

Give the business owner a customer-facing way to review and edit the information Mitra uses to
generate marketing, without exposing the internal Business Brain data model. The UI is framed as
"Your Business Profile," never as a raw database editor.

## What was built

### Frontend — `/business-profile`

- `src/app/business-profile/layout.tsx` — same `ProtectedRoute` + `Sidebar` wrapper every other
  protected route uses (`/analytics`, `/products`, `/billing`).
- `src/app/business-profile/page.tsx` — the page itself, organized into exactly the sections the
  brief asked for: **Business, Brand, Products/Services, Audience, Location & Language, Marketing
  Preferences, Business Rules.** Every label is plain language ("Business name", "Who is your
  typical customer?") — nothing on the page is named after a Firestore field path or the
  `BusinessBrain` type.
- `src/components/layout/Sidebar.tsx` — added a "Business Profile" entry to the account nav menu,
  first in the list (same pattern Phase 32 used for "Analytics").
- `src/types/index.ts` — added the frontend `BusinessBrain.verticalProfile` shape (services/
  packages/appointmentSettings/properties) and `businessRules.operatingMode`, mirroring the
  backend type exactly — the frontend type was missing these entirely before this phase, which
  would have made the salon/real-estate editors impossible to type correctly.

### Backend — `updateBusinessBrain`

- `functions/src/functions/business/updateBusinessBrain.ts` (new Cloud Function) — Zod-validated,
  `verifyBusinessAccess`-gated. Patches `businessBrain.brand` (tone/personality/visualPreferences
  only), `.audience`, `.localization`, `.businessRules` (safe subset: `deliveryRadiusKm`,
  `minimumOrder`, `offerValidityRules`, `pricingRules`, `operatingMode`), and `.verticalProfile`
  (salon services/packages/appointmentSettings, or real-estate properties — rejects vertical
  fields sent for the wrong category, e.g. `services` on a restaurant). Existing core `Business`
  fields (name/category/location/contact/description) continue to go through the existing
  `updateBusiness` function, per the brief's "reuse onboarding fields" instruction — no second
  write path was created for those.
- `functions/src/index.ts` — exports the new function.

### Campaign Impact — Truth Check staleness extended

The brief required: *"If existing campaign versions depend on old facts: do not silently treat
them as newly verified. Existing Truth Check rules must remain authoritative. If the architecture
requires re-verification: implement it."*

Before this phase, staleness detection (`isVerificationStale`, from Phase 6/13) only covered
`businessRules`/`verticalProfile`. Because this phase makes those two fields editable for the
first time post-generation, they needed to feed the staleness check too — otherwise editing them
would silently leave old campaigns looking "verified" against facts that no longer exist.

- `functions/src/services/ai/truthCheck.ts` — added `computeVerticalFactsFingerprint()` and
  extended `isVerificationStale()` with two new optional parameters (`storedVerticalFingerprint`,
  `currentVerticalFacts`). This is a **separate, independent fingerprint** from the existing
  `computeSourceFingerprint`/`sourceFingerprint` — deliberately not merged into it. Merging would
  have changed the hash input for every existing business, which would make every pre-Phase-33
  campaign's stored fingerprint fail to match on next read, spuriously flagging all of them stale
  for a schema change rather than an actual fact change. The new fingerprint is only consulted
  when a campaign actually has one stored.
- `functions/src/types/index.ts` — added `TruthCheckResult.verticalFingerprint?: string`.
- `functions/src/functions/campaigns/generateCampaignStrategy.ts` — computes and stores
  `verticalFingerprint` alongside the existing `sourceFingerprint` at generation time.
- `functions/src/functions/campaigns/getCampaign.ts` — on read, recomputes the current vertical
  facts fingerprint from the business's current `businessRules`/`verticalProfile` and compares it
  to the stored one, exactly the same read-only, non-mutating pattern the original mechanism uses
  (the stored Truth Check result itself is never rewritten — only the `isVerificationStale` flag
  returned to the caller changes).
- The frontend surfaces this to the owner directly: any save that touches a fingerprinted field
  (Business location/contact, Business Rules, Products/Services) shows an inline
  `⚠️ Campaigns generated with the old details will now show as outdated when you view them`
  notice, using the same warning color tokens (`bg-warning-50 text-warning-600`) the existing
  campaign detail page already uses for stale campaigns.

### What was deliberately left alone

- **Brand**: `businessBrain.brand` is a write-once field the generation pipeline never reads
  (confirmed during the Phase 33 audit — `generateCampaignStrategy.ts` reads brand data from the
  separate `brand_kits` collection via `getBrandKitDoc`, not from `businessBrain.brand`). Building
  a second edit form for a dead field would let a user believe they changed their brand voice when
  they hadn't. The Brand section instead shows a read-only summary of the real, live `brand_kits`
  document and links to the existing `/brand` page, which already edits it correctly.
- **Products/Services for restaurants**: no product-edit UI exists anywhere in the app (confirmed
  by audit — `updateProduct.ts` exists on the backend but has no frontend caller). Building one was
  out of this phase's scope; the restaurant section instead shows a read-only summary and links to
  `/products`. This gap is unchanged from before this phase, not introduced by it.
- **Category**: shown but disabled. Changing a business's category post-onboarding would orphan
  its `verticalProfile` shape (a salon's `services` array under a `restaurant` category, for
  example) and is a structural change, not a Business Brain edit — out of scope for this phase.

## Verification

### Read / Edit / Save / Cancel

- `src/app/business-profile/page.test.tsx` (10 tests, all passing): loading state, empty state (no
  business), real data rendering (proves the page shows actual Business Brain values, never
  invented placeholders, and never leaks internal names like "BusinessBrain" or security-critical
  terms like "credits"/"Truth Check"/"tenant"), edit+save calling `updateBusiness` with the correct
  payload, cancel discarding unsaved edits without ever calling a Cloud Function, category being
  genuinely disabled, a load-error retry path, the salon inline editor rendering real service data,
  the restaurant read-only summary linking to `/products`, and the Brand section linking to
  `/brand` instead of duplicating an edit form.

### Validation

- Zod schemas on both `updateBusiness` (pre-existing) and the new `updateBusinessBrain` reject
  anything outside their declared shape — enums (brand tone, service category, property type,
  possession status, etc.) are the exact same enums already used elsewhere in the codebase
  (`createBusiness.ts`), not invented for this page.

### Authorization / Tenant isolation

- `functions/src/functions/business/updateBusinessBrain.test.ts` (6 tests, run against the
  Firestore + Auth emulators, all passing):
  - Owner edits persist and survive a fresh read.
  - **Cross-tenant**: a second user cannot call `updateBusinessBrain` against another user's
    business — rejected, and the target document is provably unchanged afterward.
  - Salon-only fields (`services`/`packages`) are rejected for a restaurant business.
  - A salon business can add/edit services and packages (closing the Phase 30 gap where no
    post-onboarding edit path existed).
  - Sending security-critical fields (`credits`, `truthCheckStatus`, `userId`, `tenantId`,
    `agencyId`, `billingState`) alongside a legitimate edit is silently stripped by Zod — the
    business document's real `userId` and the unrelated fields are proven unchanged after the
    call. There is no code path from this function to any of those fields; they simply don't
    appear in its schema.
  - `functions/src/functions/campaigns/getCampaign.test.ts` (pre-existing, still passing)
    continues to prove cross-tenant isolation on the read side.

### Campaign integration / Truth Check invalidation

- `functions/src/services/ai/truthCheck.test.ts` — 5 new tests under "Phase 33 —
  verticalFingerprint covers Business Brain fields newly editable post-generation":
  - A vertical-only fingerprint change (no core fingerprint stored) still triggers staleness.
  - A `verticalProfile` (services/packages/properties) change triggers staleness.
  - A campaign generated before Phase 33 (no stored `verticalFingerprint`) is never flagged stale
    on this new dimension — preserves exact backward compatibility.
  - Core (Phase 6) and vertical (Phase 33) staleness are independent — either alone is sufficient
    to flag a campaign stale.
  - A pinned golden-fingerprint regression test proves `computeSourceFingerprint`'s output is
    unchanged by this phase's additions (guards against the exact bug that was avoided during
    implementation: merging the new fields into the original fingerprint function).
- `getCampaign.test.ts`'s existing Golden Test 10 (product price change → stale campaign) still
  passes unmodified against the extended `isVerificationStale` call.

### Mobile responsiveness

- All new sections use the same responsive utility classes (`grid-cols-1 sm:grid-cols-2`, etc.)
  already used throughout `/brand`, `/products`, and `/analytics` — no new layout primitives were
  introduced. Not verified in an actual mobile browser/viewport in this session (no browser
  available in this environment); verified structurally by reusing the exact same responsive
  patterns as the pages that are already in production use.

### Regression suite

- Frontend: `npx tsc --noEmit` — clean. `npx next build --no-lint` — compiles and generates
  `/business-profile` as a static page (6.91 kB). Full `npx jest --coverage=false` — **16 suites,
  187 tests (180 passed, 7 skipped — emulator-gated), 0 failures.**
- Backend: `npm run typecheck` — clean. `npm run build` — clean. Full `npx jest --coverage=false`
  against the Firestore + Auth emulators — **31 suites, 244 tests, 0 failures** (this run
  surfaced and fixed one pre-existing test's mock of `services/ai/truthCheck` that didn't include
  the new `computeVerticalFactsFingerprint` export — `generateCampaignStrategy.vertical.test.ts`).
- Lint: the repository has a pre-existing, repo-wide CRLF/prettier lint failure affecting nearly
  every file (confirmed present on the unmodified `master` baseline via `git stash` — 1180
  pre-existing errors in `truthCheck.ts` alone, and `npm run build`'s lint gate already fails on
  baseline `master`). This is not something this phase introduced; the specific new/changed files
  in this phase (`updateBusinessBrain.ts`, `business-profile/page.tsx`, `Sidebar.tsx`, etc.) have
  **zero non-CRLF lint errors** when isolated from that pre-existing repo condition.

## Known limitations / not fixed in this phase

- **Firestore rules gap (pre-existing, not introduced by this phase)**: `firestore.rules` allows
  direct client SDK writes to `businesses/{businessId}` gated only by
  `resource.data.userId == request.auth.uid`, with no field-level restriction — unlike
  `users/{userId}` and `campaigns/{campaignId}`, which already have field-level rules. This means
  the "Do not allow users to modify: credits, Truth Check status, ownership, tenant IDs,
  authorization, billing state" guarantee is fully enforced by the `updateBusiness`/
  `updateBusinessBrain` Cloud Functions built in this phase (the intended, and only actually used,
  write path — `businessService.update`'s raw client write is not called anywhere in this new
  page), but is not enforced at the Firestore security-rules layer itself. Locking that down with
  field-level rules is a pre-existing gap worth a dedicated follow-up phase, since it touches every
  existing caller of `businessService.update`, not just this one.
- Restaurant product editing still has no dedicated UI (unchanged limitation from before this
  phase, documented here rather than silently left out).

## Final Verdict

**FULLY VERIFIED**
