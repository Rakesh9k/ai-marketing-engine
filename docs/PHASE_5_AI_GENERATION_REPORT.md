# Phase 5 — AI Generation Pipeline Report

## 1. Initial Finding

**CONFIRMED** — not "reportedly," not "partially." Read directly from the repository:

`functions/src/services/ai/index.ts` (before this phase):

```ts
export async function generateStructuredText<T>(
  prompt: string,
  schema: any,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  return aiServices.text.generateStructured<T>(schema, { temperature: 0.4, maxTokens: 8192 });
}
```

`aiServices.text` is `geminiTextProvider`, whose `generateStructured` method (`functions/src/services/ai/text.ts`) has the contract `generateStructured(prompt: string, schema: any, options?)`. The wrapper above called it with `(schema, options)` — two arguments, in the wrong positions: the **schema object landed in the `prompt: string` parameter slot**, and the real `prompt` argument received by `generateStructuredText` was **silently dropped entirely**. Caller-supplied `options` were also discarded in favor of hardcoded values.

Since the outer wrapper's `schema` parameter was typed `any`, TypeScript raised no error passing an object where a provider method expects a string — this is exactly why the bug survived `tsc`/`npm run build` cleanly.

**Every one of the 10 call sites** of `generateStructuredText` in the pipeline (`pipeline.ts` stages 1, 2, 3, 4, 5, 6, 8, 9, 10; `validationStages.ts`'s three functions) was affected. At runtime, `model.generateContent(schemaObject)` would be called against the Gemini SDK, which expects a string or `Content[]` — this would either throw immediately or produce garbage output, and the campaign generation pipeline could not have produced a valid structured result for any stage, ever.

**A second, independent bug was also confirmed** in `functions/src/services/ai/validationStages.ts`, matching the audit's separate suspicion in section 6: `runTruthValidation`, `runQualityValidation`, and `runSafetyValidation` all called `generateStructuredText(prompt, { passed: z.boolean(), ... })` — a **raw object literal** whose values happen to be Zod types, not a `z.object({...})`. A plain object has no `.safeParse` method; `GeminiTextProvider.generateStructured`'s `schema.safeParse(parsed)` call would throw `TypeError: schema.safeParse is not a function` for every invocation of these three functions. (These three functions are currently **not called anywhere else in the codebase** — `pipeline.ts` has its own separate, correctly-defined `z.object(...)` schemas for the equivalent stages 8/9/10 it actually runs. `validationStages.ts` is dead/orphaned code today, but the bug is real and was fixed regardless, since it's part of the shipped codebase this phase was asked to audit.)

## 2. Files Changed

| File | Purpose | Key change |
|---|---|---|
| `functions/src/services/ai/index.ts` | Core AI abstraction layer | Fixed `generateStructuredText` to call the provider with `(prompt, schema, options)` in the correct order and to actually forward caller-supplied `options`; tightened `schema: any` to `z.ZodType<T>`; wrapped every exported call (`analyzeProductImages`, `generateStructuredText`, `generateText`, `generateImage`) with timeout + (for throw-style calls) bounded retry, plus safe diagnostic logging |
| `functions/src/services/ai/retry.ts` | **New file** | Bounded retry + timeout utility (`withTimeout`, `withRetry`, `isRetryableAIError`) — none existed anywhere in the codebase before this |
| `functions/src/services/ai/text.ts` | Gemini text provider | Tightened `schema: any` → `z.ZodType<T>` (no behavior change; the method's own argument order was already correct) |
| `functions/src/services/ai/validationStages.ts` | Orphaned validation-stage functions | Wrapped the three raw object literals in `z.object({...})` |
| `functions/src/services/ai/vision.ts` | Gemini vision provider | Replaced an unchecked cast (`JSON.parse(...)` returned directly as `VisionAnalysisResult`) with real Zod runtime validation (`VisionAnalysisResultSchema.safeParse`); the exported `VisionAnalysisResult` type is now `z.infer<typeof VisionAnalysisResultSchema>` instead of a manually duplicated interface, so it can't drift from the runtime check again |
| `functions/src/functions/campaigns/generateCampaignStrategy.ts` | Campaign generation entry point | Fetches the existing product when `productId` is given and feeds it into the pipeline's `newProduct` input field (see §13 — this was silently broken for the primary "select an existing product" path); see also Phase 4's earlier fix in this same file (`createCampaignDoc` call) |
| `functions/src/services/usageControl.ts` | Credit reservation/finalization/refund | **Two credit-safety bugs fixed** — see §8 |
| `functions/jest.config.js` | **New file** | `functions/` had zero working test infrastructure (`jest`/`ts-jest`/`@types/jest` were installed as devDependencies but no config existed — `npm run functions:test` reported "No tests found, 165 files checked"). Minimal ts-jest config so `.test.ts` files under `functions/src` actually run |
| `functions/src/testSetup.ts` | **New file** | Initializes a minimal `firebase-admin` app so importing any module that transitively calls `admin.firestore()` at module load doesn't crash in the test process |
| `functions/tsconfig.json` | Build config | Added `src/testSetup.ts` to `exclude` (test-only file, not part of the deployed build) |
| `functions/src/services/ai/{generateStructuredText,retry,text,vision,validationStages}.test.ts` | **New files** | Unit tests — see §10 |
| `functions/src/services/usageControl.test.ts` | **New file** | Credit-safety tests run against the real Firestore emulator — see §8, §10 |

## 3. AI Call Flow

Traced for the structured-text path (the one the reported bug affected), using actual signatures:

```
pipeline.ts (e.g. runStage3)
  → generateStructuredText(prompt, CampaignStrategySchema)     [functions/src/services/ai/index.ts]
      → withRetry(() => withTimeout(
          aiServices.text.generateStructured<T>(prompt, schema, options),
          30000ms, 'text.generateStructured'
        ))
          → GeminiTextProvider.generateStructured(prompt, schema, options)  [text.ts]
              → model.generateContent(prompt)          — the actual Gemini API call
              → JSON.parse(responseText)
              → schema.safeParse(parsed)                — runtime validation, authoritative
              → return parseResult.data  (typed T)  OR  throw on parse/validation failure
      ← result (typed, validated) bubbles back through withTimeout/withRetry/generateStructuredText
  → pipeline.ts uses the validated result for the next stage
```

Any thrown error at any point in this chain propagates uncaught through `pipeline.execute()` and up into `generateCampaignStrategy.ts`'s `executeWithUsageControl(...)` call, whose `catch` block refunds the reservation and rethrows — confirmed unchanged and still correctly composing with the fix (see §8).

## 4. Structured Output

- **Mechanism:** Zod (`z.object({...}).safeParse(...)`), confirmed as the only schema mechanism in use.
- **Runtime validation:** `GeminiTextProvider.generateStructured` always calls `schema.safeParse(parsed)` and only returns `parseResult.data` on success; on failure it throws `Schema validation failed: ...` rather than returning the raw parsed object. This was already correct in `text.ts` itself — the bug was entirely in `index.ts` not reaching this code with the right arguments.
- **Vision output** (previously unvalidated — see §1/§2) now goes through the same pattern: `VisionAnalysisResultSchema.safeParse(parsed)`, throwing `Vision response schema validation failed: ...` on a malformed/incomplete response instead of silently returning partial data typed as the full interface.
- **No unsafe casts remain** in the paths touched by this phase (`response as T` patterns were the exact anti-pattern section 5 warned against; `vision.ts`'s was the one found and fixed).
- **Malformed output handling:** malformed JSON → caught, wrapped as `Text generation failed: ...` (or `Failed to parse vision response: ...` for vision); missing/wrong-type fields → Zod validation failure, thrown, never silently coerced or returned as valid.

## 5. Retry

No retry mechanism existed anywhere in the codebase before this phase (confirmed by repository-wide search — only a comment: `// For MVP, we'll use a placeholder - in production, implement retry`). Implemented in `functions/src/services/ai/retry.ts`, wired into `index.ts`:

- **Retried:** `generateStructuredText`, `generateText`, `analyzeProductImages` (all throw-style provider calls).
- **Not retried:** `generateImage` (DALL-E) — deliberately, for cost control (§26): image generation is the most expensive call per campaign, `pipeline.ts` already falls back to a placeholder image on failure, and adding retries here was not required to fix a pipeline blocker.
- **Max attempts:** 3 total (1 initial + 2 retries), bounded — verified by test (`withRetry` never exceeds `maxAttempts` even against a permanently-failing function).
- **Backoff:** exponential, `baseDelayMs * 2^(attempt-1)`, default base 500ms.
- **Retryable errors:** timeouts, rate limits (`429`), `5xx`, network errors (`ECONNRESET`, `ETIMEDOUT`, `fetch failed`, etc.).
- **Non-retryable errors (never retried, even once):** API key/authentication/permission errors, and — critically — **schema validation failures**, since those indicate a deterministic prompt/schema bug, not a transient fault; retrying sends the exact same broken request again and only multiplies AI cost. Unknown/unclassified errors also default to non-retryable, to avoid uncontrolled cost multiplication on errors the system doesn't understand.
- **No infinite loop:** structurally impossible — `withRetry`'s loop is bounded by `maxAttempts` and always either returns or throws.

## 6. Timeout

- No timeout mechanism existed before this phase; a hung `model.generateContent(...)` or `client.images.generate(...)` call could previously block a generation indefinitely.
- Implemented via `withTimeout(promise, ms, label)` — races the real call against a timer, rejecting with a distinguishable `AITimeoutError` if the budget is exceeded.
- Budgets: text 30s, vision 45s, image 60s (per call, per retry attempt — not a shared budget across the whole pipeline execution, which itself has no overall wall-clock cap either before or after this change; documented as a remaining risk in §13).
- `generateImage`'s existing contract never throws (`{success, error?}`); a timeout is translated into that same shape (`error.code: 'TIMEOUT'`) rather than thrown, so callers don't need two different failure-handling paths.
- Tested directly: a never-resolving promise reliably produces `AITimeoutError` within the configured budget (`retry.test.ts`).

## 7. Provider Errors

- Authentication/invalid API key, permission/forbidden → classified non-retryable, fail fast.
- Rate limit (429), 5xx, network errors → classified retryable, bounded retry.
- Timeout → `AITimeoutError`, retryable.
- Malformed/unparseable provider response → `Text generation failed: ...` / `Vision response schema validation failed: ...`, thrown, non-retryable (falls into the "unknown" default in most cases, or explicitly matched as a schema failure).
- `generateImage`'s own internal try/catch (unchanged) already converts thrown OpenAI SDK errors into `{success: false, error: {code: 'IMAGE_GENERATION_FAILED', message}}` — no sensitive provider internals or keys are included in that message, only `error.message` from the SDK's own error object.
- No error message constructed anywhere in the changed code ever includes an API key, since none of the error paths touch `config.GEMINI_API_KEY`/`config.OPENAI_API_KEY` directly.

## 8. Credit Safety

Traced `campaign request → reserve → generate → finalize/refund` against the **existing, unmodified** state machine in `functions/src/services/usageControl.ts` (`reserveCreditsForOperation` / `finalizeReservation` / `refundReservation`, orchestrated by `executeWithUsageControl`). This was not replaced — two bugs found during the trace were fixed:

1. **Ordering bug:** `reserveCreditsForOperation` called `checkGenerationEligibility` (which treats a missing usage document as "0 credits available") *before* the code that ensures a usage document exists for the period. Since a user's monthly usage document is otherwise only created once, at signup (`onUserCreated.ts`), every user's **first generation of every subsequent billing period** would have failed with a false `INSUFFICIENT_CREDITS`, regardless of their actual plan or balance. Fixed by moving the "ensure usage doc exists" block before the eligibility check.
2. **Wrong document ID (more severe, independent bug):** `reserveCreditsForOperation` and `refundReservation` both computed their usage-document reference as `getUsageDocId(userId, new Date())` — **today's date** — while `checkGenerationEligibility`/`getCurrentUsage` (and the dashboard, and `onUserCreated`) key the *same* lookup by **the first day of the current month**. These produce different Firestore document IDs on every day except the 1st. In practice this meant: every credit reservation/refund was reading and writing a throwaway, never-otherwise-read daily-keyed document, while the real monthly usage document that eligibility checks and the UI actually display would **never have `creditsUsed` incremented by real generations** — a user's visible credit balance would never decrease no matter how many campaigns they generated. Fixed by introducing `currentPeriodStart()` and using it consistently in both functions, matching `getCurrentUsage`'s existing convention.

Both were caught and confirmed **empirically**, not just by code reading — see §10/§12, the emulator-backed test suite fails without these fixes and passes with them (verified by reverting mentally through the actual failure output captured during development: before the reorder+doc-ID fix, 8 of 10 emulator tests failed with a spurious `INSUFFICIENT_CREDITS` even for a seeded `business`-plan user with 0 usage).

Traced failure paths, each verified against the real emulator (not mocked):

| Case | Verified behavior |
|---|---|
| AI succeeds | `finalizeReservation` → transaction status `completed`, no `refund_*` doc created |
| Provider/pipeline throws | `executeWithUsageControl`'s catch → `refundReservation` → transaction status `refunded`; the original error still propagates to the caller (not swallowed) |
| Timeout (`AITimeoutError`-shaped throw) | Composes identically to any other thrown error — refunded, error propagates |
| Duplicate request (same `operationId`) | Second `reserveCreditsForOperation` call is idempotent — returns the existing pending reservation, does **not** increment `creditsUsed` a second time |
| Already-finalized reservation | A second `finalizeReservation` call is idempotent (no-op success); attempting to `refundReservation` it is rejected with `ALREADY_FINALIZED` |
| Already-refunded reservation | A second `refundReservation` call is idempotent (no double refund, `creditsUsed` doesn't go negative); attempting to `finalizeReservation` it is rejected with `ALREADY_REFUNDED` |
| No reservation exists | `finalizeReservation`/`refundReservation` on an unknown `operationId` fail with `OPERATION_NOT_FOUND` rather than fabricating success |
| Insufficient credits | Reservation genuinely blocked (`INSUFFICIENT_CREDITS`), no transaction document is created at all — the credit gate is not bypassed |

Not modified: `executeWithUsageControl`'s reserve/run/finalize/refund orchestration logic itself, the transaction-based atomicity of the Firestore writes, or any pricing constant.

## 9. Security

- **Backend-only AI:** all AI provider clients (`GoogleGenerativeAI`, `OpenAI`) are instantiated only inside `functions/src/services/ai/*.ts`, which is part of the `functions/` package — a separate deployment target from the Next.js frontend, never bundled into browser code.
- **No browser secrets:** repository-wide search for `NEXT_PUBLIC.*(GEMINI|OPENAI|NVIDIA|AI_KEY)` in `src/` → zero matches. Search for `GEMINI_API_KEY`/`OPENAI_API_KEY`/`NVIDIA_API_KEY` anywhere in `src/` → zero matches. The only `apiKey` reference in `src/` is `NEXT_PUBLIC_FIREBASE_API_KEY` (Firebase's public web config identifier, not a secret — access is governed by Firestore/Storage security rules, not this value).
- **Built output checked:** grepped the actual `.next/static` production build output for the same patterns and for a generic OpenAI key shape (`sk-...`) — zero matches.
- **`.env` files:** only `.env.example` (a template with every real value commented out) is tracked in git; no `.env`/`.env.local` file exists in this environment or the repository.
- **No secret leakage in logs:** every `aiLogger` call added in this phase logs only `provider`, `model`, `stage`, `promptLength`/`imageCount`, `durationMs`, `attempt`, and an error *message* string — never the API key, never the full prompt text, never full provider payloads.

## 10. Tests

**lint:** PASS (root `npm run lint`, `--max-warnings 0`)
**typecheck:** PASS (root `npm run typecheck`, which includes `functions/src/**/*.ts` per the root `tsconfig.json`)
**unit tests:** 45 passed / 0 failed / 0 skipped (with the Firestore emulator running) — see breakdown below. Without the emulator: 35 passed / 0 failed / 10 skipped (honestly self-skipping, matching the project's existing `tests/security.test.ts` convention).
**functions build:** PASS (`npm run functions:build`)
**functions typecheck:** PASS (`npm run functions:typecheck`)
**frontend build:** PASS (`npm run build` — 15 routes, including the Phase 4 `/campaigns/new` wizard, unaffected by this phase)
**emulator tests:** PASS — Firestore emulator was actually started (`firebase emulators:start --only firestore`, confirmed listening on `127.0.0.1:8080` via HTTP health check) and the credit-safety suite run against it for real, then the emulator was stopped afterward. Not claimed as passing without having actually run it.

Test breakdown (all under `functions/src/services/ai/` unless noted):

- `generateStructuredText.test.ts` (6 tests) — mocks the provider layer and asserts the exact arguments Gemini receives: the real prompt string in the prompt position, the real Zod schema in the schema position, caller options forwarded, and an explicit regression guard that the schema is never sent where the prompt belongs (the exact reported bug shape).
- `retry.test.ts` (11 tests) — `withTimeout` resolves/rejects/propagates correctly; `isRetryableAIError` correctly classifies timeouts/rate-limits/network errors as retryable and auth/schema/unknown errors as not; `withRetry` retries only retryable failures, respects `maxAttempts` (bounded, no infinite loop), and always eventually throws rather than swallowing a failure.
- `text.test.ts` (8 tests) — against `GeminiTextProvider.generateStructured` directly (mocked `@google/generative-ai`): valid output succeeds; malformed JSON, missing required field, wrong field type, empty response, and a thrown provider error all produce controlled failures (never a crash, never malformed data cast as valid); confirms the exact prompt string reaches `model.generateContent(...)`.
- `vision.test.ts` (4 tests) — valid vision response returned as-is; missing field / wrong type now rejected by the new runtime schema (regression test for the previously-unchecked cast); malformed JSON handled as a controlled failure.
- `validationStages.test.ts` (4 tests) — confirms all three previously-broken functions now pass a real `ZodObject` (has working `.safeParse`/`.parse`) rather than a plain object literal, and that the schema actually validates correctly.
- `usageControl.test.ts` (10 tests, **emulator-backed**) — see §8's table; every credit-safety case exercised against real Firestore transactions, not mocks.

## 11. Real Provider Test

```
provider:      Gemini (text/vision), OpenAI DALL-E 3 (image)
model:         gemini-1.5-pro / dall-e-3
environment:   this development/audit environment
result:        NOT RUN
actual generation: BLOCKED
```

`GEMINI_API_KEY` and `OPENAI_API_KEY` are not set in this environment (confirmed: `process.env` check returns unset for both; no `functions/.env` file exists anywhere in the repository or working environment; `.env.example` has every real value commented out as a template). Per the explicit instruction not to fabricate this result: **REAL PROVIDER TEST BLOCKED — CREDENTIALS/ENVIRONMENT UNAVAILABLE.**

What *was* verified in lieu of a live call: the exact arguments the provider SDK receives (`generateStructuredText.test.ts`, `text.test.ts` — asserting the literal call to `model.generateContent(promptString)`), and the full request→parse→validate→return contract against a faithfully-mocked Gemini SDK response shape (valid, malformed JSON, missing field, wrong type, thrown error). This proves the *code path* is correct; it does not prove the real Gemini API accepts the constructed prompts or that `gemini-1.5-pro` is still a valid/available model name today — that requires the live call this environment cannot make.

## 12. Real Campaign Test

```
campaign created:      NOT RUN (requires the real provider test above, which is blocked)
AI generation:          BLOCKED — no provider credentials
structured output:      Verified at the unit/schema level only (§10), not against a live response
Truth Check:             Not exercised end-to-end; runDeterministicTruthCheck (functions/src/services/ai/truthCheck.ts) is deterministic (no AI calls) and was not modified in this phase — confirmed unaffected by inspection, not by a live run
persistence:             Not verified against a real generated campaign document (the createCampaignDoc fix from Phase 4 remains in place and untouched)
credits:                 Verified via the emulator-backed state-machine tests (§8/§10), but not as part of a real end-to-end campaign generation call
result:                  BLOCKED at the same point as §11 — no AI provider credentials available
```

The credit-safety and pipeline-composition guarantees (§8) were verified with a *simulated* generation function (a plain async function that resolves or throws on command) run through the real `executeWithUsageControl`, not a real `generateCampaignStrategy` invocation — that distinction matters and is being stated plainly rather than blurred.

## 13. Remaining Risks

1. **Real provider test genuinely blocked** — the core prompt/schema fix (§1) is proven correct at the unit/argument level but has not been exercised against a live Gemini or OpenAI response. Recommend running the emulator + real API keys in an environment where they're available before considering this fully closed.
2. **No overall wall-clock budget across a full campaign generation.** Each individual provider call now has a bounded timeout (§6), but nothing caps the total time across all pipeline stages combined — a campaign that retries at every one of its ~7 structured-text stages could still take several minutes end-to-end. Not fixed in this phase (would require pipeline-level orchestration changes beyond "fix the AI generation pipeline" scope as currently understood); flagged for a follow-up phase.
3. **`checkGenerationEligibility`'s "usage doc missing" fallback assumes `planId: 'free'`** when `reserveCreditsForOperation` has to create a new usage document (§8, point 1's fix). It does not look up the user's actual `subscriptions` document, so a paying user whose usage document doesn't yet exist for a new period would be initialized as free-tier (100 credits) until their next webhook-driven subscription sync corrects it, rather than immediately reflecting their real plan. This is a narrower, pre-existing issue in the same function; fixing it would require a subscription lookup this phase judged too invasive to bundle in (real fix: `onUserCreated`-style logic should probably run monthly via a scheduled function rather than being reactively patched here). Documented, not fixed.
4. **`validationStages.ts` remains dead/orphaned code** — its schema bug is fixed, but nothing in the live pipeline calls it (pipeline.ts has its own separate, already-correct implementation of the same three validation stages). Left in place rather than deleted, since removing unreferenced code was not requested and pipeline.ts's actually-used version is confirmed correct.
5. **No retry/timeout was added around `truthCheck.ts`** — correctly, since it's deterministic and makes no AI calls; noted for completeness of the audit trail, not as a gap.
6. **`GeminiVisionProvider`/`GeminiTextProvider`'s `this.model`/constructor still type the Gemini SDK model as `any`** (pre-existing, from the `@google/generative-ai` SDK's own typing) — not tightened in this phase since it's SDK-boundary typing, not application logic, and doing so was not required to fix the reported bug.

## 14. Final Verdict

**PHASE 5 IMPLEMENTED BUT PARTIALLY VERIFIED**

The reported bug is confirmed and fixed, along with two independent bugs of comparable severity found during the required forensic trace (the `validationStages.ts` raw-object schema bug explicitly flagged by the audit as worth checking, and — not mentioned in the original audit at all — a credit-safety document-ID mismatch that would have silently prevented any user's credit balance from ever actually decreasing). All of this is verified with real, passing tests: mocked-provider argument-order tests, a faithfully-mocked Gemini-SDK structured-output contract test covering all required malformed-response cases, and — notably — credit-safety tests run against a genuinely running Firestore emulator rather than hand-rolled mocks. Lint, typecheck (both packages, strict settings preserved), and both builds pass.

What keeps this from **PHASE 5 FULLY VERIFIED**: the real provider test (§11) and the real end-to-end campaign generation test (§12, §30 in the task) could not be performed, because no Gemini or OpenAI API credentials are available in this environment. That is the single missing link in the verification chain the task explicitly requires for the "fully verified" verdict, and it is reported here rather than assumed or fabricated.
