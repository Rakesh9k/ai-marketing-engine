import { decryptToken } from '../../meta/crypto';
import { metaGraphClient, MetaGraphError } from '../../meta/graphClient';
import type {
  SocialConnection,
  EncryptedCredentialDoc,
  MetaMetrics,
  MetaPerformanceStatus,
  MetaPerformanceErrorCode,
} from '../../../types/meta';
import type { PublishPlatform, PublishContentType } from '../../../types/publishing';
import { logFunctionError } from '../../../utils/logging';

export interface FetchPerformanceInput {
  platform: PublishPlatform;
  contentType: PublishContentType;
  externalPostId: string;
  socialConnection: SocialConnection;
  credentials: EncryptedCredentialDoc;
}

export interface FetchPerformanceOutput {
  status: MetaPerformanceStatus;
  metrics: MetaMetrics;
  errorCode?: MetaPerformanceErrorCode | null;
  errorMessage?: string | null;
}

export class MetaPerformanceProvider {
  private getAccessToken(credentials: EncryptedCredentialDoc): string {
    try {
      if (credentials.pageAccessToken?.encryptedData) {
        return decryptToken(credentials.pageAccessToken);
      }
      if (credentials.userAccessToken?.encryptedData) {
        return decryptToken(credentials.userAccessToken);
      }
    } catch (err) {
      throw new MetaGraphError('AUTH_REQUIRED', 'Failed to decrypt Meta access token');
    }
    throw new MetaGraphError('AUTH_REQUIRED', 'No valid access token found in credentials');
  }

  private parseError(err: unknown): {
    code: MetaPerformanceErrorCode;
    message: string;
    status: MetaPerformanceStatus;
  } {
    if (err instanceof MetaGraphError) {
      const codeStr = String(err.code || '');
      const msg = err.message || '';
      const rawObj = (err.metaErrorDetails as any) || {};
      const codeNum = rawObj.code;
      const subcodeNum = rawObj.error_subcode;

      if (
        codeNum === 190 ||
        subcodeNum === 458 ||
        subcodeNum === 460 ||
        subcodeNum === 463 ||
        subcodeNum === 467
      ) {
        return {
          code: 'CONNECTION_REVOKED',
          message: 'Meta connection expired or revoked',
          status: 'error',
        };
      }
      if (codeNum === 10 || codeNum === 200 || codeNum === 298) {
        return {
          code: 'PERMISSION_DENIED',
          message: `Permission denied by Meta: ${msg}`,
          status: 'error',
        };
      }
      if (codeNum === 4 || codeNum === 17 || codeNum === 32 || codeNum === 613) {
        return {
          code: 'RATE_LIMITED',
          message: 'Meta API rate limit reached',
          status: 'error',
        };
      }
      if (
        codeNum === 100 ||
        msg.includes('does not exist') ||
        msg.includes('Unsupported get request')
      ) {
        return {
          code: 'POST_NOT_FOUND',
          message: 'Published post not found on Meta',
          status: 'unavailable',
        };
      }
      return {
        code: 'META_API_ERROR',
        message: msg || 'Meta API error',
        status: 'error',
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      code: 'NETWORK_ERROR',
      message: `Network error: ${message}`,
      status: 'error',
    };
  }

  private extractInsightValue(insightsData: any, metricName: string): number | null {
    if (!insightsData || !Array.isArray(insightsData.data)) return null;
    const metricObj = insightsData.data.find((item: any) => item.name === metricName);
    if (!metricObj || !Array.isArray(metricObj.values) || metricObj.values.length === 0)
      return null;
    const val = metricObj.values[0]?.value;
    return typeof val === 'number' ? val : null;
  }

  async fetchPostPerformance(input: FetchPerformanceInput): Promise<FetchPerformanceOutput> {
    try {
      const token = this.getAccessToken(input.credentials);
      const { platform, contentType, externalPostId } = input;

      const metrics: MetaMetrics = {
        likes: null,
        comments: null,
        reach: null,
        impressions: null,
        shares: null,
        videoViews: null,
        clicks: null,
      };

      if (platform === 'instagram') {
        // Fetch Instagram node details (like_count, comments_count)
        try {
          const nodeData = await metaGraphClient.fetchNode(
            externalPostId,
            ['like_count', 'comments_count', 'media_type', 'media_product_type'],
            token
          );
          if (typeof nodeData['like_count'] === 'number') metrics.likes = nodeData['like_count'];
          if (typeof nodeData['comments_count'] === 'number')
            metrics.comments = nodeData['comments_count'];
        } catch (err) {
          // If node fetch itself throws, parse error directly
          const parsed = this.parseError(err);
          return {
            status: parsed.status,
            metrics,
            errorCode: parsed.code,
            errorMessage: parsed.message,
          };
        }

        // Fetch Instagram insights
        const metricsToFetch =
          contentType === 'reel'
            ? ['plays', 'reach', 'shares', 'saved']
            : ['reach', 'impressions', 'shares', 'saved'];

        try {
          const insightsData = await metaGraphClient.fetchInsights(
            externalPostId,
            metricsToFetch,
            token
          );
          const reach = this.extractInsightValue(insightsData, 'reach');
          const impressions = this.extractInsightValue(insightsData, 'impressions');
          const shares = this.extractInsightValue(insightsData, 'shares');
          const plays = this.extractInsightValue(insightsData, 'plays');

          if (reach !== null) metrics.reach = reach;
          if (impressions !== null) metrics.impressions = impressions;
          if (shares !== null) metrics.shares = shares;
          if (plays !== null) metrics.videoViews = plays;
        } catch {
          // Insights may be missing or restricted, preserve node metrics
        }

        const hasAnyMetric = Object.values(metrics).some((v) => v !== null);
        return {
          status: hasAnyMetric ? 'available' : 'partial',
          metrics,
        };
      } else {
        // Facebook Page Post or Video
        try {
          const fields =
            contentType === 'reel'
              ? ['views', 'shares', 'likes.summary(true)', 'comments.summary(true)']
              : ['shares', 'likes.summary(true)', 'comments.summary(true)'];

          const nodeData = await metaGraphClient.fetchNode(externalPostId, fields, token);

          if (typeof nodeData['likes']?.summary?.total_count === 'number') {
            metrics.likes = nodeData['likes'].summary.total_count;
          }
          if (typeof nodeData['comments']?.summary?.total_count === 'number') {
            metrics.comments = nodeData['comments'].summary.total_count;
          }
          if (typeof nodeData['shares']?.count === 'number') {
            metrics.shares = nodeData['shares'].count;
          }
          if (typeof nodeData['views'] === 'number') {
            metrics.videoViews = nodeData['views'];
          }
        } catch (err) {
          const parsed = this.parseError(err);
          return {
            status: parsed.status,
            metrics,
            errorCode: parsed.code,
            errorMessage: parsed.message,
          };
        }

        // Fetch Facebook Insights
        const metricsToFetch =
          contentType === 'reel'
            ? ['post_impressions_unique', 'total_video_views']
            : ['post_impressions_unique', 'post_impressions', 'post_clicks'];

        try {
          const insightsData = await metaGraphClient.fetchInsights(
            externalPostId,
            metricsToFetch,
            token
          );
          const reach = this.extractInsightValue(insightsData, 'post_impressions_unique');
          const impressions = this.extractInsightValue(insightsData, 'post_impressions');
          const clicks = this.extractInsightValue(insightsData, 'post_clicks');
          const videoViews = this.extractInsightValue(insightsData, 'total_video_views');

          if (reach !== null) metrics.reach = reach;
          if (impressions !== null) metrics.impressions = impressions;
          if (clicks !== null) metrics.clicks = clicks;
          if (videoViews !== null && metrics.videoViews === null) metrics.videoViews = videoViews;
        } catch {
          // Insights optional
        }

        const hasAnyMetric = Object.values(metrics).some((v) => v !== null);
        return {
          status: hasAnyMetric ? 'available' : 'partial',
          metrics,
        };
      }
    } catch (err) {
      logFunctionError(null as any, Date.now(), err as Error, {
        note: 'MetaPerformanceProvider error',
      });
      const parsed = this.parseError(err);
      return {
        status: parsed.status,
        metrics: {
          likes: null,
          comments: null,
          reach: null,
          impressions: null,
          shares: null,
          videoViews: null,
          clicks: null,
        },
        errorCode: parsed.code,
        errorMessage: parsed.message,
      };
    }
  }
}

export const metaPerformanceProvider = new MetaPerformanceProvider();
