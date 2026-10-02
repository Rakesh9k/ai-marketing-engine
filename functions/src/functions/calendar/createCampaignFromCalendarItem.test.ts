import { createCampaignFromCalendarItem } from './createCampaignFromCalendarItem';
import {
  getBusinessDoc,
  getCampaignDoc,
  getCampaignByIdempotencyKey,
  createCampaignDoc,
  updateCampaignDoc,
  getBrandKitDoc,
  getProductDoc,
  createCampaignAssets,
} from '../../services/firestore';
import { executeWithUsageControl } from '../../services/usageControl';
import * as admin from 'firebase-admin';

// Mock dependencies
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: jest.fn((n: number) => n),
    serverTimestamp: jest.fn(() => new Date().toISOString()),
  },
}));

jest.mock('../../middleware/auth', () => ({
  verifyBusinessAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../middleware/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/usageControl', () => ({
  executeWithUsageControl: jest.fn().mockImplementation(async (_userId, _opId, _type, fn) => {
    const result = await fn();
    return { result, creditsUsed: 1 };
  }),
  getGenerationCost: jest.fn().mockReturnValue(1),
  USAGE_ERROR_CODES: {
    INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
    SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  },
}));

jest.mock('../../services/firestore', () => ({
  getBusinessDoc: jest.fn(),
  getCampaignDoc: jest.fn(),
  getCampaignByIdempotencyKey: jest.fn(),
  createCampaignDoc: jest.fn().mockResolvedValue(undefined),
  updateCampaignDoc: jest.fn().mockResolvedValue(undefined),
  getBrandKitDoc: jest.fn().mockResolvedValue(null),
  getProductDoc: jest.fn().mockResolvedValue(null),
  createCampaignAssets: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/analyticsService', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  trackCreativeEvent: jest.fn().mockResolvedValue(undefined),
  trackCampaignApproved: jest.fn().mockResolvedValue(undefined),
  ANALYTICS_EVENTS: {
    CAMPAIGN_STARTED: 'campaign_started',
    CAMPAIGN_GENERATED: 'campaign_generated',
    CAMPAIGN_APPROVED: 'campaign_approved',
  },
}));

jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      campaignPack: {
        truthCheck: { status: 'PASS', summary: 'Facts verified' },
        assets: [
          {
            assetId: 'asset_1',
            type: 'poster',
            index: 0,
            content: { headline: 'Test Poster' },
            imageUrl: 'https://storage.example.com/poster.svg',
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }),
  })),
}));

// Mock firebase-admin Firestore
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockItemDocGet = jest.fn();

jest.mock('firebase-admin', () => {
  const mockDoc = jest.fn((docId: string) => ({
    get: mockItemDocGet,
    update: mockUpdate,
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
  }));
  return {
    firestore: jest.fn(() => ({
      collection: mockCollection,
    })),
    apps: [{}],
  };
});

describe('createCampaignFromCalendarItem Cloud Function', () => {
  const testUserId = 'user_cal_test_123';
  const testBusinessId = 'biz_cal_test_123';
  const testPlanId = 'plan_test_123';
  const testItemId = 'cal_test_item_123';

  const mockItemData = {
    itemId: testItemId,
    planId: testPlanId,
    userId: testUserId,
    businessId: testBusinessId,
    scheduledDate: '2026-10-05',
    suggestedTime: '19:30',
    timezone: 'Asia/Kolkata',
    contentType: 'post',
    strategy: 'weekend_offer',
    topic: 'Biryani Special Offer',
    hook: 'Weekend craving for authentic Biryani?',
    callToAction: 'Order on WhatsApp',
    offerHeadline: '20% OFF Biryani',
    status: 'planned',
    campaignId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockBusinessData = {
    businessId: testBusinessId,
    userId: testUserId,
    name: 'Spice Garden',
    category: 'restaurant',
    status: 'active',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
    contact: { phone: '+919876543210', whatsapp: '+919876543210' },
    businessBrain: {
      identity: { name: 'Spice Garden', category: 'restaurant' },
      localization: { primaryLanguage: 'en', secondaryLanguage: 'te' },
      brand: { tone: 'professional' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockItemDocGet.mockResolvedValue({
      exists: true,
      data: () => mockItemData,
    });

    (getBusinessDoc as jest.Mock).mockResolvedValue(mockBusinessData);
    (getCampaignByIdempotencyKey as jest.Mock).mockResolvedValue(null);
    (getCampaignDoc as jest.Mock).mockResolvedValue(null);
  });

  it('throws unauthenticated error when context auth is missing', async () => {
    const wrapped = (createCampaignFromCalendarItem as any).run;
    await expect(wrapped({ data: { calendarItemId: testItemId }, auth: null })).rejects.toThrow();
  });

  it('throws 404 not-found if calendar item does not exist', async () => {
    mockItemDocGet.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });

    const wrapped = (createCampaignFromCalendarItem as any).run;
    await expect(
      wrapped({ data: { calendarItemId: 'non_existent_item' }, auth: { uid: testUserId } })
    ).rejects.toThrow('Calendar item not found');
  });

  it('throws permission-denied if calendar item belongs to another user', async () => {
    mockItemDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ...mockItemData, userId: 'other_user_999' }),
    });

    const wrapped = (createCampaignFromCalendarItem as any).run;
    await expect(
      wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } })
    ).rejects.toThrow('Unauthorized calendar item access');
  });

  it('throws failed-precondition if calendar item status is skipped', async () => {
    mockItemDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ...mockItemData, status: 'skipped' }),
    });

    const wrapped = (createCampaignFromCalendarItem as any).run;
    await expect(
      wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } })
    ).rejects.toThrow('Cannot create campaign for a skipped calendar item');
  });

  it('returns existing campaign if calendar item already has a campaignId (idempotent)', async () => {
    const existingCampaignId = 'camp_already_created_123';
    const mockExistingCampaign = {
      campaignId: existingCampaignId,
      businessId: testBusinessId,
      userId: testUserId,
      sourceCalendarItemId: testItemId,
      objective: 'weekend_offer',
      status: 'verified',
    };

    mockItemDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ...mockItemData, campaignId: existingCampaignId, status: 'content_created' }),
    });
    (getCampaignDoc as jest.Mock).mockResolvedValueOnce(mockExistingCampaign);

    const wrapped = (createCampaignFromCalendarItem as any).run;
    const res = await wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } });

    expect(res).toBeDefined();
    expect(res.campaignId).toBe(existingCampaignId);
    expect(res.alreadyExisted).toBe(true);
  });

  it('successfully generates campaign, links calendar item, and updates plan count', async () => {
    const wrapped = (createCampaignFromCalendarItem as any).run;
    const res = await wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } });

    expect(res).toBeDefined();
    expect(res.campaignId).toBeDefined();

    expect(createCampaignDoc).toHaveBeenCalled();
    const createdCampaignArg = (createCampaignDoc as jest.Mock).mock.calls[0][0];
    expect(createdCampaignArg.sourceCalendarItemId).toBe(testItemId);
    expect(createdCampaignArg.businessId).toBe(testBusinessId);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: res.campaignId,
        status: 'content_created',
      })
    );
  });
});
