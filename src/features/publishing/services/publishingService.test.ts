import { publishingService } from './publishingService';
import { callFunction } from '@/services/api';

jest.mock('@/services/api', () => ({
  callFunction: jest.fn(),
}));

describe('frontend publishingService', () => {
  const mockCallFunction = callFunction as jest.MockedFunction<typeof callFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createPublishJob calls createPublishJob Cloud Function', async () => {
    const mockJob = { jobId: 'job-1', status: 'processing' } as any;
    mockCallFunction.mockResolvedValueOnce({ job: mockJob });

    const res = await publishingService.createPublishJob({
      campaignId: 'camp-1',
      socialConnectionId: 'conn-1',
      platform: 'instagram',
      contentType: 'post',
    });

    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'createPublishJob',
      data: {
        campaignId: 'camp-1',
        socialConnectionId: 'conn-1',
        platform: 'instagram',
        contentType: 'post',
      },
    });
    expect(res.job).toEqual(mockJob);
  });

  it('cancelPublishJob calls cancelPublishJob Cloud Function', async () => {
    const mockJob = { jobId: 'job-1', status: 'cancelled' } as any;
    mockCallFunction.mockResolvedValueOnce({ job: mockJob });

    const res = await publishingService.cancelPublishJob('job-1');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'cancelPublishJob',
      data: { jobId: 'job-1' },
    });
    expect(res.job.status).toBe('cancelled');
  });

  it('retryPublishJob calls retryPublishJob Cloud Function', async () => {
    mockCallFunction.mockResolvedValueOnce({ success: true, job: {} as any });

    const res = await publishingService.retryPublishJob('job-1');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'retryPublishJob',
      data: { jobId: 'job-1' },
    });
    expect(res.success).toBe(true);
  });

  it('listCampaignPublishJobs calls listCampaignPublishJobs Cloud Function', async () => {
    mockCallFunction.mockResolvedValueOnce({ jobs: [] });

    const res = await publishingService.listCampaignPublishJobs('camp-1');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'listCampaignPublishJobs',
      data: { campaignId: 'camp-1' },
    });
    expect(res.jobs).toEqual([]);
  });
});
