import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBusinessDoc, getSubscriptionByUser } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { ANALYTICS_EVENTS } from '../../services/analyticsService';

/**
 * Phase 32 — Analytics Dashboard backend.
 *
 * Reads `analytics_events` (written by trackAnalyticsEvent.ts) and returns
 * an AGGREGATE summary, never raw events — the frontend never downloads a
 * business's full event history. This is a Cloud Function, not a direct
 * client Firestore query, for two reasons:
 *  1. firestore.rules only allows reading analytics_events where
 *     `resource.data.userId == request.auth.uid` — there is no rule
 *     allowing a businessId-scoped read, so an agency member viewing a
 *     client business's analytics could never satisfy the rule from the
 *     client directly. The Admin SDK here bypasses rules, and
 *     `verifyBusinessAccess` (the same authorization used by every other
 *     business-scoped callable) is the real gate instead.
 *  2. It lets aggregation happen server-side (see aggregateAnalyticsEvents
 *     below), which is also where "do not download all historical events"
 *     is actually enforced.
 *
 * IMPORTANT — event field name: the documents written by trackEvent()
 * (analyticsService.ts) use the field `eventName`, not `eventType`. Three
 * pre-existing composite indexes in firestore.indexes.json key on
 * `eventType` and are consequently unusable/dead — do not copy that field
 * name. See docs/PHASE_32_ANALYTICS_DASHBOARD_REPORT.md.
 *
 * Only business-scoped events are aggregated here. `signup` and
 * `subscription_started` never have a businessId attached at write time
 * (see that report) — they are account-level events, not business-level,
 * and are deliberately excluded rather than attributed to a business they
 * were never recorded against.
 */

const getAnalyticsDashboardSchema = z.object({
  businessId: z.string().min(1),
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

export interface AnalyticsEventRecord {
  eventName: string;
  /** ISO 8601 string, exactly as written by trackEvent() — not a Firestore Timestamp. */
  timestamp: string;
}

export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD (UTC)
  campaignsGenerated: number;
  assetsDownloaded: number;
  whatsappClicks: number;
}

export interface AnalyticsDashboardTotals {
  campaignsStarted: number;
  campaignsGenerated: number;
  assetsDownloaded: number;
  whatsappClicks: number;
}

export interface AnalyticsDashboardResult {
  businessId: string;
  rangeDays: 7 | 30 | 90;
  rangeStart: string;
  rangeEnd: string;
  totals: AnalyticsDashboardTotals;
  dailyActivity: DailyActivityPoint[];
  /** How many raw event docs were actually read/aggregated — see MAX_EVENTS_PER_QUERY below. */
  eventsAggregated: number;
  /** True only if eventsAggregated hit the safety cap — the totals above are then a lower bound, not exact. */
  truncated: boolean;
  /**
   * The BUSINESS's owner's subscription (from the account-level
   * `subscriptions` collection) — not the caller's own subscription. An
   * agency member viewing a client business sees that client's plan.
   * `null` genuinely means no subscription record exists for the owner
   * (a real, knowable state — the free tier — not missing data).
   */
  subscription: { planId: string; status: string } | null;
}

/**
 * Pure aggregation — no Firestore, no auth — so it is unit-testable on its
 * own. Every calendar day in [rangeStart, rangeEnd] is represented in
 * `dailyActivity` even when it has zero events, so a quiet day reads as a
 * real zero on the chart rather than being silently skipped.
 */
export function aggregateAnalyticsEvents(
  events: AnalyticsEventRecord[],
  rangeStart: Date,
  rangeEnd: Date
): { totals: AnalyticsDashboardTotals; dailyActivity: DailyActivityPoint[] } {
  const totals: AnalyticsDashboardTotals = {
    campaignsStarted: 0,
    campaignsGenerated: 0,
    assetsDownloaded: 0,
    whatsappClicks: 0,
  };

  const dayMap = new Map<string, DailyActivityPoint>();
  const cursor = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())
  );
  const endDay = new Date(
    Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate())
  );
  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, campaignsGenerated: 0, assetsDownloaded: 0, whatsappClicks: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const event of events) {
    const day = event.timestamp.slice(0, 10);
    const bucket = dayMap.get(day);

    switch (event.eventName) {
      case ANALYTICS_EVENTS.CAMPAIGN_STARTED:
        totals.campaignsStarted += 1;
        break;
      case ANALYTICS_EVENTS.CAMPAIGN_GENERATED:
        totals.campaignsGenerated += 1;
        if (bucket) bucket.campaignsGenerated += 1;
        break;
      case ANALYTICS_EVENTS.ASSET_DOWNLOADED:
        totals.assetsDownloaded += 1;
        if (bucket) bucket.assetsDownloaded += 1;
        break;
      case ANALYTICS_EVENTS.WHATSAPP_CLICKED:
        totals.whatsappClicks += 1;
        if (bucket) bucket.whatsappClicks += 1;
        break;
      default:
        // onboarding_complete and any other business-scoped event this
        // dashboard doesn't surface as a metric — intentionally ignored,
        // not an error.
        break;
    }
  }

  return {
    totals,
    dailyActivity: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Safety cap on a single dashboard load's Firestore read, not an expected
// ceiling — at this product's current real usage volume (see the Phase 32
// report), even a very active business over 90 days is nowhere near this.
// If `truncated` in the response is ever true, that is the signal to move
// to precomputed daily rollup documents instead of raw per-event reads.
const MAX_EVENTS_PER_QUERY = 5000;

export const getAnalyticsDashboard = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getAnalyticsDashboardSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getAnalyticsDashboard', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      const business = await getBusinessDoc(data.businessId);
      if (!business) {
        throw new Error(`Business not found: ${data.businessId}`);
      }

      // zod's `.default(30)` on a literal union doesn't narrow away
      // `undefined` in this version's inferred output type, so it's
      // resolved explicitly here rather than trusted as always-present.
      const days: 7 | 30 | 90 = data.days ?? 30;

      const rangeEnd = new Date();
      const rangeStart = new Date(rangeEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const snap = await admin
        .firestore()
        .collection('analytics_events')
        .where('businessId', '==', data.businessId)
        .where('timestamp', '>=', rangeStart.toISOString())
        .orderBy('timestamp', 'asc')
        .limit(MAX_EVENTS_PER_QUERY)
        .get();

      const events: AnalyticsEventRecord[] = snap.docs
        .map((doc) => doc.data())
        .filter(
          (d): d is Record<string, unknown> =>
            typeof d['eventName'] === 'string' && typeof d['timestamp'] === 'string'
        )
        .map((d) => ({ eventName: d['eventName'] as string, timestamp: d['timestamp'] as string }));

      const { totals, dailyActivity } = aggregateAnalyticsEvents(events, rangeStart, rangeEnd);

      // The business's owner's subscription, not the caller's — see the
      // `subscription` field doc comment on AnalyticsDashboardResult.
      const subscription = await getSubscriptionByUser(business.userId);

      const result: AnalyticsDashboardResult = {
        businessId: data.businessId,
        rangeDays: days,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        totals,
        dailyActivity,
        eventsAggregated: events.length,
        truncated: events.length >= MAX_EVENTS_PER_QUERY,
        subscription: subscription
          ? { planId: subscription.planId, status: subscription.status }
          : null,
      };

      logFunctionComplete(logger, startTime, { success: true, eventsAggregated: events.length });
      return result;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
