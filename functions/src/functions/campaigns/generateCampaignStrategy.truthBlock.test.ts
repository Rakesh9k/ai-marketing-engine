/**
 * Pass 2C P1-A, end to end: the REAL callable and the REAL pipeline + Truth Check (only the model, image
 * provider and storage are stubbed). A campaign whose copy makes an unsupported material claim must be
 * blocked — named in the error, never stored as deliverable, never charged — while honest copy is
 * delivered and charged the flat price.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const gst = jest.fn();
jest.mock('../../services/ai/index', () => ({
  generateStructuredText: (...a: unknown[]) => gst(...a),
  analyzeProductImages: jest.fn(),
  generateImage: jest.fn().mockResolvedValue({
    success: true,
    imageUrl: 'https://provider.example.com/h.png',
    provider: 'openai',
    model: 'dall-e-3',
  }),
}));
jest.mock('../../services/ai/generatedAssetStorage', () => ({
  fetchAsBuffer: jest
    .fn()
    .mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest.fn().mockResolvedValue({
    url: 'https://storage.example.com/x.png',
    storagePath: 'businesses/b/campaigns/c/generated/x.png',
  }),
  deleteGeneratedAssets: jest.fn().mockResolvedValue(undefined),
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { createBusinessDoc } from '../../services/firestore';
import { getGenerationCost } from '../../services/usageControl';
import { CopyPackSchema } from '../../services/ai/pipeline';
import type { Business } from '../../types';

const COST = getGenerationCost('campaign_generation');

const copyPack = (body: string) => {
  const h = 'Chicken Dum Biryani ₹299 at Test Restaurant';
  return {
    headlines: [0, 1, 2, 3, 4].map((i) => ({
      text: h,
      characterCount: h.length,
      variant: `v${i}`,
    })),
    adCopies: [0, 1, 2, 3, 4].map(() => ({
      primaryText: body,
      headline: h,
      description: body,
      cta: 'Order',
    })),
    captions: [0, 1, 2, 3, 4].map(() => ({
      text: body,
      hashtags: ['#local'],
      characterCount: body.length,
    })),
    storyConcepts: [0, 1, 2].map(() => ({
      frames: [
        { copy: h, visualCue: 'close-up' },
        { copy: body, visualCue: 'logo' },
      ],
      overallTheme: 'offer',
    })),
    reelConcepts: [0, 1, 2].map(() => ({
      hook: h,
      scenes: [{ description: body, visualDirection: 'close', duration: '3s' }],
      productReveal: h,
      cta: 'Order',
      caption: body,
      shootingTips: 'natural light',
    })),
    whatsappMessage: {
      message: body,
      waLink: '',
      attributionParams: { campaignId: 'c', creativeId: 'x', source: 'poster' },
    },
    ctaVariations: [0, 1, 2, 3, 4].map((i) => ({ text: 'Order', variant: `c${i}` })),
  };
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

const request = (businessId: string, uid: string, offer: Record<string, unknown> = {}) =>
  ({
    data: {
      businessId,
      objective: 'weekend_offer',
      offer: { headline: 'Weekend Special', price: 299, type: 'fixed', ...offer },
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
        campaignStyle: 'urgent',
        contentFormat: 'poster',
      },
      idempotencyKey: uuid(),
    },
    auth: { uid, token: {} as never },
  }) as never;

describeIfEmulator('Truth Check blocks unsupported material claims end to end', () => {
  const db = admin.firestore();
  afterAll(async () => {
    await admin.app().delete();
  });

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
  const withCopy = (body: string) =>
    gst.mockImplementation(async (_p: string, schema: unknown) =>
      schema === CopyPackSchema ? copyPack(body) : {}
    );
  const used = async (usageId: string) =>
    (await db.collection('usage').doc(usageId).get()).data()!['creditsUsed'];

  it('an invented 50% discount is blocked, named in the error, not delivered and not charged', async () => {
    const { userId, businessId, usageId } = await setup();
    withCopy('Chicken Dum Biryani ₹299 at Test Restaurant, Kondapur. 50% off today!');
    await expect(
      (generateCampaignStrategy as any).run(request(businessId, userId))
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: expect.stringMatching(/50%/),
    });
    expect(await used(usageId)).toBe(0);
    const campaigns = await db.collection('campaigns').where('businessId', '==', businessId).get();
    expect(campaigns.size).toBe(1);
    const c = campaigns.docs[0]!.data();
    expect(c['status']).toBe('failed');
    expect(c['error'].code).toBe('TRUTH_CHECK_FAILED');
    expect(c['error'].message).toMatch(/50%/);
    const assets = await db
      .collection('campaign_assets')
      .where('campaignId', '==', campaigns.docs[0]!.id)
      .get();
    expect(assets.size).toBe(0); // nothing deliverable was stored
  });

  it('honest copy is delivered and charged the flat price', async () => {
    const { userId, businessId, usageId } = await setup();
    withCopy('Chicken Dum Biryani ₹299 at Test Restaurant, Kondapur. Order on WhatsApp.');
    const result = await (generateCampaignStrategy as any).run(request(businessId, userId));
    expect(result.campaignId).toBeDefined();
    expect(await used(usageId)).toBe(COST);
  });

  it('an owner-stated percentage in the headline is allowed through (not invented)', async () => {
    const { userId, businessId, usageId } = await setup();
    withCopy('Chicken Dum Biryani ₹299 at Test Restaurant, Kondapur. Flat 20% off this weekend.');
    await (generateCampaignStrategy as any).run(
      request(businessId, userId, { headline: 'Flat 20% off this weekend' })
    );
    expect(await used(usageId)).toBe(COST);
  });
});
