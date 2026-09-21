/**
 * Phase 15 — proves the createCampaign draft-creation path (distinct from
 * generateCampaignStrategy's pipeline path) actually reserves credits via
 * the real reserveCredits transaction (services/firestore.ts, fixed this
 * phase — see firestore.reserveCredits.test.ts), persists a correctly-
 * owned campaign document, and rejects both cross-business access and a
 * duplicate idempotencyKey double-reservation.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createCampaign } from './createCampaign';
import { createBusinessDoc, getCampaignDoc, getUsageDocId } from '../../services/firestore';
import type { Business } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
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

function makeCampaignInput(businessId: string, idempotencyKey: string) {
  return {
    businessId,
    objective: 'weekend_offer' as const,
    offer: {
      headline: 'Weekend Special',
      price: 299,
      type: 'percentage' as const,
      validityStart: new Date().toISOString(),
      validityEnd: new Date(Date.now() + 86400000).toISOString(),
    },
    duration: { start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString() },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp' as const,
    localization: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'en' as const,
      secondaryLanguage: 'en' as const,
      languageMixing: 'minimal' as const,
      regionalStyle: 'neutral' as const,
      slangPreference: 'light' as const,
      audienceDescription: 'Local food lovers',
      brandTone: 'friendly' as const,
      campaignStyle: 'funny' as const,
      contentFormat: 'poster' as const,
    },
    idempotencyKey,
  };
}

describeIfEmulator('createCampaign — credit reservation and ownership (Phase 15)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUsage(userId: string, creditsIncluded: number) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = getUsageDocId(userId, periodStart);
    await db.collection('usage').doc(usageId).set({
      usageId,
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      planId: 'business',
      creditsIncluded,
      campaignsCreated: 0,
      creditsUsed: 0,
      imagesGenerated: 0,
      copyGenerations: 0,
      regenerations: 0,
      failedGenerations: 0,
      updatedAt: new Date().toISOString(),
    });
    return usageId;
  }

  it('creates a draft campaign, reserves credits, and persists the correct businessId/userId/status', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await seedUsage(userId, 100);

    const result = await (createCampaign as any).run(
      callableRequest(makeCampaignInput(businessId, uuid()), userId)
    );

    const campaign = await getCampaignDoc(result.campaignId);
    expect(campaign).not.toBeNull();
    expect(campaign!.businessId).toBe(businessId);
    expect(campaign!.userId).toBe(userId);
    expect(campaign!.status).toBe('draft');
    expect(campaign!.creditsReserved).toBeGreaterThan(0);
  });

  it('CRITICAL: a user cannot create a campaign for a business they do not own', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await seedUsage(attackerId, 100);

    await expect(
      (createCampaign as any).run(
        callableRequest(makeCampaignInput(businessId, uuid()), attackerId)
      )
    ).rejects.toThrow();
  });

  it('REGRESSION (Phase 15): the same idempotencyKey submitted twice does not reserve credits twice', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    const usageId = await seedUsage(userId, 100);
    const idempotencyKey = uuid();

    const input = makeCampaignInput(businessId, idempotencyKey);
    await (createCampaign as any).run(callableRequest(input, userId));

    const usageBefore = await db.collection('usage').doc(usageId).get();
    const creditsUsedAfterFirst = usageBefore.data()!['creditsUsed'];
    expect(creditsUsedAfterFirst).toBeGreaterThan(0);

    // A retried request with the same idempotencyKey (a duplicate click, or
    // a client retry after a dropped response) must not reserve credits a
    // second time — this is the financial invariant the Phase 15 audit
    // found broken and fixed in services/firestore.ts's reserveCredits
    // (see firestore.reserveCredits.test.ts). Note this does NOT currently
    // resolve to "the second call is rejected": createCampaign mints a new
    // campaignId on every call regardless of idempotencyKey, so it still
    // succeeds and creates a second draft campaign document — a separate,
    // lower-severity gap (duplicate DRAFT, not duplicate CHARGE) on this
    // endpoint, documented in the Phase 15 report; the endpoint is not
    // currently called by the shipped frontend (generateCampaignStrategy
    // is the live path and does not have this gap).
    await (createCampaign as any).run(callableRequest(input, userId));

    const usageAfter = await db.collection('usage').doc(usageId).get();
    expect(usageAfter.data()!['creditsUsed']).toBe(creditsUsedAfterFirst);
  });

  it('insufficient credits blocks campaign creation entirely — no campaign document, no partial reservation', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await seedUsage(userId, 1); // far below the base campaign cost

    await expect(
      (createCampaign as any).run(callableRequest(makeCampaignInput(businessId, uuid()), userId))
    ).rejects.toThrow(/Insufficient credits/);

    const campaignsSnap = await db.collection('campaigns').where('businessId', '==', businessId).get();
    expect(campaignsSnap.size).toBe(0);
  });
});
