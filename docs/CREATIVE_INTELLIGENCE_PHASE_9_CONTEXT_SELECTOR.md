# Phase 9: Creative Context Selector

## 1. Why the Context Selector exists
The Context Selector establishes a deterministic boundary between the raw, available Business Brain / Template constraints and the actual AI orchestrators. Instead of passing massive unstructured documents into every AI generation payload (which inflates token cost, lowers attention, leaks boundaries, and impacts generation quality), the selector intercepts the payload and strictly minimizes it down to the elements required for the specific AI 	ask.

## 2. Architectural Position
It resides conceptually inside the AI Orchestration layer but cleanly decoupled from prompt text:

\\\	ext
Business Brain
      ?
Available Context
      ?
Task + Template
      ?
Context Selector
      ?
Selected Context
      ?
AI
\\\

## 3. CreativeTask
Tasks describe actual boundaries within the orchestration layer where AI is invoked, for instance: \usiness_understanding\, \product_understanding\, \creative_copy\, \image_prompt\, \image_generation\, \eel_shot_plan\, \	ruth_check\. These denote the *operation* being performed, not merely the type of creative (Post/Reel).

## 4. CreativeContextKey
This explicitly types the different contextual buckets that can be permitted across the intelligence barrier (e.g. \rand\, \product\, \offer\, \localization\, \usinessRules\, \isualPreferences\, \logo\, \colors\, \cta\, \pprovedHumor\, \shotConstraints\). 

## 5. CreativeContextRequirements & Template-aware Selection
Tasks have baseline requirements (e.g., \image_generation\ may need \isualPreferences\, \logo\, and \colors\). However, the template structure may dynamically inform context demands. For example, a template grammar that dictates an \offer\ semantic role will upgrade the \offer\ bucket to 'required' if the task permits it.

## 6. Business Brain & Product/Offer/Audience/Brand/Localization Filtering
The selector fully ensures tenant isolation and context reduction. It maps exactly what is asked for into a strictly shaped payload (\SelectedCreativeContext\). Raw Database models, undocumented business notes, performance stats, and all irrelevant PII or financial tokens are entirely excluded. Only the requested slices (e.g., only colors and logo for images) are passed through.

## 7. Required vs Optional & Missing Context
The selector deterministically records missing required fields inside \missingRequired\. It distinguishes between a field that was not needed (and thereby omitted safely) versus a field that the template/task specifically demanded but the user/business failed to provide. It avoids AI hallucinations by failing cleanly.

## 8. POST & Reel Integration
The selector is a completely shared component. Post text generation (\creative_copy\), Post image generation (\image_generation\), and Reel video planning (\eel_shot_plan\) all invoke \selectCreativeContext(...)\ with their unique task tags to filter the same canonical \CreativeTemplateContext\ down into entirely different operational payloads.

## 9. Historical context handling
If historical humor/examples are provided in the available context, they are exposed inside \pprovedHumor\. The selector does not synthesize memory—it merely opens the gateway if the architecture supplies it for a valid task.

## 10. Security/privacy boundaries
Absolutely no AI provider-specific syntax leaks into the domain layer. 

## 11. Tests & Typecheck
All tests reside in \unctions/src/services/ai/creativeContextSelector.test.ts\, validating the complete matrix of template-awareness and task-awareness alongside determinism and data-leak safety. Typecheck passes with zero \ny\ casts violating the contract.

## 12. Deferred intelligence work
Future expansions can add more refined contextual buckets (like performance metrics) without breaking existing tasks, simply by updating the \TASK_REQUIREMENTS\ map.
