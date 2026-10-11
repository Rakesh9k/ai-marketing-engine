# Mitra AI Marketing Engine — Manual Production Checklist

This document provides step-by-step instructions for the infrastructure owner or deployment lead to complete the final live verification steps before opening Mitra to paid customers.

---

## 1. Firebase App Check & reCAPTCHA Enterprise Verification

### Objective
Ensure reCAPTCHA Enterprise tokens are minted properly on production domains and verified by Cloud Functions.

### Checklist Steps
1. **Google Cloud Console**:
   - Open **reCAPTCHA Enterprise Console**.
   - Verify that your production domain (e.g., `brain-wise.com`, `brainwise-ai-marketing-engine.web.app`) is added to the Authorized Domains list for key `6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3`.
2. **Firebase Console**:
   - Navigate to **App Check** in the Firebase Console (`brainwise-ai-marketing-engine`).
   - Confirm that the Web Application `1:691254604957:web:caf76181c86efb6a7b5074` is registered under reCAPTCHA Enterprise.
   - Enforce App Check on target Cloud Functions (`createBusiness`, `generateCampaignStrategy`, `generateReel`, etc.).
3. **Verification**:
   - Open the live web app in an incognito window.
   - Invoke an onboarded callable flow (e.g., creating a business).
   - Confirm in browser DevTools Network tab that requests send header `X-Firebase-AppCheck`.

---

## 2. Cloud Run Reel Renderer Deployment & Verification

### Objective
Deploy the FFmpeg reel rendering service and link it to Cloud Functions Gen2.

### Checklist Steps
1. **Build & Deploy Cloud Run Service**:
   ```bash
   cd services/reel-renderer
   gcloud builds submit --tag gcr.io/brainwise-ai-marketing-engine/reel-renderer:latest .
   gcloud run deploy reel-renderer \
     --image gcr.io/brainwise-ai-marketing-engine/reel-renderer:latest \
     --region asia-south1 \
     --no-allow-unauthenticated \
     --cpu 2 \
     --memory 2Gi \
     --timeout 300s
   ```
2. **Configure Cloud Functions Secret**:
   ```bash
   firebase functions:secrets:set REEL_RENDERER_URL
   # Enter the URL returned by gcloud run deploy (e.g., https://reel-renderer-xxx-el.a.run.app)
   ```
3. **IAM Permissions**:
   - Grant the Cloud Functions service account (`brainwise-ai-marketing-engine@appspot.gserviceaccount.com`) the role **Cloud Run Invoker** (`roles/run.invoker`) on the `reel-renderer` service.
4. **Verification**:
   - Trigger reel creation in the web app for a test user.
   - Verify that an MP4 file is produced in `gs://brainwise-ai-marketing-engine.firebasestorage.app/businesses/{businessId}/reels/{reelId}/output.mp4`.
   - Download and play the MP4 to confirm video codec, duration, and visual layout.

---

## 3. Live Paddle Payment & Webhook Verification

### Objective
Verify that live billing events securely grant credits and update subscriptions.

### Checklist Steps
1. **Paddle Dashboard Configuration**:
   - In Paddle Vendor Dashboard, navigate to **Developer Tools > Webhooks**.
   - Set Notification URL to:
     `https://asia-south1-brainwise-ai-marketing-engine.cloudfunctions.net/paddleWebhook`
   - Select events:
     - `subscription.created`, `subscription.updated`, `subscription.canceled`
     - `transaction.completed`, `transaction.payment_failed`
     - `adjustment.created`, `adjustment.updated`
2. **Secret Manager Setup**:
   ```bash
   firebase functions:secrets:set PADDLE_WEBHOOK_SECRET
   firebase functions:secrets:set PADDLE_API_KEY
   ```
3. **Live Test Transaction**:
   - Sign up with a test user account on the production web app.
   - Select the Starter Plan or a Credit Pack.
   - Complete checkout using a live credit card (or low-value test amount).
4. **Entitlement Audit**:
   - Check Firestore document `/users/{userId}` to confirm `subscriptionId` is set.
   - Check Firestore document `/usage/{userId}_{YYYY-MM}` to confirm monthly credits are allocated.
   - Check Firestore document `/paddle_grants/{transactionId}` to confirm status is `granted`.
5. **Idempotency Test**:
   - In Paddle Dashboard, select the completed webhook event and click **Resend**.
   - Verify in Firebase Cloud Logging that `paddleWebhook` logs `plan entitlement already applied (duplicate delivery)` and credit total remains unchanged.
