/**
 * P0-1 (docs/P0_HARDENING_TRACKER.md) — Truth Check must gate persistence,
 * not just the campaign status label. Before this fix, generateCampaignStrategy
 * always called createCampaignAssets with every asset's imageUrl regardless of
 * the Truth Check verdict computed moments later, so a FAIL-verdict campaign's
 * assets (including generated image URLs) were already sitting in Firestore
 * and Storage, fetchable by anyone with the (token-bearing, rules-bypassing)
 * Storage URL. These tests exercise the acceptance criteria directly:
 * FAIL -> assets never persisted, Storage objects deleted; PASS -> assets
 * persisted normally, nothing deleted.
 */
import { v4 as uuid } from 'uuid';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

const mockDeleteGeneratedAssets = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/ai/generatedAssetStorage', () => ({
  deleteGeneratedAssets: (...args: unknown[]) => mockDeleteGeneratedAssets(...args),
}));

import * as admin from 'firebase-admin';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { createBusinessDoc, getCampaignDoc } from '../../services/firestore';
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

describeIfEmulator('generateCampaignStrategy — Truth Check gates persistence (P0-1)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUsage(userId: string, businessId: string) {
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
    return usageId;
  }

  beforeEach(() => jest.clearAllMocks());

  it('TC-TRUTH-001/002/003 shape: FAIL verdict -> no CampaignAsset docs are created and the generated Storage objects are deleted', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await seedUsage(userId, businessId);

    const fakeStoragePaths = [
      `businesses/${businessId}/campaigns/fake/generated/poster_1.svg`,
      `businesses/${businessId}/campaigns/fake/generated/story_1.svg`,
    ];

    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [
          {
            assetId: 'asset_poster_0',
            type: 'poster',
            index: 0,
            content: {},
            imageUrl:
              'https://firebasestorage.googleapis.com/v0/b/fake/o/poster?alt=media&token=leaked',
            storagePath: fakeStoragePaths[0],
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
        truthCheck: {
          status: 'FAIL',
          summary: 'Fabricated price detected: business lists ₹299, generated copy says ₹199',
          checkedAt: new Date().toISOString(),
          checks: [],
        },
      },
      allGeneratedStoragePaths: fakeStoragePaths,
    });

    const request = callableRequest(makeRequestData(businessId, uuid()), userId);
    const result = await (generateCampaignStrategy as any).run(request);

    // Campaign is rejected/failed, not just labeled — verify the actual
    // Firestore state, not the function's return value.
    const campaign = await getCampaignDoc(result.campaignId);
    expect(campaign!.status).toBe('failed');

    // DISCARD: no CampaignAsset doc exists for this campaign at all — a
    // client can never obtain the asset's imageUrl via Firestore, whether
    // the download button is hidden or not (TC-TRUTH-005).
    const assetsSnap = await db
      .collection('campaign_assets')
      .where('campaignId', '==', result.campaignId)
      .get();
    expect(assetsSnap.empty).toBe(true);

    // The Storage objects the pipeline already uploaded before the verdict
    // was known must be deleted — this is the actual revocation, since the
    // token-bearing download URL bypasses storage.rules entirely.
    expect(mockDeleteGeneratedAssets).toHaveBeenCalledTimes(1);
    expect(mockDeleteGeneratedAssets).toHaveBeenCalledWith(fakeStoragePaths);
  });

  it('TC-TRUTH-004: PASS verdict -> assets are persisted normally and nothing is deleted', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await seedUsage(userId, businessId);

    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [
          {
            assetId: 'asset_poster_0',
            type: 'poster',
            index: 0,
            content: {},
            imageUrl:
              'https://firebasestorage.googleapis.com/v0/b/fake/o/poster?alt=media&token=ok',
            storagePath: `businesses/${businessId}/campaigns/fake/generated/poster_1.svg`,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
        truthCheck: {
          status: 'PASS',
          summary: 'All claims verified against Business Brain',
          checkedAt: new Date().toISOString(),
          checks: [],
        },
      },
      allGeneratedStoragePaths: [`businesses/${businessId}/campaigns/fake/generated/poster_1.svg`],
    });

    const request = callableRequest(makeRequestData(businessId, uuid()), userId);
    const result = await (generateCampaignStrategy as any).run(request);

    const campaign = await getCampaignDoc(result.campaignId);
    expect(campaign!.status).toBe('verified');

    const assetsSnap = await db
      .collection('campaign_assets')
      .where('campaignId', '==', result.campaignId)
      .get();
    expect(assetsSnap.size).toBe(1);
    expect(assetsSnap.docs[0]!.data()['imageUrl']).toContain('token=ok');

    expect(mockDeleteGeneratedAssets).not.toHaveBeenCalled();
  });
});
