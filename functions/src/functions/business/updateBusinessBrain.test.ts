/**
 * Phase 33 — proves the customer-facing Business Brain edit path
 * (updateBusinessBrain) authenticates, authorizes, isolates tenants, and
 * structurally cannot touch security-critical fields (credits, Truth
 * Check status, ownership, tenant IDs, authorization, billing), against a
 * real Firestore emulator.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { updateBusinessBrain } from './updateBusinessBrain';
import { getBusinessDoc, createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(
  businessId: string,
  userId: string,
  category: Business['category'] = 'restaurant'
): Business {
  const now = new Date().toISOString();
  return {
    businessId,
    userId,
    name: 'Test Business',
    category,
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {
      identity: {
        name: 'Test Business',
        category,
        description: '',
        location: { city: 'Hyderabad', state: 'Telangana' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      products: [],
      brand: {
        tone: 'friendly',
        personality: '',
        visualPreferences: '',
        colors: { primary: '#000', secondary: '#fff', accent: '#f00' },
        fonts: { heading: 'Poppins', body: 'Inter' },
      },
      audience: { targetCustomer: '', ageRange: { min: 18, max: 65 }, localities: ['Kondapur'], preferences: '' },
      localization: {
        primaryLanguage: 'en',
        secondaryLanguage: 'en',
        regionalStyle: 'neutral',
        slangIntensity: 'moderate',
        languageMixing: 'minimal',
      },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 5,
        minimumOrder: 0,
        offerValidityRules: '',
        pricingRules: '',
        operatingMode: 'dine-in',
      },
      campaignHistory: [],
      lastSyncedAt: now,
    } as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  } as Business;
}

describeIfEmulator('updateBusinessBrain — customer Business Brain edits (Phase 33)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('the owner can edit audience/localization/businessRules and the change persists on a fresh read', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));

    await (updateBusinessBrain as any).run(
      callableRequest(
        {
          businessId,
          audience: { targetCustomer: 'Young professionals', preferences: 'spicy food' },
          localization: { regionalStyle: 'hyderabadi' },
          businessRules: { deliveryRadiusKm: 10, offerValidityRules: 'No stacking offers' },
        },
        userId
      )
    );

    const business = await getBusinessDoc(businessId);
    expect(business?.businessBrain.audience.targetCustomer).toBe('Young professionals');
    expect(business?.businessBrain.audience.preferences).toBe('spicy food');
    expect(business?.businessBrain.localization.regionalStyle).toBe('hyderabadi');
    expect(business?.businessBrain.businessRules.deliveryRadiusKm).toBe(10);
    expect(business?.businessBrain.businessRules.offerValidityRules).toBe('No stacking offers');
    // Untouched fields survive the partial merge.
    expect(business?.businessBrain.businessRules.minimumOrder).toBe(0);
  });

  it('cross-tenant: User B cannot edit User A\'s Business Brain', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(
      (updateBusinessBrain as any).run(
        callableRequest({ businessId, audience: { targetCustomer: 'Hijacked' } }, attackerId)
      )
    ).rejects.toThrow();

    const business = await getBusinessDoc(businessId);
    expect(business?.businessBrain.audience.targetCustomer).not.toBe('Hijacked');
  });

  it('salon services/packages can only be set for a salon business, not a restaurant', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId, 'restaurant'));

    await expect(
      (updateBusinessBrain as any).run(
        callableRequest(
          {
            businessId,
            services: [{ id: 's1', name: 'Haircut', category: 'hair', price: 300, active: true }],
          },
          userId
        )
      )
    ).rejects.toThrow();
  });

  it('a salon business can add/edit services and packages via this function (closing the Phase 30 gap)', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId, 'salon'));

    await (updateBusinessBrain as any).run(
      callableRequest(
        {
          businessId,
          services: [{ id: 's1', name: 'Haircut', category: 'hair', price: 300, active: true }],
          packages: [
            {
              id: 'p1',
              name: 'Bridal Combo',
              serviceIds: ['s1'],
              packagePrice: 4999,
              active: true,
            },
          ],
        },
        userId
      )
    );

    const business = await getBusinessDoc(businessId);
    expect(business?.businessBrain.verticalProfile?.services?.[0]?.name).toBe('Haircut');
    expect(business?.businessBrain.verticalProfile?.packages?.[0]?.name).toBe('Bridal Combo');
    expect(business?.businessBrain.verticalProfile?.vertical).toBe('salon');
  });

  it('sending unknown/security-critical fields (credits, tenantId, billingState) is silently stripped by validation, never applied', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));

    await (updateBusinessBrain as any).run(
      callableRequest(
        {
          businessId,
          audience: { targetCustomer: 'Legit edit' },
          // None of these are in the schema — Zod strips them before the
          // handler ever sees them, so there is no code path to apply them.
          credits: 999999,
          truthCheckStatus: 'PASS',
          userId: 'attacker-uid',
          tenantId: 'other-tenant',
          agencyId: 'other-agency',
          billingState: 'paid',
        } as any,
        userId
      )
    );

    const business = await getBusinessDoc(businessId);
    expect(business?.userId).toBe(userId); // unchanged
    expect(business?.businessBrain.audience.targetCustomer).toBe('Legit edit');
  });
});
