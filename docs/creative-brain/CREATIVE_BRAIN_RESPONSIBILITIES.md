# Creative Brain Responsibilities & System Boundaries (Phase 1B)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1B)  
**Location**: `docs/creative-brain/CREATIVE_BRAIN_RESPONSIBILITIES.md`  

---

## 1. System Responsibility Matrix

The following matrix defines the precise responsibility, Creative Brain interaction mode, authority level, and immutability status across all 17 core subsystems in Mitra.

| System | Responsibility | Creative Brain Interaction | Authority | Must Not Be Changed |
| :--- | :--- | :--- | :--- | :--- |
| **Business Brain** | Holds business facts, owner identity, location, contact, catalog, rules, and knowledge provenance (`knowledge.facts`). | **CONSUME (Read-Only)**. Reads verified facts. | **Authoritative (Level 0)** | **MUST NOT BE CHANGED**. Creative Brain cannot mutate or invent business facts. |
| **Creative Brain** | Strategic reasoning engine. Evaluates market leverage, selects winning concept, produces `CreativeBlueprint`. | **OWNER & PRODUCER**. Generates Opportunities, Concepts, Scores & Blueprints. | **Strategic Reasoning Authority** | N/A (New component being designed). |
| **GenerationPipeline** | Orchestrates 13-stage campaign execution, stage transitions, trace logging, and asset assembly. | **ARCHITECTURAL HOST**. Invokes Creative Brain between Stage 2 and Stage 3. | **System Orchestrator** | **MUST NOT BE CHANGED**. Pipeline structure & stage execution order stay preserved. |
| **CampaignStrategy** | Output of Stage 3. Generates campaign angle, hook, messages, and direction. | **TRANSFORM / EXECUTE BLUEPRINT**. Will execute directives from Blueprint. | **Derived Execution Output** | Retained during Phase 1. Will execute Blueprint directives in Phase 2+. |
| **CreativeTemplateRegistry**| Static library of 30 built-in templates, grammar rules, visual emphasis, and constraints. | **CONSUME (Read-Only)**. Selects compatible templates for concepts. | **Authoritative System Config**| **MUST NOT BE CHANGED**. Registry structure and template data remain static. |
| **TemplateAdaptationPlanner**| Adapts template grammar roles to context using static adaptation rules. | **SUBSUME / REPLACE**. Adaptation logic absorbed into Concept/Blueprint generation. | **Derived Logic** | Logic subsumed into Creative Brain in Phase 2+. |
| **CreativeContextSelector**| Assembles token-budgeted prompt context slices for Gemini calls. | **SUBSUME / REPLACE**. Structured context assembly absorbed into Creative Brain. | **Derived Utility** | Utility subsumed into Creative Brain context assembly. |
| **SavedStyle** | Holds business visual/stylistic preferences (tone, density, colorMode, composition, pacing). | **CONSUME (Read-Only)**. Ingested as a stylistic constraint during scoring. | **Authoritative Style Preference** | **MUST NOT BE CHANGED**. SavedStyle schema and persistence remain intact. |
| **CreativePreference** | Stores implicit/explicit business affinity or avoidance for specific `templateId`s. | **CONSUME (Read-Only)**. Ingested as historical memory signal for concept scoring. | **Derived Preference History** | **MUST NOT BE CHANGED**. Firestore schema and aggregation rules remain intact. |
| **CreativeFeedback** | Records explicit user feedback (positive/negative, reason codes) on generated assets. | **CONSUME (Read-Only)**. Ingested as historical performance memory signal. | **Authoritative User Feedback** | **MUST NOT BE CHANGED**. Feedback submission and Firestore docs remain intact. |
| **CampaignPerformance** | Tracks real-world metrics (`whatsappClicks`, `inquiries`, Meta post performance). | **CONSUME (Read-Only)**. Ingested as empirical feedback signals. | **Authoritative Performance Metrics**| **MUST NOT BE CHANGED**. Analytics triggers and sync services remain intact. |
| **Truth Check** | Deterministically compares generated text against authoritative business facts. | **LEAVE UNTOUCHED & PROTECTED**. Final non-negotiable gating authority. | **Authoritative Deterministic Gating** | **MUST NOT BE CHANGED**. `truthCheck.ts` rules & fingerprinting remain untouched. |
| **Compositor** | Deterministically compositing SVG creatives (`image/svg+xml`) with text overlays over base image. | **LEAVE UNTOUCHED & PROTECTED**. Renders layout based on visual directives. | **Authoritative Renderer** | **MUST NOT BE CHANGED**. `compositor.ts` SVG compositing logic remains untouched. |
| **Reel Renderer** | Analyzes video clips, generates AI edit plans, and encodes 1080x1920 MP4 video via FFmpeg. | **LEAVE UNTOUCHED & PROTECTED**. Independent video rendering pipeline. | **Authoritative Video Engine** | **MUST NOT BE CHANGED**. `VideoRenderer` and FFmpeg pipeline remain untouched. |
| **Usage Control** | Atomic credit reservation, deduction, refunding, idempotency check, and rate limiting. | **LEAVE UNTOUCHED & PROTECTED**. Creative Brain has zero billing/credit authority. | **Authoritative Ledger & Rate Limiter**| **MUST NOT BE CHANGED**. `usageControl.ts` credit mechanics remain untouched. |
| **Auth & Isolation** | Verifies Firebase auth tokens, custom claims, and enforces tenant isolation (`verifyBusinessAccess`). | **LEAVE UNTOUCHED & PROTECTED**. Security middleware verifies every request. | **Authoritative Security Boundary** | **MUST NOT BE CHANGED**. Auth middleware & `firestore.rules` remain untouched. |
| **Publishing** | Handles social media connections, Meta Graph API posting, and scheduled job processing. | **LEAVE UNTOUCHED & PROTECTED**. Publishing service posts finalized assets. | **Authoritative Publishing Provider**| **MUST NOT BE CHANGED**. Publishing providers and job processors remain untouched. |

---

## 2. Explicit Overlap Resolution: Stage 3 Fields

Existing **Stage 3** (`runStage3` in `pipeline.ts`) currently outputs 8 fields via `CampaignStrategySchema`. The table below explicitly defines the future ownership, execution mode, compatibility strategy, and migration path for each field when Creative Brain is introduced in Phase 2+.

| Field | Current Stage 3 Definition | Future Classification | Authoritative Owner | Migration & Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **`angle`** | High-level marketing angle | **A. Owned by Creative Brain** | **Creative Brain (`CreativeOpportunity.strategicAngle`)** | Creative Brain determines the core strategic angle. Stage 3 inherits it from `CreativeBlueprint.strategyDirectives.angle`. |
| **`hook`** | Attention-grabbing line | **A. Owned by Creative Brain** | **Creative Brain (`CreativeConcept.hook`)** | Creative Brain determines the hook direction and text. Stage 3 receives it from `CreativeBlueprint.strategyDirectives.hook`. |
| **`offerFraming`** | Offer positioning text | **A. Owned by Creative Brain** | **Creative Brain (`CreativeOpportunity.keyInsight`)** | Creative Brain decides how to frame the offer relative to customer tension. Retained as compatibility field in `CampaignStrategy`. |
| **`audienceInsight`** | Target customer insight | **A. Owned by Creative Brain** | **Creative Brain (`CreativeOpportunity.primaryTargetAudience`)** | Creative Brain formulates audience psychological insight. Passed into Stage 3 as a directive. |
| **`keyMessages`** | Array of 5 key points | **B. Generated by Execution Engine** | **Execution Engine (Stage 3 via Blueprint)** | Creative Brain specifies message boundary themes in `CreativeBlueprint`; Stage 3 expands them into 5 localized key messages. |
| **`ctaStrategy`** | Primary CTA & urgency | **E. Shared (Authoritative: Business Brain)** | **Business Brain / VerticalConfig (Enforcer: Creative Brain)** | Primary CTA MUST come from `VerticalConfig.allowedCTAs`. Creative Brain selects the CTA strategy; Stage 3 executes text formatting. |
| **`differentiators`** | 3-5 unique selling points | **B. Generated by Execution Engine** | **Business Brain (Source) / Stage 3 (Expander)** | Derived directly from `BusinessBrain.positioning.usp` and catalog attributes. Stage 3 formats them based on Blueprint visual emphasis. |
| **`creativeDirection`**| Visual style & mood | **A. Owned by Creative Brain** | **Creative Brain (`CreativeConcept.visualDirection`)** | Creative Brain owns visual emphasis, composition, and mood selection. Stage 3 inherits `visualStyle` and `mood` directly from Blueprint. |

---

## 3. Structural Guarantees

1. **Zero Duplication**: Stage 3 will no longer perform unguided strategic brainstorming. It becomes an **Execution Engine step** that translates the authoritative `CreativeBlueprint` into localized campaign strategy outputs.
2. **Backward Compatibility**: `CampaignStrategyOutput` structure remains 100% compliant with existing downstream Stage 4 (Localization), Stage 5 (Copy Generation), Stage 6 (Image Prompts), and frontend trace viewers (`PipelineTrace`).
