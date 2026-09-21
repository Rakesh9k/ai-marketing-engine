/**
 * Phase 12 — error recovery tests for generateCampaignStrategy, run against
 * the real Firestore emulator. The AI pipeline itself is mocked (no real
 * provider calls in this environment) so these tests can deterministically
 * force a pipeline exception and a Truth Check failure, then inspect the
 * actual persisted state — not just "did a toast/error appear."
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

describeIfEmulator('generateCampaignStrategy — failure recovery (Firestore emulator, Phase 12)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUsage(userId: string, businessId: string, planId: 'free' | 'business' = 'business') {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await db.collection('usage').doc(usageId).set({
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
    await db
      .collection('users')
      .doc(userId)
      .set({ userId, businessIds: [businessId], role: 'user' });
    return usageId;
  }

  beforeEach(() => jest.clearAllMocks());

  it('CRITICAL: pipeline exception -> campaign reaches a terminal "failed" state (not stuck), error is populated, and reserved credits are refunded to their original balance', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    const usageId = await seedUsage(userId, businessId);

    mockExecute.mockRejectedValue(new Error('AI provider timed out'));

    const request = callableRequest(makeRequestData(businessId, uuid()), userId);
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow();

    // The campaign document must exist and be in a real terminal state —
    // before this phase's fix, it was left stuck at whatever intermediate
    // status ('analyzing' etc.) it last reached, which the frontend's
    // poll loop (GenerationProgress.tsx) would never recognize as done.
    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(0); // fully refunded, not stuck reserved

    // Find the campaign this request created (its ID isn't returned to us
    // since the call rejected) by querying for this user's campaigns.
    const campaignsSnap = await db.collection('campaigns').where('userId', '==', userId).get();
    expect(campaignsSnap.size).toBe(1);
    const campaign = campaignsSnap.docs[0]!.data();
    expect(campaign['status']).toBe('failed');
    expect(campaign['error']).toBeDefined();
    expect(campaign['error'].message).toMatch(/AI provider timed out/);
    expect(campaign['error'].retryable).toBe(true);
  });

  it('Truth Check FAIL: campaign reaches "failed" with error.code TRUTH_CHECK_FAILED, and credits are FINALIZED (charged), not refunded — consistent, documented, intentional behavior', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    const usageId = await seedUsage(userId, businessId);

    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [
          {
            assetId: 'asset_headline_0',
            type: 'headline',
            index: 0,
            content: { text: 'Test headline' },
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
        truthCheck: {
          status: 'FAIL',
          summary: 'Price mismatch detected',
          checkedAt: new Date().toISOString(),
          checks: [],
        },
      },
    });

    const request = callableRequest(makeRequestData(businessId, uuid()), userId);
    const result = await (generateCampaignStrategy as any).run(request);

    const campaign = await getCampaignDoc(result.campaignId);
    expect(campaign!.status).toBe('failed');
    expect(campaign!.error?.code).toBe('TRUTH_CHECK_FAILED');
    expect(campaign!.error?.message).toMatch(/Price mismatch/);

    const usageSnap = await db.collection('usage').doc(usageId).get();
    // Credits were finalized (charged), NOT refunded — the generation
    // attempt genuinely completed and consumed AI compute; only Truth
    // Check rejected the output. This mirrors regenerateAsset's existing
    // behavior (Phase 6/10) and must not silently change.
    expect(usageSnap.data()!['creditsUsed']).toBeGreaterThan(0);
  });

  it('a failed generation does not prevent a subsequent legitimate retry (fresh idempotencyKey) from succeeding', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await seedUsage(userId, businessId);

    mockExecute.mockRejectedValueOnce(new Error('transient provider error'));
    const failingRequest = callableRequest(makeRequestData(businessId, uuid()), userId);
    await expect((generateCampaignStrategy as any).run(failingRequest)).rejects.toThrow();

    mockExecute.mockResolvedValueOnce({
      campaignPack: {
        assets: [],
        truthCheck: { status: 'PASS', summary: 'All good', checkedAt: new Date().toISOString(), checks: [] },
      },
    });
    const retryRequest = callableRequest(makeRequestData(businessId, uuid()), userId);
    const result = await (generateCampaignStrategy as any).run(retryRequest);

    const campaign = await getCampaignDoc(result.campaignId);
    expect(campaign!.status).toBe('verified');
  });
});
