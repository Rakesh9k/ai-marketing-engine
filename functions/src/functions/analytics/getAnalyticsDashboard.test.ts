/**
 * Phase 32 — unit tests for the pure aggregation logic
 * (`aggregateAnalyticsEvents`) that backs the Analytics Dashboard. These
 * run everywhere (no Firestore/emulator involved) since the function takes
 * plain event records and dates. Authorization/business-isolation and the
 * actual Firestore query are covered separately in
 * getAnalyticsDashboard.emulator.test.ts (emulator-gated).
 *
 * "Event accuracy" per the phase brief means: every count in the response
 * must trace to a real event of that exact `eventName`, no event is
 * double-counted or dropped, and a day with zero events reads as a real
 * zero — not a gap and not "no data."
 */
import { aggregateAnalyticsEvents, type AnalyticsEventRecord } from './getAnalyticsDashboard';
import { ANALYTICS_EVENTS } from '../../services/analyticsService';

function iso(day: string, hour = '12:00:00'): string {
  return `${day}T${hour}.000Z`;
}

describe('aggregateAnalyticsEvents', () => {
  it('counts each canonical business-scoped event into its own total, exactly once', () => {
    const events: AnalyticsEventRecord[] = [
      { eventName: ANALYTICS_EVENTS.CAMPAIGN_STARTED, timestamp: iso('2026-01-05') },
      { eventName: ANALYTICS_EVENTS.CAMPAIGN_GENERATED, timestamp: iso('2026-01-05') },
      { eventName: ANALYTICS_EVENTS.CAMPAIGN_GENERATED, timestamp: iso('2026-01-06') },
      { eventName: ANALYTICS_EVENTS.ASSET_DOWNLOADED, timestamp: iso('2026-01-06') },
      { eventName: ANALYTICS_EVENTS.WHATSAPP_CLICKED, timestamp: iso('2026-01-07') },
    ];
    const { totals } = aggregateAnalyticsEvents(
      events,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-10T00:00:00.000Z')
    );

    expect(totals.campaignsStarted).toBe(1);
    expect(totals.campaignsGenerated).toBe(2);
    expect(totals.assetsDownloaded).toBe(1);
    expect(totals.whatsappClicks).toBe(1);
  });

  it('does not count an event type it does not track as a metric (e.g. onboarding_complete)', () => {
    const events: AnalyticsEventRecord[] = [
      { eventName: ANALYTICS_EVENTS.ONBOARDING_COMPLETE, timestamp: iso('2026-01-05') },
    ];
    const { totals, dailyActivity } = aggregateAnalyticsEvents(
      events,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-10T00:00:00.000Z')
    );
    const sumOfTotals = Object.values(totals).reduce((a, b) => a + b, 0);
    expect(sumOfTotals).toBe(0);
    const sumOfDaily = dailyActivity.reduce(
      (sum, d) => sum + d.campaignsGenerated + d.assetsDownloaded + d.whatsappClicks,
      0
    );
    expect(sumOfDaily).toBe(0);
  });

  it('an unrecognized/future event name is silently ignored, not miscounted into an existing bucket', () => {
    const events: AnalyticsEventRecord[] = [{ eventName: 'some_future_event', timestamp: iso('2026-01-05') }];
    const { totals } = aggregateAnalyticsEvents(
      events,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-10T00:00:00.000Z')
    );
    expect(Object.values(totals).every((n) => n === 0)).toBe(true);
  });

  it('every calendar day in the range appears in dailyActivity, including days with zero events (real zero, not a gap)', () => {
    const { dailyActivity } = aggregateAnalyticsEvents(
      [],
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-03T00:00:00.000Z')
    );
    expect(dailyActivity.map((d) => d.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(dailyActivity.every((d) => d.campaignsGenerated === 0)).toBe(true);
  });

  it('buckets each event into its own UTC day, not the query range start day', () => {
    const events: AnalyticsEventRecord[] = [
      { eventName: ANALYTICS_EVENTS.CAMPAIGN_GENERATED, timestamp: iso('2026-01-02', '23:59:59') },
      { eventName: ANALYTICS_EVENTS.CAMPAIGN_GENERATED, timestamp: iso('2026-01-03', '00:00:01') },
    ];
    const { dailyActivity } = aggregateAnalyticsEvents(
      events,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-05T00:00:00.000Z')
    );
    const jan2 = dailyActivity.find((d) => d.date === '2026-01-02')!;
    const jan3 = dailyActivity.find((d) => d.date === '2026-01-03')!;
    expect(jan2.campaignsGenerated).toBe(1);
    expect(jan3.campaignsGenerated).toBe(1);
  });

  it('an event whose day falls outside the requested range is counted in totals but does not corrupt dailyActivity (defensive: bucket lookup misses cleanly)', () => {
    // Guards against a caller passing an event array that wasn't actually
    // pre-filtered to [rangeStart, rangeEnd] — the real handler always
    // queries with a `timestamp >=` filter, but this proves the pure
    // function itself doesn't crash or silently invent a day bucket.
    const events: AnalyticsEventRecord[] = [
      { eventName: ANALYTICS_EVENTS.CAMPAIGN_GENERATED, timestamp: iso('2025-12-25') },
    ];
    expect(() =>
      aggregateAnalyticsEvents(
        events,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-05T00:00:00.000Z')
      )
    ).not.toThrow();
    const { totals, dailyActivity } = aggregateAnalyticsEvents(
      events,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-05T00:00:00.000Z')
    );
    expect(totals.campaignsGenerated).toBe(1); // still counted in the total
    expect(dailyActivity.some((d) => d.date === '2025-12-25')).toBe(false); // but no phantom day added
  });

  it('a single-day range produces exactly one dailyActivity entry', () => {
    const { dailyActivity } = aggregateAnalyticsEvents(
      [],
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T23:59:59.000Z')
    );
    expect(dailyActivity).toHaveLength(1);
    expect(dailyActivity[0]!.date).toBe('2026-01-01');
  });

  it('dailyActivity is always sorted chronologically ascending', () => {
    const { dailyActivity } = aggregateAnalyticsEvents(
      [],
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-07T00:00:00.000Z')
    );
    const dates = dailyActivity.map((d) => d.date);
    expect(dates).toEqual([...dates].sort());
  });
});
