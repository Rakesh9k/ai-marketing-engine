# Phase 1A — Repository Verification Map: Existing Marketing & Campaign Systems

**Document Status**: Authoritative Baseline  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_REPOSITORY_MAP.md`  

---

## Executive Summary & System Boundary Rules

This document provides the authoritative mapping of all 22 existing core components in the Mitra campaign and marketing engine prior to the design and implementation of the **Creative Brain** (Phase 1).

### The Three Structural Pillars
To preserve architectural integrity and prevent privilege or boundary leakage, the system enforces a strict separation between three distinct domains:

1. **BUSINESS BRAIN**: Who the business is, authoritative facts, product catalog, brand identity, operating rules, and verified knowledge provenance.
2. **CREATIVE BRAIN** (Future Phase): What strategic marketing opportunity should be pursued, which creative concept should win, and why (strategic reasoning layer).
3. **EXECUTION ENGINE**: How the selected concept becomes actual marketing assets (stages, AI calls, SVG compositing, video rendering, credit accounting, truth validation, and persistence).

---

## Detailed Mapping of Existing Components

Below is the exhaustive, empirical audit of the 22 components in the codebase.

---

### 1. BusinessBrain

* **Source Files**: 
  * `functions/src/types/index.ts` (`BusinessBrain`, `BrainKnowledge`, `BrainFactSource`)
  * `src/types/index.ts`
  * `functions/src/services/ai/brainForGeneration.ts`
* **Responsibility**: Holds the business identity, location, contact, industry/subcategory taxonomy, catalog products/services/properties, brand tone, audience, owner information, USP positioning, localization defaults, operating rules, vertical profile, and fact provenance (`knowledge.facts`).
* **Input**: Conversational onboarding draft (`NormalizedDraft`) or original wizard input.
* **Output**: `BusinessBrain` object attached to business document.
* **Persistence**: Firestore `businesses/{businessId}` document (`businessBrain` field).
* **Authoritative vs. Derived**: Authoritative (`USER_CONFIRMED` facts) with explicit derived metadata (`DERIVED_FROM_WHATSAPP`, `DERIVED_FROM_SUBCATEGORY`).
* **Deterministic vs. AI-Derived**: Deterministic structure populated by owner input and normalized schemas.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain reads facts from Business Brain. Creative Brain MUST NOT mutate, override, or replace Business Brain.

---

### 2. Business Creation & Onboarding

* **Source Files**: 
  * `functions/src/services/businessCreation.ts` (`createBusinessSchema`, `buildBusiness`)
  * `functions/src/onboarding/brainMapping.ts` (`toBusinessCreation`)
  * `functions/src/functions/businesses/createBusiness.ts`
  * `functions/src/functions/onboarding/confirmOnboardingBusiness.ts`
* **Responsibility**: Validates and executes atomic creation of a business document, initial brand kit, user custom claim update, and initial entitlement bindings.
* **Input**: `CreateBusinessData` or `NormalizedDraft`.
* **Output**: Created `Business` document and default `BrandKit` document.
* **Persistence**: Firestore `businesses/{businessId}` and `businesses/{businessId}/brand_kits/default`.
* **Authoritative vs. Derived**: Authoritative system process.
* **Deterministic vs. AI-Derived**: Deterministic Zod validation and Firestore transaction.
* **Creative Brain Relation**: **LEAVE UNTOUCHED**. Creative Brain has zero involvement in business creation.

---

### 3. Product / Service Context

* **Source Files**: 
  * `functions/src/types/index.ts` (`Product`, `verticalProfile.services`, `verticalProfile.packages`, `verticalProfile.properties`)
  * `functions/src/services/firestore.ts` (`getProductDoc`)
  * `src/features/products/components/ProductForm.tsx`
* **Responsibility**: Manages individual product catalog items (name, description, price, tags, attributes, images), salon services/packages, or real estate property listings.
* **Input**: User catalog forms or inline `newProduct` payload in campaign requests.
* **Output**: `Product` object or vertical profile item snapshot.
* **Persistence**: Firestore `businesses/{businessId}/products/{productId}` or `businesses/{businessId}` (`verticalProfile`).
* **Authoritative vs. Derived**: Authoritative business catalog facts.
* **Deterministic vs. AI-Derived**: Deterministic user-entered catalog data.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain consumes product/service facts as constraints for opportunity evaluation.

---

### 4. Campaign Intent

* **Source Files**: 
  * `functions/src/types/index.ts` (`GenerationPipelineInput`)
  * `functions/src/functions/campaigns/generateCampaignStrategy.ts` (`generateCampaignStrategySchema`)
* **Responsibility**: Captures specific user request parameters for a campaign run: businessId, objective, templateId, styleId, offer (headline, price, validity, terms), duration, audience, CTA, localization, and idempotencyKey.
* **Input**: Frontend wizard submission or calendar item click.
* **Output**: Validated `generateCampaignStrategySchema` payload.
* **Persistence**: Firestore `campaigns/{campaignId}` document fields.
* **Authoritative vs. Derived**: Authoritative user intent.
* **Deterministic vs. AI-Derived**: Deterministic user input.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain receives campaign intent as a primary input parameter to evaluate creative opportunities.

---

### 5. CampaignStrategy Output

* **Source Files**: 
  * `functions/src/services/ai/pipeline.ts` (`CampaignStrategySchema`, `runStage3`)
  * `functions/src/types/index.ts` (`CampaignStrategyOutput`)
* **Responsibility**: Generates strategic marketing angle, hook, offer framing, audience insight, 5 key messages, CTA strategy, differentiators, visual style hints, and risk flags.
* **Input**: `GenerationPipelineInput`, Stage 1 (Business Understanding) & Stage 2 (Product Understanding) outputs.
* **Output**: `CampaignStrategyOutput`.
* **Persistence**: Recorded in `stageResults.campaignStrategy` within pipeline trace on `campaigns/{campaignId}` document.
* **Authoritative vs. Derived**: Derived (AI-generated).
* **Deterministic vs. AI-Derived**: AI-derived (Gemini text generation).
* **Creative Brain Relation**: **REPLACE / TRANSFORM**. Currently, Stage 3 generates strategy in a linear fashion. Creative Brain will take over strategic reasoning by outputting a validated **Creative Blueprint** that informs Stage 3 execution.

---

### 6. CreativeTemplate & Registry

* **Source Files**: 
  * `functions/src/config/creativeTemplateLibrary.ts`
  * `functions/src/services/creativeTemplateRegistry.ts`
  * `functions/src/services/ai/creativeTemplateContext.ts`
  * `functions/src/types/index.ts` (`CreativeTemplate`, `CreativeStructure`, `VisualGrammar`, `AdaptationRule`)
* **Responsibility**: Maintains library of 30 built-in templates specifying objective compatibility, compatible verticals, grammar roles, visual emphasis/composition, adaptation rules, and constraints.
* **Input**: `templateId` (optional) or lookup by objective/vertical.
* **Output**: `CreativeTemplate` definition and `CreativeTemplateContext`.
* **Persistence**: In-memory static system library configuration.
* **Authoritative vs. Derived**: Authoritative system configuration.
* **Deterministic vs. AI-Derived**: Deterministic template definitions.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain evaluates available templates against creative opportunities and selects the winning template for the Creative Blueprint.

---

### 7. TemplateAdaptationPlanner

* **Source Files**: 
  * `functions/src/services/ai/templateAdaptation.ts` (`TemplateAdaptationPlanner`)
* **Responsibility**: Plans template adaptation by evaluating `AdaptationRule` conditions against `CreativeContextSelector` state to include, exclude, emphasize, or fallback grammar roles.
* **Input**: `template`, `selectedContext`, `objective`.
* **Output**: Adapted creative plan (`adaptedCreativePlan`).
* **Persistence**: In-memory execution artifact in `pipeline.ts`.
* **Authoritative vs. Derived**: Derived.
* **Deterministic vs. AI-Derived**: Mixed (Rule evaluation + Gemini output formatting).
* **Creative Brain Relation**: **SUBSUME / REPLACE**. Creative Brain incorporates concept adaptation rules directly into its Creative Concept and Blueprint generation.

---

### 8. SavedStyle

* **Source Files**: 
  * `functions/src/types/index.ts` (`SavedStyle`, `SavedStyleContext`)
  * `functions/src/services/savedStyle.ts`
  * `functions/src/functions/savedStyles/*`
* **Responsibility**: Stores visual and creative style parameters (tone, visualDensity, productProminence, textDensity, colorMode, humor, ctaStyle, composition, visualHierarchy, shotPacing).
* **Input**: Reference image analysis (`analyzeReferenceStyle`) or manual creation.
* **Output**: `SavedStyle` document.
* **Persistence**: Firestore `businesses/{businessId}/saved_styles/{styleId}`.
* **Authoritative vs. Derived**: Authoritative style preference for the business.
* **Deterministic vs. AI-Derived**: Mixed (User configuration or AI reference style extraction).
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain reads active `SavedStyle` as a style constraint during concept generation and scoring.

---

### 9. CreativePreference

* **Source Files**: 
  * `functions/src/types/index.ts` (`CreativePreference`)
  * `functions/src/services/firestore.ts` (`getCreativePreferencesByBusiness`)
* **Responsibility**: Tracks business-level affinity or avoidance for specific templates (`preferred`, `avoided`, `confidence`, `evidenceCount`).
* **Input**: Implicit user approval/rejection or explicit selection.
* **Output**: Array of preferred and avoided template IDs.
* **Persistence**: Firestore `creative_preferences/{preferenceId}`.
* **Authoritative vs. Derived**: Derived from user interaction history.
* **Deterministic vs. AI-Derived**: Deterministic aggregation.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain reads preferences as historical memory signals to score concepts.

---

### 10. CreativeFeedback

* **Source Files**: 
  * `functions/src/types/index.ts` (`CreativeFeedback`)
  * `functions/src/functions/campaigns/submitCreativeFeedback.ts`
* **Responsibility**: Stores user feedback on generated creatives (`positive`/`negative`, `reasons`: `more_premium`, `more_local`, `less_text`, `more_product_focused`, etc.).
* **Input**: User feedback submission in UI.
* **Output**: `CreativeFeedback` document.
* **Persistence**: Firestore `creative_feedback/{feedbackId}`.
* **Authoritative vs. Derived**: Authoritative user feedback.
* **Deterministic vs. AI-Derived**: Deterministic persistence.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain consumes historical feedback as memory signals during opportunity and concept scoring.

---

### 11. CampaignPerformance

* **Source Files**: 
  * `functions/src/types/index.ts` (`CampaignPerformance`)
  * `functions/src/services/recommendation/performanceRecommendationService.ts`
  * `functions/src/functions/analytics/recordWhatsAppClick.ts`
* **Responsibility**: Tracks real-world campaign metrics (`whatsappClicks`, `inquiries`, Meta post engagement).
* **Input**: Verified analytics events, WhatsApp clicks, Meta performance sync.
* **Output**: `CampaignPerformance` document and `GenerationRecommendationContext`.
* **Persistence**: Firestore `campaign_performance/{campaignId}`.
* **Authoritative vs. Derived**: Authoritative performance metrics.
* **Deterministic vs. AI-Derived**: Deterministic tracking.
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Creative Brain consumes performance recommendations as empirical feedback signals.

---

### 12. CreativeContextSelector

* **Source Files**: 
  * `functions/src/services/ai/creativeContextSelector.ts`
* **Responsibility**: Selects token-budgeted context slices (business identity, product, offer, location, tone, brand rules) for prompt construction.
* **Input**: `templateContext`, `task`.
* **Output**: `selectedContext` dictionary.
* **Persistence**: Transient in-memory execution artifact.
* **Authoritative vs. Derived**: Derived.
* **Deterministic vs. AI-Derived**: Deterministic filtering logic.
* **Creative Brain Relation**: **SUBSUME / REPLACE**. Creative Brain will manage its own structured context assembly for concept generation and scoring.

---

### 13. Conflict Resolution Engine

* **Source Files**: 
  * `functions/src/services/ai/conflictResolver.ts` (`resolveUserInstructionConflicts`)
* **Responsibility**: Resolves conflicting directives across user input, Business Brain, brand kit, and vertical rules following strict hierarchy: Non-negotiable fact > Business rule > User prompt > Default.
* **Input**: `GenerationPipelineInput`.
* **Output**: `ConflictResolutionPlan` (`resolvedInput`, `conflictsDetected`, `geminiDirectives`).
* **Persistence**: Transient, recorded in `pipelineTrace.conflictResolution`.
* **Authoritative vs. Derived**: Derived resolution of authoritative inputs.
* **Deterministic vs. AI-Derived**: Deterministic rule evaluation.
* **Creative Brain Relation**: **CONSUME & INTEGRATE**. Creative Brain consumes conflict resolution outputs so that all generated opportunities and concepts comply with non-negotiable rules.

---

### 14. GenerationPipeline (Orchestrator)

* **Source Files**: 
  * `functions/src/services/ai/pipeline.ts` (`GenerationPipeline`)
* **Responsibility**: Orchestrates the 13-stage campaign generation execution flow.
* **Input**: `GenerationPipelineInput`.
* **Output**: `GenerationPipelineOutput` (`campaignPack`, `pipelineTrace`, `allGeneratedStoragePaths`).
* **Persistence**: Updates `campaigns/{campaignId}` document status transitions.
* **Authoritative vs. Derived**: System orchestrator.
* **Deterministic vs. AI-Derived**: Deterministic orchestration of AI calls.
* **Creative Brain Relation**: **ARCHITECTURAL HOST**. Creative Brain will be invoked inside `GenerationPipeline.execute()` after Stage 2 (Product Understanding) and before Stage 3 (Campaign Strategy).

---

### 15. Stage 1 — Business Understanding

* **Source Files**: 
  * `functions/src/services/ai/pipeline.ts` (`runStage1`, `BusinessUnderstandingSchema`)
* **Responsibility**: Summarizes Business Brain facts, missing info, constraints, and vertical context.
* **Input**: `GenerationPipelineInput`.
* **Output**: `BusinessUnderstandingOutput`.
* **Persistence**: `stageResults.businessUnderstanding` in trace.
* **Authoritative vs. Derived**: Derived (AI summary of authoritative facts).
* **Deterministic vs. AI-Derived**: AI-derived (Gemini structured text).
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Provides parsed business context to Creative Brain.

---

### 16. Stage 2 — Product Understanding

* **Source Files**: 
  * `functions/src/services/ai/pipeline.ts` (`runStage2`, `ProductUnderstandingSchema`)
  * `functions/src/services/ai/vision.ts` (`analyzeProductImages`)
* **Responsibility**: Extracts product summary, visual attributes, and 5 marketing angles from product metadata or Vision AI image analysis.
* **Input**: `GenerationPipelineInput`, Stage 1 output, product images.
* **Output**: `ProductUnderstandingOutput`.
* **Persistence**: `stageResults.productUnderstanding` in trace.
* **Authoritative vs. Derived**: Derived (Vision AI + metadata extraction).
* **Deterministic vs. AI-Derived**: AI-derived (Gemini Vision + text model).
* **Creative Brain Relation**: **CONSUME (Read-Only)**. Provides parsed product visual attributes and initial angles to Creative Brain.

---

### 17. Stage 3 — Campaign Strategy

* **Source Files**: 
  * `functions/src/services/ai/pipeline.ts` (`runStage3`, `CampaignStrategySchema`)
* **Responsibility**: Generates campaign strategy outputs (angle, hook, offer framing, audience insight, key messages, CTA strategy).
* **Input**: `GenerationPipelineInput`, Stage 1 & Stage 2 outputs.
* **Output**: `CampaignStrategyOutput`.
* **Persistence**: `stageResults.campaignStrategy` in trace.
* **Authoritative vs. Derived**: Derived.
* **Deterministic vs. AI-Derived**: AI-derived.
* **Creative Brain Relation**: **TRANSFORM / EXECUTE BLUEPRINT**. In Phase 2+, Stage 3 will execute against the winning **Creative Blueprint** produced by Creative Brain.

---

### 18. Deterministic Truth Check

* **Source Files**: 
  * `functions/src/services/ai/truthCheck.ts` (`runDeterministicTruthCheck`, `computeSourceFingerprint`, `computeVerticalFactsFingerprint`)
  * `functions/src/functions/campaigns/generateCampaignStrategy.ts` (Stage 11 & final gating)
* **Responsibility**: Deterministically compares generated text against authoritative business facts (phone, WhatsApp, location, price, delivery radius, min order, vertical profile). Hard-gates campaign persistence and credit charges.
* **Input**: Generated assets, Business Brain, Product, VerticalConfig.
* **Output**: `TruthCheckResult` (`PASS`, `FAIL`, `REVIEW_REQUIRED`, checks, summary, fingerprints).
* **Persistence**: Stored on `campaigns/{campaignId}` document (`metadata.truthCheckResult`).
* **Authoritative vs. Derived**: Authoritative deterministic validation.
* **Deterministic vs. AI-Derived**: 100% Deterministic string/numeric comparison.
* **Creative Brain Relation**: **LEAVE UNTOUCHED & PROTECTED**. Creative Brain must NEVER bypass, alter, or replace Truth Check.

---

### 19. AI Validation Stages (Stages 8, 9, 10)

* **Source Files**: 
  * `functions/src/services/ai/pipeline.ts` (`runStage8` Truth Validation, `runStage9` Quality Validation, `runStage10` Safety Validation)
  * `functions/src/services/ai/validation.ts`
* **Responsibility**: Performs AI-based validation of generated creative assets for factual alignment (Stage 8), visual/text quality (Stage 9), and content safety (Stage 10).
* **Input**: Generated campaign assets, inputs, previous stage outputs.
* **Output**: `TruthValidationOutput`, `QualityValidationOutput`, `SafetyValidationOutput`.
* **Persistence**: `stageResults.truthValidation`, `qualityValidation`, `safetyValidation` in trace.
* **Authoritative vs. Derived**: Derived (AI validation).
* **Deterministic vs. AI-Derived**: AI-derived checks.
* **Creative Brain Relation**: **LEAVE UNTOUCHED & PROTECTED**. Creative Brain outputs must satisfy all downstream validation stages.

---

### 20. SVG Compositor

* **Source Files**: 
  * `functions/src/services/ai/compositor.ts` (`composeCreativeSVG`)
  * `src/lib/rasterizeSvg.ts`
* **Responsibility**: Deterministically overlays verified text (business name, headline, price, offer badge, CTA, phone, locality, logo) onto base image bytes to output responsive SVG (`image/svg+xml`).
* **Input**: `baseImage` (data URI), `overlay` (`CreativeTextOverlay`), `brand` (`CreativeBrandStyle`), `format` (`poster` | `story`).
* **Output**: Self-contained responsive SVG string.
* **Persistence**: Storage objects (`image/svg+xml`).
* **Authoritative vs. Derived**: Authoritative deterministic rendering.
* **Deterministic vs. AI-Derived**: 100% Deterministic SVG layout generation.
* **Creative Brain Relation**: **LEAVE UNTOUCHED & PROTECTED**. Creative Brain does NOT render images or compose SVGs.

---

### 21. Reel Generation Subsystem

* **Source Files**: 
  * `functions/src/functions/reels/createReelProject.ts`
  * `functions/src/functions/reels/generateReel.ts`
  * `functions/src/services/ai/reelPipeline.ts`
  * `functions/src/services/videoRenderer.ts`
* **Responsibility**: Analyzes raw uploaded video clips (`reel_clip`), generates AI edit plans (`ReelEditPlan`), and renders vertical 1080x1920 MP4 videos using FFmpeg, audio mixing, and text burn-in.
* **Input**: `ReelProject` parameters, uploaded clip assets.
* **Output**: Rendered MP4 video file and `ReelProject` document.
* **Persistence**: Firestore `reels/{reelId}` and Firebase Storage MP4s.
* **Authoritative vs. Derived**: System feature and video renderer.
* **Deterministic vs. AI-Derived**: Mixed (AI edit plan + FFmpeg deterministic rendering).
* **Creative Brain Relation**: **LEAVE UNTOUCHED & PROTECTED**. Creative Brain does NOT render videos or execute FFmpeg.

---

### 22. Campaign Persistence & Usage Control

* **Source Files**: 
  * `functions/src/services/firestore.ts` (`createCampaignDoc`, `updateCampaignDoc`, `createCampaignAssets`, `getCampaignByIdempotencyKey`)
  * `functions/src/services/usageControl.ts` (`executeWithUsageControl`)
  * `functions/src/functions/campaigns/generateCampaignStrategy.ts`
* **Responsibility**: Manages Firestore campaign state transitions (`validating` -> `analyzing` -> `generating_creatives` -> `validating_output` -> `verified`/`generated`/`failed`), atomic credit reservations/refunds/deductions, and `campaign_assets` persistence.
* **Input**: Campaign document payloads, transaction tokens.
* **Output**: Firestore document writes and ledger transactions.
* **Persistence**: Firestore `campaigns`, `campaign_assets`, `transactions`, `usage`.
* **Authoritative vs. Derived**: Authoritative system persistence.
* **Deterministic vs. AI-Derived**: Deterministic database & accounting logic.
* **Creative Brain Relation**: **LEAVE UNTOUCHED & PROTECTED**. Creative Brain must NOT handle payment, credit reservation, or direct campaign persistence.

---

## Summary Matrix

| # | Component | Primary Source File | Authoritative / Derived | Deterministic / AI | Creative Brain Action |
|---|---|---|---|---|---|
| 1 | BusinessBrain | `functions/src/types/index.ts` | Authoritative | Deterministic | CONSUME (Read-Only) |
| 2 | Business Creation | `functions/src/services/businessCreation.ts` | Authoritative | Deterministic | LEAVE UNTOUCHED |
| 3 | Product / Service Context | `functions/src/types/index.ts` | Authoritative | Deterministic | CONSUME (Read-Only) |
| 4 | Campaign Intent | `functions/src/functions/campaigns/generateCampaignStrategy.ts` | Authoritative | Deterministic | CONSUME (Read-Only) |
| 5 | CampaignStrategy | `functions/src/services/ai/pipeline.ts` | Derived | AI-Derived | REPLACE / TRANSFORM |
| 6 | CreativeTemplate | `functions/src/config/creativeTemplateLibrary.ts` | Authoritative | Deterministic | CONSUME (Read-Only) |
| 7 | TemplateAdaptationPlanner | `functions/src/services/ai/templateAdaptation.ts` | Derived | Mixed | SUBSUME / REPLACE |
| 8 | SavedStyle | `functions/src/services/savedStyle.ts` | Authoritative | Mixed | CONSUME (Read-Only) |
| 9 | CreativePreference | `functions/src/types/index.ts` | Derived | Deterministic | CONSUME (Read-Only) |
| 10 | CreativeFeedback | `functions/src/types/index.ts` | Authoritative | Deterministic | CONSUME (Read-Only) |
| 11 | CampaignPerformance | `functions/src/types/index.ts` | Authoritative | Deterministic | CONSUME (Read-Only) |
| 12 | CreativeContextSelector | `functions/src/services/ai/creativeContextSelector.ts` | Derived | Deterministic | SUBSUME / REPLACE |
| 13 | Conflict Resolution | `functions/src/services/ai/conflictResolver.ts` | Derived | Deterministic | CONSUME & INTEGRATE |
| 14 | GenerationPipeline | `functions/src/services/ai/pipeline.ts` | System | Deterministic | ARCHITECTURAL HOST |
| 15 | Stage 1 (Business Und.) | `functions/src/services/ai/pipeline.ts` | Derived | AI-Derived | CONSUME (Read-Only) |
| 16 | Stage 2 (Product Und.) | `functions/src/services/ai/pipeline.ts` | Derived | AI-Derived | CONSUME (Read-Only) |
| 17 | Stage 3 (Campaign Strat.) | `functions/src/services/ai/pipeline.ts` | Derived | AI-Derived | TRANSFORM / EXECUTE |
| 18 | Truth Check | `functions/src/services/ai/truthCheck.ts` | Authoritative | 100% Deterministic | LEAVE UNTOUCHED & PROTECTED |
| 19 | Validation Stages | `functions/src/services/ai/pipeline.ts` | Derived | AI-Derived | LEAVE UNTOUCHED & PROTECTED |
| 20 | SVG Compositor | `functions/src/services/ai/compositor.ts` | Authoritative | 100% Deterministic | LEAVE UNTOUCHED & PROTECTED |
| 21 | Reel Generation | `functions/src/services/videoRenderer.ts` | System | Mixed | LEAVE UNTOUCHED & PROTECTED |
| 22 | Campaign Persistence | `functions/src/services/firestore.ts` | Authoritative | Deterministic | LEAVE UNTOUCHED & PROTECTED |

