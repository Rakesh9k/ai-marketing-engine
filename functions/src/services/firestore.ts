import * as admin from 'firebase-admin';
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
} from '../types';

const db = admin.firestore();

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
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
      businessIds: admin.firestore.FieldValue.arrayUnion(businessId),
      updatedAt: serverTimestamp(),
    });
}

export async function removeBusinessIdFromUser(userId: string, businessId: string): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .update({
      businessIds: admin.firestore.FieldValue.arrayRemove(businessId),
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
      [field]: admin.firestore.FieldValue.increment(amount),
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
  const usageRef = db.collection('usage').doc(getUsageDocId(userId, new Date()));
  const transactionRef = db.collection('transactions').doc(idempotencyKey);

  await db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    if (!usageSnap.exists) {
      throw new Error('Usage document not found');
    }
    const usageData = usageSnap.data()!;
    const creditsRemaining = usageData['creditsIncluded'] - usageData['creditsUsed'];
    if (creditsRemaining < amount) {
      throw new Error('Insufficient credits');
    }

    tx.set(transactionRef, {
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
      creditsUsed: admin.firestore.FieldValue.increment(amount),
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

  await db.runTransaction(async (tx) => {
    tx.update(usageRef, {
      creditsUsed: admin.firestore.FieldValue.increment(-amount),
      updatedAt: serverTimestamp(),
    });
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
