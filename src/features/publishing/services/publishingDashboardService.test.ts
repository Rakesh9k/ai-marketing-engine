import { publishingDashboardService } from './publishingDashboardService';
import { getDocs } from 'firebase/firestore';

jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    getFirebaseDb: jest.fn(() => ({})),
    collection: jest.fn(() => ({
      withConverter: jest.fn(() => ({})),
    })),
    query: jest.fn(() => ({})),
    where: jest.fn(() => ({})),
    limit: jest.fn(() => ({})),
    getDocs: jest.fn(),
  };
});

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: jest.fn(() => ({})),
}));

jest.mock('@/features/meta/services/metaService', () => ({
  metaService: {
    listSocialConnections: jest.fn().mockResolvedValue({
      connections: [
        {
          connectionId: 'conn-1',
          provider: 'meta',
          status: 'active',
          facebookPage: { id: 'fb-1', name: 'Test Page' },
          instagram: { id: 'ig-1', username: 'test_ig' },
        },
      ],
    }),
  },
}));

describe('publishingDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty dashboard data if userId is empty', async () => {
    const data = await publishingDashboardService.getDashboardData('');
    expect(data.scheduledPosts).toEqual([]);
    expect(data.publishJobs).toEqual([]);
    expect(data.summary.totalScheduled).toBe(0);
  });

  it('aggregates and formats scheduled posts and publish jobs', async () => {
    // Mock getDocs returns for scheduledPosts, publishJobs, and campaigns
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              scheduledPostId: 'sched-1',
              userId: 'user-1',
              businessId: 'biz-1',
              campaignId: 'camp-1',
              socialConnectionId: 'conn-1',
              platform: 'instagram',
              contentType: 'post',
              scheduledAt: '2026-10-01T10:00:00.000Z',
              timezone: 'Asia/Kolkata',
              status: 'scheduled',
              createdAt: '2026-09-28T10:00:00.000Z',
              updatedAt: '2026-09-28T10:00:00.000Z',
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              jobId: 'job-1',
              userId: 'user-1',
              businessId: 'biz-1',
              campaignId: 'camp-1',
              socialConnectionId: 'conn-1',
              platform: 'facebook',
              contentType: 'post',
              mediaUrl: 'https://example.com/image.jpg',
              caption: 'Test caption',
              status: 'published',
              publishedAt: '2026-09-28T11:00:00.000Z',
              createdAt: '2026-09-28T10:30:00.000Z',
              updatedAt: '2026-09-28T11:00:00.000Z',
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              campaignId: 'camp-1',
              businessId: 'biz-1',
              userId: 'user-1',
              objective: 'weekend_offer',
              offer: { headline: 'Special Biryani Offer' },
              status: 'approved',
              createdAt: '2026-09-28T09:00:00.000Z',
              updatedAt: '2026-09-28T09:00:00.000Z',
            }),
          },
        ],
      });

    const data = await publishingDashboardService.getDashboardData('user-1', 'biz-1');

    expect(data.scheduledPosts.length).toBe(1);
    expect(data.scheduledPosts[0]!.campaignTitle).toBe('Special Biryani Offer');
    expect(data.scheduledPosts[0]!.connectionStatus).toBe('active');

    expect(data.publishJobs.length).toBe(1);
    expect(data.publishJobs[0]!.status).toBe('published');

    expect(data.summary.totalScheduled).toBe(1);
    expect(data.summary.totalPublished).toBe(1);
    expect(data.summary.totalFailed).toBe(0);
  });
});
