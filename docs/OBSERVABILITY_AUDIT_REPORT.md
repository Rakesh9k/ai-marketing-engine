# Monitoring & Observability Audit

**Scope:** Sentry, Firebase/Cloud Logging, monitoring dashboards, health checks & alerts, across the full Mitra surface (frontend, Cloud Functions, AI pipeline, credits, payments, security, storage).

This is an audit-first document: every row in §12/§13 distinguishes what was verified by reading real code or running a real test/build from what remains unverifiable in this environment because it depends on infrastructure (a live Firebase project, a Sentry account, Google Cloud Monitoring console access, or the production domain) this session cannot reach. See `docs/PHASE_14_OBSERVABILITY_REPORT.md` for the prior phase's work, which this audit builds on rather than duplicates — that phase explicitly scoped Sentry/dashboards/alerts **out**; this phase revisits that decision.

## 1. Executive Summary

**Before this phase:** structured server-side logging existed and was already well-adopted (`functions/src/utils/logging.ts`, Phase 14) across the credit system, payment webhook, AI pipeline, and Storage upload paths, with secret redaction. Nothing else did: no Sentry (frontend or server), no frontend error boundary, no correlation/request ID (the field was declared in a type and never populated), no logging on rate-limit rejection, no HTTP-reachable health endpoint (only an `onCall` function unsuited to uptime polling), no dashboards, no alerts, no uptime check, and no deployment/release identification.

**This phase fixed the genuine, low-risk, infrastructure-independent gaps:**
1. Installed and wired `@sentry/nextjs` for the frontend (client + server + edge, via Next.js 15's `instrumentation.ts`/`instrumentation-client.ts` convention), with a PII/secret-scrubbing `beforeSend` hook and a root `global-error.tsx` boundary that previously did not exist at all.
2. Added a public, unauthenticated `/api/health` route on the Next.js frontend — the App Hosting service had no HTTP-reachable liveness endpoint before this (the existing `healthCheck` Cloud Function is `onCall`, which requires the Firebase callable protocol, not a plain GET, so it cannot be used by a conventional uptime checker).
3. Added a per-invocation `requestId` (UUID) generated at the shared callable entry point (`validatedCallable`/`validatedCallableWithBusiness`), plus a `deploymentRevision` field (Cloud Run's `K_REVISION`, which Cloud Functions Gen2 always sets) on every log line — closing part of the correlation-ID and release-identification gaps.
4. Added a `rate_limit_rejected` warn-level log on rate-limit rejection (`checkRateLimit` previously rejected silently server-side — a spike was invisible in Cloud Logging).

**What this phase explicitly did NOT do, and why:** provision a real Sentry account/DSN, create Google Cloud Monitoring dashboards, create alert policies, configure a real uptime check, or verify any of the above against live infrastructure. This environment has no Sentry account, no GCP/Firebase console access, and no reachable production deployment. Per this phase's own rules ("do not fabricate a successful event," "do not claim dashboards are complete merely because a dashboard can be created manually"), these are reported as **BLOCKED**, not implemented-and-assumed-working. §14 gives the exact provisioning steps needed to unblock each one.

## 2. Current Architecture (Post-Phase)

### Backend (Cloud Functions)
- `functions/src/utils/logging.ts` — `createLogger`/`logFunctionStart`/`logFunctionStage`/`logFunctionComplete`/`logFunctionError`, backed by `functions.logger` → Cloud Logging. Now also attaches `deploymentRevision` (`process.env.K_REVISION`) to every log line, and exports `generateRequestId()`.
- `functions/src/middleware/validation.ts` — `validatedCallable`/`validatedCallableWithBusiness` gate every callable; now generate a `requestId` per invocation, include it in the rejection-warn logs, and pass it into the handler's context (handlers may opt into using it — not force-threaded into all ~30 handlers' own `logFunctionStart` calls in this pass; see §11 Known Limitations).
- `functions/src/middleware/rateLimit.ts` — `checkRateLimit` now emits `rate_limit_rejected` (warn) with `userId`/`action`/`retryAfterSeconds` on rejection, never the internal Firestore counter/resetTime.
- Credit system (`usageControl.ts`), payment webhook (`razorpayWebhook.ts`), AI pipeline (`pipeline.ts`), Storage uploads (`getUploadUrl.ts`/`confirmUpload.ts`), auth/validation gates — unchanged this phase; already instrumented per Phase 14, re-confirmed still correct by this audit's re-read and by the full test suite passing.

### Frontend (Next.js, App Hosting)
- `src/instrumentation.ts` / `src/instrumentation-client.ts` — Sentry init for server/edge and browser respectively. `dsn` reads from `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN` (client), both **unset** in every environment this session has access to — Sentry's documented behavior with no DSN is a safe no-op (SDK loads, nothing is sent), verified by a clean production build (§13).
- `src/lib/sentryScrub.ts` — `beforeSend` hook shared by both configs: strips request cookies/headers, redacts URL-embedded keys/tokens/Bearer headers/provider key prefixes from exception messages, breadcrumbs, and extra data (mirrors the redaction approach already used server-side in `logging.ts`).
- `src/app/global-error.tsx` — root error boundary (did not exist before). Captures to Sentry, shows a generic user-facing message, no stack trace/internals.
- `next.config.ts` — wrapped with `withSentryConfig` for source-map upload (skipped with a build warning when `SENTRY_AUTH_TOKEN` is unset, which it is here — does not fail the build).
- `src/app/api/health/route.ts` — new public GET endpoint, cheap (no Firestore/Storage/AI calls), returns `{status, service, timestamp}` only.

## 3. Sentry — Decision Record

**Decision: frontend + server (both runtimes of the Next.js app), NOT Cloud Functions.**

Rationale: the frontend previously had **zero** error capture of any kind (no boundary, no reporting) — this was the largest actual gap and the primary justification for introducing Sentry at all. The Next.js server runtime (route handlers, server components) is covered by the same SDK for free via `instrumentation.ts`. Cloud Functions were deliberately left on Cloud Logging alone: they already have adequate, well-adopted structured logging with secret redaction (Phase 14, re-confirmed by this audit), and duplicating that with a second error-tracking system there would violate this phase's own constraint ("Monitoring must not become a second application architecture," §20) for marginal benefit. If unified cross-stack error correlation becomes a real operational need later, `@sentry/google-cloud-serverless` is the natural follow-up — not done here.

## 4. Sentry — Verification

| Check | Result |
|---|---|
| Package installed | `@sentry/nextjs@10.75.1` — YES (installed this phase) |
| Client init | YES — `src/instrumentation-client.ts`, code-verified |
| Server/edge init | YES — `src/instrumentation.ts`, code-verified |
| DSN configured | **NO** — no Sentry account/project exists; `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` unset everywhere |
| Production build succeeds with SDK wired, no DSN | YES — verified (`npm run build`, clean, `/api/health` and all 23 routes generated) |
| Error boundary present | YES — `src/app/global-error.tsx` (new; none existed before) |
| Secret/PII scrubbing | Code-verified (`sentryScrub.ts`); **not** verified against a real captured event (no DSN to send to) |
| A real event reaches Sentry | **BLOCKED** — no account/DSN. Not fabricated. |
| Environment/release tagging | Code present (`environment`, `release` fields wired), **not runtime-verified** (nothing to inspect without a live project) |
| Source maps upload | Code present, explicitly skipped at build time (no `SENTRY_AUTH_TOKEN`) |

**Verdict: Sentry = IMPLEMENTED (code), BLOCKED (runtime/infrastructure).**

## 5. Firebase / Cloud Logging — Verification

Unchanged from Phase 14's already-solid state, re-confirmed by this audit's independent re-read (§2 above) and by the full test suite (§13):
- Structured logging via `functions.logger`, secret redaction, adopted across credits/payments/AI pipeline/storage/auth gates.
- This phase's additions (`requestId`, `deploymentRevision`, rate-limit rejection log) all verified by unit/emulator tests (§13), not just by reading the source.
- **Not verified this phase or ever in this environment:** that Cloud Logging in the real GCP project actually ingests/indexes/makes these fields filterable exactly as expected — this requires live GCP console access, which is unavailable here. Marked **NOT VERIFIED (infrastructure)**, consistent with Phase 14's own §17.

## 6. Correlation IDs

**Status: PARTIAL.**

What exists now: every callable generates a `requestId` at the shared entry point (`validation.ts`) and logs it on auth/validation rejection. What does **not** exist: the ~30 individual function handlers (`generateCampaignStrategy`, `createCampaign`, etc.) do not yet thread that `requestId` into their own `logFunctionStart`/pipeline-stage logs — each handler's context type gained the field (so it's available), but retrofitting all call sites to pass it through was out of scope for this pass (it would touch ~30 files for a benefit — tracing a single request across one function's internal stages — that `businessId`+`campaignId` correlation, already in place, substantially already provides for the highest-value case, the AI pipeline). Recorded here as a known, scoped-out follow-up rather than silently left undocumented.

## 7. Health Checks

| Endpoint | Type | Reachable via plain HTTP GET | Cost/dependencies |
|---|---|---|---|
| `functions/src/healthCheck.ts` (`healthCheck`) | Firebase `onCall` | **NO** — requires the Firebase callable wire protocol, not curl-able by a standard uptime checker | none |
| `src/app/api/health/route.ts` (new, this phase) | Next.js `onRequest`-style route | **YES** | none — no Firestore/Storage/AI calls, liveness only |

Liveness vs. readiness: only a liveness check exists (new `/api/health`). No readiness check (bounded dependency check e.g. "can I reach Firestore") was added — not requested by evidence of need, and every readiness check adds its own failure/cost surface (§23-24 caution against expensive/unbounded readiness checks). Recorded as **MISSING (readiness)**, deliberately not built speculatively.

## 8. Uptime Monitoring

**Status: BLOCKED.** No Google Cloud Monitoring uptime check exists or could be created/verified — this environment has no GCP console/`gcloud` access. `metadata.openGraph.url`/`metadataBase` in `src/app/layout.tsx` confirm `https://brain-wise.com` is the intended production domain (§25's preferred target), and `/api/health` (this phase) is now a reachable, cheap target for such a check once one is created — but the check itself does not exist. Not fabricated.

## 9. Alerting

**Status: MISSING (infrastructure), design not attempted.** No alert policies exist anywhere in this repo's config (`firebase.json`, `apphosting.yaml`, `.firebaserc` all audited, none reference Cloud Monitoring alerts). Designing specific thresholds without a production traffic baseline to validate them against would produce exactly the "invented arbitrary thresholds" this phase's own rules prohibit (§27) — not attempted this phase. §14 lists this as the top follow-up once Sentry/GCP access exists.

## 10. Dashboards

**Status: MISSING.** No purpose-built operational dashboard exists (confirmed: no dashboard JSON/config anywhere in the repo, no reference in any doc). Firebase console log views and Cloud Logging's own query UI are available manually but do not constitute a dashboard per this phase's own distinction (§20).

## 11. Security / PII Audit

Grep across every file this phase touched, scoped to the actual diff, for `api_key|secret|password|token|gemini|openai|razorpay|private_key|authorization|cookie` (case-insensitive): only field names, redaction-pattern source, and comments describing the redaction — **zero literal secret values**, same pattern as Phase 14's own audit. See raw grep output referenced in §13's command log.

New surfaces specific to this phase, checked individually:
- `sentryScrub.ts`'s `beforeSend` strips `event.request.cookies`/`headers` unconditionally and redacts URL-embedded keys/Bearer tokens/provider-key prefixes from exception values, breadcrumbs, and `extra` — mirrors the existing server-side `redactSecrets()` pattern rather than inventing a new one.
- `/api/health` returns only `{status, service, timestamp}` — no environment variables, no Firebase config, no internal routing info.
- `rate_limit_rejected` log omits the Firestore counter/resetTime (internal limiter state) per §19's explicit instruction — enforced by a new unit test, not just by inspection.
- `global-error.tsx` shows a static, generic user-facing message — no stack trace, no internal function/file names.

## 12. Current-State Inventory (§3 of the phase spec)

| Capability | Existing implementation | Runtime verification | Status |
|---|---|---|---|
| Sentry frontend | `@sentry/nextjs` installed & wired (this phase) | Build succeeds with SDK active; no DSN to verify event delivery | IMPLEMENTED / BLOCKED |
| Sentry server | Same SDK, `instrumentation.ts` node/edge branches | Same as above | IMPLEMENTED / BLOCKED |
| Firebase logging | `functions.logger` via `createLogger` (Phase 14) | Emulator-backed tests pass; real Cloud Logging ingestion unverified | VERIFIED (code) / NOT VERIFIED (infra) |
| structured logging | `utils/logging.ts` primitives, widely adopted | Test suite (unit + emulator) | VERIFIED |
| correlation IDs | `requestId` generated at the callable gate only (this phase) | Unit-testable at the gate; not threaded into handler-level logs | PARTIAL |
| Cloud Monitoring | none | — | MISSING |
| dashboards | none | — | MISSING |
| alerts | none | — | MISSING |
| health endpoint | `/api/health` (new, this phase); `healthCheck` onCall (pre-existing, not HTTP-reachable) | Unit test passes; build includes the route | IMPLEMENTED |
| readiness check | none (deliberately not built) | — | MISSING |
| uptime monitoring | none | — | BLOCKED |
| AI monitoring | Pipeline stage logging + provider/failureCode marker (Phase 14) | Emulator/unit tests pass | VERIFIED |
| credit/payment monitoring | `usageControl.ts`/`razorpayWebhook.ts` structured logging (Phase 14) | Emulator tests pass | VERIFIED |
| security monitoring | auth/validation rejection warn logs (Phase 14) + rate-limit rejection log (this phase) | Unit + emulator tests pass | VERIFIED (partial — App Check failures are platform-opaque, see §11 of risk register) |

## 13. Verification Evidence

Commands actually executed this phase, in order:

```
npm view @sentry/nextjs version                              # registry reachable — 10.75.1
npm install @sentry/nextjs --save                              # 62 packages added
npx tsc --noEmit -p tsconfig.json                               # frontend typecheck — PASS
cd functions && npx tsc --noEmit -p tsconfig.json               # functions typecheck — PASS
npm run build                                                    # next build — PASS, 23/23 routes incl. /api/health
npx prettier --write <new files>                                 # formatting fix, then build re-run clean
npx jest --testPathIgnorePatterns="functions/" --silent          # frontend — 28 suites / 247 passed (4 skipped, pre-existing)
cd functions && npx jest --silent                                 # functions, no emulator — 19 suites / 199 passed
firebase emulators:start --only firestore --project demo-test-project
  FIRESTORE_EMULATOR_HOST=localhost:8080 npx jest --silent src/middleware/rateLimit.test.ts
                                                                   # 9/9 passed, incl. new rejection-log test
firebase emulators:start --only firestore,auth --project demo-test-project
  FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
  GCLOUD_PROJECT=demo-test-project npx jest --silent
                                                                   # 38/41 suites passed; 1 failure needs the
                                                                   # Storage emulator (not started, pre-existing
                                                                   # gap, unrelated to this phase's changes);
                                                                   # 2 pre-existing skips
git diff -- <touched files> | grep -iE "api_key|secret|password|token|gemini|openai|razorpay|private_key|authorization|cookie"
                                                                   # zero literal secret values
```

New tests added this phase:

| Test | Proves |
|---|---|
| `functions/src/utils/logging.test.ts` (extended) | `generateRequestId()` returns unique values; `createLogger` attaches `deploymentRevision` from `K_REVISION` when set |
| `functions/src/middleware/rateLimit.test.ts` (extended) | Rejection emits `rate_limit_rejected` warn with `userId`/`action`/`retryAfterSeconds`, and explicitly asserts `count`/`resetTime` are absent |
| `src/app/api/health/route.test.ts` (new) | Returns 200 + `{status:'ok', service:'mitra-web'}`, and the serialized body contains no key/secret/token/password/credential substring |

## 14. Blocked Items — Exact Unblock Steps

1. **Sentry event delivery** — create a Sentry project, set `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` for source maps) as App Hosting secrets. No code change needed — `instrumentation.ts`/`instrumentation-client.ts` already read these.
2. **Uptime check** — once `brain-wise.com` (or the current App Hosting URL) is confirmed reachable, create a Google Cloud Monitoring uptime check against `/api/health` (this phase's new endpoint), expected status 200, timeout ~10s, frequency ~1-5 min.
3. **Alert policies** — after (1) and (2) exist and a few days of real traffic establish a baseline, define thresholds per §27's INITIAL/TUNABLE framing (this phase deliberately did not invent unvalidated numbers).
4. **Dashboards** — once metrics exist in Cloud Monitoring/Sentry, build the minimum-viable operational dashboard described in the phase spec §20-21 (System Health / AI / Campaigns / Storage / Payments / Security).
5. **Full correlation-ID threading** — extend `requestId` from the gate (done) into each handler's own `logFunctionStart` context (not done) — mechanical, ~30 files, deferred as out of proportion for this pass given `businessId`/`campaignId` already provide the highest-value correlation.

## 15. Risk Register

| ID | Finding | Severity | Evidence | Recommendation | Status |
|---|---|---|---|---|---|
| R1 | No Sentry DSN provisioned — frontend errors are captured by the SDK but not delivered anywhere yet | HIGH | `instrumentation-client.ts`/`instrumentation.ts` read unset env vars | Provision a Sentry project (§14.1) | OPEN |
| R2 | No uptime check on the production domain | HIGH | No GCP Monitoring config found anywhere in repo | Create uptime check against new `/api/health` (§14.2) | OPEN |
| R3 | No alert policies of any kind | HIGH | No alert config found | Define after a real traffic baseline exists (§14.3) | OPEN |
| R4 | App Check rejections are not distinguishable in application-level logs from other auth failures | MEDIUM | Firebase rejects App Check failures before the callable body (and `validatedCallable`) ever runs — this is opaque platform behavior, not something `logging.ts` can intercept without a custom App Check hook | Investigate whether Cloud Functions execution logs (platform-level, not app-level) already surface this distinctly before building a workaround | OPEN |
| R5 | `requestId` is generated at the callable gate but not threaded into individual handlers' own stage/business logs | LOW | §6, §14.5 | Mechanical follow-up if end-to-end single-request tracing (beyond the already-adequate `campaignId`/`businessId` correlation) becomes a real need | OPEN |
| R6 | `functions/src/config/env.ts` still has one raw `console.warn` at cold start | LOW | Pre-existing, documented in Phase 14 §18, re-confirmed unchanged | Leave as-is — boot-time-only, no request context exists yet, not part of the request-failure diagnostic path | ACCEPTED (unchanged) |
| R7 | No readiness check (only liveness) | LOW | §7 | Build only if an operator need is demonstrated — an unbounded readiness check has its own cost/failure-mode risk (§23-24) | ACCEPTED (deferred) |

## 16. Final Status Matrix

| Capability | Implementation | Runtime/Infra Evidence | Status |
|---|---|---|---|
| Sentry | `@sentry/nextjs` installed & wired, client+server+edge, scrubbing, error boundary | Build passes; no DSN — no live event verified | IMPLEMENTED / BLOCKED |
| Firebase logging | `functions.logger` via structured `logging.ts` (Phase 14) | Emulator tests pass; real GCP ingestion unverified | VERIFIED (code) / NOT VERIFIED (infra) |
| Structured logging | `utils/logging.ts`, widely adopted | Unit + emulator tests | VERIFIED |
| Correlation IDs | `requestId` at the callable gate only | Unit test | PARTIAL |
| Error classification | `errors.ts` (`AppError` subclasses), `mapErrorToHttpsError` | Pre-existing, unchanged, tests pass | VERIFIED |
| Monitoring dashboard | none | — | MISSING |
| Health endpoint | `/api/health` (new) + pre-existing `onCall healthCheck` | Unit test + build | IMPLEMENTED |
| Uptime check | none | — | BLOCKED |
| Alerts | none | — | MISSING |
| Alert delivery | none | — | NOT VERIFIED |
| AI monitoring | Stage logging + provider/failureCode (Phase 14) | Tests pass | VERIFIED |
| Campaign monitoring | Pipeline stage logging (Phase 14) | Tests pass | VERIFIED |
| Storage monitoring | Upload logging (Phase 14) | Tests pass | VERIFIED |
| Payment monitoring | Webhook structured logging (Phase 14) | Tests pass | VERIFIED |
| Security monitoring | Auth/validation rejection + rate-limit rejection (this phase) logging | Tests pass; App Check gap noted (R4) | PARTIAL |
| Secret/PII protection | Redaction in `logging.ts` (Phase 14) + `sentryScrub.ts` (this phase) | Grep audit + unit tests | VERIFIED |
| Cost controls | No new paid infra added; Sentry has no traffic yet; health endpoint is free/cheap | Code review | VERIFIED (nothing to control yet) |

## 17. Final Verdict

### Sentry
IMPLEMENTED (code) / BLOCKED (runtime — no account/DSN provisioned)

### Firebase / Cloud Logging
VERIFIED (code, via tests) / NOT VERIFIED (real GCP infrastructure inaccessible from this environment)

### Monitoring dashboards
MISSING

### Health checks
IMPLEMENTED (new `/api/health`, liveness only) / MISSING (readiness, deliberately deferred)

### Alerts
MISSING (no policies exist; deferred pending a real traffic baseline, per §27)

### Overall Monitoring & Observability
**PARTIAL.** Genuine, testable code-level gaps identified by this audit were fixed (frontend error capture, HTTP health endpoint, rate-limit observability, partial correlation IDs, deployment revision tagging). Dashboards, alerts, uptime checks, and real Sentry event delivery all remain infrastructure-dependent and are honestly reported as BLOCKED/MISSING rather than claimed complete — none of this phase's rules ("do not fabricate," "do not claim VERIFIED from config existence alone") were bent to produce a green report.
