import * as admin from 'firebase-admin';

admin.initializeApp();

// Phase 12 fix: the Admin SDK's Firestore client throws
// "Value for argument \"data\" is not a valid Firestore document. Cannot
// use \"undefined\" as a Firestore value" by default whenever ANY field
// in a write is `undefined` — which optional TypeScript fields (e.g.
// Campaign.productId when a user supplies a new, unsaved product instead
// of an existing one) produce constantly. This was a real, previously
// undetected crash on the createCampaignDoc call in
// generateCampaignStrategy.ts for every "new product" campaign (confirmed
// with a real Firestore-emulator test — see
// generateCampaignStrategy.recovery.test.ts), not a test-only artifact:
// no code anywhere in this project ever set this option, so the default
// (strict) behavior was always in effect. Enabling it here, once,
// globally, is Firestore's own documented mechanism for exactly this
// case (undefined fields are simply omitted from the write, matching
// what every call site here already assumed would happen).
admin.firestore().settings({ ignoreUndefinedProperties: true });

export { healthCheck } from './healthCheck';
export { createBusiness } from './functions/business/createBusiness';
export { getBusiness } from './functions/business/getBusiness';
export { listBusinesses } from './functions/business/listBusinesses';
export { updateBusiness } from './functions/business/updateBusiness';
export { updateBusinessBrain } from './functions/business/updateBusinessBrain';
export { createBrandKit } from './functions/brandKit/createBrandKit';
export { getBrandKit } from './functions/brandKit/getBrandKit';
export { updateBrandKit } from './functions/brandKit/updateBrandKit';
export { listCreativeTemplates } from './functions/templates/listCreativeTemplates';
export { createSavedStyle } from './functions/savedStyles/createSavedStyle';
export { listSavedStyles } from './functions/savedStyles/listSavedStyles';
export { updateSavedStyle } from './functions/savedStyles/updateSavedStyle';
export { deactivateSavedStyle } from './functions/savedStyles/deactivateSavedStyle';
export { analyzeReferenceStyle } from './functions/savedStyles/analyzeReferenceStyle';
export { createProduct } from './functions/products/createProduct';
export { listProducts } from './functions/products/listProducts';
export { getProduct } from './functions/products/getProduct';
export { updateProduct } from './functions/products/updateProduct';
export { archiveProduct } from './functions/products/archiveProduct';
// createCampaign is intentionally NOT deployed here. It reserves credits via
// the legacy reserveCredits() path but never calls confirmCredits/
// refundCredits — every invocation permanently burns the caller's credits
// with no recovery path (see docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md, finding
// F2 / candidate C2). The shipped frontend has only ever called
// generateCampaignStrategy (see that file's own comment), so removing this
// export changes no user-facing behavior; it only stops the callable from
// being directly invocable. The handler and its tests are untouched — they
// import functions/campaigns/createCampaign.ts directly, not this file.
export { generateCampaignStrategy } from './functions/campaigns/generateCampaignStrategy';
export { getCampaign } from './functions/campaigns/getCampaign';
export { listCampaigns } from './functions/campaigns/listCampaigns';
export { updateCampaign } from './functions/campaigns/updateCampaign';
export { updateCampaignStatus } from './functions/campaigns/updateCampaignStatus';
export { regenerateAsset } from './functions/campaigns/regenerateAsset';
export { submitCreativeFeedback } from './functions/campaigns/submitCreativeFeedback';
export { onUserCreatedHandler } from './functions/auth/onUserCreated';
export { onUserDeletedHandler } from './functions/auth/onUserCreated';
export { getUploadUrl } from './functions/assets/getUploadUrl';
export { confirmUpload } from './functions/assets/confirmUpload';
// Razorpay: kept deployed, but no longer the active checkout path on the
// billing page (see src/app/billing/page.tsx) — PayU is now primary. Not
// removed per the migration's own rule: existing Razorpay subscriptions
// created before this migration must keep working (renewal webhooks,
// cancellation) until they naturally lapse, and this function hasn't been
// re-verified as dead. See docs/PAYMENT_GATEWAY.md "Razorpay legacy".
export { razorpayWebhook } from './functions/webhooks/razorpayWebhook';
export { createSubscription } from './functions/subscriptions/createSubscription';
export { verifyPayment } from './functions/subscriptions/verifyPayment';
export { cancelSubscription } from './functions/subscriptions/cancelSubscription';
export { createPayUPayment } from './functions/subscriptions/createPayUPayment';
export { payuCallback } from './functions/webhooks/payuCallback';
export { payuWebhook } from './functions/webhooks/payuWebhook';
export { requestAccountDeletion } from './functions/auth/requestAccountDeletion';
export { recordConsentAcceptance } from './functions/auth/recordConsentAcceptance';
export { trackAnalyticsEvent } from './functions/analytics/trackAnalyticsEvent';
export { trackCreativeEventEndpoint } from './functions/analytics/trackCreativeEventEndpoint';
export { getAnalyticsDashboard } from './functions/analytics/getAnalyticsDashboard';
export { recordWhatsAppClick } from './functions/analytics/recordWhatsAppClick';
export { getCampaignPerformance } from './functions/analytics/getCampaignPerformance';
export { createReelProject } from './functions/reels/createReelProject';
export { getReelClipUploadUrl } from './functions/reels/getReelClipUploadUrl';
export { confirmReelClipUpload } from './functions/reels/confirmReelClipUpload';
export { generateReel } from './functions/reels/generateReel';
export { getReel } from './functions/reels/getReel';
export { listReels } from './functions/reels/listReels';
