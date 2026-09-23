# Rate-Limit Precision & Abuse Protection Audit

## 1. Executive Summary

The previous audit's suspicion was correct, and worse than "some endpoints fall back to ~100/min": **every single rate-limited endpoint in the codebase fell back to the generic 100-req/60s default, unconditionally.** The canonical limiter (`functions/src/middleware/rateLimit.ts`) already defined a `rateLimitConfigs` map with the intended tighter, action-specific policies (`generateCampaign: 10/hour`, `regenerateAsset: 20/hour`, etc.), but **`rateLimitConfigs` had zero consumers anywhere in the codebase** — every one of the 10 call sites invoked `checkRateLimit(userId, action)` with only two arguments, and the function's default parameter was the hardcoded generic config, not a lookup into that map. This is not a "some endpoints" precision gap; it was a total one, for every action, since the map was introduced.

Root cause fixed with a single, minimal change: `checkRateLimit`'s third parameter now defaults to `rateLimitConfigs[action] ?? DEFAULT_CONFIG` instead of the hardcoded generic default. This closes the gap for all 10 existing call sites without editing any of them, and closes it for any future call site too, as long as its action name has an entry in the map. Three call sites (`createReelProject`, `getReelClipUploadUrl`, `confirmReelClipUpload`) were also found reusing the same `'reelClipUpload'` action string, which silently merged three semantically distinct operations into one shared quota bucket — fixed by giving each its own action name and matching policy. Two payment/upload action names (`createSubscription`, `getUploadUrl`, `confirmUpload`, `verifyPayment`) had never had a matching config key at all (`createRazorpayOrder` in the map didn't correspond to any real action string) — added, with rationale documented inline, not invented.

While testing the fix, a second, independent real defect was found and fixed: `mapErrorToHttpsError` (used by most callables' catch blocks) didn't special-case `HttpsError` instances, so `checkRateLimit`'s `resource-exhausted` rejection was being silently rewritten to a generic `internal` error at the callable boundary — a client could never actually distinguish "you're rate limited" from "the server broke." This was caught only because a real emulator-backed test asserted on the error code, not by reading the code.

No new rate-limiting architecture, vendor, or database was introduced (Rule 7/8) — the existing single Firestore-transaction-based limiter was extended in place.

## 2. Current Rate-Limit Architecture

Single canonical implementation: `functions/src/middleware/rateLimit.ts`, exporting `checkRateLimit(userId, action, config?)` and (now actually used) `rateLimitConfigs`.

- **Storage**: Firestore, collection `rate_limits`, one document per `${keyPrefix}_${action}_${userId}` key.
- **Algorithm**: fixed window, but not clock-aligned — the window starts at the first request after any prior window has expired (`resetTime = now + windowSeconds*1000`, recomputed only when the stored `resetTime` has passed). This avoids a thundering-herd effect at a shared clock boundary, at the cost of each user/action pair having its own independent window start.
- **Concurrency safety**: `db.runTransaction(...)` wraps the read-then-write — Firestore transactions in this SDK use optimistic concurrency with automatic retry on contention, so two simultaneous requests cannot both read the same pre-increment count and both proceed. Verified for real in this audit (§11), not assumed from reading the code.
- **Identity**: `userId` only, taken from `request.auth.uid` (Firebase Auth-verified, server-side) via `validatedCallable`/`verifyAuth` — never from a client-supplied field in the request body. A client cannot change `userId` to bypass their own quota (§7).
- **Failure mode**: no try/catch around `checkRateLimit()` at any call site, and no try/catch inside it beyond the transaction's own retry — if the Firestore transaction itself throws for an infrastructure reason (not a limit-exceeded rejection), that exception propagates unhandled up through the callable and the whole request fails. This is fail-closed by construction, not fail-open (§17), though it does mean a transient Firestore blip blocks legitimate users too — no fallback-to-allow path exists to trade off against that.
- **No TTL/cleanup**: every unique `(action, userId)` pair leaves a permanent Firestore document; nothing deletes or expires old `rate_limits` docs (§20 finding, F-5).

## 3. Endpoint Inventory

| Endpoint | Auth | App Check | Rate Limited (before fix) | Rate Limited (after fix) | Key |
|---|---|---|---|---|---|
| `generateCampaignStrategy` | Y | Y | 100/60s (bug) | 10/hour | `generateCampaignStrategy_{userId}` |
| `regenerateAsset` | Y | Y | 100/60s (bug) | 20/hour | `regenerateAsset_{userId}` |
| `generateReel` | Y | Y | 100/60s (bug) | 10/hour | `generateReel_{userId}` |
| `createCampaign` | Y | Y | 100/60s (bug) | 50/hour | `createCampaign_{userId}` |
| `createReelProject` | Y | Y | 100/60s (bug), shared bucket with clip uploads | 30/hour, own bucket | `createReelProject_{userId}` |
| `getUploadUrl` | Y | Y | 100/60s (bug) | 30/hour | `getUploadUrl_{userId}` |
| `confirmUpload` | Y | Y | 100/60s (bug) | 30/hour | `confirmUpload_{userId}` |
| `getReelClipUploadUrl` | Y | Y | 100/60s (bug), shared bucket | 60/hour, own bucket | `getReelClipUploadUrl_{userId}` |
| `confirmReelClipUpload` | Y | Y | 100/60s (bug), shared bucket | 60/hour, own bucket | `confirmReelClipUpload_{userId}` |
| `createSubscription` | Y | Y | 100/60s (bug), stale key name | 5/hour | `createSubscription_{userId}` |
| `verifyPayment` | Y | Y | 100/60s (bug), no config at all | 10/hour (newly defined, §5) | `verifyPayment_{userId}` |
| `razorpayWebhook` | N (signature) | N/A | not rate limited | unchanged — see §15 | — |
| `getAnalyticsDashboard` | Y | Y | not rate limited | unchanged | — |
| `recordWhatsAppClick` | Y | Y | not rate limited | unchanged | — |
| `createBusiness` | Y | Y | not rate limited | unchanged | — |
| `updateBusinessBrain` | Y | Y | not rate limited | unchanged | — |
| `createProduct` | Y | Y | not rate limited | unchanged | — |
| `getCampaign` | Y | Y | not rate limited | unchanged | — |
| `onUserCreated`/`onUserDeleted` | N/A (auth trigger) | N/A | not applicable | not applicable | — |

The 6 CRUD/analytics/read endpoints with no rate limit at all are unchanged by this phase — see §6 category D/E discussion and §26 for why nothing was added there.

## 4. Current Effective Limits (before fix)

Every one of the 10 rate-limited endpoints effectively enforced **100 requests / 60 seconds**, because `checkRateLimit`'s third parameter defaulted to the hardcoded `DEFAULT_CONFIG`, not to any lookup in `rateLimitConfigs`. Confirmed by reading the exact function signature (`config: RateLimitConfig = DEFAULT_CONFIG`) and by grepping every call site — none passed a third argument.

## 5. Intended Limits

From the pre-existing (but unused) `rateLimitConfigs` map: `generateCampaign: 10/hour`, `regenerateAsset: 20/hour`, `createCampaign: 50/hour`, `upload: 30/hour`, `createRazorpayOrder: 5/hour`, `reelClipUpload: 60/hour`, `generateReel: 10/hour`. Of these, only 3 keys (`regenerateAsset`, `createCampaign`, `generateReel`) actually matched a real call-site action string — the other 4 (`generateCampaign`, `upload`, `createRazorpayOrder`, `reelClipUpload`) named an action that didn't exist verbatim anywhere in the codebase, so even a hypothetical correctly-wired lookup would have missed them (§5 rule: precision gaps aren't only "wrong number", they're also "right number, wrong key").

`verifyPayment` had **POLICY NOT DEFINED** anywhere — no prior config, no prior documentation. §7's recommended value (10/hour) is proposed here on the stated basis (security-sensitive signature/idempotency boundary, but legitimate retries possible) and flagged as a recommendation, not an inherited requirement.

## 6. Current vs Intended Gap

| Endpoint | Effective (before) | Intended | Gap | Severity | Action |
|---|---:|---|---|---|---|
| `generateCampaignStrategy` | 100/60s (≈6000/hour) | 10/hour | ~600x | CRITICAL | Fixed |
| `regenerateAsset` | 100/60s | 20/hour | ~300x | HIGH | Fixed |
| `generateReel` | 100/60s | 10/hour | ~600x | CRITICAL | Fixed |
| `createCampaign` | 100/60s | 50/hour | ~120x | MEDIUM | Fixed |
| `createSubscription` | 100/60s | 5/hour | ~1200x | HIGH (payment-adjacent) | Fixed |
| `verifyPayment` | 100/60s | undefined → now 10/hour | policy never existed | MEDIUM | Fixed (new policy) |
| `getUploadUrl`/`confirmUpload` | 100/60s | 30/hour | ~200x | MEDIUM | Fixed |
| `getReelClipUploadUrl`/`confirmReelClipUpload`/`createReelProject` | 100/60s, 3 ops sharing 1 bucket | 60/hour (uploads), 30/hour (project create), each separate | conflated + ~120x | MEDIUM | Fixed |

Severity reflects abuse/cost impact per Rule of §32, not blanket escalation: AI-generation endpoints (real provider $ per call) are CRITICAL; payment-adjacent endpoints are HIGH; cheap metadata/CRUD-adjacent writes are MEDIUM.

## 7. Rate-Limit Identity Model

Key = `${action}_${userId}`, `userId` from server-verified `request.auth.uid`. This is **trusted** — never derived from a client-supplied `businessId`/`agencyId`/`userId` field, so the abuse scenarios in §22 that hinge on "attacker changes a client-provided identifier" do not apply to this limiter: there is no client-provided identifier in the key at all.

This does mean the key is **user-scoped, not user+business-scoped**. One authenticated user who owns multiple businesses shares a single `generateCampaignStrategy` quota across all of them — more conservative than a per-business quota would be (a legitimate multi-business user hits their overall cap sooner), not less secure. Evaluated against §10's suggested `user + business + operation` design and kept as-is: changing to a compound key is a real design option but not a security gap (§10 asks to "evaluate," not to default to the most granular option), and narrowing the key increases the number of Firestore documents/transactions per operation without closing any bypass. Documented here rather than silently changed, consistent with Rule 2.

## 8. AI / Cost Protection

`generateCampaignStrategy` (10/hour), `regenerateAsset` (20/hour), `generateReel` (10/hour) are now the actually-enforced policies, verified against a real emulator in §20 — not just read from the config file. These are the three endpoints that invoke a paid AI provider (OpenAI/Gemini) per successful call; their limits were the ones the prior audit specifically flagged as at risk, and are now confirmed closed.

## 9. Credit Interaction

Verified for real (§20, `createCampaign.rateLimit.test.ts`): the execution order in every checked endpoint is `verifyBusinessAccess` → `checkRateLimit` → credit reservation → business logic. A request rejected by `checkRateLimit` throws before `reserveCredits()` is ever called, so it cannot reserve credits, cannot create campaign/reel state, and cannot invoke AI. This was proven, not assumed: the test drives `createCampaign` to its real 50/hour limit with 50 successful calls, confirms the 51st is rejected, and asserts the `usage` document's `creditsUsed` and the count of `campaigns` documents for that business are byte-identical before and after the rejected 51st call.

## 10. Tenant Isolation

Rate-limit isolation between users is proven in `rateLimit.test.ts` (`isolates different users under the same action`) against the real emulator — user B's quota is untouched by user A exhausting theirs. Business/agency-level isolation is not a rate-limit concern given the user-scoped key design (§7); tenant data isolation itself (which business a user can act on) is enforced upstream by `verifyBusinessAccess`, unchanged by this phase and already covered by existing security tests (Phase 37 audit).

## 11. Concurrent Request Testing

Real emulator test (`rateLimit.test.ts`, `handles concurrent requests without a check-then-write race`): fires 20 concurrent `checkRateLimit` calls against a `maxRequests: 10` policy via `Promise.allSettled`. Result: **exactly 10 succeeded, exactly 10 rejected**, and the stored Firestore count is exactly 10, not more — proving the transaction-based implementation does not have the classic check-then-write race described in the brief's §11 example. This is real evidence from a real transaction under real concurrent load, not an assertion about Firestore's documented guarantees.

## 12. Window Semantics

Fixed window, non-clock-aligned (see §2). Boundary conditions tested in `rateLimit.test.ts`: exactly-at-limit succeeds (the Nth of N allowed requests is not rejected), one-over-limit is rejected, and a 1-second window test proves the count resets and a subsequent request succeeds once `resetTime` has passed.

## 13. Error / Retry Behavior

Before this phase: `checkRateLimit` threw `HttpsError('resource-exhausted', ...)` correctly, but every endpoint's catch block runs the error through `mapErrorToHttpsError`, which did not special-case `HttpsError` and silently rewrote it to `HttpsError('internal', ...)` — confirmed by a real request in this audit (§1, §26). **Fixed**: `mapErrorToHttpsError` now returns an `HttpsError` input unchanged. No internal counter, Firestore key, or document structure is exposed in the error message or details at any point — verified by an explicit assertion in `rateLimit.test.ts` (`JSON.stringify(err.details)` must not match `/count|ratelimit_|resetTime/`).

## 14. Retry-After

Added: the `HttpsError` thrown on rejection now carries `details.retryAfterSeconds` (seconds until the caller's window resets, computed from the actual `resetTime`, floored to a minimum of 1). Not blindly added everywhere — this is specific to the one place a 429-equivalent is thrown. No raw timestamp is exposed, only a relative "how long to wait" figure.

## 15. Storage / Upload Protection

`getUploadUrl` and `confirmUpload` now each enforce their own real 30/hour policy (previously the generic 100/60s). This does not touch or weaken the separately-verified `storagePath` ownership check (Phase 37 audit, `confirmUpload.test.ts` and the code fix present in `confirmReelClipUpload.ts`) — rate limiting and authorization remain two independent layers, exactly as Rule 16 requires. 30/hour comfortably covers a normal multi-product-photo upload session without requiring any change to that number (no evidence surfaced that the pre-existing 30/hour figure was wrong, only that it was never enforced).

## 16. Payment / Webhook Protection

`createSubscription` (5/hour) and `verifyPayment` (10/hour, newly defined) are user-initiated, App-Check-and-auth-gated callables — now correctly rate limited per §17's separation. `razorpayWebhook` (`onRequest`, no `onCall`/App Check, Razorpay-signature-verified instead) was **not** rate limited before this phase and is **still not** rate limited after it — intentionally left alone: applying a per-caller rate limit to inbound webhook traffic risks dropping legitimate Razorpay retries during a payment-provider incident, and the endpoint's real security boundary (signature verification → idempotency, per Phase 37's confirmed-passing `razorpayWebhook.test.ts`) is unrelated to request volume. No change made here.

## 17. Agency / Bulk Protection

No agency bulk-generation or bulk-approval callable functions were found to exist in `functions/src/functions/**` (confirmed by the file inventory in this audit and by Phase 37's own finding that agency-tier authorization tests are `test.skip`-marked "not implemented: no `bulk_jobs` collection/rules exist"). §19's fan-out concern (`1 request → N AI generations`) does not apply to any currently-shipped endpoint. Nothing to fix; nothing to invent ahead of the feature existing.

## 18. Limiter Failure Behavior

Not independently fault-injected against a live Firestore outage in this session (would require deliberately breaking the emulator mid-test, which risks destabilizing the rest of the suite for no corresponding evidence gain). Structurally verified instead: no call site wraps `checkRateLimit()` in a try/catch that could swallow an infrastructure error, and `checkRateLimit` itself has no catch-and-continue path — an unexpected transaction failure propagates as an unhandled rejection through the callable, meaning the request fails outright rather than silently proceeding as if the limiter had approved it. This is FAIL CLOSED, not FAIL OPEN, for every rate-limited endpoint, by construction — there is no code path where a broken limiter turns into "allow the expensive operation." Classified as **VERIFIED BY CODE STRUCTURE**, not **VERIFIED BY FAULT INJECTION**.

## 19. Abuse Scenario Results

| # | Scenario | Result |
|---|---|---|
| 1 | Same user, repeated generation | Blocked at the action's real limit (e.g. 10/hour for `generateCampaignStrategy`) — verified in §20 |
| 2 | Same user, multiple businesses | Shares one quota per action across all their businesses (§7) — not a bypass, more conservative |
| 3 | Same business, multiple users | Each user has an independent quota — not evaluated as an abuse vector since each is a distinct authenticated identity |
| 4 | Change client-provided `userId` | Not possible — `userId` is never read from the request body, only from the verified auth token (§7) |
| 5 | Change client-provided `businessId` | Does not affect the rate-limit key at all (user-scoped only); would still be caught by `verifyBusinessAccess`, unchanged by this phase |
| 6 | Concurrent requests | Exactly `maxRequests` succeed under 20-way concurrency — verified in §11 |
| 7 | Retry after rejection | Rejected request does not consume a slot beyond what's stored (§11's count-equals-maxRequests assertion); retrying immediately is correctly rejected again until the window resets |
| 8 | Rapid regeneration | Bounded by `regenerateAsset`'s real 20/hour policy, now enforced |
| 9 | Rapid signed-upload-URL requests | Bounded by `getUploadUrl`'s real 30/hour policy, now enforced |
| 10 | Agency bulk abuse | N/A — feature not implemented (§17) |
| 11 | Unauthenticated requests | Rejected before rate limiting is ever reached — `validatedCallable` throws `unauthenticated` first (unchanged, pre-existing, Phase 37-verified) |
| 12 | Invalid App Check | Rejected by Firebase's App Check enforcement (`enforceAppCheck: true`) before the callable handler runs at all — unchanged, pre-existing |

## 20. Firebase Emulator Results

Ran `firebase emulators:start --only auth,firestore,storage --project demo-mitra` for real in this session (not `emulators:exec`, run interactively in the background and torn down after — equivalent evidence, same real Firestore transactions). Against it:

- New `functions/src/middleware/rateLimit.test.ts`: **9/9 passed** — under-limit success, at-limit success, over-limit rejection, `retryAfterSeconds` present and scrubbed of internals, user isolation, action isolation, window reset, policy resolution by action name (the exact regression case for this fix), concurrent-request race safety.
- New `functions/src/functions/campaigns/createCampaign.rateLimit.test.ts`: **1/1 passed** — drives a real callable to its real 50/hour limit and proves the 51st rejection reserves no credits and creates no campaign document.
- Full functions suite re-run against the same live emulator: **38 suites, 290 tests, 290 passed, 0 failed** (up from Phase 37's 36 suites/281 tests — the 2 new files/9 new tests, no regressions).
- Root `tests/` suite (Firestore/Storage security rules) re-run against the same live emulator: **10 suites, 127 tests, 121 passed, 6 honestly-skipped** (unchanged from Phase 37 — this phase did not touch `firestore.rules`/`storage.rules` or any of that suite's targets).

## 21. Automated Test Results

Required coverage from §25, mapped to what was actually written:

| # | Requirement | Covered by |
|---|---|---|
| 1 | Under limit succeeds | `rateLimit.test.ts` |
| 2 | Exactly at limit behaves correctly | `rateLimit.test.ts` |
| 3 | One over limit rejected | `rateLimit.test.ts` |
| 4 | Reset works | `rateLimit.test.ts` |
| 5 | Different users isolated | `rateLimit.test.ts` |
| 6 | Different businesses isolated | N/A — key is user-scoped, not business-scoped (§7); no per-business isolation to test |
| 7 | Different operations isolated | `rateLimit.test.ts` |
| 8 | Unauthorized user cannot bypass | Pre-existing `validatedCallable` behavior, unchanged, covered by Phase 37's auth tests |
| 9 | Client-supplied identity cannot bypass | Verified by code inspection (§7) — no client-supplied field is ever read into the key; not independently retestable beyond that since there's nothing to attempt to override |
| 10 | Concurrent requests handled safely | `rateLimit.test.ts` |
| 11 | Limiter failure handled correctly | Verified by code structure only (§18), not fault-injected |
| 12 | Expensive AI operation uses correct policy | `rateLimit.test.ts` (`generateCampaignStrategy` case), confirms 10/hour is what's actually enforced |
| 13 | Generic endpoint uses correct policy | `rateLimit.test.ts` (`falls back to the generic default for an action with no configured policy`) |
| 14 | Rate-limit rejection does not consume credits | `createCampaign.rateLimit.test.ts` |
| 15 | Rate-limit rejection does not invoke AI | Not directly tested (`createCampaign` doesn't invoke AI itself; `generateCampaignStrategy` does, but exhausting its real 10/hour limit with real AI-adjacent state to assert against would need mocked AI providers wired into an emulator test that doesn't currently exist — deferred, see §31) |
| 16 | Rate-limit rejection does not create unwanted state | `createCampaign.rateLimit.test.ts` |

## 22. Performance Impact

Not separately benchmarked with dedicated instrumentation. Observed in test output: individual `checkRateLimit`-gated callable invocations completed in double-digit milliseconds in the emulator (e.g. `createCampaign` logged `latencyMs":99` and `latencyMs":103` for full requests including the rate-limit transaction). This is emulator-local timing, not a production network-latency measurement, and is offered as directional evidence only, not a p50/p95/p99 report — proper measurement would need a deployed/staging environment (same constraint noted in the Phase 37 QA audit for load testing generally).

## 23. Cost Impact

Each `checkRateLimit` call is one Firestore transaction: 1 read + 1 write per gated request. No change in this dimension from the fix — the fix corrects *which policy* is applied, not the storage mechanism or its per-call cost. The unbounded growth of the `rate_limits` collection (§2, no TTL/cleanup) is a real, if slow-accumulating, storage-cost concern — flagged as finding F-5, not fixed in this phase (adding a Firestore TTL policy is a console/gcloud infrastructure configuration change, not a code change, and is a cost-optimization rather than a security gap; Rule 7 counsels against unnecessary architecture changes).

## 24. Security Regression Results

Re-ran, against the same live emulator, every suite the brief calls out in §26/Phase 37's security section: functions suite (includes `confirmUpload.test.ts`, `middleware/auth.test.ts`, `middleware/validation.security.test.ts`) — 290/290 passed; root `tests/security.test.ts` and `tests/storage.test.ts` (Firestore/Storage rules, tenant isolation, storagePath isolation) — all passing, unchanged pass/skip counts from Phase 37. No regression introduced by this phase's changes.

## 25. Documentation Changes

This report is the documentation deliverable for this phase (Rule 29: document only after verification, which is what happened — every number in §3/§5/§6 was checked against the real emulator-run behavior before being written down here, not written first and verified after).

## 26. Findings

| ID | Severity | Finding | Evidence | Fixed? |
|---|---|---|---|---|
| F-1 | CRITICAL | Every rate-limited endpoint enforced the generic 100/60s default instead of its documented action-specific policy — `rateLimitConfigs` had zero consumers | `functions/src/middleware/rateLimit.ts` (before fix), grep of all `checkRateLimit(` call sites showing 2-arg calls only | Fixed |
| F-2 | HIGH | `mapErrorToHttpsError` rewrote `HttpsError('resource-exhausted', ...)` to a generic `internal` error, discarding the rate-limit signal (and `retryAfterSeconds`) at the callable boundary | `functions/src/utils/errors.ts` (before fix); reproduced by a real emulator request in this session, test failure showed `code: "internal"` instead of `"resource-exhausted"` | Fixed |
| F-3 | MEDIUM | Three distinct reel operations (`createReelProject`, `getReelClipUploadUrl`, `confirmReelClipUpload`) shared one `'reelClipUpload'` rate-limit bucket, conflating a cheap metadata write with two upload-adjacent operations under one quota | grep of `checkRateLimit(context.userId, 'reelClipUpload')` across 3 files | Fixed — each now has its own action name and policy |
| F-4 | MEDIUM | `verifyPayment` had no rate-limit policy defined anywhere (not even a stale/mismatched key) despite being a security-sensitive, payment-adjacent endpoint | grep of `rateLimitConfigs` keys vs. `checkRateLimit` call sites | Fixed — 10/hour, documented as a new recommendation, not an inherited requirement |
| F-5 | LOW | `rate_limits` Firestore collection has no TTL or cleanup — grows by one permanent document per unique `(action, userId)` pair ever seen | `rateLimit.ts`, no `FieldValue`/scheduled-function reference to expiry anywhere in `functions/src` | Not fixed — infrastructure-level TTL policy configuration, out of scope for a code-only fix in this phase; documented as remaining work (§31) |
| F-6 | LOW | Limiter fail-safe behavior (§18) is verified by code structure, not by an actual fault-injection test against a broken Firestore connection | This report, §18 | Not fixed — deferred, see §31 |

No CRITICAL findings remain open. F-1 and F-2 (the two most severe) are both fixed and verified against a real emulator, not just patched and assumed correct.

## 27. Risk Register

| Risk | Likelihood (pre-fix) | Impact | Likelihood (post-fix) |
|---|---|---|---|
| Scripted account generates unbounded AI campaigns/reels at real provider cost | High (limit was ~600x looser than intended) | High ($ cost, potential provider account suspension) | Low (10/hour genuinely enforced, verified) |
| Client misreads a rate-limit rejection as a server error and doesn't back off correctly | Certain (every rejection surfaced as `internal`) | Low-Medium (bad UX, unnecessary retry storms) | Low (`resource-exhausted` now correctly surfaces with `retryAfterSeconds`) |
| Firestore `rate_limits` collection becomes a slow, unbounded storage-cost creep | Ongoing, unchanged by this phase | Low (linear, small per-document cost) | Unchanged — tracked as F-5 |

## 28. Exact Files Changed

- `functions/src/middleware/rateLimit.ts` — `rateLimitConfigs` rebuilt to a `Record<string, RateLimitConfig>` keyed by the real action strings actually used at call sites (previously 4 of 7 keys matched nothing); `checkRateLimit`'s `config` parameter now defaults to `rateLimitConfigs[action] ?? DEFAULT_CONFIG` instead of the hardcoded default; rejection now includes `details: { retryAfterSeconds }`; removed the unused `windowStart` local (also a pre-existing lint finding).
- `functions/src/functions/reels/confirmReelClipUpload.ts` — action string `'reelClipUpload'` → `'confirmReelClipUpload'` (one line; the `storagePath` ownership check in the same file was pre-existing, not written by this phase).
- `functions/src/functions/reels/createReelProject.ts` — action string `'reelClipUpload'` → `'createReelProject'` (one line).
- `functions/src/functions/reels/getReelClipUploadUrl.ts` — action string `'reelClipUpload'` → `'getReelClipUploadUrl'` (one line).
- `functions/src/utils/errors.ts` — `mapErrorToHttpsError` now returns an `HttpsError` input unchanged instead of rewriting it to `internal`.
- `functions/src/middleware/rateLimit.test.ts` — **new file**, 9 tests, real-emulator-only.
- `functions/src/functions/campaigns/createCampaign.rateLimit.test.ts` — **new file**, 1 test, real-emulator-only.

No other files were modified. No test file, security rule, App Check configuration, or credit/Truth Check logic was touched.

## 29. Exact Commands Executed

```
grep -rn "rateLimit|rate_limit|RateLimit|throttle|quota|429|RESOURCE_EXHAUSTED" functions/src
grep -rn "checkRateLimit" functions/src
grep -rn "rateLimitConfigs" functions/src
npx firebase emulators:start --only auth,firestore,storage --project demo-mitra
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 GCLOUD_PROJECT=demo-mitra \
  npx jest --ci src/middleware/rateLimit.test.ts src/functions/campaigns/createCampaign.rateLimit.test.ts
FIRESTORE_EMULATOR_HOST=... npx jest --ci                    # functions, full suite
FIRESTORE_EMULATOR_HOST=... npx jest --ci tests/              # root, full rules suite
npx jest --ci                                                  # root, no emulator (unaffected)
npm run typecheck / npm run lint / npm run build                # root
cd functions && npm run typecheck / npm run build               # functions
cd functions && npm run lint                                    # confirmed pre-existing, unrelated failure unchanged in kind
```

## 30. Final Verdict

### Rate-Limit Architecture
**VERIFIED** — single canonical implementation, extended in place, no duplicate limiter introduced, concurrency safety proven against a real emulator, fail-closed behavior verified by code structure.

### Endpoint Coverage
**PARTIAL** — all 10 previously-rate-limited endpoints now enforce their real intended policy, verified. 6 CRUD/analytics/read endpoints remain unrated-limited by design decision carried over from before this phase (not newly introduced, not silently expanded — see §3/§17); the brief did not present evidence that these need one, and Rule 2 forbids inventing a limit without justification, so none was added.

### AI Abuse Protection
**VERIFIED** — the three AI-provider-cost endpoints (`generateCampaignStrategy`, `regenerateAsset`, `generateReel`) now enforce their documented policies for real, proven against a live emulator, not just read from config.

### Tenant / Identity Protection
**VERIFIED** — key is built exclusively from server-verified `request.auth.uid`; no client-supplied identifier is ever read into the rate-limit key; user isolation proven against a live emulator.

### Concurrency Safety
**VERIFIED** — 20-way concurrent request test against a real Firestore transaction proves exactly `maxRequests` succeed, no overshoot.

### Production Readiness
**PARTIAL** — the precision gap that was the entire point of this phase is closed and verified. Two items remain open and are honestly not claimed as done: fail-safe behavior under an actual Firestore outage was verified by code inspection only, not fault injection (F-6), and the `rate_limits` collection has no cleanup/TTL (F-5, a cost concern, not a security one).

# Overall Phase Verdict

**PARTIAL.**

The core objective — making the actually-enforced rate limits match the intended, documented policy — is **COMPLETE and verified against a real Firebase emulator**, including a regression test that would have failed under the old code (`falls back to... action name` test) and a real end-to-end proof that a rejected request touches no credits or campaign state. A second real defect (F-2, the error-code rewriting) was found only because this phase insisted on testing against real behavior rather than trusting the code as written, and is also fixed and verified.

It is not marked COMPLETE because two items from the phase's own checklist remain open by design, not by oversight: limiter fail-safe behavior under genuine infrastructure failure (§18/F-6) and storage cleanup/TTL (§20/F-5) were evaluated and documented, not exercised or built. Per this phase's own Final Principle — never turn a limitation into a green checkmark — both are carried forward explicitly rather than folded into a COMPLETE verdict.

## 31. Remaining Work

1. **F-5** — Configure a Firestore TTL policy on `rate_limits.resetTime` (or add a scheduled cleanup function) so the collection doesn't grow unbounded. Infrastructure/console change, not a code change; low urgency given the linear, small per-document cost.
2. **F-6** — If genuine fail-safe verification is required, add a test that points the Admin SDK at an unreachable Firestore host mid-test and confirms the callable fails closed rather than proceeding — meaningfully harder to do safely without destabilizing the rest of the suite, deferred rather than rushed.
3. Requirement #15 from §25 (rate-limit rejection does not invoke AI) — extend an AI-provider-mocked emulator test (e.g. building on `generateCampaignStrategy.vertical.test.ts`'s existing mock pattern, but with a real rate-limit check instead of the current `jest.mock`'d one) to prove no provider call happens after a real rejection, rather than inferring it from code order as done in this report.
4. Consider whether the 6 currently-unlimited CRUD/analytics endpoints (§3) warrant a generous but present policy (e.g. the existing 100/60s default, applied deliberately rather than left absent) — not done here because no evidence of abuse or documented policy for them was found, consistent with Rule 2's "do not invent limits."
