import '../../testSetup';
import { SchedulingService } from './schedulingService';
import * as firestoreModule from '../firestore';

jest.mock('../firestore');

describe('SchedulingService', () => {
  let service: SchedulingService;

  const mockGetCampaignDoc = firestoreModule.getCampaignDoc as jest.MockedFunction<
    typeof firestoreModule.getCampaignDoc
  >;
  const mockGetSocialConnectionDoc = firestoreModule.getSocialConnectionDoc as jest.MockedFunction<
    typeof firestoreModule.getSocialConnectionDoc
  >;
  const mockCreateScheduledPostDoc = firestoreModule.createScheduledPostDoc as jest.MockedFunction<
    typeof firestoreModule.createScheduledPostDoc
  >;
  const mockGetScheduledPostDoc = firestoreModule.getScheduledPostDoc as jest.MockedFunction<
    typeof firestoreModule.getScheduledPostDoc
  >;
  const mockFindScheduledPostByIdempotency =
    firestoreModule.findScheduledPostByIdempotency as jest.MockedFunction<
      typeof firestoreModule.findScheduledPostByIdempotency
    >;
  const mockUpdateScheduledPostDoc = firestoreModule.updateScheduledPostDoc as jest.MockedFunction<
    typeof firestoreModule.updateScheduledPostDoc
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SchedulingService();
  });

  describe('createSchedule', () => {
    it('creates a new ScheduledPost for an approved campaign and active social connection', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-1',
        userId: 'user-1',
        businessId: 'biz-1',
        status: 'generated',
        outputs: {
          primaryImageUrl: 'https://storage.example.com/img.jpg',
          caption: 'Test Caption',
        },
      } as any);

      mockGetSocialConnectionDoc.mockResolvedValueOnce({
        connectionId: 'conn-1',
        userId: 'user-1',
        provider: 'meta',
        status: 'active',
        instagram: { id: 'ig-123', username: 'testuser' },
        facebookPage: { id: 'fb-123', name: 'Test Page' },
      } as any);

      mockFindScheduledPostByIdempotency.mockResolvedValueOnce(null);

      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const result = await service.createSchedule('user-1', {
        campaignId: 'camp-1',
        socialConnectionId: 'conn-1',
        platform: 'instagram',
        contentType: 'post',
        scheduledAt: futureDate,
        timezone: 'Asia/Kolkata',
      });

      expect(result.status).toBe('scheduled');
      expect(result.userId).toBe('user-1');
      expect(result.platform).toBe('instagram');
      expect(result.scheduledAt).toBe(futureDate);
      expect(mockCreateScheduledPostDoc).toHaveBeenCalled();
    });

    it('blocks schedule creation if campaign is not approved', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-2',
        userId: 'user-1',
        businessId: 'biz-1',
        status: 'draft',
      } as any);

      const futureDate = new Date(Date.now() + 3600000).toISOString();
      await expect(
        service.createSchedule('user-1', {
          campaignId: 'camp-2',
          socialConnectionId: 'conn-1',
          platform: 'instagram',
          contentType: 'post',
          scheduledAt: futureDate,
          timezone: 'Asia/Kolkata',
        })
      ).rejects.toThrow('Campaign must be generated/verified to be scheduled');
    });

    it('blocks schedule creation if user does not own social connection', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-1',
        userId: 'user-1',
        status: 'generated',
      } as any);

      mockGetSocialConnectionDoc.mockResolvedValueOnce(null);

      const futureDate = new Date(Date.now() + 3600000).toISOString();
      await expect(
        service.createSchedule('user-1', {
          campaignId: 'camp-1',
          socialConnectionId: 'conn-other',
          platform: 'instagram',
          contentType: 'post',
          scheduledAt: futureDate,
          timezone: 'Asia/Kolkata',
        })
      ).rejects.toThrow('Social connection "conn-other" not found');
    });

    it('returns existing post if duplicate idempotency key is submitted', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-1',
        userId: 'user-1',
        status: 'generated',
        outputs: { primaryImageUrl: 'https://storage.example.com/img.jpg' },
      } as any);

      mockGetSocialConnectionDoc.mockResolvedValueOnce({
        connectionId: 'conn-1',
        userId: 'user-1',
        provider: 'meta',
        status: 'active',
        instagram: { id: 'ig-123', username: 'testuser' },
        facebookPage: { id: 'fb-123', name: 'Test Page' },
      } as any);

      const existingPost = {
        scheduledPostId: 'sch-existing',
        status: 'scheduled',
        idempotencyKey: 'custom-key-123',
      } as any;

      mockFindScheduledPostByIdempotency.mockResolvedValueOnce(existingPost);

      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const result = await service.createSchedule('user-1', {
        campaignId: 'camp-1',
        socialConnectionId: 'conn-1',
        platform: 'instagram',
        contentType: 'post',
        scheduledAt: futureDate,
        timezone: 'Asia/Kolkata',
        idempotencyKey: 'custom-key-123',
      });

      expect(result.scheduledPostId).toBe('sch-existing');
      expect(mockCreateScheduledPostDoc).not.toHaveBeenCalled();
    });
  });

  describe('cancelSchedule', () => {
    it('cancels a scheduled post owned by the user', async () => {
      mockGetScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-100',
        userId: 'user-1',
        status: 'scheduled',
      } as any);

      mockUpdateScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-100',
        userId: 'user-1',
        status: 'cancelled',
      } as any);

      const result = await service.cancelSchedule('user-1', 'sch-100');
      expect(result.status).toBe('cancelled');
    });

    it('rejects cancellation if post is currently processing', async () => {
      mockGetScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-100',
        userId: 'user-1',
        status: 'processing',
      } as any);

      await expect(service.cancelSchedule('user-1', 'sch-100')).rejects.toThrow(
        'Cannot cancel scheduled post in "processing" state'
      );
    });
  });

  describe('reschedulePost', () => {
    it('reschedules a scheduled post with valid new time', async () => {
      mockGetScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-100',
        userId: 'user-1',
        status: 'scheduled',
      } as any);

      const newFutureDate = new Date(Date.now() + 7200000).toISOString();
      mockUpdateScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-100',
        scheduledAt: newFutureDate,
        timezone: 'America/New_York',
        status: 'scheduled',
      } as any);

      const result = await service.reschedulePost('user-1', {
        scheduledPostId: 'sch-100',
        newScheduledAt: newFutureDate,
        timezone: 'America/New_York',
      });

      expect(result.scheduledAt).toBe(newFutureDate);
      expect(result.timezone).toBe('America/New_York');
    });
  });

  describe('retryScheduledPost', () => {
    it('resets a failed post back to scheduled state', async () => {
      mockGetScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-failed',
        userId: 'user-1',
        status: 'failed',
      } as any);

      mockUpdateScheduledPostDoc.mockResolvedValueOnce({
        scheduledPostId: 'sch-failed',
        status: 'scheduled',
        attempts: 0,
      } as any);

      const result = await service.retryScheduledPost('user-1', 'sch-failed');
      expect(result.status).toBe('scheduled');
    });
  });
});
