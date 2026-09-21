import {
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
} from 'firebase/firestore';
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
  ReelProject,
} from '@/types';

function serverTimestampToISO(timestamp: Timestamp | string | undefined): string | undefined {
  if (!timestamp) return undefined;
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
}

function isoToTimestamp(isoString: string | undefined): Timestamp | undefined {
  if (!isoString) return undefined;
  return Timestamp.fromDate(new Date(isoString));
}

function getData<T>(snapshot: QueryDocumentSnapshot): T {
  return snapshot.data() as T;
}

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: User): DocumentData {
    return {
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      businessIds: user.businessIds || [],
      agencyId: user.agencyId,
      subscriptionId: user.subscriptionId,
      settings: {
        notifications: user.settings?.notifications ?? true,
        language: user.settings?.language || 'en',
        timezone: user.settings?.timezone || 'Asia/Kolkata',
      },
      createdAt: user.createdAt ? isoToTimestamp(user.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: user.lastLoginAt ? isoToTimestamp(user.lastLoginAt) : undefined,
      deletedAt: user.deletedAt ? isoToTimestamp(user.deletedAt) : undefined,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): User {
    const data = getData<any>(snapshot);
    return {
      userId: data.userId,
      email: data.email,
      phone: data.phone,
      displayName: data.displayName,
      photoURL: data.photoURL,
      role: data.role,
      businessIds: data.businessIds || [],
      agencyId: data.agencyId,
      subscriptionId: data.subscriptionId,
      settings: {
        notifications: data.settings?.notifications ?? true,
        language: data.settings?.language || 'en',
        timezone: data.settings?.timezone || 'Asia/Kolkata',
      },
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
      lastLoginAt: serverTimestampToISO(data.lastLoginAt),
      deletedAt: serverTimestampToISO(data.deletedAt),
    };
  },
};

export const businessConverter: FirestoreDataConverter<Business> = {
  toFirestore(business: Business): DocumentData {
    return {
      businessId: business.businessId,
      userId: business.userId,
      agencyId: business.agencyId,
      name: business.name,
      category: business.category,
      description: business.description,
      location: business.location,
      contact: business.contact,
      businessBrain: business.businessBrain,
      settings: business.settings,
      status: business.status || 'active',
      createdAt: business.createdAt ? isoToTimestamp(business.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      deletedAt: business.deletedAt ? isoToTimestamp(business.deletedAt) : undefined,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Business {
    const data = getData<any>(snapshot);
    return {
      businessId: data.businessId,
      userId: data.userId,
      agencyId: data.agencyId,
      name: data.name,
      category: data.category,
      description: data.description,
      location: data.location,
      contact: data.contact,
      businessBrain: data.businessBrain,
      settings: data.settings,
      status: data.status || 'active',
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
      deletedAt: serverTimestampToISO(data.deletedAt),
    };
  },
};

export const brandKitConverter: FirestoreDataConverter<BrandKit> = {
  toFirestore(brandKit: BrandKit): DocumentData {
    return {
      businessId: brandKit.businessId,
      logo: brandKit.logo,
      colors: {
        primary: brandKit.colors.primary,
        secondary: brandKit.colors.secondary,
        accent: brandKit.colors.accent,
        background: brandKit.colors.background || '#FFFFFF',
        text: brandKit.colors.text || '#1A1A1A',
      },
      fonts: {
        heading: brandKit.fonts.heading,
        body: brandKit.fonts.body,
      },
      tone: brandKit.tone,
      personality: brandKit.personality,
      visualPreferences: brandKit.visualPreferences,
      targetAudience: brandKit.targetAudience,
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): BrandKit {
    const data = getData<any>(snapshot);
    return {
      businessId: data.businessId,
      logo: data.logo,
      colors: {
        primary: data.colors.primary,
        secondary: data.colors.secondary,
        accent: data.colors.accent,
        background: data.colors.background || '#FFFFFF',
        text: data.colors.text || '#1A1A1A',
      },
      fonts: {
        heading: data.fonts.heading,
        body: data.fonts.body,
      },
      tone: data.tone,
      personality: data.personality,
      visualPreferences: data.visualPreferences,
      targetAudience: data.targetAudience,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
    };
  },
};

export const productConverter: FirestoreDataConverter<Product> = {
  toFirestore(product: Product): DocumentData {
    return {
      productId: product.productId,
      businessId: product.businessId,
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      currency: product.currency || 'INR',
      category: product.category,
      tags: product.tags || [],
      variants: product.variants || [],
      images: product.images || [],
      attributes: product.attributes || {},
      status: product.status || 'active',
      sortOrder: product.sortOrder,
      createdAt: product.createdAt ? isoToTimestamp(product.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Product {
    const data = getData<any>(snapshot);
    return {
      productId: data.productId,
      businessId: data.businessId,
      name: data.name,
      description: data.description,
      price: data.price,
      originalPrice: data.originalPrice,
      currency: data.currency || 'INR',
      category: data.category,
      tags: data.tags || [],
      variants: data.variants || [],
      images: data.images || [],
      attributes: data.attributes || {},
      status: data.status || 'active',
      sortOrder: data.sortOrder,
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
    };
  },
};

export const campaignConverter: FirestoreDataConverter<Campaign> = {
  toFirestore(campaign: Campaign): DocumentData {
    return {
      campaignId: campaign.campaignId,
      businessId: campaign.businessId,
      userId: campaign.userId,
      objective: campaign.objective,
      productId: campaign.productId,
      newProduct: campaign.newProduct,
      offer: {
        headline: campaign.offer.headline,
        description: campaign.offer.description,
        price: campaign.offer.price,
        originalPrice: campaign.offer.originalPrice,
        type: campaign.offer.type,
        validityStart: isoToTimestamp(campaign.offer.validityStart),
        validityEnd: isoToTimestamp(campaign.offer.validityEnd),
        terms: campaign.offer.terms,
      },
      duration: {
        start: isoToTimestamp(campaign.duration.start),
        end: isoToTimestamp(campaign.duration.end),
      },
      audience: campaign.audience,
      cta: campaign.cta,
      localization: campaign.localization,
      status: campaign.status,
      creditsReserved: campaign.creditsReserved,
      creditsUsed: campaign.creditsUsed,
      error: campaign.error,
      metadata: campaign.metadata,
      createdAt: campaign.createdAt ? isoToTimestamp(campaign.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      completedAt: campaign.completedAt ? isoToTimestamp(campaign.completedAt) : undefined,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Campaign {
    const data = getData<any>(snapshot);
    return {
      campaignId: data.campaignId,
      businessId: data.businessId,
      userId: data.userId,
      objective: data.objective,
      productId: data.productId,
      newProduct: data.newProduct,
      offer: {
        headline: data.offer.headline,
        description: data.offer.description,
        price: data.offer.price,
        originalPrice: data.offer.originalPrice,
        type: data.offer.type,
        validityStart: serverTimestampToISO(data.offer.validityStart)!,
        validityEnd: serverTimestampToISO(data.offer.validityEnd)!,
        terms: data.offer.terms,
      },
      duration: {
        start: serverTimestampToISO(data.duration.start)!,
        end: serverTimestampToISO(data.duration.end)!,
      },
      audience: data.audience,
      cta: data.cta,
      localization: data.localization,
      status: data.status,
      creditsReserved: data.creditsReserved,
      creditsUsed: data.creditsUsed,
      error: data.error,
      metadata: data.metadata,
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
      completedAt: serverTimestampToISO(data.completedAt),
    };
  },
};

export const campaignAssetConverter: FirestoreDataConverter<CampaignAsset> = {
  toFirestore(asset: CampaignAsset): DocumentData {
    return {
      assetId: asset.assetId,
      campaignId: asset.campaignId,
      businessId: asset.businessId,
      type: asset.type,
      index: asset.index,
      content: asset.content,
      imageUrl: asset.imageUrl,
      storagePath: asset.storagePath,
      thumbnailUrl: asset.thumbnailUrl,
      status: asset.status,
      promptUsed: asset.promptUsed,
      modelUsed: asset.modelUsed,
      generationLatencyMs: asset.generationLatencyMs,
      validationResult: asset.validationResult,
      createdAt: asset.createdAt ? isoToTimestamp(asset.createdAt) : Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): CampaignAsset {
    const data = getData<any>(snapshot);
    return {
      assetId: data.assetId,
      campaignId: data.campaignId,
      businessId: data.businessId,
      type: data.type,
      index: data.index,
      content: data.content,
      imageUrl: data.imageUrl,
      storagePath: data.storagePath,
      thumbnailUrl: data.thumbnailUrl,
      status: data.status,
      promptUsed: data.promptUsed,
      modelUsed: data.modelUsed,
      generationLatencyMs: data.generationLatencyMs,
      validationResult: data.validationResult,
      createdAt: serverTimestampToISO(data.createdAt)!,
    };
  },
};

export const subscriptionConverter: FirestoreDataConverter<Subscription> = {
  toFirestore(subscription: Subscription): DocumentData {
    return {
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      razorpayCustomerId: subscription.razorpayCustomerId,
      currentPeriodStart: isoToTimestamp(subscription.currentPeriodStart),
      currentPeriodEnd: isoToTimestamp(subscription.currentPeriodEnd),
      creditsIncluded: subscription.creditsIncluded,
      creditsUsed: subscription.creditsUsed,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt ? isoToTimestamp(subscription.canceledAt) : undefined,
      trialEnd: subscription.trialEnd ? isoToTimestamp(subscription.trialEnd) : undefined,
      metadata: subscription.metadata,
      createdAt: subscription.createdAt ? isoToTimestamp(subscription.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Subscription {
    const data = getData<any>(snapshot);
    return {
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      planId: data.planId,
      status: data.status,
      razorpaySubscriptionId: data.razorpaySubscriptionId,
      razorpayCustomerId: data.razorpayCustomerId,
      currentPeriodStart: serverTimestampToISO(data.currentPeriodStart)!,
      currentPeriodEnd: serverTimestampToISO(data.currentPeriodEnd)!,
      creditsIncluded: data.creditsIncluded,
      creditsUsed: data.creditsUsed,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      canceledAt: serverTimestampToISO(data.canceledAt),
      trialEnd: serverTimestampToISO(data.trialEnd),
      metadata: data.metadata,
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
    };
  },
};

export const usageConverter: FirestoreDataConverter<Usage> = {
  toFirestore(usage: Usage): DocumentData {
    return {
      usageId: usage.usageId,
      userId: usage.userId,
      periodStart: isoToTimestamp(usage.periodStart),
      periodEnd: isoToTimestamp(usage.periodEnd),
      planId: usage.planId,
      creditsIncluded: usage.creditsIncluded,
      campaignsCreated: usage.campaignsCreated,
      creditsUsed: usage.creditsUsed,
      imagesGenerated: usage.imagesGenerated,
      copyGenerations: usage.copyGenerations,
      regenerations: usage.regenerations,
      failedGenerations: usage.failedGenerations,
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Usage {
    const data = getData<any>(snapshot);
    return {
      usageId: data.usageId,
      userId: data.userId,
      periodStart: serverTimestampToISO(data.periodStart)!,
      periodEnd: serverTimestampToISO(data.periodEnd)!,
      planId: data.planId,
      creditsIncluded: data.creditsIncluded,
      campaignsCreated: data.campaignsCreated,
      creditsUsed: data.creditsUsed,
      imagesGenerated: data.imagesGenerated,
      copyGenerations: data.copyGenerations,
      regenerations: data.regenerations,
      failedGenerations: data.failedGenerations,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
    };
  },
};

export const transactionConverter: FirestoreDataConverter<Transaction> = {
  toFirestore(transaction: Transaction): DocumentData {
    return {
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      businessId: transaction.businessId,
      campaignId: transaction.campaignId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency || 'INR',
      balanceAfter: transaction.balanceAfter,
      description: transaction.description,
      razorpayPaymentId: transaction.razorpayPaymentId,
      razorpayOrderId: transaction.razorpayOrderId,
      razorpaySubscriptionId: transaction.razorpaySubscriptionId,
      status: transaction.status,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt ? isoToTimestamp(transaction.createdAt) : Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Transaction {
    const data = getData<any>(snapshot);
    return {
      transactionId: data.transactionId,
      userId: data.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
      type: data.type,
      amount: data.amount,
      currency: data.currency || 'INR',
      balanceAfter: data.balanceAfter,
      description: data.description,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId,
      razorpaySubscriptionId: data.razorpaySubscriptionId,
      status: data.status,
      metadata: data.metadata,
      createdAt: serverTimestampToISO(data.createdAt)!,
    };
  },
};

export const analyticsEventConverter: FirestoreDataConverter<AnalyticsEvent> = {
  toFirestore(event: AnalyticsEvent): DocumentData {
    return {
      eventId: event.eventId,
      userId: event.userId,
      businessId: event.businessId,
      campaignId: event.campaignId,
      creativeId: event.creativeId,
      eventType: event.eventType,
      timestamp: isoToTimestamp(event.timestamp) || Timestamp.now(),
      metadata: event.metadata,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): AnalyticsEvent {
    const data = getData<any>(snapshot);
    return {
      eventId: data.eventId,
      userId: data.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
      creativeId: data.creativeId,
      eventType: data.eventType,
      timestamp: serverTimestampToISO(data.timestamp)!,
      metadata: data.metadata,
    };
  },
};

export const generationLogConverter: FirestoreDataConverter<GenerationLog> = {
  toFirestore(log: GenerationLog): DocumentData {
    return {
      logId: log.logId,
      campaignId: log.campaignId,
      stage: log.stage,
      provider: log.provider,
      model: log.model,
      inputHash: log.inputHash,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      latencyMs: log.latencyMs,
      costEstimateUSD: log.costEstimateUSD,
      costEstimateINR: log.costEstimateINR,
      status: log.status,
      error: log.error,
      retryCount: log.retryCount,
      createdAt: log.createdAt ? isoToTimestamp(log.createdAt) : Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): GenerationLog {
    const data = getData<any>(snapshot);
    return {
      logId: data.logId,
      campaignId: data.campaignId,
      stage: data.stage,
      provider: data.provider,
      model: data.model,
      inputHash: data.inputHash,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      latencyMs: data.latencyMs,
      costEstimateUSD: data.costEstimateUSD,
      costEstimateINR: data.costEstimateINR,
      status: data.status,
      error: data.error,
      retryCount: data.retryCount,
      createdAt: serverTimestampToISO(data.createdAt)!,
    };
  },
};

export const assetConverter: FirestoreDataConverter<Asset> = {
  toFirestore(asset: Asset): DocumentData {
    return {
      assetId: asset.assetId,
      userId: asset.userId,
      businessId: asset.businessId,
      name: asset.name,
      description: asset.description,
      storagePath: asset.storagePath,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      assetType: asset.assetType,
      status: asset.status,
      previewUrl: asset.previewUrl,
      createdAt: asset.createdAt ? isoToTimestamp(asset.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): Asset {
    const data = getData<any>(snapshot);
    return {
      assetId: data.assetId,
      userId: data.userId,
      businessId: data.businessId,
      name: data.name,
      description: data.description,
      storagePath: data.storagePath,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      width: data.width,
      height: data.height,
      assetType: data.assetType,
      status: data.status,
      previewUrl: data.previewUrl,
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
    };
  },
};

export const reelConverter: FirestoreDataConverter<ReelProject> = {
  toFirestore(reel: ReelProject): DocumentData {
    return {
      reelId: reel.reelId,
      businessId: reel.businessId,
      userId: reel.userId,
      status: reel.status,
      goal: reel.goal,
      style: reel.style,
      durationSeconds: reel.durationSeconds,
      inputClipIds: reel.inputClipIds || [],
      offer: reel.offer,
      cta: reel.cta,
      additionalMessage: reel.additionalMessage,
      outputUrl: reel.outputUrl,
      thumbnailUrl: reel.thumbnailUrl,
      creditsReserved: reel.creditsReserved,
      creditsUsed: reel.creditsUsed,
      error: reel.error,
      createdAt: reel.createdAt ? isoToTimestamp(reel.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      completedAt: reel.completedAt ? isoToTimestamp(reel.completedAt) : undefined,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _options?: SnapshotOptions): ReelProject {
    const data = getData<any>(snapshot);
    return {
      reelId: data.reelId,
      businessId: data.businessId,
      userId: data.userId,
      status: data.status,
      goal: data.goal,
      style: data.style,
      durationSeconds: data.durationSeconds,
      inputClipIds: data.inputClipIds || [],
      offer: data.offer,
      cta: data.cta,
      additionalMessage: data.additionalMessage,
      outputUrl: data.outputUrl,
      thumbnailUrl: data.thumbnailUrl,
      creditsReserved: data.creditsReserved,
      creditsUsed: data.creditsUsed,
      error: data.error,
      createdAt: serverTimestampToISO(data.createdAt)!,
      updatedAt: serverTimestampToISO(data.updatedAt)!,
      completedAt: serverTimestampToISO(data.completedAt),
    };
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
  Asset,
  ReelProject,
  BusinessBrain,
  BusinessLocation,
  BusinessContact,
  BusinessSettings,
  LocalizationProfile,
} from '@/types';
