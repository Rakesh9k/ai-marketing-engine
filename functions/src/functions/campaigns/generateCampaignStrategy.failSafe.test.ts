/**
 * System-level fault-injection test — answers the exact question the
 * Phase 38 follow-up asked for a cost-sensitive operation:
 *
 *   Firestore rate-limit state unavailable
 *           v
 *   checkRateLimit()
 *           v
 *   Does request proceed?   -> answered here
 *   Does AI execute?        -> answered here
 *   Does credit reservation happen? -> answered here
 *
 * Every collaborator generateCampaignStrategy.ts touches is mocked
 * EXCEPT `middleware/rateLimit` — checkRateLimit runs for real, against a
 * genuinely unreachable Firestore host. Since checkRateLimit is called
 * before getBusinessDoc, executeWithUsageControl, or the AI pipeline in
 * generateCampaignStrategy.ts, a real Firestore outage here must abort
 * before any of those ever run — proven with call-count assertions on
 * the mocks, not inferred from reading the source.
 *
 * Same invocation requirement as rateLimit.failSafe.test.ts: needs
 * SIMULATE_FIRESTORE_OUTAGE=1 and a broken FIRESTORE_EMULATOR_HOST, run
 * in its own dedicated `jest` process:
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:1 SIMULATE_FIRESTORE_OUTAGE=1 \
 *     GCLOUD_PROJECT=demo-mitra npx jest --ci \
 *     src/functions/campaigns/generateCampaignStrategy.failSafe.test.ts
 */
const outageSimulated = process.env['SIMULATE_FIRESTORE_OUTAGE'] === '1';
const describeIfOutageSimulated = outageSimulated ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import type { Business } from '../../types';

// Bypassed, same as generateCampaignStrategy.vertical.test.ts — this test
// is about what happens AFTER auth/business-access succeed, when the rate
// limiter's own persistence layer is what's down.
const mockVerifyBusinessAccess = jest.fn().mockResolvedValue(undefined);
jest.mock('../../middleware/auth', () => ({
  verifyBusinessAccess: (...args: unknown[]) => mockVerifyBusinessAccess(...args),
}));

// Deliberately NOT mocked: '../../middleware/rateLimit' — checkRateLimit
// runs for real against the broken FIRESTORE_EMULATOR_HOST this file is
// invoked with.

const mockGetBusinessDoc = jest.fn();
const mockGetBrandKitDoc = jest.fn().mockResolvedValue(null);
const mockGetProductDoc = jest.fn().mockResolvedValue(null);
const mockCreateCampaignDoc = jest.fn().mockResolvedValue(undefined);
const mockUpdateCampaignDoc = jest.fn().mockResolvedValue(undefined);
const mockCreateCampaignAssets = jest.fn().mockResolvedValue(undefined);
const mockGetCreativePreferencesByBusiness = jest.fn().mockResolvedValue([]);
const mockGetSavedStyleDoc = jest.fn().mockResolvedValue(null);
jest.mock('../../services/firestore', () => ({
  createCampaignDoc: (...args: unknown[]) => mockCreateCampaignDoc(...args),
  updateCampaignDoc: (...args: unknown[]) => mockUpdateCampaignDoc(...args),
  getBusinessDoc: (...args: unknown[]) => mockGetBusinessDoc(...args),
  getBrandKitDoc: (...args: unknown[]) => mockGetBrandKitDoc(...args),
  getProductDoc: (...args: unknown[]) => mockGetProductDoc(...args),
  createCampaignAssets: (...args: unknown[]) => mockCreateCampaignAssets(...args),
  getCreativePreferencesByBusiness: (...args: unknown[]) => mockGetCreativePreferencesByBusiness(...args),
  getSavedStyleDoc: (...args: unknown[]) => mockGetSavedStyleDoc(...args),
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

describeIfOutageSimulated(
  'generateCampaignStrategy — rate-limiter Firestore outage must not become unlimited AI access',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockVerifyBusinessAccess.mockResolvedValue(undefined);
      mockGetBusinessDoc.mockResolvedValue(makeBusiness());
    });

    it(
      'aborts before fetching business data, reserving credits, or invoking the AI pipeline',
      async () => {
        const userId = `user-${uuid()}`;

        function delay<T>(ms: number, value: T): Promise<T> {
          return new Promise((resolve) => setTimeout(() => resolve(value), ms));
        }

        const input = {
          businessId: 'biz-1',
          objective: 'weekend_offer' as const,
          offer: {
            headline: 'Weekend Special',
            price: 299,
            type: 'percentage' as const,
            validityStart: new Date().toISOString(),
            validityEnd: new Date(Date.now() + 86400000).toISOString(),
          },
          duration: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 86400000).toISOString(),
          },
          audience: { localities: ['Kondapur'] },
          cta: 'order_whatsapp' as const,
          localization: {
            country: 'India',
            state: 'Telangana',
            city: 'Hyderabad',
            locality: 'Kondapur',
            primaryLanguage: 'en' as const,
            secondaryLanguage: 'en' as const,
            languageMixing: 'minimal' as const,
            regionalStyle: 'neutral' as const,
            slangPreference: 'light' as const,
            audienceDescription: 'Local food lovers',
            brandTone: 'friendly' as const,
            campaignStyle: 'funny' as const,
            contentFormat: 'poster' as const,
          },
          idempotencyKey: uuid(),
        };

        // As established directly in rateLimit.failSafe.test.ts, a
        // checkRateLimit call against a genuinely unreachable Firestore
        // host does not resolve or reject within any practical test
        // window (confirmed against 20s/90s/182s of real wall-clock
        // time) — there is no timeout wrapping it. So the assertion this
        // test can make is bounded and honest: the callable does not
        // resolve SUCCESSFULLY within 5s, and critically, none of the
        // cost-sensitive collaborators downstream of checkRateLimit are
        // ever invoked in that window either.
        const outcome = await Promise.race([
          (generateCampaignStrategy as any)
            .run(callableRequest(input, userId))
            .then(() => 'resolved' as const)
            .catch(() => 'rejected' as const),
          delay(5000, 'still-pending' as const),
        ]);

        // The whole point: a broken rate-limiter persistence layer must
        // never silently become "unlimited access" to a cost-sensitive
        // AI operation. It does not resolve as a success, and — whether
        // it's still pending or has failed by 5s — none of these were
        // ever called.
        expect(outcome).not.toBe('resolved');
        expect(mockGetBusinessDoc).not.toHaveBeenCalled();
        expect(mockExecuteWithUsageControl).not.toHaveBeenCalled();
        expect(mockExecute).not.toHaveBeenCalled();
      },
      10_000
    );
  }
);



