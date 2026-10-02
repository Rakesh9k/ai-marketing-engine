/**
 * Phase 5 Auth/Authz Audit — trackAnalyticsEvent previously accepted ANY
 * caller-supplied businessId for the asset_downloaded/whatsapp_clicked
 * events without verifying the caller actually has access to it (two
 * "we'll skip the full verification" comments admitted this in the code).
 * Since getAnalyticsDashboard.ts aggregates analytics_events by businessId
 * for that business's own owner to view, this let any authenticated
 * stranger who merely knew a businessId forge events against it, polluting
 * that business's analytics. See trackAnalyticsEvent.ts for the fix.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { trackAnalyticsEvent } from './trackAnalyticsEvent';
import { createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

function callableRequest(data: unknown, uid: string | null) {
  return { data, auth: uid ? { uid, token: {} as any } : null } as any;
}

function makeBusiness(businessId: string, userId: string): Business {
  return {
    businessId,
    userId,
    name: 'Test Restaurant',
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

describeIfEmulator('trackAnalyticsEvent — auth/authz (Phase 5)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('rejects an unauthenticated caller', async () => {
    await expect(
      (trackAnalyticsEvent as any).run(callableRequest({ eventName: 'whatsapp_clicked' }, null))
    ).rejects.toThrow();
  });

  it('CRITICAL: rejects a caller reporting whatsapp_clicked against a businessId they do not own', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(
      (trackAnalyticsEvent as any).run(
        callableRequest(
          { eventName: 'whatsapp_clicked', businessId, campaignId: `camp-${uuid()}` },
          attackerId
        )
      )
    ).rejects.toThrow();
  });

  it('CRITICAL: rejects a caller reporting asset_downloaded against a businessId they do not own', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(
      (trackAnalyticsEvent as any).run(
        callableRequest(
          {
            eventName: 'asset_downloaded',
            businessId,
            campaignId: `camp-${uuid()}`,
            assetId: `asset-${uuid()}`,
          },
          attackerId
        )
      )
    ).rejects.toThrow();
  });

  it('allows a business owner to report whatsapp_clicked against their own business', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    const result = await (trackAnalyticsEvent as any).run(
      callableRequest(
        { eventName: 'whatsapp_clicked', businessId, campaignId: `camp-${uuid()}` },
        ownerId
      )
    );
    expect(result.success).toBe(true);
  });

  it('allows an account-level event with no businessId at all (e.g. signup)', async () => {
    const userId = `user-${uuid()}`;
    const result = await (trackAnalyticsEvent as any).run(
      callableRequest({ eventName: 'signup' }, userId)
    );
    expect(result.success).toBe(true);
  });
});
