# Phase 8 — Campaign Review (Priority P1)

## Objective

Replace the raw JSON display in the customer-facing Campaign Review page
(`/campaigns/[campaignId]`) with a polished, readable marketing-content
review experience, without rebuilding any existing backend system
(AI generation pipeline, Truth Check, download, WhatsApp, or regeneration).
The existing backend remains authoritative; this phase is purely
EXISTING CAMPAIGN DATA → CUSTOMER-FACING REVIEW UI.

No `/docs/*.md` source-of-truth document existed for this phase before
this report (consistent with every prior phase in this repository) — the
task prompt itself was used as the closest available specification.

## Initial State

`src/components/campaign/CampaignDetailContent.tsx` rendered generated
assets largely as raw `JSON.stringify(asset.content)` inside tabs, with no
per-asset-type formatting. A restaurant/salon owner would have seen raw
key/value JSON for headlines, captions, WhatsApp messages, story/reel
concepts. `src/app/campaigns/[campaignId]/page.tsx` passed an `activeTab`
prop into a tabbed layout around that raw display.

## Implementation

`CampaignDetailContent.tsx` was rewritten to derive typed views from the
existing `CampaignAsset[]` array (grouped by `asset.type`) and the existing
`Campaign.offer`/`Campaign.metadata` fields, and render each with a
dedicated `SectionCard`. No new AI pipeline, Truth Check system, download
system, WhatsApp system, or regeneration system was created — all actions
call the pre-existing `useRegenerateAsset`, `useCopyToClipboard`, and inline
fetch/blob download logic that already existed in the project.

`src/app/campaigns/[campaignId]/page.tsx` was simplified: it no longer owns
tab state, and now distinguishes three load states (loading / network error
/ not-found-or-unauthorized) before rendering `CampaignDetailContent`.

**Bug fixed as a byproduct of correct data mapping:** the deterministic
reel-storyboard asset created in `functions/src/services/ai/pipeline.ts`
used `assetId: 'asset_reel_0'`, colliding with the AI-written
`copyPack.reelConcepts[0]`-based asset, which also used `asset_reel_0`.
Since asset persistence is one Firestore document per `assetId`, this
collision silently overwrote the AI-written reel concept with the
storyboard. Renamed to `asset_reel_storyboard`.

**Bug found via mandatory browser validation (see Browser Testing
below):** `src/hooks/useRegenerateAsset.ts` threw synchronously inside a
`useMemo` when `getFirebaseFunctions()` returned `undefined`. Since Firebase
is only initialized client-side (`typeof window === 'undefined'` guards it
in `src/lib/firebase/client.ts`), this is *always* true during Next.js
server-side rendering — meaning any page mounting this hook 500'd on its
initial server-rendered response, only recovering after client-side
hydration re-ran the hook in the browser. Fixed by moving the guard out of
the `useMemo` (no throw) and into the `regenerateAsset` callback, so it only
surfaces as a user-facing toast when regeneration is actually invoked
without a Functions instance available — not during render/SSR. This is a
minimal fix to the existing hook, not a new regeneration system.

## Data Mapping

| UI Section | Source |
|---|---|
| Headlines | `assets` where `type === 'headline'`, `content: {text, characterCount, variant}` |
| Caption | `assets` where `type === 'caption'`, `content: {text, hashtags[]}` |
| Offer | `campaign.offer` directly (headline, price, originalPrice, description, terms, validityStart/End, `campaign.cta`) |
| WhatsApp Message | `assets` where `type === 'whatsapp'`, `content: {message, waLink}` |
| Story | `assets` where `type === 'story'` and `content.frames` present (concept); separately, `type === 'story'` assets with `imageUrl` (frame images, shown in Creative) |
| Reel Concept | `assets` where `type === 'reel'` and `content.hook` present |
| Creative | poster assets, story-frame image assets, and the `asset_reel_storyboard` asset — all identified by `imageUrl` presence |
| Truth Check | `truthCheckStatus` prop, sourced by the page from `campaign.metadata.truthCheckStatus` only |

Assets with `status === 'superseded'` are filtered out everywhere so a
prior (replaced) generation never displays alongside its replacement.

## Sections

All eight required sections (Headlines, Caption, Offer, WhatsApp Message,
Story, Reel Concept, Creative, Truth Check) render as formatted text/image
content, never as JSON. Each uses an `EmptyHint` fallback (plain sentence,
not `null`/`undefined`/`{}`/`[]`) when its underlying asset type is absent.

## Actions

- **Download** — per-creative-image download (existing fetch → blob →
  `createObjectURL` → anchor-click logic, unchanged) and a "Download
  Campaign" action that assembles all readable sections into one `.txt`
  file (existing logic, unchanged).
- **Share on WhatsApp** — reuses `whatsappAsset.content.waLink` when
  present, falling back to `wa.me/?text=` with the message; opens via
  `window.open(..., '_blank', 'noopener,noreferrer')`.
- **Regenerate** — calls the existing `useRegenerateAsset` hook
  unchanged in its network-call semantics (only its render-time guard was
  fixed, see Implementation). A single shared `isRegenerating` key still
  prevents concurrent duplicate requests.

## Security

The Truth Check badge is driven exclusively by the `truthCheckStatus` prop,
which the page derives from `campaign.metadata.truthCheckStatus` — a
backend-written, persisted field. No client-side logic computes or infers a
"verified" state. `TRUTH_CHECK_DISPLAY` only ever shows "🟢 Verified" when
the prop is literally `'PASS'`; `'FAIL'` and `'REVIEW_REQUIRED'` map to
distinct, never-"Verified" labels/colors. Confirmed by an automated test
(`never shows "Verified" for a FAIL truthCheckStatus`,
`shows "Needs Review" — not "Verified" — for REVIEW_REQUIRED`) and by
browser inspection of the rendered badge for a `PASS` fixture.

## Authorization

No new authorization logic was added. `ProtectedRoute` (from
`src/app/campaigns/layout.tsx`, Phase 4) already wraps every
`/campaigns/*` route and redirects unauthenticated users. Firestore
security rules (`firestore.rules`, Phase 6) already restrict campaign reads
to the owning `userId`/`businessId`/agency member. The not-found and
unauthorized cases in `page.tsx` are deliberately rendered with the same
generic "Campaign not found" message, to avoid leaking which case applies
(no enumeration of valid campaign IDs).

## Failed Regeneration Protection

`useRegenerateAsset`'s `isRegenerating` state disables the clicked button
during a request; on failure the hook shows an error toast and returns
`null` without touching the asset list passed into `CampaignDetailContent`
— the previously rendered (valid) asset content is never replaced by a
failed or partial regeneration result. Verified in the browser: clicking
Regenerate with no authenticated user present triggered the "Please sign in
to regenerate assets" toast without any change to the still-rendered
headline text, and with no console error or crash.

## Responsive Testing

Verified via real headless-Chromium screenshots (see Browser Testing) at:
- **Desktop** — 1440×900. Two-column Creative grid, all sections stacked
  single-column below, buttons and text fully legible.
- **Mobile** — 390×844. Single-column throughout, no horizontal overflow,
  all copy/regenerate/download buttons remain tappable and legible.

## Automated Tests

`src/components/campaign/CampaignDetailContent.test.tsx` — 15 tests, all
passing:
- Headline, caption + hashtags, offer, WhatsApp message + Share button,
  story-concept frames individually, reel-concept hook/scenes/cta, and
  creative images (as real `<img>` elements, not `storagePath` strings) all
  render as readable text/markup.
- Truth Check badge shows "Verified" only for `PASS`; never for `FAIL`;
  shows "Needs Review" (not "Verified") for `REVIEW_REQUIRED`.
- No raw JSON is ever rendered — no `<pre>` element, no `{"text":`-shaped
  text anywhere in the DOM.
- Missing asset types degrade to a plain-sentence empty state, not
  `undefined`/`null`/`{}`/`[]`.
- `superseded` assets are excluded from every section.
- Regenerate calls the hook with the correct
  `{campaignId, assetId, assetType}`, and its button disables while
  `isAssetRegenerating` is true.

Fixed three pre-existing test-infrastructure gaps while adding this file
(this was the first `.tsx` component test in the project):
- `jest.config.js`'s `ts-jest` transform used the root `tsconfig.json`
  (`jsx: "preserve"`, meant for Next.js's own SWC compiler), which ts-jest
  cannot execute. Added `tsconfig.jest.json` (extends the root config,
  overrides `jsx: "react-jsx"`) and pointed the transform at it.
- `@testing-library/dom` and `@testing-library/user-event` were never
  actually installed despite `@testing-library/react` depending on the
  former as a peer. Installed both (`--legacy-peer-deps`, required by a
  pre-existing, unrelated `@firebase/rules-unit-testing` vs `firebase` v10
  peer conflict already present in the project).
- jsdom's `window.crypto` lacks `randomUUID` (used for the regenerate
  idempotency key). Added a polyfill in `tests/setup.ts` backed by Node's
  `crypto.randomUUID`.

Full suite: **12 test suites, 129 passed, 2 skipped (Firestore/Storage
emulator-gated tests, skip the same way in every prior phase since no
emulator is running here), 0 failed.**

## Browser Testing

Performed for real, not claimed without evidence. No `.env.local` exists in
this repository (consistent with every prior phase), so the entire app —
not just this page — crashes with `Firebase: Error (auth/invalid-api-key)`
at even the home route (`/`) when Firebase env vars are undefined. A
temporary, git-ignored `.env.local` with a well-formed dummy Firebase config
(no real project, no network calls made) was created solely to let
`getAuth()`/`getFunctions()` initialize without throwing, restarted the dev
server, then deleted before finishing. `chromium-cli` was not present in
this environment; a small `puppeteer-core` driver (installed to a scratch
directory, not the repo) pointed at the machine's existing
`C:\Program Files\Google\Chrome\Application\chrome.exe` was used instead,
following the same drive-and-screenshot pattern.

A temporary route (`src/app/devpreview-campaign-review/page.tsx`, deleted
after validation, never committed) rendered the real
`CampaignDetailContent` component with a realistic fixture `Campaign` +
`CampaignAsset[]` (matching real `CopyPackSchema`/pipeline output shapes,
including inline SVG data-URI images standing in for Phase 7's compositor
output).

Findings, in order:
1. First load attempt hit a Next.js routing convention: a folder prefixed
   with `_` (`_dev-preview`) is a private folder excluded from routing in
   the App Router, producing a 404. Renamed to a non-prefixed path.
2. With a valid dummy Firebase config, the page's **initial HTML response
   was a 500** due to the `useRegenerateAsset` SSR bug described above
   (confirmed independently by hitting `/` directly, which crashed
   identically before the fix — this was not specific to this page or this
   phase's new code). Fixed in `useRegenerateAsset.ts`.
3. After the fix, `curl -o /dev/null -w '%{http_code}'` returned `200`, and
   headless-Chromium loaded the page with **zero console/page errors**.
4. Full-page screenshots at 1440×900 (desktop) and 390×844 (mobile)
   confirmed every required section (Headlines, Caption, Offer, WhatsApp
   Message, Story, Reel Concept, Creative, Truth Check) rendered as
   formatted text/images — programmatic checks confirmed no `<pre>` element
   and no `{"key":`-shaped text anywhere in `document.body.innerText`.
5. The screenshots also revealed a **real CSS bug**: the Creative section's
   per-image label overlay used `absolute right-0 bottom-0 left-0` inside a
   container that also held the Download/Regenerate button row below it —
   so the label rendered pinned to the bottom of the whole card, visually
   overlapping the buttons ("Poster 1Download" concatenated on screen)
   instead of sitting on the image. Fixed by nesting the label inside the
   same `relative`-positioned image wrapper instead of a sibling of the
   button row. Re-screenshotted and confirmed clean separation.
6. Interaction testing via real clicks (not simulated events):
   - **Copy** — clicking a headline's Copy button showed "Copied!" inline
     and a "Copied to clipboard!" toast.
   - **Regenerate** — clicking (with no authenticated user in the fixture,
     as expected in this environment) correctly triggered the "please sign
     in" error path without crashing and without altering the still-shown
     headline content.
   - **Download** (per-image) — clicking the Poster's Download button
     produced an actual downloaded file on disk
     (`Weekend_Biryani_Special_Poster_1.png`, confirmed via Chrome DevTools
     Protocol `Browser.downloadWillBegin`/`downloadProgress` events
     reaching `completed`), plus a success toast.
   - **Download Campaign** — produced a real `.txt` file on disk; its
     contents were read back and confirmed to be fully human-readable
     prose/sections, no JSON.
   - **Share on WhatsApp** — `window.open` was called with
     `https://wa.me/919876543210?text=...`, matching the fixture's
     `waLink`.
   - No console or page errors were observed during any of the above.

## Files Changed

- `src/components/campaign/CampaignDetailContent.tsx` — rewritten for
  readable, typed rendering; Creative-section overlay/button layout bug
  fixed.
- `src/app/campaigns/[campaignId]/page.tsx` — simplified load-state
  handling, removed tab state.
- `functions/src/services/ai/pipeline.ts` — fixed `asset_reel_0` /
  `asset_reel_storyboard` assetId collision.
- `src/hooks/useRegenerateAsset.ts` — fixed SSR-crashing `useMemo` throw
  (found via mandatory browser validation).
- `src/components/campaign/CampaignDetailContent.test.tsx` — new, 15 tests.
- `jest.config.js`, `tsconfig.jest.json` (new), `tests/setup.ts`,
  `package.json` — test-infrastructure fixes needed to run the above.

No files were shipped from the temporary browser-validation scaffolding:
`src/app/devpreview-campaign-review/` and the temporary `.env.local` were
both deleted before this report was written; `git status` confirms neither
is present.

## Remaining Issues

- No real AI-provider credentials exist in this environment (no
  `.env`/`.env.local` committed, `GEMINI_API_KEY`/`OPENAI_API_KEY` unset),
  so an actual end-to-end campaign generated by the real pipeline was never
  loaded through this UI — only a realistic fixture matching the documented
  `CopyPackSchema`/asset shapes. Firestore/Storage security-rule tests
  remain emulator-gated and skip in this environment, same as every prior
  phase.
- The successful Regenerate/Download/WhatsApp interactions were exercised
  against fixture data with no authenticated user, so the actual
  `regenerateAsset` Cloud Function call path (network request, credit
  deduction, real Truth Check re-run) was not exercised end-to-end in the
  browser — only the hook's client-side guard/error-toast behavior was.
  This mirrors the same authentication/emulator gap noted in Phases 4-7.

## Final Verdict

**PHASE 8 IMPLEMENTED BUT PARTIALLY VERIFIED**

Implementation is complete and matches every required section, action, and
security constraint in the spec. Lint, typecheck, unit tests (129 passing),
and both app and functions builds are all clean. Mandatory browser
validation was actually performed (not claimed without testing) using a
headless-Chromium driver against a realistic fixture, at both desktop and
mobile widths, with real click-driven interactions — and it surfaced two
genuine bugs (the `useRegenerateAsset` SSR crash and the Creative-section
label/button overlap), both fixed and re-verified with fresh screenshots.
It is marked partial rather than fully verified because the browser
validation was against fixture data, not a real end-to-end campaign
generated and regenerated through live Firebase/AI-provider credentials,
which remain unavailable in this environment.
