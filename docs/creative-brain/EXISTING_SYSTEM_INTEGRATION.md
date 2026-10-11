# Existing System Integration & Mapping (Phase 1J)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1J)  
**Location**: `docs/creative-brain/EXISTING_SYSTEM_INTEGRATION.md`  

---

## 1. Mapping Matrix: Creative Brain Outputs to Existing Consumers

The table below maps every output and directive emitted by Creative Brain to its target consumer within the existing `GenerationPipeline` (`functions/src/services/ai/pipeline.ts`), detailing current implementation, future integration points, and backward compatibility requirements.

| Creative Brain Output | Existing Consumer | Current Implementation | Future Integration Point | Backward Compatibility Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **`blueprintId` & `trace`** | Trace & Logging | `PipelineTrace` metadata on `campaigns/{campaignId}` doc | `GenerationPipeline.execute()` final trace builder (Stage 13) | Must append to `pipelineTrace` without breaking existing `PipelineTrace` interface. |
| **`opportunity.strategicAngle`** | Stage 3 Campaign Strategy | Stage 3 LLM generates angle from Stage 1 & 2 outputs (`runStage3()`) | Injected directly into Stage 3 prompt as fixed constraint | `CampaignStrategySchema.angle` field format must remain unchanged. |
| **`strategyDirectives.hook`** | Stage 3 Campaign Strategy | Stage 3 LLM generates hook string | Injected into Stage 3 prompt and passed to Stage 5 | `CampaignStrategySchema.hook` string format preserved. |
| **`strategyDirectives.keyMessages`** | Stage 3 Campaign Strategy | Stage 3 LLM generates 5 key messages array | Stage 3 prompt constrains output messages to Blueprint key message themes | Must output array of exactly 5 strings to satisfy `CampaignStrategySchema`. |
| **`copyDirectives.headlineTone`** | Stage 5 Copy Generation | Stage 5 LLM infers headline tone from `localizationProfile` | Passed into Stage 5 `CopyPackSchema` prompt context | `CopyPackSchema.headlines` schema structure remains unchanged. |
| **`copyDirectives.prohibitedTerms`** | Stage 5 Copy Generation | Negative constraints passed from `conflictResolver.ts` | Appended to Stage 5 negative vocabulary directives | Must not restrict mandatory Level 0 business terms (e.g. price/name). |
| **`visualDirectives.emphasis`** | Stage 6 Image Prompts | Inferred from `creativeTemplateContext.template.visualGrammar` | Passed into `buildImagePromptPack()` in Stage 6 | Must be valid `VisualEmphasis` enum (`product-led`, `offer-led`, etc.). |
| **`visualDirectives.composition`** | Stage 6 Image Prompts | Inferred from template `visualGrammar.composition` | Passed into `buildImagePromptPack()` in Stage 6 | Must be valid `VisualComposition` enum (`hero-product`, `split-composition`, etc.). |
| **`visualDirectives.textOverlayRules`**| Stage 7 Compositor | Fixed rules evaluated inside `runStage7()` | Passed directly into `composeCreativeSVG()` overlay options | Must strictly preserve exact numeric price and offer badge flags. |
| **`selectedTemplateId`** | Creative Template Context | `input.templateId` supplied by client or default | Overrides default template selection in `buildCreativeTemplateContext()` | Template ID MUST exist in `creativeTemplateRegistry`. |
| **`selectedConcept.grammar`** | Stage 5 Copy Generation | Template grammar extracted directly from static template definition | Custom/Adapted grammar passed into Stage 5 concept structure | Must use valid `CreativeGrammarStep` role enums (`hook`, `product`, `offer`, `cta`). |

---

## 2. Integration Mapping for Key Subsystems

### A. Stage 3 Campaign Strategy (`runStage3`)
* **Current**: Stage 3 calls Gemini to invent campaign angle, hook, framing, messages, and direction from raw stage 1 & 2 outputs.
* **Future**: Stage 3 receives `CreativeBlueprint.strategyDirectives`. Instead of inventing strategy from scratch, Stage 3 expands the Blueprint's validated strategy directives into localized text variants.

### B. Stage 4 Localization (`runStage4`)
* **Current**: Stage 4 generates vocabulary dictionaries, slang guides, and phrasing rules based on `localizationProfile`.
* **Future**: Stage 4 ingests `CreativeBlueprint.copyDirectives.primaryLanguage` and `regionalStyle` to constrain vocabulary selection within Blueprint tone boundaries.

### C. Stage 5 Copy Generation (`runStage5`)
* **Current**: Stage 5 generates 5 headlines, 5 ad copies, 5 captions, 3 story concepts, 3 reel concepts, and 1 WhatsApp message using static template grammar.
* **Future**: Stage 5 uses `CreativeBlueprint.selectedConcept.grammar` and `copyDirectives` to generate copy variants adhering strictly to the Blueprint hook and message boundaries.

### D. Stage 6 Image Prompts (`runStage6`)
* **Current**: Stage 6 generates prompts using `buildImagePromptPack()`.
* **Future**: Stage 6 ingests `CreativeBlueprint.visualDirectives` (`emphasis`, `composition`, `heroPromptGuidance`) to build targeted hero image prompts.

### E. Stage 7 SVG Compositor (`compositor.ts`)
* **Current**: `composeCreativeSVG()` composites hero image data URI with verified text overlay.
* **Future**: `composeCreativeSVG()` receives `CreativeBlueprint.visualDirectives.textOverlayRules` to control badge display and CTA placement deterministically.

### F. Memory & Style Services (`SavedStyle`, `CreativePreference`, `CreativeFeedback`, `CampaignPerformance`)
* **Current**: Queried ad-hoc during template context creation (`getCreativePreferencesByBusiness`, `buildGenerationRecommendationContext`).
* **Future**: Aggregated upfront into `CreativeBrainInput.memory` context, consumed exclusively by Creative Brain during candidate scoring.
