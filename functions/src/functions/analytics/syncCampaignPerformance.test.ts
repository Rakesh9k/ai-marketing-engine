import { syncCampaignPerformance } from './syncCampaignPerformance';
import { verifyBusinessAccess } from '../../middleware/auth';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getCampaignDoc } from '../../services/firestore';
import { performanceSyncService } from '../../services/publishing/performanceSyncService';

jest.mock('../../middleware/auth', () => ({
  verifyBusinessAccess: jest.fn(),
}));

jest.mock('../../middleware/rateLimit', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('../../services/firestore', () => ({
  getCampaignDoc: jest.fn(),
}));

jest.mock('../../services/publishing/performanceSyncService', () => ({
  performanceSyncService: {
    syncCampaignPerformance: jest.fn(),
  },
}));

function callableRequest(data: unknown, uid = 'user-1') {
  return { data, auth: { uid, token: {} as any } } as any;
}

describe('syncCampaignPerformance Cloud Function (Phase 17)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully verifies ownership and syncs performance data', async () => {
    (verifyBusinessAccess as jest.Mock).mockResolvedValueOnce(undefined);
    (checkRateLimit as jest.Mock).mockResolvedValueOnce(undefined);
    (getCampaignDoc as jest.Mock).mockResolvedValueOnce({
      campaignId: 'camp_1',
      businessId: 'biz_1',
      userId: 'user-1',
    });

    const mockRecords = [
      {
        performanceId: 'perf_job_1',
        campaignId: 'camp_1',
        platform: 'instagram',
        status: 'available',
        metrics: { reach: 1500, likes: 80 },
      },
    ];

    (performanceSyncService.syncCampaignPerformance as jest.Mock).mockResolvedValueOnce(
      mockRecords
    );

    const req = callableRequest({ businessId: 'biz_1', campaignId: 'camp_1' });
    const res = await (syncCampaignPerformance as any).run(req);

    expect(verifyBusinessAccess).toHaveBeenCalledWith('user-1', 'biz_1');
    expect(checkRateLimit).toHaveBeenCalledWith('user-1', 'syncCampaignPerformance');
    expect(performanceSyncService.syncCampaignPerformance).toHaveBeenCalledWith('user-1', 'camp_1');
    expect(res).toEqual({
      success: true,
      campaignId: 'camp_1',
      postsPerformance: mockRecords,
    });
  });

  it('rejects request when campaign does not belong to specified business', async () => {
    (verifyBusinessAccess as jest.Mock).mockResolvedValueOnce(undefined);
    (checkRateLimit as jest.Mock).mockResolvedValueOnce(undefined);
    (getCampaignDoc as jest.Mock).mockResolvedValueOnce({
      campaignId: 'camp_1',
      businessId: 'other_biz',
      userId: 'user-1',
    });

    const req = callableRequest({ businessId: 'biz_1', campaignId: 'camp_1' });

    await expect((syncCampaignPerformance as any).run(req)).rejects.toThrow(
      'This campaign does not belong to the specified business'
    );
  });
});
