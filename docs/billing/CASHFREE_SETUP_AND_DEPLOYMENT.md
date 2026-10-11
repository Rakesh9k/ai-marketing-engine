# Cashfree Setup & Deployment Runbook

## 1. Prerequisites & Environment Configuration

Before deploying Mitra's Cloud Functions to staging or production, ensure the following environment keys are populated in your environment file or Google Cloud Secret Manager.

### 1.1 Required Environment Variables (`functions/.env.production` or Secret Manager)

```bash
# Cashfree Merchant Credentials
CASHFREE_APP_ID="TEST10382902b7..."            # Merchant App ID from Cashfree Merchant Dashboard
CASHFREE_SECRET_KEY="cfsk_ma_test_..."         # Secret Key (DO NOT EXPOSE TO BROWSER)
CASHFREE_WEBHOOK_SECRET="cfwh_sec_..."         # Secret key configured in Cashfree Webhook settings
CASHFREE_ENVIRONMENT="sandbox"                 # Set to 'production' for live deployment
CASHFREE_API_VERSION="2023-08-01"              # Tested Cashfree REST API Version

# Canonical Plan IDs (Cashfree Plan Identifiers if using subscription product)
CASHFREE_PLAN_STARTER_MONTHLY="mitra_starter_monthly"
CASHFREE_PLAN_STARTER_YEARLY="mitra_starter_yearly"
CASHFREE_PLAN_BUSINESS_MONTHLY="mitra_business_monthly"
CASHFREE_PLAN_BUSINESS_YEARLY="mitra_business_yearly"
CASHFREE_PLAN_PRO_MONTHLY="mitra_pro_monthly"
CASHFREE_PLAN_PRO_YEARLY="mitra_pro_yearly"
CASHFREE_PLAN_AGENCY_MONTHLY="mitra_agency_monthly"
CASHFREE_PLAN_AGENCY_YEARLY="mitra_agency_yearly"
```

### 1.2 Frontend Environment Variables (`.env.production`)

```bash
NEXT_PUBLIC_CASHFREE_ENVIRONMENT="production"  # Controls client JS SDK environment ('sandbox' | 'production')
```

---

## 2. Cashfree Dashboard Configuration

### 2.1 Webhook Endpoint Configuration
1. Log in to the [Cashfree Merchant Dashboard](https://merchant.cashfree.com/).
2. Navigate to **Developers** > **Webhooks**.
3. Click **Add Webhook Endpoint**.
4. Set **Endpoint URL**:
   `https://<region>-<project-id>.cloudfunctions.net/cashfreeWebhook`
5. Select Events:
   - `ORDER.PAYMENT_SUCCESS`
   - `PAYMENT.SUCCESS`
   - `SUBSCRIPTION.CREATE_SUCCESS`
   - `SUBSCRIPTION.PAYMENT_SUCCESS`
6. Copy the **Signature Key / Webhook Secret** and assign it to `CASHFREE_WEBHOOK_SECRET`.

---

## 3. Deployment Steps

### Step 1: Pre-Flight Typecheck & Test
Run full repository validation before deploying:

```bash
# 1. Typecheck Cloud Functions
npm --prefix functions run typecheck

# 2. Run Functions unit test suite
npm --prefix functions test

# 3. Typecheck Frontend
npm run typecheck

# 4. Run Frontend test suite
npm test
```

### Step 2: Deploy Cloud Functions
Deploy Gen 2 Cloud Functions to Firebase:

```bash
firebase deploy --only functions:createCashfreeCheckout,functions:cancelCashfreeSubscription,functions:cashfreeWebhook
```

### Step 3: Verify Webhook HTTPS Endpoint
Confirm public accessibility of the webhook handler endpoint:

```bash
curl -i -X POST https://<region>-<project-id>.cloudfunctions.net/cashfreeWebhook
```
*Expected Response*: `400 Bad Request` or `401 Unauthorized` (indicating signature verification active).

### Step 4: Deploy Frontend Application
Deploy Next.js application to Firebase App Hosting / Hosting:

```bash
firebase deploy --only hosting
```

---

## 4. Rollback Procedure

If Cashfree PG experiences upstream outages or unexpected failures post-cutover:

1. Revert `functions/src/config/env.ts` feature flag to previous billing handler if maintained in fallback mode.
2. Redeploy functions via `firebase deploy --only functions`.
3. Inform users via status page while resolving issues with Cashfree merchant support.
