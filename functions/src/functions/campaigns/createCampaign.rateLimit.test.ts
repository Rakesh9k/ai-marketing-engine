/**
 * Rate-limit precision audit — proves a rate-limited rejection at a real
 * callable boundary does not reserve credits or create campaign state.
 * createCampaign.ts checks the rate limit (§ middleware/rateLimit.ts,
 * action 'createCampaign', 50/hour) BEFORE reserveCredits() runs, so a
 * rejected 51st call in the same hour must never touch the usage doc or
 * write a campaign document. This exercises the real, now-fixed policy
 * resolution (previously this action silently used the 100/60s generic
 * default instead of its documented 50/hour policy — see rateLimit.ts).
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createCampaign } from './createCampaign';
import { createBusinessDoc, getUsageDocId } from '../../services/firestore';
import { rateLimitConfigs } from '../../middleware/rateLimit';
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
    duration: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 86400000).toISOString(),
    },
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

describeIfEmulator('createCampaign — rate-limit rejection does not reserve credits or create state', () => {
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

  it(
    'rejects the request past the documented 50/hour limit without reserving credits or writing a campaign',
    async () => {
      const limit = rateLimitConfigs['createCampaign']!.maxRequests;
      expect(limit).toBe(50);

      const userId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, userId));
      const usageId = await seedUsage(userId, 100_000);

      for (let i = 0; i < limit; i++) {
        await (createCampaign as any).run(
          callableRequest(makeCampaignInput(businessId, uuid()), userId)
        );
      }

      const usageBefore = (await db.collection('usage').doc(usageId).get()).data()!;
      const campaignsBefore = (
        await db.collection('campaigns').where('businessId', '==', businessId).get()
      ).size;
      expect(campaignsBefore).toBe(limit);

      await expect(
        (createCampaign as any).run(
          callableRequest(makeCampaignInput(businessId, uuid()), userId)
        )
      ).rejects.toMatchObject({ code: 'resource-exhausted' });

      const usageAfter = (await db.collection('usage').doc(usageId).get()).data()!;
      const campaignsAfter = (
        await db.collection('campaigns').where('businessId', '==', businessId).get()
      ).size;

      expect(usageAfter['creditsUsed']).toBe(usageBefore['creditsUsed']);
      expect(campaignsAfter).toBe(campaignsBefore);
    },
    30_000
  );
});
