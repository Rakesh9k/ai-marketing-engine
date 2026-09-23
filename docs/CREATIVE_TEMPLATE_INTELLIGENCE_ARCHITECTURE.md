# Creative Template Intelligence — Phase 0 Architecture Audit & Implementation Plan

Status: **Design document — no application code changed.** Produced per the master spec's Phase 0/§42 requirement to inspect, understand, and design before implementing.

---

## A. Architecture Audit — what exists today

| Existing component | Disposition | Notes |
|---|---|---|
| `BusinessBrain` (`functions/src/types/index.ts:371-497`, embedded in `businesses/{id}`) | **Reused as-is** | Source of truth for facts: identity, products, brand, audience, localization, businessRules, verticalProfile. Template system must read this, never override it. |
| `businessBrainService.ts` (`src/features/business-brain/services/`) | **Reused** | Normalizes Brain + BrandKit + Products into `BusinessBrainContext` — this is the natural shape to feed into `CreativeContext`. |
| `GenerationPipeline` (`functions/src/services/ai/pipeline.ts`, 13 stages) | **Extended, not replaced** | Insert template selection/adaptation as new stages between "Campaign Strategy" and "Copy Generation." Existing stages 7-13 (image gen, validation, truth check, assembly) stay intact. |
| `compositor.ts` (`composeCreativeSVG`) | **Extended** | Currently one hardcoded SVG layout per format (poster/story). Becomes the deterministic renderer for `PostBlueprint.layers` — layout positions come from the blueprint instead of being hardcoded. |
| `runDeterministicTruthCheck` (`truthCheck.ts`, pipeline Stage 11) | **Reused unchanged, made mandatory for templates too** | Already the authoritative gate (`status: 'verified'` only on PASS). Template-adapted copy flows through the same checks — no new Truth Check logic needed, just ensure blueprint-derived text is checked identically to today's copy.
| `validationStages.ts` (LLM truth/quality/safety) | **Dead code, leave alone** | Not called by the live pipeline; do not build on it. |
| `ReelTemplateId` enum + `REEL_TEMPLATES`/`GOAL_DEFAULT_TEMPLATE` (`config/reels.ts`) | **Superseded, migrate** | This is the one existing "template" concept (3 hardcoded values: `food_reveal`, `offer`, `behind_the_scenes`). It becomes the seed data for the first 3 native `REEL` `CreativeTemplate` entries; `reelPipeline.ts` is updated to consume `ResolvedCreativeBlueprint` instead of the raw enum, but its ffprobe/clip-analysis/edit-plan logic is untouched. |
| Reel renderer (`services/reel-renderer/`, Cloud Run + ffmpeg) | **Reused unchanged** | Renderer stays dumb/deterministic; it renders whatever shot list it's given today and will render whatever shot list the adapter produces tomorrow. |
| `VerticalConfig` (`functions/src/config/verticals.ts`) | **Reused, template selector's key input** | Single existing per-vertical config pattern (`allowedObjectives`, `allowedCTAs`, `truthCheckClaimKeywords`, `promptContext`). Add `supportedVerticals` compatibility checks in templates against this same `BusinessCategory` enum — do not invent a parallel vertical taxonomy. |
| AI calls (`functions/src/services/ai/{text,vision,image}.ts`, `generateStructuredText`) | **Reused unchanged** | Not a swappable multi-provider abstraction today (Gemini text/vision, OpenAI image, hardcoded) but it *is* the single choke point for all AI calls. New prompt modules (objective normalizer, template selector, adapter, style/localization resolvers) call through `generateStructuredText` with Zod schemas exactly like existing stages — no new AI plumbing needed. |
| Firestore (`firestore.rules`, 252 lines, no `templates` collection) | **New collections required** | See §B/§D. |
| `PromptRegistry` (deleted in Phase 29) | **Cautionary precedent** | A prior "versioned prompt templates" abstraction was built, never wired in, and deleted. New template code must actually be called from the live pipeline from day one (Phase 3-7), not left dangling. |

**Conflicts identified:**
1. Two near-duplicate `TruthCheckResult`/`TruthCheckItem` declarations already exist in `functions/src/types/index.ts` (lines ~67 and ~829). Do not add a third; reuse the existing ones for template-adapted content.
2. `pipeline.ts` has a comment claiming "deterministic templates" are already used — this is aspirational language, not real. New code should describe itself accurately in comments/docs to avoid repeating this drift.
3. Reel campaign-storyboard path (`buildReelStoryboard` inside the POST campaign pipeline, 4 fixed text scenes) is distinct from the dedicated Reel feature (`reelPipeline.ts`). Both need template awareness eventually, but Phase 6 only targets the dedicated Reel feature per the MVP scope; the campaign-embedded storyboard can adopt the same blueprint format in a later pass without blocking MVP.

---

## B. Data Model (Firestore-convention, matches existing `functions/src/types/index.ts` style)

New collections (top-level, matching existing flat-collection convention like `campaigns`, `reels`):

- **`creativeTemplates/{templateId}`** — the template registry. System templates (`source: MITRA_NATIVE`) are seeded via a script/config, not created through the app. Includes an embedded `versions: CreativeTemplateVersion[]` array (small, bounded — MVP has ~20 templates, few versions each) rather than a separate collection, avoiding an unnecessary collection per rule §28/§40.10. If versions grow large post-MVP, split into a `creativeTemplates/{id}/versions` subcollection then — not now.
- **`creativeFeedback/{feedbackId}`** — one doc per approve/reject/regenerate/edit action, keyed by `businessId`, `campaignId`/`reelId`, `templateId`.
- **`templateUsage/{businessId}`** — single doc per business (not per-event) holding rolling aggregates: recently-used template IDs (bounded ring buffer, e.g. last 10), recently-used hooks/emotional-patterns/CTA-patterns, style/hook preference counters, rejection-reason counters. This is `TemplateUsageMemory` + `StylePreferenceMemory` + `HookPreferenceMemory` + `RejectionMemory`/`ApprovalMemory` combined into one doc per business (per §40.10 — avoid unnecessary collections; these are all "what does this business's history look like" facets of the same entity, read together on every generation).

Existing collections extended with new fields, not restructured:
- `campaigns/{id}` and `reels/{id}` gain: `templateId`, `templateVersion`, `styleProfile` (embedded object, not a ref), `localizationProfile` (embedded), `resolvedBlueprint` (embedded — the actual blueprint used, for traceability per §27/§37).
- `campaign_performance` (already exists, Phase 34) gains `templateId`/`hook`/`style` tags so performance can later be grouped by template without a new collection.

```ts
// functions/src/types/creativeTemplate.ts (new file)

type CreativeFormat = 'POST' | 'REEL' | 'BOTH';
type CreativeCategory = 'PRODUCT' | 'OFFER' | 'EDUCATIONAL' | 'SOCIAL_PROOF'
  | 'STORY' | 'PROMOTIONAL' | 'SEASONAL' | 'LOCAL' | 'BRAND' | 'ENGAGEMENT' | 'ANNOUNCEMENT';
type CreativeObjectiveGoal = 'AWARENESS' | 'ENGAGEMENT' | 'CONVERSION' | 'RETENTION' | 'TRUST' | 'LOCAL_DISCOVERY';
type FunnelStage = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';
type TemplateSource = 'MITRA_NATIVE' | 'USER_IMPORTED' | 'USER_CREATED' | 'PERFORMANCE_DERIVED';
type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

interface CreativeTemplate {
  id: string;
  name: string;                      // internal id, e.g. "restaurant_offer_reel"
  displayName: string;               // user-facing, e.g. "Craving Hook"
  displayDescription: string;        // user-facing strategy explanation (§30)
  format: CreativeFormat;
  category: CreativeCategory;
  objective: CreativeObjectiveGoal;
  funnelStage: FunnelStage;
  supportedVerticals: BusinessCategory[];   // reuses existing enum from config/verticals.ts
  hookPattern: string;               // short strategy label, not prose
  narrativeStructure: string[];      // ordered beat names, e.g. ["hook","reveal","offer","cta"]
  postBlueprint?: PostBlueprintTemplate;    // present if format is POST or BOTH
  reelBlueprint?: ReelBlueprintTemplate;    // present if format is REEL or BOTH
  styleCompatibility: string[];      // StyleProfile tone tags this template works with
  localizationCompatibility: string[]; // language/region tags, or ['*']
  constraints: { requiredInputs: string[]; optionalInputs: string[] };
  source: TemplateSource;
  status: TemplateStatus;
  version: string;                   // semver-ish, "1.0"
  confidence: number;                // 0-1, MITRA_NATIVE starts at 1.0
  performanceSummary?: { usageCount: number; approvalRate: number; lastUsedAt?: string };
  createdAt: string;
  updatedAt: string;
}

interface PostBlueprintTemplate {
  canvas: { aspectRatio: '4:5' | '1:1' | '9:16' };
  layers: Array<{
    role: 'background' | 'productHero' | 'headline' | 'offer' | 'cta' | 'brand' | 'supportingText' | 'location';
    position: string;   // e.g. "center", "top", "bottom_corner" — compositor-defined position tokens
    required: boolean;
  }>;
}

interface ReelBlueprintTemplate {
  durationSeconds: 15 | 30 | 45;     // reuses existing ReelDurationSeconds
  shots: Array<{
    id: string;
    durationSeconds: number;
    purpose: 'attention' | 'pain_or_desire' | 'product_reveal' | 'conversion' | 'action' | 'social_proof' | 'benefit';
  }>;
}

interface CreativeObjective {
  primaryGoal: CreativeObjectiveGoal;
  secondaryGoal?: CreativeObjectiveGoal;
  format: CreativeFormat;
  platform: 'INSTAGRAM' | 'WHATSAPP' | 'FACEBOOK';
  productId?: string;
  offerText?: string;
  emotionalIntent?: string;     // e.g. "funny", "urgent" — raw from user phrasing before StyleProfile normalization
  funnelStage: FunnelStage;
}

interface StyleProfile {
  tone: string;               // 'humorous' | 'premium' | 'serious' | ... open string, validated against a known set
  visualMood: string;
  pacing: 'slow' | 'medium' | 'fast';
  humorLevel: 'none' | 'low' | 'medium' | 'high';
  slangLevel: 'none' | 'low' | 'medium' | 'high';
  emojiLevel: 'none' | 'low' | 'medium' | 'high';
  motionIntensity: 'low' | 'medium' | 'high';
}

interface ResolvedCreativeBlueprint {
  templateId: string;
  templateVersion: string;
  styleProfile: StyleProfile;
  postBlueprint?: PostBlueprintTemplate & { resolvedContent: Record<string, string> }; // layer role -> final text
  reelBlueprint?: ReelBlueprintTemplate & { resolvedShots: Array<{ id: string; copy?: string; visualPrompt?: string }> };
  generatedAt: string;
}

interface CreativeFeedback {
  id: string;
  businessId: string;
  campaignId?: string;
  reelId?: string;
  templateId: string;
  templateVersion: string;
  action: 'APPROVE' | 'REJECT' | 'REGENERATE' | 'EDIT';
  rejectionReason?: 'WRONG_STYLE' | 'WRONG_LANGUAGE' | 'TOO_GENERIC' | 'OFFER_WRONG'
    | 'IMAGE_WRONG' | 'TOO_MUCH_TEXT' | 'NOT_CATCHY' | 'NOT_PREMIUM' | 'TOO_REPETITIVE' | 'WRONG_AUDIENCE' | 'OTHER';
  editedFields?: string[];
  createdAt: string;
}

interface TemplateUsageMemory {
  businessId: string;               // doc id
  recentTemplateIds: string[];      // ring buffer, last N
  recentHooks: string[];
  stylePreferenceCounts: Record<string, number>;   // tone -> approve-minus-reject count
  rejectionReasonCounts: Record<string, number>;
  updatedAt: string;
}
```

---

## C. Pipeline

```
BusinessBrainContext (existing service)
  -> CreativeObjective        [new: objectiveNormalizer prompt module]
  -> TemplateSelector.select()  [new: deterministic scoring, reads templateUsage doc for diversity]
  -> TemplateAdapter.adapt()    [new: templateAdapter + styleResolver + localizationResolver prompt modules]
  -> ResolvedCreativeBlueprint
  -> (existing) Copy Generation / Creative Direction stages, now seeded by the resolved blueprint instead of ad hoc prompting
  -> (existing) Image Generation (Stage 7)
  -> (existing) Deterministic Compositor — now blueprint-driven layer positions instead of one fixed layout
     | for REEL: (existing) reelPipeline shot generation, now seeded by reelBlueprint.shots
  -> (existing) Truth Validation / Quality / Safety (Stages 8-10, unchanged)
  -> (existing) Deterministic Truth Check (Stage 11, unchanged, still the mandatory gate)
  -> (existing) Assembly + Save
  -> User approval/reject/regenerate/edit
  -> [new] CreativeFeedback write + TemplateUsageMemory update (Cloud Function trigger or inline write)
```

Failure handling follows §35 exactly: template selection failure → fallback to a fixed default native template per format/vertical; localization failure → Business Brain primary language; style failure → brand defaults from BrandKit; blueprint generation failure → retry once with a stricter structured-output prompt, then fall back to today's un-templated generation path (never block campaign creation entirely — this is the MVP safety net). Truth Check failure behavior is unchanged: never finalize as `verified`.

---

## D. File Plan

**New files:**
- `functions/src/types/creativeTemplate.ts` — domain types above.
- `functions/src/config/creativeTemplates/` — native template registry as data (one file per template or a single indexed array), seeding ~10 POST + ~10 REEL templates per §10, migrating the 3 existing `ReelTemplateId` values.
- `functions/src/services/ai/templateSelector.ts` — deterministic scoring (§8/§9), reads `templateUsage/{businessId}`.
- `functions/src/services/ai/templateAdapter.ts` — orchestrates styleResolver + localizationResolver + copy/visual prompt modules into a `ResolvedCreativeBlueprint`.
- `functions/src/services/ai/styleResolver.ts`, `functions/src/services/ai/localizationResolver.ts` — small, single-responsibility prompt modules per §33.
- `functions/src/services/ai/objectiveNormalizer.ts` — turns free-text user request + Business Brain into `CreativeObjective`.
- `functions/src/functions/templates/recordCreativeFeedback.ts` — new callable, writes `creativeFeedback` + updates `templateUsage/{businessId}` atomically.
- `functions/src/functions/templates/listCreativeTemplates.ts` — read-only callable for future "choose template" UI (manual mode, §31); not required for MVP auto-mode but cheap to add alongside the registry.
- `tests/creativeTemplateSelector.test.ts`, `tests/creativeTemplateAdapter.test.ts`, `tests/creativeTemplateTruthCheck.test.ts`, `tests/creativeTemplateSecurity.test.ts` — per §37.
- `firestore.rules` additions for `creativeTemplates` (read: any authenticated user; write: admin/system only — no client write path exists, so effectively deny-all client writes), `creativeFeedback` (create: owner of the referenced business; no update/delete), `templateUsage` (read: owner; write: Cloud Functions only via Admin SDK, deny client writes).

**Modified files:**
- `functions/src/services/ai/pipeline.ts` — insert objective/selector/adapter stages between existing Stage 3 (Strategy) and Stage 5 (Copy Generation); thread `resolvedBlueprint` into Stage 6 (Creative Direction) and Stage 12 (Assembly) so it's persisted on the campaign doc.
- `functions/src/services/ai/compositor.ts` — `composeCreativeSVG` takes `layers` from `PostBlueprintTemplate` instead of a hardcoded layout; existing fixed layout becomes the fallback-template's blueprint (zero behavior change if template resolution fails).
- `functions/src/services/ai/reelPipeline.ts` — `generateValidatedReelEditPlan` seeded by `reelBlueprint.shots` when present, falling back to current `REEL_TEMPLATES`/`GOAL_DEFAULT_TEMPLATE` logic untouched if not.
- `functions/src/config/reels.ts` — `REEL_TEMPLATES` values become the seed data referenced by the new registry; enum kept for backward compatibility with existing reel docs (§26, don't break history interpretation).
- `functions/src/types/index.ts` — add `templateId`/`templateVersion`/`resolvedBlueprint` optional fields to `Campaign` and `ReelProject`.
- `firestore.rules` — additions above.
- `src/features/campaign/components/CampaignWizard.tsx`, `src/features/reel/components/ReelStyleSelector.tsx` — add optional "Template: Auto / Choose" control (§31); Auto is default and requires no UI beyond a toggle, deferred to Phase 9-10 if timeline is tight since it's additive to the wizard, not blocking.

**Deleted files:** none. `ReelTemplateId` enum is kept, not removed, to avoid breaking existing `reels` documents that reference it (§26).

---

## E. Implementation Plan (phases, condensed from spec §39 for this codebase)

| Phase | Objective | Key files | Tests | Acceptance |
|---|---|---|---|---|
| 1 | Domain model | `types/creativeTemplate.ts` | type-check only | compiles, no runtime change |
| 2 | Template registry (data) | `config/creativeTemplates/*` | `templateRegistry.test.ts` — every template validates against schema, every native template has both required blueprints for its format | 10 POST + 10 REEL templates loadable |
| 3 | Template selector | `templateSelector.ts` | scoring correctness + diversity/rotation tests (§37) | same business gets varied templates across 5 sequential calls in test |
| 4 | Template adapter | `templateAdapter.ts`, `styleResolver.ts`, `localizationResolver.ts`, `objectiveNormalizer.ts` | Business Brain facts preserved, offer/CTA preserved, brand rules respected | adapter never invents price/offer/location |
| 5 | POST integration | `pipeline.ts`, `compositor.ts` | pipeline integration test asserting `resolvedBlueprint` persisted, Truth Check still runs | Scenario A end-to-end |
| 6 | Reel integration | `reelPipeline.ts` | shot sequence/duration validity | Scenario B end-to-end |
| 7 | Truth Check wiring confirmation | none (verify only) | assert template-adapted copy is checked identically to legacy path | no template bypasses Stage 11 |
| 8 | Feedback memory | `recordCreativeFeedback.ts`, `templateUsage` rules | approval/rejection recorded, repeated rejection shifts future selection | Scenario C |
| 9 | Rotation hardening | `templateSelector.ts` recency weighting | 10-creative sequence test | Scenario D |
| 10 | User template import | new analyzer (`templateAnalyzer.ts`), upload UI | fact/inference separation test, no verbatim copy-back test | Scenario E |
| 11 | Performance intelligence | extend `campaign_performance` tagging | — | deferred until real usage data exists, per §38 |

Phases 1-9 constitute the MVP per §38-39; 10-11 are explicitly post-MVP.

---

## F. Risk Register

| Risk | Mitigation |
|---|---|
| AI reliability (blueprint/adapter JSON malformed) | All new prompt modules use `generateStructuredText` with Zod validation (existing pattern); failure falls back to today's un-templated generation, never blocks campaign creation. |
| Firestore complexity / extra reads per generation | `templateUsage` is one doc per business (not per-event), one extra read; `creativeTemplates` registry is small and cacheable in-function. |
| Template drift (silent edits breaking old creative interpretation) | Versioning enforced (§26); `templateId`+`templateVersion` persisted on every campaign/reel doc from Phase 5/6 onward. |
| Localization inventing facts | LocalizationResolver explicitly prohibited (per spec §15) from generating offers/prices/addresses/claims; only Business Brain-sourced facts flow through; Truth Check (unchanged, mandatory) is the backstop. |
| Rendering regressions in compositor/ffmpeg | Existing fixed layout/shot logic preserved as the fallback template — zero-template-resolution path is bit-identical to current behavior. |
| Truth Check bypass | No new bypass path introduced; template-adapted text re-enters the exact same Stage 11 deterministic check as legacy text. Test explicitly asserts this (Phase 7). |
| Cost/latency (added AI calls: objective normalizer, selector context, adapter, style/localization resolvers) | Selector is deterministic (no AI call). Adapter/style/localization can likely be merged into 1-2 structured-output calls rather than 4 separate round-trips — revisit exact call count at Phase 4 implementation time to control added latency/cost per campaign. |
| Security (system templates writable by users, cross-business template access) | `creativeTemplates` collection has no client write path in rules; `templateUsage`/`creativeFeedback` scoped by `businessId` ownership check, matching existing rules patterns for `campaigns`/`reels`. Explicit test coverage per §37 Security. |
| Scope creep vs. §38 "do not overbuild" | Phases 10-11 (user import, performance ML) explicitly deferred; no vector DB, no ML ranking, ~20 templates not hundreds. |

---

## Next step

This document is the Phase 0 deliverable. Recommend proceeding to **Phase 1 (domain model)** next — it's additive, low-risk, and unblocks everything else. Given the scale of this feature (11 phases touching the core generation pipeline, compositor, reel pipeline, and Firestore rules) and that the working tree already has substantial unrelated uncommitted changes, confirm before Phase 1 begins whether to proceed now or stage this as separate, reviewable commits per phase.
