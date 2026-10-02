import { onCall } from 'firebase-functions/v2/https';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { verifyBusinessAccess } from '../../middleware/auth';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

export const trackAnalyticsEvent = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    const { logger, startTime } = logFunctionStart('trackAnalyticsEvent', {
      eventName: request.data.eventName,
      userId: uid,
    });

    try {
      if (!uid) {
        throw new Error('Authentication required to record an analytics event');
      }

      const data = request.data as any;
      const { eventName, businessId, campaignId, assetId, metadata } = data;

      // Validate the event name is a canonical Phase 21 event
      const validEvents = [
        ANALYTICS_EVENTS.SIGNUP,
        ANALYTICS_EVENTS.ONBOARDING_COMPLETE,
        ANALYTICS_EVENTS.CAMPAIGN_STARTED,
        ANALYTICS_EVENTS.CAMPAIGN_GENERATED,
        ANALYTICS_EVENTS.ASSET_DOWNLOADED,
        ANALYTICS_EVENTS.WHATSAPP_CLICKED,
        ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
      ] as const;

      if (!validEvents.includes(eventName)) {
        throw new Error(`Invalid analytics event: ${eventName}`);
      }

      // For asset_downloaded, verify user owns the asset/business
      if (eventName === ANALYTICS_EVENTS.ASSET_DOWNLOADED) {
        if (!assetId || !campaignId || !businessId) {
          throw new Error('assetId, campaignId, and businessId are required for asset_downloaded');
        }
      }

      // Phase 5 Auth/Authz Audit: this previously accepted ANY caller-
      // supplied businessId without verifying the caller actually has
      // access to it (the two "we'll skip the full verification" comments
      // that used to be here admitted as much). getAnalyticsDashboard.ts
      // aggregates analytics_events by businessId for that business's own
      // owner/agency member to view — without this check, any authenticated
      // user who merely knew (or once had, then lost) a businessId could
      // forge campaign_generated/asset_downloaded/whatsapp_clicked events
      // against it forever, polluting a business they have no current
      // access to. verifyBusinessAccess is the same authorization check
      // every other business-scoped callable already uses.
      if (businessId) {
        await verifyBusinessAccess(uid, businessId);
      }

      // Track the event
      await trackEvent(eventName, uid, businessId, campaignId, assetId, metadata);

      logFunctionComplete(logger, startTime, { success: true, eventName });
      return { success: true, eventName };
    } catch (error: any) {
      logFunctionError(logger, startTime, error as Error);
      throw new Error(error.message || 'Analytics tracking failed');
    }
  }
);
