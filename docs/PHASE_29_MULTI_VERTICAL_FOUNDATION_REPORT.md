# Phase 29 — Multi-Vertical Foundation Hardening

**Scope: foundation only.** Salon and real_estate are NOT fully implemented in this phase —
restaurant remains the only shippable, generation-eligible vertical. No new UI, no salon/real_estate
selection exposed anywhere, no salon/real_estate Truth Check dictionaries built out. What changed is
the *architecture* that would let those verticals be finished later without duplicating the
campaign engine, AI pipeline, Truth Check, credits, or analytics.

---

## What was audited first

Per the phase brief, before writing any code:

- **`BusinessCategory`** — `'restaurant' | 'salon' | 'real_estate'`, defined independently (and
  identically) in both `functions/src/types/index.ts` and `functions/src/types/enums.ts`
  (pre-existing duplication, not introduced or resolved here — out of this phase's scope).
- **`VerticalProfile`** (`businessBrain.verticalProfile`) — confirmed, per the Phase 28 audit, to be
  fully dead: declared in the type, never written by `createBusiness.ts`, never read anywhere. Left
  as-is; this phase does not touch Business Brain's data model.
- **`CampaignObjective`/`CTAType`** — `types/index.ts`'s versions already carry salon/real-estate-shaped
  values (`service_promotion`, `book_appointment`, etc.) that the Zod schema in
  `generateCampaignStrategy.ts` doesn't yet accept. Not widened in this phase — expanding what the
  wizard can actually submit is vertical-completion work, not foundation.
- **`PromptRegistry`** — this was the most important finding. `functions/src/services/ai/promptRegistry.ts`
  defined versioned, vertical-aware prompt templates with real salon/restaurant branches. A
  repo-wide grep proved it was **never imported or called by anything** — the code that actually
  runs generation (`pipeline.ts`) used its own hard-coded, restaurant-only, Hyderabad-only strings.
  This is exactly the "parallel system" the phase brief prohibits, except it already existed before
  this phase, just silently. **It has been deleted**, not merged or fixed — VerticalConfig (below)
  replaces its purpose and is actually wired into the live path.
- **`GenerationPipelineInput`** — already had an (unused-until-now) `vertical?: 'restaurant' | 'salon'
  | 'real_estate'` field, populated by `generateCampaignStrategy.ts` (`vertical: business.category`)
  but never read by the pipeline itself. Now it's the thing that selects a `VerticalConfig`.
- **Truth Check** — the LIVE Truth Check is `runDeterministicTruthCheck` in `truthCheck.ts` (keyword/fact
  matching, no LLM). A *separate*, LLM-based Truth Check (`runTruthValidation` in `validationStages.ts`,
  with its own restaurant-hardcoded persona) exists but is **only ever called by its own test file** —
  confirmed dead, same pattern as `promptRegistry.ts`. It was left in place (not deleted) because
  touching it wasn't necessary to satisfy "Truth Check receives correct vertical context" — the
  system that actually runs doesn't use it. Flagging its existence here so it isn't mistaken for
  live behavior in a future phase.

---

## Architecture delivered

```
Vertical (BusinessCategory: 'restaurant' | 'salon' | 'real_estate')
   ↓
VerticalConfig  (functions/src/config/verticals.ts — NEW, single source of truth)
   ↓
Shared Campaign Engine   (GenerationPipeline in pipeline.ts — unchanged structure, now reads config)
   ↓
Shared AI Pipeline       (same text/image/vision providers — unchanged)
   ↓
Shared Truth Check       (runDeterministicTruthCheck — unchanged structure, now reads config)
   ↓
Shared Credits           (usageControl.ts — completely untouched, see below)
   ↓
Shared Analytics         (analyticsService.ts — completely untouched)
```

### `functions/src/config/verticals.ts` (new)

A `VerticalConfig` per vertical, holding **only what genuinely differs**:

- `implemented: boolean` — the go-live switch. `true` for restaurant, `false` for salon/real_estate.
  This is load-bearing, not documentation (see the generation-time gate below).
- `allowedObjectives` / `allowedCTAs` / `allowedOfferTypes` — vertical-appropriate subsets.
- `requiredBusinessFields` / `optionalBusinessFields`.
- `terminology` — e.g. "dish" vs "service" vs "listing".
- `promptContext` — the exact strings that select a persona/system-rule for each of the pipeline's
  5 prompt-building stages (business understanding, product understanding, campaign strategy, copy
  generation, creative direction) plus the vision-analysis persona.
- `truthCheckClaimKeywords` — the operational-claim keyword table Truth Check checks against
  Business Brain facts (e.g. a restaurant claiming "free delivery" must be backed by a fact).

**Restaurant's config is a byte-for-byte extraction, not a rewrite.** Every string in
`RESTAURANT_CONFIG` was copied verbatim from what used to be hard-coded in `pipeline.ts`,
`vision.ts`, and `truthCheck.ts` — proven by `verticals.test.ts`'s exact-string regression
assertions. **Salon and real_estate have `implemented: false` and an empty
`truthCheckClaimKeywords: []`** — deliberately: an empty table is honest about not having built
salon/real-estate Truth Check rules yet; guessing at one would be exactly the kind of half-built
vertical work this phase is scoped to avoid.

`getVerticalConfigOrDefault(category)` falls back to the restaurant config for any unrecognized
category value — this is the backward-compatibility guarantee: a legacy or malformed Firestore
document behaves exactly as it did before this phase (previously, every vertical ternary's `else`
branch was restaurant; this preserves that).

### Wiring into the shared pipeline (not a new one)

- **`pipeline.ts`** — the 5 prompt-builder methods (`buildBusinessUnderstandingPrompt`,
  `buildProductUnderstandingPrompt`, `buildCampaignStrategyPrompt`, `buildCopyGenerationPrompt`,
  `buildCreativeDirectionPrompt`) now read their vertical-specific sentence(s) from
  `getVerticalConfigOrDefault(input.vertical ?? input.businessCategory)` instead of containing them
  literally. The 13-stage pipeline structure, every other stage, and all provider calls are
  untouched.
- **`vision.ts`** — the `salon`/`restaurant` ternary in `buildAnalysisPrompt` is replaced by the same
  config lookup. This incidentally **fixes a real bug**: `real_estate` used to silently fall through
  to the restaurant/food-analyst persona; it now gets its own (still foundation-only) persona. Since
  real_estate generation is blocked entirely by the new gate (below), this fix has no live effect
  yet — it only matters once real_estate is actually turned on.
- **`truthCheck.ts`** — `checkUnsupportedClaims` now takes a third `vertical` parameter and sources
  its keyword table from `getVerticalConfigOrDefault(vertical).truthCheckClaimKeywords` instead of a
  local hard-coded array. `runDeterministicTruthCheck` passes `input.vertical` through. Every other
  check in Truth Check (business name, price, location, WhatsApp number, prohibited-claims, etc.) is
  untouched and vertical-agnostic, as it always was.

### The generation-time gate (`generateCampaignStrategy.ts`)

This is the actual hardening, not just a refactor. Previously, nothing stopped a salon or
real-estate business from generating a campaign — it would just silently receive restaurant-shaped
content, an incorrect-but-non-obvious failure mode. Now:

```
verifyBusinessAccess(...)          ← auth, unchanged, still first
checkRateLimit(...)                ← unchanged, still second
business = getBusinessDoc(...)     ← moved earlier (was inside the credit-reservation callback)
assertVerticalImplemented(business.category)   ← NEW — throws before any credits are touched
executeWithUsageControl(...)       ← credit reservation, only reached if the vertical is implemented
```

`getBusinessDoc` was moved from inside the `executeWithUsageControl` callback to just before it,
specifically so `assertVerticalImplemented` can run — and reject — **before credits are ever
reserved**, rather than reserving-then-refunding for a generation that was always going to be
refused. `business` is then reused via closure inside the callback instead of being re-fetched.
Every other line of that function (brand kit / product fetch, campaign document creation, pipeline
invocation, Truth Check fingerprinting, analytics events, error handling) is unchanged.

An unsupported vertical throws `UnsupportedVerticalError`, caught by the existing catch block and
mapped to `HttpsError('invalid-argument', ...)` via `mapErrorToHttpsError` in `utils/errors.ts`,
exactly like every other domain error in this function already was.

---

## A real cross-boundary regression, found and fixed during this phase

`UnsupportedVerticalError` was initially implemented extending the existing `AppError` class
(`utils/errors.ts`), which imports `HttpsError` from `firebase-functions/v2/https`. Since
`verticals.ts` is imported by `pipeline.ts`/`truthCheck.ts`/`vision.ts`, and those files are in turn
imported **across the frontend/backend boundary** by `tests/truthCheck.test.ts` (a frontend-side
Jest test that reaches directly into `functions/src` via a path alias), this pulled
`firebase-functions` → `firebase-admin`'s App Check stack → `jose` (an ESM-only package) into the
frontend's CJS Jest run, and broke that test suite (`SyntaxError: Unexpected token 'export'`).

**Fixed**: `UnsupportedVerticalError` is now a plain `Error` subclass with no runtime dependency on
`utils/errors.ts` or `firebase-functions` — `verticals.ts` has zero runtime imports at all (only a
type-only import, erased at compile time). `utils/errors.ts` (a backend-only file, never imported
across that boundary) special-cases `UnsupportedVerticalError` in `mapErrorToHttpsError` instead.
Verified fixed: `tests/truthCheck.test.ts` passes again (21/21), and the full frontend suite is back
to its pre-phase baseline (14/14 suites, 164 passed, 7 emulator-gated skipped — identical to the
Phase 28 numbers).

This is called out explicitly because it's the kind of mistake "don't duplicate the AI pipeline"
work is specifically prone to: a config module that looks backend-only can silently acquire a
frontend-breaking dependency the moment it reaches for a convenience import. `verticals.ts`'s file
header now documents this constraint for future editors.

---

## Backward compatibility

- **No Firestore migration.** No document shape changed. `business.category` is read exactly as
  before; nothing new is written to any Business, Campaign, or Product document.
- **Existing restaurant businesses are provably unaffected**: `verticals.test.ts` asserts the exact
  restaurant prompt strings and the exact (24-entry) Truth Check keyword table match what was
  previously hard-coded, and `generateCampaignStrategy.vertical.test.ts` proves a restaurant request
  still reaches `executeWithUsageControl` and the pipeline exactly as before.
- **Any legacy/malformed `category` value** (should one ever exist) falls back to the restaurant
  config via `getVerticalConfigOrDefault`, matching the old ternaries' implicit `else` behavior.

---

## Tests added

`functions/src/config/verticals.test.ts` (13 tests) and
`functions/src/functions/campaigns/generateCampaignStrategy.vertical.test.ts` (5 tests) — 18 new
tests, all passing, none requiring the Firestore emulator (fully mocked), so they run in every
environment, including this one where the emulator-gated consistency/recovery suites skip.

| Requirement from the brief | Proven by |
|---|---|
| Restaurant configuration unchanged | `verticals.test.ts` — exact-string assertions for every prompt-context field and the full keyword table |
| Unsupported vertical features cannot accidentally appear | `verticals.test.ts` — `implemented`/`assertVerticalImplemented` assertions; `generateCampaignStrategy.vertical.test.ts` — salon/real_estate requests rejected with the exact "not yet supported" message |
| Shared campaign engine accepts vertical configuration | `verticals.test.ts` — the real (private, via reflection) `buildCopyGenerationPrompt` produces different, vertical-appropriate text for `restaurant` vs `salon` |
| Truth Check receives correct vertical context | `verticals.test.ts` — the real `runDeterministicTruthCheck` flags an unsupported "parking" claim for restaurant but not for salon (empty keyword table) |
| No vertical can bypass credits | `generateCampaignStrategy.vertical.test.ts` — `executeWithUsageControl` is asserted **never called** for salon/real_estate; asserted called normally for restaurant |
| No vertical can bypass authorization | `generateCampaignStrategy.vertical.test.ts` — `verifyBusinessAccess`/`checkRateLimit` are asserted called even for a business that will be refused; a `verifyBusinessAccess` rejection is asserted to happen **before** the business/vertical is ever fetched |

---

## What was explicitly NOT done (by design)

- Salon/real-estate onboarding UI, wizard fields, or category selector — none added.
- Salon/real-estate Truth Check claim dictionaries — left as empty arrays, not filled in.
- Widening the `generateCampaignStrategy` Zod schema to accept salon/real-estate objectives/CTAs
  (`service_promotion`, `book_appointment`, etc.) — the type-level values already exist in
  `types/index.ts`; the API surface was not widened to accept them, since doing so without also
  finishing the vertical would be a half-open door with no real coverage behind it.
- The dead LLM-based Truth Check in `validationStages.ts` — not deleted, not vertical-ized, since it
  isn't part of the live path.
- Fixing the pre-existing `BusinessCategory` type duplication between `types/index.ts` and
  `types/enums.ts` — noted, not touched; out of this phase's scope.
- Fixing the repo-wide functions-lint CRLF/tsconfig-project issues documented in
  `docs/PHASE_28_GAP_AUDIT.md` — those are pre-existing (see Verification below); this phase's new
  test files land in the same, already-documented gap rather than expanding scope to fix it.

---

## Verification Run

| Command | Location | Result |
|---|---|---|
| `npm run typecheck` | frontend | **PASS** |
| `npm run typecheck` | `functions/` | **PASS** |
| `npm run build` (`next build`) | frontend | **PASS** — all 18 routes, unchanged from before this phase (no frontend files touched) |
| `npm run build` (`tsc`) | `functions/` | **PASS** |
| `npm run lint` | frontend | **PASS** — zero errors (unaffected, no frontend changes) |
| `npm run lint` | `functions/` (scoped to touched/new files) | **PASS** for `config/verticals.ts`, `config/verticals.test.ts`, `services/ai/vision.ts`, `services/ai/pipeline.ts` (only 2 pre-existing, unrelated `require-await` warnings), `functions/campaigns/generateCampaignStrategy.ts`, `functions/campaigns/generateCampaignStrategy.vertical.test.ts`, `utils/errors.ts` — all clean. `services/ai/truthCheck.ts` still reports its pre-existing, whole-file CRLF errors (confirmed starting at line 1, i.e. present before this phase's ~4-line edit there — not introduced by it). The two new `*.test.ts` files trigger the same pre-existing "not found in tsconfig project" parse error that already affected 7 other test files per the Phase 28 audit (functions/'s `tsconfig.json` deliberately excludes `**/*.test.ts` from the build project, which ESLint's type-aware parser also uses) — not a regression, but now affects 2 more files; left unfixed per this phase's scope (Phase 28 already recommended fixing this as its own priority-1 item). |
| `npm run lint` | `functions/` (repo-wide, unscoped) | **FAIL** — same pre-existing ~1,600-error baseline documented in Phase 28, plus the 2 new test-file parse errors noted above. Not a Phase 29 regression; not fixed here, per phase scope. |
| `npm test` | frontend (jest) | **PASS** — 14 suites, 164 passed / 7 skipped (emulator-gated) — identical to the Phase 28 baseline. (A regression was introduced and then fixed mid-phase — see "A real cross-boundary regression" above — this is the post-fix, confirmed-clean result.) |
| `npm test` | `functions/` (jest) | **PASS** — 15 of 28 suites ran (13 remain emulator-gated, unchanged from Phase 28), 125 passed / 53 skipped. The +2 suites / +18 tests versus Phase 28's baseline (13 of 26, 107 passed) are exactly this phase's two new test files. |
| `functions build` | `functions/` (`tsc`, same as build row above) | **PASS** |

---

## Final Verdict

**FULLY VERIFIED**

Every requirement in the brief has a corresponding, passing, non-emulator-dependent test. Restaurant
behavior is proven byte-identical via exact-string regression tests, not just "should be fine."
Salon and real_estate are structurally supported by the config and gated shut for generation — not
half-working, not silently producing wrong content. A real regression (the frontend/backend Jest
boundary break) was caught by actually running the full verification suite rather than only the
new tests, and is fixed and confirmed clean. The only failing command (`functions/`'s repo-wide
lint) fails for pre-existing reasons fully documented in Phase 28, unchanged in kind by this phase,
and is called out rather than hidden.
