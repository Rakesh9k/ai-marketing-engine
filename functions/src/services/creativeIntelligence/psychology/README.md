# Psychology Bank (Phase 10.2)

Governed by `docs/creative-intelligence/CREATIVE_INTELLIGENCE_PRINCIPLES.md` and built on the Phase 10.1 ontology
(`../ontology`). Foundational rule: **psychology informs creative decisions; it does not guarantee behavioral
outcomes.** The bank is a behavioral reasoning layer, not a list of tricks.

## Architecture decision: one identity system

A bank principle **is** an ontology `psychology` entity (`../ontology/psychology.ts`), registered in the shared
`OntologyRegistry`. Phase 10.2 added *optional* governance fields to that entity and a bank layer that **requires** them
for every non-draft principle. There is no second psychology type, registry identity or relationship vocabulary.
Relationships are ordinary ontology edges; ten matrix rows were added for psychology (compatibleWith / conflictsWith /
notRecommendedWith mechanisms, appropriateFor / notRecommendedFor / conditionalOn situations, constrainedBy
anti-patterns, oftenCombinedWith / notRecommendedWith psychology).

Spec fields map as follows: `whatItDoes`, `whyItMayWork`, `whenToUse`, `whenNotToUse`, `appropriateIntensity`,
`ethicalBoundary`, `evidence`, `confidence`, `assumptions`, `status` are entity fields; `compatibleMechanisms`,
`incompatibleMechanisms`, `relatedPsychology` and `relationships` are **edges** (single source of truth), exposed by
`compatibleMechanisms()`, `incompatibleMechanisms()`, `relatedPsychology()`.

## Files

| File | Responsibility |
| :-- | :-- |
| `psychology-types.ts` | Taxonomy (5 categories, planned concepts, future categories), `definePrinciple` builder, roles |
| `psychology-evidence.ts` | Evidence classification; `confidenceCeiling` — the most confidence a body of evidence can justify |
| `psychology-boundaries.ts` | 18 dark-pattern prohibitions as `anti_pattern` entities; persuasion-vs-deception table; vulnerable-audience categories |
| `psychology-validation.ts` | Governance + semantic-quality + reusability rules |
| `psychology-relations.ts` | Relationship queries, psychology stack (primary / secondary / supporting), `matchContext` |
| `psychology-registry.ts` | `PsychologyRegistry`, `createPsychologyBank`, deferred-link handling |
| `attention/ desire/ trust/ decision/ emotion/` | The reference principles, one file per category |

## Taxonomy

`attention · desire · trust · decision · emotion`. Add a category by adding it to `PSYCHOLOGY_CATEGORIES`
(ontology) and `PSYCHOLOGY_TAXONOMY`; `memory, identity, social_behavior, perception, learning, habit, risk,
motivation, cognitive_processing` are listed as future and are *rejected* until enabled. `plannedConcepts` is intent,
not data: `registry.unauthoredConcepts()` lists what is still unwritten.

## What ships (12 reference principles — deliberately not a library)

curiosity, novelty, specificity (attention) · convenience-preference (desire) · social-proof, authority (trust) ·
scarcity, urgency, loss-aversion, choice-reduction, cognitive-load-reduction (decision) · relief (emotion).
These cover every ethically sensitive principle the brief names plus its five representative examples. Each is held at
`experimental` / confidence `hypothesis` / explanation `plausible_mechanism` (loss aversion: `hypothesis`) because
**no evidence has been attached** — citations are Phase 10.10's job and none are invented here.

## Governance rules (what the validator enforces)

- Category valid (future categories rejected). Only ontology `psychology` entities accepted.
- Every non-draft principle: `whatItDoes`, `whyItMayWork`, `explanationBasis`, `whenToUse`, `whenNotToUse`,
  `appropriateIntensity`, `riskLevel`, ≥1 risk, `ethicalBoundary`, `confidence`. Missing self-critique
  (`doesNotExplain`, `alternativeExplanations`, technical / creative / strategic wording) is a warning.
- **Elevated** principles (scarcity, urgency, social proof, authority, loss aversion, specificity, curiosity — and these
  ids cannot be downgraded): boundary, safe + prohibited applications, risk above low, and at least one
  `constrainedBy` anti-pattern.
- Intensity is a closed set; an `excessive` rung can never be recommended.
- **Evidence caps confidence**: no evidence or only an AI-generated hypothesis → `hypothesis`; unsupported certainty is an
  error. `established_finding` / `supported_explanation` need evidence. `validated` needs a high-quality in-context test.
  Contradicting evidence caps at moderate. Evidence ids must appear in `evidenceRefs`.
- General confidence ≠ contextual confidence (`contextualConfidence`); context cannot exceed general without a test.
- Failure intelligence: `outcomeLearnings` (worked / failed / neutral / unexpected, with context); a failure cannot raise confidence.
- Semantic quality: unqualified claims ("will make people", "forces", "proven to convert", "works every time",
  "humans are wired…") and behavioral myths (attention-span numbers, "exactly twice", "red makes…") are errors;
  absolute words and unhedged explanations are warnings. Boundary / prohibition fields may say "never".
- Reusability: no hashtags, prices, URLs, quoted lines, emoji, dimensions or personal data in *any* field, including examples.

## Psychology is not execution

Psychology → marketing principle → mechanism → structure → execution. Nothing here generates captions, hooks or
visuals, and there is no "give me N psychology tricks" entry point. Dark patterns are `anti_pattern` entities that
constrain principles; there is no generator.

## Composition

`evaluatePsychologyStack` applies the "few dominant appeals" guideline as a **heuristic with an explicit
`justification` override**, flags missing / multiple primaries, and reports `POTENTIAL_CONFLICT` (a warning with the
edge's own conditions) — never "always incompatible". `matchContext` returns which of a principle's structured
conditions a situation matches, so a later engine can explain "why this" and "why not this". It scores and ranks nothing.

## Deferred links

Mechanisms, marketing principles and human motivations are authored in later phases. Links to them are **deferred**:
listed by `deferredLinks()`, turned into edges by `resolveDeferredLinks()`, a warning normally and an error under
`validate({ strict: true })`. Nothing is faked to satisfy resolution.

## Deliberately not implemented

Evidence library and citations (10.10), recommendation / scoring (10.12), experiment engine, UI, persistence,
integration with campaign generation, the remaining ~55 taxonomy concepts, vulnerable-audience *rules* (categories are
recorded; behaviour is a later phase). No production behaviour changes; nothing imports this module.
