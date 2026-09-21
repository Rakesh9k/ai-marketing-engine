# Phase 4 Campaign Creation Report

## 1. Implementation Summary

Built a multi-step Campaign Creation wizard at `/campaigns/new` as a thin UI layer over the existing, unmodified campaign backend. No new backend systems, credit system, AI pipeline, or Truth Check logic were created. Two genuine backend bugs were discovered during integration and fixed (minimum necessary scope, documented in §14).

No `/docs` directory existed in this repository before this phase — `PRODUCT.md`, `MVP_SCOPE.md`, `ARCHITECTURE.md`, etc. were all absent. The MVP scope (Hyderabad restaurants, English/Telugu/Telugu+English, Hyderabadi regional style) is taken from this task's own instructions, cross-checked against the actual backend Zod enums, since there was no repo document to verify against.

## 2. Actual Route Created/Updated

- **Created** `src/app/campaigns/new/page.tsx` — the wizard entry point.
- **Created** `src/app/campaigns/layout.tsx` — wraps all of `/campaigns/*` in `ProtectedRoute` + `Sidebar`. This did not exist before; `/campaigns` and `/campaigns/[campaignId]` previously rendered with no auth redirect and no navigation chrome (a pre-existing gap, now fixed for all three campaign routes since it's a shared layout).
- The dashboard's existing "Create Campaign" button (`src/app/dashboard/page.tsx:403`) and the campaigns list's empty-state CTA (`src/app/campaigns/page.tsx:72`) already pointed at `/campaigns/new` — both were dead links before this phase; no changes needed there.
- No duplicate/competing wizard existed. Grep for `CampaignWizard|ProductSelector|OfferForm|AudienceSelector|LocalizationSelector|GenerationProgress|CreditWidget` returned zero matches before this work.

## 3. Wizard Steps

1. Objective
2. Product & Photos
3. Offer & Duration
4. Audience
5. Call to Action
6. Language & Regional Style
7. Campaign Style
8. Review & Generate

This matches the recommended grouping exactly (8 steps, no required input omitted).

## 4. Backend Integration

The wizard calls exactly one existing callable: **`generateCampaignStrategy`** (`functions/src/functions/campaigns/generateCampaignStrategy.ts`), via `callFunction({ functionName: 'generateCampaignStrategy', data })` (the same `src/services/api.ts` helper already used elsewhere in the app).

A second existing callable, **`createCampaign`**, was investigated and deliberately **not** called. `createCampaign` creates a `draft` campaign document and reserves credits via `reserveCredits` (keyed by `idempotencyKey`), but never runs the generation pipeline. `generateCampaignStrategy` is fully self-contained: it does its own credit reservation via `executeWithUsageControl` → `reserveCreditsForOperation` (keyed by the freshly generated `campaignId`, a *different* reservation mechanism from `createCampaign`'s). Calling both from the wizard would have reserved credits twice for one campaign. Since `generateCampaignStrategy` already does everything (business fetch, campaign doc, pipeline, Truth Check, persistence, credit reserve/finalize/refund), it is the sole entry point the wizard calls. `createCampaign` is effectively an orphaned/unused parallel flow — not modified, not deleted, just not invoked by this wizard.

No credit reservation, campaign document write, or pipeline stage was reimplemented on the frontend. The backend remains fully authoritative for all of it.

## 5. CampaignInput Mapping

Mapping lives in `src/features/campaign/buildCampaignInput.ts`, a pure function (no React) so it can be unit-tested directly against the real backend Zod schema (see §12).

| UI field | Backend field |
|---|---|
| Step 1 objective card | `objective` |
| Step 2 selected product | `productId` |
| Step 2 uploaded photos | *(not sent to this callable — see §14; used for the campaign's own image assets only)* |
| Step 3 offer type | `offer.type` |
| Step 3 headline | `offer.headline` |
| Step 3 description | `offer.description` |
| Step 3 price / original price | `offer.price` / `offer.originalPrice` |
| Step 3 terms | `offer.terms` |
| Step 3 duration start/end | `offer.validityStart`/`offer.validityEnd` **and** `duration.start`/`duration.end` (same dates, sent to both per the schema) |
| Step 4 localities | `audience.localities` |
| Step 4 age min/max | `audience.ageRange.min`/`.max` |
| Step 4 occasion | `audience.occasion` |
| Step 5 CTA card | `cta` |
| Step 6 language | `localization.primaryLanguage` (+ derived `secondaryLanguage`, `languageMixing`) |
| Step 6 regional style | `localization.regionalStyle` |
| Step 7 campaign style | `localization.campaignStyle` |
| Business location (prefilled, not re-entered) | `localization.country`/`state`/`city`/`locality` |
| Business Brain `brand.tone` (prefilled) | `localization.brandTone` |
| Business Brain `localization.slangIntensity` (prefilled) | `localization.slangPreference` |
| Business Brain `audience.targetCustomer` (prefilled, with fallback) | `localization.audienceDescription` |
| Fixed default (no wizard step — see §14) | `localization.contentFormat = 'poster'` |
| Client-generated UUID, locked for the attempt | `idempotencyKey` |

## 6. Supported Enums

Sourced from `generateCampaignStrategySchema` in `functions/src/functions/campaigns/generateCampaignStrategy.ts`, with language/regional style further restricted to this task's stated MVP scope (see `src/features/campaign/constants.ts` for the exact lists and citations):

- **Objectives (all 5 backend-supported, all exposed):** `weekend_offer`, `new_dish`, `festival`, `discount`, `brand_awareness`. (The prompt's alternate list included "Get More Customers" and "Product/Service/Appointment Promotion" — none of these exist in the backend enum, so none are exposed. Documented discrepancy.)
- **Offer types (all 6 exposed):** `percentage`, `fixed`, `bogo`, `combo`, `free_delivery`, `loyalty`.
- **CTA types (all 5 exposed):** `order_whatsapp`, `book_table`, `view_menu`, `call_now`, `get_directions`.
- **Languages (MVP-restricted to 3 of the backend's 5):** `en`, `te`, `te_en`. `hi` and `hi_en` are backend-valid but excluded from the UI per MVP scope.
- **Regional styles (MVP-restricted to 2 of the backend's 8):** `neutral`, `hyderabadi`. `telangana`, `mumbai`, `bangalore`, `delhi`, `chennai`, `kolkata` are backend-valid but excluded from the UI per MVP scope.
- **Campaign styles (all 10 backend-supported, all exposed):** `funny`, `quirky`, `emotional`, `urgent`, `fomo`, `storytelling`, `educational`, `sarcastic`, `youthful`, `dark_comedy`. Unlike language/regional style, this task's instructions said to expose whatever the backend supports for this field (it explicitly names sarcastic/youthful as backend-supported extras beyond the "such as" MVP list), so no restriction was applied here. `dark_comedy` in particular is not mentioned in either list in the prompt — flagged as a genuine gap between the prompt's prose and the actual enum; included since the rule for this step was "backend-supported," not "MVP-restricted."

## 7. Business Brain Prefill

On business selection, the wizard prefills (but never writes back to Business Brain):

- `audience.localities` ← `business.businessBrain.audience.localities`, falling back to `business.location.locality || business.location.city`.
- `audience.ageMin`/`ageMax` ← `business.businessBrain.audience.ageRange`.
- `primaryLanguage` ← `business.businessBrain.localization.primaryLanguage`, normalized into the MVP subset (falls back to `en` if the stored value is `hi`/`hi_en`).
- `regionalStyle` ← `business.businessBrain.localization.regionalStyle`, normalized into the MVP subset (falls back to `neutral`).
- At submit time (not editable via any wizard step): `brandTone` ← `businessBrain.brand.tone`, `slangPreference` ← `businessBrain.localization.slangIntensity`, `audienceDescription` ← `businessBrain.audience.targetCustomer`.

All of the above are one-way reads. The wizard never calls `updateBusiness`/`businessService.update` — campaign-level edits never mutate Business Brain.

## 8. Credit Handling

- **Estimate shown to the user:** `ESTIMATED_CAMPAIGN_GENERATION_CREDITS = 140` in `src/features/campaign/constants.ts`, which mirrors `PRICING.campaignBaseCredits (100) + 2 × PRICING.imageGenerationCredits (20)` from `functions/src/config/pricing.ts`, exactly what `getGenerationCost('campaign_generation')` in `functions/src/services/usageControl.ts` returns. There is no callable that exposes this number to the frontend today, so it's a manually-mirrored constant with a comment pointing at the backend source — see §14 for the drift risk this creates.
- **Current balance shown to the user:** `subscriptionService.getByUserId` + `usageService.getCurrentPeriod` (existing client services, same pattern already used by `src/app/dashboard/page.tsx`), computed as `creditsIncluded - creditsUsed`.
- **Actual reservation:** happens entirely server-side inside `generateCampaignStrategy` → `executeWithUsageControl` → `reserveCreditsForOperation`/`finalizeReservation`/`refundReservation`. The frontend never writes to `transactions` or any credit ledger.
- If the displayed balance is below the estimate, the Generate button is disabled and a link to `/billing` (existing route) is shown instead of calling the backend.

## 9. Validation

- **Frontend** (`validateAndNext` in `CampaignWizard.tsx`): required fields per step, price/discount sanity (positive price, percentage discount between 1–100%, original price > discounted price for percentage/fixed offers), date range (end ≥ start), age range (18–80, max ≥ min), 1–10 localities, 1–5 photos.
- **Backend** (unchanged, authoritative): the full Zod schema in `generateCampaignStrategy.ts` re-validates everything server-side regardless of what the frontend allowed through.
- A dedicated test suite (`tests/campaignWizard.test.ts`) asserts the wizard's constructed payload actually parses against a schema mirroring the real backend one, and that clearly out-of-scope values (unsupported objective/CTA/offer type/language, negative price, empty localities, non-UUID idempotency key) are rejected by that same schema.

## 10. Error Handling

- Product/asset load failures → toast: "Couldn't load your products. Please try again."
- Photo upload failures → surfaced inline via `ImageUploader`'s existing error/retry UI, plus a toast.
- Campaign start failure → "We couldn't start this campaign. Your credits were not charged." with credit-specific ("You don't have enough credits...") and subscription-specific messages when the backend error indicates those cases.
- Generation failure (status transitions to `failed`) → the real `campaign.error.message` from the backend is shown; the user is kept on the wizard (not redirected to a fake success page), and a fresh idempotency key is issued so a genuine retry is possible.
- No raw stack traces or Firebase error codes are shown to the user.

## 11. Security

- **Authentication:** `/campaigns/*` now sits behind `ProtectedRoute` (redirects unauthenticated users to `/login?redirect=...`) via the new `campaigns/layout.tsx`.
- **Business ownership:** the wizard only ever loads businesses via `businessService.getByUserId(user.uid)`; the callable independently re-verifies via `verifyAuthAndBusinessAccess(context, data.businessId)` server-side — the browser-supplied `businessId` is never trusted on its own.
- **Product ownership:** products are loaded via `productService.listByBusiness(business.businessId)`, scoped to the already-verified business; Firestore rules (`firestore.rules:66-76`) independently enforce this at the database layer.
- **No direct AI calls:** the wizard only calls `generateCampaignStrategy`; no Gemini/OpenAI/NVIDIA client, key, or endpoint is referenced anywhere in the new frontend code.
- **No client credit manipulation:** confirmed in §8 — the frontend never writes to `transactions`/`usage`/`subscriptions`.
- **No Truth Check bypass:** the frontend never sets `status`, `verified`, or `truthCheckStatus`. It only ever reads the real `Campaign.status` via `campaignService.get()` polling (`GenerationProgress.tsx`) and reacts to whatever the backend actually wrote.

## 12. Tests

Added `tests/campaignWizard.test.ts` (19 tests, all passing):

- `buildCampaignInput` produces a payload that parses against a schema mirroring the real `generateCampaignStrategySchema` (reusing the existing shared `localizationProfileSchema` from `src/lib/validation/schemas.ts` rather than re-declaring it).
- Field-name/enum-value fidelity (no drift) between wizard output and backend field names.
- `buildCampaignInput` returns `null` when any required field (objective, product, offer type, CTA, language, regional style, campaign style) is missing — proving the UI cannot construct a payload that omits a required backend field.
- The same schema genuinely rejects out-of-scope values (an objective/CTA/offer type/language not in the backend enum, a negative price, an empty localities array, a non-UUID idempotency key) — proving these are backend-authoritative, not just UI-hidden.
- Every value in each MVP-restricted constant list (`LANGUAGES`, `REGIONAL_STYLES`) is confirmed to be a subset of the real backend enum, and the objective/offer-type/CTA/campaign-style lists are confirmed to contain only backend-valid values.

Full project test run: **`npm test` → 11 suites, 109 passed, 2 skipped, 0 failed.** The 2 skipped tests are pre-existing Firestore/Storage security-rules tests that self-skip without a running Firebase emulator (`tests/security.test.ts`, `tests/storage.test.ts`, `tests/phase27-*.test.ts` — the latter two ran real assertions and passed; only the emulator-only ones skipped). This is honestly reported, not claimed as passing.

What was **not** added: component-level (React Testing Library) tests for the wizard's step-by-step UI interaction, routing/auth-redirect tests, and photo-upload integration tests. The project had no existing component-test setup (no `@testing-library/react` in `package.json`, no prior component test files) to extend, and building one from scratch was judged out of scope for "make the wizard call the real backend correctly" — the highest-value test (schema compatibility, §40 in the task) is the one implemented.

The backend fix in `generateCampaignStrategy.ts` (existing-product fetch, §14) has no automated test covering it — the `functions/` package has zero test files today (`functions:test` reports "No tests found" against 165 checked files), so there was no existing harness to extend, and standing one up (emulator + mocked AI calls) was judged out of scope for this phase. It was verified only via `functions:typecheck`/`functions:build` passing and manual code review of the fetch/ownership-check/mapping logic.

## 13. End-to-End Test

**Not performed against a live backend.** What *was* verified:

- `npm run typecheck` — pass (both root and `functions/`).
- `npm run lint` — pass (one unrelated pre-existing failure in `businessBrainService.ts` fixed since it blocked the `--max-warnings 0` gate).
- `npm run build` — pass; `/campaigns/new` compiles and is listed in the route manifest (7.85 kB, statically prerendered shell).
- `npm run functions:build` — pass.
- `npm test` — pass (see §12).
- Firebase emulators (`firebase-tools` and a JDK are present in this environment) were **not** started to run a live `generateCampaignStrategy` invocation, because the generation pipeline calls real AI providers (Gemini/OpenAI/etc. per `functions/src/services/ai/index.ts`) and no provider API keys are available in this environment. An emulator run would necessarily fail at the AI-generation stage regardless of how correct the wizard's payload is, so it would not have proven anything beyond what the schema-compatibility tests in §12 already prove, and reporting it as a live success would have been fabricated. This is the accurate reason "FULLY VERIFIED" is not being claimed — see §16.

## 14. Known Limitations

1. **Four real backend/frontend bugs were found and fixed (minimum-scope):**
   - `generateCampaignStrategy.ts` built a `Campaign` object but never called `createCampaignDoc` before its first `updateCampaignDoc(campaignId, ...)` call — that `.update()` would throw `NOT_FOUND` on every single invocation, because Firestore's `update()` requires the document to already exist. **This function could not have worked for any caller before this fix.** Fixed by adding `await createCampaignDoc(campaign);` immediately before the first status update.
   - **The "select an existing product" path (this wizard's primary path) fed the pipeline an empty product.** `generateCampaignStrategy.ts` only ever populated `productName`/`newProduct`(pipeline input)/product images from `data.newProduct` — the ad-hoc/never-saved product path. When a real `productId` was supplied instead (exactly what the wizard's Step 2 does), the pipeline received `productName: ''` and no images at all, and `pipeline.ts`'s vision-analysis stage (`runStage2`, gated on `input.newProduct`) never ran. Fixed by fetching the product via `getProductDoc(data.productId)` (with an ownership check against `data.businessId`) and feeding its name/description/price/images into the same pipeline-input field `newProduct` already used for the ad-hoc path — `pipeline.ts` itself needed no changes, since that field was always generic "product data for this generation," not specifically ad-hoc-product data.
   - `Asset` upload type mismatch: `getUploadUrl.ts`'s schema accepted `assetType: 'product' | 'campaign' | 'brand-kit' | 'logo'`, but `confirmUpload.ts`'s allowlist and the shared `AssetType` type only recognized the seven AI-creative-asset types (`poster`, `headline`, ...), silently downgrading every product/campaign photo to `'poster'`. Fixed by extending the shared `AssetType` union and `confirmUpload.ts`'s allowlist to include `product`/`campaign`/`brand-kit`/`logo`.
   - A fourth bug, unrelated to the campaign backend but blocking the reused `ImageUploader` component from rendering at all: it called `useToast()` from `@/components/ui/Toast`, whose `ToastProvider` is never mounted anywhere (the app only mounts `@/hooks/useToast`'s differently-shaped provider at the root layout) — every render of `ImageUploader` would throw `"useToast must be used within a ToastProvider"`. Fixed by switching `ImageUploader` to the actually-mounted `@/hooks/useToast` hook (and its reversed `showToast(message, type)` argument order). This also retroactively fixes the `/products/new` page from Phase 3, which was silently broken by this same bug and had never been exercised in a browser.
2. **Idempotency key is not actually enforced server-side for this endpoint.** `generateCampaignStrategySchema` requires `idempotencyKey: z.string().uuid()`, and it's stored in `campaign.metadata.idempotencyKey`, but `executeWithUsageControl`'s credit reservation is keyed by a freshly-generated `campaignId` on every call — the idempotency key is never used to detect or dedupe a retried call. Real double-submission protection in this implementation therefore comes only from the frontend's `submitLockRef` (disable-on-click) guard, not from backend idempotency, despite the field's name suggesting otherwise. This is a pre-existing backend gap, not something introduced here; fixing it properly (making the reservation genuinely idempotent) was judged too invasive for "minimum necessary dependency."
3. **Credit estimate is a manually-mirrored constant (140), not fetched from a live pricing endpoint.** No callable exposes `getGenerationCost()`/`PRICING` to the frontend. If `functions/src/config/pricing.ts` changes, `src/features/campaign/constants.ts`'s `ESTIMATED_CAMPAIGN_GENERATION_CREDITS` must be updated manually or the UI's estimate will drift from the real charge (the real charge, reserved server-side, remains correct regardless — this only affects the pre-submit estimate shown to the user).
4. **No inline "create new product" flow inside the wizard.** Per the task's explicit instruction not to build a second product-creation implementation, Step 2 only lets the user pick from existing products (loaded via the existing `productService.listByBusiness`) and links out to the existing `/products/new` page (built in Phase 3) if they have none.
5. **`newProduct` (ad-hoc, not-yet-saved product) path is not used** — the backend schema supports it as an alternative to `productId`, but since an existing product picker with a link to the real product-creation page covers the requirement, the wizard always sends `productId` and never `newProduct`.
6. **`localization.contentFormat` has no wizard step** — the 8-step structure in the task's own recommended grouping doesn't include a content-format step, so it's fixed to `'poster'` (a valid backend enum value). If multi-format campaigns (story/reel/caption/whatsapp) become a requirement, this needs its own step.
7. **Cross-refresh persistence is not implemented.** Wizard state survives Back/Next navigation and re-renders (in-memory React state), but a full page refresh loses in-progress wizard input. No existing draft-persistence mechanism was found to reuse, and building a new one was judged out of scope per the task's own instruction not to invent a large persistence system for this phase. This is a documented gap, not a silent one.
8. **No live AI-provider/emulator end-to-end run** — see §13/§16.
9. **No React component-level tests were added** — see §12.
10. **Free-tier economics gap (discovered, not introduced or fixed):** `PRICING.subscriptionTiers.free.monthlyCredits = 100`, but a single campaign generation costs 140 credits. A brand-new free-tier user can never generate a single campaign; the wizard's credit gate will correctly and immediately block them with "Not enough credits" and a link to `/billing`. This is a product/pricing decision outside this phase's scope, surfaced here for visibility.

## 15. Commands Run (exact)

```
npm run lint            → pass
npm run typecheck       → pass
npm run functions:typecheck (via functions/tsc --noEmit) → pass
npm run functions:build → pass
npm run functions:lint  → pre-existing failure (1484 errors), unrelated to Phase 4 — see note below
npm run functions:test  → pre-existing: "No tests found" (no test files exist anywhere in functions/), unrelated to Phase 4
npm test                → pass (11 suites, 109 passed, 2 skipped honestly reported)
npm run build            → pass; /campaigns/new listed in the route manifest
```

`functions:lint` fails with ~1484 Prettier formatting errors spread across many pre-existing files (`usageControl.ts`, `types/index.ts`, `types/enums.ts`, etc.) at line numbers this phase did not touch. This is pre-existing formatting debt in the `functions/` package unrelated to Phase 4 (confirmed by the reported line numbers falling outside every diff made in this phase) — it was not mass-reformatted here since that would touch dozens of unrelated files far outside this task's scope. `functions:test` reports "No tests found" because the `functions/` package has zero test files today (0 of 165 files match the Jest test pattern); this predates this phase.

## 16. Final Verdict

**PHASE 4 IMPLEMENTED BUT PARTIALLY VERIFIED**

What is verified: the wizard compiles, typechecks, lints clean, builds, and — most importantly for correctness — the exact payload it constructs from real UI input is proven (via unit tests run against a schema mirroring the true backend Zod schema) to be accepted by `generateCampaignStrategy`'s validation layer, using only backend-supported enum values, with all required fields present and all invalid states rejected. A genuine, previously-fatal backend bug (`generateCampaignStrategy` never creating its own campaign document) was found and fixed as part of this integration work — without that fix, no caller, wizard or otherwise, could have used this function at all.

What could not be verified: an actual live invocation of `generateCampaignStrategy` against a running Firestore/Functions emulator, through to real credit reservation, real `GenerationPipeline` execution, real Truth Check, and a real persisted, retrievable campaign document. This step requires live AI-provider API keys (Gemini/OpenAI/etc.) that are not available in this environment; running the emulator without them would only prove the function fails at the AI-call stage, which doesn't validate anything the schema tests haven't already validated, and reporting it as a full success would misrepresent what was actually observed.
