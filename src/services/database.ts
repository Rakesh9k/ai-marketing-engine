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
};

// Phase 10: this file previously also exported `transactionService` (get,
// list, create, createReservation, confirmReservation, refundReservation)
// and six `usageService.increment*` methods that mutated `usage.creditsUsed`
// directly from the browser via the client Firestore SDK — a complete,
// parallel, client-side reimplementation of the server-authoritative credit
// reservation/finalization/refund state machine that already exists in
// functions/src/services/usageControl.ts. firestore.rules already denies
// all client writes to `usage`/`transactions` ("Cloud Functions only"), so
// these were dead code — confirmed unused anywhere in src/ — that could
// only ever fail with permission-denied if invoked. They were removed
// rather than fixed: per the explicit "the client must NOT grant itself
// credits" rule, no client-writable path to financial state should exist
// at all, even an inert one that a future change to firestore.rules could
// accidentally reactivate as a real credit-manipulation vector. Read access
// to usage/transactions documents (`usageService.get`/`getCurrentPeriod`/
// `listByUser` above) is retained — it's informational display only, not a
// mutation path, and is genuinely used by the dashboard/usage pages.

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
