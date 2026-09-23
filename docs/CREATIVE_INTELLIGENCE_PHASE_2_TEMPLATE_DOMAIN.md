# Creative Intelligence — Phase 2: Template Domain Model

## 1. Phase Status

```
COMPLETE
```

## 2. Existing Architecture Inspected

- `docs/CREATIVE_INTELLIGENCE_PHASE_0_FREEZE.md` and its Phase 1 addendum — invariants and integration boundary.
- `functions/src/services/ai/brandCreativeContext.ts` (Phase 1 output) — confirmed as the normalized brand contract; this phase's model deliberately has zero dependency on it.
- `functions/src/types/index.ts` (1000+ lines) — confirmed as the repo's single canonical types file (all domain interfaces/unions for `BrandKit`, `Campaign`, `ReelProject`, etc. live here, hand-written literal unions, no runtime exports). `functions/src/types/enums.ts` was checked and found to be dead code (zero imports anywhere) — a pre-existing orphaned file, not built upon.
- `functions/src/config/verticals.ts` and `functions/src/services/ai/creativeBrief.ts` — confirmed as the repo's pattern for pairing a type with its validation/build logic in a dedicated file outside `types/index.ts`.
- `functions/src/functions/brandKit/createBrandKit.ts` — confirmed as the repo's existing Zod-validation convention (used at callable-input boundaries); reused for this phase's domain validation rather than hand-rolling a new validator.
- `functions/src/services/ai/pipeline.ts`, `compositor.ts`, `reelPipeline.ts`, `truthCheck.ts`, `usageControl.ts` — inspected to confirm none required modification; none were touched.
- Of the docs this task's instructions named (`PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY.md`, `MVP_SCOPE.md`, `PROMPT_SYSTEM.md`, `TEST_PLAN.md`), none exist in `/docs` — already noted as a gap in the Phase 0 freeze report (§16); not re-blocked on here since Phase 0 already accepted this and proceeded.

## 3. Template Domain Model

All five concepts are defined exactly once, in `functions/src/types/index.ts` (pure types, matching the file's existing convention):

```ts
export type CreativeTemplateType = 'post' | 'reel';

export type CreativeObjective =
  | 'awareness' | 'engagement' | 'conversion' | 'launch' | 'promotion' | 'retention';

export type CreativeGrammarRole =
  | 'hook' | 'context' | 'problem' | 'product' | 'benefit' | 'proof'
  | 'differentiator' | 'offer' | 'urgency' | 'social-proof' | 'objection'
  | 'emotion' | 'cta' | 'closing';

export interface CreativeGrammarStep {
  id: string;            // unique within the owning template's grammar array
  role: CreativeGrammarRole;
  purpose: string;       // template-author-facing, never business-specific copy
  required: boolean;
}

export type CreativeTemplateSource = 'system' | 'user';

export interface CreativeTemplate {
  id: string;
  name: string;
  description: string;
  type: CreativeTemplateType;
  objectives: CreativeObjective[];   // one template may serve multiple objectives
  grammar: CreativeGrammarStep[];    // ordered by array position; at least 1 step
  version: number;
  source: CreativeTemplateSource;
}
```

Runtime validation and the canonical value arrays live in `functions/src/services/creativeTemplate.ts` (Zod, reusing the repo's existing validation library rather than introducing a new one):

```ts
export const CREATIVE_TEMPLATE_TYPES: readonly CreativeTemplateType[];
export const CREATIVE_OBJECTIVES: readonly CreativeObjective[];
export const CREATIVE_GRAMMAR_ROLES: readonly CreativeGrammarRole[];
export const CREATIVE_TEMPLATE_SOURCES: readonly CreativeTemplateSource[];
export const creativeTemplateSchema: z.ZodType<CreativeTemplate>;
export function validateCreativeTemplate(input: unknown): CreativeTemplateValidationResult;
```

Sequence is represented by array position in `grammar` (no separate `order` field) — the array is the order, per the task's own §8 guidance. Required/optional is an explicit `required: boolean` on every step, never inferred or hardcoded elsewhere.

## 4. Creative Grammar Philosophy

> **Template = reusable creative grammar**, not a finished creative.

A `CreativeTemplate` describes *what communication role each part of a creative plays and in what order* (e.g. `hook → product → offer → cta`) — never the actual words, images, colors, or business facts used to fill those roles. This is deliberately separate from:

- **BrandKit / `BrandCreativeContext`** (Phase 1) — owns brand identity (logo, colors, fonts, tone). A template has no logo/color/font fields; brand identity is injected at generation time, a later phase.
- **Business Brain** — owns business facts (name, offer, price, location, phone). A template has no business-fact fields; those come from Business Brain/campaign context at generation time.
- **Visual rendering** — the deterministic compositor and FFmpeg renderer own layout, positioning, and pixels. Grammar roles (e.g. `offer`) describe communication function only; a role name is never a rendering instruction (e.g. never `hero-image` or `large-red-text`).
- **AI providers** — `functions/src/services/creativeTemplate.ts` has zero AI/network/Firestore imports. The entire module is a pure function over plain data, provable by the fact that its test file (`creativeTemplate.test.ts`) mocks nothing.

This separation is what keeps the eventual architecture composable:

```
Business Brain  +  Creative Template  +  Style  +  BrandCreativeContext  →  Generation
```

rather than one template type coupled to a specific brand, business, or renderer.

## 5. Example Grammar

Three test fixtures exist in `functions/src/services/creativeTemplate.test.ts` (fixtures only, not a production library — Phase 3+ concern):

**Promotion** (`post`, objectives: `promotion`, `conversion`):
```
hook (required) → product (required) → offer (required) → urgency (optional) → cta (required)
```

**Awareness** (`post`, objective: `awareness`):
```
hook (required) → context (required) → differentiator (optional) → product (required) → cta (required)
```

**Engagement** (`reel`, objective: `engagement`):
```
hook (required) → emotion (required) → product (required) → objection (optional) → cta (required)
```

None of the three fixtures contain a business name, price, offer value, logo, or color.

## 6. Validation Rules Implemented

Enforced by `creativeTemplateSchema` (Zod) in `functions/src/services/creativeTemplate.ts`:

- `id`, `name`, `description` — required, non-empty strings.
- `type` — must be exactly `'post'` or `'reel'`.
- `objectives` — array, minimum 1 element, every element must be a canonical `CreativeObjective`.
- `grammar` — array, minimum 1 element.
- Each grammar step: `id` non-empty string, `role` must be a canonical `CreativeGrammarRole`, `purpose` non-empty string, `required` must be a boolean (always explicit, never defaulted/inferred).
- Grammar step `id`s must be unique within a template (enforced via `superRefine`, reported per-duplicate with its array index).
- `version` — integer, minimum 1.
- `source` — must be exactly `'system'` or `'user'`.
- Ordering is structurally guaranteed (grammar is a plain array; there is no alternate unordered representation to validate against).

## 7. Tests

Commands run and results:

```
cd functions && npm run typecheck   → PASS (0 errors)
cd functions && npx eslint src --ext .ts → 72 problems (69 errors, 3 warnings) — IDENTICAL to the
                                            Phase 0/1 baseline; confirmed via diff against the prior
                                            full lint run that no new file/line contributes any of them
cd functions && npx jest creativeTemplate → PASS, 42/42 new tests
cd functions && npm run test        → PASS, 278/278 non-skipped tests (up from 236 pre-Phase-2 by
                                       exactly the 42 new ones), 23/49 suites run (26 skipped,
                                       identical skip count to baseline — emulator-dependent, unrelated)
npm run typecheck (frontend)        → PASS (0 errors)
npm run lint (frontend, --max-warnings 0) → PASS (0 errors, 0 warnings)
```

New test coverage (`functions/src/services/creativeTemplate.test.ts`): template type validity (both values + 1 invalid), all 6 canonical objectives individually + empty + invalid + multiple, all 14 canonical grammar roles individually + invalid, ordered-steps preserved, required/optional mix, empty grammar rejected, duplicate step ids rejected, valid POST template, valid REEL template, multiple objectives, invalid version (zero and non-integer), missing required field, invalid source, and two explicit architectural-separation tests (no BrandKit/Business Brain/rendering fields present on a constructed template; module validates with zero AI/Firestore/renderer dependency, provable by the absence of any mocks in the test file).

## 8. Files Changed

```
NEW:      functions/src/services/creativeTemplate.ts
NEW:      functions/src/services/creativeTemplate.test.ts
MODIFIED: functions/src/types/index.ts (132 insertions, 1 deletion — purely additive; the one
          deletion is the multi-line CreativeObjective union prettier reformatted to its
          auto-fixed single-line form, not a removal of content)
NEW:      docs/CREATIVE_INTELLIGENCE_PHASE_2_TEMPLATE_DOMAIN.md (this file)
```

No other file was modified. No POST/REEL generation, compositor, renderer, Truth Check, billing, or Firestore rules file was touched.

## 9. Invariants Preserved

```
Business Brain remains authoritative:        PRESERVED (not referenced by this phase's code at all)
BrandKit remains authoritative for brand:     PRESERVED (not referenced)
BrandCreativeContext remains normalized brand contract: PRESERVED (not referenced, not extended)
Existing POST pipeline unchanged:             PRESERVED (pipeline.ts not touched)
Existing REEL pipeline unchanged:             PRESERVED (reelPipeline.ts not touched)
Existing renderer unchanged:                  PRESERVED (compositor.ts, ffmpeg service not touched)
Truth Check unchanged:                        PRESERVED (truthCheck.ts not touched)
Billing unchanged:                            PRESERVED (not touched)
Credits unchanged:                            PRESERVED (usageControl.ts not touched)
Tenant isolation unchanged:                   PRESERVED (auth.ts, validation.ts not touched)
Firestore rules unchanged:                    PRESERVED (firestore.rules not touched; no new
                                               collection was created — this phase is domain/type
                                               layer only, no persistence)
AI provider abstraction unchanged:            PRESERVED (services/ai/* not touched; the new module
                                               lives outside services/ai/ precisely because it has
                                               no AI dependency)
```

## 10. Deferred Work

Explicitly not implemented in this phase (later phases per the original master spec):

- Template selection / recommendation / ranking (`TemplateSelector`)
- Template registry / production template library (the 3 fixtures here are test-only)
- Template rotation / diversity logic
- AI-based template extraction from a user-uploaded reference creative
- User-imported templates (beyond the `source: 'user'` classification value existing on the type)
- Style profiles (`StyleProfile`)
- Mapping from grammar → `PostBlueprint`/`ReelBlueprint` (visual/shot-level blueprints)
- Template-to-generation pipeline integration (Creative Direction, image generation, compositor, FFmpeg still know nothing about `CreativeTemplate`)
- Firestore persistence (`creativeTemplates` collection, versioning storage, admin CRUD)
- Approval/rejection feedback memory, performance intelligence
- Any UI (template picker, template preview cards)

## Deferred-Work Rationale

Phase 2's job was to prove the domain model is sound, type-safe, and architecturally independent before anything is built on top of it. Every item above requires a decision this phase deliberately did not make (how templates get selected, how grammar maps to pixels, whether/how they're persisted) — making those decisions now would be exactly the "speculative schema" and premature-coupling risk the task's own instructions warned against.
