/**
 * Phase 8 Credits & Usage Enforcement Audit — analyzeReferenceStyle.ts made
 * a real (billable) Vision-AI provider call with no credit cost, no
 * idempotency key, and no rate limit at all: any authenticated user with
 * access to a business's own storage path could call it directly
 * (bypassing the UI, which never even wires it up) for unlimited free AI
 * usage. See analyzeReferenceStyle.ts for the fix (style_analysis credit
 * cost via executeWithUsageControl, same pattern as every other AI
 * operation).
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { analyzeReferenceStyle } from './analyzeReferenceStyle';
import { createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

jest.mock('../../services/ai/factory/aiProviderFactory', () => ({
  getVisionAI: () => ({
    analyzeReferenceStyle: jest.fn().mockResolvedValue({ tone: 'premium', colors: ['#000000'] }),
  }),
}));

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

async function seedUsage(userId: string, planId: 'free' | 'business', creditsUsed = 0) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
  await admin
    .firestore()
    .collection('usage')
    .doc(usageId)
    .set({
      usageId,
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      planId,
      campaignsCreated: 0,
      creditsUsed,
      imagesGenerated: 0,
      copyGenerations: 0,
      regenerations: 0,
      failedGenerations: 0,
      updatedAt: new Date().toISOString(),
    });
  return usageId;
}

describeIfEmulator('analyzeReferenceStyle — credit enforcement (Phase 8)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('CRITICAL: a call with zero credits available is rejected before the AI provider is ever invoked', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await seedUsage(ownerId, 'free', 100); // free plan, fully used

    const storagePath = `businesses/${businessId}/products/ref.jpg`;
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(Buffer.from('fake-image-bytes'), { metadata: { contentType: 'image/jpeg' } });

    await expect(
      (analyzeReferenceStyle as any).run(
        callableRequest({ businessId, storagePath, idempotencyKey: uuid() }, ownerId)
      )
    ).rejects.toThrow(/insufficient credits/i);
  });

  it('a call with sufficient credits succeeds and deducts the style_analysis cost exactly once', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    const usageId = await seedUsage(ownerId, 'business', 0);

    const storagePath = `businesses/${businessId}/products/ref2.jpg`;
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(Buffer.from('fake-image-bytes'), { metadata: { contentType: 'image/jpeg' } });

    const result = await (analyzeReferenceStyle as any).run(
      callableRequest({ businessId, storagePath, idempotencyKey: uuid() }, ownerId)
    );
    expect(result.tone).toBe('premium');

    const usageSnap = await admin.firestore().collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(15); // PRICING.styleAnalysisCredits
  });

  it('a duplicate call with the same idempotencyKey does not deduct credits twice', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    const usageId = await seedUsage(ownerId, 'business', 0);
    const idempotencyKey = uuid();

    const storagePath = `businesses/${businessId}/products/ref3.jpg`;
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(Buffer.from('fake-image-bytes'), { metadata: { contentType: 'image/jpeg' } });

    await (analyzeReferenceStyle as any).run(
      callableRequest({ businessId, storagePath, idempotencyKey }, ownerId)
    );

    // Retry with the exact same idempotencyKey (client timeout-and-retry).
    await expect(
      (analyzeReferenceStyle as any).run(
        callableRequest({ businessId, storagePath, idempotencyKey }, ownerId)
      )
    ).rejects.toThrow();

    const usageSnap = await admin.firestore().collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(15); // charged exactly once, not 30
  });
});
