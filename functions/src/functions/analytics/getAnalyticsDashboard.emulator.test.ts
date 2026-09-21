/**
 * Phase 32 — proves the actual authorization/business-isolation guarantees
 * of getAnalyticsDashboard against the real Firestore emulator (not
 * mocked): a business owner can read their own business's analytics, a
 * completely unrelated user CANNOT read another business's analytics, and
 * an authorized agency member CAN read a client business they're actually
 * assigned to. Also proves the aggregation reads real seeded events (not
 * fabricated) and respects the `days` range filter.
 */
import { v4 as uuid } from 'uuid';
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { getAnalyticsDashboard } from './getAnalyticsDashboard';
import { createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(businessId: string, userId: string, agencyId?: string): Business {
  return {
    businessId,
    userId,
    agencyId,
    name: 'Test Business',
    category: 'restaurant',
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Business;
}

describeIfEmulator('getAnalyticsDashboard — authorization & business isolation (Phase 32)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedEvent(
    eventName: string,
    userId: string,
    businessId: string,
    daysAgo: number
  ) {
    const eventId = `${userId}_${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    await db.collection('analytics_events').doc(eventId).set({
      eventId,
      eventName,
      userId,
      businessId,
      timestamp,
      metadata: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  it('a business owner can read their own business analytics, and the counts reflect exactly the seeded events', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await seedEvent('campaign_generated', ownerId, businessId, 1);
    await seedEvent('campaign_generated', ownerId, businessId, 2);
    await seedEvent('asset_downloaded', ownerId, businessId, 2);
    await seedEvent('whatsapp_clicked', ownerId, businessId, 5);

    const response = await (getAnalyticsDashboard as any).run(
      callableRequest({ businessId, days: 30 }, ownerId)
    );

    expect(response.businessId).toBe(businessId);
    expect(response.totals.campaignsGenerated).toBe(2);
    expect(response.totals.assetsDownloaded).toBe(1);
    expect(response.totals.whatsappClicks).toBe(1);
    expect(response.eventsAggregated).toBe(4);
  });

  it('the 7-day range excludes an event seeded 30 days ago (real timestamp filtering, not fabricated)', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await seedEvent('campaign_generated', ownerId, businessId, 3); // inside 7-day window
    await seedEvent('campaign_generated', ownerId, businessId, 30); // outside 7-day window

    const response = await (getAnalyticsDashboard as any).run(
      callableRequest({ businessId, days: 7 }, ownerId)
    );

    expect(response.totals.campaignsGenerated).toBe(1);
  });

  it('CRITICAL: Business A\'s owner cannot read Business B\'s analytics', async () => {
    const ownerA = `user-${uuid()}`;
    const ownerB = `user-${uuid()}`;
    const businessAId = `biz-A-${uuid()}`;
    const businessBId = `biz-B-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessAId, ownerA));
    await createBusinessDoc(makeBusiness(businessBId, ownerB));
    await seedEvent('campaign_generated', ownerB, businessBId, 1);

    await expect(
      (getAnalyticsDashboard as any).run(
        callableRequest({ businessId: businessBId, days: 30 }, ownerA)
      )
    ).rejects.toThrow(/access denied/i);
  });

  it('an authorized agency member CAN read a client business they are assigned to', async () => {
    const agencyId = `agency-${uuid()}`;
    const clientOwnerId = `user-${uuid()}`;
    const agencyMemberId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;

    await createBusinessDoc(makeBusiness(businessId, clientOwnerId, agencyId));
    await db
      .collection('users')
      .doc(agencyMemberId)
      .set({ userId: agencyMemberId, role: 'agency_member', agencyId, businessIds: [] });
    await seedEvent('campaign_generated', clientOwnerId, businessId, 1);

    const response = await (getAnalyticsDashboard as any).run(
      callableRequest({ businessId, days: 30 }, agencyMemberId)
    );

    expect(response.totals.campaignsGenerated).toBe(1);
  });

  it('an agency member from a DIFFERENT agency cannot read this client business', async () => {
    const agencyId = `agency-${uuid()}`;
    const otherAgencyId = `agency-${uuid()}`;
    const clientOwnerId = `user-${uuid()}`;
    const wrongAgencyMemberId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;

    await createBusinessDoc(makeBusiness(businessId, clientOwnerId, agencyId));
    await db
      .collection('users')
      .doc(wrongAgencyMemberId)
      .set({ userId: wrongAgencyMemberId, role: 'agency_member', agencyId: otherAgencyId, businessIds: [] });

    await expect(
      (getAnalyticsDashboard as any).run(
        callableRequest({ businessId, days: 30 }, wrongAgencyMemberId)
      )
    ).rejects.toThrow(/access denied/i);
  });

  it('a business with zero events in range returns real zero totals, not an error', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    const response = await (getAnalyticsDashboard as any).run(
      callableRequest({ businessId, days: 30 }, ownerId)
    );

    expect(response.totals).toEqual({
      campaignsStarted: 0,
      campaignsGenerated: 0,
      assetsDownloaded: 0,
      whatsappClicks: 0,
    });
    expect(response.eventsAggregated).toBe(0);
  });

  it('rejects a request for a business that does not exist', async () => {
    const ownerId = `user-${uuid()}`;
    await expect(
      (getAnalyticsDashboard as any).run(
        callableRequest({ businessId: `biz-nonexistent-${uuid()}`, days: 30 }, ownerId)
      )
    ).rejects.toThrow(/not found/i);
  });
});
