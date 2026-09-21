import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Firestore } from 'firebase-admin/firestore';

/**
 * Canonical event names for Phase 21 Analytics
 */
export const ANALYTICS_EVENTS = {
  SIGNUP: 'signup',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  CAMPAIGN_STARTED: 'campaign_started',
  CAMPAIGN_GENERATED: 'campaign_generated',
  ASSET_DOWNLOADED: 'asset_downloaded',
  WHATSAPP_CLICKED: 'whatsapp_clicked',
  SUBSCRIPTION_STARTED: 'subscription_started',
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
 */
export async function trackEvent(
  eventName: string,
  userId: string,
  businessId?: string,
  campaignId?: string,
  assetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventId = `${userId}_${eventName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
