# Phase 38B — Rate-Limit Follow-Up: Fault Injection & TTL Specification

Follow-up to `docs/PHASE_38_RATE_LIMIT_PRECISION_AUDIT_REPORT.md`, narrowly scoped to its two carried-forward items only. Per direction: the ten rate-limited endpoints and the limiter's core design are not revisited here — Phase 38's precision fix is treated as settled.

**Phase 38's core rate-limit precision objective: VERIFIED** (unchanged from Phase 38 — every endpoint's actually-enforced policy matches its documented intent, proven against a real emulator). This report only addresses the two items that kept Phase 38 at PARTIAL.

## 1. Firestore Outage / Fail-Safe Verification — now genuinely fault-injected

### What was done

Two new test files, both gated behind `SIMULATE_FIRESTORE_OUTAGE=1` and requiring their own dedicated `jest` invocation with `FIRESTORE_EMULATOR_HOST` pointed at port `1` (a low reserved port nothing binds to — the OS refuses the connection immediately, a genuine network-level failure, not a mock):

- `functions/src/middleware/rateLimit.test.ts` → renamed conceptually, actual new file `functions/src/middleware/rateLimit.failSafe.test.ts` — calls the real `checkRateLimit` directly against the unreachable host.
- `functions/src/functions/campaigns/generateCampaignStrategy.failSafe.test.ts` — calls the real `generateCampaignStrategy` callable end-to-end, with every collaborator mocked (auth, Firestore business/product docs, usage control, AI pipeline, analytics) **except `middleware/rateLimit`**, so the only real network call in the test is `checkRateLimit`'s own Firestore transaction. This directly answers the diagram from the request:

```
Firestore rate-limit state unavailable
        v
checkRateLimit()
        v
Does request proceed?           -> No (never resolves successfully)
Does AI execute?                -> No (GenerationPipeline.execute mock: 0 calls)
Does credit reservation happen? -> No (executeWithUsageControl mock: 0 calls)
```

### What was actually observed (this is the interesting part)

Run directly and watched at increasing timeouts — 20s, then 90s, then a full 182s — `checkRateLimit`'s promise against the unreachable host **never settled at all**: not resolved, not rejected. This is a real, load-bearing finding, not a formality:

- **There is no application-level timeout wrapping the Firestore transaction in `rateLimit.ts`.** The gRPC client under the Admin SDK retries with its own internal backoff on a refused connection, and nothing in this codebase bounds that.
- In production, the actual bound on this hang is whatever Cloud Functions' own platform-level execution timeout is for the calling function. `generateCampaignStrategy` and `createCampaign` set no explicit `timeoutSeconds` in their `onCall(...)` config (unlike `generateReel`, which explicitly sets `timeoutSeconds: 540`) — so they run under the Firebase Functions v2 default, documented as 60 seconds, **not independently re-verified against current GCP documentation in this session** (no live GCP console access here; stated as "documented default," not confirmed against the deployed project's actual config).
- This means the honest, evidence-based answer to "does a Firestore outage fail closed?" is: **yes, but slowly and by platform intervention, not by clean application-level error handling.** A genuinely broken Firestore does not turn into "unlimited AI access" — the request never completes successfully, and neither the AI pipeline nor credit reservation is ever reached (both proven with mock call-count assertions, 0 calls in each case) — but the client-visible failure mode in that scenario would be a hung request for up to ~60s before the platform kills it with a timeout error, not a fast, specific "rate limiter unavailable, try again" response.

### What the tests actually assert (and why, honestly)

Waiting out the full ~60-180s hang inside a unit test to observe an eventual settle is impractical to run repeatedly, so the tests assert the property that's both true and checkable in a bounded window: the call does not resolve **successfully** within 5 seconds. That's the security-relevant claim — no fast fail-open path exists — verified directly, not inferred. The slower, complete picture (never settles at all, relies on the platform timeout) is documented above from the direct 182s observation already made, rather than re-run on every test invocation.

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:1 SIMULATE_FIRESTORE_OUTAGE=1 GCLOUD_PROJECT=demo-mitra \
  npx jest --ci src/middleware/rateLimit.failSafe.test.ts \
           src/functions/campaigns/generateCampaignStrategy.failSafe.test.ts

Test Suites: 2 passed, 2 total
Tests:       2 passed, 2 total
Time:        8.457s
```

Confirmed these two files are correctly excluded from the normal suite (they gate on `SIMULATE_FIRESTORE_OUTAGE`, absent in every other invocation): a full `npx jest --ci` run against the real working emulator shows `2 skipped, 38 passed, 38 of 40 total` suites, `290 passed` tests — identical to Phase 38's post-fix numbers, no regression, no added runtime.

### Finding

| ID  | Severity | Finding                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                       | Fixed?                                                                                                                                                                                                                                              |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-7 | MEDIUM   | `checkRateLimit` has no bounded timeout; a genuine Firestore outage causes it to hang (never resolve or reject) rather than fail fast, relying entirely on the calling function's platform-level execution timeout (undocumented for `generateCampaignStrategy`/`createCampaign` in this codebase — no explicit `timeoutSeconds` set) to eventually terminate the request | Direct observation: 20s/90s/182s of real wall-clock waiting against an unreachable host, promise never settled | Not fixed — this is a real gap worth a future phase's attention, but implementing a bounded timeout inside `checkRateLimit` would be exactly the kind of limiter redesign this follow-up was told not to attempt. Documented, not silently patched. |

This is a genuinely different, and arguably more useful, result than "verified fail-closed" — it shows fail-closed is true in effect (nothing expensive ever runs) but not true by fast, clean design, and names the specific missing piece (a bounded timeout) for whoever picks this up next.

## 2. `rate_limits` TTL / Cleanup — specification, not execution

This is correctly infrastructure/configuration work, and this session has no `gcloud` CLI, no GCP Console access, and no credentials for the project (`brainwise-ai-marketing-engine`, per `.firebaserc`) beyond the local emulator — so nothing here was actually applied. What follows is a precise, ready-to-execute specification, answering each question raised:

### What fields identify expired rate-limit documents?

Every `rate_limits/{key}` document already carries a `resetTime` field — the exact millisecond epoch at which the application's own logic (`rateLimit.ts`, `if (data['resetTime'] > now) { ...still active... }`) considers the window over. This is the natural TTL field: it's the same value the app already treats as the expiry boundary, so there's no risk of TTL and application logic disagreeing about when a document is "done."

**Blocking prerequisite, not yet done**: Firestore's native TTL feature requires the target field to be a Firestore `Timestamp` type. `resetTime` is currently stored as a plain JavaScript `number` (`resetTime = now + config.windowSeconds * 1000`, written via `tx.set(ref, { resetTime, ... })` — a raw number, not `Timestamp.fromMillis(resetTime)`). TTL cannot be enabled against a non-Timestamp field. This is a small, scoped code change (wrap the one existing write site) but it **is** a change to the limiter file the prior report was told not to revisit further this round — flagged here as the one prerequisite, not applied, pending explicit go-ahead.

### Is TTL configured on the correct collection/field?

Not yet configured at all (verified: `npx firebase firestore --help` in this environment shows no `firestore:fields`/TTL subcommand — TTL policies are a `gcloud`-only surface, not exposed via `firebase.json`, `firestore.indexes.json`, or the Firebase CLI installed here). The correct target, once the prerequisite above is done, would be:

```
gcloud firestore fields ttls update resetTime \
  --collection-group=rate_limits \
  --project=brainwise-ai-marketing-engine
```

(Syntax as documented by `gcloud firestore fields ttls update --help` at time of execution — not run in this session, so not independently confirmed against the currently-installed gcloud version; whoever runs this should check `--help` output first rather than trust this verbatim.)

### Could cleanup remove state too early? Does cleanup affect active windows?

No, by construction, once the prerequisite field-type fix is in place: Firestore TTL deletes a document **at or after** its TTL-field timestamp has passed (Google's documented behavior; typically within 24 hours of eligibility, not immediately — "best-effort," not exact). Since `resetTime` is the exact moment the application itself already considers the window closed and safe to reset (`data['resetTime'] > now` is the only condition under which a stored count is still honored), a TTL sweep can only ever delete a document at a point where the app's own logic would already treat it as expired. There is no window in which TTL deletion and an active rate-limit window can overlap — the two use the identical timestamp. This was reasoned from the code and Firestore's documented TTL semantics, not tested (the Firestore emulator does not implement TTL expiry at all — confirmed no TTL-related flag or behavior exists in the bundled `firebase-tools` emulator docs — so this specific property is fundamentally not locally testable; it can only be confirmed against a real project after enabling the policy).

### What's the expected document growth?

One document per unique `(action, userId)` pair ever seen, created lazily on first request, never updated in place to a different key. Post-Phase-38, there are 11 distinct rate-limited actions (`generateCampaignStrategy`, `regenerateAsset`, `generateReel`, `createCampaign`, `createReelProject`, `getUploadUrl`, `confirmUpload`, `getReelClipUploadUrl`, `confirmReelClipUpload`, `createSubscription`, `verifyPayment`). Worst-case growth is `(active user count) × 11` documents, though realistically far fewer since most users won't touch every action (e.g. a user who never creates a Reel never gets `generateReel`/`createReelProject`/`getReelClipUploadUrl`/`confirmReelClipUpload` documents). Each document is three small fields (`count`: number, `resetTime`: timestamp, `updatedAt`: server timestamp) — well under 1KB. At MVP-stage user counts (hundreds to low thousands), this is a few thousand documents totaling low single-digit MB — not a near-term cost problem, consistent with Phase 38's original LOW severity classification, now with concrete numbers instead of a qualitative "low urgency."

### Is there an existing GCP/Firebase operational convention for TTL?

Yes: Firestore's native per-field TTL policy (the `gcloud firestore fields ttls` surface referenced above) is the standard, Google-documented mechanism for exactly this pattern (ephemeral, self-describing-expiry documents) — no custom scheduled Cloud Function for cleanup is needed or recommended; that would be reinventing a feature Firestore already provides natively, and would itself need to be careful about the same "don't delete an active window" property TTL already guarantees by design. This preserves the existing architecture (Rule 7) rather than adding a new cleanup mechanism.

### Recommended sequence for whoever picks this up

1. Change the one write site in `checkRateLimit` (`rateLimit.ts`) to store `resetTime` as `Timestamp.fromMillis(resetTime)` instead of a raw number. Requires re-checking the one read site (`data['resetTime'] > now`) is updated to compare against a `Timestamp` correctly (e.g. `.toMillis() > now`). This is the only code change TTL requires.
2. Deploy that change.
3. Run `gcloud firestore fields ttls update resetTime --collection-group=rate_limits --project=brainwise-ai-marketing-engine` (confirm exact flags against `--help` at the time).
4. Verify with `gcloud firestore fields ttls describe resetTime --collection-group=rate_limits --project=brainwise-ai-marketing-engine` — expect state to reach `ACTIVE`, typically within minutes, though actual deletions of eligible documents can take up to ~24 hours to sweep.
5. Re-confirm growth is bounded after a few weeks by checking document counts in the `rate_limits` collection via the Firebase console.

Nothing in this sequence was executed in this session; it's the concrete specification the request asked for, sized so the next phase can act on it directly rather than starting from "does Firestore even support this."

## 3. Regression Check

Both new fault-injection test files were added without touching any of the 10 rate-limited endpoints, `rateLimitConfigs`, or `checkRateLimit`'s logic. Confirmed no regression:

- `functions/` full suite (real emulator): 38 suites passed, 2 correctly skipped (the new outage-gated files), 290 tests passed, 0 failed — identical numbers to Phase 38's post-fix state.
- Root `tests/` suite (real emulator, Firestore/Storage rules): 10 suites passed, 121 passed, 6 honestly-skipped — unchanged from Phase 38.
- `functions:typecheck`, `functions:build`: clean.

## 4. Updated Verdict

Per the direction given: **Phase 38's core rate-limit precision objective remains VERIFIED** — unaffected by this follow-up, not re-litigated.

**Overall Phase 38 status: still PARTIAL**, for a narrower and more precisely-evidenced reason than before:

- Fail-safe behavior (F-6 in Phase 38) is now **genuinely fault-injected and evidenced**, not just reasoned about from code structure. The result is more nuanced than a clean pass/fail: the system does not fail open (proven — AI and credit reservation are never reached), but it also does not fail fast or cleanly (proven — the underlying call hangs indefinitely with no bounded timeout, a new finding, F-7, that didn't exist as a documented gap before this session).
- TTL/cleanup (F-5 in Phase 38) now has a complete, precise, ready-to-execute specification answering every question the follow-up raised, but remains genuinely unexecuted — correctly so, since it requires `gcloud`/console access this environment does not have, and one small prerequisite code change (Timestamp type conversion) that was deliberately not made without explicit sign-off, given the instruction to keep this round narrowly scoped.

Phase 38 can be reconsidered for COMPLETE once: (a) F-7 is either accepted as a known, documented limitation or closed with an explicit bounded-timeout decision, and (b) the TTL prerequisite code change is made and the `gcloud` policy is actually applied and verified against the real project — both are now fully specified, neither is done.
