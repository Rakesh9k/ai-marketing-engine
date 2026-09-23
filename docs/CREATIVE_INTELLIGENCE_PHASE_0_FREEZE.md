# Creative Intelligence — Phase 0 Architecture Freeze Report

Status: **Documentation only.** No application code, security rules, prompts, or database schema were modified in this phase. This report is the sole intended deliverable.

---

## 1. Executive Summary

Mitra already has a complete, working, production creative-generation system for POST and REEL: a 13-stage `GenerationPipeline`, a single embedded `BusinessBrain` fact source, a deterministic SVG compositor, a separate FFmpeg (Cloud Run) reel renderer, a mandatory deterministic Truth Check gate, and a transactional credit reservation/finalization system. None of this needs to change to add Creative Intelligence.

What Creative Intelligence will eventually add: a thin orchestration layer that decides *what kind* of creative structure to generate (template/style/objective selection and adaptation) before the existing pipeline's Copy Generation / Creative Direction / Image Generation stages run. It consumes `BusinessBrain` and `BrandKit` context the same way the pipeline already does; it does not replace or duplicate either.

What must not change: credit reservation/finalization (`usageControl.ts`), the deterministic Truth Check gate (`truthCheck.ts`, pipeline Stage 11), tenant/business ownership checks (`verifyBusinessAccess`), the compositor's and FFmpeg renderer's role as the deterministic "HOW", and the single-`BusinessBrain`/single-`BrandKit` invariant.

---

## 2. Current Architecture (as implemented, not as documented)

**POST / campaign path:**
```
User (CampaignWizard)
  -> generateCampaignStrategy (callable, validatedCallable + verifyBusinessAccess + rate limit)
    -> executeWithUsageControl (reserve credits)
      -> GenerationPipeline.execute()  [functions/src/services/ai/pipeline.ts, 13 stages]
           1 Business Understanding -> 2 Product Understanding (Vision AI)
           -> 3 Campaign Strategy -> 4 Localization -> 5 Copy Generation
           -> 6 Creative Direction / image prompts -> 7 Image Generation (1 DALL-E call)
           -> 8/9/10 AI-assisted Truth/Quality/Safety validation (non-authoritative)
           -> 11 runDeterministicTruthCheck (AUTHORITATIVE gate)
           -> 12 Campaign Assembly -> 13 caller saves
    -> finalize credits (success) / refund credits (catch block)
  -> campaign doc written to `campaigns/{id}`
```
There is a second, simpler `createCampaign` callable that only reserves credits and writes a `status: 'draft'` doc — it does not invoke the pipeline or Truth Check. It appears to be a distinct, lighter-weight "draft campaign" entry point, not a step of the above flow.

**REEL path (separate feature):**
```
User (ReelWizard) -> createReelProject (no credits, draft reelId only)
  -> user uploads clips -> confirmReelClipUpload
  -> generateReel (callable, validatedCallable + verifyBusinessAccess + rate limit)
    -> executeWithUsageControl (reserve credits)
      -> analyzeReelClips (ffprobe facts + 1 batched Vision AI call)
      -> generateValidatedReelEditPlan (ReelEditPlan from REEL_TEMPLATES/GOAL_DEFAULT_TEMPLATE)
      -> videoRenderer client -> Cloud Run ffmpeg service -> rendered MP4
    -> finalize/refund credits
  -> reel doc written to `reels/{id}`
```
No `runDeterministicTruthCheck` call site exists under `functions/src/functions/reels/` — Truth Check as implemented is campaign-pipeline-specific today; this is a gap Creative Intelligence must not silently paper over (see §16 Risks).

---

## 3. Business Brain Integration

- **Model**: `BusinessBrain` interface, `functions/src/types/index.ts:371-497` — identity, products, brand, audience, localization, businessRules, `verticalProfile`.
- **Storage**: embedded field inside `businesses/{businessId}` (not a separate collection). Products are a separate `products/{productId}` collection joined by `businessId`.
- **Retrieval/normalization**: `src/features/business-brain/services/businessBrainService.ts:66-93` — `getBusinessBrainContext()` reads the business doc, separately fetches `brand_kits/{businessId}`, merges both plus active products into a normalized `BusinessBrainContext` (`BusinessProfile` + `BrandProfile` + `LocalizationProfile` + `Product[]` + `BusinessRules`).
- **Write boundary**: `functions/src/functions/business/updateBusinessBrain.ts` — Zod allow-list explicitly excludes credits, Truth Check status, ownership, billing (lines 11-17).
- **Consumers**: every pipeline stage in `pipeline.ts` reads from the normalized context, not from raw Firestore.
- **Ownership**: Business Brain is the single source of truth for business facts. Creative Intelligence is a consumer only.

---

## 4. Creative Generation Integration (POST)

- Entry: `generateCampaignStrategy.ts:140` (`validatedCallable`).
- Auth/ownership: `verifyAuth` (implicit via `validatedCallable`) + explicit `verifyBusinessAccess(userId, businessId)` at line 156 + `checkRateLimit` at line 157.
- Credit reservation ordering: reservation happens *after* business-existence/vertical/objective validation (lines 156-188) — a deliberate Phase 29 decision to avoid reserve-then-refund churn on requests that would always be rejected.
- Orchestration: `executeWithUsageControl(userId, campaignId, 'campaign_generation', pipelineClosure)` at line 198.
- Creative Direction today is **not a separate persisted domain model** — it is Stage 6 of `pipeline.ts`, an AI-generated structured object (image prompts + layout intent) consumed immediately by Stage 7 (image generation) and Stage 12 (assembly). It is not reused across campaigns and has no independent identity/versioning.
- Deterministic vs AI-controlled split (critical for template design): AI controls copy text, image prompt content, and layout *intent*; the compositor (`compositor.ts`) deterministically renders exact text (price, phone, CTA, business name) onto the AI-generated hero image via one fixed SVG layout per format (`poster`/`story`) — this fixed layout is exactly the thing a future `PostBlueprint` would parameterize, not replace.
- Persistence: campaign doc in `campaigns/{id}`, written inside the usage-controlled closure (~line 243).

**Recommendation on Creative Direction placement**: Creative Intelligence should sit **BEFORE** Creative Direction (Stage 6), producing a resolved template/style/objective that Stage 5 (Copy) and Stage 6 (Creative Direction) consume as additional structured input — not replacing either stage, and not sitting inside the compositor.

---

## 5. Reel Integration

- Entry: `generateReel.ts:45`. Auth/ownership: `verifyBusinessAccess` (line 68) + rate limit (line 69) + explicit ownership/idempotency checks (lines 72-83).
- Credits: `executeWithUsageControl(..., 'reel_generation', ...)` at line 96.
- `createReelProject.ts:34` is explicitly a **no-credit** step (comment: "Never deduct credits merely because the user opened the Reel page") — draft doc only, before any generation.
- Pipeline: `analyzeReelClips` (deterministic ffprobe + 1 batched Vision call) -> `generateValidatedReelEditPlan` (currently keyed off the closed `ReelTemplateId` enum: `food_reveal` | `offer` | `behind_the_scenes`, via `REEL_TEMPLATES`/`GOAL_DEFAULT_TEMPLATE` in `functions/src/config/reels.ts`) -> `videoRenderer` client -> Cloud Run ffmpeg service.
- The renderer and clip-analysis stages are untouched by any future template work — a future `ReelBlueprintTemplate.shots[]` would replace only the *selection logic* that currently maps `ReelGoal -> ReelTemplateId -> edit plan defaults*, not the renderer's input contract.
- Persistence: `reels/{id}`, all writes Admin-SDK only (`firestore.rules:238-250`: `allow create: if false; allow update: if false;` client-side).

---

## 6. Truth Check Integration

- Authoritative implementation: `runDeterministicTruthCheck`, `functions/src/services/ai/truthCheck.ts` — deterministic keyword/fact matching (price, location, phone, discount, business name, offer validity, vertical-gated claim checks), **no LLM**.
- Runs as **Stage 11 of 13** in `pipeline.ts` (line ~890), always, for every campaign generated through `generateCampaignStrategy`.
- Gating behavior: `assembleCampaignPack`'s `status` is `'verified'` only if `truthCheck.status === 'PASS'`, else `'generated'` (pipeline.ts:~1128). Failure does not throw/block persistence — it downgrades status, which the UI is presumably expected to reflect (not verified in this phase).
- A second, LLM-based validation set (`validationStages.ts`: `runTruthValidation`/`runQualityValidation`/`runSafetyValidation`) exists but is **dead code** — not called by the live pipeline, only by its own tests. Do not build on it.
- **Gap confirmed**: no `runDeterministicTruthCheck` call site exists in the Reel path. Reel-generated copy/captions are not currently passed through the deterministic Truth Check. This is a pre-existing gap, not something to fix in Phase 0, but Creative Intelligence must not assume Reel Truth Check parity with POST — flagged as INVARIANT-002 caveat and a Phase 6+ concern, not a Phase 0 blocker.
- `firestore.rules` locks `metadata.truthCheckStatus` and campaign `status` from client writes (rules:128-146) — Truth Check state is Admin-SDK-only, consistent with credit-state locking.

---

## 7. Credit Flow

- Core service: `functions/src/services/usageControl.ts`.
- **Reservation** — `reserveCreditsForOperation()` (lines 165-359): ensures a monthly `usage/{userId_periodStart}` doc exists, then inside a single `db.runTransaction` reads `transactions/{operationId}` + the usage doc and atomically decides `fresh` / `idempotent-pending` / `already-completed` / `already-refunded` / `insufficient`; only the `fresh` case writes a `transactions/{operationId}` doc (`type: 'reservation'`, `status: 'pending'`, `amount: -creditsRequired`) and increments `usage.creditsUsed`. A documented prior bug (double-reservation race, confirmed via emulator test) is what this transaction exists to prevent.
- **Finalization** — `finalizeReservation()` (lines 364-421): single conditional `.update()` (not a full transaction) flips the transaction doc to `type: 'deduction'`, `status: 'completed'`; idempotent, guarded by a `status === 'pending'` precondition.
- **Refund** — `refundReservation()` (lines 426-528): verifies caller ownership, then a `db.runTransaction` decrements `usage.creditsUsed` via `FieldValue.increment(-amount)`, writes `transactions/refund_{operationId}`, marks the original reservation `status: 'refunded'`. Idempotent.
- **Orchestration** — `executeWithUsageControl()` (lines 555-606): reserve -> run generation closure -> finalize on success; any thrown error -> refund in a catch block (refund failure itself is only logged, not rethrown — a latent edge case, not something Phase 0 changes).
- **Legacy path** — `createCampaign.ts` calls a different, simpler `reserveCredits()` (`functions/src/services/firestore.ts:459`) with **no observed finalize/refund call** in that file. This is a pre-existing inconsistency between the two campaign-creation entry points, noted here as a fact, not remediated in Phase 0.
- **Hard invariant for Creative Intelligence**: template selection/scoring must be computationally free and must never call `reserveCreditsForOperation`, `finalizeReservation`, or `refundReservation` independently. Only the existing `executeWithUsageControl` call sites in `generateCampaignStrategy.ts`/`generateReel.ts` touch credits.

---

## 8. Tenant Isolation

- `verifyAuth(request)` (`middleware/auth.ts:9-19`) — requires `request.auth`, throws `unauthenticated` otherwise.
- `validatedCallable(schema, handler)` (`middleware/validation.ts:69-102`) — the shared wrapper used by every callable inspected; validates auth presence + Zod schema before invoking the handler.
- `verifyBusinessAccess(userId, businessId)` (`middleware/auth.ts:21-44`) — reads `businesses/{businessId}`, allows if `businessData.userId === userId` OR caller is `role: 'agency_member'` with matching `agencyId` (hardened against role/agencyId self-escalation per an in-code comment referencing a prior fix). **Not** automatically applied by `validatedCallable` — every handler must call it explicitly, and all handlers inspected (`generateCampaignStrategy`, `generateReel`, `createCampaign`, `updateCampaignStatus`, `createReelProject`) do.
- **Multi-tenant agency model confirmed**: `agencies/{agencyId}` and `clients/{clientId}` collections exist. One auth user can act as `agency_member` across multiple businesses sharing an `agencyId`, enforced consistently in both `firestore.rules` (OR-clauses on `businesses`/`brand_kits`/`products`/`campaigns`/`assets`/`reels`) and in code (`verifyBusinessAccess`).
- `firestore.rules` locks `role`, `businessIds`, `agencyId`, `subscriptionId` on `users/{userId}` from client writes (a documented prior privilege-escalation bug), and locks `status`/credit fields/`metadata.truthCheckStatus` on `campaigns`/`reels` from client writes.
- **Implication for Creative Intelligence**: any new callable (e.g. `recordCreativeFeedback`, `listCreativeTemplates`) must follow the identical `validatedCallable` + explicit `verifyBusinessAccess` pattern; any new Firestore collection scoped to a business must use the same `hasBusinessAccess(businessId)` / `isAgencyMember(agencyId)` rule helpers already defined in `firestore.rules`, not a new authorization scheme.

---

## 9. AI Provider Architecture

- Backend (the live path): `functions/src/services/ai/{text,vision,image}.ts` export `generateStructuredText`, `generateText`, `generateImage`, `analyzeProductImages` — Gemini for text/vision (`geminiTextProvider`), **OpenAI DALL-E 3** for images (backend-only, `hd` quality). `retry.ts` adds bounded retry/timeout.
- This is function-level wrappers per capability with a single hardcoded provider each, not a swappable multi-provider interface — but it **is** the single choke point every pipeline stage calls through. All 13 pipeline stages use `generateStructuredText` with inline Zod schemas.
- A separate, fuller `AIProvider`/`TextAI`/`VisionAI`/`ImageAI` interface exists in `src/features/ai/providers/` (frontend/browser code) — its wiring to the live server-side generation path was not confirmed in this audit; do not assume it is what production generation uses. The backend wrappers in `functions/src/services/ai/` are confirmed live via pipeline call sites.
- **Hard invariant**: any new Creative Intelligence prompt module (objective normalizer, template selector scoring is deterministic/no-AI, adapter, style/localization resolvers) must call through `generateStructuredText`/`generateText`/`generateImage` exactly as existing pipeline stages do. No new `gemini.generate(...)`-style direct calls.

---

## 10. Firestore Architecture

Top-level collections (`firestore.rules`, confirmed): `users`, `businesses`, `agencies`, `clients`, `brand_kits` (keyed by `businessId`), `products`, `campaigns`, `campaign_assets`, `assets`, `subscriptions`, `usage`, `transactions`, `analytics_events`, `generation_logs`, `accountDeletionRequests`, `partners`, `partner_referrals`, `campaign_performance`, `whatsapp_leads`, `reels`.

No `templates`/`creativeTemplates` collection exists today. `campaigns` and `reels` both lock `status` and credit/Truth-Check-adjacent fields from client writes — any future template metadata field added to these docs (`templateId`, `templateVersion`) should follow the same "server-writes-only via Admin SDK" pattern already established for `status`, not introduce a new client-writable surface.

---

## 11. Existing APIs (campaigns + reels)

| Function | File | Purpose | Auth | Credits | Firestore | Truth Check |
|---|---|---|---|---|---|---|
| `generateCampaignStrategy` | `campaigns/generateCampaignStrategy.ts:140` | Full 13-stage AI pipeline -> campaign | `validatedCallable` + `verifyBusinessAccess` (156) + rate limit (157) | Yes, `executeWithUsageControl` (198) | `campaigns` | Yes, pipeline Stage 11 |
| `createCampaign` | `campaigns/createCampaign.ts:97` | Legacy: reserve credits + draft campaign doc, no pipeline | `validatedCallable` + `verifyBusinessAccess` (106) + rate limit (107) | Yes, legacy `reserveCredits()` (119), no observed finalize/refund | `campaigns` | No |
| `updateCampaignStatus` | `campaigns/updateCampaignStatus.ts:31` | Restricted status-reset (schema only allows resetting to `'draft'`, post-vulnerability-fix) | `validatedCallable` + `verifyBusinessAccess` (42) | No | `campaigns` | No |
| `getCampaign` / `listCampaigns` / `updateCampaign` / `regenerateAsset` | `campaigns/*.ts` | Read/list/update/regenerate-single-asset endpoints | not individually traced in this phase | — | `campaigns` | — |
| `generateReel` | `reels/generateReel.ts:45` | Clip analysis -> AI edit plan -> ffmpeg render | `validatedCallable` + `verifyBusinessAccess` (68) + rate limit (69) + ownership/idempotency checks | Yes, `executeWithUsageControl` (96) | `reels` | No call site found |
| `createReelProject` | `reels/createReelProject.ts:34` | Draft reel doc, explicitly no-credit | `validatedCallable` + `verifyBusinessAccess` (43) | No (explicit) | `reels` | No |
| `confirmReelClipUpload` / `getReelClipUploadUrl` / `getReel` / `listReels` | `reels/*.ts` | Upload/read/list endpoints | not individually traced in this phase | — | `reels` | — |

---

## 12. Invariants (confirmed against actual code)

- **INVARIANT-001 — Credit Accounting**: `usageControl.ts` reservation/finalization/refund lifecycle unchanged. Creative Intelligence never calls these directly; only existing `executeWithUsageControl` call sites do.
- **INVARIANT-002 — Truth Check**: All POST creatives continue through `runDeterministicTruthCheck` (pipeline Stage 11) unchanged. **Caveat**: Reel path has no confirmed Truth Check call site today — this is a pre-existing gap, not a Phase 0 regression; template work must not paper over it by assuming parity that doesn't exist.
- **INVARIANT-003 — Tenant Isolation**: `verifyBusinessAccess` + `hasBusinessAccess`/`isAgencyMember` rule helpers are the only authorization mechanism; any new template-related endpoint/collection reuses them.
- **INVARIANT-004 — Campaign Pipeline**: 13-stage `pipeline.ts` remains operational and callable exactly as today when template resolution is absent/fails.
- **INVARIANT-005 — AI Provider Abstraction**: all new AI calls go through `generateStructuredText`/`generateText`/`generateImage`.
- **INVARIANT-006 — Reel Renderer**: Cloud Run ffmpeg service and its input contract (`ReelEditPlan`/shot list shape) unchanged.
- **INVARIANT-007 — Firestore Security**: existing rule helpers/patterns (server-writes-only for status/credit/truth-check fields) extended to new collections, not replaced.
- **INVARIANT-008 — Payment System**: `razorpay.ts`, `payu.ts`, webhook handlers untouched; out of scope entirely.
- **INVARIANT-009 — Campaign APIs**: `generateCampaignStrategy`/`generateReel`/etc. remain backward compatible; template resolution is additive input, not a breaking signature change.
- **INVARIANT-010 — Business Brain**: exactly one `BusinessBrain` (embedded in `businesses/{id}`), Creative Intelligence is a consumer, never a second source of business facts.
- **INVARIANT-011 — BrandKit**: exactly one `BrandKit` (`brand_kits/{businessId}`) as visual-identity source, though it is currently consumed inconsistently within the pipeline itself (see §16 Risks) — Creative Intelligence should not add a third representation.
- **INVARIANT-012 — Persistence**: no parallel campaign/reel persistence model; template metadata is additive fields on existing `campaigns`/`reels` docs plus small new collections (registry, feedback, usage memory), not a redesign.
- **INVARIANT-013 — Rendering**: `compositor.ts` and the ffmpeg renderer remain the deterministic "HOW"; template blueprints parameterize their existing fixed layouts, they do not replace the renderers.
- **INVARIANT-014 — Existing Users**: existing campaign/reel generation continues to work with no template resolved (fallback path).
- **INVARIANT-015 — Existing Creatives**: previously generated campaigns/reels remain readable; no migration of historical docs required or performed.

---

## 13. Feature Boundary

**Creative Intelligence owns**: creative objective interpretation, template selection (deterministic scoring), template adaptation (AI-assisted, via existing `generateStructuredText`), style resolution, localization resolution (structure/tone only — never facts), creative diversity/rotation logic, template-related memory (`templateUsage`, `creativeFeedback`).

**Creative Intelligence does not own** (and must not duplicate): business facts (Business Brain), visual identity (BrandKit), AI provider access, actual image/script/shot generation, deterministic rendering (compositor, ffmpeg), fact/claim validation (Truth Check), credit accounting, campaign/reel persistence lifecycle, tenant/auth model.

---

## 14. Integration Point

```
BusinessBrainContext (existing service, unchanged)
  -> [NEW] CreativeObjective normalization
  -> [NEW] TemplateSelector (deterministic scoring)
  -> [NEW] TemplateAdapter (style + localization resolution, AI-assisted via existing generateStructuredText)
  -> ResolvedCreativeBlueprint
  -> pipeline.ts Stage 5 (Copy Generation) and Stage 6 (Creative Direction) — EXISTING, now blueprint-seeded
  -> pipeline.ts Stage 7 (Image Generation) — EXISTING, unchanged
  -> compositor.ts — EXISTING, layout positions become blueprint-driven instead of hardcoded, same output contract
  -> pipeline.ts Stages 8-11 (validation + mandatory deterministic Truth Check) — EXISTING, unchanged
  -> pipeline.ts Stages 12-13 (assembly + persistence) — EXISTING, gains templateId/templateVersion fields
```
For Reel, the equivalent insertion point is immediately before `generateValidatedReelEditPlan` in `reelPipeline.ts`, replacing only the `ReelGoal -> ReelTemplateId` lookup with selector/adapter output — clip analysis and the renderer client are unaffected.

---

## 15. Recommended Future Interfaces (conceptual only, not implemented)

```ts
CreativeObjective { primaryGoal, format, platform, productId?, offerText?, emotionalIntent?, funnelStage }
TemplateSelector.select(context: BusinessBrainContext, objective: CreativeObjective, usageMemory: TemplateUsageMemory): CreativeTemplate
TemplateAdapter.adapt(template: CreativeTemplate, context: BusinessBrainContext, objective: CreativeObjective): ResolvedCreativeBlueprint
```
These are illustrative only; exact shapes should be finalized in Phase 1 against whatever `pipeline.ts` Stage 5/6 input types turn out to need once that code is read at the field level (not fully enumerated in this phase).

---

## 16. Risks

- **BrandKit inconsistency**: two distinct brand-color code paths already exist in the pipeline (`input.brandProfile?.colors.{primary,secondary,accent}` object at pipeline.ts:1337-1340 vs. `brief.brand?.colors` array at pipeline.ts:824-827, each with its own hardcoded fallback palette), and `businessBrainService.ts` reads `kb?.brandName`/`kb?.tagline` fields that don't exist on the `BrandKit` type. A template system consuming brand visuals must pick one of these representations deliberately, or it will silently inherit/amplify the existing inconsistency. This is a pre-existing issue, flagged for awareness, not fixed in Phase 0.
- **Reel Truth Check gap**: no confirmed Truth Check call site in the reel generation path — template-driven reel copy has no deterministic fact-check backstop today. Needs an explicit decision in Phase 6+ (add Truth Check to reels, or explicitly scope template risk lower for reel copy).
- **Two campaign-creation entry points**: `generateCampaignStrategy` (full pipeline + Truth Check) vs. `createCampaign` (draft-only, different credit function, no finalize/refund observed). Template integration should target the former; the latter's purpose/lifecycle should be clarified with the team before any template metadata is added to it.
- **Provider coupling**: image generation is hardcoded to OpenAI DALL-E 3, text/vision to Gemini — acceptable for MVP per existing architecture, but any future provider swap is outside Creative Intelligence's scope to fix or hide.
- **Rendering coupling**: compositor's fixed SVG layout and the ffmpeg renderer's shot-list contract are both stable, narrow contracts — a blueprint schema must map onto them, not require renderer changes, to keep Phase 0's "existing systems unchanged" property true into later phases.
- **Persistence/latency cost**: template selection is deterministic (cheap); adapter/style/localization resolution adds at least one more `generateStructuredText` round-trip to the pipeline — exact count and added latency/cost should be measured in Phase 4, not assumed.
- **Security**: no new risk identified in this phase since no template collections exist yet; Phase 1+ must reuse `hasBusinessAccess`/`isAgencyMember` rule helpers exactly, per INVARIANT-003.
- **Backward compatibility**: low risk — the plan requires the pipeline to run unmodified when template resolution is absent, matching current behavior for all existing users/campaigns.
- **Documentation drift**: none of the source-of-truth docs named in this task's instructions (`PRODUCT.md`, `ARCHITECTURE.md`, `AI_ARCHITECTURE.md`, `DATABASE.md`, `DESIGN_SYSTEM.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`, `PROMPT_SYSTEM.md`) exist in `/docs` (verified by directory listing). `BUSINESS_BRAIN_ARCHITECTURE_AUDIT.md` and `ARCHITECTURE_AI_CONTEXT.md` do exist and were used as pointers, not read verbatim in this phase — their content should be spot-checked against this report's code-derived findings before Phase 1 if they're intended to remain authoritative.
- **Prior design document exceeds Phase 0 scope**: `docs/CREATIVE_TEMPLATE_INTELLIGENCE_ARCHITECTURE.md` (created in a preceding, less restrictive task in this same session) already contains a full data model, file plan, and phased implementation plan — i.e., Phase 1+ content. It is **not deleted or modified** by this Phase 0 freeze (Phase 0 does not authorize deleting prior session output), but per this task's explicit instruction that the freeze report should be the only new doc, this is flagged as a known deviation for the user to reconcile (keep as forward-looking Phase 1+ reference, or remove) rather than acted on unilaterally.

---

## 17. Baseline Tests (run before/without any Phase 0 code changes)

```text
Frontend typecheck (npm run typecheck):        PASS, 0 errors
Functions typecheck (functions: npm run typecheck): PASS, 0 errors
Frontend lint (npm run lint, --max-warnings 0): PASS, 0 errors, 0 warnings
Functions lint (functions: npm run lint):       FAIL (pre-existing) — 69 errors, 3 warnings, 72 problems.
  Mostly: (a) @typescript-eslint/no-unused-vars in a handful of files (getProduct.ts,
  listProducts.ts, createSubscription.ts, razorpayWebhook.ts, auth.ts, idempotency.ts, rateLimit.ts),
  (b) parserOptions.project parsing errors on ~9 *.test.ts files not included in functions'
  tsconfig project (confirmReelClipUpload.test.ts, cancelSubscription.test.ts, verifyPayment.test.ts,
  payuWebhook.test.ts, razorpayWebhook.test.ts, auth.test.ts, rateLimit*.test.ts,
  validation.security.test.ts, testSetup.ts, logging.test.ts).
  These are PRE-EXISTING, not introduced by this phase (no functions/src lint-affecting files were
  changed). Not fixed in Phase 0 per instructions to record, not remediate, baseline failures.
Frontend tests (npm test):  PASS — 30 suites passed, 4 skipped (34 total); 260 tests passed, 67 skipped (327 total).
Functions tests (functions: npm test): PASS — 20 suites passed, 26 skipped (46 total); 225 tests passed,
  117 skipped (342 total). The large skip count (26 of 46 suites) is a baseline observation, likely
  emulator-dependent suites skipped without a running Firebase emulator — not investigated further in
  this phase, recorded as-is.
```

---

## 18. Git Baseline

```text
Branch: master (main is the PR target)
Commit HEAD: 2ab6d1e "Add explicit Java setup to emulator-backed CI jobs"
Last 5 commits: 2ab6d1e, 2b706c3, 5de6971, d5d4845, 7cad2f2

PRE-EXISTING (present at session start, not introduced by this phase or the prior in-session
design-doc task):
  - 33 modified tracked files across functions/src, src, docs, config (firestore.rules,
    firebase.json, next.config.ts, package.json/package-lock.json, vercel.json, multiple
    auth/billing/onboarding/mascot components and tests, .gitignore, README.md) plus 1 deletion
    (src/app/icon.svg).
  - ~80 untracked (??) files: many docs/*.md audit reports (API.md, BUSINESS_BRAIN_ARCHITECTURE_AUDIT.md,
    LEGAL_*.md, PHASE_19B/37/38*.md, PRODUCTION_*.md, README.md, SECURITY.md, USER_GUIDE.md, etc.),
    new functions source files (config/legal.ts, auth/recordConsentAcceptance.*, auth/requestAccountDeletion.*,
    subscriptions/cancelSubscription.*, subscriptions/createPayUPayment.ts, webhooks/payuCallback.ts,
    webhooks/payuWebhook.*, services/billing.ts, services/payu.*, various *.test.ts), a handful of
    top-level scratch scripts (_e2e19c.mjs, _e2e19c2.mjs, _neg.mjs, _sweep.mjs), and .vercelignore.
  None of these pre-existing changes were made, touched, or reviewed for correctness by this Phase 0 task.

PHASE 0 (this task):
  - NEW: docs/CREATIVE_INTELLIGENCE_PHASE_0_FREEZE.md (this file)

Also present from the immediately preceding (non-Phase-0) task in this same session:
  - NEW: docs/CREATIVE_TEMPLATE_INTELLIGENCE_ARCHITECTURE.md — a Phase 1+ design document, flagged
    in §16 as a deviation from this task's "freeze report only" change-control rule.

No files were staged, committed, reset, or discarded. No destructive git operations were run.
```

---

## 19. Phase 0 Decision

**READY FOR PHASE 1**

---

## Addendum — Phase 1 (BrandKit Foundation) Complete

Phase 1 fixed the confirmed BrandKit→generation schema mismatch this report flagged in §16 Risks ("BrandKit inconsistency"). Summary (full detail in the Phase 1 completion report delivered to the user):

- **Root cause confirmed**: `generateCampaignStrategy.ts` and `regenerateAsset.ts` passed the raw persisted `BrandKit` (`logo.primary.url`, `tone`) directly as a `brandProfile: any` field, which downstream code (`pipeline.ts`, `creativeBrief.ts`) read as if it were the differently-shaped `BrandProfile` type (`logo.url`, `brandTone`). Because the field was typed `any`, this compiled cleanly while `logoUrl` and brand tone silently resolved to `undefined` at runtime on every campaign generation. Colors and fonts happened to work by field-name coincidence.
- **Fix**: added `BrandCreativeContext` (`functions/src/types/index.ts`) as the one normalized, generation-facing brand type, and `getBrandCreativeContext()` (`functions/src/services/ai/brandCreativeContext.ts`) as the single adapter from `BrandKit` to it. Both campaign-generation entry points now call the adapter instead of passing the raw document through as `any`. `pipeline.ts` and `creativeBrief.ts` were updated to read the corrected field names.
- **Scope discipline**: the Reel path was already correctly typed against real `BrandKit` fields (confirmed, not touched). The frontend `businessBrainService.ts` BrandProfile-building code (`kb = brandKit as any`, reading nonexistent `brandName`/`tagline` fields) is UI-context-building, not in the generation call path, and was left alone and flagged rather than fixed, per this task's scope boundary.
- **Invariants**: credits, Truth Check, tenant isolation, Firestore rules, the compositor's interface, and the FFmpeg renderer were all unmodified — confirmed by identical pre/post test and lint baselines.
- Logo rendering itself (the compositor accepting/drawing a logo image) remains a gap — `CreativeBrandStyle` has no logo field and the SVG compositor never rendered logos, before or after this phase. The adapter fix makes `logoUrl` correctly reach the AI image-generation prompt text (`imagePromptBuilder.ts`); it does not add logo rendering to the deterministic compositor, which would be a compositor feature change outside this phase's scope.

Justification: source-of-truth docs were checked for existence (none of the named ones exist except two pointer docs, noted as a gap not a blocker); the actual implementation was traced end-to-end for Business Brain, POST pipeline, Reel pipeline, Truth Check, credits, tenant isolation, BrandKit, and the relevant API surface, all with file:line evidence; the 15 invariants are stated against confirmed code behavior; the integration point (before pipeline Stage 5/6, and before `generateValidatedReelEditPlan`) is identified from actual call sites, not assumption; baseline typecheck/lint/test results are recorded, with the one pre-existing lint failure clearly attributed to prior state, not this phase. No unresolved architecture blocker was found — the two open items (Reel Truth Check gap, BrandKit representation inconsistency, and the two campaign-entry-point divergence) are pre-existing conditions Creative Intelligence must design around, not blockers to starting Phase 1's domain-model work.
