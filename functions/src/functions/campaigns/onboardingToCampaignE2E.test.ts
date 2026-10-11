/**
 * Phase 16 Onboarding -> Business Brain -> Campaign E2E Audit.
 *
 * Every individual link in this chain already has its own dedicated test
 * file (createBusiness.test.ts, generateCampaignStrategy.consistency.test.ts,
 * getCampaign.test.ts, the Firestore rules suite, usageControl tests) — this
 * file's job is different: prove the full real user journey holds together
 * end to end, through the REAL public callables (not just Firestore doc
 * helpers), against the real Firestore emulator. Only the AI pipeline itself
 * is mocked — no real Gemini call is made and no credits are spent on a real
 * provider (per this phase's explicit "Real AI testing belongs to a later
 * phase" instruction).
 *
 * Flow: new user -> createBusiness (onboarding submit) -> Business Brain
 * persisted -> generateCampaignStrategy (mocked AI) -> campaign persisted ->
 * getCampaign / listCampaigns (retrieval) -> a second user cannot read the
 * first user's campaign or reuse their Business Brain.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const trackEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/analyticsService', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  trackCreativeEvent: jest.fn().mockResolvedValue(undefined),
  trackCampaignApproved: jest.fn().mockResolvedValue(undefined),
  ANALYTICS_EVENTS: {
    ONBOARDING_COMPLETE: 'onboarding_complete',
    CAMPAIGN_STARTED: 'campaign_started',
    CAMPAIGN_GENERATED: 'campaign_generated',
  },
}));

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createBusiness } from '../business/createBusiness';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { getCampaign } from './getCampaign';
import { listCampaigns } from './listCampaigns';
import { getGenerationCost } from '../../services/usageControl';

const CAMPAIGN_COST = getGenerationCost('campaign_generation');

// createBusiness requires a verified email for password users (middleware/emailVerification.ts).
const VERIFIED_TOKEN = { email_verified: true, firebase: { sign_in_provider: 'password' } };

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: VERIFIED_TOKEN as any } } as any;
}

describeIfEmulator('Onboarding -> Business Brain -> Campaign E2E (Phase 16, mocked AI)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => jest.clearAllMocks());

  async function seedAuthUserAndCredits(userId: string) {
    await admin.auth().createUser({ uid: userId, email: `${userId}@test.example` });
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });
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
        planId: 'business', // 1200 monthly credits — comfortably covers one campaign generation
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: new Date().toISOString(),
      });
  }

  const onboardingInput = {
    name: 'Kondapur Biryani House',
    category: 'restaurant' as const,
    description: 'Best biryani in town',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    language: 'en' as const,
    regionalStyle: 'hyderabadi' as const,
    contentStyle: 'funny' as const,
  };

  function campaignRequestData(businessId: string, idempotencyKey: string) {
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

  it('GOLDEN E2E: full onboarding -> Business Brain -> campaign -> retrieval journey persists and reads back correctly', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUserAndCredits(userId);

    // 1. Onboarding submit.
    const businessResult = await (createBusiness as any).run(
      callableRequest(onboardingInput, userId)
    );
    const businessId = businessResult.businessId;
    expect(businessId).toBeDefined();

    // 2. Business Brain persisted with the submitted identity/brand/
    // localization facts, associated with the correct user.
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data()!;
    expect(business['userId']).toBe(userId);
    expect(business['businessBrain'].identity.name).toBe(onboardingInput.name);
    expect(business['businessBrain'].localization.regionalStyle).toBe('hyderabadi');

    // 3. Campaign generation — AI pipeline mocked, no real Gemini call.
    mockExecute.mockResolvedValue({
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
        truthCheck: {
          status: 'PASS',
          summary: 'All facts verified',
          checkedAt: new Date().toISOString(),
          checks: [],
        },
      },
    });

    const idempotencyKey = uuid();
    const campaignResult = await (generateCampaignStrategy as any).run(
      callableRequest(campaignRequestData(businessId, idempotencyKey), userId)
    );
    const campaignId = campaignResult.campaignId;
    expect(campaignId).toBeDefined();

    // The pipeline received THIS business's real Business Brain context —
    // proving Business Brain data actually reached campaign generation, not
    // an empty/default object.
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const pipelineInput = mockExecute.mock.calls[0]![0];
    expect(pipelineInput.businessId).toBe(businessId);
    expect(pipelineInput.businessBrain.identity.name).toBe(onboardingInput.name);

    // 4. Campaign persisted with correct ownership, status, and credit
    // accounting.
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
    const campaign = campaignDoc.data()!;
    expect(campaign['userId']).toBe(userId);
    expect(campaign['businessId']).toBe(businessId);
    expect(campaign['status']).toBe('verified'); // Truth Check PASS
    expect(campaign['creditsUsed']).toBe(CAMPAIGN_COST);

    const usageId = `${userId}_${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}`;
    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST);

    // 5. Retrieval — the same owner can read it back via the real callables.
    const getResult = await (getCampaign as any).run(
      callableRequest({ campaignId, businessId }, userId)
    );
    expect(getResult.campaign.campaignId).toBe(campaignId);

    const listResult = await (listCampaigns as any).run(callableRequest({ businessId }, userId));
    expect(
      listResult.campaigns.some((c: { campaignId: string }) => c.campaignId === campaignId)
    ).toBe(true);
  });

  it("SECURITY: a second user cannot read the first user's campaign, business, or Business Brain", async () => {
    const userA = `user-${uuid()}`;
    const userB = `user-${uuid()}`;
    await seedAuthUserAndCredits(userA);
    await seedAuthUserAndCredits(userB);

    const businessResult = await (createBusiness as any).run(
      callableRequest(onboardingInput, userA)
    );
    const businessId = businessResult.businessId;

    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [
          {
            assetId: `asset-${uuid()}`,
            type: 'poster',
            index: 0,
            content: {},
            imageUrl: 'https://storage.googleapis.com/fake/poster.png',
            storagePath: 'x',
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
        truthCheck: {
          status: 'PASS',
          summary: 'ok',
          checkedAt: new Date().toISOString(),
          checks: [],
        },
      },
    });
    const campaignResult = await (generateCampaignStrategy as any).run(
      callableRequest(campaignRequestData(businessId, uuid()), userA)
    );
    const campaignId = campaignResult.campaignId;

    // User B cannot fetch User A's campaign (fails verifyBusinessAccess:
    // User B has no access to User A's business).
    await expect(
      (getCampaign as any).run(callableRequest({ campaignId, businessId }, userB))
    ).rejects.toThrow();

    // User B cannot list User A's business's campaigns either.
    await expect(
      (listCampaigns as any).run(callableRequest({ businessId }, userB))
    ).rejects.toThrow();

    // User B cannot generate a campaign against User A's business (and thus
    // never reaches, let alone reads, User A's Business Brain).
    await expect(
      (generateCampaignStrategy as any).run(
        callableRequest(campaignRequestData(businessId, uuid()), userB)
      )
    ).rejects.toThrow();
    expect(mockExecute).toHaveBeenCalledTimes(1); // only User A's real generation ran
  });
});
