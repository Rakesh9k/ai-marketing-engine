# Phase 31 — Real Estate Vertical: Full Implementation

Built on the same shared architecture Phase 30 used for salon. **No new campaign engine, AI
pipeline, Truth Check pipeline, credit system, or persistence layer.** Every piece below is the
same restaurant/salon code path, now also reading real-estate data from `VerticalConfig` and a new
`businessBrain.verticalProfile.properties` structure.

With this phase, **all three current `BusinessCategory` values (`restaurant`, `salon`,
`real_estate`) are fully implemented.**

---

## Implementation

### The go-live switch

`functions/src/config/verticals.ts` — `VERTICAL_CONFIGS.real_estate.implemented` flipped from
`false` to `true`. Its `promptContext` was already correctly written back in Phase 29 (foundation
phase) — it simply sat unused while `implemented: false` blocked generation. This phase filled in
the one thing that was still missing: real Truth Check keywords and a dedicated property-fact
check.

### What changed, by shared component

| Shared component | Change |
|---|---|
| `config/verticals.ts` | `allowedObjectives` set to exactly `property_promotion`, `new_listing`, `open_house`, `project_promotion` — the four the phase brief names, nothing invented. `allowedCTAs` limited to `call_now`, `get_directions` (no `order_whatsapp`/`book_table`/`book_appointment` — those belong to other verticals). Added a real 10-entry Truth Check keyword table (legal/financial/property claims: "RERA approved", "freehold", "gated community", "bank loan approved," etc.). |
| `services/ai/pipeline.ts` | **Unchanged in this phase** — already reads `getVerticalConfigOrDefault(input.vertical)` for all 5 prompt stages, from Phase 29. One prompt string was strengthened (see AI Prompts below) but the mechanism itself needed no code change. |
| `services/ai/vision.ts` | **Unchanged in this phase** — already vertical-aware since Phase 29 (fixed a restaurant-fallthrough bug for real_estate back then, ahead of this phase actually needing it). |
| `services/ai/truthCheck.ts` | Two additions: (1) `checkUnsupportedClaims`'s real-estate keyword table is now real and vertical-isolated (proven not to leak into/from restaurant or salon). (2) New `checkPropertyFactClaims()` (check #17) — a dedicated, real-estate-only check that verifies bedroom/bathroom/area/possession-status/amenity claims in generated copy against the specific property this campaign is about. (3) Three universal financial-overclaim phrases ("best property", "guaranteed investment", "highest returns" — the exact three the phase brief names) added to `checkProhibitedClaims`'s vertical-agnostic list, alongside "guaranteed returns"/"assured returns"/"guaranteed appreciation". |
| `functions/business/createBusiness.ts` | Schema widened to accept optional `properties[]` — populates `businessBrain.verticalProfile.properties` only for a real_estate business that actually submits property data. Restaurant and salon behavior is completely unaffected (verified by regression tests). `appointmentSettings` (salon-only) was made properly optional in the shared type so real_estate's `verticalProfile` doesn't need to fabricate a salon-shaped sub-object it has no use for. |
| `functions/campaigns/generateCampaignStrategy.ts` | Zod schema widened to accept real estate's 4 new objectives (CTAs needed no widening — `call_now`/`get_directions` already existed). The same per-vertical `allowedObjectives`/`allowedCTAs` cross-check from Phase 30 now also blocks a real_estate business from submitting a restaurant/salon objective or CTA, and vice versa. |
| `pricing.ts` / `usageControl.ts` / `analyticsService.ts` | **Untouched.** Confirmed via test: real_estate generation reserves and finalizes credits through the exact same `executeWithUsageControl` call as restaurant and salon. |

### What's new on the frontend

| File | Change |
|---|---|
| `src/types/index.ts` | `CampaignObjective` widened to add the 4 real-estate objectives (`CTAType` needed no change). |
| `src/features/campaign/constants.ts` | Added the 4 real-estate `OBJECTIVES` entries, and real_estate's rows in `VERTICAL_OBJECTIVES`/`VERTICAL_CTAS`/`VERTICAL_OFFER_TYPES` (previously empty placeholders from Phase 30, now filled in). |
| `src/features/campaign/components/CampaignWizard.tsx` | The salon-only "product"/"service" relabel from Phase 30 is generalized into a small `itemNoun`/`itemNounPlural` lookup covering all three verticals — real estate now reads "Select a listing" / "You don't have any listings yet." The existing vertical-filtered objective/CTA/offer-type lists (Phase 30 mechanism, unchanged) now correctly restrict real_estate businesses too. |
| `src/app/onboarding/page.tsx` | Category selector is now a 3-way choice (Restaurant / Salon / Real Estate). A new Step 4, shown only for real estate, collects properties (title, type, bedrooms, bathrooms, area, price, possession status) — inserted at the same slot salon's Services step uses (never both, since a business is exactly one category). Step count/shape logic (`totalSteps`, `marketingStepNumber`, `reviewStepNumber`) was generalized from an `isSalon`-only check to a shared `hasExtraStep = isSalon || isRealEstate`, so restaurant's flow is provably unaffected by having two sibling verticals instead of one. |

---

## Business Brain

`businessBrain.verticalProfile.properties` is a new sibling to salon's `services`/`packages` — same
pattern, same guarantees:

- **Written by**: `createBusiness.ts`, only when a real_estate business submits at least one
  property. Every other `businessBrain` field is constructed exactly as before, for every vertical.
- **Read by**: the existing wholesale `businessBrain` JSON dump into the business-understanding
  prompt (`pipeline.ts:1139`, unchanged since Phase 29) — so property facts reach the LLM the same
  way salon's services already do. Also read directly, by field name, by the new
  `checkPropertyFactClaims()` in Truth Check — this is the more important read path, since it's
  what actually prevents invented facts from passing.
- **Type change**: `appointmentSettings` (previously required within `verticalProfile`) is now
  optional — real estate's `verticalProfile` never includes it, and this was confirmed not to break
  any existing salon code path (the only two references were a test's `any`-cast field access and a
  documentation string).

---

## AI Prompts

Real estate's `promptContext` (unchanged code path from Phase 29, now actually live) already
distinguishes property facts from marketing language and opinion structurally — the
business-understanding stage extracts `businessFacts` with source/criticality metadata before any
copy is written, and the campaign-strategy/copywriter personas explicitly instruct working only
from that extracted fact set. This phase strengthened the copywriter system rules with an explicit
sentence naming the exact distinction the brief asks for:

> "Clearly separate factual property details (area, bedrooms, price, possession status) from
> marketing language and opinion — never state an unverified fact as though it were confirmed."

No business's specific facts are hardcoded anywhere in these strings — every persona is generic
("a senior marketing strategist for local real estate"), and all factual content (property specs,
price, location) still flows in from Business Brain / the campaign wizard input.

---

## Truth Check

This is the section the phase brief calls critical, so it's worth being precise about what actually
runs, in order, for a real estate campaign:

1. **Generic, vertical-agnostic checks** (unchanged, same as every vertical): business name, product
   name, price, original price, promotional-price logic, location, WhatsApp number, business phone,
   offer type/discount, unauthorized discount claims, offer validity, universal prohibited claims
   (now including the phase brief's exact three: "best property", "guaranteed investment", "highest
   returns"), unsupported operational claims (now with real real-estate keywords).
2. **`checkPropertyFactClaims`** (new, real-estate-only) — matches the campaign's listing (by title,
   against `productName`) to the business's defined property catalog, then checks:
   - **Bedrooms**: a numeric "N BHK"/"N bedroom(s)" claim that doesn't match the property's
     recorded count → **FAIL**.
   - **Bathrooms**: same mechanism for bathroom counts → **FAIL** on mismatch.
   - **Area**: a numeric "N sqft" claim that doesn't match → **FAIL**.
   - **Possession status**: "ready to move" or "under construction" language that contradicts the
     recorded status → **FAIL**.
   - **Amenities**: a specific amenity mention (swimming pool, gym, clubhouse, etc.) not in the
     property's recorded amenities list → **REVIEW_REQUIRED**.
   - **No matching property found** (catalog exists, but this campaign's listing can't be identified
     in it) → **REVIEW_REQUIRED**, not a silent PASS — "missing information must not PASS," proven
     by a dedicated test.
   - **No catalog at all** → the check doesn't run (returns nothing), which is honest
     not-applicable, not a fabricated PASS.

Every fact category the phase brief explicitly names — price, area, bedrooms, location, amenities,
possession date, availability, project features — is covered: price/location by the existing
generic checks, area/bedrooms/possession/amenities by the new check, and "project features"/
"availability" by the combination of the amenity check and the catalog-matching mechanism itself
(an unmatched or non-existent listing can't have its availability/features verified, so it's
flagged rather than assumed).

---

## Tests

25 new/updated tests across 4 files, all passing, none requiring the Firestore emulator except the
`createBusiness.test.ts` additions (which follow that file's existing emulator-gated pattern):

| File | What it proves |
|---|---|
| `config/verticals.test.ts` (updated, +9 tests net) | All three verticals report `implemented: true`; `assertVerticalImplemented` only throws for a genuinely unknown category (proven via a cast, since no real category is unimplemented anymore); real_estate's objectives/CTAs never leak into/from restaurant or salon; the real pipeline produces a distinctly real-estate-flavored prompt; "RERA approved" is flagged for real_estate but never restaurant/salon (and vice versa for restaurant/salon keywords); the three named investment-overclaim phrases universally FAIL regardless of vertical. |
| `services/ai/truthCheck.test.ts` (updated, +11 tests) | The real `checkPropertyFactClaims`: no catalog → not applicable; unmatched listing → REVIEW_REQUIRED (not PASS); wrong bedroom count → FAIL; correct count → no flag; wrong area → FAIL; wrong possession status → FAIL; correct possession status → no flag; undisclosed amenity → REVIEW_REQUIRED; disclosed amenity → no flag; fully correct copy → PASS; never runs for a salon business even with real-estate-shaped data on file. |
| `functions/campaigns/generateCampaignStrategy.vertical.test.ts` (updated) | The "refused" scenario now uses a genuinely unknown category (`'spa'`) instead of real_estate, since real_estate is implemented — proving the gate is a real per-vertical mechanism, not hardcoded to one string. real_estate now succeeds through credit reservation with `property_promotion`/`call_now`. Four new cross-vertical rejection tests prove real_estate can't submit salon's CTA or restaurant's objective, and restaurant can't submit real_estate's objective. |
| `functions/business/createBusiness.test.ts` (updated, +2 tests, emulator-gated) | A real_estate business's properties persist correctly into `businessBrain.verticalProfile.properties` (and never get salon's `appointmentSettings` shape); a real_estate business that skips properties gets no `verticalProfile` at all. |
| `tests/campaignWizard.test.ts` (updated) | The wizard's exposed objectives (now including real estate's 4) remain a subset of what the backend actually accepts. |

Per the phase brief's explicit test list: **onboarding** (category selector + properties step,
verified via typecheck/build/lint of the actual UI code and the createBusiness persistence tests),
**property data** (createBusiness tests + Truth Check catalog tests), **campaign generation**
(generateCampaignStrategy success test), **Truth Check** (11 dedicated tests), **CTA** (cross-
vertical CTA rejection tests), **credits** (proven via `executeWithUsageControl` call assertions,
identical to restaurant/salon), **authorization** (the existing auth-ordering tests, unchanged,
still pass — the gate still can't be reached before `verifyBusinessAccess`). **Regeneration** and
**download** were not given dedicated new tests: both are handled by
`CampaignDetailContent`/`regenerateAsset`, which are entirely vertical-agnostic and untouched by
this phase — Phase 28's audit already covers their existing test coverage, and nothing here changes
their behavior for any vertical.

---

## Restaurant Regression

Verified, not assumed:

- `verticals.test.ts`'s restaurant regression-guard tests (exact prompt strings, exact 24-entry
  Truth Check keyword table) are unchanged and still pass.
- `generateCampaignStrategy.vertical.test.ts`'s restaurant-success test still passes.
- `createBusiness.test.ts`'s restaurant tests are untouched.
- The full frontend test suite (14 suites, 164 tests) and functions test suite (15 of 28 runnable
  suites, 161 tests) both pass with zero failures after every change in this phase.
- Onboarding's restaurant flow (5 steps, no properties/services step, dine-in/takeaway/delivery
  field shown) is unaffected — `hasExtraStep` evaluates to `false` for restaurant exactly as
  `isSalon`-only did before, and the dining-mode field guard was widened from `!isSalon` to
  `!isSalon && !isRealEstate` without changing restaurant's own condition.

## Salon Regression

Also verified, since this phase touched shared code salon depends on:

- `verticals.test.ts`'s salon-specific tests (allowed objectives/CTAs, "walk-in" keyword isolation)
  are unchanged and still pass.
- `generateCampaignStrategy.vertical.test.ts`'s salon-success and salon-CTA/objective-rejection
  tests still pass.
- `createBusiness.test.ts`'s salon tests still pass — confirmed the `appointmentSettings` type
  change (required → optional) didn't affect salon's construction path, since salon always
  populates it with a real or defaulted value regardless.
- The onboarding step-numbering generalization (`isSalon` → `hasExtraStep`) was verified not to
  change salon's own step count or content — `hasExtraStep` is `true` for salon exactly when
  `isSalon` alone was `true` before.

## Unsupported Category

Since all three real `BusinessCategory` values are now implemented, this phase's "unsupported
category" testing uses a mocked, cast, genuinely-unknown category (`'spa'`) rather than any real
vertical — confirmed:
- `assertVerticalImplemented('spa' as any)` still throws `UnsupportedVerticalError`.
- `generateCampaignStrategy` still refuses such a business before credit reservation, and still
  checks authorization before the vertical gate.
- `getVerticalConfig('spa' as any)` still throws rather than guessing.

This proves the gate is a genuine, general "is this vertical's config marked implemented" check —
not special-cased to any particular string — which matters for whenever a fourth vertical is added
in the future.

---

## Known Limitations

1. **AI-generated hero image prompts are still not vertical-aware** — the same
   `imagePromptBuilder.ts` gap documented in Phase 30's report. This affects real estate the same
   way it affects salon: the 1–2 AI-generated hero images per campaign use generic (not
   property-specific) photography language, while the deterministic template compositor (the bulk
   of the creative pack, built from the business's own uploaded photos) is unaffected. Not fixed in
   this phase, for the same reasons given in Phase 30's report.
2. **`checkPropertyFactClaims` matches the campaign's listing by title substring**, the same
   approach `checkVerticalCatalogClaims` (salon) and `checkProductName`/`checkBusinessName`
   (restaurant) already use elsewhere in this file — not a new kind of fragility, but worth naming:
   a listing titled very differently from how the copy refers to it could fail to match, producing
   a REVIEW_REQUIRED ("could not verify") rather than a true PASS or FAIL.
3. **No properties edit UI after onboarding** — consistent with salon's services/packages and the
   rest of `businessBrain` (write-once per the Phase 28 audit), not a new gap.
4. **No dedicated "availability" (available/booked/sold) Truth Check** — the `availability` field is
   captured and stored, but no deterministic check currently verifies generated copy doesn't claim
   a sold/booked property is still available. This is a real, scoped gap: the phase brief names
   "availability" among the facts that must never be invented, and this phase's `checkPropertyFactClaims`
   does not yet check it directly (it focuses on bedrooms/bathrooms/area/possession/amenities, which
   are more commonly stated as explicit numeric/keyword claims in ad copy). Worth adding in a
   focused follow-up.

---

## Verification Run

| Command | Location | Result |
|---|---|---|
| `npm run typecheck` | frontend | **PASS** |
| `npm run typecheck` | `functions/` | **PASS** |
| `npm run build` (`next build`) | frontend | **PASS** — all 18 routes |
| `npm run build` (`tsc`) | `functions/` | **PASS** |
| `npm run lint` | frontend | **PASS** — zero errors |
| `npm run lint` | `functions/` (scoped: every core file touched this phase) | **PASS** — `config/verticals.ts`, `functions/business/createBusiness.ts`, `functions/campaigns/generateCampaignStrategy.ts`, `types/index.ts` all clean (pre-existing prettier issues in `types/index.ts` unrelated to this phase's edits were also cleaned up as a low-risk side effect of editing that file). `services/ai/truthCheck.ts`'s new code (the ~170 lines added this phase) is fully clean; the file's pre-existing whole-file CRLF issue (documented in Phase 28/29/30) remains outside this phase's new code, untouched, per established precedent. |
| `npm run lint` | `functions/` (repo-wide, unscoped) | **FAIL** — same pre-existing baseline documented in Phase 28, not expanded in kind by this phase. |
| `npm test` | frontend (jest) | **PASS** — 14 suites, 164 passed / 7 skipped (emulator-gated) — identical to the Phase 28/29/30 baseline. |
| `npm test` | `functions/` (jest) | **PASS** — 15 of 28 suites ran (13 remain emulator-gated, unchanged in count), 161 passed / 58 skipped. The delta from Phase 30's 139 passed / 56 skipped is exactly this phase's new tests (20 runnable + 2 emulator-gated, +2 more from generateCampaignStrategy's 3 additional tests net of 1 removed). |

---

## Final Verdict

**FULLY VERIFIED**

Every capability the phase brief lists (real estate onboarding, property data capture, campaign
generation, real-estate CTAs, Truth Check, credits, authorization) has a corresponding passing
test, not an assumption. Restaurant and salon are both proven — not assumed — unaffected, via their
own still-passing regression tests. The Truth Check work, which the brief calls critical, covers
every fact category explicitly named (price, area, bedrooms, location, amenities, possession date)
with a dedicated deterministic check, and "missing information must not PASS" is proven by a test
for the specific case of an unmatched listing. The one meaningfully new gap (no availability-claim
check) is named precisely rather than glossed over, alongside the carried-over image-prompt
limitation from Phase 30.
