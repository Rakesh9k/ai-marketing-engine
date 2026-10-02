import { HttpsError } from 'firebase-functions/v2/https';
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
import type { PostPerformanceRecord } from '../../types/meta';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import * as admin from 'firebase-admin';

export class PerformanceSyncService {
  /**
   * Synchronizes external Meta performance metrics for a specific PublishJob.
   */
  async syncPublishJobPerformance(
    userId: string,
    publishJobId: string
  ): Promise<PostPerformanceRecord> {
    const { logger, startTime } = logFunctionStart(
      'PerformanceSyncService.syncPublishJobPerformance',
      {
        userId,
        publishJobId,
      }
    );

    try {
      // 1. Fetch & Ownership check for PublishJob
      const job = await getPublishJobDoc(publishJobId);
      if (!job) {
        throw new HttpsError('not-found', `Publish job "${publishJobId}" not found.`);
      }
      if (job.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this publish job.');
      }
      if (job.status !== 'published' || !job.externalPostId) {
        throw new HttpsError(
          'failed-precondition',
          `Publish job must be in 'published' status with externalPostId. Current status: '${job.status}'`
        );
      }

      // 2. Fetch & Ownership check for Social Connection
      const connection = await getSocialConnectionDoc(userId, job.socialConnectionId);
      if (!connection) {
        throw new HttpsError(
          'not-found',
          `Social connection "${job.socialConnectionId}" not found.`
        );
      }
      if (connection.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this social connection.');
      }

      const nowIso = new Date().toISOString();
      const performanceId = `perf_${job.jobId}`;
      const existingRecord = await getPostPerformanceDoc(performanceId);

      // Handle inactive connection state safely without throwing (Failure Isolation)
      if (connection.status !== 'active') {
        const inactiveRecord: PostPerformanceRecord = {
          performanceId,
          campaignId: job.campaignId,
          businessId: job.businessId,
          userId: job.userId,
          publishJobId: job.jobId,
          platform: job.platform,
          contentType: job.contentType,
          externalPostId: job.externalPostId,
          status: 'error',
          metrics: {
            likes: null,
            comments: null,
            reach: null,
            impressions: null,
            shares: null,
            videoViews: null,
            clicks: null,
          },
          errorCode: 'CONNECTION_REVOKED',
          errorMessage: `Social connection status is '${connection.status}'. Please reconnect your Meta account.`,
          fetchedAt: nowIso,
          createdAt: existingRecord?.createdAt || nowIso,
          updatedAt: nowIso,
        };
        await setPostPerformanceDoc(inactiveRecord);
        return inactiveRecord;
      }

      // 3. Fetch Decrypted Credentials
      const credentials = await getEncryptedCredentialDoc(job.socialConnectionId);
      if (!credentials) {
        const missingAuthRecord: PostPerformanceRecord = {
          performanceId,
          campaignId: job.campaignId,
          businessId: job.businessId,
          userId: job.userId,
          publishJobId: job.jobId,
          platform: job.platform,
          contentType: job.contentType,
          externalPostId: job.externalPostId,
          status: 'error',
          metrics: {
            likes: null,
            comments: null,
            reach: null,
            impressions: null,
            shares: null,
            videoViews: null,
            clicks: null,
          },
          errorCode: 'AUTH_REQUIRED',
          errorMessage: 'Missing credentials document for Meta connection',
          fetchedAt: nowIso,
          createdAt: existingRecord?.createdAt || nowIso,
          updatedAt: nowIso,
        };
        await setPostPerformanceDoc(missingAuthRecord);
        return missingAuthRecord;
      }

      // 4. Fetch performance metrics via MetaPerformanceProvider
      const fetchResult = await metaPerformanceProvider.fetchPostPerformance({
        platform: job.platform,
        contentType: job.contentType,
        externalPostId: job.externalPostId,
        socialConnection: connection,
        credentials,
      });

      // 5. Construct & Save PostPerformanceRecord
      const record: PostPerformanceRecord = {
        performanceId,
        campaignId: job.campaignId,
        businessId: job.businessId,
        userId: job.userId,
        publishJobId: job.jobId,
        platform: job.platform,
        contentType: job.contentType,
        externalPostId: job.externalPostId,
        status: fetchResult.status,
        metrics: fetchResult.metrics,
        errorCode: fetchResult.errorCode || null,
        errorMessage: fetchResult.errorMessage || null,
        fetchedAt: nowIso,
        createdAt: existingRecord?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      await setPostPerformanceDoc(record);

      // 6. Update Campaign-level aggregate document campaign_performance/{campaignId}
      await this.updateCampaignPerformanceAggregate(job.campaignId, job.businessId);

      // Phase 18: Build Performance Observation and update Recommendations
      if (record.status === 'available' || record.status === 'partial') {
        try {
          const { buildAndSavePerformanceObservation } =
            await import('../recommendation/observationBuilder.js');
          const { performanceRecommendationService } =
            await import('../recommendation/performanceRecommendationService.js');
          await buildAndSavePerformanceObservation({ publishJob: job, postPerformance: record });
          await performanceRecommendationService.evaluateBusinessRecommendations(job.businessId);
        } catch (recErr) {
          logger.warn('Failed to build performance observation or update recommendations', {
            error: String(recErr),
          });
        }
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        performanceId,
        status: record.status,
      });

      return record;
    } catch (err) {
      logFunctionError(logger, startTime, err as Error);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', String(err));
    }
  }

  /**
   * Synchronizes external Meta performance metrics for all published posts in a campaign.
   */
  async syncCampaignPerformance(
    userId: string,
    campaignId: string
  ): Promise<PostPerformanceRecord[]> {
    const { logger, startTime } = logFunctionStart(
      'PerformanceSyncService.syncCampaignPerformance',
      {
        userId,
        campaignId,
      }
    );

    try {
      const campaign = await getCampaignDoc(campaignId);
      if (!campaign) {
        throw new HttpsError('not-found', `Campaign "${campaignId}" not found.`);
      }
      if (campaign.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not own this campaign.');
      }

      const jobs = await listPublishJobsForCampaign(userId, campaignId);
      const publishedJobs = jobs.filter((j) => j.status === 'published' && j.externalPostId);

      const syncResults = await Promise.allSettled(
        publishedJobs.map((j) => this.syncPublishJobPerformance(userId, j.jobId))
      );

      const records: PostPerformanceRecord[] = [];
      for (const res of syncResults) {
        if (res.status === 'fulfilled') {
          records.push(res.value);
        }
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        campaignId,
        syncedPosts: records.length,
      });

      return records;
    } catch (err) {
      logFunctionError(logger, startTime, err as Error);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', String(err));
    }
  }

  /**
   * Helper to aggregate post performance records into campaign_performance/{campaignId}
   */
  private async updateCampaignPerformanceAggregate(
    campaignId: string,
    businessId: string
  ): Promise<void> {
    const postsPerformance = await listPostPerformanceForCampaign(campaignId);
    const existing = await getCampaignPerformanceDoc(campaignId);

    const db = admin.firestore();
    await db
      .collection('campaign_performance')
      .doc(campaignId)
      .set(
        {
          campaignId,
          businessId,
          whatsappClicks: existing?.whatsappClicks ?? 0,
          inquiries: existing?.inquiries ?? null,
          postsPerformance,
          updatedAt: new Date().toISOString(),
          lastEventAt: new Date().toISOString(),
        },
        { merge: true }
      );
  }
}

export const performanceSyncService = new PerformanceSyncService();
