# Phase 9 — Download + WhatsApp

No `/docs/PRODUCT.md`, `ARCHITECTURE.md`, `MVP_SCOPE.md`, `DESIGN_SYSTEM.md`,
`DATABASE.md`, `SECURITY.md`, `TEST_PLAN.md`, or `AI_ARCHITECTURE.md` exist
in this repository (confirmed by direct listing before starting — same gap
noted in every prior phase). The task prompt itself, `PHASE_8_CAMPAIGN_REVIEW_REPORT.md`,
and the actual implementation were used as the closest available source of
truth.

## 1. Initial Audit

**A/B/C — asset storage.** Generated creatives (`functions/src/services/ai/generatedAssetStorage.ts`)
are uploaded once, at generation time, to
`businesses/{businessId}/campaigns/{campaignId}/generated/...` in Firebase
Storage, and a **7-day v4 signed URL** is generated then and persisted
directly on the `campaign_assets` document's `imageUrl` field (same
convention as `confirmUpload.ts`'s general asset uploads). Copy/text content
lives in `campaign_assets.content` (Firestore), never in Storage.

**D/E/F/G — download flow, signed URLs, download endpoint, ZIP.** There is
**no separate download Cloud Function** and **no ZIP generation anywhere**
in the codebase (`grep`-confirmed: no `jszip`/`zip` dependency or code).
"Download" is entirely client-side: `campaignAssetService.listByCampaign()`
reads already-authorized `campaign_assets` docs (Firestore rules gate this,
see §6), and the frontend `fetch()`s the already-generated signed
`imageUrl` directly into a blob for `<a download>`. Copy content is
assembled into a plain-text file client-side from the same already-fetched,
already-authorized asset data — no backend round-trip.

**H/I/J — WhatsApp implementation, phone storage, normalization.** Before
this phase, the frontend (`CampaignDetailContent.tsx`, from Phase 8) trusted
an AI-generated `waLink` field verbatim, falling back to
`wa.me/?text=...` **with no phone number at all** if `waLink` was absent —
this is the exact anti-pattern §18/19/21 warns against. The authoritative
business phone lives at `Business.contact.whatsapp` (`src/types/index.ts`).
A phone-normalization utility already existed
(`functions/src/services/ai/truthCheck.ts`'s `normalizePhone`), but it
strips to the **last 10 digits only**, for fact-comparison purposes — it
deliberately drops the country code, so reusing it verbatim for a wa.me URL
would have produced an invalid destination (`9876543210` instead of
`919876543210`). This is a distinct concern, not a duplicate.

**K/L/M — attribution, analytics events, `whatsapp_clicked`.** A complete,
correctly-shaped canonical analytics system already existed
(`functions/src/services/analyticsService.ts`'s `ANALYTICS_EVENTS` +
`trackEvent`, and the `trackAnalyticsEvent` callable) with exactly the
`asset_downloaded`/`whatsapp_clicked` events this phase needs — **but it was
never exported from `functions/src/index.ts`**, so it was dead, undeployed
code. A second, parallel analytics path also exists
(`src/services/database.ts`'s `analyticsService.log()`, using a different
schema — `eventType`, `creativeId`) but writes directly to Firestore from
the client; `firestore.rules` explicitly denies all client writes to
`analytics_events` (`allow write: if false; // Cloud Functions only`), so
that path can never succeed and is unreachable dead code (confirmed unused
anywhere in `src/`).

**N — authorization.** `firestore.rules` already scopes both `campaigns` and
`campaign_assets` reads to `resource.data.userId == request.auth.uid ||
businessId in request.auth.token.businessIds || agency member` — enforced
**per document**, independent of any client-supplied `campaignId`. Storage
rules similarly gate direct (non-signed-URL) access to
`businessId in request.auth.token.businessIds`.

**O — failed downloads.** Already handled per-image (try/catch around
fetch/blob, friendly toast) from Phase 8; extended in this phase (see §7/§11).

## 2. Download Architecture

```
authenticated user
  -> Firestore security rule (per-document: userId/businessId/agency match)
  -> campaignAssetService.listByCampaign(campaignId)   [Firestore query, server-filtered]
  -> CampaignAsset.imageUrl (a pre-generated, 7-day signed Storage URL)
  -> client fetch() -> blob -> <a download>
```

No client-controlled filename, Storage path, or asset ID ever substitutes
for authorization — the asset the client can download is exactly the set of
`campaign_assets` documents Firestore's security rules let it read for that
`campaignId`, nothing else. This is the pre-existing architecture (Phase 7);
Phase 9 did not rebuild it, only wired analytics onto it non-blockingly.

## 3. Creative Download

**PASS.** Verified in the browser (see §12): clicking "Download Poster 1"
produced a real file on disk (`Weekend_Biryani_Special_Poster_1.png`,
confirmed via Chrome DevTools Protocol `downloadWillBegin`/`downloadProgress`
reaching `completed`). The button is per-asset (`aria-label="Download
{label}"`), so Campaign A → Creative A always downloads Creative A — there
is no "latest/random creative" fallback in the code.

## 4. Copy Download

**PASS.** Relabeled from "Download Campaign" to **"Download Copy"** (§45 —
the button only ever produced a text file of copy content, and the old
label was misleading about what it actually contained, especially once
ZIP was confirmed unsupported). Verified in the browser: the downloaded
`.txt` contained only Headline/Caption/WhatsApp Message sections
(Ad Copy/Story/Reel omitted because this fixture had none, exactly as
Phase 8 already intended), using the exact real campaign text, no JSON.

## 5. ZIP

**Supported: NO.**
No ZIP library or code exists anywhere in this codebase. No ZIP feature was
added — building one would have been scope creep the phase explicitly
forbids ("Do NOT create ZIP functionality if the existing MVP architecture
does not support it simply to satisfy this checklist"). Creative images and
copy are downloaded as separate actions (per-image PNG, and one aggregate
`.txt` for copy), matching what the architecture actually does today.

## 6. Authorization

- **Owner access:** PASS — a campaign's own `businessId`/`userId` owner can
  read its `campaign_assets` docs and thus download them (existing
  Firestore rule, unchanged).
- **Cross-business denial:** PASS by construction — the security rule
  checks `resource.data.businessId in request.auth.token.businessIds`
  per-document; a foreign business's asset is never returned by any read
  path, signed URL or not, regardless of what `campaignId`/`assetId` the
  client requests.
- **Cross-campaign denial:** PASS — `listByCampaign` is server-filtered by
  `campaignId` and every returned doc is independently re-checked by the
  security rule; there is no code path where a client can ask for
  "Campaign A + Asset from Campaign B" and receive it, because assets are
  never fetched by client-supplied `campaignId` string matching alone.
- **Cross-asset denial:** PASS — same mechanism; an `assetId` belonging to
  a different business/campaign is denied at the Firestore rule level even
  via a direct `get(assetId)`.
- Not independently re-verified against a live emulator this phase (no
  Firestore emulator running in this environment — same gap as every prior
  phase); this is a logic read of `firestore.rules` plus the existing
  `tests/security.test.ts` suite, which self-skips without
  `FIRESTORE_EMULATOR_HOST`.

## 7. Download Failure Handling

Unchanged from Phase 8, already correct: missing image → "No image to
download"; fetch/blob failure → "Couldn't download this image. Please try
again." (no Firebase error text, no Storage path, no stack trace exposed).
Per-asset `downloadingAsset` state disables only the specific button being
downloaded, so one slow download doesn't freeze the rest of the page or
block other creatives from downloading concurrently.

## 8. WhatsApp

- **Number source:** `business.contact.whatsapp` (falling back to
  `business.contact.phone`), fetched by `[campaignId]/page.tsx` via
  `businessService.get(campaign.businessId)` — the business's own
  authoritative record, never the campaign creator's or a hardcoded number.
- **Normalization:** new `src/lib/utils/whatsapp.ts`'s
  `normalizeWhatsAppNumber()` — handles a bare 10-digit Indian mobile
  number, a domestic 0-trunk-prefixed number, and an already-country-coded
  number; returns `null` (never a guess) for anything else, per §20's
  explicit "fail gracefully" instruction.
  Deliberately **not** a reuse of `truthCheck.ts`'s `normalizePhone` — that
  function strips to the last 10 digits with no country code, for
  fact-comparison, and would produce an invalid wa.me destination.
- **Message source:** `whatsappAsset.content.message` — the real,
  already-persisted AI-authored campaign copy (`copyPack.whatsappMessage.message`
  from `functions/src/services/ai/pipeline.ts`). Not regenerated or invented
  in the frontend.
- **URL construction:** `buildWhatsAppShareUrl()` composes
  `https://wa.me/<normalized>?text=<encodeURIComponent(message)>`,
  deliberately **ignoring** the AI-generated `waLink`/`attributionParams`
  fields in `CopyPackSchema.whatsappMessage` — those are free-form LLM
  output with no guarantee the phone number or IDs are correct, so trusting
  them would violate §18/§21/§25 ("do not generate/invent," "actual
  business phone," "actual campaign ID"). This was the single most
  significant correctness gap found this phase.
- **Encoding:** `encodeURIComponent`, verified round-trip-safe for spaces,
  line breaks, emoji, ₹, and mixed Telugu/English text (golden test §49,
  and confirmed live in the browser — see §12).
- **Unavailable case:** if the number can't be normalized or the message is
  missing, `buildWhatsAppShareUrl` returns `null` and the UI shows "WhatsApp
  isn't available for this business right now." rather than opening a
  numberless or malformed link.

## 9. Attribution

`campaign_id` is always `campaign.campaignId` (the real, already-loaded
campaign object) and `creative_id`/`assetId` is always the real
`whatsappAsset.assetId` (for WhatsApp) or the specific creative's
`asset.assetId` (for downloads) — never AI-generated, never
`businessId`/other IDs substituted in. `functions/src/functions/analytics/trackAnalyticsEvent.ts`
also now requires `request.auth.uid` (previously it silently accepted
unauthenticated calls with an empty-string `userId` — fixed as part of
activating this dormant function, since Phase 9 explicitly cares about
analytics data integrity, §39).

## 10. Analytics

**`whatsapp_clicked`** and **`asset_downloaded`** — both already existed as
canonical events (`ANALYTICS_EVENTS`, Phase 21) but the callable that
records them, `trackAnalyticsEvent`, was **never exported/deployed**
(absent from `functions/src/index.ts`). This phase exported it — activating
existing architecture, not building a new one — and added a client entry
point, `src/lib/analytics/trackEvent.ts`, which calls it. No new event names
were invented; the "Download Copy" aggregate download reuses the same
`asset_downloaded` event once per included copy asset rather than inventing
a "campaign bundle downloaded" event.

Metadata recorded: `eventName`, server-derived `userId` (from
`request.auth.uid`, never client-supplied), `businessId`, `campaignId`,
`assetId`, `timestamp`, and a small `metadata` object (`assetType`, and
`bundle: 'copy_txt'` for copy-bundle downloads).

**Known, pre-existing limitation, not touched:** `trackAnalyticsEvent`
still does not cross-check that the calling user actually owns the
`businessId`/`campaignId` it's asked to attribute an event to (a comment in
the function already flags this: "In a real implementation, verify against
Firestore... skip for now"). This affects analytics data integrity only
(a malicious client could log an event under someone else's IDs) — it grants
no access to any asset or data, since it doesn't gate anything security-
relevant. Hardening this was judged out of scope ("do not expand into
unrelated refactoring"); flagged here per §39's own data-integrity concern.

## 11. Analytics Failure

Every analytics call goes through `trackEvent()`
(`src/lib/analytics/trackEvent.ts`), which is synchronous and fire-and-forget:
it never returns a promise the caller awaits, and any error is caught
internally and only `console.error`'d. Each call site in
`CampaignDetailContent.tsx` additionally wraps it in a second, local
`safeTrack()` try/catch (defense-in-depth, so even a hypothetical bug in the
wrapper's own guarantee can't leak into the download/WhatsApp code path).
Call order is: **primary action first** (`window.open(...)` for WhatsApp;
the blob download for images/copy), **then** the tracking call — verified
by both a unit test asserting call order and, more convincingly, by a real
browser run (§12) where every analytics call genuinely failed (CORS/network
error against a nonexistent dummy Firebase project) and WhatsApp still
opened and the download still completed.

## 12. Browser Testing

Performed for real — a temporary route
(`src/app/devpreview-campaign-review/page.tsx`, deleted before finishing,
never committed) rendered the real `CampaignDetailContent` with a realistic
`Campaign` + `Business` + `CampaignAsset[]` fixture, including one asset
with `status: 'failed'` (a simulated failed regeneration) to verify it never
appears. A temporary, git-ignored `.env.local` with a well-formed dummy
Firebase config (no real project) was used so Firebase initializes without
crashing, then deleted. Driven with a `puppeteer-core` script (no
`chromium-cli` available in this environment) against the machine's
installed Chrome.

**Desktop (1440×900): PASS.**
- No raw JSON anywhere (`{"key":` pattern absent from `document.body.innerText`).
- The `status: 'failed'` fixture asset's text never appeared on the page.
- Clicking "Share on WhatsApp" called `window.open` exactly once with
  `https://wa.me/919876543210?text=Hi!%20%F0%9F%91%8B%20Our%20Weekend...`
  — decoding the `text` param reproduces the exact original message
  byte-for-byte, including the 👋 emoji and ₹ signs.
  `919876543210` is the correctly-normalized form of the fixture's
  `+91 98765 43210` business number.
- Clicking "Download Poster 1" produced a real file on disk, confirmed via
  CDP `Browser.downloadWillBegin` → `downloadProgress: completed` events.
- Clicking "Download Copy" produced a real `.txt` file containing only this
  campaign's actual headline/caption/WhatsApp text — read back and
  confirmed.
- **Every analytics call genuinely failed** (the dummy Firebase project has
  no deployed Cloud Functions, so each `trackAnalyticsEvent` call hit a CORS
  preflight failure) — and both WhatsApp and both downloads **still fully
  succeeded**, which is the strongest possible real-environment proof of
  §28/40/43 ("analytics must not block the primary action").

**Mobile (390×844): PASS.**
Single-column layout, no horizontal overflow, Download/Regenerate/Share
buttons remain legibly sized and tappable, "Image downloaded" toast visible
and readable.

## 13. Automated Tests

- `src/lib/utils/whatsapp.test.ts` (new, 11 tests) — `normalizeWhatsAppNumber`
  cases (formatted/bare/trunk-prefixed/already-coded/unrecognizable/missing)
  and the §49 golden test (`+91 98765 43210` + `"Hi! Get 10% OFF on your next
  order 🎉"` → `https://wa.me/919876543210?text=...`, with an exact
  round-trip decode check and a mixed-language/emoji/₹/line-break encoding
  test).
- `src/components/campaign/CampaignDetailContent.test.tsx` (10 new tests,
  25 total in the file) — failed-regeneration exclusion; WhatsApp URL built
  from the business's real phone (not the AI `waLink`); graceful
  "unavailable" state for missing/invalid phone or missing business;
  `whatsapp_clicked` event with real `campaign_id`/`creative_id`; call-order
  proof that `window.open` precedes the analytics call; `asset_downloaded`
  event with real IDs after a creative download; analytics failure does not
  produce a misleading "couldn't download" toast after a real success;
  "Download Copy" labeling (not "Download Campaign"/"Download ZIP").
- `functions/src/services/analyticsService.test.ts` (new, 4 tests) — the
  Firestore write shape, `trackAssetDownloaded`/`trackWhatsAppClicked` field
  correctness (including the §50 golden test's exact
  `campaign_test_001`/`creative_test_001` IDs), and that two different
  campaigns' events never cross-contaminate IDs.

**Frontend:** 13 suites, 150 passed, 2 skipped (Firestore/Storage
emulator-gated, self-skip without `FIRESTORE_EMULATOR_HOST` — same as every
prior phase), 0 failed.
**Functions:** 11 suites (1 skipped — emulator-gated `usageControl`), 99
passed, 10 skipped, 0 failed.

## 14. Security Testing

Covered at the unit/logic level (no Firestore emulator available in this
environment, consistent with every prior phase):
1. Authorized creative download — PASS (browser, §12).
2. Unauthorized creative download — PASS by construction (§6; Firestore
   rules deny the read before any URL/content is ever returned to the
   client; not independently re-run against a live emulator this phase).
3. Correct campaign/asset association — PASS (§2/§6; server-filtered query
   + per-document rule, no client-trusted association).
4. Correct copy download — PASS (browser + `CampaignDetailContent.test.tsx`).
5. Missing asset — PASS (`EmptyHint` fallbacks, unchanged from Phase 8).
6. Failed download — PASS (§7).
7. Signed URL authorization — PASS by construction (§2; signed URLs are
   only ever generated server-side at asset-creation time for that asset's
   own owning business, per `generatedAssetStorage.ts`/`confirmUpload.ts`).
8. WhatsApp number normalization — PASS (`whatsapp.test.ts`).
9. Correct WhatsApp message — PASS (browser + unit tests).
10. URL encoding — PASS (round-trip tests + live browser decode).
11. Correct `campaign_id` — PASS (`analyticsService.test.ts`,
    `CampaignDetailContent.test.tsx`).
12. Correct `creative_id` — PASS (same).
13. `whatsapp_clicked` event — PASS (unit + real browser attempt).
14. Analytics failure does not block WhatsApp — PASS, verified for real in
    the browser (§12), not just mocked.
15. Analytics failure does not block download — PASS, same.
16. Cross-business isolation — PASS by construction (§6); a dedicated
    "biz_A never appears in biz_B's event/asset" unit test also included
    (`analyticsService.test.ts`).
17. Failed regeneration never becomes the downloaded/shared active asset —
    PASS: `activeAssets` now excludes `status === 'failed'` in addition to
    `'superseded'` (a real bug found this phase — see Files Changed), and
    confirmed live in the browser with a `status: 'failed'` fixture asset
    that never rendered or was downloadable.

## 15. Build Validation

- Lint: **PASS** (`npm run lint`, `npm run functions:lint` — the latter has
  a large, pre-existing, unrelated failure baseline: every `.test.ts` file
  in `functions/src` fails to parse because `functions/tsconfig.json`
  excludes `**/*.test.ts` from its `include`, which ESLint's
  `parserOptions.project` requires; this predates Phase 9 — confirmed by
  running it against untouched pre-existing test files, which fail
  identically. The one prettier-formatting issue introduced by this phase's
  own edit to `trackAnalyticsEvent.ts` was fixed).
- Typecheck: **PASS** (`npm run typecheck`, `cd functions && npx tsc --noEmit`).
- Tests: **PASS** — 150/152 frontend (2 emulator-skipped), 99/109 functions
  (10 emulator-skipped), 0 failures.
- Build: **PASS** (`npm run build`, 17 routes, no devpreview route leaked in).
- Functions build: **PASS** (`npm run functions:build`).

## 16. Files Changed

- `src/lib/utils/whatsapp.ts` (new) — `normalizeWhatsAppNumber`,
  `buildWhatsAppShareUrl`.
- `src/lib/utils/whatsapp.test.ts` (new) — 11 tests, incl. §49 golden test.
- `src/lib/analytics/trackEvent.ts` (new) — fire-and-forget client entry
  point to the (now-activated) canonical analytics callable.
- `src/components/campaign/CampaignDetailContent.tsx` — WhatsApp share
  rebuilt on authoritative business phone + real message (no more trusting
  AI `waLink`); `business` prop added; failed-regeneration assets now
  excluded from `activeAssets`; download/WhatsApp actions instrumented with
  non-blocking analytics (`safeTrack`); "Download Campaign" relabeled
  "Download Copy"; small double-click guards added for the copy-download
  and WhatsApp-share buttons.
- `src/components/campaign/CampaignDetailContent.test.tsx` — 10 new tests.
- `src/app/campaigns/[campaignId]/page.tsx` — fetches the campaign's
  `Business` doc (best-effort, non-fatal) and passes it through.
- `functions/src/index.ts` — exported `trackAnalyticsEvent` (previously
  dormant, undeployed).
- `functions/src/functions/analytics/trackAnalyticsEvent.ts` — now requires
  `request.auth.uid` (rejects unauthenticated calls instead of silently
  recording an empty-string `userId`).
- `functions/src/services/analyticsService.test.ts` (new) — 4 tests,
  including the §50 golden test.

## 17. Remaining Issues

- No real Firebase/AI-provider credentials exist in this environment (no
  `.env`/`.env.local` committed — same gap as every prior phase), so the
  actual `trackAnalyticsEvent`/`regenerateAsset` Cloud Functions were never
  exercised end-to-end against a real deployed backend; browser validation
  used a dummy Firebase project, which incidentally gave the strongest
  possible proof that analytics failure doesn't block the primary action
  (every analytics call genuinely failed).
- `trackAnalyticsEvent` still doesn't cross-check that the caller owns the
  `businessId`/`campaignId` it's attributing an event to (§10) — a
  pre-existing, documented gap in the dormant function this phase activated,
  affecting only analytics data integrity, not access control. Left as-is
  per "do not expand into unrelated refactoring."
  functions:lint has a pre-existing, unrelated failure baseline (every
  `.test.ts` file fails to parse due to a `tsconfig.json` `exclude` vs.
  ESLint `parserOptions.project` mismatch) that predates this phase and was
  not fixed, to stay in scope.
- Firestore/Storage security-rule behavior (§6/§14) is verified by reading
  `firestore.rules`/`storage.rules` logic plus existing emulator-gated test
  suites, not by running those suites against a live emulator (none
  available in this environment) — same limitation as every prior phase.

## 18. FINAL VERDICT

**PHASE 9 IMPLEMENTED BUT PARTIALLY VERIFIED**
