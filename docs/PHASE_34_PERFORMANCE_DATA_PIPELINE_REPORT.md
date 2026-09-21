# Phase 34 — Performance Data Pipeline

## Step 1 — Forensic audit

**What does `whatsappClicks` mean?** A business owner's WhatsApp CTA button was clicked, opening a
pre-filled WhatsApp chat with the business's own number. **What does `inquiries` mean?** A customer
actually reached out (sent a message, made a call, submitted a form) — a materially different,
later event than clicking a link.

**Which user action generates each, and can the system observe it?**

- `whatsapp_clicked`: **Yes, directly observable.** The click handler
  (`CampaignDetailContent.tsx`'s `handleWhatsAppShare`) fires at the exact moment the button is
  pressed, before `window.open()`. This event already existed (Phase 9/21) and was already being
  recorded to `analytics_events` — but, confirmed by audit, with **no ownership verification**
  (the generic `trackAnalyticsEvent.ts` explicitly stubbed it out: *"For now, we'll skip the full
  verification to avoid type issues"*) and **no per-campaign aggregation anywhere** (Phase 32's
  dashboard only counts it as a business-wide daily total).
- `inquiries`: **Not observable by this system today.** Confirmed by audit: no WhatsApp Business
  API reply/read-receipt integration, no inbound webhook, no connected lead-capture form exists
  anywhere in `functions/src` or `src`. `inquiries` was never equated with `whatsapp_clicked` in
  this implementation, and downloads/generation events were never converted into it either.

**Can events reliably identify businessId/campaignId/assetId/channel?** businessId and campaignId:
yes, already passed by the existing call site. assetId: yes, when a WhatsApp asset exists. channel:
no — the existing event schema has no `channel` field at all (confirmed by audit); not fabricated
or invented here, simply not populated.

**Also confirmed by audit:** `BusinessBrain.campaignHistory[].performance` (the field named in the
phase brief) has **zero writers anywhere in the codebase** — it's initialized as an empty array at
business creation and never appended to. Building a second writer for a dead, array-based field
(with no creation path and no safe atomic-increment semantics for array elements) was rejected in
favor of a genuinely new, minimal, safe aggregate — see "Architecture decision" below.

Full findings: see the audit transcript folded into this report's design decisions throughout.

## Architecture decision: a new `campaign_performance/{campaignId}` record, not `campaignHistory`

`firestore.rules` already had an **unused, reserved rule stub** for `campaign_performance/{campaignId}`
(read gated on `campaigns/{campaignId}.userId`, write always `false`) with zero backing code —
found during the audit. This phase is the first to actually write to it, which is exactly the
"minimal schema extension" the brief asked to consider, using an existing schema convention rather
than inventing a new collection shape from scratch.

`campaignHistory[].performance` remains unwritten. It is **not** a duplicate source of truth for
the same data — it simply has no data in it, before or after this phase. `docs/PERFORMANCE_ENGINE.md`
documents this explicitly so a future phase doesn't assume it's populated.

`CampaignPerformance` (`functions/src/types/index.ts`):
```ts
{ campaignId, businessId, whatsappClicks: number, inquiries: number | null, updatedAt, lastEventAt? }
```

## What was built

### WhatsApp clicks — real, server-authoritative aggregation

- `functions/src/functions/analytics/recordWhatsAppClick.ts` (new Cloud Function) — the one write
  path for a real click. In order: **authenticate** (onCall requires `request.auth`), **authorize**
  (`verifyBusinessAccess`), **validate campaign association** (fetches the campaign; rejects if it
  doesn't exist or belongs to a different business — the exact gap the generic path had stubbed
  out), **idempotent record** (`withIdempotency`, keyed on `whatsapp_click_{campaignId}_{clickId}`,
  reusing the existing `idempotency_keys` middleware from Phase 12/13 verbatim), then **persist**:
  writes the same `analytics_events` document the Phase 32 dashboard already counts (via the
  existing `trackEvent()` helper — one event log, not two), and atomically increments
  `campaign_performance/{campaignId}.whatsappClicks` via `FieldValue.increment(1)` (server-applied,
  race-safe under concurrency without needing a transaction).
- `functions/src/functions/analytics/getCampaignPerformance.ts` (new Cloud Function) — the read
  side. Authorization + campaign-association-checked identically. Returns `whatsappClicks` as a
  real number (0 is a legitimate, known answer when no click has ever happened), and always returns
  `inquiries: null, inquiriesAvailable: false` — the frontend contract makes it structurally
  impossible to render a fabricated 0 for inquiries.
- `functions/src/services/firestore.ts` — added `getCampaignPerformanceDoc` and
  `incrementCampaignWhatsAppClicks` helpers.
- `functions/src/index.ts` — exports both new functions.

### Idempotency

The client (`CampaignDetailContent.tsx`'s `handleWhatsAppShare`) generates a fresh `clickId`
(`crypto.randomUUID()`) **once per real click**, at the moment the handler fires — not regenerated
on retry. `withIdempotency` guarantees:
- The same `clickId` sent twice (network retry, duplicated request, refresh replaying a pending
  call) → the second call is a no-op, returns the cached result, never increments again.
- A concurrent duplicate (two requests with the same key in flight at once) → the second is
  rejected with `aborted` rather than racing the increment.
- Two **separate**, genuine clicks (each with its own fresh `clickId`) → each counts, correctly.

### Truthfulness

- `whatsappClicks`: a real, known number, including a real, known **zero** — never "N/A" for this
  metric, because zero real clicks is itself a true fact the system can state.
- `inquiries`: always `null` / `inquiriesAvailable: false`, both in the Cloud Function response and
  in the new frontend Performance panel, which renders the literal text **"Not available"** — never
  `0`, never blank, never omitted-and-therefore-implicitly-zero.

### Frontend

- `src/lib/analytics/trackEvent.ts` — added `recordWhatsAppClick()`, a fire-and-forget wrapper
  around the new callable (same non-blocking guarantee as the existing `trackEvent()` — WhatsApp
  opens synchronously before this is even called, exactly preserving the pre-existing "analytics
  never gates the primary action" behavior proven by an existing Phase 9 test).
- `src/components/campaign/CampaignDetailContent.tsx` — `handleWhatsAppShare` now calls
  `recordWhatsAppClick` (with a fresh `clickId`) instead of the generic, unverified `trackEvent`
  call for this one event. A new **Performance** section (only rendered once real data has loaded —
  never a placeholder 0) shows `whatsappClicks` as a number and `inquiries` as "Not available" with
  a one-line explanation, fetched via the new `getCampaignPerformance` callable.
- `src/types/index.ts` was not changed for this — `CampaignPerformanceResult`'s shape lives in the
  Cloud Function's return type and the component's local state type; no new shared frontend type
  was needed.

### What was deliberately NOT done

- `inquiries` was not populated from any proxy signal. No webhook, API integration, or form exists
  to source it — per the brief, it stays `null`/unavailable rather than being estimated.
- The generic `trackAnalyticsEvent`'s ownership-verification stub for `asset_downloaded` was **not**
  touched — out of scope for this phase (which is about `whatsappClicks`/`inquiries` specifically);
  flagged below as a related, pre-existing gap for a future phase.
- `BusinessBrain.campaignHistory[].performance` was not retrofitted with a writer — see
  "Architecture decision" above.
- No cross-collection Firestore transaction was used for the event-write + increment pair; a
  single-document `FieldValue.increment` is already atomic at the document level, and the
  idempotency wrapper around the whole operation is what actually prevents double-counting — a
  transaction here would add complexity without adding correctness.

## Verification

### Tests (`functions/src/functions/analytics/recordWhatsAppClick.test.ts`, run against the
Firestore + Auth emulators, all passing)

| Required case | Test | Result |
|---|---|---|
| one click | "one click: a single real click is recorded and readable" | ✅ `whatsappClicks: 1` |
| duplicate click | "duplicate click: retrying the SAME clickId does not double-count" | ✅ stays `1` |
| multiple clicks | "multiple clicks: distinct genuine clicks each count" | ✅ `3` distinct clicks → `3` |
| wrong business | "wrong business: a campaign that does not belong to the given businessId is rejected" | ✅ rejected, count stays `0` |
| wrong campaign | (same test — a campaign is checked against the given businessId, not just existence) | ✅ covered |
| unauthorized event | "unauthorized event: a user who does not own the business cannot record a click for it" | ✅ rejected |
| missing campaign | "missing campaign: a campaignId that does not exist is rejected, not silently recorded" | ✅ rejected |
| missing data | "missing data: a request without a clickId is rejected by schema validation" | ✅ rejected |
| unknown inquiry | "unknown inquiry: inquiries is always null/unavailable — never 0, never derived from clicks" | ✅ 5 real clicks, `inquiries` still `null` |
| real inquiry source if one exists | **No real inquiry source exists anywhere in this codebase** (confirmed by audit) — this case is satisfied by proving the negative: the "unknown inquiry" test above proves the system never fabricates one even under real click volume. There is nothing to wire a positive test to. | ✅ (by audit + negative test) |
| cross-tenant read (added, not explicitly listed but the same class of risk) | "cross-tenant read: a user cannot read another business's campaign performance" | ✅ rejected |

10/10 tests passing.

### Frontend tests

- `src/components/campaign/CampaignDetailContent.test.tsx` — updated the two existing Phase 9 tests
  that asserted on the old `trackEvent`/`whatsapp_clicked` call to assert on the new
  `recordWhatsAppClick` call instead (same "opens WhatsApp before analytics, never blocks on it"
  guarantee, now proven against the new function). Added 4 new tests for the Performance panel:
  real click count rendering, "Not available" for inquiries (asserting the literal text, and that
  no stray `0` appears near "Inquiries"), a real known-zero click count rendering as `0` (not
  hidden), and the panel rendering nothing at all while the fetch is still pending (never a
  placeholder 0). **31/31 passing.**

### Regression suite

- Backend: `npm run typecheck` — clean. `npm run build` — clean. Full `npx jest --coverage=false`
  against the Firestore + Auth emulators — **32 suites, 254 tests, 0 failures.**
- Frontend: `npx tsc --noEmit` — clean. `npx next build --no-lint` — compiles;
  `/campaigns/[campaignId]` grew from 20.1 kB to 20.3 kB (the new Performance panel), no other
  route affected. Full `npx jest --coverage=false` — **16 suites, 191 tests (184 passed, 7
  skipped — emulator-gated), 0 failures.**
- Lint: the repository has a pre-existing, repo-wide CRLF/prettier lint condition (documented in
  Phase 33's report, reconfirmed here) that fails `npm run build`'s lint gate on unmodified
  `master`. Not introduced by this phase. The specific files this phase touched or created have
  **zero non-CRLF lint errors** — the only two non-CRLF findings in the affected files
  (`firestore.ts`'s pre-existing unused `Timestamp` import, and a pre-existing project-config gap
  that excludes all `*.test.ts` files from `@typescript-eslint/parser`'s project scope) both predate
  this phase, confirmed via `git diff`.

## Known limitations / not fixed in this phase

- **`asset_downloaded`'s ownership-verification stub** (in the generic `trackAnalyticsEvent.ts`,
  same file that had the `whatsapp_clicked` gap this phase closed) is still unverified — out of
  scope for a phase specifically about `whatsappClicks`/`inquiries`, but worth closing in a
  follow-up for the same reason this phase closed it for WhatsApp clicks.
- `campaign_performance`'s firestore.rules read rule (pre-existing, unmodified) only checks
  `campaigns/{campaignId}.userId == request.auth.uid` — it does not account for agency-member
  access the way `verifyBusinessAccess` does server-side. This doesn't affect the Cloud Functions
  built in this phase (they use the Admin SDK and `verifyBusinessAccess`, bypassing this client-read
  rule entirely), but it does mean an agency member could not read this collection directly from
  the client even though they can via `getCampaignPerformance`. Not a regression (no client ever
  reads this collection directly today), but worth noting for whoever eventually builds a
  client-read path against it directly.

## Final Verdict

These three are deliberately **not combined**, per the phase brief:

**TECHNICAL IMPLEMENTATION: FULLY VERIFIED**
The write/read path for `whatsappClicks` is authenticated, authorized, campaign-associated,
idempotent, and tested end-to-end against real emulators (10/10 backend tests, 31/31 frontend
tests, full regression suites clean). `inquiries` is structurally guaranteed to never be fabricated
(no code path exists that could set it to anything but `null`).

**DATA AVAILABILITY: PARTIAL**
`whatsappClicks` is real and available, per-campaign, starting from this phase. `inquiries` and all
appointment-related performance fields remain genuinely unavailable — there is no integrated source
anywhere in this system, and none was fabricated to fill the gap.

**VALIDATION READINESS: DATA NOT YET SUFFICIENT**
Per `docs/PERFORMANCE_DATA_READINESS.md` and `docs/PERFORMANCE_ENGINE.md` (both created in this
phase): one real engagement metric is not a sufficient basis for any performance-based learning,
ranking, or optimization. This status is not changed by the schema/collection now existing — it
reflects the actual data, which remains incomplete (no outcome/inquiry signal) and low-volume by
nature of being brand new.
