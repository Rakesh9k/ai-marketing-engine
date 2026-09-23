# Creative Intelligence — Phase 6: Creative Template Registry

## 1. Purpose

Before this phase, the only way to find a `CreativeTemplate` was to import `BUILTIN_CREATIVE_TEMPLATES` (`functions/src/config/creativeTemplateLibrary.ts`) directly and `.find()`/`.filter()` it by hand. That's fine for the two test files that already did exactly that, but it is exactly the pattern the task warns against once real consumers (future Creative Intelligence orchestration, template selection) start needing templates: every consumer re-implementing its own lookup and filtering logic, hardcoding template ids in switch statements, and silently diverging over time. `CreativeTemplateRegistry` (`functions/src/services/creativeTemplateRegistry.ts`) is the one access boundary that replaces all of that with two deterministic operations.

## 2. Responsibility

The registry owns exactly two things:

1. **Identity lookup** — given a template id, return the template or `undefined`. Deterministic, no fallback, no default.
2. **Filtered discovery** — given optional `{ type, vertical, objective }` filters, return the active templates matching all of them (AND across filters, "contains" within a template's own `objectives`/`compatibleVerticals` arrays), in a stable, deterministic order.

It also owns **integrity at construction time**: every template is re-validated against the canonical Phase 3 `validateCreativeTemplate()` and checked for duplicate ids before being accepted into the registry — a malformed or duplicate template fails registry construction immediately (a thrown `Error`, matching the existing `config/verticals.ts` convention for config-integrity failures) rather than silently entering the system.

## 3. Non-Responsibilities

The registry explicitly does **not** own:

- Template selection, ranking, scoring, or recommendation — no `rankCreativeTemplates`/`scoreCreativeTemplate`/`recommendCreativeTemplate`/`selectTemplate` exists (asserted by a test that inspects the class's own prototype methods).
- AI of any kind — zero calls to Gemini/OpenAI/any provider; zero network calls; the module is proven synchronous and side-effect-free by the fact that no test in `creativeTemplateRegistry.test.ts` sets up any AI/network mock.
- Business Brain analysis — the registry accepts a plain `vertical` string filter supplied by the caller; it never reads a business record itself.
- BrandKit / BrandCreativeContext — not referenced anywhere in this module.
- Generation or rendering — the registry returns data; it never calls the Reel pipeline, the compositor, or the FFmpeg renderer.
- Truth Check — not referenced; templates flowing through the registry carry the same "never invent a fact" guarantees established in Phases 4/5, unchanged.
- Persistence — no Firestore collection was created. Built-in templates remain code-defined data, exactly as Phase 4 established.
- Performance analytics — no `usageCount`/`conversionRate`/`ctr`/`performanceScore` field exists on `CreativeTemplate`, and none was added here.
- UI — no template browser/picker/admin screen.

## 4. API

```ts
export interface CreativeTemplateFilters {
  type?: CreativeTemplateType;
  vertical?: BusinessCategory;
  objective?: CreativeObjective;
}

export interface CreativeTemplateRegistry {
  getCreativeTemplate(templateId: string): CreativeTemplate | undefined;
  listCreativeTemplates(filters?: CreativeTemplateFilters): readonly CreativeTemplate[];
}

export class BuiltinCreativeTemplateRegistry implements CreativeTemplateRegistry { /* ... */ }

export const creativeTemplateRegistry: CreativeTemplateRegistry; // the canonical singleton
```

`getCreativeTemplate` returns `T | undefined` (not a thrown `NotFoundError`) — matching the existing codebase convention for by-id lookups that may miss (`getBusinessDoc`, `getBrandKitDoc`, `getCampaignDoc` in `services/firestore.ts` all return `T | null` for the same reason); the registry is a synchronous, in-memory equivalent, so `undefined` (native to `Map.get()`) was used rather than `null`. `NotFoundError` (`utils/errors.ts`) remains available for callers that want to turn a miss into a request-level error — that decision belongs to the caller, not the registry.

**Design note on `getCreativeTemplate` and `active`**: unlike `listCreativeTemplates`, `getCreativeTemplate` does **not** filter by `active`. A campaign that already recorded a `templateId` must still be able to resolve full template details even if that template is later deactivated — deactivation should stop a template from being newly *offered*, not make historical records unresolvable. This is a deliberate design decision, tested explicitly.

## 5. Filtering Semantics

- **type** — exact match against `CreativeTemplateType` (`'post' | 'reel'`), the canonical Phase 2 type, reused unchanged.
- **vertical** — reuses `BusinessCategory` (`functions/src/config/verticals.ts`'s existing taxonomy, imported via `functions/src/types`), not a new type. Matches if the template's `compatibleVerticals` array contains the requested vertical.
- **objective** — reuses `CreativeObjective` (Phase 2), matches if the template's `objectives` array contains the requested objective.
- **active** — not a caller-supplied filter. `listCreativeTemplates` always excludes inactive templates; there is currently no admin/debug override, per the task's explicit instruction not to build template-management tooling in this phase. All 30 built-in templates are `active: true` today, so this has no visible effect yet, but the exclusion is real and tested (via a synthetic inactive fixture, since no real inactive template exists to test against).
- No filters (`listCreativeTemplates()` or `listCreativeTemplates({})`) returns all active templates.
- Multiple filters combine as **AND**; an unsatisfiable combination returns `[]`, never throws.
- **Order** is the registration order of `BUILTIN_CREATIVE_TEMPLATES` (POST templates first, then REEL, as defined in the library file) — deterministic and stable across repeated calls, explicitly **not** a ranking (tested).

## 6. Source of Truth

`functions/src/config/creativeTemplateLibrary.ts`'s `BUILTIN_CREATIVE_TEMPLATES` array remains the single canonical definition source (Phase 4/5, unchanged by this phase — zero edits to that file). The registry does not copy template definitions into itself; it deep-clones each template once at construction (via `structuredClone`) purely for immutability isolation (§7 below), not as a second source of truth — the clone is validated against, and structurally identical to, the original.

## 7. Immutability

Every template is deep-cloned (`structuredClone`) and deep-frozen (`Object.freeze`, recursively) when the registry ingests it. This is deliberately lightweight — a ~10-line recursive freeze helper, not an immutability framework — but gives a real runtime guarantee: attempting to mutate a returned template's top-level fields, or any nested object/array inside it (`structure.grammar`, `adaptationRules`, etc.), throws in strict mode (which Jest/ts-jest run under) rather than silently succeeding. `listCreativeTemplates()` also always returns a freshly filtered array, so mutating the returned array itself never affects subsequent calls. Four dedicated tests cover: mutating a returned template's field, mutating a nested array inside a returned template, mutating the array returned by `listCreativeTemplates`, and mutating the caller's original source array *after* passing it to the constructor — none of them affect the registry's internal state.

## 8. Singleton Decision

`creativeTemplateRegistry` is a module-level singleton constructed from `BUILTIN_CREATIVE_TEMPLATES` at import time. This mirrors the existing pattern for `config/verticals.ts`'s `VERTICAL_CONFIGS` and `config/reels.ts`'s `REEL_TEMPLATES` — both are also module-level immutable configuration objects with no request-scoped state. It's appropriate here for the same reason: the registry holds no mutable state after construction (all writes happen once, synchronously, at module load), there is no dependency-injection need anywhere else in this codebase's Cloud Functions (they're stateless per-invocation functions, not a long-lived server with a DI container), and every template it's built from is itself immutable. The `BuiltinCreativeTemplateRegistry` class is also exported directly (not just the singleton) specifically so tests can construct isolated instances from fixture data — used throughout `creativeTemplateRegistry.test.ts` to test validation/duplicate-detection/immutability without touching the real library.

## 9. Consumer Migration

Searched `functions/src` for any existing direct template access (`BUILTIN_CREATIVE_TEMPLATES`, hardcoded template ids like `reel-product-reveal`, `post-product-hero`, or a `switch (templateId)`-style dispatch). Result: **none exists outside `creativeTemplateLibrary.ts` and its own test file** — confirmed by grep before starting this phase. No generation code, Reel pipeline code, or POST pipeline code references any template id today (consistent with Phase 4/5's explicit "no integration wiring yet" invariant). There was nothing to migrate. This phase is purely additive: it creates the registry and its tests, and touches no other file.

## 10. Tests

```
cd functions && npm run typecheck (functions-scoped)  → PASS, 0 errors — NOTE: functions/tsconfig.json
                                                          excludes all *.test.ts, so this command never
                                                          actually typechecks any test file, including
                                                          this phase's new one (a pre-existing, already-
                                                          documented tooling gap, not something this
                                                          phase caused or fixed)
npm run typecheck (repo root)                          → PASS, 0 errors — this command DOES typecheck
                                                          functions/*.test.ts (root tsconfig has no test
                                                          exclusion) and caught one real strict-mode
                                                          "possibly undefined" issue in the new test file
                                                          during development, which was fixed before
                                                          completion. Both commands should be run for any
                                                          functions change; the functions-scoped one alone
                                                          is insufficient for test-file correctness.
cd functions && npx jest creativeTemplateRegistry       → PASS, 59/59 tests
cd functions && npm run test                            → PASS, 565/682 non-skipped tests (up from 506 at
                                                            the end of Phase 5), 25/51 suites run (26
                                                            skipped, identical to every prior baseline —
                                                            emulator-dependent, unrelated)
cd functions && npx eslint src --ext .ts                → 73 problems (70 errors, 3 warnings) — identical
                                                            to the post-Phase-5 count; the new files
                                                            contributed zero additional lint problems
```

Test coverage: construction (real library succeeds; malformed template rejected; duplicate id rejected), `getCreativeTemplate` (known id, unknown id → `undefined`, near-miss ids don't false-match, active-state-independent), `listCreativeTemplates` (no filters, type, objective, vertical, combined AND, unsatisfiable combination → `[]`, inactive exclusion), deterministic order (repeated calls, matches registration order), immutability (4 tests, §7), validation, POST/REEL retrieval for all 30 real template ids individually, the exported singleton, and architectural-boundary assertions (no AI/network dependency, no selection/ranking methods on the class, no stray exports beyond the documented surface).

## 11. Files Changed

```
NEW: functions/src/services/creativeTemplateRegistry.ts
NEW: functions/src/services/creativeTemplateRegistry.test.ts
NEW: docs/CREATIVE_INTELLIGENCE_PHASE_6_TEMPLATE_REGISTRY.md (this file)
```

No other file was modified — confirmed via `git status`. `functions/src/config/creativeTemplateLibrary.ts`, `functions/src/services/creativeTemplate.ts`, and `functions/src/types/index.ts` were read but not changed.

## 12. Invariants Preserved

```
Existing Reel pipeline:      PRESERVED (reelPipeline.ts, videoRenderer.ts not touched)
Existing POST pipeline:      PRESERVED (pipeline.ts not touched)
Business Brain:              PRESERVED (not referenced)
BrandKit:                    PRESERVED (not referenced; BrandCreativeContext also untouched)
Truth Check:                 PRESERVED (truthCheck.ts not touched)
Billing:                     PRESERVED (usageControl.ts not touched; registry has no credit logic)
AI provider abstraction:     PRESERVED (services/ai/* not touched; registry has zero AI dependency)
Tenant isolation:            PRESERVED (auth.ts, validation.ts not touched)
Firestore rules:             PRESERVED (not touched; no new collection)
No second video engine:      PRESERVED (registry returns data only; never calls a renderer)
```

## 13. Deferred Work

```
Template selection (CreativeTemplateSelector) — a future component that will take Business
  Brain + objective + available assets + style + history and choose among the registry's
  candidate templates; the registry deliberately leaves this decision to that future component.
Template ranking / recommendation / scoring
AI template extraction from reference creatives
User-imported templates (beyond the existing source: 'user' classification value)
Template performance intelligence (CTR, conversion rate, learning)
Template UI (picker, preview cards, admin CRUD)
Template persistence (Firestore collection, if user-generated templates eventually require it)
```
