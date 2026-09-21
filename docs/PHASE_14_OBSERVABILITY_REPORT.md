# Phase 14 — Observability (MVP Version)

**Priority:** 🟠 P1
**Scope:** Make production failures diagnosable — "why did this customer's campaign fail?" — without building enterprise observability.

## 1. Executive Summary

The codebase already had a correct, lightweight structured-logging foundation (`functions/src/utils/logging.ts`'s `createLogger`/`logFunctionStart`/`logFunctionComplete`/`logFunctionError`, built on Firebase's native `functions.logger` → Cloud Logging pipeline — no new logging system was needed or built, per the explicit constraint). Most Cloud Functions already used it correctly.

The forensic audit found four real, previously-undetected gaps, all now fixed:

1. **The core 12-stage AI generation pipeline (`pipeline.ts`) — the single most important code path for "why did this campaign fail" — used bare `console.log`/`console.error` with zero `campaignId`/`businessId`/stage correlation.** This is the code that actually determines what a campaign's failure looks like in the logs. Fixed by wiring the already-defined-but-dormant `logFunctionStage` helper through all 12 stages and adding a `currentStage` tracker so the top-level catch block reports exactly where the pipeline was when it failed.
2. **No generic secret-redaction safety net existed.** AI provider SDKs (Gemini in particular authenticates via a `?key=...` URL query parameter) can leak the key into an error's own `.message` if the underlying HTTP client embeds the request URL in a network-failure message, and that message gets re-thrown/logged verbatim by files like `services/ai/text.ts`. Fixed with a small regex-based redaction step inside `createLogger().error()` — applied to every error this project logs, not just AI-provider ones — covering URL-embedded API keys, `Authorization: Bearer` tokens, and provider secret-key prefixes (`sk-…`, `AIza…`, `rzp_live_…`/`rzp_test_…`).
3. **`razorpayWebhook.ts`'s per-event handlers dumped the entire raw Razorpay `payment`/`subscription` object** (which can carry the payer's email, phone, and bank/VPA details) into `console.warn`/`console.log` on five different "missing userId/planId in notes" branches, and the top-level webhook handler logged the full `event.payload`. Fixed to log only safe identifiers (`paymentId`/`subscriptionId`, booleans for which field was missing) via a module-level structured logger.
4. **Every callable function's authentication/validation/authorization gate (`validatedCallable`, `validatedCallableWithBusiness` in `middleware/validation.ts`, and `verifyBusinessAccess` in `middleware/auth.ts`) rejected silently — zero log emitted.** These gates run *before* the target function's own `logFunctionStart`, so an operator investigating "why is this customer locked out" (expired token, missing App Check, a Phase-11-hardened permission-denied) had nothing to search for. Fixed with minimal `warn`-level logs at each rejection point (never logging the request payload itself).

Everything else audited (credit reservation/refund logging in `usageControl.ts`, Storage upload logging in `getUploadUrl.ts`/`confirmUpload.ts`, deterministic Truth Check logic in `truthCheck.ts`) was already adequate or, for `truthCheck.ts`, correctly has no logging of its own because it is a pure function with no I/O — its failures already surface through the pipeline's now-fixed stage-aware catch block.

**No new logging system, dashboard, or third-party observability platform was introduced.** Every fix reuses `functions/src/utils/logging.ts`, which already existed.

## 2. MVP Observability Scope

In scope and addressed: campaign generation pipeline stage tracking, AI provider failure attribution, Truth Check failure surfacing (via the pipeline), credit reservation/refund failure logging (confirmed pre-existing and adequate), payment webhook failure logging, Storage upload failure logging (confirmed pre-existing and adequate), auth/authorization failure logging, and a generic secret-redaction safety net.

Explicitly out of scope, per the user's constraints: Datadog/New Relic/Sentry/OpenTelemetry/Grafana/Prometheus/ELK, a custom log database, custom distributed tracing, dashboards, or alerting rules. None of these were introduced or are recommended by this report — Cloud Logging (already the transport for every `functions.logger.*` call) is sufficient for the MVP goal of answering "why did this fail" by searching/filtering on `campaignId`/`businessId`/`userId`/`stage`.

## 3. Current Logging Architecture

`functions/src/utils/logging.ts` exports:
- `createLogger(context)` → `{info, warn, error, debug}`, each call attaching `baseContext` (`userId`/`businessId`/`campaignId`/`stage`/`timestamp`/`environment`) plus any per-call `extra`. `error()` now redacts secret-shaped substrings from the error's `message`/`stack` before logging (new this phase).
- `logFunctionStart(functionName, context)` — logs `${functionName}.start`, returns `{startTime, logger}`.
- `logFunctionStage(logger, stage, context)` — logs `stage.${stage}` (existed since an earlier phase, was completely dormant — zero call sites — until this phase wired it into `pipeline.ts`).
- `logFunctionComplete(logger, startTime, result, context)` — logs `function.complete` with latency, success, credits used, etc.
- `logFunctionError(logger, startTime, error, context)` — logs `function.failed` with latency and the (now-redacted) error.

This is Firebase's native `functions.logger` under the hood, which ships directly to Google Cloud Logging with no additional infrastructure. All fixes in this phase reuse these exact five primitives — no new ones were added.

## 4. Campaign Observability

`services/ai/pipeline.ts`'s `GenerationPipeline.execute()` — the method that runs all 12 generation stages — previously used bare `console.log('Stage N: ...')` per stage and `console.error('Pipeline failed:', error)` in its single catch block, none of it carrying `campaignId`/`businessId`. Fixed:

- A `createLogger({businessId, campaignId})` instance is created once at the top of `execute()`.
- A `currentStage` variable is updated immediately before each of the 12 stages runs and passed to `logFunctionStage(logger, currentStage)` — so Cloud Logging now shows a `stage.business_understanding`, `stage.product_understanding`, … `stage.campaign_assembly` trail for every campaign, each entry carrying `businessId`/`campaignId`.
- The catch block now calls `logger.error('Pipeline failed', error, {stage: currentStage})` — an operator can now answer "which of the 12 stages was running when this campaign failed" directly from the log, not just "some stage failed at some unknown time."
- A second raw `console.warn` inside `runStage7` (hero image generation failure) was fixed the same way, now including `provider`, a `failureCode: 'AI_PROVIDER_ERROR'` marker, and the provider's own (short, safe) error message — never the image prompt or business data.

This directly composes with Phase 12's fix (the campaign document itself gets `status: 'failed'` and `error: {code, message, stage, retryable}` populated on any pipeline exception) — the Firestore document and the Cloud Logging trail now agree on which stage failed.

## 5. Error Categories

Errors are categorized by where they already surface, reusing existing types rather than inventing new ones:
- **Pipeline/AI generation failures** — `Campaign.error.code` (Phase 12) + the pipeline's stage-aware log (this phase).
- **Truth Check failures** — `error.code === 'TRUTH_CHECK_FAILED'` (Phase 12), traceable to `stage.truth_check` in the log.
- **Credit/usage failures** — `logFunctionError` in `usageControl.ts` (already correct, confirmed this phase, not modified).
- **Payment/webhook failures** — `logger.error`/`logFunctionError` in `razorpayWebhook.ts` (already correct at the top level; per-event-handler leaks fixed this phase).
- **Auth/authorization failures** — previously unlogged; now `warn`-level logs in `validation.ts`/`auth.ts` (this phase).
- **Storage/upload failures** — `logFunctionError` in `getUploadUrl.ts`/`confirmUpload.ts` (already correct, confirmed this phase, not modified).

No new duplicate "currentStage" field was invented on the `Campaign` document — the existing `Campaign.status` enum (e.g. `analyzing`, `generating_copy`, `generating_creatives`, `validating_output`, `failed`) already is stage-like, and `Campaign.error.stage` (Phase 12) already exists for the terminal-failure case.

## 6. AI Provider Observability

`runStage7`'s hero-image-generation failure log now includes `provider` (`result.provider || 'unknown'`) so an operator can distinguish "OpenAI failed" from "a different configured provider failed" without reading code. `services/ai/text.ts` and `services/ai/vision.ts` wrap underlying SDK errors with a `${message}` re-throw; because every error eventually reaches `createLogger().error()` (directly, or via `logFunctionError`), the new redaction step (§7 below) protects this call path project-wide rather than requiring each provider file to be individually audited and trusted forever.

`vision.ts`'s `prepareImages` previously logged the full image URL (a Firebase Storage download URL, which carries an access token as a query parameter) via `console.warn`. Fixed to log only the URL's `pathname` via `createLogger().error()`, with the error itself passing through redaction.

## 7. Truth Check Observability

`services/ai/truthCheck.ts` (`runDeterministicTruthCheck` and its extraction/normalization helpers) is a pure, synchronous, deterministic function — no network calls, no throws on the normal validation path. It was audited and confirmed to correctly have **no logging of its own**: a bug inside it would surface as an uncaught exception in the pipeline's stage 11 (`stage.truth_check`), which is now logged with full context by this phase's `pipeline.ts` fix. Adding logging inside `truthCheck.ts` itself would duplicate that coverage without adding diagnostic value — consistent with the phase's "do not create duplicate systems" constraint.

## 8. Credit Observability

`services/usageControl.ts` was already fully instrumented (`checkGenerationEligibility`, `reserveCreditsForOperation`, `finalizeReservation`, `refundReservation`, `executeWithUsageControl` all use `logFunctionStart`/`logFunctionComplete`/`logFunctionError`). Re-confirmed this phase via grep (zero raw `console.*` calls) and by re-reading the reservation/refund transaction logic established in Phase 10. No changes needed.

## 9. Payment Observability

`functions/webhooks/razorpayWebhook.ts`'s top-level `onRequest` handler already used `logFunctionStart`/`logFunctionComplete`/`logFunctionError` correctly. This phase fixed the layer beneath it — see §1 item 3. The idempotency-claim transaction (Phase 10) and its logging were not touched and remain correct.

## 10. Storage Observability

`functions/assets/getUploadUrl.ts` and `confirmUpload.ts` were audited via grep and confirmed to already use `logFunctionStart`/`logFunctionComplete`/`logFunctionError` exclusively, with no raw `console.*` calls. No changes needed.

## 11. Auth Observability

See §1 item 4. `middleware/validation.ts`'s `validatedCallable`/`validatedCallableWithBusiness` and `middleware/auth.ts`'s `verifyBusinessAccess` now log every rejection at `warn` level with `userId`/`businessId` (never the request payload, never the two agencyIds being compared in the Phase-11 role-escalation check — only that they mismatched). `verifyAuth`/`requireRole` were left unchanged: `verifyAuth` only checks `request.auth` presence (already covered by `validatedCallable`'s own check), and `requireRole` is dead code with no call sites (confirmed via grep) — logging it would add coverage for a path that cannot currently execute.

## 12. Security / Secret Audit

Repeated this phase, scoped to the actual diff (see §17 command output): grep for `NEXT_PUBLIC_`, `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN`, `GEMINI`, `OPENAI`, `RAZORPAY`, `PRIVATE_KEY`, `AUTHORIZATION`, `COOKIE` across every file this phase touched. Zero literal secret values found — only field names, redaction-pattern source code, and comments describing the redaction. The new `redactSecrets()` function in `logging.ts` is itself the fix for the one *plausible* (not confirmed — this environment cannot make real Gemini/Razorpay API calls to observe an actual leaking error) leak vector identified: provider SDK errors embedding a URL-based credential.

`CampaignAsset.promptUsed` (a Firestore document field, access-controlled by Phase 11's rules, not a runtime log) legitimately persists the AI prompt used to generate an asset — this is data the business/support team needs to understand what was generated, distinct from operational logs, and is unchanged by this phase per the user's "unless already explicitly safe and necessary" carve-out.

## 13. Failure Recovery Integration

This phase's pipeline logging composes directly with Phase 12: the same `currentStage` that gets logged via `logger.error('Pipeline failed', ...)` is the same stage information the caller (`generateCampaignStrategy.ts`) uses to populate `Campaign.error.stage` on the Firestore document. The log and the customer-facing (support-visible) document now describe the same failure consistently.

## 14. Data Consistency Integration

No changes to Truth Check staleness detection (Phase 13) were needed — `isVerificationStale`/`getCampaign` already correctly wire into the frontend as of that phase; this phase only added a `stage.truth_check` log entry around the pipeline's own (initial, at-generation-time) Truth Check stage, which is a distinct concern from Phase 13's post-generation staleness check.

## 15. Tests

| Test file | What it proves |
|---|---|
| `functions/src/utils/logging.test.ts` (new) | `createLogger().error()` redacts a Gemini-style `?key=...` URL, an `Authorization: Bearer` token, and a Razorpay secret-key prefix from the logged error message — and leaves an ordinary, secret-free error message byte-for-byte unchanged, with context fields (`businessId`/`campaignId`) passed through correctly. |
| `functions/src/services/ai/pipeline.observability.test.ts` (new) | Running the real `GenerationPipeline.execute()` emits a `stage.*` log for all 12 documented stages, each carrying `businessId`/`campaignId`; on a forced mid-pipeline exception, `logger.error('Pipeline failed', ...)` is called with the exact stage that was running (`campaign_strategy` in the test) plus `businessId`/`campaignId` — not a bare, uncorrelated error. |
| `functions/src/functions/campaigns/generateCampaignStrategy.recovery.test.ts` (Phase 12, re-run unmodified) | End-to-end (Firestore emulator): a forced pipeline exception still reaches `Campaign.status: 'failed'`, `error` populated, credits refunded; a Truth Check FAIL still reaches `failed`/`TRUTH_CHECK_FAILED`/credits finalized; a subsequent retry with a fresh idempotency key still succeeds. |
| `functions/src/functions/webhooks/razorpayWebhook.test.ts` (pre-existing, re-run unmodified) | Confirms the webhook handler logic (idempotency, event dispatch) still passes after the per-event-handler logging fix. |
| `functions/src/middleware/auth.test.ts` (pre-existing, re-run unmodified) | Confirms `verifyBusinessAccess`'s authorization logic (including the Phase 11 role-escalation guard) still passes after adding its `warn` logging. |

## 16. Commands Executed

```
cd functions && npm run build                  # tsc — PASS
cd functions && npx eslint --fix <touched files># prettier auto-fix only; pre-existing unrelated errors left untouched
cd functions && npx jest --silent               # 11 suites / 101 tests PASS (no emulator)
firebase emulators:start --only firestore --project demo-test-project
cd functions && FIRESTORE_EMULATOR_HOST=localhost:8080 npx jest --silent
                                                  # 21 suites / 144 tests PASS (with emulator)
npm run typecheck                                # tsc --noEmit — PASS
npm run build                                    # next build — PASS (17/17 pages)
npm run functions:build                          # PASS
npx jest --testPathIgnorePatterns="functions/" --silent
                                                  # 13 suites / 160 tests PASS (frontend)
git diff -- <touched files> | grep -iE "api_key|secret|password|token|gemini|openai|razorpay|private_key|authorization|cookie"
                                                  # zero literal secret values found
```

## 17. Runtime Verification

Not possible in this environment, consistent with every prior phase this session — there is no live Firebase project to deploy to or real Cloud Logging instance to inspect. What **was** verified at runtime: the Firestore-emulator-backed test suite (21 suites, 144 tests) exercises the real `generateCampaignStrategy` Cloud Function end-to-end, including this phase's pipeline logging changes, against a real (emulated) Firestore, and the new `pipeline.observability.test.ts` runs the *actual* `GenerationPipeline.execute()` (not a mock of it) with `functions.logger` spied on directly, confirming the structured log calls are made with the correct shape and context in a real function execution, not just asserted by reading the source.

What could not be verified: that Google Cloud Logging actually ingests, indexes, and makes these fields filterable in production exactly as expected (this depends on Firebase's `functions.logger` → Cloud Logging pipeline behaving as documented, which is standard, well-established behavior but unverifiable without a live project).

## 18. Known Limitations

- The redaction patterns in `redactSecrets()` are a defensive **safety net**, not a guarantee — they cover known secret shapes (URL query-param keys, Bearer tokens, `sk-`/`AIza`/`rzp_` prefixes) but cannot catch every conceivable future secret format. This is a deliberate, proportionate MVP choice over auditing/hardening every individual provider SDK call site.
- `env.ts`'s `console.warn('Environment validation failed:', result.error.flatten())` was left unchanged — it only reports which config field names failed Zod validation (no values), runs at cold-start before any request context exists, and is not part of the customer-failure diagnostic path this phase targets. Documented here rather than fixed to avoid scope creep into unrelated boot-time diagnostics.
- `razorpayWebhook.ts` has several pre-existing unused imports (`getRazorpayClient`, `getUsageDoc`, `createUsageDoc`, `incrementUsageField`, `createTransactionDoc`) flagged by lint; these predate this phase's edits (the file is untracked/new in this branch) and are unrelated to observability — left as-is rather than pulled into this phase's scope.
- The pre-existing repo-wide lint baseline (~1,495 errors, almost entirely CRLF/prettier line-ending noise across files this phase did not touch) was not addressed — out of scope, consistent with every prior phase's handling of this same baseline.

## 19. Remaining Risks

- No log-based alerting exists (e.g., a Cloud Monitoring alert on a spike of `Pipeline failed` or `permission-denied` warnings) — explicitly out of scope per the user's "no dashboards" constraint, but worth flagging as a natural next step once this MVP logging is live in production and someone is watching Cloud Logging manually or on a schedule.
- Because this environment cannot execute a real Gemini/OpenAI/Razorpay API call, the specific leak vector the redaction safety net targets (a provider SDK embedding a credential in an error message) was tested with a synthetic error string shaped like what such a leak would look like, not a captured real one — the fix is defensively correct for that shape, but its necessity in practice remains unconfirmed.

## 20. Final Verdict

**PHASE 14 IMPLEMENTED BUT PARTIALLY VERIFIED**
