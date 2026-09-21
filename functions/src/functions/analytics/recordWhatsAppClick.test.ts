/**
 * Phase 34 — proves the one server-authoritative write path for real
 * WhatsApp clicks: authenticated, authorized (verifyBusinessAccess),
 * campaign-associated (rejects wrong business/campaign), and idempotent
 * (a retried/duplicated click never double-counts, but two genuinely
 * separate clicks each count), against a real Firestore emulator.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { recordWhatsAppClick } from './recordWhatsAppClick';
import { getCampaignPerformance } from './getCampaignPerformance';
import { createBusinessDoc, createCampaignDoc } from '../../services/firestore';
import type { Business, Campaign } from '../../types';

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

function makeCampaign(campaignId: string, businessId: string, userId: string): Campaign {
  return {
    campaignId,
    businessId,
    userId,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Campaign;
}

describeIfEmulator('recordWhatsAppClick / getCampaignPerformance (Phase 34)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('one click: a single real click is recorded and readable', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, userId));

    await (recordWhatsAppClick as any).run(
      callableRequest({ businessId, campaignId, clickId: uuid() }, userId)
    );

    const result = await (getCampaignPerformance as any).run(
      callableRequest({ businessId, campaignId }, userId)
    );
    expect(result.whatsappClicks).toBe(1);
    expect(result.inquiries).toBeNull();
    expect(result.inquiriesAvailable).toBe(false);
  });

  it('duplicate click: retrying the SAME clickId does not double-count', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, userId));

    const clickId = uuid();
    await (recordWhatsAppClick as any).run(
      callableRequest({ businessId, campaignId, clickId }, userId)
    );
    // Simulates a client retry (network hiccup, refresh) reusing the exact
    // same clickId for the exact same click.
    await (recordWhatsAppClick as any).run(
      callableRequest({ businessId, campaignId, clickId }, userId)
    );

    const result = await (getCampaignPerformance as any).run(
      callableRequest({ businessId, campaignId }, userId)
    );
    expect(result.whatsappClicks).toBe(1);
  });

  it('multiple clicks: distinct genuine clicks each count', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, userId));

    for (let i = 0; i < 3; i++) {
      await (recordWhatsAppClick as any).run(
        callableRequest({ businessId, campaignId, clickId: uuid() }, userId)
      );
    }

    const result = await (getCampaignPerformance as any).run(
      callableRequest({ businessId, campaignId }, userId)
    );
    expect(result.whatsappClicks).toBe(3);
  });

  it('wrong business: a campaign that does not belong to the given businessId is rejected', async () => {
    const userId = `user-${uuid()}`;
    const realBusinessId = `biz-${uuid()}`;
    const otherBusinessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(realBusinessId, userId));
    await createBusinessDoc(makeBusiness(otherBusinessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, realBusinessId, userId));

    await expect(
      (recordWhatsAppClick as any).run(
        callableRequest({ businessId: otherBusinessId, campaignId, clickId: uuid() }, userId)
      )
    ).rejects.toThrow();

    const result = await (getCampaignPerformance as any).run(
      callableRequest({ businessId: realBusinessId, campaignId }, userId)
    );
    expect(result.whatsappClicks).toBe(0);
  });

  it('unauthorized event: a user who does not own the business cannot record a click for it', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, ownerId));

    await expect(
      (recordWhatsAppClick as any).run(
        callableRequest({ businessId, campaignId, clickId: uuid() }, attackerId)
      )
    ).rejects.toThrow();
  });

  it('missing campaign: a campaignId that does not exist is rejected, not silently recorded', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));

    await expect(
      (recordWhatsAppClick as any).run(
        callableRequest({ businessId, campaignId: `camp-${uuid()}`, clickId: uuid() }, userId)
      )
    ).rejects.toThrow();
  });

  it('missing data: a request without a clickId is rejected by schema validation', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, userId));

    await expect(
      (recordWhatsAppClick as any).run(callableRequest({ businessId, campaignId }, userId))
    ).rejects.toThrow();
  });

  it('missing data: getCampaignPerformance for a campaign with zero clicks reports a real, known zero — not undefined', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, userId));

    const result = await (getCampaignPerformance as any).run(
      callableRequest({ businessId, campaignId }, userId)
    );
    expect(result.whatsappClicks).toBe(0);
    expect(result.updatedAt).toBeNull();
  });

  it('unknown inquiry: inquiries is always null/unavailable — never 0, never derived from clicks', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, userId));

    for (let i = 0; i < 5; i++) {
      await (recordWhatsAppClick as any).run(
        callableRequest({ businessId, campaignId, clickId: uuid() }, userId)
      );
    }

    const result = await (getCampaignPerformance as any).run(
      callableRequest({ businessId, campaignId }, userId)
    );
    expect(result.whatsappClicks).toBe(5);
    // Five real clicks must never be converted into five "inquiries" —
    // the fields are completely independent, and this codebase has no
    // real inquiry source at all.
    expect(result.inquiries).toBeNull();
    expect(result.inquiriesAvailable).toBe(false);
  });

  it('cross-tenant read: a user cannot read another business\'s campaign performance', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const campaignId = `camp-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createCampaignDoc(makeCampaign(campaignId, businessId, ownerId));

    await expect(
      (getCampaignPerformance as any).run(
        callableRequest({ businessId, campaignId }, attackerId)
      )
    ).rejects.toThrow();
  });
});
