/**
 * The first real integration test of the conversational-onboarding architecture, end to end on the
 * server, against the real Firestore + Auth emulators. Only the AI provider is mocked (no Gemini
 * call is made, no credits are spent on a real provider).
 *
 *   signed-in owner → draft → adaptive conversation → free AI discovery → Business Brain review
 *   → owner confirms → normalise + validate → business created → campaign generated for it
 *
 * The browser half of the journey (Anonymous → Auth, and the screens themselves) is covered by the
 * component tests; this proves the data actually flows through to a campaign.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

const mockGenerateStructuredText = jest.fn();
jest.mock('../../services/ai', () => ({
  ...jest.requireActual('../../services/ai'),
  generateStructuredText: (...a: unknown[]) => mockGenerateStructuredText(...a),
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { saveOnboardingDraft } from '../onboarding/saveOnboardingDraft';
import { discoverOnboardingFacts } from '../onboarding/discoverOnboardingFacts';
import { confirmOnboardingBusiness } from '../onboarding/confirmOnboardingBusiness';
import { generateCampaignStrategy } from './generateCampaignStrategy';
import { getCampaign } from './getCampaign';

// A Google sign-in: the token carries the account name and counts as verified.
const GOOGLE_TOKEN = {
  name: 'Asha Rao',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
};

const call = (
  fn: unknown,
  data: unknown,
  uid: string,
  token: Record<string, unknown> = GOOGLE_TOKEN
) => (fn as any).run({ data, auth: { uid, token } });

describeIfEmulator('Conversational onboarding → Business Brain → campaign (E2E, mocked AI)', () => {
  const db = admin.firestore();
  afterAll(async () => {
    await admin.app().delete();
  });
  beforeEach(() => jest.clearAllMocks());

  async function newOwner() {
    const uid = `user-${uuid()}`;
    await admin.auth().createUser({ uid, email: `${uid}@test.example` });
    const subscriptionId = `sub-${uid}`;
    await db
      .collection('subscriptions')
      .doc(subscriptionId)
      .set({ subscriptionId, userId: uid, planId: 'business', status: 'active' });
    await db
      .collection('users')
      .doc(uid)
      .set({ userId: uid, businessIds: [], role: 'user', subscriptionId });
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    await db
      .collection('usage')
      .doc(`${uid}_${periodStart.toISOString().split('T')[0]}`)
      .set({
        usageId: `${uid}_${periodStart.toISOString().split('T')[0]}`,
        userId: uid,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        planId: 'business', // enough credits for one generation; the credit amount is not under test
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: new Date().toISOString(),
      });
    return uid;
  }

  const campaignRequest = (businessId: string, over: Record<string, unknown> = {}) => ({
    businessId,
    objective: 'product_promotion',
    offer: {
      headline: 'New morning batch',
      price: 999,
      type: 'percentage',
      validityStart: new Date().toISOString(),
      validityEnd: new Date(Date.now() + 86400000).toISOString(),
    },
    duration: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 86400000).toISOString(),
    },
    audience: { localities: ['Hyderabad'] },
    cta: 'order_whatsapp',
    localization: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      // The campaign wizard falls back to the city when a business has no locality (as one onboarded
      // conversationally has not been asked for one), so the request always carries one.
      locality: 'Hyderabad',
      primaryLanguage: 'en',
      secondaryLanguage: 'en',
      languageMixing: 'minimal',
      regionalStyle: 'neutral',
      slangPreference: 'light',
      audienceDescription: 'Working professionals',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    idempotencyKey: uuid(),
    ...over,
  });

  const passingPack = () => ({
    campaignPack: {
      assets: [
        {
          assetId: `asset-${uuid()}`,
          type: 'poster',
          index: 0,
          content: { headline: 'New morning batch' },
          imageUrl: 'https://storage.googleapis.com/fake/poster.png',
          storagePath: 'businesses/fake/campaigns/fake/generated/poster_1.png',
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

  it('GOLDEN: a yoga studio is understood, reviewed, confirmed, created as `general`, and gets a campaign', async () => {
    const uid = await newOwner();
    mockGenerateStructuredText.mockResolvedValue({
      offerings: ['Group classes', 'Diet plans', 'Best yoga in town'], // the claim must be filtered out
      audiences: ['Working professionals', 'Beginners'],
    });

    // ── Adaptive conversation, saved question by question ───────────────────
    const hello = await call(saveOnboardingDraft, { welcomed: true }, uid);
    // Mitra read the first name from the Google account — a detection, not yet a fact.
    expect(hello.draft.facts['owner__name']).toMatchObject({
      value: 'Asha',
      source: 'AI_DETECTED',
      confirmed: false,
    });

    await call(
      saveOnboardingDraft,
      {
        updates: [
          { path: 'owner.name', value: 'Asha' },
          { path: 'owner.role', value: 'founder' },
        ],
      },
      uid
    );
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'identity.industry', value: 'fitness' }] },
      uid
    );
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'identity.subcategory', value: 'yoga' }] },
      uid
    );
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'identity.name', value: 'Prana Yoga Studio' }] },
      uid
    );
    await call(
      saveOnboardingDraft,
      {
        updates: [
          { path: 'identity.city', value: 'Hyderabad' },
          { path: 'identity.state', value: 'Telangana' },
        ],
      },
      uid
    );
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'contact.whatsapp', value: '98765 43210' }] },
      uid
    );

    // ── Free AI discovery: guesses only, no credits ─────────────────────────
    const discovery = await call(discoverOnboardingFacts, {}, uid);
    expect(discovery.status).toBe('completed');
    expect(discovery.suggestions['offering.signature']).toEqual(['Group classes', 'Diet plans']);
    const usageBefore = await db.collection('usage').where('userId', '==', uid).get();
    expect(usageBefore.docs[0]!.data()['creditsUsed']).toBe(0);

    // The owner keeps ONE guess for offerings, writes their own audience, and ignores the rest.
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'offering.signature', value: ['Group classes'] }] },
      uid
    );
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'audience.primary', value: ['Working professionals'] }] },
      uid
    );
    await call(
      saveOnboardingDraft,
      {
        updates: [
          {
            path: 'positioning.usp',
            value: 'Small batches, so every class gets personal attention',
          },
        ],
      },
      uid
    );

    // ── Review, then confirm exactly that version ───────────────────────────
    const reviewed = await call(saveOnboardingDraft, { reviewShown: true }, uid);
    expect(reviewed.draft.status).toBe('ready_for_review');
    const confirmed = await call(
      confirmOnboardingBusiness,
      { reviewedRevision: reviewed.draft.revision },
      uid
    );
    expect(confirmed.created).toBe(true);
    const businessId = confirmed.businessId;

    // ── The business is what the owner confirmed, as a first-class `general` vertical ──
    const business = (await db.collection('businesses').doc(businessId).get()).data()!;
    expect(business).toMatchObject({
      userId: uid,
      name: 'Prana Yoga Studio',
      category: 'general',
      contact: { phone: '+919876543210', whatsapp: '+919876543210' },
    });
    const brain = business['businessBrain'];
    expect(brain.identity).toMatchObject({ industry: 'fitness', subcategory: 'yoga' });
    expect(brain.offerings).toEqual({ signature: ['Group classes'] });
    expect(brain.knowledge.facts['contact.phone'].source).toBe('DERIVED_FROM_WHATSAPP');
    expect(JSON.stringify(business)).not.toContain('Beginners'); // an ignored guess never became truth
    expect(JSON.stringify(business)).not.toContain('Diet plans');

    // ── Generation: the general vertical runs and receives the whole understanding ──
    mockExecute.mockResolvedValue(passingPack());
    const result = await call(generateCampaignStrategy, campaignRequest(businessId), uid);
    expect(result.campaignId).toBeDefined();

    const pipelineInput = mockExecute.mock.calls[0]![0];
    expect(pipelineInput.vertical).toBe('general');
    expect(pipelineInput.businessBrain.identity.industry).toBe('fitness');
    expect(pipelineInput.businessBrain.offerings.signature).toEqual(['Group classes']);
    expect(pipelineInput.businessBrain.audience.targetCustomer).toBe('Working professionals');
    expect(pipelineInput.businessBrain.positioning.usp).toMatch(/Small batches/);

    const campaign = (await db.collection('campaigns').doc(result.campaignId).get()).data()!;
    expect(campaign['businessId']).toBe(businessId);
    expect(campaign['status']).toBe('verified');

    // ── And the owner can read it back ──────────────────────────────────────
    const fetched = await call(getCampaign, { campaignId: result.campaignId, businessId }, uid);
    expect(fetched.campaign.campaignId).toBe(result.campaignId);

    // The conversation left nothing personal behind.
    const draft = (await db.collection('onboarding_drafts').doc(uid).get()).data()!;
    expect(draft['status']).toBe('completed');
    expect(draft['facts']).toEqual({});
  });

  it("the general vertical keeps its own rules: other verticals' objectives and CTAs are refused", async () => {
    const uid = await newOwner();
    await call(
      saveOnboardingDraft,
      {
        welcomed: true,
        updates: [
          { path: 'owner.name', value: 'Ravi' },
          { path: 'identity.industry', value: 'retail' },
          { path: 'identity.subcategory', value: 'fashion' },
          { path: 'identity.name', value: 'Threads' },
          { path: 'identity.city', value: 'Pune' },
          { path: 'identity.state', value: 'Maharashtra' },
          { path: 'contact.whatsapp', value: '9876543210' },
        ],
      },
      uid
    );
    const { draft } = await call(saveOnboardingDraft, { reviewShown: true }, uid);
    const { businessId } = await call(
      confirmOnboardingBusiness,
      { reviewedRevision: draft.revision },
      uid
    );
    mockExecute.mockResolvedValue(passingPack());

    // A restaurant-only objective, a restaurant-only CTA and a property objective: all refused.
    await expect(
      call(generateCampaignStrategy, campaignRequest(businessId, { objective: 'new_dish' }), uid)
    ).rejects.toThrow(/Objective not valid for this business's vertical \(general\)/);
    await expect(
      call(generateCampaignStrategy, campaignRequest(businessId, { cta: 'book_table' }), uid)
    ).rejects.toThrow(/CTA not valid for this business's vertical \(general\)/);
    await expect(
      call(generateCampaignStrategy, campaignRequest(businessId, { objective: 'open_house' }), uid)
    ).rejects.toThrow(/Objective not valid for this business's vertical \(general\)/);
    expect(mockExecute).not.toHaveBeenCalled();

    // …while its own objectives work.
    for (const objective of ['product_promotion', 'new_product', 'discount', 'brand_awareness']) {
      await call(generateCampaignStrategy, campaignRequest(businessId, { objective }), uid);
    }
    expect(mockExecute).toHaveBeenCalledTimes(4);
  });

  it('SECURITY: nobody else can generate for, or read, the confirmed business', async () => {
    const owner = await newOwner();
    const intruder = await newOwner();
    await call(
      saveOnboardingDraft,
      {
        welcomed: true,
        updates: [
          { path: 'owner.name', value: 'Ravi' },
          { path: 'identity.industry', value: 'education' },
          { path: 'identity.subcategory', value: 'coaching' },
          { path: 'identity.name', value: 'Bright Minds' },
          { path: 'identity.city', value: 'Pune' },
          { path: 'identity.state', value: 'Maharashtra' },
          { path: 'contact.whatsapp', value: '9876543210' },
        ],
      },
      owner
    );
    const { draft } = await call(saveOnboardingDraft, { reviewShown: true }, owner);
    const { businessId } = await call(
      confirmOnboardingBusiness,
      { reviewedRevision: draft.revision },
      owner
    );

    mockExecute.mockResolvedValue(passingPack());
    await expect(
      call(generateCampaignStrategy, campaignRequest(businessId), intruder)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
