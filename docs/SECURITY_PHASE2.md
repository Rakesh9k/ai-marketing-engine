# Phase 2 — Security + CI hardening

## Authorization model (as implemented)

- Identity: Firebase Auth. Callables read `request.auth`; ownership is `businesses/{id}.userId`, products/campaigns/assets hang off `businessId`.
- `request.auth.token.businessIds` / `role` are server-minted custom claims. `users/{uid}.role|businessIds|agencyId|subscriptionId` are pinned by `firestore.rules`, so a client cannot self-escalate.
- Admin = verified custom claim `role === 'admin'`. `requireAdmin()` (functions/src/middleware/auth.ts) is the server gate for any future admin callable; `setCustomClaims()` refuses to mint `role: 'admin'`. Admins are granted out-of-band with Admin SDK credentials.
- No admin API exists. `/admin/**` and `/dev/**` return 404 in production (src/proxy.ts) because every admin page renders hardcoded sample data. Re-enabling needs a real server session (ID-token → session cookie verified in the proxy/route) first.
- Credits, plan/tier, subscriptions, usage and transactions are server-written only (`allow write: if false`).

## Access matrix (enforced by tests/security.tenant.test.ts, tests/security.test.ts, tests/storage.test.ts)

| Resource | Anonymous | Owner | Other user | `role=admin` claim |
| --- | --- | --- | --- | --- |
| products (read/list/create/update/delete) | deny | allow (own business only) | deny | deny (no rule) |
| businesses / Business Brain | deny | read only | deny | deny |
| campaigns | deny | read, limited update | deny | deny |
| campaign create / delete | deny | **deny** | deny | deny |
| usage / subscriptions / transactions | deny | read own | deny | deny |
| users/{uid} | deny | read, pinned-field update | deny | read only |
| internal collections (rate limits, webhook events, Meta tokens) | deny | deny | deny | deny |

## Running the rules tests locally

`firebase emulators:exec --only auth,firestore,storage --project demo-mitra "npx jest --coverage=false"`
(needs Java 21). Without an emulator the rules suites are reported as skipped, not passed.

## App Check

- Client: `src/lib/firebase/client.ts` (reCAPTCHA Enterprise). The debug token is honoured only when `NEXT_PUBLIC_USE_EMULATORS=true`; `next.config.ts` fails the build if a debug token is set without it.
- Server: every client-callable function sets `enforceAppCheck: true` (calendar, Meta, publishing and scheduling callables were added in this phase). `healthCheck` and webhooks/scheduled jobs/auth triggers are intentionally not callable-enforced.
- Production enforcement state in the Firebase console is **not verifiable from this repo**.
