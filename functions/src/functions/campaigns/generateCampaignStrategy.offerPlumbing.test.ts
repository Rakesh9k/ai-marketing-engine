/**
 * The owner enters an original price in the wizard and it is stored on the campaign, but it was never
 * handed to the pipeline, so for a real campaign the generator and Truth Check could not know there was a
 * discount at all (regenerateAsset did pass it, so regenerating behaved differently from generating).
 * Every fact the owner enters that the contract depends on must reach the pipeline.
 */
import { v4 as uuid } from 'uuid';

const describeIfEmulator = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));
jest.mock('../../services/ai/generatedAssetStorage', () => ({
  deleteGeneratedAssets: jest.fn().mockResolvedValue(undefined),
}));

import * as admin from 'firebase-admin';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

const callableRequest = (data: unknown, uid: string) =>
  ({ data, auth: { uid, token: {} } }) as never;

const business = (businessId: string, userId: string): Business =>
  ({
    businessId,
    userId,
    name: 'The Higher Taste',
    category: 'restaurant',
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {},
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as unknown as Business;

describeIfEmulator("generateCampaignStrategy hands the owner's offer facts to the pipeline", () => {
  const db = admin.firestore();
  afterAll(async () => {
    await admin.app().delete();
  });

  async function seed(userId: string, businessId: string) {
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
        planId: 'business',
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
  }

  const data = (businessId: string, offer: Record<string, unknown>) => ({
    businessId,
    objective: 'weekend_offer',
    offer: {
      headline: 'Weekend Special',
      type: 'percentage',
      validityStart: '2026-10-10T00:00:00.000Z',
      validityEnd: '2026-10-15T00:00:00.000Z',
      ...offer,
    },
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
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
    idempotencyKey: uuid(),
  });

  it('passes offer.originalPrice through as offerOriginalPrice (and omits it when the owner gave none)', async () => {
    for (const [offer, expected] of [
      [{ price: 160, originalPrice: 200 }, 200],
      [{ price: 160 }, undefined],
    ] as const) {
      const userId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      await createBusinessDoc(business(businessId, userId));
      await seed(userId, businessId);
      mockExecute.mockReset();
      mockExecute.mockRejectedValue(new Error('stop after capturing the input'));

      await (generateCampaignStrategy as never as { run: (r: unknown) => Promise<unknown> })
        .run(callableRequest(data(businessId, offer), userId))
        .catch(() => undefined);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const pipelineInput = mockExecute.mock.calls[0]![0] as Record<string, unknown>;
      expect(pipelineInput['offerPrice']).toBe(160);
      expect(pipelineInput['offerOriginalPrice']).toBe(expected);
    }
  });
});
