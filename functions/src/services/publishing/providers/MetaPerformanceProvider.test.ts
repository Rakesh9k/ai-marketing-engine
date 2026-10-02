import { MetaPerformanceProvider } from './MetaPerformanceProvider';
import { metaGraphClient, MetaGraphError } from '../../meta/graphClient';
import type { SocialConnection, EncryptedCredentialDoc } from '../../../types/meta';

jest.mock('../../meta/crypto', () => ({
  decryptToken: jest.fn().mockReturnValue('mock_access_token_123'),
}));

jest.mock('../../meta/graphClient', () => {
  const original = jest.requireActual('../../meta/graphClient');
  return {
    ...original,
    metaGraphClient: {
      fetchNode: jest.fn(),
      fetchInsights: jest.fn(),
    },
  };
});

describe('MetaPerformanceProvider — normalized Meta metrics retrieval (Phase 17)', () => {
  let provider: MetaPerformanceProvider;
  const mockConnection: SocialConnection = {
    connectionId: 'conn_1',
    userId: 'user_1',
    businessId: 'biz_1',
    provider: 'meta',
    status: 'active',
    facebookPage: { id: 'fb_page_1', name: 'Test Page' },
    instagram: { id: 'ig_acc_1', username: 'test_ig' },
    permissions: ['instagram_basic', 'pages_read_engagement'],
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
    provider = new MetaPerformanceProvider();
    jest.clearAllMocks();
  });

  it('fetches and normalizes Instagram image post metrics correctly', async () => {
    (metaGraphClient.fetchNode as jest.Mock).mockResolvedValueOnce({
      like_count: 142,
      comments_count: 18,
      media_type: 'IMAGE',
    });
    (metaGraphClient.fetchInsights as jest.Mock).mockResolvedValueOnce({
      data: [
        { name: 'reach', values: [{ value: 2450 }] },
        { name: 'impressions', values: [{ value: 3100 }] },
        { name: 'shares', values: [{ value: 12 }] },
      ],
    });

    const result = await provider.fetchPostPerformance({
      platform: 'instagram',
      contentType: 'post',
      externalPostId: 'ig_post_100',
      socialConnection: mockConnection,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('available');
    expect(result.metrics).toEqual({
      likes: 142,
      comments: 18,
      reach: 2450,
      impressions: 3100,
      shares: 12,
      videoViews: null,
      clicks: null, // Clicks unavailable on IG image
    });
  });

  it('fetches and normalizes Instagram Reel video metrics correctly', async () => {
    (metaGraphClient.fetchNode as jest.Mock).mockResolvedValueOnce({
      like_count: 320,
      comments_count: 45,
      media_type: 'VIDEO',
    });
    (metaGraphClient.fetchInsights as jest.Mock).mockResolvedValueOnce({
      data: [
        { name: 'plays', values: [{ value: 5400 }] },
        { name: 'reach', values: [{ value: 4100 }] },
        { name: 'shares', values: [{ value: 89 }] },
      ],
    });

    const result = await provider.fetchPostPerformance({
      platform: 'instagram',
      contentType: 'reel',
      externalPostId: 'ig_reel_200',
      socialConnection: mockConnection,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('available');
    expect(result.metrics.videoViews).toBe(5400);
    expect(result.metrics.reach).toBe(4100);
    expect(result.metrics.clicks).toBeNull();
  });

  it('fetches and normalizes Facebook Page post metrics including clicks', async () => {
    (metaGraphClient.fetchNode as jest.Mock).mockResolvedValueOnce({
      likes: { summary: { total_count: 85 } },
      comments: { summary: { total_count: 14 } },
      shares: { count: 6 },
    });
    (metaGraphClient.fetchInsights as jest.Mock).mockResolvedValueOnce({
      data: [
        { name: 'post_impressions_unique', values: [{ value: 1800 }] },
        { name: 'post_impressions', values: [{ value: 2200 }] },
        { name: 'post_clicks', values: [{ value: 42 }] },
      ],
    });

    const result = await provider.fetchPostPerformance({
      platform: 'facebook',
      contentType: 'post',
      externalPostId: 'fb_post_300',
      socialConnection: mockConnection,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('available');
    expect(result.metrics).toEqual({
      likes: 85,
      comments: 14,
      reach: 1800,
      impressions: 2200,
      shares: 6,
      videoViews: null,
      clicks: 42,
    });
  });

  it('does NOT convert missing metrics to 0 — preserves null for unavailable metrics', async () => {
    (metaGraphClient.fetchNode as jest.Mock).mockResolvedValueOnce({
      like_count: 10,
    });
    (metaGraphClient.fetchInsights as jest.Mock).mockResolvedValueOnce({
      data: [],
    });

    const result = await provider.fetchPostPerformance({
      platform: 'instagram',
      contentType: 'post',
      externalPostId: 'ig_post_missing',
      socialConnection: mockConnection,
      credentials: mockCredentials,
    });

    expect(result.metrics.likes).toBe(10);
    expect(result.metrics.comments).toBeNull();
    expect(result.metrics.reach).toBeNull();
    expect(result.metrics.impressions).toBeNull();
    expect(result.metrics.clicks).toBeNull();
  });

  it('normalizes CONNECTION_REVOKED error when token is expired or revoked', async () => {
    (metaGraphClient.fetchNode as jest.Mock).mockRejectedValueOnce(
      new MetaGraphError('190', 'Session has expired', 400, { code: 190, error_subcode: 463 })
    );

    const result = await provider.fetchPostPerformance({
      platform: 'instagram',
      contentType: 'post',
      externalPostId: 'ig_post_err',
      socialConnection: mockConnection,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('CONNECTION_REVOKED');
    expect(result.errorMessage).toBe('Meta connection expired or revoked');
  });

  it('normalizes POST_NOT_FOUND error when published post is deleted on Meta', async () => {
    (metaGraphClient.fetchNode as jest.Mock).mockRejectedValueOnce(
      new MetaGraphError('100', 'Unsupported get request. Object with ID does not exist', 400, {
        code: 100,
      })
    );

    const result = await provider.fetchPostPerformance({
      platform: 'facebook',
      contentType: 'post',
      externalPostId: 'fb_deleted_post',
      socialConnection: mockConnection,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('POST_NOT_FOUND');
    expect(result.errorMessage).toBe('Published post not found on Meta');
  });
});
