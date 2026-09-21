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
export { createProduct } from './functions/products/createProduct';
export { listProducts } from './functions/products/listProducts';
export { getProduct } from './functions/products/getProduct';
export { updateProduct } from './functions/products/updateProduct';
export { archiveProduct } from './functions/products/archiveProduct';
export { createCampaign } from './functions/campaigns/createCampaign';
export { generateCampaignStrategy } from './functions/campaigns/generateCampaignStrategy';
export { getCampaign } from './functions/campaigns/getCampaign';
export { listCampaigns } from './functions/campaigns/listCampaigns';
export { updateCampaign } from './functions/campaigns/updateCampaign';
export { updateCampaignStatus } from './functions/campaigns/updateCampaignStatus';
export { regenerateAsset } from './functions/campaigns/regenerateAsset';
export { onUserCreatedHandler } from './functions/auth/onUserCreated';
export { onUserDeletedHandler } from './functions/auth/onUserCreated';
export { getUploadUrl } from './functions/assets/getUploadUrl';
export { confirmUpload } from './functions/assets/confirmUpload';
export { razorpayWebhook } from './functions/webhooks/razorpayWebhook';
export { createSubscription } from './functions/subscriptions/createSubscription';
export { verifyPayment } from './functions/subscriptions/verifyPayment';
export { trackAnalyticsEvent } from './functions/analytics/trackAnalyticsEvent';
export { getAnalyticsDashboard } from './functions/analytics/getAnalyticsDashboard';
export { recordWhatsAppClick } from './functions/analytics/recordWhatsAppClick';
export { getCampaignPerformance } from './functions/analytics/getCampaignPerformance';
export { createReelProject } from './functions/reels/createReelProject';
export { getReelClipUploadUrl } from './functions/reels/getReelClipUploadUrl';
export { confirmReelClipUpload } from './functions/reels/confirmReelClipUpload';
export { generateReel } from './functions/reels/generateReel';
export { getReel } from './functions/reels/getReel';
export { listReels } from './functions/reels/listReels';
