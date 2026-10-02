import {
  getUserEntitlements,
  requireFeature,
  requirePlan,
  requireCampaignAllowance,
  requireReelAllowance,
  requireCreativeAllowance,
  requireStoryAllowance,
  requireBusinessAllowance,
  ENTITLEMENT_ERROR_CODES,
  PLAN_ENTITLEMENTS,
} from './entitlements';
import * as firestore from './firestore';

jest.mock('./firestore');
jest.mock('../utils/logging', () => ({
  logFunctionStart: () => ({ logger: console, startTime: Date.now() }),
  logFunctionComplete: jest.fn(),
  logFunctionError: jest.fn(),
}));

describe('Entitlements Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserEntitlements', () => {
    it('returns Free entitlements when no subscription exists', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue(null);
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue(null);

      const entitlements = await getUserEntitlements('user_1');
      expect(entitlements.plan).toBe('free');
      expect(entitlements.reelsPerMonth).toBe(0);
      expect(entitlements.creativesPerMonth).toBe(5);
      expect(entitlements.maxBusinesses).toBe(1);
    });

    it('returns Pro entitlements when active Pro subscription exists', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue({
        planId: 'pro',
        campaignsCreated: 5,
        imagesGenerated: 10,
      });
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue({
        planId: 'pro',
        status: 'active',
      });

      const entitlements = await getUserEntitlements('user_pro');
      expect(entitlements.plan).toBe('pro');
      expect(entitlements.reelsPerMonth).toBe(20);
      expect(entitlements.creativesPerMonth).toBe(60);
      expect(entitlements.storiesPerMonth).toBe(60);
      expect(entitlements.maxBusinesses).toBe(3);
      expect(entitlements.features.brandKit).toBe(true);
      expect(entitlements.features.multiBusiness).toBe(true);
    });
  });

  describe('requireReelAllowance', () => {
    it('throws PLAN_UPGRADE_REQUIRED for Free plan', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue({ planId: 'free' });
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue({ planId: 'free' });

      await expect(requireReelAllowance('user_free')).rejects.toThrow(
        expect.objectContaining({ code: ENTITLEMENT_ERROR_CODES.PLAN_UPGRADE_REQUIRED })
      );
    });

    it('allows Reel generation if within monthly quota on Pro plan', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue({ planId: 'pro', reelsCreated: 5 });
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue({ planId: 'pro' });

      await expect(requireReelAllowance('user_pro')).resolves.not.toThrow();
    });

    it('throws REEL_QUOTA_EXCEEDED when monthly limit reached', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue({ planId: 'pro', reelsCreated: 20 });
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue({ planId: 'pro' });

      await expect(requireReelAllowance('user_pro')).rejects.toThrow(
        expect.objectContaining({ code: ENTITLEMENT_ERROR_CODES.REEL_QUOTA_EXCEEDED })
      );
    });
  });

  describe('requireBusinessAllowance', () => {
    it('allows adding 2nd business on Pro plan (max 3)', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue({ planId: 'pro' });
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue({ planId: 'pro' });
      (firestore.getBusinessesByUser as jest.Mock).mockResolvedValue([{ id: 'b1' }]);

      await expect(requireBusinessAllowance('user_pro')).resolves.not.toThrow();
    });

    it('throws BUSINESS_LIMIT_REACHED when business count equals maxBusinesses', async () => {
      (firestore.getCurrentUsage as jest.Mock).mockResolvedValue({ planId: 'pro' });
      (firestore.getSubscriptionByUser as jest.Mock).mockResolvedValue({ planId: 'pro' });
      (firestore.getBusinessesByUser as jest.Mock).mockResolvedValue([
        { id: 'b1' },
        { id: 'b2' },
        { id: 'b3' },
      ]);

      await expect(requireBusinessAllowance('user_pro')).rejects.toThrow(
        expect.objectContaining({ code: ENTITLEMENT_ERROR_CODES.BUSINESS_LIMIT_REACHED })
      );
    });
  });
});
