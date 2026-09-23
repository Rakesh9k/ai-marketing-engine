# Creative Intelligence — Phase 13: Template-Specific Validation

## Objective

Add a deterministic template-specific validation stage to the existing creative pipeline without creating a second generator, second renderer, second Truth Check, or a second template model. The architecture remains:

User -> Template Selection -> Template Registry -> Creative Context Selector -> Template Adaptation -> Existing Generation Pipeline -> Template-Specific Validation -> Truth Check -> Final Creative

This phase adds validation at the correct boundary only: after the adapted plan is generated and before any final creative is accepted by the existing pipeline.

## Architectural guardrails

1. No second reel generator.
2. No second renderer.
3. No second Truth Check.
4. No second template model.
5. Template validation is deterministic and contract-based.
6. Truth Check remains the final fact-verification authority.

## Why this stage exists

The template system already provides:

- the canonical template contract in `functions/src/services/creativeTemplate.ts`
- the built-in registry in `functions/src/services/creativeTemplateRegistry.ts`
- the template context builder in `functions/src/services/ai/creativeTemplateContext.ts`
- the adaptation planner in `functions/src/services/ai/templateAdaptation.ts`

What was missing was a boundary check that a generated `AdaptedCreativePlan` actually satisfies the selected template's required grammar. Without that, a template-specific output could still violate the contract even though it passed generic schema validation.

## Design

The validation is intentionally narrow and deterministic:

- It validates the adapted plan against the selected template's required roles.
- It requires explicit `coveredRoles` output and rejects roles that are not in the selected template grammar.
- It enforces reel-shot coverage and count constraints from the template itself.
- It requires every non-CTA required reel role to be represented by a typed reel shot role.
- It ensures required CTA and hook roles are present.
- It prevents a generated reel plan from silently omitting required product/offer semantics.

This is not a replacement for Truth Check. Truth Check remains the final authoritative fact-validation layer.

## Implementation

The validation logic lives in:

- [functions/src/services/ai/templateAdaptation.ts](../functions/src/services/ai/templateAdaptation.ts)

It exports a shared function, `validateTemplateSpecificOutput()`, and the planner now calls it before returning an adapted creative plan.

The regression tests covering this contract are in:

- [functions/src/services/ai/templateAdaptation.test.ts](../functions/src/services/ai/templateAdaptation.test.ts)

The tests prove that:

- a valid reel output passes
- a reel output missing a required `cta` fails
- a reel output with an empty or invalid `reelSequence` fails
- output that declares a role outside the selected template grammar fails

## Boundary behavior

Template validation occurs after adaptation and before the existing generation pipeline continues. It protects the pipeline from structurally invalid template outputs while preserving the single generator + single Truth Check model.

## Verification

The repo was checked with the real project commands:

- `cd functions && npm test -- --runInBand src/services/ai/templateAdaptation.test.ts` → PASS
- `cd functions && npm test -- --runInBand` → PASS (30 suites, 609 tests; 26 emulator-dependent suites skipped)
- `cd functions && npm run typecheck` → PASS (when run in the functions package)

This phase does not replace or bypass the deterministic Truth Check; it acts as a template-contract shield immediately before the existing final verification stage.
