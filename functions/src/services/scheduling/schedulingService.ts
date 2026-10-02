import crypto from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import type { ScheduledPost, CreateScheduleInput, RescheduleInput } from '../../types/scheduling';
import {
  getCampaignDoc,
  getSocialConnectionDoc,
  createScheduledPostDoc,
  getScheduledPostDoc,
  findScheduledPostByIdempotency,
  updateScheduledPostDoc,
  listScheduledPostsForCampaign,
  listScheduledPostsForBusiness,
} from '../firestore';
import { validateScheduledTime } from './timezoneUtils';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { trackCampaignScheduled } from '../analyticsService';

export class SchedulingService {
  /**
   * Derive deterministic idempotency key for schedule requests.
   */
  private deriveIdempotencyKey(
    userId: string,
    campaignId: string,
    socialConnectionId: string,
    platform: string,
    contentType: string,
    scheduledAtUtc: string
  ): string {
    const raw = `${userId}:${campaignId}:${socialConnectionId}:${platform}:${contentType}:${scheduledAtUtc}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
    return `sched_${hash}`;
  }

  /**
   * Creates a new ScheduledPost document after validating ownership, campaign approval,
   * social connection status, platform compatibility, and scheduling time.
   */
  public async createSchedule(userId: string, input: CreateScheduleInput): Promise<ScheduledPost> {
    const logCtx = logFunctionStart('SchedulingService.createSchedule', {
      userId,
      campaignId: input.campaignId,
      platform: input.platform,
      contentType: input.contentType,
    });

    try {
      // 1. Validate Campaign ownership & approval status
      const campaign = await getCampaignDoc(input.campaignId);
      if (!campaign) {
        throw new HttpsError('not-found', `Campaign "${input.campaignId}" not found.`);
      }
      if (campaign.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this campaign.');
      }

      const validStatuses = ['generated', 'verified', 'completed', 'approved', 'active'];
      if (!validStatuses.includes(campaign.status)) {
        throw new HttpsError(
          'failed-precondition',
          `Campaign must be generated/verified to be scheduled. Current status: "${campaign.status}".`
        );
      }

      // 2. Validate Social Connection ownership & status
      const connection = await getSocialConnectionDoc(userId, input.socialConnectionId);
      if (!connection) {
        throw new HttpsError(
          'not-found',
          `Social connection "${input.socialConnectionId}" not found.`
        );
      }
      if (connection.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this social connection.');
      }
      if (connection.status !== 'active') {
        throw new HttpsError(
          'failed-precondition',
          `Social connection is not active (status: "${connection.status}"). Please reconnect your Meta account.`
        );
      }

      if (input.platform === 'instagram' && !connection.instagram?.id) {
        throw new HttpsError(
          'failed-precondition',
          'Social connection does not have a linked Instagram Professional account.'
        );
      }
      if (input.platform === 'facebook' && !connection.facebookPage?.id) {
        throw new HttpsError(
          'failed-precondition',
          'Social connection does not have a linked Facebook Page.'
        );
      }

      // 3. Extract media URL & caption from campaign metadata/outputs
      const mediaUrls: string[] = [];
      const outputs = (campaign as any).outputs || {};
      if (outputs.finalImageUrls?.length) {
        mediaUrls.push(...outputs.finalImageUrls);
      } else if (outputs.primaryImageUrl) {
        mediaUrls.push(outputs.primaryImageUrl);
      }

      // Fallback to offer headline if no media URL array found directly
      if (mediaUrls.length === 0) {
        mediaUrls.push(
          'https://storage.googleapis.com/demo-test-project.appspot.com/placeholder-creative.png'
        );
      }

      const caption =
        input.captionOverride ||
        outputs.caption ||
        outputs.headline ||
        campaign.offer?.headline ||
        'Published via Mitra AI Marketing';

      // 4. Validate time & IANA timezone
      const timeValidation = validateScheduledTime(input.scheduledAt, input.timezone);
      if (!timeValidation.valid || !timeValidation.utcIso) {
        throw new HttpsError('invalid-argument', timeValidation.error || 'Invalid scheduled time.');
      }

      // 5. Idempotency Check
      const idempotencyKey =
        input.idempotencyKey ||
        this.deriveIdempotencyKey(
          userId,
          input.campaignId,
          input.socialConnectionId,
          input.platform,
          input.contentType,
          timeValidation.utcIso
        );

      const existingPost = await findScheduledPostByIdempotency(userId, idempotencyKey);
      if (existingPost) {
        logFunctionComplete(logCtx.logger, logCtx.startTime, {
          success: true,
          scheduledPostId: existingPost.scheduledPostId,
          status: existingPost.status,
          isDuplicate: true,
        });
        return existingPost;
      }

      // 6. Build ScheduledPost
      const nowIso = new Date().toISOString();
      const scheduledPostId = `sch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const post: ScheduledPost = {
        scheduledPostId,
        userId,
        businessId: campaign.businessId,
        campaignId: input.campaignId,
        socialConnectionId: input.socialConnectionId,
        platform: input.platform,
        contentType: input.contentType,
        mediaUrls,
        caption,
        scheduledAt: timeValidation.utcIso,
        timezone: input.timezone,
        status: 'scheduled',
        attempts: 0,
        maxAttempts: 3,
        idempotencyKey,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await createScheduledPostDoc(post);

      // Phase 16: Track campaign_scheduled event
      await trackCampaignScheduled(
        userId,
        campaign.businessId,
        input.campaignId,
        scheduledPostId,
        input.platform,
        input.contentType
      );

      logFunctionComplete(logCtx.logger, logCtx.startTime, {
        success: true,
        scheduledPostId,
        status: post.status,
      });
      return post;
    } catch (err) {
      logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', String(err));
    }
  }

  /**
   * Cancels a scheduled post if it has not yet completed execution.
   */
  public async cancelSchedule(userId: string, scheduledPostId: string): Promise<ScheduledPost> {
    const logCtx = logFunctionStart('SchedulingService.cancelSchedule', {
      userId,
      scheduledPostId,
    });

    try {
      const post = await getScheduledPostDoc(scheduledPostId);
      if (!post) {
        throw new HttpsError('not-found', `Scheduled post "${scheduledPostId}" not found.`);
      }
      if (post.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this scheduled post.');
      }
      if (post.status === 'processing' || post.status === 'published') {
        throw new HttpsError(
          'failed-precondition',
          `Cannot cancel scheduled post in "${post.status}" state.`
        );
      }

      const updated = await updateScheduledPostDoc(scheduledPostId, {
        status: 'cancelled',
        leaseExpiresAt: null,
        processingBy: null,
      });

      logFunctionComplete(logCtx.logger, logCtx.startTime, {
        success: true,
        scheduledPostId,
        status: updated.status,
      });
      return updated;
    } catch (err) {
      logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', String(err));
    }
  }

  /**
   * Reschedules an existing scheduled post to a new time and timezone.
   */
  public async reschedulePost(userId: string, input: RescheduleInput): Promise<ScheduledPost> {
    const logCtx = logFunctionStart('SchedulingService.reschedulePost', {
      userId,
      scheduledPostId: input.scheduledPostId,
    });

    try {
      const post = await getScheduledPostDoc(input.scheduledPostId);
      if (!post) {
        throw new HttpsError('not-found', `Scheduled post "${input.scheduledPostId}" not found.`);
      }
      if (post.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this scheduled post.');
      }
      if (post.status !== 'scheduled' && post.status !== 'failed') {
        throw new HttpsError(
          'failed-precondition',
          `Only scheduled or failed posts can be rescheduled. Current status: "${post.status}".`
        );
      }

      const timeValidation = validateScheduledTime(input.newScheduledAt, input.timezone);
      if (!timeValidation.valid || !timeValidation.utcIso) {
        throw new HttpsError('invalid-argument', timeValidation.error || 'Invalid scheduled time.');
      }

      const updated = await updateScheduledPostDoc(input.scheduledPostId, {
        scheduledAt: timeValidation.utcIso,
        timezone: input.timezone,
        status: 'scheduled',
        errorCode: null,
        errorMessage: null,
        attempts: 0,
        leaseExpiresAt: null,
        processingBy: null,
      });

      logFunctionComplete(logCtx.logger, logCtx.startTime, {
        success: true,
        scheduledPostId: updated.scheduledPostId,
        newScheduledAt: updated.scheduledAt,
      });
      return updated;
    } catch (err) {
      logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', String(err));
    }
  }

  /**
   * Resets a failed recoverable post back to scheduled state for retry.
   */
  public async retryScheduledPost(userId: string, scheduledPostId: string): Promise<ScheduledPost> {
    const logCtx = logFunctionStart('SchedulingService.retryScheduledPost', {
      userId,
      scheduledPostId,
    });

    try {
      const post = await getScheduledPostDoc(scheduledPostId);
      if (!post) {
        throw new HttpsError('not-found', `Scheduled post "${scheduledPostId}" not found.`);
      }
      if (post.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this scheduled post.');
      }
      if (post.status !== 'failed') {
        throw new HttpsError(
          'failed-precondition',
          `Only failed posts can be retried. Current status: "${post.status}".`
        );
      }

      const updated = await updateScheduledPostDoc(scheduledPostId, {
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        attempts: 0,
        errorCode: null,
        errorMessage: null,
        leaseExpiresAt: null,
        processingBy: null,
      });

      logFunctionComplete(logCtx.logger, logCtx.startTime, {
        success: true,
        scheduledPostId: updated.scheduledPostId,
        status: updated.status,
      });
      return updated;
    } catch (err) {
      logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', String(err));
    }
  }

  /**
   * Lists scheduled posts for a campaign owned by the user.
   */
  public async listScheduledPostsForCampaign(
    userId: string,
    campaignId: string
  ): Promise<ScheduledPost[]> {
    const campaign = await getCampaignDoc(campaignId);
    if (!campaign || campaign.userId !== userId) {
      throw new HttpsError('permission-denied', 'You do not own this campaign.');
    }
    return listScheduledPostsForCampaign(userId, campaignId);
  }

  /**
   * Lists scheduled posts for a business owned by the user.
   */
  public async listScheduledPostsForBusiness(
    userId: string,
    businessId: string
  ): Promise<ScheduledPost[]> {
    return listScheduledPostsForBusiness(userId, businessId);
  }
}

export const schedulingService = new SchedulingService();
