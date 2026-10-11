# Phase 1J, 1K & 1L — System Mapping, Fallbacks, and Adaptive Learning Boundary

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_SYSTEM_MAPPING_AND_FALLBACKS.md`  

---

## Phase 1J — Existing-System Mapping

This section maps each section of the **Creative Blueprint** to the downstream execution stages in `GenerationPipeline` (`functions/src/services/ai/pipeline.ts`).

```
+-------------------------------------------------------------------------------+
|                              CREATIVE BLUEPRINT                               |
+---------------------------------------+---------------------------------------+
                                        |
      ┌─────────────────────────────────┼─────────────────────────────────┐
      │                                 │                                 │
      v                                 v                                 v
+-------------------+         +-------------------+         +-------------------+
| StrategyDirectives|         |  CopyDirectives   |         | VisualDirectives  |
+---------+---------+         +---------+---------+         +---------+---------+
          │                             │                             │
          v                             v                             v
+-------------------+         +-------------------+         +-------------------+
| Stage 3 Execution |         | Stage 5 Copy Pack |         | Stage 6 & Stage 7 |
| (Campaign Strategy|         | (Headlines, Ad    |         | (Hero Prompt &    |
| Angle & Messages) |         | Copies, Captions) |         | SVG Compositor)   |
+---------+---------+         +---------+---------+         +---------+---------+
          │                             │                             │
          └─────────────────────────────┼─────────────────────────────┘
                                        │
                                        v
                      +-----------------------------------+
                      | Stage 8 - 11 Validation & Truth   |
                      | Check (Deterministic Verification)|
                      +-----------------------------------+
```

### Detailed Mapping Table

| Blueprint Field | Target Pipeline Stage | Target Function / File | Effect on Execution Engine |
| :--- | :--- | :--- | :--- |
| `selectedTemplateId` | Template Selection | `buildCreativeTemplateContext.ts` | Loads target `CreativeTemplate` from registry. |
| `strategyDirectives.angle` | Stage 3 Campaign Strategy | `runStage3()` in `pipeline.ts` | Injects pre-validated strategic angle into prompt. |
| `strategyDirectives.keyMessages` | Stage 3 Campaign Strategy | `runStage3()` in `pipeline.ts` | Constrains 5 key messages to blueprint directives. |
| `copyDirectives.headlineTone` | Stage 5 Copy Generation | `runStage5()` in `pipeline.ts` | Guides headline variant tone generation. |
| `copyDirectives.prohibitedTerms` | Stage 5 Copy Generation | `runStage5()` in `pipeline.ts` | Appends negative vocabulary constraints. |
| `visualDirectives.emphasis` | Stage 6 Image Prompts | `runStage6()` / `imagePromptBuilder.ts` | Sets visual focus (`product-led`, `offer-led`). |
| `visualDirectives.composition` | Stage 6 Image Prompts | `runStage6()` / `imagePromptBuilder.ts` | Directs hero image spatial composition. |
| `visualDirectives.textOverlayRules`| Stage 7 Compositor | `runStage7()` / `compositor.ts` | Governs SVG text overlay flags (strikethrough, badge). |

---

## Phase 1K — Failure and Fallback Behavior

Creative Brain must operate with high availability. If Creative Brain reasoning fails for any reason, the pipeline must seamlessly fall back to a **Deterministic Baseline Blueprint** without failing the user request or crashing the execution engine.

### 1. Trigger Conditions for Fallback

A fallback is triggered if any of the following occur during Creative Brain execution:

1. **AI Service Exception / Timeout**: Gemini API failure or network timeout (> 10 seconds).
2. **Schema Output Malformation**: Unable to parse LLM structured output into valid `CreativeOpportunity` or `CreativeConcept`.
3. **Low Concept Viability**: All $N$ generated concepts receive $\text{TotalScore} < 70$.
4. **Pre-Execution Truth Check Violation**: High-level Level 0 factual mismatch detected during pre-validation.

---

### 2. Deterministic Baseline Blueprint (Fallback)

When a fallback is triggered, Creative Brain instantly emits a static **Baseline Blueprint** derived from system defaults:

```typescript
export function buildFallbackBlueprint(input: CreativeBrainInput): CreativeBlueprint {
  const defaultObjective = input.intent.objective;
  const templateId = input.intent.templateId || 'festival-offer-v1';
  
  return {
    blueprintId: `fallback-${Date.now()}`,
    campaignId: input.intent.campaignId || 'draft',
    businessId: input.intent.businessId,
    opportunity: {
      opportunityId: 'fallback-opp',
      vertical: input.vertical,
      coreObjective: defaultObjective,
      primaryTargetAudience: input.businessBrain.audience?.targetCustomer || 'Local customers',
      keyInsight: 'Promote special offer to local customers',
      strategicAngle: input.intent.offer.headline,
      competingForces: [],
      riskFactors: [],
      constraints: {
        maxTextDensity: 'medium',
        toneBoundary: input.businessBrain.brand?.tone || 'friendly',
        factualLimits: [],
      },
      confidenceScore: 50,
    },
    winningConcept: {
      conceptId: 'fallback-concept',
      opportunityId: 'fallback-opp',
      title: 'Standard Product Offer',
      hook: input.intent.offer.headline,
      narrativeAngle: 'Direct Offer Presentation',
      grammar: [
        { id: 'g1', role: 'hook', purpose: 'Grab attention', required: true },
        { id: 'g2', role: 'product', purpose: 'Show product', required: true },
        { id: 'g3', role: 'offer', purpose: 'State price', required: true },
        { id: 'g4', role: 'cta', purpose: 'Call to action', required: true },
      ],
      visualDirection: {
        emphasis: 'product-led',
        composition: 'hero-product',
        mood: 'clean and inviting',
        compositionHints: ['Clean product display with clear framing'],
      },
      templateId,
      score: {
        totalScore: 70,
        breakdown: {
          truthAlignment: 25,
          brandFit: 15,
          audienceRelevance: 10,
          historicalPerformance: 10,
          executionFeasibility: 10,
        },
        evaluationNotes: ['Fallback baseline blueprint triggered.'],
        isViable: true,
      },
    },
    selectedTemplateId: templateId,
    strategyDirectives: {
      angle: input.intent.offer.headline,
      hook: input.intent.offer.headline,
      offerFraming: `Special offer: ${input.intent.offer.headline}`,
      audienceInsight: 'Local customers looking for deals',
      keyMessages: [input.intent.offer.headline],
      ctaPrimary: input.intent.cta,
      differentiators: [],
    },
    copyDirectives: {
      headlineTone: input.businessBrain.brand?.tone || 'friendly',
      requiredKeywords: [],
      prohibitedTerms: [],
      maxHeadlineLength: 100,
      primaryLanguage: input.intent.localization.primaryLanguage,
      regionalStyle: input.intent.localization.regionalStyle,
    },
    visualDirectives: {
      emphasis: 'product-led',
      composition: 'hero-product',
      visualMood: 'inviting',
      heroPromptGuidance: 'Professional photo of product',
      textOverlayRules: {
        showPrice: true,
        showOriginalPriceStrikethrough: Boolean(input.intent.offer.originalPrice),
        showOfferBadge: true,
        ctaPlacement: 'bottom',
      },
    },
    trace: {
      evaluatedConceptsCount: 0,
      winningConceptId: 'fallback-concept',
      winningScore: 70,
      reasoningSummary: 'Fallback blueprint generated due to Creative Brain exception or low score.',
      generatedAt: new Date().toISOString(),
    },
  };
}
```

---

## Phase 1L — Future Adaptive-Learning Boundary

Creative Brain decouples **Online Decisioning** (run during a campaign request) from **Offline Learning** (run asynchronously after campaign events).

```
[ONLINE DECISIONING (Synchronous)]
  Campaign Request -> Creative Brain -> Creative Blueprint -> Campaign Execution

                                   │ (Async Performance Events)
                                   v
[OFFLINE LEARNING (Asynchronous)]
  WhatsApp Click / User Feedback -> recordWhatsAppClick / submitCreativeFeedback
                                   │
                                   v
  Update Firestore: campaign_performance & creative_preferences
                                   │
                                   v
  (Next Campaign Run Ingests Updated Preferences via CreativeBrainInput.memory)
```

### Key Adaptive Boundary Protections
1. **Zero-Lock Execution**: Online campaign generation NEVER waits for analytics processing or performance model re-training.
2. **Immutable Trace**: Past campaign blueprints and traces remain immutable; updated preference weights affect future campaign runs only.
3. **Decoupled Stores**: `creative_preferences` and `campaign_performance` update via isolated background triggers (`recordWhatsAppClick.ts`, `performanceSyncService.ts`).
