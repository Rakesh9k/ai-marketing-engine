# Business Brain + Longitudinal Intelligence + Context Retrieval + AI Orchestration — Architecture Audit

**Date:** 2026-09-22. **Audit only — no code, rules, config, or data were modified to produce this
document.** Built on top of the existing `docs/ARCHITECTURE_AI_CONTEXT.md` (an exceptionally
thorough, independently-verified prior audit — cited extensively below rather than re-derived) plus
fresh, targeted re-verification specifically for the Business Brain / longitudinal-intelligence
question this task asks about, which the prior document didn't focus on.

**Source-of-truth docs actually present**: none of `/docs/PRODUCT.md`, `ARCHITECTURE.md`,
`DATABASE.md`, `AI_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY.md` (a `SECURITY.md` exists but
was created/extended by this session's own legal/payment work, not a pre-existing source-of-truth),
`MVP_SCOPE.md`, `TEST_PLAN.md`, `PROMPT_SYSTEM.md`, `FIRST_CUSTOMERS.md`, `SALES_PLAYBOOK.md`,
`CUSTOMER_FEEDBACK.md`, `CUSTOMER_BLOCKERS.md`, `OBSERVATION*.md`, `EXPERIMENT_LOG.md` exist. This
was already documented by `docs/ARCHITECTURE_AI_CONTEXT.md` §3 and is re-confirmed here by direct
`ls`. `docs/ARCHITECTURE_AI_CONTEXT.md` and `docs/PERFORMANCE_ENGINE.md`/`PERFORMANCE_DATA_READINESS.md`
are the closest things to real source-of-truth documents, and both are unusually honest — they state
non-implementation explicitly rather than overclaiming.

---

## A. Current Architecture Map (verified flow)

```
Browser (CampaignWizard)
  → generateCampaignStrategy (callable: Auth + App Check + Zod)
      → verifyBusinessAccess → rate limit → assertVerticalImplemented → objective/CTA validation
      → executeWithUsageControl (reserve credits, transactional)
          → build pipeline input: businessBrain (from businesses.businessBrain, THIS business's
            current-state document, full read) + brandKit (from brand_kits, full read) +
            current-request offer/product/audience/objective/duration/CTA
          → GenerationPipeline.execute() — 12 stages, Gemini text/vision + one DALL-E-3 call
          → deterministic Truth Check (truthCheck.ts) — the real gate
          → assembleCampaignPack — persists campaign_assets, sets pack status from Truth Check
          → finalizeReservation (charged regardless of PASS/FAIL/REVIEW_REQUIRED)
      → campaign status set; client polls
  → WhatsApp click → recordWhatsAppClick → campaign_performance.whatsappClicks++ (dashboard-only)
```

There is **no separate "Context Retrieval" or "AI Orchestrator" layer** as distinct architectural
components today. What the task's target diagram calls "Context Retrieval" is, in the current code,
simply: read the whole `businesses.businessBrain` field and the whole `brand_kits/{businessId}` doc,
unconditionally, on every generation call, and pass them wholesale into `GenerationPipelineInput`.
There is no selective/task-specific context assembly — every pipeline stage receives access to the
same full input object (`input.businessBrain`, `input.brandProfile`, `input.localizationProfile`),
even though, per the fresh stage-by-stage trace below, individual stages only actually _read_ a
subset of it in their prompts. What the task's diagram calls "AI Orchestrator" is, in the current
code, a fixed, hardcoded 1:1 mapping (Gemini for all text/vision, OpenAI for the one image) with no
routing logic — see §E.

## B. Existing Business Brain Map

| Field/document                                                                                     | Location                                                                                        | Owner/source                                                                                                                                                   | Authoritative?                                         | Editable? | Historical?                            | Used in generation?                                                                                                                                                                    | Used in localization?                    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `identity` (name, category, description, location, contact)                                        | `businesses.businessBrain.identity`                                                             | `createBusiness` (write), `updateBusinessBrain` (partial write)                                                                                                | Yes                                                    | Yes       | No (current-state only, no versioning) | Yes — Stage 1                                                                                                                                                                          | Indirectly (location feeds Stage 4)      |
| `products[]`                                                                                       | `businesses.businessBrain.products`                                                             | `createBusiness`/updates                                                                                                                                       | Yes                                                    | Yes       | No                                     | Yes — Stage 2                                                                                                                                                                          | No                                       |
| `brand` (tone, personality, visualPreferences, colors, fonts)                                      | `businesses.businessBrain.brand`                                                                | `createBusiness`/updates                                                                                                                                       | Yes (but see `BrandKit` duplication below)             | Yes       | No                                     | Yes — Stage 3/5/6 (prompt text)                                                                                                                                                        | No                                       |
| `audience` (targetCustomer, ageRange, localities, preferences)                                     | `businesses.businessBrain.audience`                                                             | `createBusiness`/updates                                                                                                                                       | Yes                                                    | Yes       | No                                     | Partial — referenced in prompts, not deeply used                                                                                                                                       | Yes — feeds Stage 4                      |
| `localization` (primaryLanguage, secondaryLanguage, regionalStyle, slangIntensity, languageMixing) | `businesses.businessBrain.localization`                                                         | `createBusiness`/updates                                                                                                                                       | Yes                                                    | Yes       | No                                     | Yes — direct input to Stage 4                                                                                                                                                          | Yes — this **is** the localization input |
| `businessRules` (openingHours, deliveryRadiusKm, minimumOrder, offerValidityRules, pricingRules)   | `businesses.businessBrain.businessRules`                                                        | `createBusiness`/updates                                                                                                                                       | Yes                                                    | Yes       | No                                     | Yes — Truth Check + Stage 3                                                                                                                                                            | No                                       |
| `verticalProfile` (salon services/packages/appointmentSettings, or real_estate properties)         | `businesses.businessBrain.verticalProfile`                                                      | `createBusiness`/updates                                                                                                                                       | Yes                                                    | Yes       | No                                     | Yes — vertical-specific Truth Check fact-checkers (§18 of prior audit)                                                                                                                 | No                                       |
| `campaignHistory[]`                                                                                | `businesses.businessBrain.campaignHistory`                                                      | `createBusiness` only (initialized `[]`)                                                                                                                       | **No — never written after creation**                  | No        | Intended to be, but isn't              | **No — MISSING, confirmed by fresh grep this pass**                                                                                                                                    | No                                       |
| `campaignHistory[].performance`                                                                    | same array, nested                                                                              | Never written by any code                                                                                                                                      | No                                                     | No        | No                                     | No                                                                                                                                                                                     | No                                       |
| **Separate `BrandKit` doc** (`brand_kits/{businessId}`)                                            | Own collection, 1:1 with business                                                               | `createBrandKit`/`updateBrandKit`, **and** one direct client write path (`brandKitService.upsert` on `/brand` — bypasses Cloud Functions, per prior audit §29) | Yes, for its own fields                                | Yes       | No                                     | Yes — loaded and passed as `brandProfile` into pipeline stages 3/5/6 prompt text; only 2 of 5 color fields and 0 of 2 font fields actually reach the deterministic compositor (see §F) | No                                       |
| `LocalizationProfile` (frontend request shape)                                                     | Not persisted — submitted fresh with each `generateCampaignStrategy` call from `CampaignWizard` | Client, per-request                                                                                                                                            | N/A — this is request input, not stored Business Brain | N/A       | No                                     | Yes — becomes `input.localizationProfile`                                                                                                                                              | Yes                                      |

**Key finding**: there are **two, not one, sources of "brand" data** — `businessBrain.brand`
(embedded) and the standalone `BrandKit` document — with a confirmed type-shape mismatch between
`BrandKit.logo.primary.url` and the `BrandProfile` type's `logo.url` that pipeline code actually
expects (see §F). This is duplication with drift, not just duplication.

## C. Current Memory System

Distinguishing real memory from "exists in Firestore":

- **Persistent business-state memory**: REAL. `businesses.businessBrain` is genuinely persistent,
  genuinely read on every generation. This is real, working memory of _current business facts_.
- **Campaign memory** (remembering what was generated before, to stay consistent or avoid
  repetition): **MISSING**. `campaignHistory[]` is schema-only, confirmed dead (never written past
  initialization — re-confirmed this pass via fresh grep, corroborating the type file's own Phase-34
  comment and the dispatched sub-agent's independent finding).
- **Customer feedback memory**: **MISSING**. No approval/rejection/rating mechanism exists anywhere
  in the codebase (confirmed by dedicated grep this pass — zero genuine hits for
  feedback/approved/rejected/rating outside of unrelated false positives).
- **Preference memory** (e.g. "this business's owner always rejects reels with humor"): **MISSING**
  — no mechanism exists to derive or store this, since there's no feedback signal to derive it from.
- **Business rules memory**: REAL — `businessRules` is genuinely persistent and genuinely enforced
  (Truth Check reads it; Stage 3 prompt includes it).
- **Localization memory**: **PARTIAL, and this is an important nuance**. The _static_ localization
  _preferences_ (`primaryLanguage`, `regionalStyle`, etc.) are real persistent memory. But the _rich_
  localization content — actual slang terms, humor style, cultural references, a 20+ entry vocabulary
  — is **regenerated fresh by the AI on every single campaign** (Stage 4, `LocalizationStrategySchema`,
  confirmed this pass: `stageResults.localizationStrategy` lives only in an in-memory object for the
  duration of one pipeline run — `pipeline.ts:440,486`; never written to Firestore, confirmed by grep
  for `localizationStrategy` finding zero persistence call sites). This means Mitra does not
  accumulate or reuse a consistent "voice" for a given business across campaigns — it re-derives an
  equally plausible but _potentially different_ slang/humor/vocabulary set each time. This directly
  affects the user's stated goal ("feel specifically created for that business... rather than
  generic") — right now, consistency _within_ one campaign is real, but consistency _across_
  campaigns over time is not engineered at all, just incidentally likely if the AI happens to produce
  similar output for similar inputs.
- **Asset memory** (remembering what was generated as a file, for reuse/reference): PARTIAL — assets
  are stored and retrievable (`campaign_assets`, `assets` collections are real, per prior audit §11),
  but nothing in generation reads _prior_ assets as reference material for a _new_ generation.

## D. Current Context Retrieval

- **Full document reads, not selective**: `generateCampaignStrategy.ts` reads the entire
  `businesses.businessBrain` object and the entire `brand_kits/{businessId}` document on every call,
  regardless of which pipeline stage will actually use which field. There is no per-stage context
  slicing.
- **Hard-coded prompt context**: vertical-specific persona/system-rule strings come from
  `VerticalConfig.promptContext` in `config/verticals.ts` (per prior audit §17) — this is real,
  structured, but static per-vertical, not per-business.
- **Duplicated context**: `businessBrain.brand` and the separate `BrandKit` document both represent
  "brand" — genuinely duplicated, with a confirmed shape mismatch (§B, §F).
- **Stale context risk**: since `businessBrain` and `BrandKit` are read fresh on every call (not
  cached), staleness isn't a caching problem — but there is no versioning/change-tracking, so a
  business that updates its offerings mid-campaign-history has no記録 of what it looked like _when_
  a past campaign was generated (moot today since past campaigns aren't read at all, but relevant to
  any future longitudinal feature).
- **Irrelevant/missing context**: `businessWebsite`/`businessInstagram` fields and vertical catalog
  data (salon services/packages, real-estate properties) are consumed **only by Truth Check**, never
  by any prompt-building stage (confirmed in this session's earlier, separate production-readiness
  audit, re-confirmed consistent with the pipeline stage trace below) — meaning the AI is never told
  to reference a business's website/Instagram/full catalog, but Truth Check can still flag content
  for not mentioning them. This is a real "missing context reaching generation" gap, not corrected by
  this audit.

## E. Current AI Orchestration

Per the dispatched sub-agent's fresh, direct code trace (`functions/src/services/ai/index.ts`,
`config/modelRouting.ts`, `pipeline.ts`), reconfirming and extending prior audit §16:

- **Provider "registry"**: `aiServices` in `index.ts` is a single fixed object — one hardcoded
  provider per capability (Gemini for text/vision, OpenAI DALL-E 3 for image). It is labeled a
  "registry" in a comment but has no lookup/routing logic, no fallback, no per-task alternative.
  **HARD-CODED**, not a real registry.
- **`modelRouting.ts`**: **DEAD CODE, reconfirmed via a fresh grep this session** (in addition to an
  earlier, independent confirmation during this session's separate production-readiness audit). Zero
  import sites outside its own file. The model names it declares (`gemini-1.5-pro`) don't even match
  what's actually used at runtime (`gemini-flash-latest`, hardcoded as string literals directly in
  `index.ts`) — it isn't just unused, it's stale relative to the real implementation.
- **Capability-named call sites**: `pipeline.ts` calls `generateStructuredText`/`generateImage`/
  `analyzeProductImages` — genuinely capability-named, not provider-named, which is a real (if thin)
  indirection layer. But every one of those functions resolves to exactly one hardcoded provider
  underneath, so a stage cannot actually be routed to a different provider without editing
  `index.ts` directly. **PARTIAL** — good naming discipline, no real swappability.
- **Model version tracking**: **PARTIAL**. `generationMetadata` records a `model` string, but it's
  always the hardcoded literal the calling code used (e.g. `'gemini-flash-latest'`, a floating alias)
  — never the actual version/snapshot the provider served in its response. True reproducibility
  (knowing exactly which model build produced a given output) is not achieved.
- **Task-to-model mapping**: does not exist as a real, live mechanism (only as the dead
  `modelRouting.ts` config).

## F. Current Brand Asset System

Per the dispatched sub-agent's fresh trace:

- **Logo storage**: REAL at the schema level — `BrandKit.logo.primary`/`.secondary` (two slots,
  storagePath + URL + dimensions each).
- **Logo variants**: **MISSING as a functioning system**. The two slots exist but have no attached
  semantics (no light/dark, no square/wide distinction encoded or branched on anywhere).
- **Brand colors**: **PARTIAL** in the compositor. Only 2 of 5 `BrandKit.colors` fields
  (`primary`/`accent`, accessed by _array position_, not by key — `pipeline.ts:826-827`) ever reach
  the deterministic SVG compositor; `colors.text`/`colors.background`/`colors.secondary` are never
  used there. `textColor` in the composited creative is **always** the hardcoded default
  (`#FFFFFF`), never the business's actual configured text color.
- **Fonts**: **HARD-CODED**. Every `<text>` element in `compositor.ts` uses `font-family="Arial,
sans-serif"` unconditionally. `BrandKit.fonts.heading`/`.body` are read into AI _prompt text_ (Stage 6) but never reach the deterministic compositor at all.
- **Logo compositing**: **MISSING entirely**. `compositor.ts` has exactly one `<image>` reference —
  the AI-generated hero photo. No brand logo is ever overlaid onto a poster/story creative, despite
  `BrandKit.logo` existing in the schema and being uploadable via the `/brand` UI.
- **Type-shape bug**: `BrandKit.logo.primary.url` (the real, current schema) vs. `BrandProfile.logo.url`
  (what pipeline/creativeBrief code actually reads) are structurally different — `generateCampaignStrategy.ts`
  passes a real `BrandKit` document into a slot typed as `BrandProfile` (typed `any`, so TypeScript
  never catches the mismatch). In practice, a business's actual uploaded logo URL likely never
  successfully reaches even the _prompt text_ that's supposed to reference it, let alone the
  compositor. **This is a concrete, fixable bug**, not a design gap — flagged for the implementation
  phase, not fixed in this audit.
- **Mascot**: no field exists in `BrandKit` or `BusinessBrain` at all (the app's own `MitraMascot`
  component is Mitra's own product mascot, unrelated to a _business's_ brand identity).

## G. Current Localization System

- **Structural preferences** (language, region, city, locality, slang intensity, language mixing,
  regional style enum): REAL, persistent, genuinely used as direct input to Stage 4.
- **Rich cultural content** (actual slang terms with usage guidance, humor style, cultural
  references, ≥20-entry vocabulary): REAL as a _per-campaign, AI-generated artifact_ (Stage 4's
  structured output is genuinely rich and well-specified — not a stub), but **not persisted or
  reused across campaigns** for the same business (§C). Every campaign effectively re-invents this
  business's "local voice" from the same static inputs, rather than building on a growing,
  business-specific voice profile.
- **City/locality granularity**: real fields exist (`city`, `state`, `locality`) and are passed into
  Stage 4's prompt, but there's no structured knowledge base of locality-specific facts (e.g. "this
  neighborhood is known for X") beyond whatever the LLM already knows/infers from the place name
  itself — there is no Mitra-maintained locality knowledge store.
- **Festival/seasonal context**: no dedicated field or system found — Truth Check has a rule
  permitting "festival greetings" as an exception to political/religious-content restrictions
  (`truthCheck.ts` per pipeline stage-9 safety rules), but there's no structured festival calendar or
  seasonal-context injection into generation.

## H. Current Feedback System

**MISSING, confirmed.** No mechanism anywhere — UI or backend — lets a business owner mark generated
content as good/bad/approved/rejected, and consequently there is nothing for any future generation to
learn from. Truth Check (`PASS`/`FAIL`/`REVIEW_REQUIRED`) is a _fact-accuracy_ gate, not an owner
_preference/quality_ signal, and its results aren't fed back into future prompt construction either
(each generation's Truth Check runs fresh against that generation's own output).

## I. Current Campaign History

**MISSING, confirmed with fresh, direct evidence this pass** (corroborating the type file's own
Phase-34 comment and an independent sub-agent trace):

- `getCampaignsByBusiness()` (a real, working query function in `services/firestore.ts`) exists and
  is used **only** by the read-only `listCampaigns` UI-listing callable — never by generation.
- `createCampaign.ts` imports `getCampaignsByBusiness` but never calls it (dead import) — and
  `createCampaign.ts` itself is the separately-known vestigial/broken callable (orphaned credit
  reservation, confirmed and fixed for its billing defect in an earlier session this week; its dead
  history-query import is a second, independent symptom of the same file being unused/vestigial).
- `generateCampaignStrategy.ts` and `pipeline.ts` contain zero `.collection('campaigns')` or
  `.collection('campaign_assets')` queries — confirmed by direct grep across both files.
- Previous campaigns/assets are **stored** (real) and **searchable/retrievable for UI display** (real
  — the `/campaigns` list and detail pages), but **not used for future generation**, and there is no
  distinction anywhere between "approved," "rejected," or "merely generated" content, because no
  approval/rejection state exists at all (§H).

## J. Current Performance Data

**Do not invent performance data — and the audit confirms none needs to be invented, because the
honest answer is there isn't much yet.**

- Only one real, end-to-end metric exists: `whatsappClicks` (`campaign_performance` collection,
  written idempotently by `recordWhatsAppClick`, sourced from a real click event).
- `inquiries` is a schema field that is **permanently `null`** — no WhatsApp Business API, booking
  webhook, or lead-capture form exists anywhere to populate it (confirmed by this session's fresh
  grep and consistent with the prior audit and `docs/PERFORMANCE_DATA_READINESS.md`'s own explicit
  "DATA NOT YET SUFFICIENT" status).
- `docs/PERFORMANCE_ENGINE.md` itself states plainly that no scoring/ranking/recommendation logic
  reads performance data anywhere in the codebase — confirmed accurate by direct code inspection,
  not just trusted as a claim.
- **Is it safe/reliable enough to influence generation today? No** — one low-cardinality counter
  (WhatsApp clicks) is too thin a signal to safely drive content decisions, and the docs correctly
  say so themselves. Any future performance-driven generation feature needs either a richer,
  genuinely-integrated data source (which doesn't exist yet) or an explicit acceptance that
  click-count-only signal is what's available, with appropriately modest expectations.

---

## Classification Summary

| Capability                                                       | Classification                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Business identity (name/category/location/contact)               | REAL                                                                                      |
| Product/service catalog                                          | REAL                                                                                      |
| Brand tone/personality/visual-preferences (text fields)          | REAL                                                                                      |
| Brand colors reaching AI prompts                                 | REAL                                                                                      |
| Brand colors reaching deterministic compositor                   | PARTIAL (2 of 5 fields, positional not keyed, text color never used)                      |
| Brand fonts reaching AI prompts                                  | REAL                                                                                      |
| Brand fonts reaching deterministic compositor                    | MISSING (hard-coded Arial always)                                                         |
| Logo storage (schema)                                            | REAL                                                                                      |
| Logo reaching AI prompts                                         | BROKEN (type-shape mismatch between `BrandKit` and `BrandProfile`)                        |
| Logo compositing onto creatives                                  | MISSING                                                                                   |
| Logo variants (light/dark, square/wide)                          | MISSING (fields exist, no semantics, unused)                                              |
| Business rules (hours, delivery radius, pricing rules)           | REAL                                                                                      |
| Vertical-specific profile (salon/real-estate)                    | REAL                                                                                      |
| Localization preferences (language/region/slang-intensity)       | REAL                                                                                      |
| Localization rich content (slang/humor/vocabulary/cultural refs) | REAL, but PARTIAL for longitudinal use — regenerated per-campaign, never persisted/reused |
| Regional humor memory (business-specific, learned over time)     | MISSING                                                                                   |
| Local metaphors / cultural references                            | REAL within one campaign; MISSING across campaigns (not persisted)                        |
| Festival/seasonal context                                        | MISSING (no structured calendar/injection; only a Truth Check exception rule)             |
| Locality knowledge base beyond place name                        | MISSING                                                                                   |
| Customer/audience characteristics                                | PARTIAL (fields exist, referenced in prompts, not deeply used)                            |
| Campaign history storage                                         | REAL                                                                                      |
| Campaign history retrieval for generation                        | MISSING                                                                                   |
| `campaignHistory[]` field on Business Brain                      | DEAD (confirmed, matches its own type-file's documented status)                           |
| Content approval/rejection feedback                              | MISSING                                                                                   |
| Customer feedback                                                | MISSING                                                                                   |
| Performance data collection                                      | PARTIAL (one real metric: WhatsApp clicks)                                                |
| Performance data influencing generation                          | MISSING (by design/documented status, not oversight)                                      |
| Truth Check (fact-accuracy gate)                                 | REAL                                                                                      |
| Truth Check as owner-preference/quality feedback loop            | MISSING (different concern entirely)                                                      |
| AI provider abstraction (capability-named call sites)            | PARTIAL (good naming, zero real swappability)                                             |
| Model/task routing registry                                      | DEAD CODE (`modelRouting.ts`)                                                             |
| Model version tracking (for reproducibility)                     | PARTIAL (intended model logged, not actual served version)                                |
| Context retrieval (selective, task-specific)                     | MISSING (full-document reads, no slicing)                                                 |
| Business Brain vs. BrandKit duplication                          | DUPLICATED, with a confirmed type-shape bug                                               |
| Longitudinal "business voice" consistency across campaigns       | MISSING (mechanism doesn't exist; any observed consistency is incidental)                 |

---

## 6. Target Architecture — Recommendation

**This section proposes a direction; it does not implement anything.** Per the task's own
constraints ("do not create a parallel architecture if an existing abstraction can be extended
safely," "do not replace working systems unnecessarily"), the recommendation below is explicitly an
**evolution of the existing 12-stage pipeline**, not a rewrite, and explicitly avoids introducing a
second AI provider, a new database system, or a parallel "Business Brain v2."

### What should NOT change

- The 12-stage `GenerationPipeline` structure, its Zod-schema-validated stage outputs, and its
  deterministic Truth Check gate are all REAL, working, and load-bearing — keep them exactly as they
  are.
- Credits (`usageControl.ts`), authorization (`verifyBusinessAccess`), Truth Check, Storage, and the
  Gemini/OpenAI provider choice all stay as-is — nothing here found evidence that any of them are
  broken in a way this task should fix.
- Reel generation's separate FFmpeg pipeline stays separate — this task is about text/image campaign
  generation's context quality, not the Reel renderer.

### What should be added, incrementally, reusing existing shapes

1. **Fix the `BrandKit`/`BrandProfile` type-shape bug first** (§F) — this is the single highest-
   leverage, lowest-risk fix: it likely already breaks logo-in-prompt today for every business that's
   uploaded a logo. Reusing the existing `BrandKit` shape (not inventing a third brand-data shape) and
   correcting the read path in `generateCampaignStrategy.ts`/`creativeBrief.ts` is a bug fix, not new
   architecture.

2. **Persist Stage 4's localization output, keyed by business, and reuse/evolve it across campaigns**
   instead of regenerating it from scratch every time. Concretely: after a campaign's Stage 4 runs,
   write its `vocabulary`/`slangGuide`/`culturalReferences`/`humorStyle` into a new, narrowly-scoped
   field — e.g. `businesses.businessBrain.localizationMemory` (reusing the existing embedded-field
   pattern, not a new collection) — and have Stage 4's prompt include "here is this business's
   established local voice so far; extend/refine it rather than reinventing it" when that field is
   present. This directly serves the user's stated goal (content that stays consistent with a
   specific business's established voice over time) using the existing schema/embedding pattern, not
   a new memory system.

3. **Wire `campaignHistory[]` for real, narrowly** — not a full campaign replay, but a small, bounded
   summary array (last N campaigns' objective/offer-type/tone, already shaped almost exactly like the
   existing dead field) that Stage 3 (Campaign Strategy) can read to avoid repeating the same offer
   framing twice in a row. This reuses the existing (currently-dead) field rather than adding a new
   one, and keeps the added context small and task-specific rather than dumping full campaign packs
   into the prompt — directly satisfying the task's "retrieve ONLY the relevant context" requirement.

4. **Add a minimal, real feedback signal before attempting to use performance data for generation.**
   Per the task's own rule ("do not treat generated AI content as factual... do not let the AI
   silently invent"), and per §J's finding that performance data is too thin to safely drive
   generation today, the recommended sequence is: first close the _feedback_ gap (a simple
   approve/reject/rating action on a generated asset — reusing the existing `campaign_assets`
   document shape by adding a status field, not a new collection), accumulate real signal, and only
   _then_ consider using it in generation — building a "Performance Engine" on top of a single
   WhatsApp-click counter, as the current schema's richer-but-fake fields (`inquiries: null`) already
   warn against, would mean inventing signal that doesn't exist.

5. **A lightweight, explicit "context pack" step between Business Brain and the pipeline**, replacing
   today's "read everything, pass everything" pattern — not a new AI Orchestrator microservice, just
   a small pure function (e.g. `buildContextPack(businessBrain, brandKit, task)`) that each stage's
   existing prompt-builder already effectively hand-rolls piecemeal today; making this explicit is a
   refactor of existing code, not new infrastructure, and directly gives future stages (and any future
   task type) a single place to reason about "what does this specific generation actually need,"
   rather than every stage silently having access to the entire Business Brain.

6. **Do not build a model/task routing registry** unless a second AI provider is actually introduced
   — per the task's own explicit rule ("do not add another AI provider unless the audit proves it is
   technically necessary"), and this audit found no such necessity. `modelRouting.ts` should either be
   deleted (dead, stale, misleading) or left exactly as-is and clearly marked dead — building it out
   now would be solving a problem (multi-provider routing) that doesn't exist yet.

### Target flow (annotated against what's real vs. proposed)

```
USER REQUEST
      │
      ▼
generateCampaignStrategy (REAL, unchanged)
      │
      ▼
BUSINESS CONTEXT — businessBrain + BrandKit (REAL reads, bug-fixed per item 1)
      │
      ▼
CONTEXT PACK BUILDER (NEW — item 5: makes today's implicit per-stage context
      │                 selection explicit; small, pure, reuses existing shapes)
      ├── + localizationMemory (NEW — item 2: persisted, evolving voice)
      ├── + bounded campaignHistory summary (NEW — item 3: reuses existing dead field)
      ▼
12-STAGE PIPELINE (REAL, unchanged — Gemini text/vision, one DALL-E-3 image call)
      │
      ▼
VALIDATION — deterministic Truth Check (REAL, unchanged)
      │
      ▼
ASSET ASSEMBLER / compositor.ts (REAL, bug-fixed per item 1 — brand colors/fonts/logo
      │                          actually applied, not just prompted for)
      ▼
Firestore + Storage (REAL, unchanged)
      │
      ▼
MEMORY UPDATE (NEW, narrow — item 2 writes localizationMemory, item 4 records
      │         feedback if/when a business owner acts on it)
      ▼
FUTURE GENERATION (now has real, bounded, business-specific history to draw on)
```

No new AI provider, no new database, no parallel Business Brain, no new external integration. Every
addition above extends an existing, already-real shape (`businessBrain`, `campaign_assets`,
`BrandKit`) rather than introducing a new one.

## What this audit did not do

- Did not modify `businessBrain`/`BrandKit`/pipeline code, even though a concrete bug was found (§F).
- Did not implement any of the six recommendations in "Target Architecture."
- Did not invent performance data, feedback data, or campaign history where none exists.
- Did not propose adding Instagram publishing, WhatsApp Business API, Meta/Google Ads, or CRM
  integrations — none were found necessary or in scope.
- Did not propose a second AI provider — none was found technically necessary.
