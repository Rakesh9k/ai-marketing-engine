import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getDueScheduledPublishJobs, claimPublishJobForProcessing } from '../../services/firestore';
import { publishingService } from '../../services/publishing/publishingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

/**
 * Scheduled Cloud Function (cron worker) that processes due scheduled publish jobs.
 * Runs every 1 minute. Atomically claims jobs to protect against concurrent workers.
 */
export const processScheduledPublishJobs = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Kolkata',
    retryCount: 0,
  },
  async () => {
    const { logger, startTime } = logFunctionStart('processScheduledPublishJobs', {});
    try {
      const dueJobs = await getDueScheduledPublishJobs(20);
      logger.info(`Found ${dueJobs.length} due scheduled publish jobs`);

      for (const dueJob of dueJobs) {
        // Atomic claim to prevent concurrent worker execution
        const claimedJob = await claimPublishJobForProcessing(dueJob.jobId);
        if (!claimedJob) {
          logger.info(`Job ${dueJob.jobId} already claimed or processed by another worker`);
          continue;
        }

        try {
          await publishingService.executePublishJob(claimedJob.jobId);
          logger.info(`Successfully processed scheduled publish job ${claimedJob.jobId}`);
        } catch (jobErr) {
          logFunctionError(
            logger,
            startTime,
            jobErr instanceof Error ? jobErr : new Error(String(jobErr)),
            { jobId: claimedJob.jobId }
          );
        }
      }

      logFunctionComplete(logger, startTime, { success: true, count: dueJobs.length });
    } catch (err) {
      logFunctionError(logger, startTime, err instanceof Error ? err : new Error(String(err)));
    }
  }
);
