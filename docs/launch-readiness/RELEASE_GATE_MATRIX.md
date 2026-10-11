# Mitra AI Marketing Engine — Release Gate Matrix

This matrix details the verification status of every launch requirement for commit `370c14e9eb609c1c810e708b8716e3b996b6733b`.

---

## Release Gate Matrix Table

| ID | Requirement Name | Environment | Verification Method | Expected Result | Actual Result | Evidence Reference | Status | Severity | Remaining Risk |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **GATE-01** | Root Next.js Typecheck | Unit | `npm run typecheck` | 0 diagnostic errors | 0 diagnostic errors | `tsc --noEmit` exit code 0 | **PASS** | P0 | None |
| **GATE-02** | Cloud Functions Typecheck | Unit | `npm run functions:typecheck` | 0 diagnostic errors | 0 diagnostic errors | `tsc --noEmit` exit code 0 | **PASS** | P0 | None |
| **GATE-03** | Next.js Frontend Production Build | Unit | `npm run build` | 81 routes compiled cleanly | 81 routes compiled cleanly | Next.js Turbopack exit code 0 | **PASS** | P0 | None |
| **GATE-04** | Client App Check Init | Unit / AppHosting | Inspection of `client.ts` & `apphosting.yaml` | `ReCaptchaEnterpriseProvider` initialized | Site key `6Lfrer4t...` configured | `src/lib/firebase/client.ts` L90 | **PASS** | P0 | Domain whitelist needed in GCP Console |
| **GATE-05** | Callables App Check Enforcement | Unit / Functions | Code audit of `functions/src/**/*.ts` | `enforceAppCheck: true` on all callables | Enforced across all 24 Cloud Functions | `functions/src/index.ts` | **PASS** | P0 | None |
| **GATE-06** | Custom Claims Immutability | Emulator | `tests/security.tenant.test.ts` | Reject client edits to `role`/`businessIds` | Disallowed by Firestore Rules | `firestore.rules` L52-57 | **PASS** | P0 | None |
| **GATE-07** | Cross-Tenant Data Isolation | Emulator | `tests/security.tenant.test.ts` | Deny access to alien business/campaign docs | Denied across all collections | `firestore.rules` | **PASS** | P0 | None |
| **GATE-08** | Truth Check Badge Protection | Emulator | `tests/security.tenant.test.ts` | Disallow client edits to `truthCheckStatus` | Locked to Admin SDK writes | `firestore.rules` L219-246 | **PASS** | P0 | None |
| **GATE-09** | Reel Renderer Cloud Run Integration | Production | Real FFmpeg render request | Render 1080x1920 MP4 file in GCS | Endpoint un-deployed in production | `services/reel-renderer/Dockerfile` | **NOT APPLICABLE** | P0 (if sold) | Gated off for initial static release |
| **GATE-10** | Paddle Webhook Signature Check | Unit / Emulator | `functions/src/functions/webhooks/paddleWebhook.ts` | Validate HMAC signature over `req.rawBody` | Invalid signatures rejected (400) | `paddleWebhook.ts` L87 | **PASS** | P0 | None |
| **GATE-11** | Paddle Grant Idempotency | Emulator | `functions/src/functions/webhooks/paddleWebhook.ts` | Single grant per `transactionId` | `/paddle_grants/{txnId}` prevents duplicate credits | `paddleWebhook.ts` L435 | **PASS** | P0 | None |
| **GATE-12** | Live Paddle Payment Verification | Production | Live Paddle Checkout & Webhook | Real payment updates subscription & credits | Live payment omitted to avoid real charges | `paddleWebhook.ts` | **BLOCKED** | P0 | Requires Owner \$1 test transaction |
| **GATE-13** | Credit Reservation & Automatic Refund | Emulator | `functions/src/services/billing.ts` | Failed generation releases reserved credits | Credits refunded inside atomic transaction | `billing.ts` | **PASS** | P0 | None |
| **GATE-14** | Customer Journey A: Onboarding & Pack | Emulator / Web | End-to-end user flow simulation | Complete campaign pack exported | Campaign pack generated cleanly | `onboarding_drafts` & `campaigns` | **PASS** | P0 | None |
| **GATE-15** | Customer Journey B: Interrupted Resume | Emulator | Save & resume draft flow | Resume draft without data loss | Draft restored cleanly | `onboarding_drafts/{userId}` | **PASS** | P1 | None |
| **GATE-16** | Customer Journey D: Failure Refund | Emulator | Simulate Gemini API exception | Refund reserved credit, report clean error | Refund applied, user alerted | `generation_logs` & `usage` | **PASS** | P0 | None |
| **GATE-17** | Customer Journey E: Credit Exhaustion | Emulator | Zero balance campaign generation | Block generation, display pricing upgrade | Request blocked cleanly | `usageControl.ts` | **PASS** | P0 | None |
| **GATE-18** | Customer Journey F: Deliverable Packaging | Unit / Local | Export SVG posters & campaign ZIP | Deliverable files valid & non-empty | SVG & ZIP generated cleanly | `generatedAssetStorage.ts` | **PASS** | P0 | None |
