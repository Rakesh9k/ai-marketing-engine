import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase/client';

/**
 * Client-side entry point to the existing, canonical Phase 21 analytics
 * system (functions/src/services/analyticsService.ts's ANALYTICS_EVENTS,
 * exposed via the trackAnalyticsEvent callable). Deliberately NOT the
 * src/services/database.ts analyticsService.log() path — that one writes
 * directly to Firestore from the client, but firestore.rules denies all
 * client writes to analytics_events ("Cloud Functions only"), so that path
 * can never actually succeed. This is the only viable, already-existing
 * way to record an analytics event from the browser.
 */
export type AnalyticsEventName = 'asset_downloaded' | 'whatsapp_clicked';

interface TrackEventParams {
  eventName: AnalyticsEventName;
  businessId?: string;
  campaignId?: string;
  assetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget: never throws, never awaited by the caller. The customer
 * action this accompanies (download, WhatsApp share) must succeed even if
 * analytics fails entirely — this function guarantees that by construction
 * rather than relying on every call site to remember to catch it.
 */
export function trackEvent(params: TrackEventParams): void {
  try {
    const functions = getFirebaseFunctions();
    if (!functions) return;
    const call = httpsCallable(functions, 'trackAnalyticsEvent');
    call(params).catch((err) => {
      console.error('Analytics tracking failed (non-blocking):', err);
    });
  } catch (err) {
    console.error('Analytics tracking failed (non-blocking):', err);
  }
}

/**
 * Phase 34 — the WhatsApp-click-specific write path (recordWhatsAppClick
 * Cloud Function), not the generic trackEvent above. This is the only
 * performance signal with a real, directly-observable source, so it gets
 * its own authorized + idempotent backend path instead of going through
 * the generic, unverified `trackAnalyticsEvent` callable.
 *
 * `clickId` must be generated ONCE per real click by the caller (e.g. via
 * `crypto.randomUUID()` right when the click handler fires) and reused
 * as-is for any retry of that same call — never regenerated on retry, and
 * never reused across two separate clicks. That's what makes a retried/
 * duplicated request collapse into one count while two genuine clicks
 * still count as two.
 */
export function recordWhatsAppClick(params: {
  businessId: string;
  campaignId: string;
  assetId?: string;
  clickId: string;
}): void {
  try {
    const functions = getFirebaseFunctions();
    if (!functions) return;
    const call = httpsCallable(functions, 'recordWhatsAppClick');
    call(params).catch((err) => {
      console.error('WhatsApp click tracking failed (non-blocking):', err);
    });
  } catch (err) {
    console.error('WhatsApp click tracking failed (non-blocking):', err);
  }
}
