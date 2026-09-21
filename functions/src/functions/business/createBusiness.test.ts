/**
 * Phase 15 — proves the actual onboarding persistence path: createBusiness
 * must write a full Business Brain-shaped document (identity/brand/
 * audience/localization/businessRules), link it onto the creating user's
 * businessIds, and that a fresh read (not client state) still reflects it.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const trackEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/analyticsService', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  ANALYTICS_EVENTS: { ONBOARDING_COMPLETE: 'onboarding_complete' },
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createBusiness } from './createBusiness';
import { getBusinessDoc } from '../../services/firestore';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

describeIfEmulator('createBusiness — onboarding persistence (Phase 15)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => jest.clearAllMocks());

  async function seedAuthUser(userId: string) {
    // createBusiness refreshes the caller's custom claims via
    // admin.auth().setCustomUserClaims, which requires a real Auth
    // record to exist (in the Auth emulator here) — not just a Firestore
    // users/{uid} document.
    await admin.auth().createUser({ uid: userId, email: `${userId}@test.example` });
  }

  it('persists name/category/location/contact/settings/Business Brain defaults and links onto the user, surviving a fresh read', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUser(userId);
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });

    const input = {
      name: 'Kondapur Biryani House',
      category: 'restaurant' as const,
      description: 'Best biryani in town',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      contact: { phone: '9876543210', whatsapp: '9876543210' },
      language: 'en' as const,
      regionalStyle: 'hyderabadi' as const,
      contentStyle: 'funny' as const,
    };

    const result = await (createBusiness as any).run(callableRequest(input, userId));
    expect(result.businessId).toBeDefined();

    // Fresh read from Firestore — not the value the function handed back.
    const persisted = await getBusinessDoc(result.businessId);
    expect(persisted).not.toBeNull();
    expect(persisted!.userId).toBe(userId);
    expect(persisted!.name).toBe(input.name);
    expect(persisted!.category).toBe('restaurant');
    expect(persisted!.location.city).toBe('Hyderabad');
    expect(persisted!.contact.phone).toBe('9876543210');
    expect(persisted!.status).toBe('active');

    // Business Brain defaults derived from onboarding input, per the
    // actual schema (not invented fields).
    const brain = persisted!.businessBrain as any;
    expect(brain.identity.name).toBe(input.name);
    expect(brain.localization.primaryLanguage).toBe('en');
    expect(brain.localization.regionalStyle).toBe('hyderabadi');
    expect(brain.audience.localities).toContain('Kondapur');

    // The user document must now list this business.
    const userDoc = await db.collection('users').doc(userId).get();
    expect(userDoc.data()!['businessIds']).toContain(result.businessId);

    // A second independent read (simulating "reload"/"fetch again") must
    // still agree.
    const reread = await getBusinessDoc(result.businessId);
    expect(reread!.name).toBe(input.name);
  });

  it('two businesses created by two different users never collide and each user sees only their own in businessIds', async () => {
    const userA = `user-${uuid()}`;
    const userB = `user-${uuid()}`;
    await seedAuthUser(userA);
    await seedAuthUser(userB);
    await db.collection('users').doc(userA).set({ userId: userA, businessIds: [], role: 'user' });
    await db.collection('users').doc(userB).set({ userId: userB, businessIds: [], role: 'user' });

    const baseInput = {
      category: 'salon' as const,
      location: { city: 'Mumbai', state: 'Maharashtra' },
      contact: { phone: '9000000000', whatsapp: '9000000000' },
    };

    const resultA = await (createBusiness as any).run(
      callableRequest({ ...baseInput, name: 'Business A' }, userA)
    );
    const resultB = await (createBusiness as any).run(
      callableRequest({ ...baseInput, name: 'Business B' }, userB)
    );

    expect(resultA.businessId).not.toBe(resultB.businessId);

    const userADoc = await db.collection('users').doc(userA).get();
    const userBDoc = await db.collection('users').doc(userB).get();
    expect(userADoc.data()!['businessIds']).toEqual([resultA.businessId]);
    expect(userBDoc.data()!['businessIds']).toEqual([resultB.businessId]);

    const bizA = await getBusinessDoc(resultA.businessId);
    const bizB = await getBusinessDoc(resultB.businessId);
    expect(bizA!.userId).toBe(userA);
    expect(bizB!.userId).toBe(userB);
  });

  it('Phase 30: a salon business persists services/packages/appointmentSettings into businessBrain.verticalProfile', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUser(userId);
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });

    const input = {
      name: 'Glow Salon',
      category: 'salon' as const,
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
      contact: { phone: '9876500000', whatsapp: '9876500000' },
      services: [
        { id: 'svc_0', name: 'Haircut & Styling', category: 'hair' as const, price: 500, active: true },
        { id: 'svc_1', name: 'Manicure', category: 'nails' as const, price: 300, active: true },
      ],
      packages: [
        {
          id: 'pkg_0',
          name: 'Bridal Glow Package',
          serviceIds: ['svc_0'],
          packagePrice: 4000,
          active: true,
        },
      ],
      appointmentSettings: {
        acceptInquiries: true,
        preferredBookingChannel: 'whatsapp' as const,
      },
    };

    const result = await (createBusiness as any).run(callableRequest(input, userId));
    const persisted = await getBusinessDoc(result.businessId);

    const verticalProfile = (persisted!.businessBrain as any).verticalProfile;
    expect(verticalProfile).toBeDefined();
    expect(verticalProfile.services).toHaveLength(2);
    expect(verticalProfile.services[0].name).toBe('Haircut & Styling');
    expect(verticalProfile.packages).toHaveLength(1);
    expect(verticalProfile.packages[0].name).toBe('Bridal Glow Package');
    expect(verticalProfile.appointmentSettings.preferredBookingChannel).toBe('whatsapp');
  });

  it('Phase 30: a restaurant business gets NO verticalProfile at all, exactly as before this phase (regression guard)', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUser(userId);
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });

    const result = await (createBusiness as any).run(
      callableRequest(
        {
          name: 'Test Restaurant',
          category: 'restaurant' as const,
          location: { city: 'Hyderabad', state: 'Telangana' },
          contact: { phone: '9876511111', whatsapp: '9876511111' },
        },
        userId
      )
    );

    const persisted = await getBusinessDoc(result.businessId);
    expect((persisted!.businessBrain as any).verticalProfile).toBeUndefined();
  });

  it('Phase 30: a salon business that skips services/packages/appointmentSettings also gets NO verticalProfile', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUser(userId);
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });

    const result = await (createBusiness as any).run(
      callableRequest(
        {
          name: 'Minimal Salon',
          category: 'salon' as const,
          location: { city: 'Hyderabad', state: 'Telangana' },
          contact: { phone: '9876522222', whatsapp: '9876522222' },
        },
        userId
      )
    );

    const persisted = await getBusinessDoc(result.businessId);
    expect((persisted!.businessBrain as any).verticalProfile).toBeUndefined();
  });

  it('Phase 31: a real_estate business persists properties into businessBrain.verticalProfile', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUser(userId);
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });

    const input = {
      name: 'Green Meadows Realty',
      category: 'real_estate' as const,
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kokapet' },
      contact: { phone: '9876533333', whatsapp: '9876533333' },
      properties: [
        {
          id: 'prop_0',
          title: '3BHK in Green Meadows',
          propertyType: 'apartment' as const,
          areaSqft: 1450,
          bedrooms: 3,
          bathrooms: 2,
          price: 8500000,
          possessionStatus: 'ready_to_move' as const,
          amenities: ['gym', 'parking'],
          active: true,
        },
      ],
    };

    const result = await (createBusiness as any).run(callableRequest(input, userId));
    const persisted = await getBusinessDoc(result.businessId);

    const verticalProfile = (persisted!.businessBrain as any).verticalProfile;
    expect(verticalProfile).toBeDefined();
    expect(verticalProfile.properties).toHaveLength(1);
    expect(verticalProfile.properties[0].title).toBe('3BHK in Green Meadows');
    expect(verticalProfile.properties[0].bedrooms).toBe(3);
    expect(verticalProfile.properties[0].possessionStatus).toBe('ready_to_move');
    // Real estate never gets the salon-only appointmentSettings shape.
    expect(verticalProfile.appointmentSettings).toBeUndefined();
  });

  it('Phase 31: a real_estate business that skips properties gets NO verticalProfile at all', async () => {
    const userId = `user-${uuid()}`;
    await seedAuthUser(userId);
    await db.collection('users').doc(userId).set({ userId, businessIds: [], role: 'user' });

    const result = await (createBusiness as any).run(
      callableRequest(
        {
          name: 'Minimal Realty',
          category: 'real_estate' as const,
          location: { city: 'Hyderabad', state: 'Telangana' },
          contact: { phone: '9876544444', whatsapp: '9876544444' },
        },
        userId
      )
    );

    const persisted = await getBusinessDoc(result.businessId);
    expect((persisted!.businessBrain as any).verticalProfile).toBeUndefined();
  });
});
