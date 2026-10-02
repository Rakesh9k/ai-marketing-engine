import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  getDueScheduledPosts,
  claimScheduledPostForProcessing,
  updateScheduledPostDoc,
  getSocialConnectionDoc,
} from '../../services/firestore';
import { publishingService } from '../../services/publishing/publishingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import crypto from 'crypto';

export const processScheduledPosts = onSchedule('every 1 minutes', async () => {
  const workerId = `scheduler_worker_${process.env['K_REVISION'] || 'local'}_${crypto.randomBytes(4).toString('hex')}`;
  const logCtx = logFunctionStart('processScheduledPosts', { workerId });

  try {
    const duePosts = await getDueScheduledPosts(50);
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const post of duePosts) {
      // 1. Atomic claim with 5-minute lease duration
      const claimed = await claimScheduledPostForProcessing(post.scheduledPostId, workerId, 300000);
      if (!claimed) {
        // Concurrent worker acquired lease or lease still valid
        continue;
      }

      processedCount++;

      try {
        // 2. Validate Social Connection status immediately before execution
        const connection = await getSocialConnectionDoc(claimed.userId, claimed.socialConnectionId);
        if (!connection || connection.status !== 'active') {
          await updateScheduledPostDoc(claimed.scheduledPostId, {
            status: 'failed',
            errorCode: 'CONNECTION_REVOKED',
            errorMessage:
              'Social connection is inactive or revoked. Please reconnect your Meta account.',
            leaseExpiresAt: null,
            processingBy: null,
          });
          failedCount++;
          continue;
        }

        // 3. Delegate execution to Phase 10 PublishingService
        const publishJob = await publishingService.createPublishJob(claimed.userId, {
          campaignId: claimed.campaignId,
          socialConnectionId: claimed.socialConnectionId,
          platform: claimed.platform,
          contentType: claimed.contentType,
          captionOverride: claimed.caption,
          idempotencyKey: `pub_${claimed.idempotencyKey}`,
        });

        if (publishJob.status === 'published') {
          // Success case
          await updateScheduledPostDoc(claimed.scheduledPostId, {
            status: 'published',
            publishJobId: publishJob.jobId,
            externalPostId: publishJob.externalPostId || null,
            publishedAt: publishJob.publishedAt || new Date().toISOString(),
            leaseExpiresAt: null,
            processingBy: null,
          });
          successCount++;
        } else if (publishJob.status === 'failed') {
          // Job failed — check retryability & attempt limits
          const attempts = claimed.attempts || 1;
          const maxAttempts = claimed.maxAttempts || 3;
          const isRetryable =
            publishJob.errorCode === 'RATE_LIMITED' || publishJob.errorCode === 'NETWORK_ERROR';

          if (isRetryable && attempts < maxAttempts) {
            // Calculate exponential backoff: 30s, 120s, 480s
            const backoffMs = Math.pow(4, attempts - 1) * 30000;
            const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();

            await updateScheduledPostDoc(claimed.scheduledPostId, {
              status: 'scheduled',
              publishJobId: publishJob.jobId,
              nextAttemptAt,
              errorCode: publishJob.errorCode || 'RETRYABLE_ERROR',
              errorMessage: publishJob.errorMessage || 'Publishing attempt failed. Retrying.',
              leaseExpiresAt: null,
              processingBy: null,
            });
          } else {
            // Permanent failure or max attempts exhausted
            await updateScheduledPostDoc(claimed.scheduledPostId, {
              status: 'failed',
              publishJobId: publishJob.jobId,
              errorCode: publishJob.errorCode || 'PUBLISH_FAILED',
              errorMessage: publishJob.errorMessage || 'Publishing failed.',
              leaseExpiresAt: null,
              processingBy: null,
            });
            failedCount++;
          }
        } else {
          // Job created in scheduled/processing status (Phase 10 background handle)
          await updateScheduledPostDoc(claimed.scheduledPostId, {
            publishJobId: publishJob.jobId,
          });
        }
      } catch (err: any) {
        logFunctionError(logCtx.logger, logCtx.startTime, err as Error, {
          scheduledPostId: claimed.scheduledPostId,
        });
        await updateScheduledPostDoc(claimed.scheduledPostId, {
          status: 'failed',
          errorCode: 'SCHEDULER_EXECUTION_ERROR',
          errorMessage: err?.message || 'Scheduler failed to execute publish job.',
          leaseExpiresAt: null,
          processingBy: null,
        });
        failedCount++;
      }
    }

    logFunctionComplete(logCtx.logger, logCtx.startTime, {
      success: true,
      dueCount: duePosts.length,
      processedCount,
      successCount,
      failedCount,
    });
  } catch (err) {
    logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
  }
});
