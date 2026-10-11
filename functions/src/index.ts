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
// P0-2 (docs/P0_HARDENING_TRACKER.md): createCampaign.ts (and its
// competing reserveCredits() credit path in services/firestore.ts) has been
// deleted entirely, not just unplugged — it was never deployed, the shipped
// frontend has only ever called generateCampaignStrategy, and it had no
// matching refund/finalize path (see docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md,
// finding F2 / candidate C2). One credit reservation implementation now
// exists: services/usageControl.ts, used by generateCampaignStrategy and
// regenerateAsset.
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
export { deleteAsset } from './functions/assets/deleteAsset';
// Payments: Paddle is the live provider (requires the PADDLE_API_KEY / PADDLE_WEBHOOK_SECRET secrets and
// PADDLE_PRICE_ID_* config; see docs/PAYMENT_GATEWAY.md). The Cashfree functions below are exported and
// deploy with the bundle, but their production status is UNVERIFIED (see docs/audits/mitra-complete-audit);
// do not treat Cashfree as the primary gateway.
export { createPaddleCheckout } from './functions/subscriptions/createPaddleCheckout';
export { cancelPaddleSubscription } from './functions/subscriptions/cancelPaddleSubscription';
export { paddleWebhook } from './functions/webhooks/paddleWebhook';

export { createCashfreeCheckout } from './functions/subscriptions/createCashfreeCheckout';
export { cancelCashfreeSubscription } from './functions/subscriptions/cancelCashfreeSubscription';
export { cashfreeWebhook } from './functions/webhooks/cashfreeWebhook';
// PayU is kept in the repo for migration/rollback but deliberately NOT exported, so the
// app can never present two competing payment flows. To roll back, re-enable these and
// point src/app/billing/page.tsx back at createPayUPayment (see docs/PAYMENT_GATEWAY.md).
// export { createPayUPayment } from './functions/subscriptions/createPayUPayment';
// export { payuCallback } from './functions/webhooks/payuCallback';
// export { payuWebhook } from './functions/webhooks/payuWebhook';

// M2 (Pass 2): scheduled reconciliation for stuck 'pending' credit
// reservations (see reconcileStaleReservations.ts's own doc comment).
export { reconcileStaleReservations } from './functions/usage/reconcileStaleReservations';
// Phase 10 Rate Limiting & Abuse Protection audit (finding F-5): periodic
// cleanup for expired rate_limits documents (see cleanupExpiredRateLimits.ts's
// own doc comment).
export { cleanupExpiredRateLimits } from './functions/usage/cleanupExpiredRateLimits';
// Daily subscription expiry: transitions cancelAtPeriodEnd subscriptions to
// 'canceled' once currentPeriodEnd has passed (see expireSubscriptions.ts).
export { expireSubscriptions } from './functions/subscriptions/expireSubscriptions';
export { requestAccountDeletion } from './functions/auth/requestAccountDeletion';
export { recordConsentAcceptance } from './functions/auth/recordConsentAcceptance';
export { saveOnboardingDraft } from './functions/onboarding/saveOnboardingDraft';
export { discoverOnboardingFacts } from './functions/onboarding/discoverOnboardingFacts';
export { confirmOnboardingBusiness } from './functions/onboarding/confirmOnboardingBusiness';
export { trackAnalyticsEvent } from './functions/analytics/trackAnalyticsEvent';
export { trackCreativeEventEndpoint } from './functions/analytics/trackCreativeEventEndpoint';
export { getAnalyticsDashboard } from './functions/analytics/getAnalyticsDashboard';
export { recordWhatsAppClick } from './functions/analytics/recordWhatsAppClick';
export { getCampaignPerformance } from './functions/analytics/getCampaignPerformance';
export { syncCampaignPerformance } from './functions/analytics/syncCampaignPerformance';
export { getPerformanceRecommendations } from './functions/analytics/getPerformanceRecommendations';
export { createReelProject } from './functions/reels/createReelProject';
export { getReelClipUploadUrl } from './functions/reels/getReelClipUploadUrl';
export { confirmReelClipUpload } from './functions/reels/confirmReelClipUpload';
export { generateReel } from './functions/reels/generateReel';
export { getReel } from './functions/reels/getReel';
export { listReels } from './functions/reels/listReels';

// Disabled Meta social connection functions (require META_APP_SECRET / META_TOKEN_ENCRYPTION_KEY)
// export { initiateMetaOAuth } from './functions/meta/initiateMetaOAuth';
// export { metaCallback } from './functions/meta/metaCallback';
// export { getPendingMetaPages } from './functions/meta/getPendingMetaPages';
// export { selectMetaPage } from './functions/meta/selectMetaPage';
// export { listSocialConnections } from './functions/meta/listSocialConnections';
// export { disconnectMetaConnection } from './functions/meta/disconnectMetaConnection';

// Disabled social publishing and scheduling functions
// export { createPublishJob } from './functions/publishing/createPublishJob';
// export { cancelPublishJob } from './functions/publishing/cancelPublishJob';
// export { retryPublishJob } from './functions/publishing/retryPublishJob';
// export { listCampaignPublishJobs } from './functions/publishing/listCampaignPublishJobs';
// export { processScheduledPublishJobs } from './functions/publishing/processScheduledPublishJobs';
// export { createSchedule } from './functions/scheduling/createSchedule';
// export { cancelSchedule } from './functions/scheduling/cancelSchedule';
// export { reschedulePost } from './functions/scheduling/reschedulePost';
// export { retrySchedule } from './functions/scheduling/retrySchedule';
// export { listCampaignScheduledPosts } from './functions/scheduling/listCampaignScheduledPosts';
// export { processScheduledPosts } from './functions/scheduling/processScheduledPosts';

export { generateMarketingPlan } from './functions/calendar/generateMarketingPlan';
export { getMarketingPlan } from './functions/calendar/getMarketingPlan';
export { updateCalendarItem } from './functions/calendar/updateCalendarItem';
export { skipCalendarItem } from './functions/calendar/skipCalendarItem';
export { createCampaignFromCalendarItem } from './functions/calendar/createCampaignFromCalendarItem';

// Phase 10.21 — Creative Brain API Endpoints
export { getCreativeBrainSession } from './functions/creativeBrain/getCreativeBrainSession';
export { createCreativeBrainSession } from './functions/creativeBrain/createCreativeBrainSession';
export { getStrategicConfirmationEndpoint } from './functions/creativeBrain/getStrategicConfirmation';
export { generateStrategicConfirmationEndpoint } from './functions/creativeBrain/generateStrategicConfirmation';
export { submitStrategicDecisionEndpoint } from './functions/creativeBrain/submitStrategicDecision';
export { exploreCreativeDirectionEndpoint } from './functions/creativeBrain/exploreCreativeDirection';
export { reviseCreativeBrainSessionEndpoint } from './functions/creativeBrain/reviseCreativeBrainSession';
export { getCreativeBrainOperationEndpoint } from './functions/creativeBrain/getCreativeBrainOperation';

