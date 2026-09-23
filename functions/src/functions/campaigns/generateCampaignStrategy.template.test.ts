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
const mockGetProductDoc = jest.fn().mockResolvedValue({ id: 'prod-1', businessId: 'biz-1', name: 'Pizza', price: 10, images: [] });
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

describe('generateCampaignStrategy Phase 11 Template Integration', () => {
  const defaultUid = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBusinessDoc.mockResolvedValue(makeBusiness());
    
    // Default success behavior for executeWithUsageControl:
    mockExecuteWithUsageControl.mockImplementation(async (userId, operationId, operationType, work) => {
      return await work();
    });
    
    mockExecute.mockResolvedValue({
      campaignPack: { assets: [{ id: 'mock-asset', assetId: 'mock-asset', type: 'post' }] }, 
      creativeContext: {},
      adaptedCreativePlan: { hook: 'Plan Hook', messaging: ['msg1'] },
      visualStrategy: { layout: 'centered' },
      images: ['img_id_1'],
      compositedAssets: [{ assetId: 'img_id_1', url: 'https://test', storagePath: 'test' }],
      text: { headline: 'Test', primaryText: 'Test text', callToAction: 'Order' },
      stages: [],
      executionTimeMs: 100
    });
  });

  const getBaseData = () => ({
    businessId: 'biz-1',
    objective: 'weekend_offer',
    creativeObjective: 'conversion',
    productId: 'prod-1',
    offer: {
      headline: 'Offer',
      price: 10,
      type: 'percentage',
      validityStart: '2026-10-01T00:00:00.000Z',
      validityEnd: '2026-10-02T00:00:00.000Z',
    },
    duration: { start: '2026-10-01T00:00:00.000Z', end: '2026-10-02T00:00:00.000Z' },
    audience: { localities: ['Kondapur'], ageRange: { min: 18, max: 60 } },
    cta: 'order_whatsapp',
    localization: { country: 'India', state: 'Telangana', city: 'Hyderabad', primaryLanguage: 'en', secondaryLanguage: 'te', languageMixing: 'minimal', regionalStyle: 'neutral', slangPreference: 'light', audienceDescription: 'foodies', brandTone: 'friendly', campaignStyle: 'funny', locality: 'Kondapur', contentFormat: 'poster' },
    idempotencyKey: uuid(),
  });

  it('completes end-to-end flow for post-product-hero', async () => {
    const data = { ...getBaseData(), templateId: 'post-product-hero' };
    const req = callableRequest(data, defaultUid);
    
    await generateCampaignStrategy.run(req);
    
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const executeArgs = mockExecute.mock.calls[0][0];
    expect(executeArgs.templateId).toBe('post-product-hero');
    expect(executeArgs.creativeObjective).toBe('conversion');
  });

  it('completes end-to-end flow for post-offer', async () => {
    const data = { ...getBaseData(), templateId: 'post-offer', creativeObjective: 'engagement' };
    const req = callableRequest(data, defaultUid);
    
    await generateCampaignStrategy.run(req);
    
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const executeArgs = mockExecute.mock.calls[0][0];
    expect(executeArgs.templateId).toBe('post-offer');
    expect(executeArgs.creativeObjective).toBe('engagement');
  });

  it('proves that switching templates changes the pipeline invocation', async () => {
    const req1 = callableRequest({ ...getBaseData(), templateId: 'post-product-hero' }, defaultUid);
    await generateCampaignStrategy.run(req1);
    const template1 = mockExecute.mock.calls[0][0].templateId;
    
    mockExecute.mockClear();
    
    const req2 = callableRequest({ ...getBaseData(), templateId: 'post-offer' }, defaultUid);
    await generateCampaignStrategy.run(req2);
    const template2 = mockExecute.mock.calls[0][0].templateId;
    
    expect(template1).not.toEqual(template2);
  });
  
  
});


