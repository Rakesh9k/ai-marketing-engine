# Creative Intelligence — Phase 3: Complete Template Schema

## 1. Phase Status

```
COMPLETE
```

## 2. Phase 2 Model Reused

Reused verbatim: `CreativeTemplateType`, `CreativeObjective`, `CreativeTemplateSource`. Reused and *extended* (not duplicated — see §1 of the task, which explicitly authorizes refining the canonical definitions): `CreativeGrammarRole` gained two values (`setup`, `payoff`) needed by the Reel fixture this phase's own spec asked for (§26-27 of the task); `CreativeGrammarStep` is unchanged in shape but is now nested one level deeper, inside `CreativeStructure.grammar`, instead of sitting directly on `CreativeTemplate.grammar` — this is the one structural change to the Phase 2 output, made deliberately (see §8 "Redundancy Decisions" below) rather than introducing a second, parallel template interface. There is still exactly **one** `CreativeTemplate` interface, in the same file, at the same import path.

## 3. Final CreativeTemplate Schema

All types live in `functions/src/types/index.ts` (same canonical location as Phase 2); validation and canonical value arrays live in `functions/src/services/creativeTemplate.ts` (same file as Phase 2, extended).

```ts
export interface CreativeTemplate {
  id: string;
  name: string;
  description: string;
  type: CreativeTemplateType;                 // 'post' | 'reel'
  objectives: CreativeObjective[];             // Phase 2, reused, non-empty
  compatibleVerticals: BusinessCategory[];     // reuses functions/src/config/verticals.ts's existing taxonomy
  structure: CreativeStructure;                // discriminated union, see §4
  visualGrammar: VisualGrammar;                // see §5
  adaptationRules: AdaptationRule[];           // may be empty; see §6
  constraints: TemplateConstraints;            // discriminated union, see §7
  version: number;                             // positive integer
  active: boolean;
  source: CreativeTemplateSource;              // Phase 2, reused: 'system' | 'user'
}
```

`compatibleVerticals` reuses `BusinessCategory` (`'restaurant' | 'salon' | 'real_estate'`, `functions/src/types/index.ts:3`) rather than inventing a parallel industry taxonomy, per an explicit inspection of `functions/src/config/verticals.ts` confirming this is the repo's one authoritative vertical list — `VERTICAL_CONFIGS: Record<BusinessCategory, VerticalConfig>` is where `BUSINESS_CATEGORIES` (the runtime array used by validation) is *derived from* (`Object.keys(VERTICAL_CONFIGS)`), not hand-duplicated.

## 4. CreativeStructure

```ts
export interface PostStructure {
  readonly type: 'post';
  grammar: CreativeGrammarStep[];
}

export interface ReelStructure {
  readonly type: 'reel';
  grammar: CreativeGrammarStep[];
}

export type CreativeStructure = PostStructure | ReelStructure;
```

Discriminated on the literal `type` field, so `PostStructure` and `ReelStructure` can never be accidentally interchanged — proven by two `@ts-expect-error`-anchored compile-time tests (see §10). There is no separate `ReelSection` type: a Reel "section" and a `CreativeGrammarStep` describe the identical concept (a semantic communication beat — role, purpose, required), so `ReelStructure.sections` from the task's conceptual example became `ReelStructure.grammar: CreativeGrammarStep[]` instead, avoiding a parallel type that would need to be kept in sync with `CreativeGrammarStep` forever. This is a direct application of the task's own §12 instruction ("if `ReelSection` can safely reuse the existing semantic grammar model, do so").

## 5. VisualGrammar

```ts
export type VisualEmphasis = 'product-led' | 'text-led' | 'image-led' | 'offer-led';
export type VisualComposition = 'hero-product' | 'split-composition' | 'editorial' | 'minimal' | 'high-contrast';

export interface VisualGrammar {
  emphasis: VisualEmphasis;
  composition: VisualComposition;
}
```

**Semantic grammar** (`CreativeStructure.grammar`) answers *what* the creative communicates and in what order (hook, then product, then offer, then CTA). **Visual grammar** answers *how* that communication should be visually weighted (should the product or the offer text dominate attention; should the composition be a clean hero shot or an editorial split layout) — it is intent, never implementation. It contains zero brand values (no colors/fonts/logo — those are `BrandCreativeContext`'s job, Phase 1) and zero rendering instructions (no FFmpeg filters, no image-model prompt text, no pixel coordinates). A test explicitly constructs a `visualGrammar` with an injected `primaryColor` field and confirms the validator strips it rather than treating it as a legitimate schema field.

## 6. AdaptationRule

```ts
export type AdaptationCondition =
  | { check: 'offerAvailable' }
  | { check: 'proofAvailable' }
  | { check: 'productImageAvailable' }
  | { check: 'vertical'; equals: BusinessCategory }
  | { check: 'ctaType'; equals: CTAType };

export type AdaptationAction =
  | { action: 'include'; role: CreativeGrammarRole }
  | { action: 'exclude'; role: CreativeGrammarRole }
  | { action: 'emphasize'; role: CreativeGrammarRole }
  | { action: 'deemphasize'; role: CreativeGrammarRole }
  | { action: 'prioritize'; role: CreativeGrammarRole }
  | { action: 'fallback'; role: CreativeGrammarRole; to: CreativeGrammarRole };

export interface AdaptationRule {
  id: string;
  condition: AdaptationCondition;
  action: AdaptationAction;
}
```

Both `AdaptationCondition` and `AdaptationAction` are closed discriminated unions of plain data (Zod-validated via `z.discriminatedUnion`), not stored code, not `eval`-able expressions, and not free-text. Condition categories are deliberately limited to what the current architecture actually has per-campaign availability data for (offer, proof, product image, vertical, CTA type) — matching the task's own §18 instruction not to build "a giant universal rule language." Actions always target a `CreativeGrammarRole` (reusing the same Phase 2 vocabulary grammar steps use), never a rendering instruction — "emphasize the offer step," never "make the offer text red." `fallback` is the one two-argument action (`role` + `to`), for "if X unavailable, fall back to Y" cases. Rule ordering is deterministic (plain array order); rule `id`s must be unique within a template (validated).

## 7. TemplateConstraints

```ts
export interface PostTemplateConstraints {
  readonly type: 'post';
  minSections: number;
  maxSections: number;
  maxTextDensity?: 'low' | 'medium' | 'high';
}

export interface ReelTemplateConstraints {
  readonly type: 'reel';
  minSections: number;
  maxSections: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
}

export type TemplateConstraints = PostTemplateConstraints | ReelTemplateConstraints;
```

Discriminated the same way as `CreativeStructure`, with the same compile-time guarantee (a `PostTemplateConstraints` cannot be assigned where `ReelTemplateConstraints` is expected — proven by a `@ts-expect-error` test). `minSections`/`maxDurationSeconds` bounds are validated (`min <= max`) via `superRefine` chained onto the built union (Zod requires plain `ZodObject` members inside `z.discriminatedUnion`, so per-branch `.superRefine()` had to be hoisted to after the union was constructed rather than applied to each branch individually — documented in the source as the reason for that structure).

## 8. Redundancy Decisions

This was the phase's central design tension, addressed field-by-field:

- **`grammar` vs. per-format structural booleans** (e.g. `hook: boolean`, `offer: boolean` on `PostStructure`): rejected. `CreativeStructure.grammar` (an ordered `CreativeGrammarStep[]`) already fully answers "which semantic beats occur, in what order, required or not" — a parallel set of booleans would just be a second, driftable encoding of the same fact. `PostStructure` and `ReelStructure` both hold only `{ type, grammar }`.
- **`ReelSection` vs. `CreativeGrammarStep`**: rejected as a separate type. See §4 above — they are the same concept, so `ReelStructure.grammar` is typed as `CreativeGrammarStep[]`, not a new `ReelSection[]`.
- **`constraints.requiresCTA`/`requiresOffer`/`requiresProduct` vs. `grammar` steps with `role: 'cta'|'offer'|'product'` and `required: true`**: rejected. These booleans would be exactly the "grammar says CTA required AND constraints also say requiresCTA" contradiction risk the task's §28 calls "dangerous." `TemplateConstraints` intentionally contains only information `grammar` cannot express at all: copy density (POST) and section-count/duration bounds (REEL) — the latter validated *against* `structure.grammar.length` (a genuine cross-check between a stored range and a realized count, not two copies of the same fact).
- **`compatibleVerticals` vs. a new industry enum**: rejected. Reuses the existing `BusinessCategory` type/`VERTICAL_CONFIGS` keys (§3 above) rather than inventing a second taxonomy.
- **`objectives` (Phase 2) staying separate from `visualGrammar`/`structure`**: kept separate deliberately — an objective ("promotion") is a business-level communication goal, `structure` is the sequence used to pursue it, and `visualGrammar` is how that sequence is visually weighted. These are genuinely different axes, not the same fact stored three times.

## 9. Validation

Implemented in `functions/src/services/creativeTemplate.ts` via Zod (the repo's existing validation library, first used at callable-input boundaries like `createBrandKit.ts`), reused here rather than introducing a second validation library:

- Identity: `id`/`name`/`description` non-empty strings; `type` ∈ {post, reel}.
- Objectives: non-empty array, every element a canonical `CreativeObjective`.
- Compatible verticals: non-empty array, every element a canonical `BusinessCategory` (derived from `VERTICAL_CONFIGS`, not hand-listed).
- Structure: `type`-discriminated (`z.discriminatedUnion`) so a POST template can never receive a `ReelStructure` payload or vice versa; `grammar` non-empty; every step's `role` canonical; step `id`s unique within a template.
- Visual grammar: `emphasis`/`composition` each a canonical enum value; unknown extra keys (e.g. an injected brand color) are silently stripped by Zod's default object parsing, not accepted as schema fields.
- Adaptation rules: `condition`/`action` each a closed discriminated union (unknown `check`/`action` values rejected); rule `id`s unique within a template; array may be empty.
- Constraints: `type`-discriminated the same way as structure; `minSections <= maxSections` always; `minDurationSeconds <= maxDurationSeconds` for Reel; POST-only (`maxTextDensity`) and REEL-only (duration fields) fields cannot cross format.
- Cross-field (template-level `superRefine`): `structure.type` must equal `template.type`; `constraints.type` must equal `template.type`; `structure.grammar.length` must fall within `[constraints.minSections, constraints.maxSections]`.
- Version: positive integer. Active: boolean (both `true` and `false` are valid — an inactive template is still structurally valid; selection/eligibility logic is a later phase).

## 10. Tests

```
cd functions && npm run typecheck        → PASS (0 errors)
cd functions && npx eslint src --ext .ts → 72 problems (69 errors, 3 warnings) — IDENTICAL to the
                                            Phase 0/1/2 baseline (one new prettier formatting issue
                                            was introduced by hand-editing the multi-line union types
                                            and immediately auto-fixed via `eslint --fix`; confirmed
                                            back to the exact baseline count afterward)
cd functions && npx jest creativeTemplate → PASS, 84/84 tests (up from Phase 2's 42 — the file was
                                             extended, not replaced with a second file)
cd functions && npm run test              → PASS, 320/437 non-skipped tests (278 pre-Phase-3 minus
                                             the 42 replaced Phase 2 tests plus the 84 new ones =
                                             320), 23/49 suites run (26 skipped, identical skip count
                                             to every prior baseline — emulator-dependent, unrelated)
npm run typecheck (frontend)              → PASS (0 errors)
npm run lint (frontend, --max-warnings 0) → PASS (0 errors, 0 warnings)
```

New/changed coverage highlights beyond Phase 2's original 42: canonical vertical values (all 3, plus rejection of an unknown one and an empty array); structure/type cross-field discrimination (rejecting a `PostStructure`-typed template whose nested `structure.type` says `'reel'`, and the reverse for constraints); two explicit `@ts-expect-error`-anchored compile-time tests proving `PostStructure`/`ReelStructure` and `PostTemplateConstraints`/`ReelTemplateConstraints` cannot be cross-assigned; the three named adaptation-rule examples from the task (offer available → emphasize, proof unavailable → omit, product image available → prioritize) plus rejection of unknown conditions/actions and duplicate rule ids; POST/REEL constraint validity, invalid ranges (`min > max` for both sections and duration), and the section-count-vs-grammar-length cross-check; a Reel fixture using the new `setup`/`payoff` roles from the task's own worked example (`Hook → Setup → Product Reveal → Payoff → Offer → CTA`); and explicit architectural-separation tests (no BrandKit/Business Brain/generated-content/renderer fields on a constructed template; visual grammar's key set is exactly `{emphasis, composition}` on every fixture).

## 11. Files Changed

```
MODIFIED: functions/src/types/index.ts (268 insertions, 1 deletion — the CreativeTemplate interface's
          `grammar` field was replaced with `structure: CreativeStructure`, and the new Phase 3 types
          were added; nothing else in the file changed except a prettier reformat of one adjacent
          multi-line union — see §12 for what stayed unmodified)
MODIFIED: functions/src/services/creativeTemplate.ts (Phase 2's file, extended in place — same exports
          kept, new ones added: visual grammar, adaptation rule, and constraints schemas/arrays)
MODIFIED: functions/src/services/creativeTemplate.test.ts (Phase 2's fixtures rewritten in place to
          the complete schema — same file, not a new parallel test file)
NEW:      docs/CREATIVE_INTELLIGENCE_PHASE_3_TEMPLATE_SCHEMA.md (this file)
```

No other file was modified. `git status`/`git diff --stat` confirmed this is the entire diff for this phase — no POST/REEL generation, compositor, renderer, Truth Check, billing, or Firestore rules file was touched.

## 12. Invariants Preserved

```
Business Brain unchanged:            PRESERVED (not referenced by this phase's code)
BrandKit unchanged:                  PRESERVED (not referenced)
BrandCreativeContext unchanged:      PRESERVED (not referenced, not extended)
POST generation unchanged:           PRESERVED (pipeline.ts not touched)
Reel generation unchanged:           PRESERVED (reelPipeline.ts not touched)
Compositor unchanged:                PRESERVED (compositor.ts not touched)
FFmpeg renderer unchanged:           PRESERVED (services/reel-renderer not touched)
Truth Check unchanged:               PRESERVED (truthCheck.ts not touched)
Billing unchanged:                   PRESERVED (not touched)
Credits unchanged:                   PRESERVED (usageControl.ts not touched)
Firestore rules unchanged:           PRESERVED (firestore.rules not touched; still no
                                      creativeTemplates/templates collection — schema/domain layer only)
Tenant isolation unchanged:          PRESERVED (auth.ts, validation.ts not touched)
AI provider abstraction unchanged:   PRESERVED (services/ai/* not touched; this module has zero
                                      AI/network dependency, same as Phase 2)
```

## 13. Deferred Work

Explicitly not implemented in this phase:

- Template registry / production template library (the 3 fixtures here remain test-only)
- Template persistence (no `creativeTemplates` Firestore collection)
- Template selection / recommendation / ranking
- AI template extraction from a user-uploaded reference creative
- User-imported templates (beyond the existing `source: 'user'` classification value)
- Style profiles (a separate concept from `visualGrammar`, per the original master spec's architecture — not introduced here)
- Context selector
- Template-to-generation pipeline mapping (Creative Direction, image generation, compositor, and the Reel renderer still know nothing about `CreativeTemplate`)
- Performance intelligence, template analytics
- Template UI (picker, preview cards, admin CRUD)
