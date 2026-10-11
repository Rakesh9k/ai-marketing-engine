/**
 * Pass 2C — credit contract for a campaign, through the real callable against the Firestore emulator
 * (AI pipeline mocked; no provider, network or billing).
 *
 * Product contract being pinned (see docs/audits/mitra-complete-audit/10b): a campaign is a FLAT
 * getGenerationCost('campaign_generation') credits (60 base + 2 x 20 images = 100). Plans advertise
 * campaigns/month = credits / 100. A delivered campaign is charged exactly that; a campaign that is not
 * delivered nets zero; a replay never charges twice; a refund can never exceed what was reserved.
 */
import { v4 as uuid } from 'uuid';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

import * as admin from 'firebase-admin';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { createBusinessDoc } from '../../services/firestore';
import { getGenerationCost, refundReservation } from '../../services/usageControl';
import { PRICING } from '../../config/pricing';
import type { Business } from '../../types';

const CAMPAIGN_COST = getGenerationCost('campaign_generation');

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

function makeRequestData(businessId: string, idempotencyKey: string) {
  return {
    businessId,
    objective: 'weekend_offer',
    offer: {
      headline: 'Weekend Special',
      price: 299,
      type: 'percentage',
      validityStart: new Date().toISOString(),
      validityEnd: new Date(Date.now() + 86400000).toISOString(),
    },
    duration: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 86400000).toISOString(),
    },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localization: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'en',
      secondaryLanguage: 'en',
      languageMixing: 'minimal',
      regionalStyle: 'neutral',
      slangPreference: 'light',
      audienceDescription: 'Local food lovers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    idempotencyKey,
  };
}

const pipelineResult = (status: 'PASS' | 'REVIEW_REQUIRED' | 'FAIL') => ({
  campaignPack: {
    assets: [
      {
        assetId: `asset-${uuid()}`,
        type: 'poster',
        index: 0,
        content: { headline: 'Weekend Special' },
        imageUrl: 'https://storage.googleapis.com/fake/poster.png',
        storagePath: 'businesses/fake/campaigns/fake/generated/poster_1.png',
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
    ],
    truthCheck: { status, summary: 'mock', checkedAt: new Date().toISOString(), checks: [] },
  },
  allGeneratedStoragePaths: [],
});

describeIfEmulator('campaign credit contract (Firestore emulator, mocked AI)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => jest.clearAllMocks());

  async function newUser(planId: 'free' | 'business') {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await db
      .collection('usage')
      .doc(usageId)
      .set({
        usageId,
        userId,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        planId,
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: new Date().toISOString(),
      });
    await db.collection('users').doc(userId).set({ userId, businessIds: [businessId], role: 'user' });
    return { userId, businessId, usageId };
  }
  const creditsUsed = async (usageId: string) =>
    (await db.collection('usage').doc(usageId).get()).data()!['creditsUsed'] as number;
  const generate = (userId: string, businessId: string, key = uuid()) =>
    (generateCampaignStrategy as any).run(callableRequest(makeRequestData(businessId, key), userId));

  it('the price is the documented flat 100 (60 base + 2 x 20 images)', () => {
    expect(CAMPAIGN_COST).toBe(100);
    expect(CAMPAIGN_COST).toBe(PRICING.campaignBaseCredits + 2 * PRICING.imageGenerationCredits);
  });

  it('a delivered campaign (Truth Check PASS) is charged exactly the flat price, once', async () => {
    const { userId, businessId, usageId } = await newUser('business');
    mockExecute.mockResolvedValue(pipelineResult('PASS'));
    await generate(userId, businessId);
    expect(await creditsUsed(usageId)).toBe(CAMPAIGN_COST);
    const txns = await db.collection('transactions').where('userId', '==', userId).get();
    const statuses = txns.docs.map((d) => d.data()['status']);
    expect(statuses).toEqual(['completed']);
  });

  it('a campaign delivered for review (REVIEW_REQUIRED) is also charged the flat price — it is delivered', async () => {
    const { userId, businessId, usageId } = await newUser('business');
    mockExecute.mockResolvedValue(pipelineResult('REVIEW_REQUIRED'));
    await generate(userId, businessId);
    expect(await creditsUsed(usageId)).toBe(CAMPAIGN_COST);
  });

  it('a Truth-Check-rejected campaign nets zero credits', async () => {
    const { userId, businessId, usageId } = await newUser('business');
    mockExecute.mockResolvedValue(pipelineResult('FAIL'));
    await expect(generate(userId, businessId)).rejects.toBeDefined();
    expect(await creditsUsed(usageId)).toBe(0);
  });

  it('replaying the SAME idempotency key after success does not charge a second time', async () => {
    const { userId, businessId, usageId } = await newUser('business');
    mockExecute.mockResolvedValue(pipelineResult('PASS'));
    const key = uuid();
    await generate(userId, businessId, key);
    await generate(userId, businessId, key).catch(() => undefined); // may replay or be refused; never double-charge
    expect(await creditsUsed(usageId)).toBe(CAMPAIGN_COST);
  });

  it('refund is idempotent and never exceeds what was reserved', async () => {
    const { userId, businessId, usageId } = await newUser('business');
    mockExecute.mockRejectedValue(new Error('provider down'));
    await expect(generate(userId, businessId)).rejects.toBeDefined();
    expect(await creditsUsed(usageId)).toBe(0);

    const reservations = await db
      .collection('transactions')
      .where('userId', '==', userId)
      .where('status', '==', 'refunded')
      .get();
    expect(reservations.size).toBe(1);
    const operationId = reservations.docs[0]!.id;
    const reserved = Math.abs(reservations.docs[0]!.data()['amount'] as number);
    expect(reserved).toBe(CAMPAIGN_COST);

    // Hammer the refund path: it must stay a no-op, never push the balance negative or refund extra.
    await refundReservation(operationId, userId);
    await refundReservation(operationId, userId);
    expect(await creditsUsed(usageId)).toBe(0);
    const refundDocs = await db.collection('transactions').where('userId', '==', userId).where('type', '==', 'refund').get();
    const refundedTotal = refundDocs.docs.reduce((s, d) => s + Math.abs(d.data()['amount'] as number), 0);
    expect(refundedTotal).toBeLessThanOrEqual(reserved);
  });

  it('free plan: 140 credits buys exactly one campaign; the second is refused and nothing extra is charged', async () => {
    const { userId, businessId, usageId } = await newUser('free');
    mockExecute.mockResolvedValue(pipelineResult('PASS'));
    await generate(userId, businessId);
    expect(await creditsUsed(usageId)).toBe(CAMPAIGN_COST);
    expect(PRICING.subscriptionTiers.free.monthlyCredits - CAMPAIGN_COST).toBe(40);

    await expect(generate(userId, businessId)).rejects.toBeDefined();
    expect(await creditsUsed(usageId)).toBe(CAMPAIGN_COST); // unchanged
  });

  it('free plan under concurrency: two simultaneous campaigns cannot both be charged', async () => {
    const { userId, businessId, usageId } = await newUser('free');
    mockExecute.mockResolvedValue(pipelineResult('PASS'));
    const results = await Promise.allSettled([generate(userId, businessId), generate(userId, businessId)]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    expect(ok).toBe(1);
    expect(await creditsUsed(usageId)).toBe(CAMPAIGN_COST);
  });
});
