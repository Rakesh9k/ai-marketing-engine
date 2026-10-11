# Mitra AI Marketing Engine — Owner Actions Required

This document provides explicit, non-secret step-by-step instructions for the project owner or infrastructure lead to complete final production deployment steps.

---

## Action Item 1: Cloud Run Reel Renderer Deployment (Required for Video Reels)

### Purpose
Deploys the Node.js + FFmpeg video rendering microservice to GCP Cloud Run and binds its URL to Cloud Functions.

### Execution Steps
```bash
# 1. Navigate to the reel renderer directory
cd services/reel-renderer

# 2. Build container image via Google Cloud Build
gcloud builds submit --tag gcr.io/brainwise-ai-marketing-engine/reel-renderer:latest .

# 3. Deploy container image to Cloud Run in asia-south1
gcloud run deploy reel-renderer \
  --image gcr.io/brainwise-ai-marketing-engine/reel-renderer:latest \
  --region asia-south1 \
  --no-allow-unauthenticated \
  --cpu 2 \
  --memory 2Gi \
  --timeout 300s

# 4. Set Cloud Functions secret for REEL_RENDERER_URL
firebase functions:secrets:set REEL_RENDERER_URL
# When prompted, paste the Cloud Run service URL (e.g., https://reel-renderer-xxx-el.a.run.app)
```

---

## Action Item 2: Production Paddle Webhook Verification (Required for Paid Launch)

### Purpose
Verifies that real Paddle checkout events reach `paddleWebhook` and grant credits to live user accounts.

### Execution Steps
1. **Paddle Vendor Dashboard**:
   - Navigate to **Developer Tools > Webhooks**.
   - Add Notification Destination URL:
     `https://asia-south1-brainwise-ai-marketing-engine.cloudfunctions.net/paddleWebhook`
   - Select event notifications:
     - `subscription.created`, `subscription.updated`, `subscription.canceled`
     - `transaction.completed`, `transaction.payment_failed`
     - `adjustment.created`, `adjustment.updated`
2. **Secret Manager Setup**:
   ```bash
   firebase functions:secrets:set PADDLE_WEBHOOK_SECRET
   firebase functions:secrets:set PADDLE_API_KEY
   ```
3. **Live Test Charge**:
   - Register a real user account on the production web app.
   - Purchase the Starter Plan or a top-up credit pack using a live payment card.
   - Verify in Firestore that `/usage/{userId}_{YYYY-MM}` updates with paid credits and `/paddle_grants/{transactionId}` records status `granted`.

---

## Action Item 3: reCAPTCHA Enterprise Authorized Domain Registration

### Purpose
Ensures reCAPTCHA Enterprise site key accepts requests from production web domains.

### Execution Steps
1. Open [Google Cloud Console reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha).
2. Select key `6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3`.
3. Ensure your production domains (e.g. `brain-wise.com`, `brainwise-ai-marketing-engine.web.app`) are added under **Domain List**.
