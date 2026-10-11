# 07 — Security & Data Integrity (Pass 1, static only)

Scope read: `firestore.rules` (users, campaigns, campaign_assets, assets, subscriptions, usage, transactions), `storage.rules` (full), callable App Check coverage, `paddleWebhook.ts`. **Rules were not executed in this pass** (emulator tests exist but were not run; counted as skipped in the jest baseline where emulator-gated).

## Findings

| ID | Severity | Component | Finding | Evidence | Minimum remediation | Regression test |
|---|---|---|---|---|---|---|
| S1 | — (positive) | users rule | Role/businessIds/agencyId/subscriptionId update-locked; `create`/`delete` false | `firestore.rules` users block | none | exists per comment: `firestore-security.phase11.test.ts` (run under emulator) |
| S2 | — (positive) | campaigns | Create denied to clients; status, credits, offer (when verified), truthCheck fields immutable client-side | rules campaigns block | none | `tests/security.tenant.test.ts` (referenced) |
| S3 | — (positive) | Storage | All writes denied; uploads via signed URL + `confirmUpload` re-verifying size/type | `storage.rules` | none | confirm tests run in CI |
| S4 | P1 verify | Webhooks | `onRequest` webhooks cannot use App Check; security rests solely on signature. Paddle verified over raw body. Cashfree/PayU/Razorpay parity **not read** | files lacking `enforceAppCheck` | read each webhook; remove/disable unused providers' endpoints | per-provider invalid-signature + replay tests (Paddle has `paddleWebhook.test.ts`) |
| S5 | P2 | `agency_member` rules | Rules read `resource.data.businessId in request.auth.token.businessIds` — claims-based. Claims only refresh on business creation (per rules comment) → stale claims after membership change possible | rules comment re `createBusiness` | document claim refresh policy; add test for removed member | emulator test |
| S6 | P2 | `regenerateAsset`/`generateReel` | Prior doc notes direct `userId` check, not `verifyBusinessAccess` (agency members denied: fails closed, functional not security) | `PRODUCTION_API_INTEGRATION_MATRIX.md` (dated; **re-verify**) | align on `verifyBusinessAccess` | unit test |
| S7 | UNVERIFIED | Prompt injection / generated content | Not inspected (Truth Check, schema validation exist) | — | Pass 2 | adversarial tests exist (`adversarialUser.test.ts`), not reviewed |
| S8 | UNVERIFIED | IDOR across all ~80 callables | Only a sample read. Central `verifyBusinessAccess` helper reduces risk; **inference, not verification** | — | Pass 2: enumerate every callable → access check | generated test iterating exported callables |
| S9 | UNVERIFIED | Secrets/logging | Not scanned | — | `grep` for key patterns, review logger redaction | secret-scan in CI |

No credible cross-tenant access, credit manipulation or payment-integrity defect was **found** in the code read. That is not a clean bill: S7–S9 are open.
