import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Firestore } from 'firebase-admin/firestore';

/**
 * Canonical event names for Phase 21 Analytics
 */
export const ANALYTICS_EVENTS = {
  CREATIVE_TEMPLATE_VIEWED: 'creative_template_viewed',
  CREATIVE_TEMPLATE_SELECTED: 'creative_template_selected',
  CREATIVE_GENERATED: 'creative_generated',
  CREATIVE_APPROVED: 'creative_approved',
  CREATIVE_REJECTED: 'creative_rejected',
  CREATIVE_REGENERATED: 'creative_regenerated',
  CREATIVE_STYLE_SAVED: 'creative_style_saved',
  CREATIVE_LIKED: 'creative_liked',
  CREATIVE_DISLIKED: 'creative_disliked',
  SIGNUP: 'signup',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  CAMPAIGN_STARTED: 'campaign_started',
  CAMPAIGN_GENERATED: 'campaign_generated',
  CAMPAIGN_APPROVED: 'campaign_approved',
  CAMPAIGN_SCHEDULED: 'campaign_scheduled',
  CAMPAIGN_PUBLISHED: 'campaign_published',
  CAMPAIGN_FAILED: 'campaign_failed',
  CAMPAIGN_REGENERATED: 'campaign_regenerated',
  ASSET_DOWNLOADED: 'asset_downloaded',
  WHATSAPP_CLICKED: 'whatsapp_clicked',
  SUBSCRIPTION_STARTED: 'subscription_started',
  CREDIT_PURCHASED: 'credit_purchased',
  REEL_STARTED: 'reel_started',
  REEL_GENERATED: 'reel_generated',
} as const;

/**
 * Track a analytics event to Firestore
 *
 * @param eventName - The canonical event name
 * @param userId - Firebase Auth UID (server-derived, not from browser)
 * @param businessId - Optional business ID
 * @param campaignId - Optional campaign ID
 * @param assetId - Optional asset ID
 * @param metadata - Optional metadata specific to the event
 * @param customEventId - Optional deterministic event ID for idempotency
 */
export async function trackEvent(
  eventName: string,
  userId: string,
  businessId?: string,
  campaignId?: string,
  assetId?: string,
  metadata?: Record<string, unknown>,
  customEventId?: string
): Promise<void> {
  const eventId =
    customEventId ||
    `${userId}_${eventName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const adminDb = admin.firestore();
  const ref = adminDb.doc(`analytics_events/${eventId}`);
  await ref.set({
    eventId,
    eventName,
    userId,
    businessId,
    campaignId,
    assetId,
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Convenience functions for each of the 7 Phase 21 events
 */

/**
 * Track signup event - triggered when a new user account is successfully created
 */
export async function trackSignup(
  userId: string,
  businessId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.SIGNUP, userId, businessId, undefined, undefined, metadata);
}

/**
 * Track onboarding_complete event - triggered when onboarding data has successfully persisted
 */
export async function trackOnboardingComplete(
  userId: string,
  businessId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(
    ANALYTICS_EVENTS.ONBOARDING_COMPLETE,
    userId,
    businessId,
    undefined,
    undefined,
    metadata
  );
}

/**
 * Track campaign_started event - triggered when a user actually begins campaign generation
 */
export async function trackCampaignStarted(
  userId: string,
  businessId: string,
  campaignId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(
    ANALYTICS_EVENTS.CAMPAIGN_STARTED,
    userId,
    businessId,
    campaignId,
    undefined,
    metadata
  );
}

/**
 * Track campaign_generated event - triggered ONLY after a campaign has successfully been generated and persisted.
 * This is server-authoritative.
 */
export async function trackCampaignGenerated(
  userId: string,
  businessId: string,
  campaignId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(
    ANALYTICS_EVENTS.CAMPAIGN_GENERATED,
    userId,
    businessId,
    campaignId,
    undefined,
    metadata
  );
}

/**
 * Track asset_downloaded event - triggered when a user successfully downloads an asset
 */
export async function trackAssetDownloaded(
  userId: string,
  businessId: string,
  campaignId: string,
  assetId: string,
  assetType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.ASSET_DOWNLOADED, userId, businessId, campaignId, assetId, {
    ...metadata,
    assetType,
  });
}

/**
 * Track whatsapp_clicked event - triggered when the user clicks the WhatsApp CTA
 */
export async function trackWhatsAppClicked(
  userId: string,
  businessId: string,
  campaignId?: string,
  assetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(
    ANALYTICS_EVENTS.WHATSAPP_CLICKED,
    userId,
    businessId,
    campaignId,
    assetId,
    metadata
  );
}

/**
 * Track subscription_started event - triggered when a verified subscription/payment state is confirmed.
 */
export async function trackSubscriptionStarted(
  userId: string,
  businessId: string,
  subscriptionId: string,
  planId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(
    ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
    userId,
    businessId,
    undefined,
    undefined,
    {
      ...metadata,
      subscriptionId,
      planId,
    }
  );
}

export type CreativeAnalyticsEventType =
  | 'creative_template_viewed'
  | 'creative_template_selected'
  | 'creative_generated'
  | 'creative_approved'
  | 'creative_rejected'
  | 'creative_regenerated'
  | 'creative_style_saved';

export interface CreativeEventPayload {
  eventType: CreativeAnalyticsEventType;
  userId: string;
  businessId: string;
  creativeId?: string;
  campaignId?: string;
  templateId?: string;
  templateVersion?: number;
  styleId?: string;
  styleVersion?: number;
  creativeType?: 'post' | 'reel';
  objective?: string;
  metadata?: Record<string, unknown>;
}

export async function trackCreativeEvent(payload: CreativeEventPayload): Promise<void> {
  const {
    eventType,
    userId,
    businessId,
    creativeId,
    campaignId,
    templateId,
    templateVersion,
    styleId,
    styleVersion,
    creativeType,
    objective,
    metadata,
  } = payload;

  const eventId = `${userId}_${eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const adminDb = admin.firestore();
  const ref = adminDb.doc(`analytics_events/${eventId}`);

  await ref.set({
    eventId,
    eventName: eventType,
    userId,
    businessId,
    creativeId,
    campaignId,
    templateId,
    templateVersion,
    styleId,
    styleVersion,
    creativeType,
    objective,
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Safe helper functions for Phase 16 lifecycle & creative feedback events.
 * Wraps trackEvent in try/catch to ensure analytics failures NEVER interrupt
 * primary business operations.
 */

export async function trackCampaignApproved(
  userId: string,
  businessId: string,
  campaignId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const eventId = `${userId}_campaign_approved_${campaignId}`;
    await trackEvent(
      ANALYTICS_EVENTS.CAMPAIGN_APPROVED,
      userId,
      businessId,
      campaignId,
      undefined,
      metadata,
      eventId
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track campaign_approved:', err);
  }
}

export async function trackCampaignScheduled(
  userId: string,
  businessId: string,
  campaignId: string,
  scheduledPostId: string,
  platform: string,
  contentType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const eventId = `${userId}_campaign_scheduled_${scheduledPostId}_${platform}`;
    await trackEvent(
      ANALYTICS_EVENTS.CAMPAIGN_SCHEDULED,
      userId,
      businessId,
      campaignId,
      undefined,
      { ...metadata, scheduledPostId, platform, contentType },
      eventId
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track campaign_scheduled:', err);
  }
}

export async function trackCampaignPublished(
  userId: string,
  businessId: string,
  campaignId: string,
  publishJobId: string,
  platform: string,
  externalPostId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const eventId = `${userId}_campaign_published_${publishJobId}_${platform}`;
    await trackEvent(
      ANALYTICS_EVENTS.CAMPAIGN_PUBLISHED,
      userId,
      businessId,
      campaignId,
      undefined,
      { ...metadata, publishJobId, platform, externalPostId },
      eventId
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track campaign_published:', err);
  }
}

export async function trackCampaignFailed(
  userId: string,
  businessId: string,
  campaignId: string,
  publishJobId: string,
  platform: string,
  errorCode?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const eventId = `${userId}_campaign_failed_${publishJobId}_${platform}`;
    await trackEvent(
      ANALYTICS_EVENTS.CAMPAIGN_FAILED,
      userId,
      businessId,
      campaignId,
      undefined,
      { ...metadata, publishJobId, platform, errorCode },
      eventId
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track campaign_failed:', err);
  }
}

export async function trackCampaignRegenerated(
  userId: string,
  businessId: string,
  campaignId: string,
  assetId: string,
  assetType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await trackEvent(
      ANALYTICS_EVENTS.CAMPAIGN_REGENERATED,
      userId,
      businessId,
      campaignId,
      assetId,
      { ...metadata, assetType }
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track campaign_regenerated:', err);
  }
}

export async function trackCreativeLiked(
  userId: string,
  businessId: string,
  creativeId: string,
  campaignId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await trackEvent(
      ANALYTICS_EVENTS.CREATIVE_LIKED,
      userId,
      businessId,
      campaignId,
      creativeId,
      metadata
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track creative_liked:', err);
  }
}

export async function trackCreativeDisliked(
  userId: string,
  businessId: string,
  creativeId: string,
  campaignId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await trackEvent(
      ANALYTICS_EVENTS.CREATIVE_DISLIKED,
      userId,
      businessId,
      campaignId,
      creativeId,
      metadata
    );
  } catch (err) {
    console.warn('[AnalyticsService] Failed to track creative_disliked:', err);
  }
}
