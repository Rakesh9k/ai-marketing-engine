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
  type DocumentData,
  serverTimestamp,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';

import { stripUndefined } from '@/lib/stripUndefined';
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

function getRawDocRef(
  collectionName: string,
  id: string
): DocumentReference<DocumentData> {
  return doc(getDb(), collectionName, id);
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
    const ref = getRawDocRef('users', userId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async delete(userId: string): Promise<void> {
    const ref = getRawDocRef('users', userId);
    await updateDoc(ref, { deletedAt: serverTimestamp() });
  },
};

export const businessService = {
  async get(businessId: string): Promise<Business | null> {
    const ref = getDocRef<Business>('businesses', businessId, businessConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async getByUserId(userId: string): Promise<Business[]> {
    try {
      const q = query(
        getCollectionRef<Business>('businesses', businessConverter),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((doc) => doc.data())
        .filter((business) => business.status !== 'archived');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isIndexError =
        errorMsg.includes('requires an index') ||
        (err as { code?: string })?.code === 'failed-precondition';
      if (isIndexError) {
        console.warn(
          'businessService.getByUserId: Composite index missing or building; falling back to unindexed query with client-side sort',
          err
        );
        const fallbackQ = query(
          getCollectionRef<Business>('businesses', businessConverter),
          where('userId', '==', userId)
        );
        const snap = await getDocs(fallbackQ);
        return snap.docs
          .map((doc) => doc.data())
          .filter((business) => business.status !== 'archived')
          .sort((a, b) => {
            const timeA =
              (a.createdAt as { toMillis?: () => number })?.toMillis?.() ??
              (a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0);
            const timeB =
              (b.createdAt as { toMillis?: () => number })?.toMillis?.() ??
              (b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0);
            return timeB - timeA;
          });
      }
      throw err;
    }
  },

  async create(business: Business): Promise<void> {
    const ref = getDocRef<Business>('businesses', business.businessId, businessConverter);
    await setDoc(ref, business);
  },

  async update(businessId: string, data: Partial<Business>): Promise<void> {
    const ref = getRawDocRef('businesses', businessId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async archive(businessId: string): Promise<void> {
    const ref = getRawDocRef('businesses', businessId);
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
    try {
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      ];
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      const q = query(getCollectionRef<Business>('businesses', businessConverter), ...constraints);
      const snap = await getDocs(q);
      return {
        businesses: snap.docs
          .map((doc) => doc.data())
          .filter((business) => business.status !== 'archived'),
        lastDoc: snap.docs[snap.docs.length - 1] || null,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isIndexError =
        errorMsg.includes('requires an index') ||
        (err as { code?: string })?.code === 'failed-precondition';
      if (isIndexError) {
        const snap = await getDocs(
          query(getCollectionRef<Business>('businesses', businessConverter), where('userId', '==', userId))
        );
        const filtered = snap.docs
          .map((doc) => doc.data())
          .filter((business) => business.status !== 'archived')
          .sort((a, b) => {
            const timeA =
              (a.createdAt as { toMillis?: () => number })?.toMillis?.() ??
              (a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0);
            const timeB =
              (b.createdAt as { toMillis?: () => number })?.toMillis?.() ??
              (b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0);
            return timeB - timeA;
          });
        return {
          businesses: filtered.slice(0, pageSize),
          lastDoc: snap.docs[snap.docs.length - 1] || null,
        };
      }
      throw err;
    }
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
      orderBy('sortOrder', 'asc'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => doc.data())
      .filter((product) => product.status !== 'archived');
  },

  async create(
    product: Omit<
      Product,
      'productId' | 'createdAt' | 'updatedAt' | 'tags' | 'variants' | 'attributes' | 'status'
    > &
      Partial<Pick<Product, 'productId' | 'tags' | 'variants' | 'attributes' | 'status'>>
  ): Promise<Product> {
    const { callFunction } = await import('@/services/api');
    const result = await callFunction<
      {
        businessId: string;
        name: string;
        description?: string;
        price: number;
        originalPrice?: number;
        currency?: 'INR';
        category?: string;
        tags?: string[];
        variants?: Product['variants'];
        images: Product['images'];
        attributes?: Product['attributes'];
        status?: 'active' | 'archived';
        sortOrder?: number;
      },
      { product: Product }
    >({
      functionName: 'createProduct',
      data: {
        businessId: product.businessId,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        currency: 'INR',
        category: product.category,
        tags: product.tags,
        variants: product.variants,
        images: product.images,
        attributes: product.attributes,
        status: product.status,
        sortOrder: product.sortOrder,
      },
    });
    return result.product;
  },

  async update(
    productId: string,
    data: Partial<Product> & { businessId?: string }
  ): Promise<Product> {
    const { callFunction } = await import('@/services/api');
    let businessId = data.businessId;
    if (!businessId) {
      const existing = await this.get(productId);
      if (!existing) {
        throw new Error(`Product not found: ${productId}`);
      }
      businessId = existing.businessId;
    }

    const result = await callFunction<
      {
        productId: string;
        businessId: string;
        name?: string;
        description?: string;
        price?: number;
        originalPrice?: number;
        currency?: 'INR';
        category?: string;
        tags?: string[];
        variants?: Product['variants'];
        images?: Product['images'];
        attributes?: Product['attributes'];
        status?: 'active' | 'archived';
        sortOrder?: number;
      },
      { product: Product }
    >({
      functionName: 'updateProduct',
      data: {
        productId,
        businessId,
        name: data.name,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        currency: 'INR',
        category: data.category,
        tags: data.tags,
        variants: data.variants,
        images: data.images,
        attributes: data.attributes,
        status: data.status,
        sortOrder: data.sortOrder,
      },
    });
    return result.product;
  },

  async archive(productId: string, businessId?: string): Promise<Product> {
    const { callFunction } = await import('@/services/api');
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const existing = await this.get(productId);
      if (!existing) {
        throw new Error(`Product not found: ${productId}`);
      }
      targetBusinessId = existing.businessId;
    }

    const result = await callFunction<
      { productId: string; businessId: string },
      { product: Product }
    >({
      functionName: 'archiveProduct',
      data: {
        productId,
        businessId: targetBusinessId,
      },
    });
    return result.product;
  },

  async listByBusinessPaginated(
    businessId: string,
    lastDoc?: DocumentSnapshot<Product>,
    pageSize = 20
  ): Promise<{ products: Product[]; lastDoc: DocumentSnapshot<Product> | null }> {
    const constraints: QueryConstraint[] = [
      where('businessId', '==', businessId),
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
      products: snap.docs
        .map((doc) => doc.data())
        .filter((product) => product.status !== 'archived'),
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

  // Used when a generateCampaignStrategy call itself times out client-side
  // (the Functions SDK default/configured timeout) while the server keeps
  // running and eventually finishes — the client never got a campaignId
  // back, so this recovers it from the idempotency key it already sent,
  // instead of treating a slow success as a failure and letting a retry
  // double-charge (see CampaignWizard.tsx's deadline-exceeded handling).
  //
  // Phase 15 Campaign Persistence audit: this previously queried by
  // `metadata.idempotencyKey` alone, with no `userId` filter. Firestore
  // evaluates security rules against a query's POTENTIAL result set, not
  // just what it actually returns — since campaigns/{id}'s read rule
  // requires `resource.data.userId == request.auth.uid`, and nothing in
  // the query constrained userId, Firestore could not prove every possible
  // match would satisfy the rule and denied the query outright
  // (confirmed against the real emulator: "Property userId is undefined on
  // object. for 'list'"). This meant the entire client-timeout recovery
  // path silently never worked — every call threw, was caught, and fell
  // through to the generic "still checking on it" message, never actually
  // resuming the user's in-progress campaign. Adding the userId clause
  // lets the rule engine verify it statically, exactly like every other
  // per-user query in this file already does.
  async getByIdempotencyKey(idempotencyKey: string, userId: string): Promise<Campaign | null> {
    const q = query(
      getCollectionRef<Campaign>('campaigns', campaignConverter),
      where('userId', '==', userId),
      where('metadata.idempotencyKey', '==', idempotencyKey),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.docs[0]?.data() || null;
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
    const ref = getRawDocRef('campaigns', campaignId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  async updateStatus(
    campaignId: string,
    status: Campaign['status'],
    additionalData?: Partial<Campaign>
  ): Promise<void> {
    const ref = getRawDocRef('campaigns', campaignId);
    await updateDoc(ref, { status, ...additionalData, updatedAt: serverTimestamp() });
  },

  async archive(campaignId: string): Promise<void> {
    const ref = getRawDocRef('campaigns', campaignId);
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

  // businessId is required, not optional: the campaign_assets Firestore
  // rule allows read only when resource.data.businessId is in the caller's
  // token.businessIds (or userId/agency match), and passing it here lets
  // callers fail fast with a clear denial instead of the whole query
  // rejecting with an opaque permission error.
  async listByCampaign(campaignId: string, businessId: string): Promise<CampaignAsset[]> {
    const q = query(
      getCollectionRef<CampaignAsset>('campaign_assets', campaignAssetConverter),
      where('campaignId', '==', campaignId),
      where('businessId', '==', businessId),
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

  /**
   * The user's current subscription. A paying user has several live docs (the Free one from
   * signup stays active), so an unordered limit(1) query could return Free for a paid
   * customer. Resolve via the users/{uid}.subscriptionId pointer the payment webhook keeps
   * current, else prefer a paid live subscription over Free.
   */
  async getByUserId(userId: string): Promise<Subscription | null> {
    const live = ['active', 'trialing', 'past_due'];

    const userSnap = await getDoc(doc(getDb(), 'users', userId));
    const pointer = userSnap.exists()
      ? (userSnap.data()['subscriptionId'] as string | undefined)
      : undefined;
    if (pointer) {
      const pointed = await subscriptionService.get(pointer);
      if (pointed && pointed.userId === userId && live.includes(pointed.status)) {
        return pointed;
      }
    }

    const q = query(
      getCollectionRef<Subscription>('subscriptions', subscriptionConverter),
      where('userId', '==', userId),
      where('status', 'in', live),
      limit(10)
    );
    const snap = await getDocs(q);
    const subs = snap.docs.map((d) => d.data());
    return subs.find((sub) => sub.planId !== 'free') ?? subs[0] ?? null;
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
    const ref = getRawDocRef('subscriptions', subscriptionId);
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
    // The usage document ID is built server-side from the UTC month start
    // (onUserCreated / the payment gateway webhook), so the client must derive the
    // same UTC date. Using local time here produced the previous day's date
    // for any timezone ahead of UTC (e.g. IST: 2026-08-31 instead of
    // 2026-09-01), which points at a document that does not exist — and the
    // usage read rule denies reads of missing documents, so every dashboard
    // load failed with "Missing or insufficient permissions".
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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

export const transactionService = {
  async listByUser(userId: string, limitCount = 20): Promise<Transaction[]> {
    const q = query(
      getCollectionRef<Transaction>('transactions', transactionConverter),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
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
