/**
 * The original wizard's createBusiness now runs through the same atomic core as the conversational
 * onboarding. Emulator-backed (SKIPPED, never falsely green, without it).
 *
 * Fixes two bugs found in the Phase A audit: the plan limit was checked and then written in separate
 * steps (two concurrent submits both passed), and a failure part-way left a business behind.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createBusiness } from './createBusiness';
import { updateBusiness } from './updateBusiness';

const VERIFIED = { email_verified: true, firebase: { sign_in_provider: 'password' } };
const call = (fn: unknown, data: unknown, uid: string) =>
  (fn as any).run({ data, auth: { uid, token: VERIFIED } });

// One shared Firebase app for the whole file: deleting it per describe would break the next block.
afterAll(async () => {
  await admin.app().delete();
});

const INPUT = {
  name: 'Corner Boutique',
  category: 'general' as const,
  location: { city: 'Pune', state: 'Maharashtra' },
  contact: { phone: '9876543210', whatsapp: '9876543210' },
};

describeIfEmulator('createBusiness — atomic core (emulator)', () => {
  const db = admin.firestore();

  async function newUser() {
    const uid = `user-${uuid()}`;
    await admin.auth().createUser({ uid, email: `${uid}@test.example` });
    await db.collection('users').doc(uid).set({ userId: uid, businessIds: [], role: 'user' });
    return uid;
  }
  const count = async (uid: string) =>
    (await db.collection('businesses').where('userId', '==', uid).get()).size;

  it('accepts the general vertical', async () => {
    const uid = await newUser();
    const { businessId } = await call(createBusiness, INPUT, uid);
    expect((await db.collection('businesses').doc(businessId).get()).data()!['category']).toBe(
      'general'
    );
  });

  it('two simultaneous submits on a one-business plan create exactly one business', async () => {
    const uid = await newUser();
    const results = await Promise.allSettled([
      call(createBusiness, INPUT, uid),
      call(createBusiness, { ...INPUT, name: 'Second Try' }, uid),
      call(createBusiness, { ...INPUT, name: 'Third Try' }, uid),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(2);
    for (const r of rejected) expect(String(r.reason?.message)).toMatch(/business profile/i);
    expect(await count(uid)).toBe(1);
    expect((await db.collection('users').doc(uid).get()).data()!['businessIds']).toHaveLength(1);
  });

  it('a later submit is still refused by the limit', async () => {
    const uid = await newUser();
    await call(createBusiness, INPUT, uid);
    await expect(call(createBusiness, { ...INPUT, name: 'Another' }, uid)).rejects.toThrow(
      /business profile/i
    );
    expect(await count(uid)).toBe(1);
  });

  it('a business without onboarding provenance is created exactly as before (no new Brain fields)', async () => {
    const uid = await newUser();
    const { businessId } = await call(createBusiness, INPUT, uid);
    const brain = (await db.collection('businesses').doc(businessId).get()).data()![
      'businessBrain'
    ];
    expect(brain).not.toHaveProperty('knowledge');
    expect(brain).not.toHaveProperty('owner');
  });
});

describeIfEmulator('updateBusiness — derived phone provenance (emulator)', () => {
  const db = admin.firestore();

  /** A business as the conversational onboarding creates it: phone DERIVED from WhatsApp. */
  async function derivedPhoneBusiness() {
    const uid = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await admin.auth().createUser({ uid, email: `${uid}@test.example` });
    await db
      .collection('users')
      .doc(uid)
      .set({ userId: uid, businessIds: [businessId], role: 'user' });
    const contact = { phone: '+919876543210', whatsapp: '+919876543210' };
    await db
      .collection('businesses')
      .doc(businessId)
      .set({
        businessId,
        userId: uid,
        name: 'Prana Yoga',
        category: 'general',
        status: 'active',
        location: { city: 'Hyderabad', state: 'Telangana' },
        contact,
        settings: {},
        businessBrain: {
          identity: { name: 'Prana Yoga', category: 'general', description: '', contact },
          knowledge: {
            origin: 'conversational_onboarding',
            confirmedAt: new Date().toISOString(),
            facts: {
              'contact.whatsapp': { source: 'USER_CONFIRMED' },
              'contact.phone': { source: 'DERIVED_FROM_WHATSAPP' },
            },
          },
        },
      });
    // verifyBusinessAccess reads the caller's claims.
    return { uid, businessId, token: { ...VERIFIED, businessIds: [businessId] }, contact };
  }

  const edit = (uid: string, token: Record<string, unknown>, data: unknown) =>
    (updateBusiness as any).run({ data, auth: { uid, token } });
  const phoneSource = async (businessId: string) =>
    (await db.collection('businesses').doc(businessId).get()).data()!['businessBrain'].knowledge
      .facts['contact.phone'].source;

  it('a DIFFERENT phone the owner enters replaces the derived one and becomes their own', async () => {
    const { uid, businessId, token, contact } = await derivedPhoneBusiness();
    await edit(uid, token, { businessId, contact: { ...contact, phone: '+914023456789' } });

    const doc = (await db.collection('businesses').doc(businessId).get()).data()!;
    expect(doc['contact'].phone).toBe('+914023456789');
    expect(doc['businessBrain'].identity.contact.phone).toBe('+914023456789');
    expect(await phoneSource(businessId)).toBe('USER_CONFIRMED');
  });

  it('saving the profile without touching the phone leaves it derived', async () => {
    const { uid, businessId, token, contact } = await derivedPhoneBusiness();
    await edit(uid, token, { businessId, name: 'Prana Yoga Studio', contact });
    expect(await phoneSource(businessId)).toBe('DERIVED_FROM_WHATSAPP');
  });

  it('changing only WhatsApp keeps the derived phone following it', async () => {
    const { uid, businessId, token, contact } = await derivedPhoneBusiness();
    await edit(uid, token, { businessId, contact: { ...contact, whatsapp: '+919123456780' } });

    const doc = (await db.collection('businesses').doc(businessId).get()).data()!;
    expect(doc['contact'].whatsapp).toBe('+919123456780');
    expect(doc['contact'].phone).toBe('+919123456780');
    expect(await phoneSource(businessId)).toBe('DERIVED_FROM_WHATSAPP');
  });

  it('once the owner has set their own phone, a later WhatsApp change never overwrites it', async () => {
    const { uid, businessId, token, contact } = await derivedPhoneBusiness();
    await edit(uid, token, { businessId, contact: { ...contact, phone: '+914023456789' } });
    await edit(uid, token, {
      businessId,
      contact: { phone: '+914023456789', whatsapp: '+919123456780' },
    });
    const doc = (await db.collection('businesses').doc(businessId).get()).data()!;
    expect(doc['contact'].phone).toBe('+914023456789');
    expect(await phoneSource(businessId)).toBe('USER_CONFIRMED');
  });
});
