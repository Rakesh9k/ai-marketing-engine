# Story Intelligence System Documentation

## Overview
The **Story Intelligence System** provides reusable narrative architectures (Story Grammars) that power Mitra’s Creative Intelligence. It sits between the **Insight Pattern Library** and the **Hook Intelligence System**, guiding the sequencing of ideas before Gemini generates the final copy.

- **Purpose** – Enable Mitra to answer *“What is really going on underneath the obvious customer behavior?”* by selecting an appropriate story structure, populating it with variables, and ensuring ethical compliance.
- **Key Concepts**
  - **StoryGrammar** – Reusable narrative architecture (e.g., Problem → Agitation → Solution).
  - **Beat** – An ordered building block of a story (id, label, description, order, requiredVariables).
  - **Variable** – Placeholder that can be injected into beats during generation.
  - **Compatibility** – Story grammars reference compatible HookPatterns, InsightPatterns, AudienceSituations, etc.
  - **Ethical Boundaries** – Prevent deceptive claims (fabricated scarcity, false statistics, etc.).

## File Structure
```
functions/src/services/creativeIntelligence/
│
├─ ontology/
│   └─ story-structure.ts      # StoryGrammar Zod schema & type
│
├─ validation/
│   ├─ storyGrammarValidator.ts   # Validation logic
│   └─ storyGrammar.test.ts        # Jest test suite
│
├─ registry/
│   └─ storyGrammarRegistry.ts    # Registers STORY‑001 … STORY‑010
│
├─ generation/
│   └─ storyGenerationContract.ts # Input / output contracts for Gemini
│
└─ stories/README.md               # ← This documentation file
```

## StoryGrammar Schema (`story-structure.ts`)
The schema is built with `defineEntitySchema('story_structure', { … })` and includes:
- **Base fields** – `slug`, `name`, `version`, `status`, `definition`, `semanticPurpose`, `category`.
- **Narrative beats** – `beats` array with `id`, `label`, `description`, `order`, optional `requiredVariables`.
- **Timing / density / emotionalArc** – Optional enums to hint at length and feel.
- **Compatibility arrays** – References to other ontology entities (`compatibleHooks`, `compatibleInsights`, …) using `EntityRefSchema`.
- **Variables** – Name, description, type (`string|number|boolean|enum`), optional enum values.
- **Ethical boundaries, risks, strengths, weaknesses, culturalContexts**, etc.
- **Examples / antiExamples** – Free‑form strings for documentation purposes.

## Validation (`validation/storyGrammarValidator.ts`)
The `validateStoryGrammar` function returns an array of `ValidationIssue` objects. It checks:
1. **Sequential beat ordering** (1,2,3,…).  
2. **Variable existence** – each beat’s `requiredVariables` must be defined in `variables`.
3. **Variable type correctness** – only allowed types; enums need `enumValues`.
4. **Reference existence** – all `EntityRef` entries point to a registered entity in the `OntologyRegistry`.
5. **Ethical boundaries** – disallows prohibited phrases (`fabricated scarcity`, `false statistics`, etc.).

## Tests (`validation/storyGrammar.test.ts`)
Jest tests verify:
- A minimal valid grammar passes with **zero** issues.
- An intentionally broken grammar reports ordering errors, missing variables, and prohibited ethical boundaries.
Run with the project’s test command, e.g.:
```bash
npm test
```
All tests should pass before merging.

## Registration (`registry/storyGrammarRegistry.ts`)
The file defines an array `storyGrammars` containing the ten core grammars (STORY‑001 … STORY‑010) listed in the brief. Each grammar follows the schema defined above. The `registerStoryGrammars` function iterates over the array and registers each grammar via:
```ts
OntologyRegistry.register('story_structure', grammar);
```
The module auto‑registers on import, so simply importing the file ensures the library is available.

## Generation Contract (`generation/storyGenerationContract.ts`)
Two Zod schemas expose the contract for Gemini:
- **StoryGenerationInputSchema** – captures business context, audience situation, insight pattern, marketing objective, optional hook pattern, selected story grammar, a flat `variables` payload, output length, platform, and ethical constraints.
- **StoryGenerationOutputSchema** – returns the generated `storyCopy`, optionally a structured `beats` array with populated content, any `warnings`, and a confidence score.
Exported TypeScript types (`StoryGenerationInput`, `StoryGenerationOutput`) are used by the Gemini service implementation.

## Extending the Library
1. **Create a new StoryGrammar object** in `storyGrammarRegistry.ts` following the schema.
2. **Add it to the `storyGrammars` array** and run the registration module again (or restart the service).
3. **Write unit tests** in `validation/storyGrammar.test.ts` to assert the new grammar validates correctly.
4. **Update documentation** with a description and use‑case.

## Ethical Guidelines
- Never include fabricated scarcity, false statistics, fake testimonials, or misleading urgency.
- Use the `ethicalBoundaries` field to list allowed constraints and rely on the validator to enforce them.
- Gemini generation must respect the `ethicalConstraints` array supplied in the input contract.

---
*Generated by Antigravity – your AI coding assistant.*
