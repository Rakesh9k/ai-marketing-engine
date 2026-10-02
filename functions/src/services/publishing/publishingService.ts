import crypto from 'crypto';
import {
  getCampaignDoc,
  getSocialConnectionDoc,
  getEncryptedCredentialDoc,
  createPublishJobDoc,
  getPublishJobDoc,
  findJobByIdempotency,
  updatePublishJobDoc,
  listPublishJobsForCampaign as listJobsRepo,
} from '../firestore';
import { validateAndResolveMedia } from './mediaValidation';
import { publishingProviderFactory } from './publishingProviderFactory';
import { MetaPublishingError } from './providers/MetaPublishingProvider';
import type {
  PublishJob,
  PublishInput,
  PublishResult,
  PublishErrorCode,
  PublishStatus,
} from '../../types/publishing';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { trackCampaignPublished, trackCampaignFailed } from '../analyticsService';

export class PublishingService {
  /**
   * Generates a deterministic idempotency key for publishing operations.
   */
  private generateIdempotencyKey(userId: string, input: PublishInput): string {
    if (input.idempotencyKey && input.idempotencyKey.trim() !== '') {
      return input.idempotencyKey;
    }
    const seed = `${userId}:${input.campaignId}:${input.socialConnectionId}:${input.platform}:${input.contentType}:${input.scheduledAt || 'now'}`;
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Creates a new Publish Job (Publish Now or Schedule).
   */
  async createPublishJob(userId: string, input: PublishInput): Promise<PublishJob> {
    const { logger, startTime } = logFunctionStart('PublishingService.createPublishJob', {
      userId,
      campaignId: input.campaignId,
      platform: input.platform,
    });

    // 1. Verify Campaign Ownership & Approval Gate
    const campaign = await getCampaignDoc(input.campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.userId !== userId) {
      throw new Error('Unauthorized: You do not own this campaign');
    }

    // Approval gate: Campaign must be generated, verified, or completed
    const allowedStatuses = ['generated', 'verified', 'completed'];
    if (!allowedStatuses.includes(campaign.status)) {
      throw new Error(
        `Campaign cannot be published while in status '${campaign.status}'. Campaign must be generated or approved.`
      );
    }

    // 2. Verify Social Connection
    const connection = await getSocialConnectionDoc(userId, input.socialConnectionId);
    if (!connection) {
      throw new Error('Social connection not found');
    }
    if (connection.status !== 'active') {
      throw new Error(
        `Social connection is ${connection.status}. Please reconnect your Meta account.`
      );
    }

    // 3. Extract Media & Caption from Campaign Assets
    let rawMediaUrl = '';
    let caption = input.captionOverride || '';

    if (
      campaign.newProduct?.images &&
      campaign.newProduct.images.length > 0 &&
      campaign.newProduct.images[0]
    ) {
      rawMediaUrl = campaign.newProduct.images[0];
    } else {
      // Fallback poster placeholder if media URL is stored in assets or campaign
      rawMediaUrl = 'https://storage.googleapis.com/mitra-ai-public-assets/placeholders/poster.png';
    }

    if (!caption && campaign.offer) {
      caption = `${campaign.offer.headline}\n\n${campaign.offer.description || ''}`.trim();
    }

    const resolvedMediaUrl = await validateAndResolveMedia(
      rawMediaUrl,
      input.platform,
      input.contentType
    );

    // 4. Idempotency Check
    const idempotencyKey = this.generateIdempotencyKey(userId, input);
    const existingJob = await findJobByIdempotency(userId, idempotencyKey);
    if (existingJob) {
      const activeStatuses: PublishStatus[] = [
        'scheduled',
        'processing',
        'publishing',
        'published',
      ];
      if (activeStatuses.includes(existingJob.status)) {
        logger.info('Duplicate publish request detected. Returning existing job', {
          jobId: existingJob.jobId,
          status: existingJob.status,
        });
        return existingJob;
      }
    }

    // 5. Determine Initial Job Status (Scheduled vs Immediate Processing)
    const now = new Date();
    let isScheduled = false;
    if (input.scheduledAt) {
      const schedTime = new Date(input.scheduledAt);
      if (schedTime.getTime() > now.getTime() + 60 * 1000) {
        isScheduled = true;
      }
    }

    const jobId = `pub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const initialStatus: PublishStatus = isScheduled ? 'scheduled' : 'processing';

    const newJob: PublishJob = {
      jobId,
      userId,
      businessId: campaign.businessId,
      campaignId: input.campaignId,
      socialConnectionId: input.socialConnectionId,
      platform: input.platform,
      contentType: input.contentType,
      mediaUrl: resolvedMediaUrl,
      caption,
      scheduledAt: isScheduled ? input.scheduledAt : null,
      status: initialStatus,
      attempts: 0,
      maxAttempts: 3,
      idempotencyKey,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const savedJob = await createPublishJobDoc(newJob);

    // If immediate, execute publish job asynchronously
    if (initialStatus === 'processing') {
      void this.executePublishJob(jobId).catch((err) => {
        logFunctionError(logger, startTime, err instanceof Error ? err : new Error(String(err)));
      });
    }

    logFunctionComplete(logger, startTime, { success: true, jobId, status: initialStatus });
    return savedJob;
  }

  /**
   * Executes a publish job (called directly for Publish Now or by background scheduler).
   */
  async executePublishJob(jobId: string): Promise<PublishResult> {
    const { logger, startTime } = logFunctionStart('PublishingService.executePublishJob', {
      jobId,
    });

    const job = await getPublishJobDoc(jobId);
    if (!job) {
      throw new Error(`Publish job ${jobId} not found`);
    }

    if (job.status === 'published') {
      return { success: true, job };
    }
    if (job.status === 'cancelled') {
      return {
        success: false,
        job,
        error: { code: 'UNKNOWN', message: 'Job was cancelled', retryable: false },
      };
    }

    // Mark as publishing
    await updatePublishJobDoc(jobId, { status: 'publishing' });

    try {
      // 1. Retrieve Social Connection
      const connection = await getSocialConnectionDoc(job.userId, job.socialConnectionId);
      if (!connection || connection.status !== 'active') {
        throw new MetaPublishingError(
          'CONNECTION_REVOKED',
          'Social connection is inactive or revoked',
          null,
          false
        );
      }

      // 2. Retrieve Decrypted Credentials (Admin SDK read)
      const credentials = await getEncryptedCredentialDoc(job.socialConnectionId);
      if (!credentials) {
        throw new MetaPublishingError('AUTH_REQUIRED', 'Missing credentials document', null, false);
      }

      // 3. Resolve Provider and Publish
      const provider = publishingProviderFactory.getProvider({ platform: job.platform });
      const input = {
        platform: job.platform,
        contentType: job.contentType,
        socialConnection: connection,
        credentials,
        mediaUrl: job.mediaUrl,
        caption: job.caption,
      };

      const output =
        job.contentType === 'reel'
          ? await provider.publishReel(input)
          : await provider.publishPost(input);

      // 4. Update Job to Published
      const updatedJob = await updatePublishJobDoc(jobId, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        externalPostId: output.externalPostId,
        externalContainerId: output.externalContainerId || null,
        errorCode: null,
        errorMessage: null,
      });

      // Phase 16: Track campaign_published event
      await trackCampaignPublished(
        job.userId,
        job.businessId,
        job.campaignId,
        jobId,
        job.platform,
        output.externalPostId
      );

      logFunctionComplete(logger, startTime, {
        success: true,
        jobId,
        externalPostId: output.externalPostId,
      });

      return {
        success: true,
        job: updatedJob,
        externalPostId: output.externalPostId,
      };
    } catch (err: any) {
      const code: PublishErrorCode = err instanceof MetaPublishingError ? err.code : 'UNKNOWN';
      const message: string = err instanceof Error ? err.message : String(err);
      const retryable: boolean = err instanceof MetaPublishingError ? err.retryable : false;

      const attempts = (job.attempts || 0) + 1;
      const willRetry = retryable && attempts < job.maxAttempts;

      const updatedJob = await updatePublishJobDoc(jobId, {
        status: 'failed',
        attempts,
        lastAttemptAt: new Date().toISOString(),
        nextAttemptAt: willRetry
          ? new Date(Date.now() + 5 * 60 * 1000 * attempts).toISOString()
          : null,
        errorCode: code,
        errorMessage: message,
      });

      // Phase 16: Track campaign_failed event
      await trackCampaignFailed(
        job.userId,
        job.businessId,
        job.campaignId,
        jobId,
        job.platform,
        code
      );

      logFunctionError(logger, startTime, err instanceof Error ? err : new Error(message), {
        jobId,
        code,
        attempts,
        willRetry,
      });

      return {
        success: false,
        job: updatedJob,
        error: { code, message, retryable: willRetry },
      };
    }
  }

  /**
   * Cancels a scheduled publish job.
   */
  async cancelPublishJob(userId: string, jobId: string): Promise<PublishJob> {
    const job = await getPublishJobDoc(jobId);
    if (!job) {
      throw new Error('Publish job not found');
    }
    if (job.userId !== userId) {
      throw new Error('Unauthorized: You do not own this publish job');
    }
    if (job.status !== 'scheduled') {
      throw new Error(
        `Cannot cancel job in status '${job.status}'. Only scheduled jobs can be cancelled.`
      );
    }

    return updatePublishJobDoc(jobId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Retries a failed publish job.
   */
  async retryPublishJob(userId: string, jobId: string): Promise<PublishResult> {
    const job = await getPublishJobDoc(jobId);
    if (!job) {
      throw new Error('Publish job not found');
    }
    if (job.userId !== userId) {
      throw new Error('Unauthorized: You do not own this publish job');
    }
    if (job.status !== 'failed') {
      throw new Error(
        `Cannot retry job in status '${job.status}'. Only failed jobs can be retried.`
      );
    }

    await updatePublishJobDoc(jobId, {
      status: 'processing',
      errorCode: null,
      errorMessage: null,
    });

    return this.executePublishJob(jobId);
  }

  /**
   * Lists all publish jobs for a campaign.
   */
  async listCampaignJobs(userId: string, campaignId: string): Promise<PublishJob[]> {
    return listJobsRepo(userId, campaignId);
  }
}

export const publishingService = new PublishingService();
