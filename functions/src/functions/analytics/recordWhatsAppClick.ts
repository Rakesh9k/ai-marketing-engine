import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { withIdempotency } from '../../middleware/idempotency';
import { getCampaignDoc, incrementCampaignWhatsAppClicks } from '../../services/firestore';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

/**
 * Phase 34 — the one server-authoritative write path for a real WhatsApp
 * click. This is the only performance metric in this codebase with a
 * genuinely observable source: the button that opens WhatsApp already
 * fires this call (see CampaignDetailContent.tsx's handleWhatsAppShare),
 * and the click actually happened by the time this runs — it isn't
 * inferred from anything else (a download, a generation, a page view).
 *
 * This replaces the generic trackAnalyticsEvent path for whatsapp_clicked
 * specifically, because that path had no ownership verification for this
 * event (see its own comments — "skip the full verification to avoid type
 * issues") and no aggregate write at all. It still writes the same
 * `analytics_events` document via the same trackEvent() helper, so the
 * Phase 32 business-level dashboard keeps counting it exactly as before —
 * this adds a verified, idempotent, per-campaign aggregate on top, it
 * doesn't replace the event log.
 */
const recordWhatsAppClickSchema = z.object({
  businessId: z.string().min(1),
  campaignId: z.string().min(1),
  assetId: z.string().optional(),
  // Client-generated once per real click (see recordWhatsAppClick.ts on the
  // frontend) — reused verbatim by the client on any retry of THAT SAME
  // click, so retries/refreshes/double-fired requests collapse into one
  // increment. A second, later, genuine click generates a new clickId and
  // is counted separately, as it should be.
  clickId: z.string().min(1).max(200),
});

export const recordWhatsAppClick = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(recordWhatsAppClickSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('recordWhatsAppClick', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      // Authorization: the caller must own (or be an agency member for)
      // the business they're attributing this click to.
      await verifyBusinessAccess(context.userId, data.businessId);

      // Campaign association: a campaignId that doesn't exist, or that
      // belongs to a different business than the one the caller is
      // authorized for, must never be recorded — this is the "wrong
      // campaign" / "wrong business" case the Phase 34 audit called out
      // (the previous generic path never checked this).
      const campaign = await getCampaignDoc(data.campaignId);
      if (!campaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }
      if (campaign.businessId !== data.businessId) {
        throw new HttpsError(
          'permission-denied',
          'This campaign does not belong to the specified business'
        );
      }

      const idempotencyKey = `whatsapp_click_${data.campaignId}_${data.clickId}`;
      const result = await withIdempotency(idempotencyKey, async () => {
        await trackEvent(
          ANALYTICS_EVENTS.WHATSAPP_CLICKED,
          context.userId,
          data.businessId,
          data.campaignId,
          data.assetId
        );
        await incrementCampaignWhatsAppClicks(data.campaignId, data.businessId);
        return { recorded: true };
      });

      logFunctionComplete(logger, startTime, { success: true });
      return result;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
