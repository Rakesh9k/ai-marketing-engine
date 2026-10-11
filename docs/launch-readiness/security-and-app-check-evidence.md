# Mitra AI Marketing Engine — Security & App Check Evidence

**Date:** 2026-10-09  
**Rules Files:** `firestore.rules`, `storage.rules`  
**Test Suite:** `tests/security.tenant.test.ts`

---

## 1. Firebase App Check Configuration & Enforcement

- **Client Initialization**: Configured in `src/lib/firebase/client.ts` using `ReCaptchaEnterpriseProvider` consuming `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- **Secret & Environment Binding**: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` value (`6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3`) bound in `apphosting.yaml`. Debug tokens are scoped strictly to emulator runs (`NEXT_PUBLIC_USE_EMULATORS=true`).
- **Cloud Functions Enforcement**: All 24 Cloud Functions in `functions/src/` declare `enforceAppCheck: true`. Requests missing valid tokens are rejected at the edge with HTTP status 401/403.

---

## 2. Multi-Tenant Security & Security Rules Evidence

Negative authorization tests in `tests/security.tenant.test.ts` verify the following security controls against the Firestore emulator:

| Collection / Path | Operation | Security Condition | Rule Verdict |
| :--- | :---: | :--- | :---: |
| `/users/{userId}` | Client Update | Disallow edits to `role`, `businessIds`, `agencyId`, `subscriptionId` | **DENIED** |
| `/businesses/{businessId}` | Client Write | Direct client writes denied — all updates go through Admin SDK callables | **DENIED** |
| `/products/{productId}` | Client Create | Must match authenticated caller's `businessIds` claim | **ALLOWED (Owner) / DENIED (Alien)** |
| `/campaigns/{campaignId}` | Client Create | Client `create` disallowed — created server-side by Admin SDK | **DENIED** |
| `/campaigns/{campaignId}` | Client Update | Disallow edits to `status`, `creditsReserved`, `truthCheckStatus` | **DENIED** |
| `/businesses/{id}/campaigns/...` | Storage Write | Generated campaign asset folder is write-locked for client SDKs | **DENIED** |
| `/paddle_grants/{txnId}` | Client Access | Billing grant ledger is completely inaccessible to clients | **DENIED** |

---

## 3. Server-Side Callable Authorization

Cloud Functions callables enforce tenant authorization independently of Firestore rules:
- Callables validate `context.auth.uid`.
- Callable implementations inspect target business ownership (`business.userId === context.auth.uid` or `context.auth.token.businessIds.includes(businessId)`).
- Unauthorized requests throw `https.HttpsError('permission-denied')`.
