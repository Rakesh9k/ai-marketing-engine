import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  User,
  Business,
  BrandKit,
  SavedStyle,
  Product,
  Campaign,
  CampaignAsset,
  Subscription,
  Usage,
  Transaction,
  AnalyticsEvent,
  GenerationLog,
  Asset,
  CampaignPerformance,
  ReelProject,
  CreativeFeedback,
  PublishJob,
  ScheduledPost,
} from '../types';
import type {
  MetaOAuthStateDoc,
  SocialConnection,
  EncryptedCredentialDoc,
  PendingPageSelectionSession,
  PostPerformanceRecord,
} from '../types/meta';

// Lazy proxy to defer admin.firestore() evaluation until first operational access,
// preventing "The default Firebase app does not exist" errors when importing firestore.ts in tests.
const db = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop, receiver) {
    const firestore = admin.firestore();
    const value = Reflect.get(firestore, prop, receiver);
    return typeof value === 'function' ? value.bind(firestore) : value;
  },
});

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

export async function createUserDoc(user: User): Promise<void> {
  await db
    .collection('users')
    .doc(user.userId)
    .set({
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getUserDoc(userId: string): Promise<User | null> {
  const snap = await db.collection('users').doc(userId).get();
  return snap.exists ? (snap.data() as User) : null;
}

export async function updateUserDoc(userId: string, data: Partial<User>): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function addBusinessIdToUser(userId: string, businessId: string): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .update({
      businessIds: FieldValue.arrayUnion(businessId),
      updatedAt: serverTimestamp(),
    });
}

export async function removeBusinessIdFromUser(userId: string, businessId: string): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .update({
      businessIds: FieldValue.arrayRemove(businessId),
      updatedAt: serverTimestamp(),
    });
}

export async function createBusinessDoc(business: Business): Promise<void> {
  await db
    .collection('businesses')
    .doc(business.businessId)
    .set({
      ...business,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getBusinessDoc(businessId: string): Promise<Business | null> {
  const snap = await db.collection('businesses').doc(businessId).get();
  return snap.exists ? (snap.data() as Business) : null;
}

export async function updateBusinessDoc(
  businessId: string,
  data: Partial<Business>
): Promise<void> {
  await db
    .collection('businesses')
    .doc(businessId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function getBusinessesByUser(userId: string): Promise<Business[]> {
  const snap = await db
    .collection('businesses')
    .where('userId', '==', userId)
    .where('status', '!=', 'archived')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => doc.data() as Business);
}

export async function createBrandKitDoc(brandKit: BrandKit): Promise<void> {
  await db
    .collection('brand_kits')
    .doc(brandKit.businessId)
    .set({
      ...brandKit,
      updatedAt: serverTimestamp(),
    });
}

export async function getBrandKitDoc(businessId: string): Promise<BrandKit | null> {
  const snap = await db.collection('brand_kits').doc(businessId).get();
  return snap.exists ? (snap.data() as BrandKit) : null;
}

export async function updateBrandKitDoc(
  businessId: string,
  data: Partial<BrandKit>
): Promise<void> {
  await db
    .collection('brand_kits')
    .doc(businessId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function createSavedStyleDoc(style: SavedStyle): Promise<void> {
  await db.collection('saved_styles').doc(style.styleId).set(style);
}

export async function createCreativeFeedbackDoc(feedback: CreativeFeedback): Promise<void> {
  await db.collection('creative_feedback').doc(feedback.feedbackId).set(feedback);
}

export async function getCreativePreferencesByBusiness(
  businessId: string
): Promise<import('../types').CreativePreference[]> {
  const snap = await db
    .collection('creative_preferences')
    .where('businessId', '==', businessId)
    .get();
  return snap.docs.map((doc) => doc.data() as import('../types').CreativePreference);
}

export async function getSavedStyleDoc(styleId: string): Promise<SavedStyle | null> {
  const snap = await db.collection('saved_styles').doc(styleId).get();
  return snap.exists ? (snap.data() as SavedStyle) : null;
}

export async function getSavedStylesByBusiness(businessId: string): Promise<SavedStyle[]> {
  const snap = await db
    .collection('saved_styles')
    .where('businessId', '==', businessId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => doc.data() as SavedStyle);
}

export async function updateSavedStyleDoc(
  styleId: string,
  data: Partial<SavedStyle>
): Promise<void> {
  await db.collection('saved_styles').doc(styleId).update(data);
}

export async function createProductDoc(product: Product): Promise<void> {
  await db
    .collection('products')
    .doc(product.productId)
    .set({
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getProductDoc(productId: string): Promise<Product | null> {
  const snap = await db.collection('products').doc(productId).get();
  return snap.exists ? (snap.data() as Product) : null;
}

export async function updateProductDoc(productId: string, data: Partial<Product>): Promise<void> {
  await db
    .collection('products')
    .doc(productId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function getProductsByBusiness(businessId: string): Promise<Product[]> {
  const snap = await db
    .collection('products')
    .where('businessId', '==', businessId)
    .where('status', '!=', 'archived')
    .orderBy('sortOrder', 'asc')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => doc.data() as Product);
}

export async function createCampaignDoc(campaign: Campaign): Promise<void> {
  await db
    .collection('campaigns')
    .doc(campaign.campaignId)
    .set({
      ...campaign,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getCampaignDoc(campaignId: string): Promise<Campaign | null> {
  const snap = await db.collection('campaigns').doc(campaignId).get();
  return snap.exists ? (snap.data() as Campaign) : null;
}

export async function updateCampaignDoc(
  campaignId: string,
  data: Partial<Campaign>
): Promise<void> {
  await db
    .collection('campaigns')
    .doc(campaignId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

/**
 * Phase 34 — reads the single, server-authoritative performance aggregate
 * for a campaign. Returns null when no event has ever been recorded for
 * this campaign (a real "no data yet" state, not a fabricated zero — the
 * caller decides how to represent that, e.g. getCampaignPerformance.ts
 * still reports whatsappClicks: 0 there since "zero real clicks recorded"
 * is a known, true fact, but inquiries always stays null/unavailable).
 */
export async function getCampaignPerformanceDoc(
  campaignId: string
): Promise<CampaignPerformance | null> {
  const snap = await db.collection('campaign_performance').doc(campaignId).get();
  return snap.exists ? (snap.data() as CampaignPerformance) : null;
}

export async function getPostPerformanceDoc(
  performanceId: string
): Promise<PostPerformanceRecord | null> {
  const snap = await db.collection('post_performance').doc(performanceId).get();
  return snap.exists ? (snap.data() as PostPerformanceRecord) : null;
}

export async function setPostPerformanceDoc(
  record: PostPerformanceRecord
): Promise<PostPerformanceRecord> {
  await db.collection('post_performance').doc(record.performanceId).set(record, { merge: true });
  return record;
}

export async function listPostPerformanceForCampaign(
  campaignId: string
): Promise<PostPerformanceRecord[]> {
  const snap = await db.collection('post_performance').where('campaignId', '==', campaignId).get();
  return snap.docs.map((doc) => doc.data() as PostPerformanceRecord);
}

/**
 * Atomically increments a campaign's real whatsappClicks count by 1.
 * FieldValue.increment is applied server-side by Firestore itself, so this
 * is safe under concurrent calls without a read-modify-write race — no
 * transaction needed for a single-field, single-document increment.
 * `inquiries` is only ever set to null here (once, on first creation,
 * preserved by `merge: true` afterward) — this function has no path that
 * could ever turn a click into an inquiry.
 */
export async function incrementCampaignWhatsAppClicks(
  campaignId: string,
  businessId: string
): Promise<void> {
  const ref = db.collection('campaign_performance').doc(campaignId);
  await ref.set(
    {
      campaignId,
      businessId,
      whatsappClicks: FieldValue.increment(1),
      inquiries: null,
      updatedAt: serverTimestamp(),
      lastEventAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateCampaignStatus(
  campaignId: string,
  status: Campaign['status'],
  additionalData?: Partial<Campaign>
): Promise<void> {
  await db
    .collection('campaigns')
    .doc(campaignId)
    .update({
      status,
      ...additionalData,
      updatedAt: serverTimestamp(),
    });
}

/**
 * M3 (Pass 2) — a retry (client timeout, network resend) of a request that
 * already fully completed must return the campaign it already created,
 * never re-run the whole (billable) generation pipeline a second time.
 * Looked up by the client-supplied idempotencyKey stored on
 * campaign.metadata.idempotencyKey (generateCampaignStrategy.ts).
 */
export async function getCampaignByIdempotencyKey(
  idempotencyKey: string
): Promise<Campaign | null> {
  const snap = await db
    .collection('campaigns')
    .where('metadata.idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0]!.data() as Campaign);
}

export async function getCampaignsByBusiness(
  businessId: string,
  status?: Campaign['status'],
  limitCount = 20,
  startAfterDoc?: admin.firestore.DocumentSnapshot
): Promise<{ campaigns: Campaign[]; lastDoc: admin.firestore.DocumentSnapshot | null }> {
  let query: admin.firestore.Query = db
    .collection('campaigns')
    .where('businessId', '==', businessId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  if (status) {
    query = query.where('status', '==', status);
  }

  if (startAfterDoc) {
    query = query.startAfter(startAfterDoc);
  }

  const snap = await query.get();
  return {
    campaigns: snap.docs.map((doc) => doc.data() as Campaign),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

export async function getCampaignsByUser(
  userId: string,
  limitCount = 20,
  startAfterDoc?: admin.firestore.DocumentSnapshot
): Promise<{ campaigns: Campaign[]; lastDoc: admin.firestore.DocumentSnapshot | null }> {
  let query: admin.firestore.Query = db
    .collection('campaigns')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  if (startAfterDoc) {
    query = query.startAfter(startAfterDoc);
  }

  const snap = await query.get();
  return {
    campaigns: snap.docs.map((doc) => doc.data() as Campaign),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

export async function createCampaignAssets(assets: CampaignAsset[]): Promise<void> {
  const batch = db.batch();
  for (const asset of assets) {
    const ref = db.collection('campaign_assets').doc(asset.assetId);
    batch.set(ref, {
      ...asset,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function getCampaignAssets(campaignId: string): Promise<CampaignAsset[]> {
  const snap = await db
    .collection('campaign_assets')
    .where('campaignId', '==', campaignId)
    .orderBy('type', 'asc')
    .orderBy('index', 'asc')
    .get();
  return snap.docs.map((doc) => doc.data() as CampaignAsset);
}

export async function getCampaignAssetDoc(assetId: string): Promise<CampaignAsset | null> {
  const snap = await db.collection('campaign_assets').doc(assetId).get();
  return snap.exists ? (snap.data() as CampaignAsset) : null;
}

export async function updateCampaignAssetDoc(
  assetId: string,
  data: Partial<CampaignAsset>
): Promise<void> {
  await db
    .collection('campaign_assets')
    .doc(assetId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function createSubscriptionDoc(subscription: Subscription): Promise<void> {
  await db
    .collection('subscriptions')
    .doc(subscription.subscriptionId)
    .set({
      ...subscription,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getSubscriptionDoc(subscriptionId: string): Promise<Subscription | null> {
  const snap = await db.collection('subscriptions').doc(subscriptionId).get();
  return snap.exists ? (snap.data() as Subscription) : null;
}

const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];

/**
 * The user's current subscription.
 *
 * A user can have several "live" subscription docs at once: the Free one created at signup
 * stays `active` after they buy a paid plan. An unordered `limit(1)` query therefore returned
 * an arbitrary one — a paying customer could be treated as Free (entitlement gating, billing
 * UI). Resolution order:
 *   1. the `users/{uid}.subscriptionId` pointer, which the payment webhook keeps current;
 *   2. otherwise any live subscription, preferring a paid one over Free.
 */
export async function getSubscriptionByUser(userId: string): Promise<Subscription | null> {
  const userSnap = await db.collection('users').doc(userId).get();
  const pointer = userSnap.data()?.['subscriptionId'] as string | undefined;
  if (pointer) {
    const data = (await db.collection('subscriptions').doc(pointer).get()).data();
    if (
      data &&
      data['userId'] === userId &&
      LIVE_SUBSCRIPTION_STATUSES.includes(data['status'] as string)
    ) {
      return data as Subscription;
    }
  }

  const snap = await db
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', 'in', LIVE_SUBSCRIPTION_STATUSES)
    .limit(10)
    .get();
  const live = snap.docs.map((d) => d.data() as Subscription);
  return live.find((sub) => sub.planId !== 'free') ?? live[0] ?? null;
}

export async function updateSubscriptionDoc(
  subscriptionId: string,
  data: Partial<Subscription>
): Promise<void> {
  await db
    .collection('subscriptions')
    .doc(subscriptionId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export function getUsageDocId(userId: string, periodStart: Date): string {
  const dateStr = periodStart.toISOString().split('T')[0];
  return `${userId}_${dateStr}`;
}

export async function getUsageDoc(usageId: string): Promise<Usage | null> {
  const snap = await db.collection('usage').doc(usageId).get();
  return snap.exists ? (snap.data() as Usage) : null;
}

export async function getCurrentUsage(userId: string): Promise<Usage | null> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageId = getUsageDocId(userId, periodStart);
  return getUsageDoc(usageId);
}

export async function createUsageDoc(usage: Usage): Promise<void> {
  await db
    .collection('usage')
    .doc(usage.usageId)
    .set({
      ...usage,
      updatedAt: serverTimestamp(),
    });
}

export async function incrementUsageField(
  usageId: string,
  field: string,
  amount: number
): Promise<void> {
  await db
    .collection('usage')
    .doc(usageId)
    .update({
      [field]: FieldValue.increment(amount),
      updatedAt: serverTimestamp(),
    });
}

export async function createTransactionDoc(transaction: Transaction): Promise<void> {
  await db
    .collection('transactions')
    .doc(transaction.transactionId)
    .set({
      ...transaction,
      createdAt: serverTimestamp(),
    });
}

export async function getTransactionDoc(transactionId: string): Promise<Transaction | null> {
  const snap = await db.collection('transactions').doc(transactionId).get();
  return snap.exists ? (snap.data() as Transaction) : null;
}

export async function getTransactionsByUser(
  userId: string,
  limitCount = 50
): Promise<Transaction[]> {
  const snap = await db
    .collection('transactions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();
  return snap.docs.map((doc) => doc.data() as Transaction);
}

// P0-2 (docs/P0_HARDENING_TRACKER.md): reserveCredits/confirmCredits/
// refundCredits were a second, competing credit-reservation implementation
// used only by the orphaned `createCampaign` Cloud Function (never deployed
// — see index.ts) — reserveCredits had no matching finalize/refund call
// anywhere, was the source of the credit-loss bug, and separately read a
// `creditsIncluded` Firestore field that no code ever wrote (every real
// Usage doc computes available credits from getMonthlyCredits(planId)
// instead — see usageControl.ts). The canonical, single implementation is
// services/usageControl.ts (reserveCreditsForOperation / finalizeReservation
// / refundReservation via executeWithUsageControl), already used by both
// generateCampaignStrategy and regenerateAsset. Removed rather than
// repaired, per the P0-2 decision: one credit reservation implementation,
// not multiple competing versions.

export async function logAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  await db
    .collection('analytics_events')
    .doc(event.eventId)
    .set({
      ...event,
      timestamp: serverTimestamp(),
    });
}

export async function createGenerationLog(log: GenerationLog): Promise<void> {
  await db
    .collection('generation_logs')
    .doc(log.logId)
    .set({
      ...log,
      createdAt: serverTimestamp(),
    });
}

// Asset functions
export async function createAssetDoc(asset: Asset): Promise<void> {
  await db
    .collection('assets')
    .doc(asset.assetId)
    .set({
      ...asset,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getAssetDoc(assetId: string): Promise<Asset | null> {
  const snap = await db.collection('assets').doc(assetId).get();
  return snap.exists ? (snap.data() as Asset) : null;
}

export async function getAssetsByBusiness(
  businessId: string,
  assetType?: Asset['assetType'],
  limitCount = 50
): Promise<Asset[]> {
  let query: admin.firestore.Query = db
    .collection('assets')
    .where('businessId', '==', businessId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  if (assetType) {
    query = query.where('assetType', '==', assetType);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => doc.data() as Asset);
}

export async function updateAssetDoc(assetId: string, data: Partial<Asset>): Promise<void> {
  await db
    .collection('assets')
    .doc(assetId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function deleteAssetDoc(assetId: string): Promise<void> {
  await db.collection('assets').doc(assetId).update({
    status: 'archived',
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Reel project functions ("Create a Reel")
export async function createReelProjectDoc(reel: ReelProject): Promise<void> {
  await db
    .collection('reels')
    .doc(reel.reelId)
    .set({
      ...reel,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function getReelProjectDoc(reelId: string): Promise<ReelProject | null> {
  const snap = await db.collection('reels').doc(reelId).get();
  return snap.exists ? (snap.data() as ReelProject) : null;
}

export async function updateReelProjectDoc(
  reelId: string,
  data: Partial<ReelProject>
): Promise<void> {
  await db
    .collection('reels')
    .doc(reelId)
    .update({
      ...data,
      updatedAt: serverTimestamp(),
    });
}

export async function getReelProjectsByBusiness(
  businessId: string,
  limitCount = 20,
  startAfterDoc?: admin.firestore.DocumentSnapshot
): Promise<{ reels: ReelProject[]; lastDoc: admin.firestore.DocumentSnapshot | null }> {
  let query: admin.firestore.Query = db
    .collection('reels')
    .where('businessId', '==', businessId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  if (startAfterDoc) {
    query = query.startAfter(startAfterDoc);
  }

  const snap = await query.get();
  return {
    reels: snap.docs.map((doc) => doc.data() as ReelProject),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

/* ============================================================================
 * Meta Social Account & OAuth Firestore Collections
 * ============================================================================ */

export async function createOAuthStateDoc(doc: MetaOAuthStateDoc): Promise<void> {
  await db.collection('metaOAuthStates').doc(doc.stateId).set(doc);
}

export async function getOAuthStateDoc(stateId: string): Promise<MetaOAuthStateDoc | null> {
  const snap = await db.collection('metaOAuthStates').doc(stateId).get();
  return snap.exists ? (snap.data() as MetaOAuthStateDoc) : null;
}

export async function consumeOAuthStateDoc(stateId: string): Promise<void> {
  await db.collection('metaOAuthStates').doc(stateId).update({
    consumedAt: new Date().toISOString(),
  });
}

export async function createPendingPageSelectionSession(
  session: PendingPageSelectionSession
): Promise<void> {
  await db.collection('pendingMetaSessions').doc(session.stateId).set(session);
}

export async function getPendingPageSelectionSession(
  stateId: string
): Promise<PendingPageSelectionSession | null> {
  const snap = await db.collection('pendingMetaSessions').doc(stateId).get();
  return snap.exists ? (snap.data() as PendingPageSelectionSession) : null;
}

export async function deletePendingPageSelectionSession(stateId: string): Promise<void> {
  await db.collection('pendingMetaSessions').doc(stateId).delete();
}

export async function createEncryptedCredentialDoc(doc: EncryptedCredentialDoc): Promise<void> {
  await db.collection('metaCredentials').doc(doc.connectionId).set(doc);
}

export async function getEncryptedCredentialDoc(
  connectionId: string
): Promise<EncryptedCredentialDoc | null> {
  const snap = await db.collection('metaCredentials').doc(connectionId).get();
  return snap.exists ? (snap.data() as EncryptedCredentialDoc) : null;
}

export async function deleteEncryptedCredentialDoc(connectionId: string): Promise<void> {
  await db.collection('metaCredentials').doc(connectionId).delete();
}

export async function createSocialConnectionDoc(connection: SocialConnection): Promise<void> {
  await db
    .collection('users')
    .doc(connection.userId)
    .collection('socialConnections')
    .doc(connection.connectionId)
    .set(connection);
}

export async function updateSocialConnectionDoc(
  userId: string,
  connectionId: string,
  data: Partial<SocialConnection>
): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .collection('socialConnections')
    .doc(connectionId)
    .update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
}

export async function getSocialConnectionDoc(
  userId: string,
  connectionId: string
): Promise<SocialConnection | null> {
  const snap = await db
    .collection('users')
    .doc(userId)
    .collection('socialConnections')
    .doc(connectionId)
    .get();
  return snap.exists ? (snap.data() as SocialConnection) : null;
}

export async function listSocialConnectionsByUser(userId: string): Promise<SocialConnection[]> {
  const snap = await db.collection('users').doc(userId).collection('socialConnections').get();
  return snap.docs.map((doc) => doc.data() as SocialConnection);
}

export async function deleteSocialConnectionDoc(
  userId: string,
  connectionId: string
): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .collection('socialConnections')
    .doc(connectionId)
    .delete();
}

/* ============================================================================
 * Publish Jobs (Phase 10)
 * ============================================================================ */

export async function createPublishJobDoc(job: PublishJob): Promise<PublishJob> {
  const ref = db.collection('publishJobs').doc(job.jobId);
  const now = new Date().toISOString();
  const jobToSave = {
    ...job,
    createdAt: job.createdAt || now,
    updatedAt: now,
  };
  await ref.set(jobToSave);
  return jobToSave;
}

export async function getPublishJobDoc(jobId: string): Promise<PublishJob | null> {
  const snap = await db.collection('publishJobs').doc(jobId).get();
  return snap.exists ? (snap.data() as PublishJob) : null;
}

export async function findJobByIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<PublishJob | null> {
  const snap = await db
    .collection('publishJobs')
    .where('userId', '==', userId)
    .where('idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get();
  if (snap.empty || !snap.docs[0]) return null;
  return snap.docs[0].data() as PublishJob;
}

export async function updatePublishJobDoc(
  jobId: string,
  updates: Partial<PublishJob>
): Promise<PublishJob> {
  const ref = db.collection('publishJobs').doc(jobId);
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    updatedAt: now,
  };
  await ref.update(payload);
  const updatedSnap = await ref.get();
  return updatedSnap.data() as PublishJob;
}

export async function listPublishJobsForCampaign(
  userId: string,
  campaignId: string
): Promise<PublishJob[]> {
  const snap = await db
    .collection('publishJobs')
    .where('userId', '==', userId)
    .where('campaignId', '==', campaignId)
    .get();
  return snap.docs.map((doc) => doc.data() as PublishJob);
}

export async function getDueScheduledPublishJobs(limitCount = 20): Promise<PublishJob[]> {
  const nowStr = new Date().toISOString();
  const snap = await db
    .collection('publishJobs')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', nowStr)
    .limit(limitCount)
    .get();
  return snap.docs.map((doc) => doc.data() as PublishJob);
}

export async function claimPublishJobForProcessing(jobId: string): Promise<PublishJob | null> {
  const ref = db.collection('publishJobs').doc(jobId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as PublishJob;
    if (data.status !== 'scheduled' && data.status !== 'failed') {
      return null;
    }
    const now = new Date().toISOString();
    const updatedData: Partial<PublishJob> = {
      status: 'processing',
      attempts: (data.attempts || 0) + 1,
      lastAttemptAt: now,
      updatedAt: now,
    };
    tx.update(ref, updatedData);
    return { ...data, ...updatedData };
  });
}

/* ============================================================================
 * PHASE 11: SCHEDULING ENGINE REPOSITORY FUNCTIONS
 * ============================================================================ */

export async function createScheduledPostDoc(post: ScheduledPost): Promise<void> {
  await db.collection('scheduledPosts').doc(post.scheduledPostId).set(post);
}

export async function getScheduledPostDoc(scheduledPostId: string): Promise<ScheduledPost | null> {
  const snap = await db.collection('scheduledPosts').doc(scheduledPostId).get();
  return snap.exists ? (snap.data() as ScheduledPost) : null;
}

export async function findScheduledPostByIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<ScheduledPost | null> {
  const snap = await db
    .collection('scheduledPosts')
    .where('userId', '==', userId)
    .where('idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get();
  if (snap.empty || !snap.docs[0]) return null;
  return snap.docs[0].data() as ScheduledPost;
}

export async function updateScheduledPostDoc(
  scheduledPostId: string,
  updates: Partial<ScheduledPost>
): Promise<ScheduledPost> {
  const ref = db.collection('scheduledPosts').doc(scheduledPostId);
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await ref.update(payload);
  const updatedSnap = await ref.get();
  return updatedSnap.data() as ScheduledPost;
}

export async function listScheduledPostsForCampaign(
  userId: string,
  campaignId: string
): Promise<ScheduledPost[]> {
  const snap = await db
    .collection('scheduledPosts')
    .where('userId', '==', userId)
    .where('campaignId', '==', campaignId)
    .get();
  return snap.docs.map((doc) => doc.data() as ScheduledPost);
}

export async function listScheduledPostsForBusiness(
  userId: string,
  businessId: string
): Promise<ScheduledPost[]> {
  const snap = await db
    .collection('scheduledPosts')
    .where('userId', '==', userId)
    .where('businessId', '==', businessId)
    .get();
  return snap.docs.map((doc) => doc.data() as ScheduledPost);
}

export async function getDueScheduledPosts(limitCount = 50): Promise<ScheduledPost[]> {
  const nowIso = new Date().toISOString();

  // Query 1: Normal scheduled posts due for execution
  const dueSnap = await db
    .collection('scheduledPosts')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', nowIso)
    .limit(limitCount)
    .get();

  // Query 2: Processing posts whose worker lease has expired (worker crash recovery)
  const staleLeaseSnap = await db
    .collection('scheduledPosts')
    .where('status', '==', 'processing')
    .where('leaseExpiresAt', '<=', nowIso)
    .limit(limitCount)
    .get();

  const postsMap = new Map<string, ScheduledPost>();
  for (const doc of dueSnap.docs) {
    postsMap.set(doc.id, doc.data() as ScheduledPost);
  }
  for (const doc of staleLeaseSnap.docs) {
    postsMap.set(doc.id, doc.data() as ScheduledPost);
  }

  return Array.from(postsMap.values())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, limitCount);
}

export async function claimScheduledPostForProcessing(
  scheduledPostId: string,
  workerId: string,
  leaseDurationMs = 300000 // 5 minutes default lease
): Promise<ScheduledPost | null> {
  const ref = db.collection('scheduledPosts').doc(scheduledPostId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as ScheduledPost;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    // Check lease validity: eligible if 'scheduled' or if 'processing' with an expired lease
    const isScheduledDue =
      !!data.scheduledAt && data.status === 'scheduled' && data.scheduledAt <= nowIso;
    const isLeaseExpired =
      data.status === 'processing' && !!data.leaseExpiresAt && data.leaseExpiresAt <= nowIso;

    if (!isScheduledDue && !isLeaseExpired) {
      return null;
    }

    const leaseExpiresAt = new Date(nowMs + leaseDurationMs).toISOString();
    const attemptId = `att_${nowMs}_${Math.random().toString(36).substring(2, 9)}`;

    const updatedData: Partial<ScheduledPost> = {
      status: 'processing',
      processingBy: workerId,
      processingAt: nowIso,
      leaseExpiresAt,
      attemptId,
      attempts: (data.attempts || 0) + 1,
      lastAttemptAt: nowIso,
      updatedAt: nowIso,
    };

    tx.update(ref, updatedData);
    return { ...data, ...updatedData };
  });
}

// ============================================
// PHASE 18 — PERFORMANCE OBSERVATIONS & RECOMMENDATIONS
// ============================================

export async function setPerformanceObservationDoc(
  observation: import('../types/recommendation').PerformanceObservation
): Promise<void> {
  await db
    .collection('performance_observations')
    .doc(observation.observationId)
    .set(observation, { merge: true });
}

export async function getPerformanceObservationDoc(
  observationId: string
): Promise<import('../types/recommendation').PerformanceObservation | null> {
  const snap = await db.collection('performance_observations').doc(observationId).get();
  return snap.exists
    ? (snap.data() as import('../types/recommendation').PerformanceObservation)
    : null;
}

export async function listPerformanceObservationsForBusiness(
  businessId: string
): Promise<import('../types/recommendation').PerformanceObservation[]> {
  const snap = await db
    .collection('performance_observations')
    .where('businessId', '==', businessId)
    .get();
  return snap.docs.map(
    (doc) => doc.data() as import('../types/recommendation').PerformanceObservation
  );
}

export async function getPerformanceRecommendationDoc(
  businessId: string
): Promise<import('../types/recommendation').PerformanceRecommendationResult | null> {
  const snap = await db.collection('performance_recommendations').doc(businessId).get();
  return snap.exists
    ? (snap.data() as import('../types/recommendation').PerformanceRecommendationResult)
    : null;
}

export async function setPerformanceRecommendationDoc(
  recommendation: import('../types/recommendation').PerformanceRecommendationResult
): Promise<void> {
  await db
    .collection('performance_recommendations')
    .doc(recommendation.businessId)
    .set(recommendation, { merge: true });
}
