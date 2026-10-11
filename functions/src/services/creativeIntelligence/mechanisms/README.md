# Marketing Mechanism Bank (Phase 10.3)

Governed by `docs/creative-intelligence/CREATIVE_INTELLIGENCE_PRINCIPLES.md`. Built on the Phase 10.1 ontology
(`../ontology`) and the Phase 10.2 Psychology Bank (`../psychology`). The Bank answers:

> *What reusable way of communicating could solve this particular strategic problem?*

It does **not** answer "what marketing trick should we use?". It is queryable data; it recommends nothing.

## What a mechanism is

> A reusable **method of communicating** a marketing idea that may create a particular strategic or behavioral effect
> under particular conditions.

A mechanism describes the **logic of communication**: what pattern is used, why it may work, what job it does, when it
fits, what it depends on (psychology, assets), what contexts reject it, and what risks it adds.

## What it is not

Not an execution ("3 things restaurants don't want you to know…"), not a psychological phenomenon (that is the Psychology
Bank), not a structure (Tease → Reveal → Payoff), not a template, trend, hook library, outcome ("viral", "high CTR") or
guaranteed tactic. Validation rejects each of these (see *Abstraction guards*).

## The canonical flow

```text
PSYCHOLOGY ──▶ MARKETING PRINCIPLE ──▶ MARKETING MECHANISM ──▶ STRUCTURE ──▶ EXECUTION
(why people may respond)  (strategic direction)  (communication method)  (organisation)  (the actual creative)
```

- **Psychology** (10.2): `curiosity`, `social-proof`, `choice-reduction` … a mechanism *uses* them (`uses` edges).
- **Marketing principle** (10.5): `reduce-perceived-risk`, `make-decision-easier` … a principle is *expressed through* a mechanism.
- **Mechanism** (here): Curiosity Gap, Demonstration, Value Stack …
- **Structure** (10.7): hook / story / visual / copy patterns that express a mechanism. One mechanism → many structures.
- **Execution**: copy, footage, layout. Never stored here.

## One identity system

A mechanism **is** an ontology `creative_mechanism` entity (`../ontology/creative-mechanism.ts`), registered in the same
`OntologyRegistry` as the Psychology Bank. Phase 10.3 added *optional* governance fields to that entity; this module
requires them for every non-draft mechanism. No second mechanism type, registry or relationship vocabulary exists.

| Spec field | Where it lives |
| :-- | :-- |
| `id` / stable `MEC-###` | `id` (readable, kebab) + `code` (never renumbered, never reused). References use `id`. |
| `psychology[]` | `psychologyRefs` + `uses` edges (authored principles) |
| `marketingPrinciples[]` | `marketingPrincipleRefs` (+ `expressedThrough` edge once the principle exists) |
| `worksWith[]` | `compatibleWith` / `oftenCombinedWith` / `supports` edges |
| `avoidWith[]` | `notRecommendedWith` edges **with a stated condition**; `conflictsWith` only for structural contradiction |
| `hook/story/visual/copy structures` | `hookPatternRefs`, `storyStructureRefs`, `visualStructureRefs`, `copyStructureRefs` |
| `assetRequirements[]` | `requiredAssets`, `optionalAssets`, `preferredAssets` |
| `antiPatterns[]` | `constrainedBy` edges (mandatory, ≥1) |
| `ethicalBoundaries[]` | `ethicalConstraints` + `truthfulPreconditions` |
| `evidence`, `confidence`, `assumptions` | `evidence`, `confidence`, `assumptions` (+ `contextualConfidence`, `outcomeLearnings`) |
| `status` | `status` |

## Taxonomy and size

123 mechanisms: narrative & framework 27 · proof & authority 27 · cognitive & psychological 28 · pricing, offer & risk 24
· urgency & scarcity 17. Six entries are `kind: 'framework'` (AIDA, problem–agitation–solution, before/after/bridge,
feature→benefit, benefit→outcome, problem/solution): recognised communication frameworks, deliberately *not* presented
as psychological mechanisms. Codes: gold standard `MEC-001…005`; then bands `1xx` narrative, `2xx` proof, `3xx`
cognitive, `4xx` pricing, `5xx` urgency, so inserting a mechanism never renumbers another.

The five gold-standard entries (Curiosity Gap, Value Stack, Story From Failure, Objection Removal, Insider Knowledge)
are the quality benchmark. They carry corrected definitions: Value Stack *clarifies components* rather than making
refusal "mathematically irresponsible"; Story From Failure treats relatability as conditional, not a guaranteed
pratfall effect; Objection Removal encodes no loss-aversion multiplier; Insider Knowledge is true, relevant, defensible
knowledge — not "secrets the industry hides".

## Overlap review

`mechanism-overlap-review.ts` records every concept from the reference list that was merged, moved to psychology,
renamed or kept distinct, with the reason (e.g. *information gap* → psychology; *open loop* → merged into Curiosity
Gap; *before/after* → merged into Transformation; *good-better-best* → merged into Tiered Pricing; *status play* →
renamed Identity Projection; *origin of the enemy* → renamed Shared Problem Origin). Tests check the library matches.

## Evidence, confidence, learning

`confidenceCeiling(evidence)` (Psychology Bank) caps confidence by what the evidence can justify; an AI-generated
hypothesis never lifts it. **Every shipped mechanism is `hypothesis` with no evidence attached** — nothing is invented.
`contextualConfidence` can differ from general confidence. `outcomeLearnings` (worked / underperformed / failed / neutral
/ unexpected, with context) update contextual compatibility and confidence; they never rewrite the definition.
Example: Curiosity Gap is weak for high-intent, transactional messages (recorded as a weak-situation compatibility
claim), which is *learned context*, not "Curiosity Gap is bad".

## Ethics

- Proof, pricing and urgency/scarcity mechanisms are **elevated**: each must state truthful preconditions and ethical
  boundaries, and be constrained by named prohibitions (`fake-scarcity`, `fabricated-testimonial`, `inflated-value-claim`,
  `false-guarantee`, `fake-waitlist` … 38 `ethical_prohibition` anti-patterns in total).
- Every urgency/scarcity mechanism must **require a real limit asset** (`genuine-deadline`, `real-inventory-data` or
  `capacity-information`). With none available the mechanism is infeasible: manufactured scarcity cannot be encoded.
- A waitlist is only legitimate when access is genuinely constrained; decoy pricing only when every option is real.
- Celebrity/influencer endorsement is not assumed effective: fit, credibility, relevance and risk are explicit.

## Abstraction guards (validation)

Rejected: names containing platforms/assets/numbers (execution), industry-specific names, "viral"/"hack"/"high CTR"
language, psychology ids or names used as mechanism names, structure ids used as non-framework mechanisms, purposes that
promise outcomes, quoted copy / prices / hashtags / emoji, universal claims, behavioral myths, outcomes used as
objectives, unknown vocabulary ids, unknown psychology ids, duplicate ids / names / codes, near-duplicate definitions.

## Selection support (data only)

`MechanismRegistry.query()` filters by category, kind, objective, situation, industry, product type, format, psychology,
principle, compatible / avoid-with mechanism, minimum confidence, risk, required asset. `assetGaps()` /
`partitionByAssets()` tell downstream systems "this mechanism requires evidence you do not have". `profile()` returns
structured quality metadata, deliberately **not a single score**. There is no ranking, recommendation or generation API.

## Deferred references

Marketing principles, structures, assets and audience situations are authored in later phases. Their ids come from
controlled vocabularies (`mechanism-vocabulary.ts`), so they cannot be misspelled; each becomes a real graph edge when
an ontology entity with that id and type exists (`resolveReferenceEdges()`); `referenceCoverage()` reports how many are
resolved; `validate({ strict: true })` makes unresolved ones errors.

## Known limits

Format compatibility is declared for only a handful of mechanisms (empty = not restricted); fuller format mapping belongs
to 10.7/10.8. `industries` means "especially strong in", never a restriction. Evidence is empty across the library.
Content guards are pattern-based and will miss paraphrase; they support, not replace, review.

## Not implemented

Recommendation engine, ranking, campaign-generation integration, UI, persistence, AI-generated mechanisms, a
marketplace, auto-optimisation. Production behaviour is unchanged; nothing imports this module.
