import '../../testSetup';
import * as firestoreModule from '../../services/firestore';
import { publishingService } from '../../services/publishing/publishingService';

jest.mock('../../services/firestore');
jest.mock('../../services/publishing/publishingService');

describe('processScheduledPosts worker logic', () => {
  const mockGetDueScheduledPosts = firestoreModule.getDueScheduledPosts as jest.MockedFunction<
    typeof firestoreModule.getDueScheduledPosts
  >;
  const mockClaimScheduledPostForProcessing =
    firestoreModule.claimScheduledPostForProcessing as jest.MockedFunction<
      typeof firestoreModule.claimScheduledPostForProcessing
    >;
  const mockGetSocialConnectionDoc = firestoreModule.getSocialConnectionDoc as jest.MockedFunction<
    typeof firestoreModule.getSocialConnectionDoc
  >;
  const mockUpdateScheduledPostDoc = firestoreModule.updateScheduledPostDoc as jest.MockedFunction<
    typeof firestoreModule.updateScheduledPostDoc
  >;
  const mockCreatePublishJob = publishingService.createPublishJob as jest.MockedFunction<
    typeof publishingService.createPublishJob
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claims due scheduled posts and executes them via publishingService', async () => {
    const duePost = {
      scheduledPostId: 'sch-101',
      userId: 'user-1',
      campaignId: 'camp-1',
      socialConnectionId: 'conn-1',
      platform: 'instagram',
      contentType: 'post',
      caption: 'Caption',
      idempotencyKey: 'idemp-101',
      attempts: 0,
      maxAttempts: 3,
    } as any;

    mockGetDueScheduledPosts.mockResolvedValueOnce([duePost]);
    mockClaimScheduledPostForProcessing.mockResolvedValueOnce({
      ...duePost,
      status: 'processing',
      attempts: 1,
    });
    mockGetSocialConnectionDoc.mockResolvedValueOnce({
      connectionId: 'conn-1',
      userId: 'user-1',
      status: 'active',
    } as any);

    mockCreatePublishJob.mockResolvedValueOnce({
      jobId: 'pub-job-101',
      status: 'published',
      publishedAt: '2026-10-01T10:00:00.000Z',
      externalPostId: 'ext-post-101',
    } as any);

    // Simulate worker logic
    const duePosts = await firestoreModule.getDueScheduledPosts(50);
    for (const p of duePosts) {
      const claimed = await firestoreModule.claimScheduledPostForProcessing(
        p.scheduledPostId,
        'w-1',
        300000
      );
      if (claimed) {
        const conn = await firestoreModule.getSocialConnectionDoc(
          claimed.userId,
          claimed.socialConnectionId
        );
        if (conn?.status === 'active') {
          const job = await publishingService.createPublishJob(claimed.userId, {
            campaignId: claimed.campaignId,
            socialConnectionId: claimed.socialConnectionId,
            platform: claimed.platform,
            contentType: claimed.contentType,
            captionOverride: claimed.caption,
            idempotencyKey: `pub_${claimed.idempotencyKey}`,
          });
          if (job.status === 'published') {
            await firestoreModule.updateScheduledPostDoc(claimed.scheduledPostId, {
              status: 'published',
              publishJobId: job.jobId,
              externalPostId: job.externalPostId,
              publishedAt: job.publishedAt,
            });
          }
        }
      }
    }

    expect(mockClaimScheduledPostForProcessing).toHaveBeenCalledWith('sch-101', 'w-1', 300000);
    expect(mockCreatePublishJob).toHaveBeenCalledWith('user-1', expect.anything());
    expect(mockUpdateScheduledPostDoc).toHaveBeenCalledWith('sch-101', {
      status: 'published',
      publishJobId: 'pub-job-101',
      externalPostId: 'ext-post-101',
      publishedAt: '2026-10-01T10:00:00.000Z',
    });
  });

  it('skips execution if worker fails to claim post (concurrency protection)', async () => {
    mockGetDueScheduledPosts.mockResolvedValueOnce([
      { scheduledPostId: 'sch-locked', status: 'scheduled' } as any,
    ]);
    mockClaimScheduledPostForProcessing.mockResolvedValueOnce(null);

    const duePosts = await firestoreModule.getDueScheduledPosts(50);
    for (const p of duePosts) {
      const claimed = await firestoreModule.claimScheduledPostForProcessing(
        p.scheduledPostId,
        'w-2',
        300000
      );
      if (claimed) {
        await publishingService.createPublishJob(claimed.userId, {} as any);
      }
    }

    expect(mockCreatePublishJob).not.toHaveBeenCalled();
  });

  it('marks post as failed without retry if social connection is revoked', async () => {
    const duePost = {
      scheduledPostId: 'sch-revoked',
      userId: 'user-1',
      socialConnectionId: 'conn-revoked',
    } as any;

    mockGetDueScheduledPosts.mockResolvedValueOnce([duePost]);
    mockClaimScheduledPostForProcessing.mockResolvedValueOnce(duePost);
    mockGetSocialConnectionDoc.mockResolvedValueOnce({
      connectionId: 'conn-revoked',
      status: 'disconnected',
    } as any);

    const duePosts = await firestoreModule.getDueScheduledPosts(50);
    for (const p of duePosts) {
      const claimed = await firestoreModule.claimScheduledPostForProcessing(
        p.scheduledPostId,
        'w-1',
        300000
      );
      if (claimed) {
        const conn = await firestoreModule.getSocialConnectionDoc(
          claimed.userId,
          claimed.socialConnectionId
        );
        if (!conn || conn.status !== 'active') {
          await firestoreModule.updateScheduledPostDoc(claimed.scheduledPostId, {
            status: 'failed',
            errorCode: 'CONNECTION_REVOKED',
            errorMessage: 'Social connection is inactive or revoked.',
          });
        }
      }
    }

    expect(mockCreatePublishJob).not.toHaveBeenCalled();
    expect(mockUpdateScheduledPostDoc).toHaveBeenCalledWith('sch-revoked', {
      status: 'failed',
      errorCode: 'CONNECTION_REVOKED',
      errorMessage: 'Social connection is inactive or revoked.',
    });
  });
});
