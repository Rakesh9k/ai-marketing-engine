/**
 * Phase 13 — data consistency tests for generateCampaignStrategy: proves
 * the backend validates the full Campaign → Product → Business hierarchy
 * server-side rather than trusting a client-supplied ID combination, and
 * that Business Brain context passed into the AI pipeline is always
 * scoped to the same, single authorized business.
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
import { createBusinessDoc, createProductDoc } from '../../services/firestore';
import type { Business, Product } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(businessId: string, userId: string, name: string): Business {
  return {
    businessId,
    userId,
    name,
    category: 'restaurant',
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: { audience: { targetCustomer: `${name}'s customers` } } as unknown as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Business;
}

function makeProduct(productId: string, businessId: string): Product {
  return {
    productId,
    businessId,
    name: 'Test Product',
    price: 199,
    currency: 'INR',
    category: 'main',
    tags: [],
    variants: [],
    images: [],
    attributes: {} as Product['attributes'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Product;
}

function makeRequestData(businessId: string, productId: string | undefined, idempotencyKey: string) {
  return {
    businessId,
    productId,
    objective: 'weekend_offer',
    offer: {
      headline: 'Weekend Special',
      price: 199,
      type: 'percentage',
      validityStart: new Date().toISOString(),
      validityEnd: new Date(Date.now() + 86400000).toISOString(),
    },
    duration: { start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString() },
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

describeIfEmulator('generateCampaignStrategy — cross-entity consistency (Firestore emulator, Phase 13)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUsage(userId: string, businessId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await admin.firestore().collection('usage').doc(usageId).set({
      usageId,
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      planId: 'business',
      campaignsCreated: 0,
      creditsUsed: 0,
      imagesGenerated: 0,
      copyGenerations: 0,
      regenerations: 0,
      failedGenerations: 0,
      updatedAt: new Date().toISOString(),
    });
    await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .set({ userId, businessIds: [businessId], role: 'user' });
  }

  beforeEach(() => jest.clearAllMocks());

  it('GOLDEN TEST 2/13: Business A cannot generate a campaign using Business B\'s product, even though both IDs are individually valid', async () => {
    const userId = `user-${uuid()}`;
    const businessAId = `biz-A-${uuid()}`;
    const businessBId = `biz-B-${uuid()}`;
    const productBId = `prod-B-${uuid()}`;

    await createBusinessDoc(makeBusiness(businessAId, userId, 'Business A'));
    // Business B belongs to a different user entirely.
    await createBusinessDoc(makeBusiness(businessBId, `user-${uuid()}`, 'Business B'));
    await createProductDoc(makeProduct(productBId, businessBId));
    await seedUsage(userId, businessAId);

    const request = callableRequest(
      makeRequestData(businessAId, productBId, uuid()), // businessId=A, productId=B's product
      userId
    );

    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /does not belong to this business/i
    );

    // No campaign should have been created for this rejected request.
    const campaignsSnap = await admin
      .firestore()
      .collection('campaigns')
      .where('userId', '==', userId)
      .get();
    expect(campaignsSnap.size).toBe(0);

    // No credits should have been reserved either.
    const usageId = `${userId}_${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}`;
    const usageSnap = await admin.firestore().collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(0);
  });

  it('a business using its OWN product succeeds, and the pipeline receives only that business\'s Business Brain context', async () => {
    const userId = `user-${uuid()}`;
    const businessAId = `biz-A-${uuid()}`;
    const productAId = `prod-A-${uuid()}`;

    await createBusinessDoc(makeBusiness(businessAId, userId, 'Business A'));
    await createProductDoc(makeProduct(productAId, businessAId));
    await seedUsage(userId, businessAId);

    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [],
        truthCheck: { status: 'PASS', summary: 'ok', checkedAt: new Date().toISOString(), checks: [] },
      },
    });

    const request = callableRequest(makeRequestData(businessAId, productAId, uuid()), userId);
    await (generateCampaignStrategy as any).run(request);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const pipelineInput = mockExecute.mock.calls[0]![0];
    expect(pipelineInput.businessId).toBe(businessAId);
    expect(pipelineInput.businessBrain.audience.targetCustomer).toBe("Business A's customers");
  });
});
