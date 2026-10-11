/**
 * confirmOnboardingBusiness against the real Firestore + Auth emulators. SKIPPED, never falsely
 * green, when the emulators are not running.
 *
 * This is the trust boundary of the conversational onboarding: the only way a draft becomes a
 * business, and only after the owner reviewed exactly that version.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { confirmOnboardingBusiness } from './confirmOnboardingBusiness';
import { saveOnboardingDraft } from './saveOnboardingDraft';

const VERIFIED = { email_verified: true, firebase: { sign_in_provider: 'password' } };
const UNVERIFIED = { email_verified: false, firebase: { sign_in_provider: 'password' } };

const call = (
  fn: unknown,
  data: unknown,
  uid: string | null,
  token: Record<string, unknown> = VERIFIED
) => (fn as any).run({ data, auth: uid ? { uid, token } : undefined });

const ANSWERS = [
  { path: 'owner.name', value: 'Asha' },
  { path: 'owner.role', value: 'founder' },
  { path: 'identity.industry', value: 'fitness' },
  { path: 'identity.subcategory', value: 'yoga' },
  { path: 'identity.name', value: 'Prana Yoga Studio' },
  { path: 'identity.city', value: 'Hyderabad' },
  { path: 'identity.state', value: 'Telangana' },
  { path: 'contact.whatsapp', value: '98765 43210' },
  { path: 'offering.signature', value: ['Group classes', 'Diet plans'] },
  { path: 'audience.primary', value: ['Working professionals'] },
  { path: 'positioning.usp', value: 'Small batches, so every class gets personal attention' },
];

describeIfEmulator('confirmOnboardingBusiness (emulator)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function newOwner() {
    const uid = `user-${uuid()}`;
    await admin.auth().createUser({ uid, email: `${uid}@test.example` });
    await db.collection('users').doc(uid).set({ userId: uid, businessIds: [], role: 'user' });
    return uid;
  }

  /** An owner whose draft is complete and whose review screen has been shown. */
  async function reviewedOwner(
    answers: Array<{ path: string; value: unknown }> = ANSWERS
  ): Promise<{ uid: string; revision: number }> {
    const uid = await newOwner();
    await call(saveOnboardingDraft, { welcomed: true, updates: answers }, uid);
    const { draft } = await call(saveOnboardingDraft, { reviewShown: true }, uid);
    expect(draft.status).toBe('ready_for_review');
    return { uid, revision: draft.revision };
  }

  const businessesOf = async (uid: string) =>
    (await db.collection('businesses').where('userId', '==', uid).get()).docs.map((d) => d.data());

  it('creates the business from the owner-confirmed draft, as a general-vertical Business Brain', async () => {
    const { uid, revision } = await reviewedOwner();

    const result = await call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid);

    expect(result.created).toBe(true);
    const business = (await db.collection('businesses').doc(result.businessId).get()).data()!;
    expect(business).toMatchObject({
      userId: uid,
      name: 'Prana Yoga Studio',
      category: 'general',
      status: 'active',
      location: { city: 'Hyderabad', state: 'Telangana' },
      contact: { phone: '+919876543210', whatsapp: '+919876543210' },
    });
    const brain = business['businessBrain'];
    expect(brain.identity).toMatchObject({ industry: 'fitness', subcategory: 'yoga' });
    expect(brain.owner).toEqual({ name: 'Asha', role: 'founder' });
    expect(brain.offerings).toEqual({ signature: ['Group classes', 'Diet plans'] });
    expect(brain.audience).toMatchObject({
      primary: ['Working professionals'],
      targetCustomer: 'Working professionals',
    });
    expect(brain.positioning.usp).toBe('Small batches, so every class gets personal attention');
  });

  it('records where each fact came from: the phone is DERIVED from WhatsApp, never "typed by the owner"', async () => {
    const { uid, revision } = await reviewedOwner();
    const { businessId } = await call(
      confirmOnboardingBusiness,
      { reviewedRevision: revision },
      uid
    );
    const brain = (await db.collection('businesses').doc(businessId).get()).data()![
      'businessBrain'
    ];

    expect(brain.knowledge.origin).toBe('conversational_onboarding');
    expect(brain.knowledge.facts['contact.phone']).toEqual({ source: 'DERIVED_FROM_WHATSAPP' });
    expect(brain.knowledge.facts['contact.whatsapp']).toEqual({ source: 'USER_CONFIRMED' });
    expect(brain.knowledge.facts['identity.industry']).toEqual({ source: 'USER_CONFIRMED' });
  });

  it('links the business onto the user, mints the claims, and clears the personal draft', async () => {
    const { uid, revision } = await reviewedOwner();
    const { businessId } = await call(
      confirmOnboardingBusiness,
      { reviewedRevision: revision },
      uid
    );

    expect((await db.collection('users').doc(uid).get()).data()!['businessIds']).toEqual([
      businessId,
    ]);
    expect((await admin.auth().getUser(uid)).customClaims?.['businessIds']).toEqual([businessId]);

    const draft = (await db.collection('onboarding_drafts').doc(uid).get()).data()!;
    expect(draft['status']).toBe('completed');
    expect(draft['businessId']).toBe(businessId);
    expect(draft['facts']).toEqual({}); // what the owner told us now lives in the Brain only
    expect(JSON.stringify(draft)).not.toContain('Asha');
  });

  it('records the funnel: review shown, confirmed, completed', async () => {
    const { uid, revision } = await reviewedOwner();
    await call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid);

    const events = await db.collection('analytics_events').where('userId', '==', uid).get();
    const names = new Set(events.docs.map((d) => d.data()['eventName']));
    for (const name of [
      'onboarding_started',
      'onboarding_review_shown',
      'onboarding_confirmed',
      'onboarding_complete',
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });

  it('a cloud kitchen is created delivery-first, with honest provenance', async () => {
    const { uid, revision } = await reviewedOwner(
      ANSWERS.map((a) =>
        a.path === 'identity.industry'
          ? { ...a, value: 'restaurant_food' }
          : a.path === 'identity.subcategory'
            ? { ...a, value: 'cloud_kitchen' }
            : a
      )
    );
    const { businessId } = await call(
      confirmOnboardingBusiness,
      { reviewedRevision: revision },
      uid
    );
    const business = (await db.collection('businesses').doc(businessId).get()).data()!;
    expect(business['category']).toBe('restaurant');
    expect(business['businessBrain'].businessRules.operatingMode).toBe('delivery');
    expect(business['businessBrain'].knowledge.facts['businessRules.operatingMode']).toEqual({
      source: 'DERIVED_FROM_SUBCATEGORY',
    });
  });

  describe('the review boundary', () => {
    it('never turns an unconfirmed AI guess into business truth', async () => {
      const uid = await newOwner();
      await call(saveOnboardingDraft, { welcomed: true, updates: ANSWERS.slice(0, 8) }, uid);
      // A guess Mitra made, sitting in the draft unconfirmed (as discovery would leave it).
      await db
        .collection('onboarding_drafts')
        .doc(uid)
        .update({
          'facts.offering__signature': {
            value: ['Secret AI guess'],
            source: 'AI_INFERRED',
            confidence: 0.7,
            confirmed: false,
            updatedAt: new Date().toISOString(),
          },
        });
      const { draft } = await call(saveOnboardingDraft, { reviewShown: true }, uid);

      const { businessId } = await call(
        confirmOnboardingBusiness,
        { reviewedRevision: draft.revision },
        uid
      );
      const business = (await db.collection('businesses').doc(businessId).get()).data()!;
      expect(JSON.stringify(business)).not.toContain('Secret AI guess');
      expect(business['businessBrain'].offerings).toBeUndefined();
    });

    it('requires the review to have been shown first', async () => {
      const uid = await newOwner();
      const { draft } = await call(saveOnboardingDraft, { updates: ANSWERS }, uid);
      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: draft.revision }, uid)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { code: 'ONBOARDING_REVIEW_REQUIRED' },
      });
      expect(await businessesOf(uid)).toHaveLength(0);
    });

    it('cannot be made to pass by an incomplete draft claiming it was reviewed', async () => {
      const uid = await newOwner();
      await call(saveOnboardingDraft, { updates: ANSWERS.slice(0, 4) }, uid);
      const { draft } = await call(saveOnboardingDraft, { reviewShown: true }, uid);
      expect(draft.status).toBe('in_progress');
      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: draft.revision }, uid)
      ).rejects.toMatchObject({ details: { code: 'ONBOARDING_REVIEW_REQUIRED' } });
      expect(await businessesOf(uid)).toHaveLength(0);
    });

    it('only creates the version the owner reviewed: a change made since forces a new review', async () => {
      const { uid, revision } = await reviewedOwner();
      // Another tab edits after the review was shown.
      await call(
        saveOnboardingDraft,
        { updates: [{ path: 'identity.city', value: 'Mumbai' }] },
        uid
      );

      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { code: 'ONBOARDING_DRAFT_CHANGED' },
      });
      expect(await businessesOf(uid)).toHaveLength(0);
    });

    it('takes nothing about the business from the caller — only which revision they reviewed', async () => {
      const { uid, revision } = await reviewedOwner();
      const { businessId } = await call(
        confirmOnboardingBusiness,
        {
          reviewedRevision: revision,
          name: 'Evil Corp',
          category: 'restaurant',
          contact: { phone: '1', whatsapp: '1' },
          businessBrain: {
            knowledge: { facts: { 'contact.phone': { source: 'USER_CONFIRMED' } } },
          },
        },
        uid
      );
      const business = (await db.collection('businesses').doc(businessId).get()).data()!;
      expect(business['name']).toBe('Prana Yoga Studio');
      expect(business['category']).toBe('general');
      expect(business['businessBrain'].knowledge.facts['contact.phone']).toEqual({
        source: 'DERIVED_FROM_WHATSAPP',
      });
    });

    it("uses only the caller's own draft: someone else's cannot be confirmed", async () => {
      const victim = await reviewedOwner();
      const attacker = await newOwner();
      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: victim.revision }, attacker)
      ).rejects.toMatchObject({ details: { code: 'ONBOARDING_NO_DRAFT' } });
      expect(await businessesOf(victim.uid)).toHaveLength(0);
      expect(await businessesOf(attacker)).toHaveLength(0);
    });
  });

  describe('safety', () => {
    it('refuses an unverified email, and creates nothing', async () => {
      const { uid, revision } = await reviewedOwner();
      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid, UNVERIFIED)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { code: 'EMAIL_NOT_VERIFIED' },
      });
      expect(await businessesOf(uid)).toHaveLength(0);
    });

    it('rejects unauthenticated callers', async () => {
      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: 1 }, null)
      ).rejects.toMatchObject({
        code: 'unauthenticated',
      });
    });

    it('respects the plan limit and leaves the draft untouched so the owner loses nothing', async () => {
      const { uid, revision } = await reviewedOwner();
      // They already have an active business on the Free plan (limit 1).
      await db
        .collection('businesses')
        .doc(`existing-${uid}`)
        .set({
          businessId: `existing-${uid}`,
          userId: uid,
          status: 'active',
          createdAt: new Date(),
        });

      await expect(
        call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid)
      ).rejects.toThrow(/business profile/i);

      expect(await businessesOf(uid)).toHaveLength(1); // still just the existing one
      const draft = (await db.collection('onboarding_drafts').doc(uid).get()).data()!;
      expect(draft['status']).toBe('ready_for_review'); // not consumed
      expect(Object.keys(draft['facts']).length).toBeGreaterThan(0);
    });
  });

  describe('atomic and idempotent', () => {
    it('a retry after success returns the same business — it does not create a second', async () => {
      const { uid, revision } = await reviewedOwner();
      const first = await call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid);
      const retry = await call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid);

      expect(retry.businessId).toBe(first.businessId);
      expect(retry.created).toBe(false);
      expect(await businessesOf(uid)).toHaveLength(1);
    });

    it('a double-click (two simultaneous confirms) produces exactly one business', async () => {
      const { uid, revision } = await reviewedOwner();
      const results = await Promise.all([
        call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid),
        call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid),
        call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid),
      ]);

      expect(new Set(results.map((r: any) => r.businessId)).size).toBe(1);
      expect(results.filter((r: any) => r.created)).toHaveLength(1);
      expect(await businessesOf(uid)).toHaveLength(1);
      expect((await db.collection('users').doc(uid).get()).data()!['businessIds']).toHaveLength(1);
    });

    it('a retry also re-mints the claims, which is the recovery path if that step failed the first time', async () => {
      const { uid, revision } = await reviewedOwner();
      const { businessId } = await call(
        confirmOnboardingBusiness,
        { reviewedRevision: revision },
        uid
      );
      await admin.auth().setCustomUserClaims(uid, { role: 'user', businessIds: [] }); // simulate the lost step

      await call(confirmOnboardingBusiness, { reviewedRevision: revision }, uid);

      expect((await admin.auth().getUser(uid)).customClaims?.['businessIds']).toEqual([businessId]);
    });
  });
});
