# PHASE 12 — ERROR RECOVERY REPORT

No `/docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`,
`SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`, `PROMPT_SYSTEM.md`,
`PERFORMANCE_ENGINE.md`, or `PERFORMANCE_DATA_READINESS.md` exist in this
repository (confirmed by direct listing — the same gap as every prior
phase). The actual implementation, read directly, was the source of truth.

## 1. Executive Summary

This phase set out to audit failure-recovery paths. It instead found that
**campaign generation — the product's core feature — had never once
completed successfully end-to-end in this codebase's history**, due to
three independent, compounding bugs that only manifest once a generation
actually reaches its later stages (something no prior phase could exercise,
since none had real AI credentials or a working Firestore-emulator
end-to-end test until this one):

1. **A `ReferenceError` on every success path.** `generateCampaignStrategy.ts`
   referenced `creditsUsed` — a `const` destructured from
   `executeWithUsageControl`'s return value — **inside** the callback that
   `executeWithUsageControl` itself invokes, i.e. before that `const` is
   ever assigned. Every generation that reached the "save final results"
   step crashed with `Cannot access 'creditsUsed' before initialization`
   — a genuine JavaScript temporal-dead-zone bug, not a business-logic
   failure. Confirmed with a real, initially-failing test; fixed by using
   `creditsRequired` (already in scope), which was the correct value all
   along.
2. **A Firestore write that always threw for the common case.** The Admin
   SDK rejects any `undefined` field value by default. `Campaign.productId`
   is `undefined` whenever a user generates a campaign from a new,
   unsaved product rather than an existing one (a normal, expected flow) —
   `createCampaignDoc` threw immediately in that case, for every such
   campaign, project-wide. Fixed with the one-line, Firestore-documented
   mechanism for this (`ignoreUndefinedProperties: true`), applied globally
   in both the real app (`functions/src/index.ts`) and the test harness
   (`functions/src/testSetup.ts`), rather than manually stripping
   `undefined` fields at each call site.
3. **A stuck, non-terminal campaign state on pipeline exceptions.** When
   the AI pipeline throws (provider error, timeout, malformed output),
   `executeWithUsageControl` already correctly refunds the credit
   reservation — but nothing updated the campaign document's `status`
   itself, leaving it at whatever intermediate stage it last reached
   (`'analyzing'`, `'generating_copy'`, etc.), which is **not** one of the
   frontend's recognized terminal statuses. `GenerationProgress.tsx`'s poll
   loop would continue indefinitely — an infinite spinner over a campaign
   the backend already knew had failed. Fixed by moving the campaign to
   `status: 'failed'` with a populated `error` field in the outer catch
   block.

All three are proven fixed with a real Firestore-emulator test
(`generateCampaignStrategy.recovery.test.ts`) that mocks only the AI
pipeline call itself and exercises the actual, unmodified surrounding
code — reservation, Firestore writes, status transitions, and refund logic
all run for real.

**Additional findings and fixes**, smaller in scope but real:
- `Campaign.error` — a field already defined in the type and already read
  by the frontend (`CampaignWizard.tsx`'s `handleSettled`) — was never
  actually written by the backend anywhere. Now populated on both failure
  paths (pipeline exception and Truth Check FAIL), distinguished by
  `error.code`, so the frontend can show an accurate message instead of a
  generic guess.
- The wizard's failure-toast wording asserted "your credits were not
  charged" unconditionally, which is inaccurate when credits were actually
  reserved-then-refunded (the common case for a pipeline-exception
  failure) — and outright wrong for a Truth-Check-FAIL, where credits are
  genuinely charged, not refunded (confirmed as intentional, pre-existing,
  consistent behavior — same as `regenerateAsset`'s Truth Check handling).
  Both cases now get accurate, distinct wording, and the wizard re-fetches
  the actual credit balance from the server after any failure rather than
  continuing to display a stale pre-attempt number.
- A browser refresh mid-generation previously dropped the user back to the
  empty wizard form, losing all reference to the in-flight (already
  credit-reserved) campaign — inviting a genuine duplicate attempt. The
  in-flight `campaignId` is now mirrored into the URL so a refresh resumes
  the same live progress view.
- `uploadImage()`'s asset-dimension patch (a client-side Firestore write
  that runs *after* the server has already durably created the real asset
  record) could report "Upload failed" to the user for a transient failure
  of that cosmetic patch alone, even though the upload had already fully
  succeeded — inviting a wasteful duplicate re-upload via Retry. Now
  best-effort, logged but non-fatal to the overall upload result.

## 2. Initial Audit Findings

Read in full: `functions/src/functions/campaigns/generateCampaignStrategy.ts`,
`regenerateAsset.ts`, `functions/src/services/usageControl.ts` (Phase 10's
already-hardened reservation/finalize/refund state machine — reused, not
rebuilt), `functions/src/functions/webhooks/razorpayWebhook.ts` (Phase 10's
already-hardened idempotent webhook — reused, not rebuilt),
`src/features/campaign/components/CampaignWizard.tsx`,
`src/features/campaign/components/GenerationProgress.tsx`,
`src/features/asset/components/ImageUploader.tsx`,
`src/features/asset/services/assetService.ts`,
`functions/src/functions/assets/getUploadUrl.ts` / `confirmUpload.ts`.

Phase 10 and Phase 11 already hardened and proved (with real emulator
tests) the credit reservation/finalize/refund state machine and the
Razorpay webhook idempotency — those mechanisms are **reused** here, not
re-audited from scratch, per the explicit non-negotiable rule not to
rewrite working systems. This phase's own new findings are the three
generation-pipeline bugs in §1/§3 and the frontend/upload issues in §4/§6.

## 3. AI Failure Recovery

**Provider failure / timeout:** any thrown error from
`GenerationPipeline.execute()` (provider exception, timeout, or an
internally-detected total-image-generation-failure — see
`functions/src/services/ai/pipeline.ts`'s Stage 7, unchanged from Phase 5/7)
propagates up through `executeWithUsageControl`, which refunds the credit
reservation before re-throwing (Phase 10, reused). **Now additionally**
(Phase 12 fix): the campaign document is moved to `status: 'failed'` with
`error: {code, message, stage: 'generation', retryable: true}` in
`generateCampaignStrategy.ts`'s outer catch — proven with a real emulator
test that forces the pipeline to throw and inspects the persisted
`campaigns` document afterward.

**Malformed AI response:** `pipeline.ts` validates structured output at
each stage (Phase 5's `validationStages.ts`, unchanged); a malformed
response that fails validation throws the same way a provider error does,
routed through the same refund + now-fixed failed-status path.

**Truth Check failure:** a completed generation whose Truth Check result is
`FAIL` is a normal (non-exceptional) return from the pipeline — it does
**not** throw, so `executeWithUsageControl` finalizes (charges) the
reservation rather than refunding it. This is consistent with
`regenerateAsset.ts`'s existing, unchanged behavior for the same case
(Phase 6/10) — confirmed intentional, not a bug, and left as-is per the
explicit instruction not to invent a new partial-success architecture.
`campaign.status` is set to `'failed'`, and (Phase 12 fix)
`campaign.error.code = 'TRUTH_CHECK_FAILED'` is now populated so the
distinction from a refunded pipeline exception is visible to the frontend.

**Partial generation (some creatives succeed, others fail):** the pipeline
is intentionally atomic at the whole-campaign level for the MVP — Stage 7's
image generation either produces a usable hero image (from which
poster/story/reel variants are deterministically composited, Phase 7) or
the pipeline throws entirely; there is no "half a campaign" success state
to guard against, confirmed by reading the actual Stage 7 code (unchanged
this phase).

**Retry behavior:** a failed attempt's `idempotencyKey` is discarded and a
fresh one generated (`CampaignWizard.tsx`), so a user-triggered Retry is a
genuinely new `generateCampaignStrategy` call with a new `campaignId` —
proven not to corrupt or double-charge via a real emulator test
("a failed generation does not prevent a subsequent legitimate retry ...
from succeeding").

## 4. Upload Failure Recovery

**Validation failure:** `validateFile()` runs before any network call;
failure shows an inline error and blocks upload — no Storage/Firestore
side effect (unchanged, already correct).

**Storage upload failure:** the signed-URL `PUT` failing (`!response.ok`)
throws before `confirmUpload` (the actual asset-creating step) is ever
called — no asset record is created (unchanged, already correct).

**Firestore metadata failure (Phase 12 finding, fixed):** the *authoritative*
asset record is created server-side by `confirmUpload` (Admin SDK,
`createAssetDoc`) — the frontend's subsequent client-side
`saveAssetRecord()` call only patches in the image's real pixel dimensions
(the server writes `width: 0, height: 0` since it never inspects the file).
A failure of that patch alone was previously surfaced as "Upload failed" to
the user, even though a completely valid asset already existed — now
caught and logged, non-fatal to the reported upload result.

**Duplicate upload click:** `ImageUploader.tsx` hides the "Upload Image"
button while `status === 'uploading'`; each full retry mints a fresh
`assetId`/Storage path via a new `getUploadUrl` call, so repeated
legitimate retries create independent, valid (not "fake" or corrupted)
assets rather than corrupting any single one. No credits are involved in
uploads (confirmed: neither `getUploadUrl.ts` nor `confirmUpload.ts` calls
`reserveCreditsForOperation`), so the blast radius of an accidental extra
upload is a stray Storage object/asset doc, not a financial issue — judged
acceptable for MVP rather than adding new idempotency-key machinery to a
non-financial path.

**Orphaned Storage objects:** possible in principle (e.g. the Storage `PUT`
succeeds but `confirmUpload` is never called due to a lost network
response) — no automatic cleanup exists. Documented as an accepted MVP
limitation (not built this phase, per the explicit instruction not to
build a cleanup service unless necessary): an orphaned Storage object
without a Firestore `assets` doc is never presented as a valid asset
anywhere (nothing reads Storage independently of Firestore in this
architecture, confirmed in Phase 11's Storage audit), so it cannot be
mistaken for a real asset or bypass authorization — it is simply inert,
undiscoverable storage until a future cleanup pass.

## 5. Payment Failure Recovery

Re-verifies (does not rebuild) Phase 10's proven mechanisms:
- Failed/cancelled/pending payment → no entitlement, no credit grant
  (`verifyPayment` requires `payment.status === 'captured'`; the webhook's
  `payment.captured` handler is the sole credit-granting path — Phase 10).
- Duplicate webhook, duplicate callback, and callback+webhook races all
  proven safe (Phase 10's atomic webhook-claim fix, re-run clean this
  phase — see §11 Tests).
- No new payment-recovery gaps were found this phase; Phase 10/11's work
  stands.

## 6. Network Failure Recovery

**Refresh during generation (Phase 12 fix):** previously, a full page
reload while `phase === 'generating'` reset `CampaignWizard`'s React state
entirely, dropping the user back to the empty form with no reference to
the in-flight (already credit-reserved) campaign — inviting a genuine
duplicate generation attempt. Fixed: the in-flight `campaignId` is now
mirrored into the URL (`/campaigns/new?generating=<id>`) on successful
submission and cleared on terminal failure; on mount, the wizard checks for
that query param and, if present, immediately resumes the
`GenerationProgress` polling view for that exact campaign instead of
showing the form. `GenerationProgress` itself was already correct — it
polls the authoritative Firestore document, never client-held state.

**Refresh after generation:** `CampaignDetailContent`/`[campaignId]/page.tsx`
(Phase 8) already read exclusively from authoritative Firestore state on
every mount — reopening a campaign after any refresh shows the real,
current backend state, success or failure, by construction. No changes
needed.

**Lost frontend response after a successful backend operation:** since the
frontend never trusts its own in-memory state as authoritative (both the
wizard's polling and the review page's direct Firestore reads always
re-derive from the backend), a dropped HTTP response cannot cause a
"frontend thinks it failed, user retries, duplicate campaign" outcome for
generation specifically — a retry after a lost response is a new,
legitimately separate attempt with its own reservation, exactly as a
manual retry would be; Phase 10's reservation atomicity prevents any
double-charge even if both the "lost" original and the retry happen to
reach the server.

**Duplicate click (Generate/Retry/Regenerate):** client-side locks
(`submitLockRef` in the wizard; per-asset `isAssetRegenerating` in
`CampaignDetailContent`) prevent the common case; the server-side
guarantee — proven in Phase 10 — is that two concurrent requests for the
same operation never both succeed in reserving credits, and two requests
for genuinely different operations correctly compete for the same shared
credit budget rather than corrupting it.

## 7. State Integrity

**Campaign states** (actual values, from `CampaignStatus` in
`src/types/index.ts` / `functions/src/types/index.ts`): `draft`,
`validating`, `queued`, `analyzing`, `strategizing`, `generating_copy`,
`generating_creatives`, `validating_output`, `generated`, `verified`,
`completed`, `failed`. Terminal, per `GenerationProgress.tsx`:
`generated`, `verified`, `completed`, `failed`. Before this phase, a
pipeline exception could leave a campaign stuck at any of the
non-terminal intermediate statuses forever (§1, finding 3) — fixed.

**Asset states:** `AssetStatus` = `'generating' | 'completed' | 'failed' |
'superseded'` (Phase 9/10 audits, unchanged). A failed regeneration's new
asset is persisted with `status: 'failed'` and never marked as having
superseded the still-valid original (Phase 6, re-confirmed intact — not
touched this phase).

**Credit states:** `TransactionStatus` = `'pending' | 'completed' |
'refunded' | 'failed'` (Phase 10, unchanged, reused).

**Payment states:** `SubscriptionStatus`/webhook-driven transaction states
(Phase 10, unchanged, reused).

## 8. Idempotency

| Operation | Idempotent? | Mechanism |
|---|---|---|
| Credit reservation | Yes | Atomic transaction keyed on `operationId` (Phase 10 fix, reused) |
| Credit finalize | Yes | Status-guarded, re-finalize is a no-op (Phase 10) |
| Credit refund | Yes | Status-guarded, re-refund is a no-op (Phase 10) |
| Razorpay webhook | Yes | Atomic per-event-ID claim (Phase 10 fix, reused) |
| `generateCampaignStrategy` retry | New attempt, not a replay | Fresh `campaignId`/`idempotencyKey` per click (by design) — proven not to corrupt state (Phase 12, this report) |
| `regenerateAsset` retry | Idempotent per attempt | `idempotencyKey`-keyed reservation (Phase 10 fix, reused) |
| Upload confirm | Not idempotent, not financial | Each call mints a fresh assetId; acceptable (§4) |

## 9. Concurrency

Reused from Phase 10 (re-run clean this phase, not re-derived): concurrent
reservations for the same shared credit budget correctly allow at most one
to succeed when only one can fit; concurrent finalize+refund on the same
reservation reach exactly one terminal state; concurrent/duplicate webhook
delivery grants credits exactly once. No new concurrency scenario was
introduced by this phase's fixes (the `generateCampaignStrategy` fixes are
all single-request-path bugs, not concurrency bugs).

## 10. Security

Recovery-adjacent authorization was not weakened or bypassed: the outer
catch's new failed-status write uses the same `campaignId` already scoped
to the authenticated, business-verified request (`verifyBusinessAccess`,
Phase 10/11's fix, unchanged) — there is no new code path by which User A
could mark User B's campaign failed, since the `campaignId` in the catch
block is always the one this exact authenticated request itself created a
few lines earlier, never a client-supplied value.

## 11. Tests

| Test | Result | Evidence |
|---|---|---|
| Pipeline exception → campaign reaches terminal `failed`, `error` populated, credits fully refunded | **PASS** | `generateCampaignStrategy.recovery.test.ts`, real Firestore emulator |
| Truth Check FAIL → `failed` + `error.code = TRUTH_CHECK_FAILED`, credits finalized (not refunded) | **PASS** | same file |
| Failed generation does not block a legitimate retry from succeeding | **PASS** | same file |
| Credit reservation/finalize/refund idempotency + concurrency (golden tests) | **PASS** | `usageControl.test.ts` + `usageControl.concurrency.test.ts` (Phase 10, re-run clean) |
| Duplicate/concurrent webhook → one credit grant | **PASS** | `razorpayWebhook.test.ts` (Phase 10, re-run clean) |
| Cross-tenant recovery-adjacent authorization (business/campaign ownership) | **PASS** | `auth.test.ts`, `security.test.ts` (Phase 11, re-run clean) |
| Mass-assignment / extra-field stripping | **PASS** | `validation.security.test.ts` (Phase 11, re-run clean) |
| Upload failure → no fake asset (code review, not a new automated test) | **VERIFIED BY CODE REVIEW** | §4 — `uploadImage()` only calls `saveAssetRecord` after `confirmUpload` already durably created the record; earlier failures throw before any asset exists |
| Refresh during generation → resumes authoritative live state | **VERIFIED BY CODE REVIEW + BUILD**, not browser-tested | §6 — no live Firebase project in this environment (same limitation as every prior phase); `next build` confirms the URL-param wiring compiles and the route still prerenders |

## 12. Commands Executed

```
npm run lint                     → PASS
npm run typecheck                → PASS
npm test                         → PASS (13 suites, 158 passed, 7 skipped, 0 failed)
npm run build                    → PASS (17 routes)
npm run functions:build          → PASS
cd functions && npx tsc --noEmit → PASS
FIRESTORE_EMULATOR_HOST=localhost:8080 npx jest (functions/)
                                  → PASS (17 suites, 134 passed, 0 failed)
```

Firestore emulator: started for real (`firebase emulators:start --only
firestore --project demo-test-project`), used for every emulator-gated
test in this report — not left skipped.

## 13. Known Limitations

- No real AI provider credentials exist in this environment (same gap as
  every prior phase) — the pipeline itself was mocked at its outermost
  boundary (`GenerationPipeline.execute`) for the new recovery tests; the
  pipeline's own internal stage-by-stage behavior was already tested in
  Phase 5/7/10 and not re-verified here.
- No live Firebase project/browser session was available to manually
  test the "refresh mid-generation" URL-resume fix end-to-end in a real
  browser (same limitation noted in every prior phase's browser-testing
  section) — verified via code reading, typecheck, and a successful
  production build instead.
- `CampaignWizard.tsx`'s new logic (credits refresh after failure,
  accurate failure messaging, URL-based resume) has no dedicated component
  test — the existing `tests/campaignWizard.test.ts` only covers the pure
  `buildCampaignInput` function, and building full component-render
  test infrastructure for this large multi-step wizard was judged out of
  proportion to this phase's remaining scope given the much higher-value,
  now-fixed backend bugs. Verified via code review + successful build only.
- Orphaned Storage objects (upload succeeds, `confirmUpload` never called)
  have no automated cleanup — documented, not built, per the explicit
  instruction not to add a cleanup service unless necessary; the risk is
  bounded (inert storage, never presented as a valid asset).
- Razorpay test-mode integration testing was not performed (no test
  credentials in this environment — same limitation as Phase 10).

## 14. Production Risk Assessment

**P0 (found and fixed this phase):**
- `generateCampaignStrategy`'s success-path `ReferenceError` — every
  generation that reached its final step crashed. **FIXED.**
- `createCampaignDoc`'s `undefined`-field crash for new-product campaigns.
  **FIXED.**
- Campaigns stuck at a non-terminal status forever after a pipeline
  exception (infinite frontend spinner). **FIXED.**

**P1 (found and fixed this phase):**
- Inaccurate/unverified credit-refund claims in the wizard's failure
  messaging. **FIXED.**
- Refresh during generation loses all reference to the in-flight
  campaign. **FIXED.**
- A transient failure of the post-upload dimension patch could be
  reported as a full upload failure. **FIXED.**

**P2 (documented, not fixed — genuinely low-severity or out of scope):**
- No orphaned-Storage-object cleanup job.
- No dedicated `CampaignWizard` component test.

**No remaining P0 recovery corruption is known.**

## 15. Final Verdict

PHASE 12 IMPLEMENTED BUT PARTIALLY VERIFIED
