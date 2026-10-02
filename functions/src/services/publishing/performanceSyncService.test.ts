import { PerformanceSyncService } from './performanceSyncService';
import {
  getCampaignDoc,
  getPublishJobDoc,
  getSocialConnectionDoc,
  getEncryptedCredentialDoc,
  listPublishJobsForCampaign,
  getPostPerformanceDoc,
  setPostPerformanceDoc,
  listPostPerformanceForCampaign,
  getCampaignPerformanceDoc,
} from '../firestore';
import { metaPerformanceProvider } from './providers/MetaPerformanceProvider';
import type { PublishJob } from '../../types/publishing';
import type { SocialConnection, EncryptedCredentialDoc } from '../../types/meta';

jest.mock('../firestore', () => ({
  getCampaignDoc: jest.fn(),
  getPublishJobDoc: jest.fn(),
  getSocialConnectionDoc: jest.fn(),
  getEncryptedCredentialDoc: jest.fn(),
  listPublishJobsForCampaign: jest.fn(),
  getPostPerformanceDoc: jest.fn(),
  setPostPerformanceDoc: jest.fn(),
  listPostPerformanceForCampaign: jest.fn(),
  getCampaignPerformanceDoc: jest.fn(),
}));

jest.mock('./providers/MetaPerformanceProvider', () => ({
  metaPerformanceProvider: {
    fetchPostPerformance: jest.fn(),
  },
}));

jest.mock('firebase-admin', () => {
  const setMock = jest.fn().mockResolvedValue(undefined);
  const docMock = jest.fn().mockReturnValue({ set: setMock });
  const collectionMock = jest.fn().mockReturnValue({ doc: docMock });
  return {
    firestore: Object.assign(() => ({ collection: collectionMock }), {
      FieldValue: { increment: (n: number) => n },
    }),
  };
});

describe('PerformanceSyncService — backend synchronization & ownership (Phase 17)', () => {
  let service: PerformanceSyncService;

  const mockJob: PublishJob = {
    jobId: 'pub_job_1',
    userId: 'user_1',
    businessId: 'biz_1',
    campaignId: 'camp_1',
    socialConnectionId: 'conn_1',
    platform: 'instagram',
    contentType: 'post',
    mediaUrl: 'https://storage.example.com/image.png',
    caption: 'Test Caption',
    status: 'published',
    attempts: 1,
    maxAttempts: 3,
    publishedAt: new Date().toISOString(),
    externalPostId: 'ig_ext_100',
    idempotencyKey: 'idem_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockConnection: SocialConnection = {
    connectionId: 'conn_1',
    userId: 'user_1',
    businessId: 'biz_1',
    provider: 'meta',
    status: 'active',
    facebookPage: { id: 'fb_page_1', name: 'Page 1' },
    instagram: { id: 'ig_acc_1', username: 'ig_user' },
    permissions: [],
    tokenReference: 'ref_1',
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { metaApiVersion: 'v20.0' },
  };

  const mockCredentials: EncryptedCredentialDoc = {
    connectionId: 'conn_1',
    userId: 'user_1',
    userAccessToken: { encryptedData: 'enc', iv: 'iv', authTag: 'tag' },
    pageAccessToken: { encryptedData: 'enc', iv: 'iv', authTag: 'tag' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    service = new PerformanceSyncService();
    jest.clearAllMocks();
  });

  it('syncPublishJobPerformance verifies ownership and updates performance record', async () => {
    (getPublishJobDoc as jest.Mock).mockResolvedValueOnce(mockJob);
    (getSocialConnectionDoc as jest.Mock).mockResolvedValueOnce(mockConnection);
    (getEncryptedCredentialDoc as jest.Mock).mockResolvedValueOnce(mockCredentials);
    (getPostPerformanceDoc as jest.Mock).mockResolvedValueOnce(null);
    (listPostPerformanceForCampaign as jest.Mock).mockResolvedValueOnce([]);
    (getCampaignPerformanceDoc as jest.Mock).mockResolvedValueOnce(null);

    (metaPerformanceProvider.fetchPostPerformance as jest.Mock).mockResolvedValueOnce({
      status: 'available',
      metrics: {
        likes: 120,
        comments: 15,
        reach: 1800,
        impressions: 2200,
        shares: 5,
        videoViews: null,
        clicks: null,
      },
    });

    const result = await service.syncPublishJobPerformance('user_1', 'pub_job_1');

    expect(result.performanceId).toBe('perf_pub_job_1');
    expect(result.status).toBe('available');
    expect(result.metrics.reach).toBe(1800);
    expect(setPostPerformanceDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        performanceId: 'perf_pub_job_1',
        campaignId: 'camp_1',
        externalPostId: 'ig_ext_100',
      })
    );
  });

  it('refuses synchronization if user does not own the publish job (ownership check)', async () => {
    (getPublishJobDoc as jest.Mock).mockResolvedValueOnce(mockJob); // userId is user_1

    await expect(
      service.syncPublishJobPerformance('user_attacker_99', 'pub_job_1')
    ).rejects.toThrow('You do not own this publish job.');
  });

  it('refuses synchronization if publish job is not in published status', async () => {
    (getPublishJobDoc as jest.Mock).mockResolvedValueOnce({
      ...mockJob,
      status: 'processing',
    });

    await expect(service.syncPublishJobPerformance('user_1', 'pub_job_1')).rejects.toThrow(
      "Publish job must be in 'published' status"
    );
  });

  it('handles revoked social connection safely without throwing (Failure Isolation)', async () => {
    (getPublishJobDoc as jest.Mock).mockResolvedValueOnce(mockJob);
    (getSocialConnectionDoc as jest.Mock).mockResolvedValueOnce({
      ...mockConnection,
      status: 'revoked',
    });

    const result = await service.syncPublishJobPerformance('user_1', 'pub_job_1');

    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('CONNECTION_REVOKED');
    expect(setPostPerformanceDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        errorCode: 'CONNECTION_REVOKED',
      })
    );
  });

  it('syncCampaignPerformance syncs all published posts for a campaign idempotently', async () => {
    (getCampaignDoc as jest.Mock).mockResolvedValueOnce({
      campaignId: 'camp_1',
      userId: 'user_1',
      businessId: 'biz_1',
    });

    const job2: PublishJob = { ...mockJob, jobId: 'pub_job_2', externalPostId: 'ig_ext_200' };
    (listPublishJobsForCampaign as jest.Mock).mockResolvedValueOnce([mockJob, job2]);

    (getPublishJobDoc as jest.Mock).mockResolvedValue(mockJob);
    (getSocialConnectionDoc as jest.Mock).mockResolvedValue(mockConnection);
    (getEncryptedCredentialDoc as jest.Mock).mockResolvedValue(mockCredentials);
    (getPostPerformanceDoc as jest.Mock).mockResolvedValue(null);
    (listPostPerformanceForCampaign as jest.Mock).mockResolvedValue([]);

    (metaPerformanceProvider.fetchPostPerformance as jest.Mock).mockResolvedValue({
      status: 'available',
      metrics: { likes: 50, comments: 2, reach: 500, impressions: 600 },
    });

    const records = await service.syncCampaignPerformance('user_1', 'camp_1');

    expect(records).toHaveLength(2);
    expect(setPostPerformanceDoc).toHaveBeenCalledTimes(2);
  });
});
