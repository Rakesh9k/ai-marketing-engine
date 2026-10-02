/**
 * Phase 9 AI Failure -> Credit Refund Audit — verifies generateCampaignStrategy.ts's
 * own error handling (Phase 12 fix, see the catch block's comment there):
 * when executeWithUsageControl rejects (the pipeline threw, after the shared
 * mechanism already refunded the reservation — proven separately in
 * usageControl.test.ts), the callable must move the already-created
 * campaign document to a terminal 'failed' status so the frontend's poll
 * loop doesn't spin forever, and must NOT do so for the insufficient-credits
 * path (where no campaign document credit-bearing work ever started).
 * Mocks every collaborator (same pattern as generateCampaignStrategy.vertical.test.ts)
 * so this runs everywhere, no Firestore emulator required.
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
const mockGetCreativePreferencesByBusiness = jest.fn().mockResolvedValue([]);
const mockGetSavedStyleDoc = jest.fn().mockResolvedValue(null);
jest.mock('../../services/firestore', () => ({
  // P0-4: see generateCampaignStrategy.template.test.ts's identical comment.
  getCurrentUsage: jest.fn().mockResolvedValue({ campaignsCreated: 0, planId: 'agency' }),
  getSubscriptionByUser: jest.fn().mockResolvedValue(null),
  createCampaignDoc: (...args: unknown[]) => mockCreateCampaignDoc(...args),
  updateCampaignDoc: (...args: unknown[]) => mockUpdateCampaignDoc(...args),
  getBusinessDoc: (...args: unknown[]) => mockGetBusinessDoc(...args),
  getBrandKitDoc: (...args: unknown[]) => mockGetBrandKitDoc(...args),
  getProductDoc: (...args: unknown[]) => mockGetProductDoc(...args),
  createCampaignAssets: (...args: unknown[]) => mockCreateCampaignAssets(...args),
  getCreativePreferencesByBusiness: (...args: unknown[]) =>
    mockGetCreativePreferencesByBusiness(...args),
  getSavedStyleDoc: (...args: unknown[]) => mockGetSavedStyleDoc(...args),
  getCampaignByIdempotencyKey: jest.fn().mockResolvedValue(null),
}));

const mockExecuteWithUsageControl = jest.fn();
jest.mock('../../services/usageControl', () => ({
  executeWithUsageControl: (...args: unknown[]) => mockExecuteWithUsageControl(...args),
  getGenerationCost: () => 140,
  USAGE_ERROR_CODES: {
    INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
    SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  },
}));

const mockTrackEvent = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/analyticsService', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  trackCreativeEvent: jest.fn().mockResolvedValue(undefined),
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

function makeBusiness(): Business {
  return {
    businessId: 'biz-1',
    userId: 'user-1',
    name: 'Test Business',
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

function makeRequestData(idempotencyKey: string) {
  return {
    businessId: 'biz-1',
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
      audienceDescription: 'Local customers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    idempotencyKey,
  };
}

describe('generateCampaignStrategy — failure recovery (Phase 9 / Phase 12 fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyBusinessAccess.mockResolvedValue(undefined);
    mockCheckRateLimit.mockResolvedValue(undefined);
    mockGetBusinessDoc.mockResolvedValue(makeBusiness());
    mockGetBrandKitDoc.mockResolvedValue(null);
    mockGetProductDoc.mockResolvedValue(null);
  });

  // executeWithUsageControl's real implementation just `await`s the
  // generation callback it's given (its OWN try/catch and refund behavior
  // is exercised for real, deterministically, in usageControl.test.ts) —
  // mocked here the same way so that createCampaignDoc (called from inside
  // that callback, before the pipeline runs) executes exactly as it would
  // in production, and the pipeline's own rejection propagates the same way.
  function mockExecuteWithUsageControlRunsCallback() {
    mockExecuteWithUsageControl.mockImplementation(
      async (_userId: string, _opId: string, _opType: string, callback: () => Promise<unknown>) => {
        const result = await callback();
        return { result, creditsUsed: 140 };
      }
    );
  }

  it('when the pipeline throws (already refunded internally by the shared mechanism), the campaign document is moved to a terminal "failed" status', async () => {
    mockExecuteWithUsageControlRunsCallback();
    mockExecute.mockRejectedValue(new Error('Gemini request timed out after 30000ms'));

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow();

    expect(mockCreateCampaignDoc).toHaveBeenCalledTimes(1); // the campaign doc was created before generation started
    expect(mockUpdateCampaignDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('timed out'),
        }),
      })
    );
  });

  it('a malformed-response-shaped failure also moves the campaign to "failed" (not left stuck in an intermediate status)', async () => {
    mockExecuteWithUsageControlRunsCallback();
    mockExecute.mockRejectedValue(new SyntaxError('Unexpected token < in JSON'));

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow();

    expect(mockUpdateCampaignDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('INSUFFICIENT_CREDITS is surfaced as its own error and does NOT attempt to mark a campaign as failed (reservation never happened, no campaign work to roll back)', async () => {
    mockExecuteWithUsageControl.mockRejectedValue(
      Object.assign(new Error('Insufficient credits'), { code: 'INSUFFICIENT_CREDITS' })
    );

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow();

    expect(mockUpdateCampaignDoc).not.toHaveBeenCalled();
  });

  it("a failure updating the campaign's own status to 'failed' does not mask the original generation error", async () => {
    mockExecuteWithUsageControl.mockRejectedValue(new Error('provider exception'));
    mockUpdateCampaignDoc.mockRejectedValue(new Error('Firestore unavailable'));

    const request = callableRequest(makeRequestData(uuid()), 'user-1');
    // The original error must still be what the caller sees, not the
    // secondary status-update failure.
    await expect((generateCampaignStrategy as any).run(request)).rejects.toThrow(
      /provider exception/i
    );
  });
});
