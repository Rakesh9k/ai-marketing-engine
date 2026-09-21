/**
 * Phase 29 (vertical gate) / Phase 30 (salon) / Phase 31 (real_estate) —
 * proves the vertical-support gate in generateCampaignStrategy.ts. As of
 * Phase 31, all three real BusinessCategory values are implemented, so the
 * "refused" scenarios use a genuinely unknown category (mocked directly via
 * getBusinessDoc, bypassing the createBusiness Zod enum that would
 * otherwise prevent such a value existing) to prove the gate is a real,
 * general mechanism — not hardcoded to check for one specific string.
 * Also proves restaurant/salon/real_estate all proceed through credit
 * reservation identically, and that no vertical can submit another
 * vertical's objective/CTA. This suite mocks every collaborator (Firestore,
 * usage control, the AI pipeline) rather than requiring the Firestore
 * emulator, so it runs everywhere — including environments (like this one)
 * where the emulator-gated consistency/recovery suites skip.
 */
import { v4 as uuid } from 'uuid';
import type { Business } from '../../types';

const mockVerifyBusinessAccess = jest.fn().mockResolvedValue(undefined);
jest.mock('../../middleware/auth', () => ({
  verifyBusinessAccess: (...args: unknown[]) => mockVerifyBusinessAccess(...args),
}));

const mockCheckRateLimit = jest.fn().mockResolvedValue(undefined);
jest.mock('../../middleware/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockGetBusinessDoc = jest.fn();
const mockGetBrandKitDoc = jest.fn().mockResolvedValue(null);
const mockGetProductDoc = jest.fn().mockResolvedValue(null);
const mockCreateCampaignDoc = jest.fn().mockResolvedValue(undefined);
const mockUpdateCampaignDoc = jest.fn().mockResolvedValue(undefined);
const mockCreateCampaignAssets = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/firestore', () => ({
  createCampaignDoc: (...args: unknown[]) => mockCreateCampaignDoc(...args),
  updateCampaignDoc: (...args: unknown[]) => mockUpdateCampaignDoc(...args),
  getBusinessDoc: (...args: unknown[]) => mockGetBusinessDoc(...args),
  getBrandKitDoc: (...args: unknown[]) => mockGetBrandKitDoc(...args),
  getProductDoc: (...args: unknown[]) => mockGetProductDoc(...args),
  createCampaignAssets: (...args: unknown[]) => mockCreateCampaignAssets(...args),
}));

const mockExecuteWithUsageControl = jest.fn();
jest.mock('../../services/usageControl', () => ({
  executeWithUsageControl: (...args: unknown[]) => mockExecuteWithUsageControl(...args),
  getGenerationCost: () => 140,
  USAGE_ERROR_CODES: { INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS', SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED' },
}));

const mockTrackEvent = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/analyticsService', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  ANALYTICS_EVENTS: {
    CAMPAIGN_STARTED: 'campaign_started',
    CAMPAIGN_GENERATED: 'campaign_generated',
  },
}));

jest.mock('../../services/ai/truthCheck', () => ({
  computeSourceFingerprint: () => 'fingerprint',
  computeVerticalFactsFingerprint: () => 'vertical-fingerprint',
}));

const mockExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

import { generateCampaignStrategy } from './generateCampaignStrategy';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(category: Business['category']): Business {
  return {
    businessId: 'biz-1',
    userId: 'user-1',
    name: 'Test Business',
    category,
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Business;
}

function makeRequestData(
  idempotencyKey: string,
  overrides: { objective?: string; cta?: string } = {}
) {
  return {
    businessId: 'biz-1',
    objective: overrides.objective || 'weekend_offer',
    offer: {
      headline: 'Weekend Special',
      price: 299,
      type: 'percentage',
      validityStart: new Date().toISOString(),
      validityEnd: new Date(Date.now() + 86400000).toISOString(),
    },
    duration: { start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString() },
    audience: { localities: ['Kondapur'] },
    cta: overrides.cta || 'order_whatsapp',
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
      audienceDescription: 'Local customers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    idempotencyKey,
  };
}

describe('generateCampaignStrategy — vertical support gate (Phase 29)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyBusinessAccess.mockResolvedValue(undefined);
    mockCheckRateLimit.mockResolvedValue(undefined);
    mockGetBrandKitDoc.mockResolvedValue(null);
    mockGetProductDoc.mockResolvedValue(null);
    mockExecuteWithUsageControl.mockImplementation(
      async (_userId: string, _campaignId: string, _opType: string, callback: () => Promise<any>) => {
        const result = await callback();
        return { result, creditsUsed: 140 };
      }
    );
  });

  it('refuses generation for a genuinely unimplemented/unknown vertical BEFORE reserving any credits', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('spa' as any));

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /spa.*not yet supported/i
    );

    // The whole point of Phase 29's ordering fix: credits are never touched.
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
    expect(mockCreateCampaignDoc).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('the vertical gate does NOT bypass authorization: verifyBusinessAccess and rate limiting still run first, even for a business that will be refused', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('spa' as any));

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow();

    expect(mockVerifyBusinessAccess).toHaveBeenCalledWith('user-1', 'biz-1');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('user-1', 'generateCampaignStrategy');
  });

  it('authorization failure is still checked BEFORE the vertical gate — an unauthorized caller never learns whether the vertical is supported', async () => {
    mockVerifyBusinessAccess.mockRejectedValue(new Error('Access denied to business'));
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('spa' as any));

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(/access denied/i);

    // Never even reached the point of fetching the business to check its vertical.
    expect(mockGetBusinessDoc).not.toHaveBeenCalled();
  });

  it('restaurant is unaffected: generation proceeds through credit reservation exactly as before', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('restaurant'));
    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [],
        truthCheck: { status: 'PASS', summary: 'ok', checkedAt: new Date().toISOString(), checks: [] },
      },
    });

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    const response = await (generateCampaignStrategy as any).run(request);

    expect(response.campaignId).toBeDefined();
    expect(mockExecuteWithUsageControl).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0]![0].vertical).toBe('restaurant');
  });

  it('Phase 30: salon proceeds through credit reservation and generation exactly like restaurant, using its own objective/CTA', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('salon'));
    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [],
        truthCheck: { status: 'PASS', summary: 'ok', checkedAt: new Date().toISOString(), checks: [] },
      },
    });

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'service_promotion', cta: 'book_appointment' }),
      'user-1'
    );
    const response = await (generateCampaignStrategy as any).run(request);

    expect(response.campaignId).toBeDefined();
    expect(mockExecuteWithUsageControl).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0]![0].vertical).toBe('salon');
  });

  it('rejects a salon business submitting a restaurant-only CTA (book_table) — no vertical can use another vertical\'s CTAs', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('salon'));

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'service_promotion', cta: 'book_table' }),
      'user-1'
    );
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /cta.*not (valid|supported)|not (valid|supported).*cta/i
    );
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
  });

  it('rejects a salon business submitting a restaurant-only objective (new_dish)', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('salon'));

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'new_dish', cta: 'book_appointment' }),
      'user-1'
    );
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /objective.*not (valid|supported)|not (valid|supported).*objective/i
    );
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
  });

  it('rejects a restaurant business submitting a salon-only CTA (book_appointment)', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('restaurant'));

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'weekend_offer', cta: 'book_appointment' }),
      'user-1'
    );
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /cta.*not (valid|supported)|not (valid|supported).*cta/i
    );
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
  });

  it('Phase 31: real_estate proceeds through credit reservation and generation exactly like restaurant/salon, using its own objective/CTA', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('real_estate'));
    mockExecute.mockResolvedValue({
      campaignPack: {
        assets: [],
        truthCheck: { status: 'PASS', summary: 'ok', checkedAt: new Date().toISOString(), checks: [] },
      },
    });

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'property_promotion', cta: 'call_now' }),
      'user-1'
    );
    const response = await (generateCampaignStrategy as any).run(request);

    expect(response.campaignId).toBeDefined();
    expect(mockExecuteWithUsageControl).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0]![0].vertical).toBe('real_estate');
  });

  it('rejects a real_estate business submitting a salon-only CTA (book_appointment)', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('real_estate'));

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'property_promotion', cta: 'book_appointment' }),
      'user-1'
    );
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /cta.*not (valid|supported)|not (valid|supported).*cta/i
    );
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
  });

  it('rejects a real_estate business submitting a restaurant-only objective (new_dish)', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('real_estate'));

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'new_dish', cta: 'call_now' }),
      'user-1'
    );
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /objective.*not (valid|supported)|not (valid|supported).*objective/i
    );
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
  });

  it('rejects a restaurant business submitting a real-estate-only objective (property_promotion)', async () => {
    mockGetBusinessDoc.mockResolvedValue(makeBusiness('restaurant'));

    const request = callableRequest(
      makeRequestData(uuid(), { objective: 'property_promotion', cta: 'order_whatsapp' }),
      'user-1'
    );
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /objective.*not (valid|supported)|not (valid|supported).*objective/i
    );
    expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
  });
});
