import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
  runTransaction,
  increment,
  serverTimestamp,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
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
} from '@/types';
import {
  userConverter,
  businessConverter,
  brandKitConverter,
  productConverter,
  campaignConverter,
  campaignAssetConverter,
  subscriptionConverter,
  usageConverter,
  transactionConverter,
  analyticsEventConverter,
  generationLogConverter,
} from '@/lib/firebase/converters';

function getDb(): Firestore {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return db;
}

function getCollectionRef<T>(
  collectionName: string,
  converter: FirestoreDataConverter<T>
): CollectionReference<T> {
  return collection(getDb(), collectionName).withConverter(converter);
}

function getDocRef<T>(
  collectionName: string,
  id: string,
  converter: FirestoreDataConverter<T>
): DocumentReference<T> {
  return doc(getDb(), collectionName, id).withConverter(converter);
}

export const userService = {
  async get(userId: string): Promise<User | null> {
    const ref = getDocRef<User>('users', userId, userConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async create(user: User): Promise<void> {
    const ref = getDocRef<User>('users', user.userId, userConverter);
    await setDoc(ref, user);
  },

  async update(userId: string, data: Partial<User>): Promise<void> {
    const ref = getDocRef<User>('users', userId, userConverter);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async delete(userId: string): Promise<void> {
    const ref = getDocRef<User>('users', userId, userConverter);
    await updateDoc(ref, { deletedAt: serverTimestamp(), status: 'archived' });
  },
};

export const businessService = {
  async get(businessId: string): Promise<Business | null> {
    const ref = getDocRef<Business>('businesses', businessId, businessConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async getByUserId(userId: string): Promise<Business[]> {
    const q = query(
      getCollectionRef<Business>('businesses', businessConverter),
      where('userId', '==', userId),
      where('status', '!=', 'archived'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },

  async create(business: Business): Promise<void> {
    const ref = getDocRef<Business>('businesses', business.businessId, businessConverter);
    await setDoc(ref, business);
  },

  async update(businessId: string, data: Partial<Business>): Promise<void> {
    const ref = getDocRef<Business>('businesses', businessId, businessConverter);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async archive(businessId: string): Promise<void> {
    const ref = getDocRef<Business>('businesses', businessId, businessConverter);
    await updateDoc(ref, {
      status: 'archived',
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async listByUser(
    userId: string,
    lastDoc?: DocumentSnapshot<Business>,
    pageSize = 20
  ): Promise<{ businesses: Business[]; lastDoc: DocumentSnapshot<Business> | null }> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      where('status', '!=', 'archived'),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    const q = query(getCollectionRef<Business>('businesses', businessConverter), ...constraints);
    const snap = await getDocs(q);
    return {
      businesses: snap.docs.map((doc) => doc.data()),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  },
};

export const brandKitService = {
  async get(businessId: string): Promise<BrandKit | null> {
    const ref = getDocRef<BrandKit>('brand_kits', businessId, brandKitConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async upsert(brandKit: BrandKit): Promise<void> {
    const ref = getDocRef<BrandKit>('brand_kits', brandKit.businessId, brandKitConverter);
    await setDoc(ref, brandKit, { merge: true });
  },

  async update(businessId: string, data: Partial<BrandKit>): Promise<void> {
    const ref = getDocRef<BrandKit>('brand_kits', businessId, brandKitConverter);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },
};

export const productService = {
  async get(productId: string): Promise<Product | null> {
    const ref = getDocRef<Product>('products', productId, productConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async listByBusiness(businessId: string): Promise<Product[]> {
    const q = query(
      getCollectionRef<Product>('products', productConverter),
      where('businessId', '==', businessId),
      where('status', '!=', 'archived'),
      orderBy('sortOrder', 'asc'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },

  async create(product: Product): Promise<void> {
    const ref = getDocRef<Product>('products', product.productId, productConverter);
    await setDoc(ref, product);
  },

  async update(productId: string, data: Partial<Product>): Promise<void> {
    const ref = getDocRef<Product>('products', productId, productConverter);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async archive(productId: string): Promise<void> {
    const ref = getDocRef<Product>('products', productId, productConverter);
    await updateDoc(ref, { status: 'archived', updatedAt: serverTimestamp() });
  },

  async listByBusinessPaginated(
    businessId: string,
    lastDoc?: DocumentSnapshot<Product>,
    pageSize = 20
  ): Promise<{ products: Product[]; lastDoc: DocumentSnapshot<Product> | null }> {
    const constraints: QueryConstraint[] = [
      where('businessId', '==', businessId),
      where('status', '!=', 'archived'),
      orderBy('sortOrder', 'asc'),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    const q = query(getCollectionRef<Product>('products', productConverter), ...constraints);
    const snap = await getDocs(q);
    return {
      products: snap.docs.map((doc) => doc.data()),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  },
};

export const campaignService = {
  async get(campaignId: string): Promise<Campaign | null> {
    const ref = getDocRef<Campaign>('campaigns', campaignId, campaignConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async listByBusiness(
    businessId: string,
    status?: Campaign['status'],
    lastDoc?: DocumentSnapshot<Campaign>,
    pageSize = 20
  ): Promise<{ campaigns: Campaign[]; lastDoc: DocumentSnapshot<Campaign> | null }> {
    const constraints: QueryConstraint[] = [
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];
    if (status) {
      constraints.splice(1, 0, where('status', '==', status));
    }
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    const q = query(getCollectionRef<Campaign>('campaigns', campaignConverter), ...constraints);
    const snap = await getDocs(q);
    return {
      campaigns: snap.docs.map((doc) => doc.data()),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  },

  async listByUser(
    userId: string,
    lastDoc?: DocumentSnapshot<Campaign>,
    pageSize = 20
  ): Promise<{ campaigns: Campaign[]; lastDoc: DocumentSnapshot<Campaign> | null }> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    const q = query(getCollectionRef<Campaign>('campaigns', campaignConverter), ...constraints);
    const snap = await getDocs(q);
    return {
      campaigns: snap.docs.map((doc) => doc.data()),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  },

  async create(campaign: Campaign): Promise<void> {
    const ref = getDocRef<Campaign>('campaigns', campaign.campaignId, campaignConverter);
    await setDoc(ref, campaign);
  },

  async update(campaignId: string, data: Partial<Campaign>): Promise<void> {
    const ref = getDocRef<Campaign>('campaigns', campaignId, campaignConverter);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async updateStatus(
    campaignId: string,
    status: Campaign['status'],
    additionalData?: Partial<Campaign>
  ): Promise<void> {
    const ref = getDocRef<Campaign>('campaigns', campaignId, campaignConverter);
    await updateDoc(ref, { status, ...additionalData, updatedAt: serverTimestamp() });
  },

  async archive(campaignId: string): Promise<void> {
    const ref = getDocRef<Campaign>('campaigns', campaignId, campaignConverter);
    await updateDoc(ref, {
      status: 'archived',
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};

export const campaignAssetService = {
  async get(assetId: string): Promise<CampaignAsset | null> {
    const ref = getDocRef<CampaignAsset>('campaign_assets', assetId, campaignAssetConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async listByCampaign(campaignId: string): Promise<CampaignAsset[]> {
    const q = query(
      getCollectionRef<CampaignAsset>('campaign_assets', campaignAssetConverter),
      where('campaignId', '==', campaignId),
      orderBy('type', 'asc'),
      orderBy('index', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },

  async listByBusiness(businessId: string, type?: CampaignAsset['type']): Promise<CampaignAsset[]> {
    const constraints: QueryConstraint[] = [
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc'),
    ];
    if (type) {
      constraints.splice(1, 0, where('type', '==', type));
    }
    const q = query(
      getCollectionRef<CampaignAsset>('campaign_assets', campaignAssetConverter),
      ...constraints
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },
};

export const subscriptionService = {
  async get(subscriptionId: string): Promise<Subscription | null> {
    const ref = getDocRef<Subscription>('subscriptions', subscriptionId, subscriptionConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async getByUserId(userId: string): Promise<Subscription | null> {
    const q = query(
      getCollectionRef<Subscription>('subscriptions', subscriptionConverter),
      where('userId', '==', userId),
      where('status', 'in', ['active', 'trialing', 'past_due']),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.docs[0]?.data() || null;
  },

  async create(subscription: Subscription): Promise<void> {
    const ref = getDocRef<Subscription>(
      'subscriptions',
      subscription.subscriptionId,
      subscriptionConverter
    );
    await setDoc(ref, subscription);
  },

  async update(subscriptionId: string, data: Partial<Subscription>): Promise<void> {
    const ref = getDocRef<Subscription>('subscriptions', subscriptionId, subscriptionConverter);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },
};

export const usageService = {
  getUsageDocId(userId: string, periodStart: Date): string {
    const dateStr = periodStart.toISOString().split('T')[0];
    return `${userId}_${dateStr}`;
  },

  async get(usageId: string): Promise<Usage | null> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async getCurrentPeriod(userId: string): Promise<Usage | null> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = this.getUsageDocId(userId, periodStart);
    return this.get(usageId);
  },

  async listByUser(userId: string, limitCount = 12): Promise<Usage[]> {
    const q = query(
      getCollectionRef<Usage>('usage', usageConverter),
      where('userId', '==', userId),
      orderBy('periodStart', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },

  async create(usage: Usage): Promise<void> {
    const ref = getDocRef<Usage>('usage', usage.usageId, usageConverter);
    await setDoc(ref, usage);
  },

  async incrementCreditsUsed(usageId: string, amount: number): Promise<void> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    await updateDoc(ref, { creditsUsed: increment(amount), updatedAt: serverTimestamp() });
  },

  async incrementCampaignsCreated(usageId: string): Promise<void> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    await updateDoc(ref, { campaignsCreated: increment(1), updatedAt: serverTimestamp() });
  },

  async incrementImagesGenerated(usageId: string, count: number): Promise<void> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    await updateDoc(ref, {
      imagesGenerated: increment(count),
      updatedAt: serverTimestamp(),
    });
  },

  async incrementCopyGenerations(usageId: string): Promise<void> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    await updateDoc(ref, { copyGenerations: increment(1), updatedAt: serverTimestamp() });
  },

  async incrementRegenerations(usageId: string): Promise<void> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    await updateDoc(ref, { regenerations: increment(1), updatedAt: serverTimestamp() });
  },

  async incrementFailedGenerations(usageId: string): Promise<void> {
    const ref = getDocRef<Usage>('usage', usageId, usageConverter);
    await updateDoc(ref, { failedGenerations: increment(1), updatedAt: serverTimestamp() });
  },
};

export const transactionService = {
  async get(transactionId: string): Promise<Transaction | null> {
    const ref = getDocRef<Transaction>('transactions', transactionId, transactionConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async listByUser(userId: string, limitCount = 50): Promise<Transaction[]> {
    const q = query(
      getCollectionRef<Transaction>('transactions', transactionConverter),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },

  async listByCampaign(campaignId: string): Promise<Transaction[]> {
    const q = query(
      getCollectionRef<Transaction>('transactions', transactionConverter),
      where('campaignId', '==', campaignId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },

  async create(transaction: Transaction): Promise<void> {
    const ref = getDocRef<Transaction>(
      'transactions',
      transaction.transactionId,
      transactionConverter
    );
    await setDoc(ref, transaction);
  },

  async createReservation(
    userId: string,
    amount: number,
    idempotencyKey: string,
    campaignId?: string,
    businessId?: string
  ): Promise<void> {
    const usageRef = getDocRef<Usage>(
      'usage',
      usageService.getUsageDocId(userId, new Date()),
      usageConverter
    );
    const transactionRef = getDocRef<Transaction>(
      'transactions',
      idempotencyKey,
      transactionConverter
    );

    // eslint-disable-next-line @typescript-eslint/require-await
    await runTransaction(getDb(), async (tx) => {
      const usageSnap = await tx.get(usageRef);
      if (!usageSnap.exists()) {
        throw new Error('Usage document not found');
      }
      const usageData = usageSnap.data();
      const creditsRemaining = usageData.creditsIncluded - usageData.creditsUsed;
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
        description: `Credit reservation for campaign generation`,
        status: 'pending',
        metadata: { idempotencyKey },
        createdAt: serverTimestamp(),
      });

      tx.update(usageRef, { creditsUsed: increment(amount), updatedAt: serverTimestamp() });
    });
  },

  async confirmReservation(transactionId: string): Promise<void> {
    const ref = getDocRef<Transaction>('transactions', transactionId, transactionConverter);
    await updateDoc(ref, { type: 'deduction', status: 'completed', updatedAt: serverTimestamp() });
  },

  async refundReservation(
    userId: string,
    amount: number,
    originalTransactionId: string,
    campaignId?: string
  ): Promise<void> {
    const usageRef = getDocRef<Usage>(
      'usage',
      usageService.getUsageDocId(userId, new Date()),
      usageConverter
    );
    const refundRef = getDocRef<Transaction>(
      'transactions',
      `refund_${originalTransactionId}`,
      transactionConverter
    );

    // eslint-disable-next-line @typescript-eslint/require-await
    await runTransaction(getDb(), async (tx) => {
      tx.update(usageRef, { creditsUsed: increment(-amount), updatedAt: serverTimestamp() });
      tx.set(refundRef, {
        transactionId: `refund_${originalTransactionId}`,
        userId,
        campaignId,
        type: 'refund',
        amount: +amount,
        currency: 'INR',
        balanceAfter: 0,
        description: `Refund for failed campaign generation`,
        status: 'completed',
        metadata: { originalKey: originalTransactionId },
        createdAt: serverTimestamp(),
      });
    });
  },
};

export const analyticsService = {
  async log(event: AnalyticsEvent): Promise<void> {
    const ref = getDocRef<AnalyticsEvent>(
      'analytics_events',
      event.eventId,
      analyticsEventConverter
    );
    await setDoc(ref, event);
  },

  async listByBusiness(
    businessId: string,
    eventType?: string,
    limitCount = 100
  ): Promise<AnalyticsEvent[]> {
    const constraints: QueryConstraint[] = [
      where('businessId', '==', businessId),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    ];
    if (eventType) {
      constraints.splice(1, 0, where('eventType', '==', eventType));
    }
    const q = query(
      getCollectionRef<AnalyticsEvent>('analytics_events', analyticsEventConverter),
      ...constraints
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },
};

export const generationLogService = {
  async create(log: GenerationLog): Promise<void> {
    const ref = getDocRef<GenerationLog>('generation_logs', log.logId, generationLogConverter);
    await setDoc(ref, log);
  },

  async listByCampaign(campaignId: string): Promise<GenerationLog[]> {
    const q = query(
      getCollectionRef<GenerationLog>('generation_logs', generationLogConverter),
      where('campaignId', '==', campaignId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  },
};

export type {
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
} from '@/types';
