# Phase 7 — Image / Creative Generation Report

## 1. Initial Audit

Actual image API calls (before this phase): **32**, confirmed by reading the actual code (`pipeline.ts`'s `runStage7`, prior to this phase's rewrite) — not assumed, not estimated from comments. The breakdown matched the audit exactly:

- **POSTER:** 5 calls (`buildImagePromptPack(creativeBrief, 5)`, one `generateImage` call per prompt)
- **STORY:** 12 calls (3 stories × 4 frames, nested loops, one `generateImage` call per frame)
- **REEL:** 15 calls (3 reels × 5 frames, nested loops, one `generateImage` call per frame)
- **TOTAL: 32**, all fully **sequential** (a `for` loop with `await` inside — no concurrency at all).

Previous suspected number: 32. **Was the 32-call issue confirmed? YES.**

But the forensic audit found something more fundamental than the call count: **the text overlay data (price, offer, CTA) that would make these images usable marketing creatives was computed (`buildTextOverlay()` in `imagePromptBuilder.ts`) and then discarded — never actually applied to any image.** The image model's own prompt explicitly instructed it *not* to render text/prices (`imagePromptBuilder.ts`'s negative prompt: `'text, numbers, prices (except specified overlays)'`), and no deterministic compositing step ever existed to add that text afterward. Every one of the 32 images, even when successfully generated, shipped with **no price, no offer, no CTA, no phone, no business name reliably on it at all.**

A third issue, also confirmed by reading the code: `generateImage()`'s returned `imageUrl` — a temporary OpenAI CDN URL (documented to expire, typically within about an hour) — was persisted directly into `campaign_assets`/campaign documents with no Storage upload step. Every generated creative became a dead link shortly after generation.

## 2. Provider

Provider: **OpenAI**
Model: **DALL-E 3** (`dall-e-3`, `quality: 'hd'`)
SDK: `openai` npm package, called only from `functions/src/services/ai/image.ts` (backend-only; confirmed no browser code references the OpenAI SDK or key — see §11).

## 3. Cost

Per call: DALL-E 3 HD is a paid-per-image API call (OpenAI's own published pricing applies; no usage/cost API is exposed to this codebase to read exact spend, and no `.env` credentials are configured in this environment to query it — **COST NOT DETERMINABLE FROM CURRENT CONFIGURATION** beyond OpenAI's public per-image pricing for `dall-e-3` HD quality).
Previous campaign total: 32 raw provider calls, **now: exactly 1** (`MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN`).
Worst case with retries: Phase 5 deliberately did **not** add automatic retry to `generateImage` (cost-control decision, documented in the Phase 5 report) — so worst case remains exactly 1 call attempt, timing out or failing outright rather than multiplying. This phase's fix (§14 below) makes that 1 call the sole determinant of the entire campaign's success or failure, which is the correct trade-off once only one call is being made.

Credit pricing: `getGenerationCost('campaign_generation')` charges `PRICING.campaignBaseCredits + 2 × PRICING.imageGenerationCredits` = 140 credits — a price that was already calibrated for "up to 2 images," **not** 32. That mismatch (32 real provider calls billed against a 2-image credit price) was a standing unit-economics loss on every single campaign before this phase; it's now a price that comfortably covers the actual 1-call reality with margin. The credit *price* itself was deliberately left unchanged in this phase (a pricing-model decision, not a reliability bug) — only the real call count was fixed. See `functions/src/config/pricing.ts`'s `MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN` constant and its comment for the full reasoning.

## 4. Timeout

Per call: 60 seconds (`IMAGE_TIMEOUT_MS` in `functions/src/services/ai/index.ts`, added in Phase 5, still in effect and now proportionate to a 1-call reality instead of a 32-call one).
Campaign: with 32 sequential calls at up to 60s each, the theoretical worst case before this phase was up to ~32 minutes for image generation alone — far beyond any reasonable Cloud Function execution budget, meaning large campaigns were at real risk of hitting the platform's own function timeout before completing. With exactly 1 call, worst case is 60 seconds.
Risk: **eliminated** for the image stage specifically — 1 bounded call, not a sequential chain of up to 32.

## 5. Retry

Max attempts for image generation: 1 (no automatic retry — a deliberate Phase 5 cost-control decision, re-confirmed correct now that there's only one call to retry in the first place). Text/vision calls elsewhere in the pipeline retry up to 3 times with exponential backoff via `retry.ts` (Phase 5), unaffected by this phase.
Retryable failures: N/A for image generation (no retry).
Non-retryable failures: any image-generation failure — timeout, provider error, malformed response — now correctly fails the whole campaign generation (§14), routing into the existing credit-refund path rather than continuing silently.

## 6. MVP Comparison

No `/docs/MVP_SCOPE.md` (or any other source-of-truth doc) exists anywhere in this repository — confirmed by directory listing before starting this phase, consistent with every prior phase in this project. There is therefore no documented MVP requirement mandating AI-generated story/reel frames, or any specific poster/story/reel count. In the absence of such a document, the two strongest pieces of evidence for what the *intended* scope actually was are: (1) the existing credit pricing model, calibrated for "up to 2 images" per campaign — not 32 — strongly suggesting the 32-call implementation was scope creep beyond the original design, not a deliberate MVP decision; and (2) the task's own explicit instructions (non-negotiable principle: "PREDICTABLE COST > MAXIMUM AI GENERATION," and section 52's explicit direction not to build 15 AI video/image reel frames without a source-of-truth requirement to do so).

## 7. Architecture Decision

**HYBRID** (Option C).

This follows directly from the audit, not from preference: section 10 of the task ("AI image generation must NEVER be trusted to render factual business information correctly... the final creative should have factual text composed/rendered deterministically") is a *requirement regardless of which option is chosen* — even a pure Option B (controlled AI generation) would still need deterministic text overlay to be trustworthy, since DALL-E cannot be relied on to render ₹299 or a phone number correctly. Given that, and given no MVP document mandates AI-only generation, a hybrid was the only architecture that satisfies both "use real AI-generated visuals" (there is real value in a genuine product-aware hero image, which the existing vision-analysis pipeline already produces) and "factual text must be deterministic" simultaneously.

## 8. Implementation

- **Product image**: unchanged — the existing vision-analysis flow (`analyzeProductImages`, Stage 2) and `imagePromptBuilder.ts`'s prompt construction (`buildSubjectSection`: "Use the uploaded product image as the EXACT visual reference... Do NOT change the product to a different dish or style") still drive the single AI-generated hero image. Not duplicated or reinvented.
- **Brand**: `pipeline.ts`'s new `buildBrandStyle()` reads `creativeBrief.brand.colors` (already assembled by the existing `buildCreativeBrief()` from the real Brand Kit) for the compositor's primary/accent colors, falling back to sane defaults only when a business has no Brand Kit configured (see the crash fix in §14).
- **Business info / offer / CTA / phone**: `pipeline.ts`'s new `buildCreativeTextOverlay()` builds the overlay **directly from `GenerationPipelineInput`** — `input.businessName`, `input.offerPrice`, `input.offerOriginalPrice`, `input.offerType` (to compute the authorized discount badge), `input.cta` (mapped to display text), `input.businessPhone`/`input.whatsappNumber`, `input.businessLocation` — never from AI-generated copy text. This is the same server-verified data Truth Check (Phase 6) checks against.
- **Composition**: `functions/src/services/ai/compositor.ts` (new) — a pure, dependency-free SVG builder. No Sharp/Canvas/Jimp was added (none existed in this project; the task explicitly warns against adding a heavy dependency "unnecessarily"). SVG with an embedded `<image>` reference to the Storage-hosted hero photo plus `<text>`/`<rect>` elements for headline, price, discount badge, CTA button, and business/locality/phone footer — deterministic, testable as plain string output, and crisp at any size (an advantage over rasterized text). Explicit layout constraints: safe margins, word-wrap with a hard line cap, ellipsis truncation rather than overflow, font-size auto-shrink for long headlines — all directly tested (§12).
- **Storage**: `functions/src/services/ai/generatedAssetStorage.ts` (new) — downloads the AI provider's temporary image once and re-uploads it under `businesses/{businessId}/campaigns/{campaignId}/generated/{type}_{assetId}.{ext}`, matching the existing asset-storage path convention (`getUploadUrl.ts`), then the composited SVG creatives are uploaded the same way. Every persisted `imageUrl` is now a Storage-hosted URL (7-day signed URL, matching `confirmUpload.ts`'s existing convention), never a raw provider URL.
- **Firestore**: `CampaignAsset` type/metadata unchanged (reused, not duplicated) — but the `type` field is now a real `AssetType` enum value (`'poster'`/`'story'`/`'reel'`); it was previously `'story_frame'`/`'reel_frame'`, values that don't exist in the shared `AssetType` union at all (a latent type-mismatch bug fixed as part of this phase, confirmed via a test that asserts every generated asset's `type` is one of the enum's real values).

## 9. Truth Check Integration

The compositor's text overlay is built exclusively from `GenerationPipelineInput` fields — the exact same authoritative data `runDeterministicTruthCheck` (Phase 6) independently checks the AI-generated *copy* against. Since the image's factual text never comes from AI output at all (it's template-composed from verified fields), there is no possibility of the image disagreeing with a Truth-Check-passed campaign's facts — correctness here is structural, not something that needs a second verification pass on the image itself. Truth Check's existing scope (verifying the AI-generated copy text) is unchanged and still authoritative for that content; this phase does not weaken, bypass, or duplicate it.

## 10. Credit Safety

- **Reserve**: unchanged — `executeWithUsageControl` (Phase 5/6, untouched) still reserves credits before `pipeline.execute()` runs.
- **Success**: unchanged — full campaign (copy + composited creative) completing without a thrown error finalizes credits normally.
- **Failure (new fix)**: previously, if the sole image call failed, `runStage7` would return an empty `posterUrls`/`storyFrameUrls` and the pipeline would continue to completion — `executeWithUsageControl` would see a normal return value (not a thrown error) and **finalize full credits for a campaign with no visual creative at all**. Fixed: `runStage7` now **throws** when the hero image cannot be produced, which routes into `executeWithUsageControl`'s existing (already-verified-correct, Phase 5/6) catch-and-refund path. No new credit mechanism was created — this reuses the exact machinery already in place.
- **Timeout**: the 60s `IMAGE_TIMEOUT_MS` wrap (Phase 5) still applies; a timeout is a failure like any other and now correctly fails the whole generation per the above.
- **Partial failure**: with exactly one AI call, "partial failure" for the image stage specifically is no longer a distinct case — it either succeeds (poster + story + reel all produced deterministically from it) or the whole generation fails and refunds. This is simpler and safer than the prior 32-call design's implicit partial-failure surface (where some posters/frames could succeed and others silently fall back to placeholder images while credits were still charged in full).
- **Regeneration**: `regenerateAsset.ts` (Phase 6) re-runs the same pipeline, so it now also makes exactly 1 image call per regeneration instead of up to 32 — an automatic, proportional cost reduction from the same fix, with no separate change needed.

## 11. Security

- **Backend-only AI**: unchanged — OpenAI/Gemini clients only ever instantiated in `functions/src/services/ai/*.ts`; confirmed (again, as in Phase 5) via repository-wide search that no `NEXT_PUBLIC_*` or frontend reference to any provider key exists.
- **Storage security**: the new `businesses/{businessId}/campaigns/{campaignId}/generated/...` path falls under the *already-existing* `storage.rules` wildcard match `businesses/{businessId}/{allPaths=**}` (ownership gated on the caller's `businessIds` custom claim) — verified by reading `storage.rules` directly; no rule changes were needed or made.
- **Firestore security**: unaffected by this phase; Phase 6's `campaign_assets` write-lock (`allow write: if false`, server-only) and campaign verification-field protections remain in effect and untouched.
- **Secret handling**: no provider credentials appear in any Storage path, Firestore document, or the new compositor's output (SVG contains only the business's own already-public marketing facts — price, offer, CTA, phone — the same information a paper flyer would carry).

## 12. Tests

Lint: **PASS**
Typecheck: **PASS** (root, includes `functions/src` under strict settings, unchanged)
Unit: **95 passed / 0 failed / 10 skipped** (functions, no emulator) — **114 passed / 0 failed / 2 skipped** (root, no emulator). New test files: `compositor.test.ts` (20 tests — factual accuracy, readability/overflow, determinism), `generatedAssetStorage.test.ts` (5 tests — ownership path correctness, controlled failure), `pipeline.imageCallCount.test.ts` (5 tests — real end-to-end call count through the actual `GenerationPipeline.execute()`, asset-type validity, Storage-URL persistence, fail-closed behavior).
Build: **PASS**
Functions build: **PASS**
Emulator: **SKIPPED** — not re-run in this phase (Phase 6 already established the Firestore emulator works in this environment; re-running it wasn't necessary for image/creative-generation-specific verification, which is fully covered by the unit/integration tests above that exercise the real pipeline code with mocked provider boundaries).

## 13. Real Generation

**REAL CREATIVE GENERATION BLOCKED** — no `GEMINI_API_KEY`/`OPENAI_API_KEY` available in this environment (same limitation as Phases 5 and 6; confirmed absent from `process.env`, no `.env` file exists anywhere in the repository or this environment).

What was verified in lieu of a live call: the entire pipeline logic — prompt building, the single bounded `generateImage` call, Storage re-hosting, deterministic text compositing, Firestore asset assembly, and the fail-closed credit path — was exercised end-to-end through the real `GenerationPipeline.execute()` method with only the two literal AI-provider-boundary functions (`generateImage`, `generateStructuredText`) mocked (§12). This proves the *code path* is correct; it does not prove OpenAI's actual DALL-E 3 API accepts the constructed prompt or that the resulting hero photo is visually satisfactory — that requires the live call this environment cannot make.

Actual output: **NOT INSPECTED** (blocked, as above)
Storage: verified structurally (mocked) — **PASS** at the code/test level, not against a real Storage bucket
Firestore: verified structurally (mocked/real deterministic assembly logic) — **PASS** at the code/test level
Campaign association: **PASS** — every generated asset's Storage path is built from the real `businessId`/`campaignId`, tested explicitly to never cross-contaminate between two different businesses (§12)

## 14. Cost Verification

Actual provider calls per campaign: **1** (down from 32), enforced by `MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN` and verified by a real end-to-end pipeline test.
Actual/estimated cost: **NOT DETERMINABLE FROM CURRENT CONFIGURATION** in absolute currency terms (no live API access in this environment to query actual OpenAI billing), but the *call count* — the dominant cost driver — is now known precisely and is 32x lower than before.

## 15. Remaining Issues

1. **Real provider test blocked** — no credentials in this environment, same limitation carried through Phases 5–7.
2. **SVG is not a rasterized PNG/JPEG.** This was a deliberate choice to avoid adding a heavy native-binary dependency (Sharp/Canvas) that doesn't exist in this project today. Browsers render SVG natively, so this works for on-screen viewing and download, but some third-party sharing contexts (certain older WhatsApp/Instagram integrations) prefer raster formats. If that becomes a hard requirement, the smallest addition would be `sharp` specifically for a final SVG→PNG rasterization step (not a general compositor rewrite) — deliberately not added in this phase, since nothing in this repository's actual usage (no WhatsApp API integration exists yet, per Phase 4's findings) currently requires it.
3. **Two severe, unrelated-to-cost pre-existing crash bugs were found and fixed as a direct result of writing a real end-to-end test for this phase**: (a) `creativeBrief.ts`'s `buildRequiredElements` accessed `brandProfile.colors.primary` without the optional chaining used everywhere else in the same file — crashing generation entirely for any business without a Brand Kit configured; (b) `imagePromptBuilder.ts`'s `buildSubjectSection` accessed `product.visualAttributes.colorPalette`/`.keyVisualElements` without guards — crashing generation for any product whose `attributes` isn't the AI-vision-derived shape, i.e. essentially every product created through the standard product form (Phase 3) rather than vision-analyzed. Both were **completely blocking** bugs (100% failure rate for the affected, very common cases) that had nothing to do with the 32-call/cost problem this phase was primarily scoped to fix, but were directly encountered and fixed while building the required real-pipeline test.
4. **Credit price (140 credits, calibrated for "up to 2 images") was deliberately left unchanged** even though actual usage is now 1 image — see §3/§10. This is a business/pricing decision outside this phase's mandate ("fix creative generation," not "reprice the product"), documented rather than silently changed.
5. **The 7-day signed Storage URL** (matching the existing `confirmUpload.ts` convention) is not truly permanent — after 7 days a generated creative's URL would need to be re-signed to remain accessible. This is a pre-existing convention this phase reused rather than a new gap; flagged for visibility since it directly relates to "images belong in Storage, not temporary links" (§7's spirit), even though it is a large improvement over the prior ~1-hour provider-URL expiry.
6. **No dedicated real-image visual inspection was possible** (blocked per §13) — the readability/dimension/factual-accuracy tests in `compositor.test.ts` verify the *generated SVG markup* contains the correct text, dimensions, and no overflow coordinates, which is a strong correctness signal for a deterministic template, but is not the same as a human (or automated visual-diff) inspection of a rendered pixel image.

## 16. Files Changed

**New files**
- `functions/src/services/ai/compositor.ts` — deterministic SVG text-overlay compositor
- `functions/src/services/ai/generatedAssetStorage.ts` — downloads provider images, re-hosts them and composited creatives in Firebase Storage
- `functions/src/services/ai/compositor.test.ts`, `generatedAssetStorage.test.ts`, `pipeline.imageCallCount.test.ts` — new tests (30 total)

**Modified**
- `functions/src/services/ai/pipeline.ts` — `runStage7` rewritten (32 sequential AI calls → 1 AI call + deterministic composition); new helper methods `buildCreativeTextOverlay`/`buildBrandStyle`/`buildStoryFrameOverlays`/`buildReelStoryboard`; `assembleCampaignPack`'s asset-type bug fixed (`'story_frame'`/`'reel_frame'` → real `AssetType` values `'story'`/`'reel'`); local `GenerationPipelineInput` interface extended with `businessPhone`/`businessWebsite`/`businessInstagram` (previously silently dropped, structurally present but statically invisible)
- `functions/src/services/ai/creativeBrief.ts` — fixed unguarded `brandProfile.colors.primary` crash
- `functions/src/services/ai/imagePromptBuilder.ts` — fixed unguarded `visualAttributes` field-access crashes
- `functions/src/config/pricing.ts` — added `MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN` constant

## 17. FINAL VERDICT

**PHASE 7 IMPLEMENTED BUT PARTIALLY VERIFIED**
