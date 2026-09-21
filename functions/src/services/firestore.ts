import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  User,
  Business,
  BrandKit,
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
} from '../types';

const db = admin.firestore();

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

export async function getSubscriptionByUser(userId: string): Promise<Subscription | null> {
  const snap = await db
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', 'in', ['active', 'trialing', 'past_due'])
    .limit(1)
    .get();
  return snap.docs[0]?.data() as Subscription | null;
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

export async function reserveCredits(
  userId: string,
  amount: number,
  idempotencyKey: string,
  campaignId?: string,
  businessId?: string
): Promise<void> {
  // Phase 15: previously keyed by getUsageDocId(userId, new Date()) — i.e.
  // TODAY's exact calendar date — while the auto-creation branch just
  // below writes to getUsageDocId(userId, periodStart) — the 1ST of the
  // month, the convention every other caller (usageControl.ts,
  // onUserCreated.ts, razorpayWebhook.ts) actually uses. Those two IDs
  // only coincide on the 1st of the month, so on every other day this
  // read the transaction below performs found nothing, however recently
  // the "ensure it exists" block had just created the (differently-keyed)
  // doc — reserveCredits threw "Usage document not found" on effectively
  // every real call. usageControl.ts's own equivalent (currentPeriodStart())
  // already gets this right; reserveCredits is brought in line with it.
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageRef = db.collection('usage').doc(getUsageDocId(userId, periodStart));

  // Ensure usage document exists (create if missing)
  const usageSnap = await usageRef.get();
  if (!usageSnap.exists) {
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const newUsage: Usage = {
      usageId: getUsageDocId(userId, periodStart),
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      planId: 'free',
      campaignsCreated: 0,
      creditsUsed: 0,
      imagesGenerated: 0,
      copyGenerations: 0,
      regenerations: 0,
      failedGenerations: 0,
      updatedAt: FieldValue.serverTimestamp().toString(),
    };
    await db.collection('usage').doc(getUsageDocId(userId, periodStart)).set(newUsage);
  }

  await db.runTransaction(async (tx) => {
    // Phase 15: this transaction previously wrote the idempotencyKey
    // transaction doc and incremented creditsUsed unconditionally, with no
    // check for whether this idempotencyKey had already been reserved —
    // unlike services/usageControl.ts's reserveCreditsForOperation (Phase
    // 10), which correctly no-ops on a repeat operationId. A retried or
    // double-submitted request with the same idempotencyKey (a genuine
    // duplicate-click, or a client retry after a dropped response) would
    // silently reserve credits a second time. This function is reachable
    // via the deployed `createCampaign` Cloud Function even though the
    // current frontend calls `generateCampaignStrategy` instead — any
    // caller invoking it directly still hits this path.
    const existingReservation = await tx.get(db.collection('transactions').doc(idempotencyKey));
    if (existingReservation.exists) {
      return;
    }

    const usageSnap = await tx.get(usageRef);
    if (!usageSnap.exists) {
      throw new Error('Usage document not found');
    }
    const usageData = usageSnap.data()!;
    const creditsRemaining = usageData['creditsIncluded'] - usageData['creditsUsed'];
    if (creditsRemaining < amount) {
      throw new Error('Insufficient credits');
    }

    tx.set(db.collection('transactions').doc(idempotencyKey), {
      transactionId: idempotencyKey,
      userId,
      businessId,
      campaignId,
      type: 'reservation',
      amount: -amount,
      currency: 'INR',
      balanceAfter: creditsRemaining - amount,
      description: 'Credit reservation for campaign generation',
      status: 'pending',
      metadata: { idempotencyKey },
      createdAt: serverTimestamp(),
    });

    tx.update(usageRef, {
      creditsUsed: FieldValue.increment(amount),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function confirmCredits(transactionId: string): Promise<void> {
  await db.collection('transactions').doc(transactionId).update({
    type: 'deduction',
    status: 'completed',
  });
}

export async function refundCredits(
  userId: string,
  amount: number,
  originalTransactionId: string,
  campaignId?: string
): Promise<void> {
  const usageRef = db.collection('usage').doc(getUsageDocId(userId, new Date()));
  const refundRef = db.collection('transactions').doc(`refund_${originalTransactionId}`);
  const originalRef = db.collection('transactions').doc(originalTransactionId);

  await db.runTransaction(async (tx) => {
    // Decrement creditsUsed
    tx.update(usageRef, {
      creditsUsed: FieldValue.increment(-amount),
      updatedAt: serverTimestamp(),
    });

    // Create refund transaction record
    tx.set(refundRef, {
      transactionId: `refund_${originalTransactionId}`,
      userId,
      campaignId,
      type: 'refund',
      amount: +amount,
      currency: 'INR',
      balanceAfter: 0,
      description: 'Refund for failed campaign generation',
      status: 'completed',
      metadata: { originalKey: originalTransactionId },
      createdAt: serverTimestamp(),
    });

    // Mark original reservation as refunded
    tx.update(originalRef, {
      status: 'refunded' as const,
      updatedAt: serverTimestamp(),
    });
  });
}

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
