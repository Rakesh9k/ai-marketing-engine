/**
 * Pass 2C P1-B through the real callable (Firestore emulator, AI pipeline mocked): a contradictory offer is
 * rejected as invalid-argument BEFORE any credit is reserved, any campaign document is created, or the
 * pipeline is invoked — and the valid boundary cases still go through and are charged the flat price.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { createBusinessDoc } from '../../services/firestore';
import { getGenerationCost } from '../../services/usageControl';
import type { Business } from '../../types';

const COST = getGenerationCost('campaign_generation');
const DAY = 86400000;

const passResult = {
  campaignPack: {
    assets: [
      {
        assetId: 'a1',
        type: 'poster',
        index: 0,
        content: { headline: 'x' },
        imageUrl: 'https://storage.googleapis.com/fake/p.png',
        storagePath: 'businesses/f/campaigns/f/generated/p.png',
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
    ],
    truthCheck: { status: 'PASS', summary: 'ok', checkedAt: new Date().toISOString(), checks: [] },
  },
  allGeneratedStoragePaths: [],
};

function business(businessId: string, userId: string): Business {
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

describeIfEmulator('contradictory offers are rejected before any credit is used', () => {
  const db = admin.firestore();
  afterAll(async () => {
    await admin.app().delete();
  });
  beforeEach(() => jest.clearAllMocks());

  async function setup() {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(business(businessId, userId));
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await db
      .collection('usage')
      .doc(usageId)
      .set({
        usageId,
        userId,
        planId: 'business',
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: new Date().toISOString(),
      });
    await db
      .collection('users')
      .doc(userId)
      .set({ userId, businessIds: [businessId], role: 'user' });
    return { userId, businessId, usageId };
  }

  const request = (
    businessId: string,
    uid: string,
    offer: Record<string, unknown>,
    duration?: { start: string; end: string },
    productId?: string
  ) =>
    ({
      data: {
        businessId,
        ...(productId ? { productId } : {}),
        objective: 'weekend_offer',
        offer: { headline: 'Weekend Special', price: 299, type: 'fixed', ...offer },
        duration: duration ?? {
          start: new Date().toISOString(),
          end: new Date(Date.now() + DAY).toISOString(),
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
          campaignStyle: 'urgent',
          contentFormat: 'poster',
        },
        idempotencyKey: uuid(),
      },
      auth: { uid, token: {} as never },
    }) as never;

  const used = async (usageId: string) =>
    (await db.collection('usage').doc(usageId).get()).data()!['creditsUsed'] as number;
  const run = (r: never) => (generateCampaignStrategy as any).run(r);

  async function expectRejectedForFree(
    offer: Record<string, unknown>,
    message: RegExp,
    duration?: { start: string; end: string },
    productId?: string
  ) {
    const { userId, businessId, usageId } = await setup();
    await expect(
      run(request(businessId, userId, offer, duration, productId))
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      message: expect.stringMatching(message),
    });
    expect(await used(usageId)).toBe(0); // no credits consumed
    expect((await db.collection('transactions').where('userId', '==', userId).get()).size).toBe(0); // none reserved
    expect(
      (await db.collection('campaigns').where('businessId', '==', businessId).get()).size
    ).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled(); // no AI call
  }

  it('original price below the offer price', async () => {
    await expectRejectedForFree(
      { type: 'percentage', price: 299, originalPrice: 249 },
      /lower than the offer price/
    );
  });

  it('percentage offer whose original price equals the price (no discount to state)', async () => {
    await expectRejectedForFree(
      { type: 'percentage', price: 299, originalPrice: 299 },
      /no discount to state/
    );
  });

  it('offer end date before its start date', async () => {
    const now = Date.now();
    await expectRejectedForFree(
      {
        validityStart: new Date(now + 2 * DAY).toISOString(),
        validityEnd: new Date(now + DAY).toISOString(),
      },
      /earlier than its start/
    );
  });

  it('campaign end date before its start date', async () => {
    const now = Date.now();
    await expectRejectedForFree({}, /campaign end date/, {
      start: new Date(now + DAY).toISOString(),
      end: new Date(now).toISOString(),
    });
  });

  it('an offer that is over before the campaign starts', async () => {
    const now = Date.now();
    await expectRejectedForFree(
      { validityEnd: new Date(now - DAY).toISOString() },
      /ends before the campaign starts/
    );
  });

  it('a "was" price that disagrees with the catalogue price of the chosen product', async () => {
    const { userId, businessId, usageId } = await setup();
    const productId = `prod-${uuid()}`;
    await db.collection('products').doc(productId).set({
      productId,
      businessId,
      userId,
      name: 'Chicken Dum Biryani',
      price: 250,
      status: 'active',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await expect(
      run(
        request(
          businessId,
          userId,
          { type: 'percentage', price: 160, originalPrice: 200 },
          undefined,
          productId
        )
      )
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      message: expect.stringMatching(/does not match this product's price in your catalogue/),
    });
    expect(await used(usageId)).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('valid boundary cases still go through and are charged the flat price (original == price on a fixed offer)', async () => {
    const { userId, businessId, usageId } = await setup();
    mockExecute.mockResolvedValue(passResult);
    await run(request(businessId, userId, { type: 'fixed', price: 299, originalPrice: 299 }));
    expect(await used(usageId)).toBe(COST);
  });

  it('valid: a 1% percentage discount, and offer ending exactly when the campaign starts', async () => {
    const { userId, businessId, usageId } = await setup();
    mockExecute.mockResolvedValue(passResult);
    const start = new Date().toISOString();
    await run(
      request(
        businessId,
        userId,
        { type: 'percentage', price: 99, originalPrice: 100, validityEnd: start },
        { start, end: new Date(Date.now() + DAY).toISOString() }
      )
    );
    expect(await used(usageId)).toBe(COST);
  });

  it('a rejected request leaves the retry path clean: the corrected request succeeds and is charged once', async () => {
    const { userId, businessId, usageId } = await setup();
    mockExecute.mockResolvedValue(passResult);
    await expect(
      run(request(businessId, userId, { type: 'percentage', price: 299, originalPrice: 249 }))
    ).rejects.toBeDefined();
    expect(await used(usageId)).toBe(0);
    await run(request(businessId, userId, { type: 'percentage', price: 160, originalPrice: 200 }));
    expect(await used(usageId)).toBe(COST);
  });
});
