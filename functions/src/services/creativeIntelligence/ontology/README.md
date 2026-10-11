# Creative Intelligence Ontology (Phase 10.1)

Governing document: `docs/creative-intelligence/CREATIVE_INTELLIGENCE_PRINCIPLES.md` (P1–P15). Every rule below
traces to it. Location note: the brief asked for `creative-intelligence/ontology/`; this code lives here, in the
`functions` TypeScript project, so it shares its `tsc`, ESLint and Jest setup.

## 1. What the ontology is

The *language* of Creative Intelligence: the kinds of things that exist (entities), the controlled ways they can
relate (relationships), and the rules that keep the graph coherent (validation). It is in-memory types, schemas and a
registry. **It stores no content library and recommends nothing.**

## 2. Why it exists

So that Mitra can eventually reason from a business and audience situation to a creative mechanism, structure and
execution, explain *why*, and learn from behavior. Ontology answers "what exists and how can it relate?";
recommendation answers "which should be used here?"; generation answers "what should be created?"; execution answers
"how is it produced?". These stay separate.

## 3. Object types (19)

| Layer | Types |
| :-- | :-- |
| A. Intelligence — *why it might work* | `psychology`, `human_motivation`, `marketing_principle`, `audience_situation`, `insight_pattern`, `creative_mechanism`, `offer_mechanism` |
| B. Communication structure — *how it can be expressed* | `hook_pattern`, `story_structure`, `copy_structure`, `visual_structure`, `cta_structure` |
| C. Execution context — *where / under what constraints* | `style_system`, `format`, `platform`, `asset_requirement` |
| D. Governance & composition — *what to combine / avoid* | `anti_pattern`, `combination_rule`, `creative_recipe` |

`human_motivation` is added to the brief's list; the hierarchy, examples and test graph require it.

Every entity has identity (`id`, `type`, `name`, `slug`, `version`, `status`), `definition`, `semanticPurpose`,
`scope`, `examples`, `antiExamples`, `compatibility`, `constraints`, plus optional extension points
(`assumptions`, `confidence`, `evidenceRefs`, `culturalContexts`, `deprecation`, `metadata`). Schemas are strict:
unknown fields are rejected.

## 4. Relationships

First-class edges: `{ source, relationship, target, strength?, conditions?, rationale?, confidence?, evidenceRefs?,
constraints? }`, directional, from a **controlled vocabulary** (`ontology-relations.ts`), grouped as causal/reasoning,
expression, compatibility, conflict, dependency, composition, learning, plus a flagged `relatedTo` fallback.
Relationships live in the registry, **not** inside entities (e.g. a mechanism does not list its hooks): one source of
truth, no duplication. The source→relationship→target `RELATIONSHIP_MATRIX` is data that tooling can read.
Learning relationships (`validatedBy`, `invalidatedBy`, `learnedFrom`, `measuredBy`) target *external* refs
(evidence / experiment / performance record / learning) that later phases will define.

## 5. Graph philosophy

The ontology is a graph (P13). A new mechanism is added by creating the object, connecting its relationships, defining
its compatibility and constraints — never by adding more templates. Cycles are legal (peer conflicts and
compatibility are symmetric in spirit); only `requires`, `dependsOn`, `derivedFrom` and `composedOf` must be acyclic.

## 6–8. Intelligence ≠ execution; mechanism ≠ structure; structure ≠ template

- **Intelligence** explains why something may work; **execution** is wording, imagery, layout.
- A **mechanism** is communication logic (*choice simplification*); a **structure** is how the logic is organised
  (*three choices → recommendation*); a **template** is a styled shape with sizes and colours — not in the ontology.
  The existing `CreativeTemplate` (`services/creativeTemplate*.ts`) is an *execution* asset and is deliberately not
  modelled here; nothing in this module touches it.

## 9. Compatibility

`compatibility` is a list of claims `{dimension, value, fit: strong|conditional|weak|avoid, conditions?, rationale?,
epistemicStatus?}` over 15 dimensions (industry, audience, situation, objective, awareness, offer, platform, format,
culture, language, brand positioning, price point, purchase frequency, decision complexity, customer intent).
**Representable, not scored.** Values are open vocabulary until Phase 10.8.

## 10. Anti-patterns

First-class and always explainable (what / why problematic / when / alternatives). `ethical_prohibition` (fake
scarcity, fabricated proof …) is never recommendable; `effectiveness_risk` is context-dependent. They attach to normal
objects with `constrainedBy` / `constrains`. "Bad creative" is rejected as a name. Mechanisms whose use depends on a
fact declare `truthfulPreconditions`.

## 11. Recipes

A `creative_recipe` is a reasoning recipe: id lists only (`mechanismIds`, `hookPatternIds` …), never embedded
objects, and must name ≥1 principle and ≥1 mechanism. Graph validation checks each id resolves **to the field's type**.

## 12. Example graph

```text
Cognitive Load Reduction ─supports→ Make Decision Easier ─expressedThrough→ Choice Simplification
Choice Simplification ─worksWith→ Situation Recognition (hook) | Three-Choice Recommendation (story)
                      | Option→Benefit→Recommendation (copy) | Three-Option Comparison (visual)
                      | Order-or-Ask CTA | Warm (style) | Short-form Reel, Carousel (formats)
                      ─requires→ Clear Options (asset)   ─conflictsWith→ Luxury Status Signaling
Urgency ─constrainedBy→ Fake Scarcity (anti-pattern, ethical prohibition)
```

Built (test-only, synthetic) in `ontology.test.ts`; traversal `registry.findPath(...)` recovers
psychology → principle → mechanism → format with no finished creative stored.

## 13. Extension rules

1. New entity type: add to `ONTOLOGY_ENTITY_TYPES`, `ONTOLOGY_LAYERS`, a strict schema built with
   `defineEntitySchema`, `ENTITY_SCHEMAS`, matrix rows, and tests. 2. New relationship: add to
   `RELATIONSHIP_CATEGORIES` and matrix rows — no free text anywhere. 3. Changing an entity's meaning: register a
   **higher `version`**; the old one moves to history. 4. Retire with `status: 'deprecated'` + `deprecation`; never
   delete. 5. Pass the six-point Reusability Test (Principles §17) before adding anything.

## 14. Validation rules

Entity: known type; strict schema; deprecation consistency; confidence above `hypothesis` requires `evidenceRefs`;
no finished-output names ("10 Hooks", "Viral Post", "Canva Template", "Bad Creative"); no prices, hashtags, handles,
URLs, emoji, pixel sizes, colour values, quoted sentences, or personal data in definitional fields (`examples` /
`antiExamples` are illustrative and not scanned); no universal effectiveness claims ("always", "guaranteed" …) in
definitional/effect fields; no fonts/typefaces in style and visual structures; combination rules need a reason and an
entity condition. Relationship: known types, valid matrix triple, no self-relation, learning ↔ external targets,
confidence honesty. Graph: no dangling refs (edges, recipes, rules, replacements), no dependency cycles, warnings for
deprecated or `relatedTo` use.

## 15. Deliberately not implemented

Database / Firestore, seed library, retrieval, embeddings, scoring, recommendation, learning engine, admin UI,
AI-generated ontology, evidence / confidence thresholds (10.10), compatibility vocabularies (10.8), cultural
taxonomies (10.9). Production campaign behaviour is untouched; nothing imports this module yet.

> Heuristic limits: content guards are pattern-based and will miss paraphrased copy; they are a safety net for
> authors and reviewers, not a substitute for review.
