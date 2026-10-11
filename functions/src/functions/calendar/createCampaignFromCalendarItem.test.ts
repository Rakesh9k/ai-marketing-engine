import { createCampaignFromCalendarItem } from './createCampaignFromCalendarItem';
import { executeWithUsageControl } from '../../services/usageControl';
import {
  getProductDoc,
  getBusinessDoc,
  getCampaignDoc,
  getCampaignByIdempotencyKey,
  createCampaignDoc,
} from '../../services/firestore';

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

const mockPipelineResult = {
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
};
const mockPipelineExecute = jest.fn();
jest.mock('../../services/ai/pipeline', () => ({
  GenerationPipeline: jest.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockPipelineExecute(...args),
  })),
}));

// Mock firebase-admin Firestore
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockItemDocGet = jest.fn();

jest.mock('firebase-admin', () => {
  const mockDoc = jest.fn((_docId: string) => ({
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
    mockPipelineExecute.mockResolvedValue(mockPipelineResult);

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

  const REAL_PRODUCT = {
    productId: 'prod_real_1',
    businessId: testBusinessId,
    name: 'Chicken Biryani',
    price: 349,
  };

  it('uses the real product price for the offer, never a made-up one', async () => {
    mockItemDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ...mockItemData,
        productId: REAL_PRODUCT.productId,
        productName: REAL_PRODUCT.name,
      }),
    });
    (getProductDoc as jest.Mock).mockResolvedValue(REAL_PRODUCT);
    const wrapped = (createCampaignFromCalendarItem as any).run;
    await wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } });

    const created = (createCampaignDoc as jest.Mock).mock.calls[0][0];
    expect(created.offer.price).toBe(349);
    expect(created.offer.type).toBe('fixed');
  });

  it.each([
    ['has no product', { productId: null }, null],
    [
      'has a product with no usable price',
      { productId: 'prod_real_1' },
      { ...REAL_PRODUCT, price: 0 },
    ],
  ])(
    'refuses, with nothing charged and nothing invented, when the item %s',
    async (_label, itemOver, product) => {
      mockItemDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockItemData, ...itemOver }),
      });
      (getProductDoc as jest.Mock).mockResolvedValue(product);
      const wrapped = (createCampaignFromCalendarItem as any).run;

      await expect(
        wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } })
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        message: expect.stringMatching(/product/i),
      });

      expect(executeWithUsageControl).not.toHaveBeenCalled(); // no credits reserved
      expect(createCampaignDoc).not.toHaveBeenCalled(); // no campaign, so no invented price anywhere
    }
  );

  describe("the owner's localisation is what the pipeline receives (never an invented Hyderabad / Telugu)", () => {
    const run = async (business: Record<string, unknown>) => {
      mockItemDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockItemData,
          productId: REAL_PRODUCT.productId,
          productName: REAL_PRODUCT.name,
        }),
      });
      (getProductDoc as jest.Mock).mockResolvedValue(REAL_PRODUCT);
      (getBusinessDoc as jest.Mock).mockResolvedValue({ ...mockBusinessData, ...business });
      const wrapped = (createCampaignFromCalendarItem as any).run;
      await wrapped({ data: { calendarItemId: testItemId }, auth: { uid: testUserId } });
      return mockPipelineExecute.mock.calls[0][0].localizationProfile;
    };

    it('a Mumbai Hinglish business: Mumbai, Maharashtra, Hindi', async () => {
      const profile = await run({
        location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
        businessBrain: { localization: { primaryLanguage: 'hi_en', regionalStyle: 'mumbai' } },
      });
      expect(profile).toMatchObject({
        city: 'Mumbai',
        state: 'Maharashtra',
        locality: 'Bandra',
        primaryLanguage: 'hi_en',
        secondaryLanguage: 'hi',
        regionalStyle: 'mumbai',
        languageMixing: 'natural',
      });
    });

    it('a stale secondary language ("te") next to primary English does not survive', async () => {
      const profile = await run({
        location: { city: 'Pune', state: 'Maharashtra', locality: 'Kothrud' },
        businessBrain: { localization: { primaryLanguage: 'en', secondaryLanguage: 'te' } },
      });
      expect(profile.primaryLanguage).toBe('en');
      expect(profile.secondaryLanguage).toBe('en');
      expect(profile.languageMixing).toBe('minimal');
    });

    it('a business with no stored localisation is English, not Telugu; and its place is its own', async () => {
      const profile = await run({
        location: { city: 'Pune', state: 'Maharashtra' },
        businessBrain: {},
      });
      expect(profile).toMatchObject({
        primaryLanguage: 'en',
        secondaryLanguage: 'en',
        regionalStyle: 'neutral',
      });
      expect(JSON.stringify(profile)).not.toMatch(/hyderabad|telangana|"te"/i);
    });

    it('missing location parts are left empty, never filled with Hyderabad / Telangana', async () => {
      const profile = await run({ location: {}, businessBrain: {} });
      expect(profile.city).toBe('');
      expect(profile.state).toBe('');
      expect(JSON.stringify(profile)).not.toMatch(/hyderabad|telangana/i);
    });

    it('a Telugu + English business keeps Telugu (it asked for it)', async () => {
      const profile = await run({
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        businessBrain: { localization: { primaryLanguage: 'te_en', regionalStyle: 'hyderabadi' } },
      });
      expect(profile).toMatchObject({
        primaryLanguage: 'te_en',
        secondaryLanguage: 'te',
        regionalStyle: 'hyderabadi',
      });
    });
  });

  it('successfully generates campaign, links calendar item, and updates plan count', async () => {
    mockItemDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ...mockItemData,
        productId: REAL_PRODUCT.productId,
        productName: REAL_PRODUCT.name,
      }),
    });
    (getProductDoc as jest.Mock).mockResolvedValue(REAL_PRODUCT);
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
