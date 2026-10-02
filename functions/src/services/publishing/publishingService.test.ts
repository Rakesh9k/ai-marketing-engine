import '../../testSetup';
import { PublishingService } from './publishingService';
import * as firestoreModule from '../firestore';
import { publishingProviderFactory } from './publishingProviderFactory';
import { validateAndResolveMedia } from './mediaValidation';

jest.mock('../firestore');
jest.mock('./publishingProviderFactory');
jest.mock('./mediaValidation');

describe('PublishingService', () => {
  let service: PublishingService;

  const mockGetCampaignDoc = firestoreModule.getCampaignDoc as jest.MockedFunction<
    typeof firestoreModule.getCampaignDoc
  >;
  const mockGetSocialConnectionDoc = firestoreModule.getSocialConnectionDoc as jest.MockedFunction<
    typeof firestoreModule.getSocialConnectionDoc
  >;
  const mockGetEncryptedCredentialDoc =
    firestoreModule.getEncryptedCredentialDoc as jest.MockedFunction<
      typeof firestoreModule.getEncryptedCredentialDoc
    >;
  const mockCreatePublishJobDoc = firestoreModule.createPublishJobDoc as jest.MockedFunction<
    typeof firestoreModule.createPublishJobDoc
  >;
  const mockGetPublishJobDoc = firestoreModule.getPublishJobDoc as jest.MockedFunction<
    typeof firestoreModule.getPublishJobDoc
  >;
  const mockFindJobByIdempotency = firestoreModule.findJobByIdempotency as jest.MockedFunction<
    typeof firestoreModule.findJobByIdempotency
  >;
  const mockUpdatePublishJobDoc = firestoreModule.updatePublishJobDoc as jest.MockedFunction<
    typeof firestoreModule.updatePublishJobDoc
  >;
  const mockValidateMedia = validateAndResolveMedia as jest.MockedFunction<
    typeof validateAndResolveMedia
  >;
  const mockGetProvider = publishingProviderFactory.getProvider as jest.MockedFunction<
    typeof publishingProviderFactory.getProvider
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublishingService();
  });

  describe('createPublishJob', () => {
    it('creates and executes Publish Now job for approved campaign', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-100',
        userId: 'user-1',
        businessId: 'biz-1',
        status: 'verified',
        newProduct: { images: ['https://storage.googleapis.com/bucket/img.png'] },
        offer: { headline: '20% Off Coffee' },
      } as any);

      mockGetSocialConnectionDoc.mockResolvedValueOnce({
        connectionId: 'conn-100',
        userId: 'user-1',
        provider: 'meta',
        status: 'active',
        facebookPage: { id: 'page-1', name: 'Coffee Shop' },
        instagram: { id: 'ig-1', username: 'coffeeshop' },
      } as any);

      mockValidateMedia.mockResolvedValueOnce('https://storage.googleapis.com/bucket/img.png');
      mockFindJobByIdempotency.mockResolvedValueOnce(null);

      mockCreatePublishJobDoc.mockImplementation(async (job) => job);
      mockGetPublishJobDoc.mockResolvedValueOnce({
        jobId: 'pub-100',
        userId: 'user-1',
        businessId: 'biz-1',
        campaignId: 'camp-100',
        socialConnectionId: 'conn-100',
        platform: 'instagram',
        contentType: 'post',
        mediaUrl: 'https://storage.googleapis.com/bucket/img.png',
        caption: '20% Off Coffee',
        status: 'processing',
        attempts: 0,
        maxAttempts: 3,
        idempotencyKey: 'idemp-100',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockGetEncryptedCredentialDoc.mockResolvedValueOnce({
        connectionId: 'conn-100',
        userId: 'user-1',
        userAccessToken: { encryptedData: 'data', iv: 'iv', authTag: 'tag' },
      } as any);

      const mockProviderInstance = {
        publishPost: jest.fn().mockResolvedValueOnce({ externalPostId: 'ig-post-555' }),
        publishReel: jest.fn(),
      };
      mockGetProvider.mockReturnValueOnce(mockProviderInstance as any);
      mockUpdatePublishJobDoc.mockImplementation(
        async (id, updates) =>
          ({
            jobId: id,
            ...updates,
          }) as any
      );

      const job = await service.createPublishJob('user-1', {
        campaignId: 'camp-100',
        socialConnectionId: 'conn-100',
        platform: 'instagram',
        contentType: 'post',
      });

      expect(job.campaignId).toBe('camp-100');
      expect(mockCreatePublishJobDoc).toHaveBeenCalled();
    });

    it('rejects campaign publishing when campaign is in unapproved status (draft)', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-200',
        userId: 'user-1',
        status: 'draft',
      } as any);

      await expect(
        service.createPublishJob('user-1', {
          campaignId: 'camp-200',
          socialConnectionId: 'conn-100',
          platform: 'instagram',
          contentType: 'post',
        })
      ).rejects.toThrow(/Campaign must be generated or approved/i);
    });

    it('returns existing job if duplicate idempotency key is submitted', async () => {
      mockGetCampaignDoc.mockResolvedValueOnce({
        campaignId: 'camp-100',
        userId: 'user-1',
        businessId: 'biz-1',
        status: 'verified',
        newProduct: { images: ['https://storage.googleapis.com/bucket/img.png'] },
      } as any);

      mockGetSocialConnectionDoc.mockResolvedValueOnce({
        connectionId: 'conn-100',
        userId: 'user-1',
        status: 'active',
      } as any);

      mockValidateMedia.mockResolvedValueOnce('https://storage.googleapis.com/bucket/img.png');

      const existingJob: any = {
        jobId: 'pub-existing',
        userId: 'user-1',
        status: 'published',
        externalPostId: 'ext-99',
      };
      mockFindJobByIdempotency.mockResolvedValueOnce(existingJob);

      const result = await service.createPublishJob('user-1', {
        campaignId: 'camp-100',
        socialConnectionId: 'conn-100',
        platform: 'instagram',
        contentType: 'post',
        idempotencyKey: 'idemp-custom',
      });

      expect(result).toEqual(existingJob);
      expect(mockCreatePublishJobDoc).not.toHaveBeenCalled();
    });
  });

  describe('cancelPublishJob', () => {
    it('cancels scheduled publish job', async () => {
      mockGetPublishJobDoc.mockResolvedValueOnce({
        jobId: 'pub-sched-1',
        userId: 'user-1',
        status: 'scheduled',
      } as any);
      mockUpdatePublishJobDoc.mockResolvedValueOnce({
        jobId: 'pub-sched-1',
        userId: 'user-1',
        status: 'cancelled',
      } as any);

      const res = await service.cancelPublishJob('user-1', 'pub-sched-1');
      expect(res.status).toBe('cancelled');
    });

    it('rejects cancellation of processing or published job', async () => {
      mockGetPublishJobDoc.mockResolvedValueOnce({
        jobId: 'pub-published-1',
        userId: 'user-1',
        status: 'published',
      } as any);

      await expect(service.cancelPublishJob('user-1', 'pub-published-1')).rejects.toThrow(
        /Only scheduled jobs can be cancelled/i
      );
    });
  });
});
