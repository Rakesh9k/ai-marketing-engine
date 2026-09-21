/**
 * Phase 13 — proves Truth Check staleness detection (Phase 6's
 * isVerificationStale, wired up this phase into the getCampaign Cloud
 * Function that the frontend now actually calls) works end-to-end against
 * a real Firestore emulator: a campaign verified against a product's price
 * must be flagged stale once that price changes, without mutating the
 * original, historical Truth Check result itself.
 */
import { v4 as uuid } from 'uuid';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { getCampaign } from './getCampaign';
import { createBusinessDoc, createProductDoc, createCampaignDoc, updateProductDoc } from '../../services/firestore';
import { computeSourceFingerprint } from '../../services/ai/truthCheck';
import type { Business, Product, Campaign } from '../../types';

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

function makeProduct(productId: string, businessId: string, price: number): Product {
  return {
    productId,
    businessId,
    name: 'Biryani',
    price,
    currency: 'INR',
    category: 'main',
    tags: [],
    variants: [],
    images: [],
    attributes: {} as Product['attributes'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Product;
}

describeIfEmulator('getCampaign — Truth Check staleness (Firestore emulator, Phase 13)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('GOLDEN TEST 10: campaign verified at ₹299 is flagged stale once the product price changes to ₹399, without altering the stored historical result', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const productId = `prod-${uuid()}`;
    const campaignId = `camp-${uuid()}`;

    const business = makeBusiness(businessId, userId);
    await createBusinessDoc(business);
    await createProductDoc(makeProduct(productId, businessId, 299));

    const fingerprint = computeSourceFingerprint({
      businessPhone: business.contact.phone,
      businessWhatsApp: business.contact.whatsapp,
      businessLocationText: `${business.location.locality} ${business.location.city} ${business.location.state}`,
      productPrice: 299,
    });

    const campaign: Campaign = {
      campaignId,
      businessId,
      userId,
      productId,
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
      localization: {} as Campaign['localization'],
      status: 'verified',
      creditsReserved: 140,
      metadata: {
        idempotencyKey: uuid(),
        truthCheckStatus: 'PASS',
        truthCheckResult: {
          status: 'PASS',
          checkedAt: new Date().toISOString(),
          summary: 'All facts verified.',
          checks: [],
          sourceFingerprint: fingerprint,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Campaign;
    await createCampaignDoc(campaign);

    const freshResult = await (getCampaign as any).run(
      callableRequest({ campaignId, businessId }, userId)
    );
    expect(freshResult.isVerificationStale).toBe(false);
    expect(freshResult.campaign.metadata.truthCheckStatus).toBe('PASS'); // historical result unchanged

    // The product's price changes — a real, common lifecycle event.
    await updateProductDoc(productId, { price: 399 });

    const afterPriceChange = await (getCampaign as any).run(
      callableRequest({ campaignId, businessId }, userId)
    );
    expect(afterPriceChange.isVerificationStale).toBe(true);
    // The stored Truth Check result is a historical record — still PASS,
    // never silently rewritten to FAIL or removed by this read-only check.
    expect(afterPriceChange.campaign.metadata.truthCheckStatus).toBe('PASS');
  });

  it('cross-tenant: User A cannot call getCampaign for Business B\'s campaign', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;

    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createCampaignDoc({
      campaignId,
      businessId,
      userId: ownerId,
      objective: 'weekend_offer',
      offer: {
        headline: 'Owner campaign',
        price: 100,
        type: 'percentage',
        validityStart: new Date().toISOString(),
        validityEnd: new Date(Date.now() + 86400000).toISOString(),
      },
      duration: { start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString() },
      audience: { localities: ['X'] },
      cta: 'order_whatsapp',
      localization: {} as Campaign['localization'],
      status: 'draft',
      creditsReserved: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Campaign);

    await expect(
      (getCampaign as any).run(callableRequest({ campaignId, businessId }, attackerId))
    ).rejects.toThrow();
  });
});
