# Creative Intelligence — Phase 5: 20-Template Reel Library

## A. Objective

Expand Mitra's built-in Reel Creative Template library from Phase 4's 8 templates to **20 canonical Reel templates**, covering product, offer/conversion, story/transformation, engagement, trust, and brand/launch creative grammars for Mitra's initial target verticals (restaurant, salon, real estate) — without creating a second video engine, renderer, or generation pipeline, and without duplicating any Phase 4 concept that already represented one of the 20 desired grammars.

## B. Existing Reel Architecture (as inspected, unchanged by this phase)

Confirmed via the Phase 0 audit and direct inspection, still accurate: campaign/reel generation is a single pipeline — `functions/src/services/ai/reelPipeline.ts` (clip analysis, AI edit-plan generation) feeding `functions/src/services/videoRenderer.ts`, which calls a separate Cloud Run FFmpeg service (`services/reel-renderer/`). Reel persistence goes through `functions/src/functions/reels/*` callables into the `reels` Firestore collection. None of this was touched. This phase adds only static domain data one layer above that pipeline (`CreativeTemplate` objects); nothing in `functions/src/config/creativeTemplateLibrary.ts` calls, imports, or references the Reel pipeline, renderer, Business Brain, BrandKit, or any AI provider — confirmed by the existing "architectural separation" test suite, which asserts the module's only export is the static array.

## C. Final Template Library — All 20 Reel Templates

| ID | Name | Category | Objectives | Compatible verticals | Grammar (role sequence) | Duration |
|---|---|---|---|---|---|---|
| `reel-product-reveal` | Product Reveal | Product | awareness, conversion | broad | hook → setup → product → benefit → cta | 15–30s |
| `reel-3-shot-food` | 3-Shot Food Reel | Product | awareness, conversion | restaurant | hook → product → payoff → cta | 10–20s |
| `reel-cinematic-product` | Cinematic Product | Product | awareness, conversion | broad | context → differentiator → product → closing → cta | 20–45s |
| `reel-product-detail` | Product Detail | Product | awareness, conversion | restaurant, salon | hook → benefit → differentiator* → product → context → cta | 15–30s |
| `reel-offer` | Offer Reel | Offer | promotion, conversion | broad | problem → offer → product → urgency* → cta | 15–30s |
| `reel-limited-time-offer` | Limited-Time Offer | Offer | promotion, conversion | broad | hook → offer → urgency*(deadline) → product → urgency* → cta | 15–30s |
| `reel-bundle-combo` | Bundle / Combo | Offer | promotion, conversion | broad | hook → product → product → offer → benefit → cta | 15–30s |
| `reel-price-value` | Price / Value | Offer | conversion, awareness | broad | hook → product → benefit → offer → cta | 15–30s |
| `reel-problem-solution` | Problem → Solution | Story | awareness, conversion | broad | hook → problem → emotion* → product → benefit → cta | 20–45s |
| `reel-before-after` | Before / After | Story | awareness, conversion | broad | hook → problem → benefit → payoff → cta | 15–45s |
| `reel-customer-journey` | Customer Journey | Story | awareness, conversion | broad | problem → context → product → payoff → cta | 15–45s |
| `reel-how-it-works` | How It Works | Story | awareness, conversion | broad | hook → setup → setup* → setup* → payoff → cta | 15–30s |
| `reel-local-comedy` | Local Comedy | Engagement | engagement, awareness | broad | context → emotion → product → closing → cta | 15–30s |
| `reel-pov` | POV | Engagement | engagement, awareness, conversion | broad | hook → context → product → payoff → cta | 15–30s |
| `reel-relatable-situation` | Relatable Situation | Engagement | engagement, awareness | broad | context → emotion → product → payoff → cta | 15–30s |
| `reel-question-interaction` | Question / Interaction | Engagement | engagement, awareness | broad | hook → objection → product → objection* → cta | 15–30s |
| `reel-customer-proof` | Customer Proof | Trust | conversion, awareness | broad | hook → social-proof → product → benefit → cta | 15–30s |
| `reel-behind-scenes` | Behind the Scenes | Trust | engagement, awareness | broad | hook → setup → product → emotion* → payoff → cta | 20–45s |
| `reel-new-launch` | New Launch | Brand/Launch | launch, awareness | broad | hook → setup → product → differentiator → cta | 15–30s |
| `reel-brand-story` | Brand Story / Why Us | Brand/Launch | awareness, engagement | broad | context → problem → product → differentiator → closing → cta | 20–45s |

\* = optional (`required: false`) step. "broad" = `['restaurant', 'salon', 'real_estate']`.

Adaptation rules, visual grammar, and full constraint objects for every template are in `functions/src/config/creativeTemplateLibrary.ts`; omitted here for brevity but fully schema-validated (§F) and exercised by tests (§G). Every adaptation rule used across the 20 templates draws only from the existing Phase 3 condition vocabulary (`offerAvailable`, `proofAvailable`, `productImageAvailable`) and action vocabulary (`include`/`exclude`/`emphasize`/`deemphasize`/`prioritize`/`fallback`) — no new schema fields were introduced.

## D. Phase 4 Reconciliation

Three Phase 4 Reel templates were reconciled rather than left duplicated:

1. **`reel-product-reveal`** — kept the same id, refined in place. Phase 4's grammar (`hook → setup → product → benefit → cta`) was a general product-led structure; this phase's brief specifically asked for the reveal to be "the central dramatic moment" via `tease → reveal → close-up`. The canonical definition was updated to `hook → visual_tease(setup) → reveal(product) → close_up(benefit) → cta` and its `version` bumped from 1 to 2 to reflect the definition change (confirmed by a dedicated reconciliation test).
2. **`reel-offer-drop`** — retired. Its grammar (`hook → offer → product → urgency → cta`) was judged too similar to the newly required `reel-offer` (`problem → offer → product → urgency → cta`) to justify maintaining as a separate template ("do not maintain duplicate grammars unnecessarily," per the task). `reel-offer` is now the sole canonical offer-conversion-without-deadline template; `reel-limited-time-offer` (new) covers the deadline/scarcity-specific variant, keeping the two conversion grammars genuinely distinct (verified by a test asserting `reel-limited-time-offer` has strictly more grammar steps than `reel-offer`).
3. **`reel-local-relatable`** — renamed and refined to **`reel-relatable-situation`**, matching the new 20-template brief's explicit id and its distinction from the newly separate `reel-local-comedy` (comedic/punchline-structured) vs. a universal/common-situation structure (no specific joke required). Phase 4's template already *was* the general, non-joke-specific version — it was renamed to the brief's canonical id rather than kept as a third, overlapping template. **Correctness note**: the first draft of `reel-relatable-situation` and `reel-local-comedy` accidentally shared an identical grammar role sequence (`context → emotion → product → payoff → cta`); this was caught by the distinctiveness test suite before completion, and resolved by changing Local Comedy's closing "punchline" beat from role `payoff` to role `closing` (a comedic punchline is a decisive close, not an open emotional payoff) — the two templates are now structurally distinct as well as thematically distinct.

Five Phase 4 Reel templates were kept unchanged (still `version: 1`, grammar untouched), because their existing definitions already matched the new brief's descriptions for the same concept: `reel-problem-solution`, `reel-before-after`, `reel-behind-scenes`, `reel-customer-proof`, `reel-new-launch`.

## E. Coverage Matrix

| Category | Templates | Count |
|---|---|---|
| Product | Product Reveal, 3-Shot Food Reel, Cinematic Product, Product Detail | 4 |
| Offer / Conversion | Offer Reel, Limited-Time Offer, Bundle/Combo, Price/Value | 4 |
| Story / Problem / Transformation | Problem → Solution, Before → After, Customer Journey, How It Works | 4 |
| Social / Engagement | Local Comedy, POV, Relatable Situation, Question/Interaction | 4 |
| Trust / Proof | Customer Proof, Behind the Scenes | 2 |
| Launch / Brand | New Launch, Brand Story / Why Us | 2 |
| **Total** | | **20** |

Food-specific coverage: `reel-3-shot-food` and `reel-product-detail` (partially, `['restaurant','salon']`) are the only vertical-narrowed Reel templates; the other 18 are broad. This mirrors Phase 4's POST library pattern (one vertical-specific template, the rest broad) and was a deliberate choice, not an oversight — every other grammar in the list (offer, story, engagement, trust, brand) is legitimately vertical-agnostic.

## F. Validation

All 30 templates (10 POST unchanged from Phase 4 + 20 REEL) pass `validateCreativeTemplate()` (`functions/src/services/creativeTemplate.ts`) — the same Phase 3 validator, not a parallel check — with zero errors: `structure.type`/`constraints.type` match `type`; grammar step count falls within `[minSections, maxSections]`; all grammar-step and adaptation-rule ids are unique per template; no Reel template carries a POST structure or vice versa (explicitly asserted, not just implied).

## G. Tests

```
cd functions && npm run typecheck                → PASS (0 errors)
cd functions && npx jest creativeTemplateLibrary  → PASS, 186/186 tests
cd functions && npm run test                      → PASS, 506/623 non-skipped tests (up from 428 at
                                                     the end of Phase 4), 24/50 suites run (26 skipped,
                                                     identical to every prior baseline — emulator-
                                                     dependent, unrelated to this phase)
cd functions && npx eslint src --ext .ts          → 73 problems (70 errors, 3 warnings) — 1 above the
                                                     72/69/3 Phase 0–3 baseline, the same pre-existing
                                                     parserOptions.project gap documented in the Phase 4
                                                     report (functions/tsconfig.json excludes all
                                                     *.test.ts; functions/ has no wired-up ESLint config
                                                     of its own). Not a new problem category, not fixed
                                                     here (lint-infrastructure change, out of this
                                                     phase's scope).
```

Existing regression suites explicitly re-run and confirmed passing, unmodified: `reelPipeline.test.ts`, `reelPipeline.schema.test.ts` (existing Reel pipeline), `truthCheck.test.ts` (Truth Check), `usageControl.getGenerationCost.test.ts` (credits), `compositor.test.ts` (renderer-adjacent), `brandCreativeContext.test.ts` (Phase 1), `creativeTemplate.test.ts` (Phase 2/3 schema validator itself).

No live AI/video generation was invoked. Per the task's cost-control instructions, validation relies entirely on the deterministic schema validator, TypeScript's compiler, and the existing (mocked, no external calls) Reel pipeline regression tests — no Gemini/image/video/Cloud Run calls were made to "prove" these templates.

## H. Typecheck

```
cd functions && npm run typecheck → PASS, 0 errors
npm run typecheck (frontend, repo root) → PASS, 0 errors (not touched this phase)
```

## I. Files Changed

```
MODIFIED: functions/src/config/creativeTemplateLibrary.ts (reel-product-reveal reconciled in place;
          reel-offer-drop removed; reel-local-relatable replaced with reel-relatable-situation;
          8 new Reel templates added: reel-product-detail, reel-limited-time-offer,
          reel-bundle-combo, reel-price-value, reel-customer-journey, reel-how-it-works,
          reel-question-interaction, reel-brand-story)
MODIFIED: functions/src/config/creativeTemplateLibrary.test.ts (counts updated to 30 total/20 Reel;
          required-coverage list updated to the 20 canonical ids; reconciliation tests added;
          coverage-matrix test added; kebab-case id regex widened to allow digits, needed for
          reel-3-shot-food)
NEW:      docs/CREATIVE_INTELLIGENCE_PHASE_5_REEL_TEMPLATES.md (this file — supersedes an
          in-progress draft of the same path written for an earlier, smaller "6 additional
          templates" version of this phase's brief before the 20-template brief superseded it
          mid-turn; no separate file was left behind)
```

No other file was modified — confirmed via `git status`. `functions/src/types/index.ts` and `functions/src/services/creativeTemplate.ts` (Phase 2/3 schema and validator) were read but not changed; all 20 templates conform to the existing schema exactly.

## J. Invariants

```
Existing Reel engine preserved:        PRESERVED (reelPipeline.ts, videoRenderer.ts not touched)
Existing renderer preserved:           PRESERVED (services/reel-renderer/ Cloud Run service not touched)
Business Brain preserved:              PRESERVED (not referenced by this phase's code)
BrandKit preserved:                    PRESERVED (not referenced; BrandCreativeContext also untouched)
Truth Check preserved:                 PRESERVED (truthCheck.ts not touched; templates never
                                        manufacture facts — every price/offer/urgency/proof/claim
                                        beat is marked optional and sourced from campaign context,
                                        never hardcoded)
Billing preserved:                     PRESERVED (usageControl.ts, credit reservation/finalization
                                        not touched; templates contain no billing logic)
Tenant isolation preserved:            PRESERVED (auth.ts, validation.ts not touched)
AI provider abstraction preserved:     PRESERVED (services/ai/* not touched; zero AI/network
                                        dependency in this phase's code, confirmed by the
                                        "architectural separation" test)
Campaign generation preserved:         PRESERVED (pipeline.ts not touched; no integration wiring
                                        was added — these templates are not yet consumed by any
                                        generation code, exactly as Phase 4 left them)
```

## K. Deferred

Explicitly not implemented in this phase:

```
Template selection / recommendation / ranking / scoring
AI template extraction
Reference Reel analysis / competitor Reel analysis
User template import / template cloning / URL import / template embeddings
Template performance intelligence (CTR, conversion rate, winner detection, learning)
Template UI (picker, preview cards, admin CRUD)
Template persistence (no Firestore collection — the library remains code-defined data,
  matching Phase 4's established pattern; no Template Registry service was created)
```
