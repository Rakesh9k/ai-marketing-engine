# Complete Campaign Flow — Fix Plan

**Date:** 2026-09-25
**Source:** `docs/COMPLETE_CAMPAIGN_FLOW_AUDIT.md`. All evidence and `file:line` references are there.

**Constraints followed:**

- Audit only; no code was changed.
- The Business Brain concept, the AI provider abstraction and the Truth Check design are kept. Fixes change how data flows into them, not what they are.
- `functions/src/config/pricing.ts` is untouched. The free-tier conflict is raised as an owner decision.

**Priority scale:**

- **P0:** blocks basic operation.
- **P1:** produces incorrect data or incorrect generation.
- **P2:** breaks dependent functionality.
- **P3:** UX or reliability.
- **P4:** cleanup.

**Counts:** P0 = 9 · P1 = 15 · P2 = 11 · P3 = 12 · P4 = 5 · **Total = 52** (the summary table at the end is the authoritative list; cross-reference entries I2 and K3 are tracked under B1/G1 and not counted separately)

**Suggested execution order:**

1. P0 items in this order: M1 (decision), F1 (IAM), L1, L2, H4, J1, C1, C2, J3.
2. Then P1 items grouped by phase.
3. Phase O (E2E verification) gates the release.

---

## Phase A — Data contracts

**A1 · P1 · The products and campaigns rules don't pin tenant fields, so Truth Check results can be forged.**

- _Root cause:_
  - `firestore.rules:125-126`: the products update rule checks only the _existing_ doc's business owner. The owner can re-point `businessId` into another tenant's catalogue.
  - `firestore.rules:147-156`: the campaigns update rule doesn't pin `businessId`, `userId`, `offer`, `metadata.truthCheckResult` or `completedAt`.
  - The `truthCheckStatus` guard is skipped when the key is removed.
- _Fix:_
  - Require `request.resource.data.businessId == resource.data.businessId` and `userId` unchanged.
  - On campaigns, allow client updates only to an explicit allow-list of UI fields via `diff().affectedKeys().hasOnly([...])`.
  - Deny changes to `offer`, `metadata` and status fields.
  - Better: route all campaign and product edits through the existing callables and set client `update: false`.
- _Test:_ `@firebase/rules-unit-testing`:
  - (a) Re-pointing a product's businessId to another tenant is denied.
  - (b) Editing `offer.price` on a verified campaign is denied.
  - (c) Removing `metadata.truthCheckStatus` is denied.

**A2 · P2 · The businesses update rule is unrestricted.**

- _Root cause:_ `firestore.rules:69`. The owner can write `userId`, `agencyId` and `businessBrain` directly, bypassing the `updateBusiness`/`updateBusinessBrain` Zod schemas.
- _Fix:_
  - Set client `update: false`; both profile writers are already callables (`business-profile/page.tsx` header comment).
  - Or pin `userId`/`agencyId`/`status` and forbid `businessBrain`.
- _Test:_ Rules test: a direct client `updateDoc(businesses/x, {businessBrain: …})` is denied; the callable path still succeeds.

**A3 · P2 · Brand kit writes bypass validation, and colours are injected unescaped into SVG.**

- _Root cause:_
  - `firestore.rules:95-102` allows client writes to `brand_kits`, and `/brand` uses them (`brand/page.tsx:419`).
  - Colours are not hex-validated and are interpolated raw into `fill="…"` (`compositor.ts:152,170,180`).
- _Fix:_
  - Make `brand_kits` write server-only and use `createBrandKit`/`updateBrandKit`, which already validate hex colours (`createBrandKit.ts:33-45`).
  - Also escape or whitelist colour attributes in the compositor.
- _Test:_
  - Rules test: a client write is denied.
  - Compositor unit test: a colour value `"red\" onload=\"x"` never appears verbatim in the SVG.

(Also see L1 and L2. The asset document contract also gets a `userId` and a unique ID.)

---

## Phase B — Business Profile

**B1 · P1 · `businessBrain.identity` goes stale, and the description never reaches generation.**

- _Root cause:_
  - `updateBusiness.ts:70-77` updates only the top-level `name`, `location`, `contact` and `description`.
  - `businessBrain.identity` (written once at `createBusiness.ts:151-157`) is what Stage 1 (`pipeline.ts:1217`) and the template context (`creativeTemplateContext.ts:169-175`) read.
- _Fix:_
  - In `updateBusiness`, also set `businessBrain.identity.{name,description,location,contact,category}` from the merged values, plus `businessBrain.lastSyncedAt`.
  - Longer term: derive identity from the top-level fields at read time and don't store two copies (Phase G).
- _Test:_ Functions emulator test: `updateBusiness({name:'New'})`, then `getBusinessDoc` shows `businessBrain.identity.name === 'New'`. A pipeline unit test asserts the Stage 1 prompt contains 'New' and not the old name.

**B2 · P2 · `updateBusiness` accepts `category` and `status`.**

- _Root cause:_ `updateBusiness.ts:14,45`. The UI says category can't be changed (`business-profile/page.tsx:248-250`). Changing it leaves `verticalProfile`, `identity.category` and existing products inconsistent.
- _Fix:_ Remove `category` from the schema, or add a dedicated migration path. Move `status` (archive) to its own callable.
- _Test:_ A callable test with `{category:'salon'}` on a restaurant is rejected or ignored.

**B3 · P2 · The "Things Mitra should never claim" and pricing rules are not enforced.**

- _Root cause:_
  - `offerValidityRules` and `pricingRules` (`business-profile/page.tsx:1262-1284`) reach generation only through the Stage 1 JSON dump.
  - `toCreativeBriefBusinessRules` drops them (`pipeline.ts:26-45`), and Truth Check never reads them.
  - The field name `offerValidityRules` does not match the UI label.
- _Fix:_
  - Pass them explicitly into the copy prompt's MANDATORY REQUIREMENTS.
  - Add a deterministic Truth Check item for phrase lists the owner entered (REVIEW_REQUIRED on a match).
  - Rename or add a `prohibitedClaims` field with a migration.
- _Test:_ Truth Check unit test: owner rule "lowest price in the city" plus copy containing it gives REVIEW_REQUIRED or FAIL.

**B4 · P3 · Website validation rejects bare domains.**

- _Root cause:_ `z.string().url()` (`updateBusiness.ts:29`, `createBusiness.ts:29`); the error is generic.
- _Fix:_ Normalize by prepending `https://` client-side or server-side, and show a field-level message.
- _Test:_ A callable test with `website:'mysite.com'` stores `https://mysite.com`.

---

## Phase C — Brand Profile / BrandKit

**C1 · P0 · The Brand Kit can't be saved or reloaded.**

- _Root cause:_
  - `BrandKitForm` starts from hard-coded defaults and ignores `initialData` except for the logo (`brand/page.tsx:155-169`).
  - The save does a client `setDoc` with `logo: undefined` when no logo was uploaded, and the web SDK has no `ignoreUndefinedProperties` (`client.ts:130`, `converters.ts:131`), so it throws.
  - The error is only logged (`brand/page.tsx:420-421`).
- _Fix:_
  - Initialize the form from `initialData` and add `key={selectedBusinessId}`.
  - Save through the `createBrandKit`/`updateBrandKit` callables (depending on whether a kit exists), omitting undefined fields.
  - Show a success or error toast.
  - Make Cancel reset the form to `initialData`.
- _Test:_ RTL test:
  - (a) Saving with no logo calls the callable without `logo`.
  - (b) After re-mounting with stored data, the inputs show the stored values.
  - (c) A callable rejection shows an error.

**C2 · P0 · A logo stored as a base64 `data:` URL breaks image generation.**

- _Root cause:_
  - `FileReader.readAsDataURL` (`brand/page.tsx:186-206`) stores the base64 in Firestore.
  - `imagePromptBuilder.ts:190-192` and `pipeline.ts:1443` paste the URL into prompts.
  - DALL-E 3 prompts are limited to 4,000 characters, so stage 7 fails for any business with a logo.
- _Fix:_
  - Upload the logo through `getUploadUrl`/`confirmUpload` with `assetType:'logo'` (already supported, `getUploadUrl.ts:14`) and store `{storagePath, url}`.
  - Never include logo URLs in text or image prompts; the logo is composited (D2).
  - Add a hard prompt-length guard (≤ 4,000 characters) in `buildImagePrompt`.
  - Include a one-off migration that moves existing `data:` logos to Storage.
- _Test:_
  - Unit: `buildImagePromptPack` output is ≤ 4,000 characters for a brief with a 200 KB logo.
  - Unit: the image prompt never contains `data:` or `http`.
  - Emulator: a brand kit with a logo still produces a campaign.

**C3 · P1 · There are two brand sources: `businessBrain.brand` and `brand_kits`.**

- _Root cause:_
  - `createBusiness.ts:159-168` writes default colours and tone into `businessBrain.brand`.
  - The wizard sends `localization.brandTone` from it (`buildCampaignInput.ts:78`), and Stage 1 sees it.
  - The copy, direction and compositor stages use `brand_kits` (`brandCreativeContext.ts`).
- _Fix:_
  - Declare `brand_kits` canonical (as `business-profile/page.tsx:311-317` already states).
  - `buildCampaignInput`: take `brandTone` from the brand kit, or let the server override `localization.brandTone` with `brandKit.tone`.
  - Strip `businessBrain.brand` from the Stage 1 dump, or sync it from the brand kit on every save.
- _Test:_ Unit: with brand kit tone `premium` and brain tone `friendly`, the pipeline input `localizationProfile.brandTone === 'premium'` and the Stage 1 prompt doesn't contain `friendly`.

**C4 · P3 · Brand form UX.**

- _Root cause:_ The form is not keyed per business, so switching business carries the draft over. The Cancel button is a no-op (`brand/page.tsx:355-360`). There is no dirty tracking.
- _Fix:_ Key by business, make Cancel reset, and disable Save when the form is unchanged.
- _Test:_ RTL: switching business resets the form values.

**C5 · P3 · `/brand` spins forever when the user has no business or loading fails.**

- _Root cause:_ `loading` starts `true` and is only cleared inside `loadBrandKit` (`brand/page.tsx:377,397-413,432`).
- _Fix:_ Clear `loading` in `loadBusinesses` when the list is empty or the load throws, and render an error state.
- _Test:_ RTL: `getByUserId → []` renders the "No business set up yet" empty state.

**C6 · P3 · Brand fonts, personality and target audience are ignored.**

- _Root cause:_
  - The compositor hard-codes Arial (`compositor.ts:144-191`).
  - `getBrandCreativeContext` drops `personality` and `targetAudience` (`brandCreativeContext.ts:20-40`).
- _Fix:_ Map the heading and body fonts to a safe font stack in the SVG (or the raster renderer, see J3), and pass `personality` into the copy prompt.
- _Test:_ Compositor unit test: `font-family` contains the brand heading font.

---

## Phase D — Brand asset uploads

**D1 · P2 · Clients can write server-generated creative files.**

- _Root cause:_ `storage.rules:5-10` grants owner write on `businesses/{id}/**`, including `campaigns/{cid}/generated/**` (`generatedAssetStorage.ts:44`). A verified poster can be replaced after Truth Check.
- _Fix:_ Add `match /businesses/{businessId}/campaigns/{campaignId}/generated/{file=**} { allow read: if <owner>; allow write: if false; }` ahead of the broad rule. Scope the broad rule to `products/`, `campaigns/`-uploads, `logos/` and similar.
- _Test:_ Storage rules test: an owner write to a `generated/` path is denied; an owner write to `products/` is allowed.

**D2 · P1 · The logo is never placed on the creative.**

- _Root cause:_ The compositor has no logo layer (`compositor.ts:117-208`); the logo exists only as prompt text.
- _Fix:_
  - Add an optional `logo` to `CreativeBrandStyle`, fetched server-side from `storagePath` and embedded as a data URI, placed deterministically in a corner.
  - Pass it from `buildBrandStyle` (`pipeline.ts:873-880`).
- _Test:_ Compositor unit test: the output SVG contains an `<image>` with `data:image/png;base64` for the logo when one is provided, and none otherwise.

(C2 covers storing the logo in Storage.)

---

## Phase E — Product model

**E1 · P1 · Duplicate product catalogues for salon and real-estate businesses.**

- _Root cause:_
  - Services, packages and properties live in `businessBrain.verticalProfile` (`updateBusinessBrain.ts:96-149`).
  - The wizard requires a `products` document (`CampaignWizard.tsx:283`).
  - The real-estate Truth Check matches `productName` against property titles (`truthCheck.ts:1283-1300`), so a mismatch means REVIEW_REQUIRED and the campaign is never "verified".
  - `businessBrain.products` is always `[]` (`createBusiness.ts:158`).
- _Fix:_ Pick one catalogue. Recommended: let the wizard's product step list `verticalProfile` services, packages and properties for those verticals, send a typed `catalogItemRef`, and have the server build `pipelineProduct` from it. Remove or deprecate `businessBrain.products`.
- _Test:_ Emulator: a real-estate business with property "Skyline 3BHK" selected in the wizard gives Truth Check property checks PASS rather than "could not be matched".

**E2 · P2 · There is no product edit or archive UI.**

- _Root cause:_ The `updateProduct` and `archiveProduct` callables exist, but `src/app/products` has only a list and `new`.
- _Fix:_ Add `/products/[productId]/edit` and an archive action using those callables. Price edits should show the existing staleness notice.
- _Test:_ RTL and callable test: editing the price persists and the reload shows the new price. `getCampaign` then reports `isVerificationStale: true` for campaigns on that product.

---

## Phase F — Product uploads

**F1 · P0 · Storage URL signing is BLOCKED in production (IAM).**

- _Root cause:_ The runtime service account lacks `iam.serviceAccounts.signBlob` (`PHASE_19C_…_REPORT.md`, Continuation 3). `getUploadUrl`, `confirmUpload` and `uploadGeneratedAsset` all sign URLs.
- _Fix:_ Owner action: grant `roles/iam.serviceAccountTokenCreator` on the functions runtime service account to itself (exact commands in the 19C report). For the emulator, document `GOOGLE_APPLICATION_CREDENTIALS` or use the emulator's own download-URL scheme.
- _Test:_ A live `getUploadUrl` call returns 200 with a URL whose PUT succeeds. The same check in the emulator CI job.

**F2 · P1 · The stored "durable" image reference is a 7-day signed URL.**

- _Root cause:_
  - `products/new/page.tsx:110` persists `asset.previewUrl` (7-day V4 signature from `confirmUpload.ts:94-98`).
  - Generated assets are also 7-day URLs (`generatedAssetStorage.ts:50-54`).
  - After 7 days, vision silently skips the images (`vision.ts:151`) and thumbnails and previews break.
- _Fix:_
  - Treat `storagePath` as canonical everywhere.
  - Server: read bytes via Admin SDK `bucket.file(storagePath).download()` for vision and compositing, and never use `fetch(url)` for own-bucket files.
  - Client: obtain display URLs through `getDownloadURL(ref(storagePath))` (the storage rules already allow the owner to read) or through a `getAssetUrls` callable that re-signs.
  - Store `storagePath` on `CampaignAsset` (the field exists in the type but is never set).
- _Test:_
  - Unit: with a fake clock 8 days later, vision still receives inlineData for a product image.
  - E2E: a campaign detail page renders images from a campaign whose stored URL is expired.

**F3 · P1 · Wizard "Campaign photos" are required and then discarded.**

- _Root cause:_ `CampaignWizard.tsx:284-285,747-791` requires 1-5 photos, but `buildCampaignInput.ts:36-83` never sends them.
- _Fix:_ Either send them as additional product images (the schema's `newProduct.images` or a new `campaignImageStoragePaths[]`, validated to be under `businesses/{bid}/`) and use them in Stage 2 and the compositor, or remove the step.
- _Test:_ `buildCampaignInput` unit test: the payload includes the photo storage paths, and the server test asserts they reach `analyzeProductImages`.

---

## Phase G — Business Brain sync

**G1 · P1 · Business facts are re-derived by AI on every run, and Truth Check validates against AI output.**

- _Root cause:_
  - Stage 1 dumps `businessBrain` JSON and asks the model for "businessFacts" (`pipeline.ts:1211-1228`).
  - Copy generation treats that output as "IMMUTABLE" facts (`pipeline.ts:1385`).
  - Truth Check's operations, hours, minimum-order and delivery-radius checks read `previousResults.businessUnderstanding` (`truthCheck.ts:1427-1428,1528,1564,1606`). A hallucinated Stage 1 fact becomes the reference it is checked against.
- _Fix (keeps the Business Brain and Truth Check designs):_
  - Add a deterministic `buildBusinessFactSheet(business, brandKit, product)` that turns persisted fields into a structured fact list: name, phone, WhatsApp, address, operating mode, hours, delivery radius, minimum order, services and properties.
  - Inject it verbatim as the authoritative facts in stages 3, 5 and 6. Stage 1 may still produce a _summary_ but is no longer the fact source.
  - Change the Truth Check operational checks to read `input.businessBrain.businessRules` / `settings` directly.
- _Test:_ Truth Check unit test: a Stage 1 mock claiming "delivery within 20 km" while `businessRules.deliveryRadiusKm = 5`, with copy saying "20 km", gives FAIL (today it passes).

**G2 · P1 · The identity snapshot has no single source of truth.**

- Same root as B1. Architectural fix: remove `businessBrain.identity` as a stored copy and build it from the top-level fields in one server helper used by `creativeTemplateContext` and Stage 1. B1 is the minimal fix.
- _Test:_ A helper unit test and the B1 test.

**G3 · P2 · The template context uses the Brain's localization instead of the campaign's chosen language.**

- _Root cause:_ `creativeTemplateContext.ts:186-194` reads `businessBrain.localization`; the campaign's `localizationProfile` (from the wizard) can differ.
- _Fix:_ Pass `input.localizationProfile` into `buildCreativeTemplateContext` and prefer it.
- _Test:_ Unit: Brain `en` and campaign `te_en` gives template context language `te_en`.

---

## Phase H — Campaign creation contract

**H1 · P1 · `offer.originalPrice` is dropped before the pipeline.**

- _Root cause:_ `generateCampaignStrategy.ts:355-362` omits `offerOriginalPrice`. There is then no strike-through or "% OFF" badge (`pipeline.ts:823-837`), and percentage offers can never PASS Truth Check (`truthCheck.ts:962-982`).
- _Fix:_ Add `offerOriginalPrice: data.offer.originalPrice` to the pipeline input. Add original price to the copy prompt's CAMPAIGN INPUT (`pipeline.ts:1392-1398`).
- _Test:_ Unit (pipeline mocked at the provider level): a percentage offer 400→300 gives an overlay badge "25% OFF", and Truth Check has no REVIEW for "25%".

**H2 · P2 · `listCreativeTemplates` is called with the campaign objective.**

- _Root cause:_ `CampaignWizard.tsx:241` sends e.g. `'weekend_offer'`, but `listCreativeTemplates.ts:39-41` accepts creative objectives only. The call returns invalid-argument, the user sees an error toast, and templates are never filtered.
- _Fix:_ Map the campaign objective to a creative objective (a shared table in `src/features/campaign/constants.ts` and `functions/src/config/verticals.ts`), or omit it.
- _Test:_ Wizard test: after selecting an objective, the templates request has a valid enum and no error toast.

**H3 · P2 · The campaign contract omits business contact fields.**

- _Root cause:_ `businessPhone`, `businessWebsite` and `businessInstagram` are never set on the pipeline input (`generateCampaignStrategy.ts:339-373`). A `call_now` CTA shows the WhatsApp number (`pipeline.ts:865-868`), and the contact Truth Checks are skipped (`truthCheck.ts:1465-1487`).
- _Fix:_ Populate them from `business.contact`.
- _Test:_ Unit: with CTA `call_now`, the overlay phone equals `contact.phone`.

**H4 · P0 · The hard-coded `creativeObjective: 'conversion'` breaks 10 of the 30 templates.**

- _Root cause:_
  - `buildCampaignInput.ts:43` always sends `'conversion'`.
  - `creativeTemplateContext.ts:121-123` throws if the template's `objectives` lacks it. Affected templates are at `creativeTemplateLibrary.ts:162,201,246,418,619,678,781,886,1451,1502` (festival, new launch, local relatable and others).
  - The throw happens before the pipeline's `try` (`pipeline.ts:469-509`), so the campaign fails and is refunded.
- _Fix:_
  - Derive `creativeObjective` from the selected template and campaign objective: use the mapped objective if the template supports it, otherwise the template's first objective.
  - Validate server-side against the template (a Zod `refine` in `generateCampaignStrategySchema`) and return a 400 with a clear message instead of failing mid-pipeline.
- _Test:_ A parametrized unit test over `creativeTemplateRegistry.listCreativeTemplates({type:'post'})`: for every template × every campaign objective of each compatible vertical, `buildCreativeTemplateContext` does not throw.

---

## Phase I — Campaign context assembly

**I1 · P1 · The product photo is never used as the visual (the DALL-E hero is invented).**

- _Root cause:_ `image.ts:48-55` is text-only DALL-E 3, while the prompt claims "Use the uploaded product image as the EXACT visual reference" (`imagePromptBuilder.ts:108-109`).
- _Fix (keeps the provider abstraction):_
  - Add a `baseImage` option to `ImageGenerationRequest`. When the product has a photo, default to compositing directly on the real photo; the "hero" is the product image, and zero AI image calls are needed.
  - Optionally use an image-conditioned provider behind the same interface.
  - Remove the false "EXACT visual reference" sentence when no image is actually sent.
- _Test:_ Pipeline unit test: with a product image, `generateImage` is not called (or is called with `baseImage`), and the poster base equals the product's `storagePath`.

**I2 · (tracked under B1/G1) · The copy prompt carries conflicting facts (fresh top level vs stale identity).**

- Resolved by B1 and G1. _Test:_ A snapshot of the copy prompt for an edited business contains only the new name and phone.

(The contract gaps H1 and H3 are also context-assembly defects; each is fixed once, in Phase H.)

---

## Phase J — AI pipeline

**J1 · P0 · Synchronous 12-stage generation behind a 70 s client timeout.**

- _Root cause:_
  - `src/services/api.ts:18` creates `httpsCallable` with no `timeout`, so the SDK default of 70 s applies.
  - `generateCampaignStrategy` returns only after the whole pipeline (`generateCampaignStrategy.ts:222-523`).
  - On timeout the wizard shows a false "credits returned" message and issues a **new** idempotency key (`CampaignWizard.tsx:411,421`). The server still completes and charges, so a retry is a second charge.
  - `useRegenerateAsset.ts:56` has the same issue.
- _Fix (preferred):_ Make generation asynchronous.
  - The callable validates, reserves credits, creates the campaign document (`status:'queued'`) and returns `{campaignId}` immediately.
  - Generation runs in a Firestore-triggered or Cloud Tasks worker (540 s+) that finalizes or refunds.
  - The wizard goes straight to the existing `GenerationProgress` poller.
- _Minimal fix:_ Pass `{ timeout: 540_000 }` to `httpsCallable` for generateCampaignStrategy and regenerateAsset. On a `deadline-exceeded` error, keep the same idempotency key and switch to polling by `metadata.idempotencyKey` instead of showing "failed".
- _Test:_
  - Playwright or Jest with a mocked callable that resolves after 80 s: the UI shows progress, not failure, and does not rotate the key.
  - Emulator: two calls with the same key produce one campaign and one charge (see M3).

**J2 · P1 · Regeneration uses the wrong and incomplete context.**

- _Root cause:_
  - `regenerateAsset.ts:148-179`: `productName: campaign.offer.headline`; no product, images, template or saved style; `regenerationInstruction` is ignored (`:48`).
  - It runs the full pipeline, including a new DALL-E image, for any asset type.
  - It fails for older campaigns because of L1 (`:92-94`).
- _Fix:_
  - Rebuild the pipeline input with the same helper `generateCampaignStrategy` uses: product from `campaign.productId`, `templateId`, `creativeObjective`, `savedStyleId`, `offerOriginalPrice`, contact fields.
  - Add a `stages` option so copy-type regeneration skips stage 7.
  - Thread `regenerationInstruction` into the copy prompt.
  - Map credit errors to `HttpsError('resource-exhausted')`.
- _Test:_ Emulator:
  - Regenerate `headline` → `generateImage` not called; the new asset's text contains the product name; the credit delta is 10.
  - Regenerate after a second campaign exists still succeeds (after L1).

**J3 · P0 · Posters and stories are SVG with an external `<image href>`, so previews and downloads are broken.**

- _Root cause:_
  - `compositor.ts:202` references the hero by signed URL. Browsers don't fetch external subresources for SVG shown in `<img>`/`next/image` (`CampaignDetailContent.tsx:558-566`), so the photo is missing.
  - The download saves SVG bytes as `.png` (`CampaignDetailContent.tsx:313`).
  - The hero URL expires after 7 days.
- _Fix:_
  - At minimum, embed the hero as a `data:` URI inside the SVG (bytes are already in memory at `pipeline.ts:691`) so the SVG is self-contained.
  - Recommended: rasterize server-side to PNG/JPEG. The project avoided native dependencies; a WASM rasterizer such as `@resvg/resvg-js` or Satori-style rendering avoids Sharp.
  - Store the raster as the primary `imageUrl`/`storagePath`, keep the SVG optional, and save downloads with the correct extension and content type.
- _Test:_
  - Unit: the SVG contains no `href="http`.
  - Headless render (resvg in Jest): the pixel at the image centre is not the scrim or background colour.
  - E2E: the downloaded file's magic bytes match the declared extension.

**J4 · P1 · The hard function timeout can leave work half done.**

- _Root cause:_ Worst case is 9 text stages × 3 attempts × 30 s, plus vision 3 × 45 s, plus image 60 s, which exceeds `timeoutSeconds: 540` (`ai/index.ts:21-23`, `retry.ts:88`, `generateCampaignStrategy.ts:148`).
- _Fix:_
  - Add an overall pipeline deadline (for example 480 s) checked between stages that throws a retryable error, so `executeWithUsageControl` refunds.
  - Reduce retries for later stages when the deadline is near.
  - Pair with M2's sweeper.
- _Test:_ Unit with fake timers: when stage 5 starts at t=470 s the pipeline throws `DEADLINE`, and the refund path runs.

**J5 · P3 · Status transitions are cosmetic.**

- _Root cause:_ `generating_creatives` and `validating_output` are written after the pipeline finishes (`generateCampaignStrategy.ts:376-385`); the progress UI only starts after the callable returns.
- _Fix:_ Pass an `onStage(stage)` callback into `GenerationPipeline.execute` that updates the campaign status as each stage begins (this pairs with J1's async model).
- _Test:_ Emulator: the status history observed by a snapshot listener includes `copy_generation`, then `image_generation`, then `truth_check`, in order.

---

## Phase K — Truth Check

**K1 · P1 · Comma-formatted prices FAIL.**

- _Root cause:_ `truthCheck.ts:686` uses `\d+`, so "₹1,999" is read as "₹1" and the check FAILs; the campaign becomes `failed` and credits are charged (intentional for FAIL).
- _Fix:_ Match `\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+` and normalize by stripping commas. Reuse `normalizePrice` (`truthCheck.ts:14`). Also accept a trailing "/-".
- _Test:_ Unit: expected price 1999 with text "₹1,999", "Rs. 1,999/-" and "INR 1999" → PASS; "₹1,899" → FAIL.

**K2 · P1 · The product-name check is exact-substring and FAILs.**

- _Root cause:_ `truthCheck.ts:654-674`. Transliterated or localized copy (te_en/hi_en), or a small spacing change, causes FAIL and a charged failure.
- _Fix:_ Normalize (lowercase, strip punctuation, collapse spaces), accept a token-overlap ≥ threshold, and downgrade "not found" to REVIEW_REQUIRED. Keep FAIL only for a _different_ catalogue product being named.
- _Test:_ Unit: expected "Chicken Dum Biryani" with copy "chicken dum-biryani" → PASS; copy naming "Mutton Biryani" (another catalogue item) → FAIL.

**K3 · (tracked under G1) · Truth Check operational checks are grounded on AI output.**

- Fixed by G1 (reading the persisted rules). Listed here so the Truth Check owner signs off. _Test:_ the G1 test.

(A1 covers forgery resistance, and D1 covers post-verification overwrite of creative files.)

---

## Phase L — Campaign persistence / history

**L1 · P0 · Campaign asset IDs are global constants, so assets are overwritten across all campaigns and tenants.**

- _Root cause:_ `pipeline.ts:1047-1173` emits fixed IDs (`asset_headline_0`, `asset_poster_0`, `asset_whatsapp_0`, `asset_reel_storyboard`…). `createCampaignAssets` writes `campaign_assets/{assetId}` (`firestore.ts:350-359`).
- _Fix:_
  - Generate `assetId = \`${campaignId}_${type}_${index}\``(deterministic and idempotent), or`uuidv7()`, in `assembleCampaignPack`.
  - Update the special-case check `asset.assetId === 'asset_reel_storyboard'` (`CampaignDetailContent.tsx:549`) to use a `content.kind`/`subtype` field.
  - Data repair: existing campaigns' copy can't be recovered (the pack isn't stored elsewhere). Mark affected campaigns in history and offer regeneration.
- _Test:_ Emulator: generate campaign A, then campaign B (different businesses) → `listByCampaign(A)` still returns A's full asset set, and no document is shared.

**L2 · P0 · The asset list query can't satisfy the read rule (rules are not filters).**

- _Root cause:_ `database.ts:318-327` filters only on `campaignId`. The rule needs `resource.data.userId` (never set on assets) or `resource.data.businessId in token.businessIds` (not constrained by the query) (`firestore.rules:161-169`). `Promise.all` then fails the whole detail page (`campaigns/[campaignId]/page.tsx:65-68`).
- _Fix:_
  - Write `userId` on every `CampaignAsset` (`generateCampaignStrategy.ts:390-402`, `regenerateAsset.ts:220`).
  - Query with `where('campaignId','==',id), where('userId','==',uid)`, or add `where('businessId','==',campaign.businessId)` after loading the campaign.
  - Add the matching composite index.
  - Load assets independently of the campaign so an asset failure doesn't hide the campaign.
- _Test:_ `@firebase/rules-unit-testing`: the owner's list query as written by `listByCampaign` → allowed; another tenant's identical query → denied. The detail page RTL test: an asset query rejection still renders the campaign with an asset error.

**L3 · P2 · `next/image` doesn't allow the signed-URL host.**

- _Root cause:_ `next.config.ts:10-20` allows `firebasestorage.googleapis.com` but V4 signed URLs are on `storage.googleapis.com`. The reel cover PNG goes through the optimizer: a 400 in production and a thrown render error in development.
- _Fix:_ Add `storage.googleapis.com` (scoped with `pathname: '/<bucket>/**'`), or render creative assets with `unoptimized`. Moot once F2 serves `firebasestorage` download URLs.
- _Test:_ A page test rendering an asset with a `storage.googleapis.com` URL doesn't throw.

**L4 · P3 · History status semantics.**

- _Root cause:_ A Truth Check FAIL (charged) and a pipeline exception (refunded) both show as `failed` in the list (`campaigns/page.tsx:38-39`). Killed runs stay in an intermediate status forever.
- _Fix:_ Show `error.code` (TRUTH_CHECK_FAILED vs GENERATION_FAILED) as distinct badges. Show "Stuck, contact support" for non-terminal campaigns older than 15 min until M2 reconciles them.
- _Test:_ RTL: both failure types render distinct labels.

**L5 · P4 · The campaign converter drops fields.**

- _Root cause:_ `converters.ts:255-290` omits `templateId`, `creativeObjective`, `savedStyleId`, `savedStyleVersion` and `completedAt`-adjacent metadata.
- _Fix:_ Add them.
- _Test:_ A converter round-trip unit test.

---

## Phase M — Credits

**M1 · P0 (owner decision) · A new free-tier user cannot afford one campaign.**

- _Root cause:_ Free = 100 credits a month (`pricing.ts`, granted in `onUserCreated.ts:44,80`), and `campaign_generation` = 100 + 2×20 = 140 (`usageControl.ts:537`).
- _Fix:_ Not a code change here. The owner chooses one of:
  - (a) raise the free grant,
  - (b) a one-time welcome top-up, a new transaction type through the existing welcome path (`onUserCreated.ts:120`),
  - (c) a "trial campaign" operation type priced ≤ 100.
- _Test:_ Emulator: a fresh signup, then `generateCampaignStrategy` → reservation succeeds.

**M2 · P1 · No reconciliation of stranded reservations or campaigns.**

- _Root cause:_ If the instance is killed (timeout, OOM or deploy), `refundReservation` never runs. `transactions/{key}` stays `pending`, credits stay consumed, and the campaign is stuck at `analyzing`. There is no `onSchedule` job.
- _Fix:_ Add a scheduled function (every 10 min) that finds `transactions` with `status=='pending'` older than 15 min and their campaigns (`metadata.idempotencyKey`). If the campaign is non-terminal: refund and mark it `failed`, with `error.code='GENERATION_TIMEOUT'`.
- _Test:_ Emulator: seed a pending transaction 20 min old plus a campaign at `analyzing`; run the job → usage decremented, transaction `refunded`, campaign `failed`. Running it twice is idempotent.

**M3 · P2 · Replaying the same idempotency key is not idempotent at the result level.**

- _Root cause:_
  - `idempotent-pending` → the second call runs a full second pipeline with a new `campaignId` (`generateCampaignStrategy.ts:160`, `usageControl.ts:258-265`).
  - After completion → an `ALREADY_FINALIZED` error (`usageControl.ts:314-319`) instead of the original campaign.
- _Fix:_ Derive `campaignId` from the idempotency key (look up the campaign by `metadata.idempotencyKey` first). If it exists, return `{campaignId}` without running the pipeline.
- _Test:_ Emulator: two concurrent calls with the same key → one campaign document, one pipeline execution (spy), one charge; a third call after completion returns the same `campaignId`.

**M4 · P3 · Refunds hit the current month, not the reservation's month.**

- _Root cause:_ `usageControl.ts:479` uses `currentPeriodStart()` at refund time.
- _Fix:_ Store the `usageDocId` on the reservation transaction and refund that document.
- _Test:_ Reserve on Sep 30 23:59 and refund on Oct 1 → the September usage document is decremented.

**M5 · P3 · The client credit display diverges from server truth.**

- _Root cause:_ `CampaignWizard.tsx:155` uses `subscription?.creditsIncluded ?? 100`, while the server uses `getMonthlyCredits(usage.planId)`.
- _Fix:_ Display from the `usage` document plus a plan→credits table shared with the server (or return the balance from a callable).
- _Test:_ Unit: `planId 'starter'` with 200 used shows 300.

**M6 · P3 · The emulator usage-period key depends on the local timezone.**

- _Root cause:_ `usageControl.ts:34-37`, `firestore.ts:439-443` and `onUserCreated.ts:23` use local-time `new Date(y, m, 1)`, while the client uses UTC (`database.ts:400`). This is correct only when the runtime is UTC.
- _Fix:_ Use `Date.UTC` everywhere on the server.
- _Test:_ A Jest test pinned to IST (like `tests/globalSetup.js`) asserts server and client IDs match.

---

## Phase N — Frontend state

**N1 · P1 · Custom claims are stale after onboarding.**

- _Root cause:_ `createBusiness.ts:303-307` sets the `businessIds` claim, but the client never calls `getIdToken(true)` (no match in `src/`). The history list (the `businessId in token.businessIds` branch) and asset reads are denied for up to an hour after onboarding.
- _Fix:_ After a successful `createBusiness` call in `onboarding/page.tsx:231`, call `await auth.currentUser.getIdToken(true)` before navigating.
- _Test:_ E2E: sign up, onboard, then open `/campaigns` → no permission error in the same session.

**N2 · P3 · Generation progress never times out.**

- _Root cause:_ `GenerationProgress.tsx:59-61` polls every 2.5 s forever.
- _Fix:_ Stop after ~12 min and show a "still working / contact support" state. Switch to `onSnapshot`.
- _Test:_ RTL with fake timers: after 12 minutes the stuck message is shown and polling stops.

**N3 · P3 · Errors are mis-typed as INTERNAL.**

- _Root cause:_ `regenerateAsset.ts:301-305` throws a plain `Error`; cross-user denials surface as INTERNAL (19C report).
- _Fix:_ Throw `HttpsError` with `resource-exhausted` or `permission-denied`, and map them in the frontend.
- _Test:_ Callable test: insufficient credits returns the `resource-exhausted` code.

**N4 · P3 · Download robustness (CORS, ZIP, naming).**

- _Root cause:_ The client `fetch()` of `storage.googleapis.com` signed URLs needs bucket CORS, and there is no `cors.json` in the repo (UNKNOWN in production). There is no bundle export.
- _Fix:_ Add `cors.json` for the App Hosting origin and apply it with `gsutil cors set`, or proxy downloads through a callable that streams bytes. A ZIP export is optional and stays MVP-deferred.
- _Test:_ E2E: download succeeds from the production origin, and the file opens.

---

## Phase O — E2E verification (release gate)

**O-cleanup items (P4):**

**P4-1 · Dead or misleading code.**

- `createCampaign.ts` (not exported, `index.ts` comment).
- `src/features/business-brain/services/businessBrainService.ts` (no callers).
- `src/features/ai/*`.
- `assetService.deleteAsset`, which calls a non-existent `deleteAsset` callable (`assetService.ts:227`) and a client `deleteDoc` that the rules deny (`firestore.rules:182`).
- `functions/src/config/modelRouting.ts` (unused; defaults to retired `gemini-1.5-pro`).
- _Fix:_ Delete or quarantine them. _Test:_ build, lint and existing tests stay green, and a grep shows zero references.

**P4-2 · Scratch scripts in the repo root.**

- _Root cause:_ `fix.js`, `fix2.js` (UTF-16), `fix3.js`, `fix_comp.js`, `fix_price.js`, `patch*.js`, `_sweep.mjs`, `_neg.mjs`, `_e2e19c*.mjs`, `dump.sh`, `findblob.ps1`, `fsck.txt` and `blobs/` edit production files by line number or regex.
- _Fix:_ Remove them or move them to `scripts/archive/`, and add them to `.gitignore`.
- _Test:_ A clean `git status` after checkout.

**P4-3 · `modelUsed: 'dall-e-3'` is stamped on every asset, including text.**

- _Root cause:_ `generateCampaignStrategy.ts:400`, `regenerateAsset.ts:230`.
- _Fix:_ Use `generationMetadata` / the provider result.
- _Test:_ A unit test on the asset mapping.

**P4-4 · Documentation drift.**

- _Root cause:_
  - `docs/CREATIVE_QUALITY_AUDIT.md` presents synthetic scenarios as real outputs.
  - `PHASE_9` claims a verified `.png` download of what is now an SVG.
  - Several docs referenced by the audit brief don't exist (PRODUCT/ARCHITECTURE/DATABASE/AI_ARCHITECTURE/DESIGN_SYSTEM/MVP_SCOPE/TEST_PLAN/PROMPT_SYSTEM).
- _Fix:_ Mark the synthetic audit as such, correct the Phase 9 claim, and create the canonical DATABASE and AI_ARCHITECTURE docs from this audit.
- _Test:_ A doc review checklist.

(L5 is also a P4 item and is listed under Phase L.)

**Release gate: Playwright golden path (must pass against emulators with real AI keys, then against production):**

1. Sign up → onboarding → the `/campaigns` list loads with no permission error (N1).
2. Business Profile: edit name and WhatsApp → reload shows the new values → start a campaign → the Stage 1 and copy prompt snapshots (debug log) contain only the new values (B1/G1).
3. `/brand`: save with no logo → reload shows the saved values. Upload a logo → Storage path stored (C1/C2).
4. Product with photo → list shows the thumbnail. Advance the clock or time-travel 8 days and the thumbnail still renders (F2).
5. Wizard: choose a festival template → generation completes (H4). A run over 70 s shows progress, not failure (J1).
6. Detail page shows the poster _with the photo_ (pixel check), logo and correct price; the download is a real PNG (J3/D2).
7. Generate a second campaign → the first campaign still shows its own assets (L1/L2).
8. Percentage offer 400→300 → the "25% OFF" badge shows and the status is `verified` (H1/K1).
9. Regenerate a headline → credits −10, no new image call, and the old campaigns are unaffected (J2).
10. Kill the function mid-run in the emulator → within 15 min the reservation is refunded and the campaign is `failed` (M2).
11. Rules suite (A1/A2/D1/L2) runs in CI with `@firebase/rules-unit-testing`.

---

## Summary table

| ID   | Pri | Phase | Title                                                                              |
| ---- | --- | ----- | ---------------------------------------------------------------------------------- |
| M1   | P0  | M     | Free tier 100 < 140 per campaign (owner decision)                                  |
| F1   | P0  | F     | Storage signing blocked by IAM (owner action)                                      |
| L1   | P0  | L     | Global fixed campaign_assets IDs overwrite across campaigns and tenants            |
| L2   | P0  | L     | Asset list query can't satisfy the read rule                                       |
| H4   | P0  | H     | Hard-coded `creativeObjective:'conversion'` breaks 10/30 templates                 |
| J1   | P0  | J     | 70 s client timeout on synchronous generation; false refund message; double charge |
| C1   | P0  | C     | Brand Kit can't save (undefined logo) or reload (defaults)                         |
| C2   | P0  | C     | base64 logo in Firestore and DALL-E prompt breaks image generation                 |
| J3   | P0  | J     | SVG with external href: no photo in preview; SVG downloaded as .png                |
| A1   | P1  | A     | products/campaigns rules: tenant re-point and Truth Check forgery                  |
| B1   | P1  | B     | identity not synced; description unused                                            |
| C3   | P1  | C     | Two brand sources (brain.brand vs brand_kits)                                      |
| D2   | P1  | D     | Logo never composited                                                              |
| E1   | P1  | E     | Duplicate catalogue for salon/real estate                                          |
| F2   | P1  | F     | 7-day signed URL stored as the durable reference                                   |
| F3   | P1  | F     | Wizard photos required but dropped                                                 |
| G1   | P1  | G     | AI re-derived facts; Truth Check grounded on AI output                             |
| G2   | P1  | G     | Identity snapshot has no single source of truth                                    |
| H1   | P1  | H     | originalPrice dropped                                                              |
| I1   | P1  | I     | Product photo not used as the visual                                               |
| J2   | P1  | J     | Regeneration context wrong/incomplete                                              |
| J4   | P1  | J     | No overall pipeline deadline vs 540 s hard kill                                    |
| K1   | P1  | K     | Comma price FAIL                                                                   |
| K2   | P1  | K     | Exact product-name FAIL                                                            |
| A2   | P2  | A     | businesses update rule unrestricted                                                |
| A3   | P2  | A     | brand_kits client writes unvalidated; SVG attribute injection                      |
| B2   | P2  | B     | updateBusiness accepts category/status                                             |
| B3   | P2  | B     | Never-claim/pricing rules not enforced                                             |
| D1   | P2  | D     | Storage allows overwrite of generated assets                                       |
| E2   | P2  | E     | No product edit/archive UI                                                         |
| G3   | P2  | G     | Template localization ignores the campaign's language                              |
| H2   | P2  | H     | listCreativeTemplates objective enum mismatch                                      |
| H3   | P2  | H     | Contact fields not passed (call_now shows WhatsApp)                                |
| L3   | P2  | L     | next/image host for signed URLs                                                    |
| M3   | P2  | M     | Same-key replay reruns the pipeline / errors                                       |
| B4   | P3  | B     | Website URL validation                                                             |
| C4   | P3  | C     | Brand form keying/Cancel/dirty                                                     |
| C5   | P3  | C     | /brand infinite spinner                                                            |
| C6   | P3  | C     | Fonts/personality ignored                                                          |
| J5   | P3  | J     | Cosmetic status transitions                                                        |
| L4   | P3  | L     | History failure semantics / stuck state                                            |
| M4   | P3  | M     | Refund period mismatch                                                             |
| M5   | P3  | M     | Client credit display                                                              |
| M6   | P3  | M     | Emulator timezone usage key                                                        |
| N2   | P3  | N     | Infinite progress polling                                                          |
| N3   | P3  | N     | Error typing INTERNAL                                                              |
| N4   | P3  | N     | Download CORS/ZIP                                                                  |
| L5   | P4  | L     | Campaign converter drops fields                                                    |
| P4-1 | P4  | O     | Dead code                                                                          |
| P4-2 | P4  | O     | Scratch scripts in the repo root                                                   |
| P4-3 | P4  | O     | modelUsed hard-coded                                                               |
| P4-4 | P4  | O     | Documentation drift                                                                |

Counts: **P0 9 · P1 15 · P2 11 · P3 12 · P4 5 · Total 52**.
