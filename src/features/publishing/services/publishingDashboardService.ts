import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import type {
  ScheduledPost,
  PublishJob,
  Campaign,
  SocialConnection,
  SocialConnectionStatus,
} from '@/types';
import {
  scheduledPostConverter,
  publishJobConverter,
  campaignConverter,
} from '@/lib/firebase/converters';
import { metaService } from '@/features/meta/services/metaService';

export interface ScheduledPostWithMetadata extends ScheduledPost {
  campaignTitle?: string;
  thumbnailUrl?: string;
  connectionStatus?: SocialConnectionStatus | 'missing';
}

export interface PublishJobWithMetadata extends PublishJob {
  campaignTitle?: string;
  thumbnailUrl?: string;
  connectionStatus?: SocialConnectionStatus | 'missing';
}

export interface PublishingDashboardSummary {
  totalScheduled: number;
  totalPublished: number;
  totalFailed: number;
  totalNeedsAttention: number;
}

export interface PublishingDashboardData {
  scheduledPosts: ScheduledPostWithMetadata[];
  publishJobs: PublishJobWithMetadata[];
  connections: SocialConnection[];
  summary: PublishingDashboardSummary;
  timezone: string;
}

function getDb(): Firestore {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return db;
}

export const publishingDashboardService = {
  async getDashboardData(userId: string, businessId?: string): Promise<PublishingDashboardData> {
    if (!userId) {
      return {
        scheduledPosts: [],
        publishJobs: [],
        connections: [],
        summary: { totalScheduled: 0, totalPublished: 0, totalFailed: 0, totalNeedsAttention: 0 },
        timezone:
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : 'Asia/Kolkata',
      };
    }

    const db = getDb();

    // 1. Fetch Scheduled Posts
    let postsQuery = query(
      collection(db, 'scheduledPosts').withConverter(scheduledPostConverter),
      where('userId', '==', userId),
      limit(100)
    );
    const postsSnap = await getDocs(postsQuery);
    const rawScheduledPosts = postsSnap.docs.map((doc) => doc.data());

    // 2. Fetch Publish Jobs
    let jobsQuery = query(
      collection(db, 'publishJobs').withConverter(publishJobConverter),
      where('userId', '==', userId),
      limit(100)
    );
    const jobsSnap = await getDocs(jobsQuery);
    const rawPublishJobs = jobsSnap.docs.map((doc) => doc.data());

    // 3. Fetch Campaigns for Title / Thumbnail lookup
    let campaignsQuery = query(
      collection(db, 'campaigns').withConverter(campaignConverter),
      where('userId', '==', userId),
      limit(100)
    );
    const campaignsSnap = await getDocs(campaignsQuery);
    const campaignsMap = new Map<string, Campaign>();
    campaignsSnap.docs.forEach((doc) => {
      const c = doc.data();
      campaignsMap.set(c.campaignId, c);
    });

    // 4. Fetch Connections
    let connections: SocialConnection[] = [];
    try {
      if (businessId) {
        const res = await metaService.listSocialConnections(businessId);
        connections = res.connections || [];
      }
    } catch (e) {
      console.warn('Failed to load social connections for dashboard summary:', e);
    }

    const activeConnectionsMap = new Map<string, SocialConnection>();
    connections.forEach((conn) => {
      activeConnectionsMap.set(conn.connectionId, conn);
    });

    // Helper to extract campaign title & image
    const getCampaignInfo = (campaignId: string) => {
      const c = campaignsMap.get(campaignId);
      if (!c) return { campaignTitle: 'Campaign #' + campaignId.substring(0, 6) };

      const campaignTitle =
        c.offer?.headline || c.objective.replace(/_/g, ' ').toUpperCase() || 'Campaign';

      // Use thumbnail image if provided by campaign assets
      let thumbnailUrl: string | undefined = undefined;
      if (c.newProduct?.images && c.newProduct.images.length > 0) {
        thumbnailUrl = c.newProduct.images[0];
      }

      return { campaignTitle, thumbnailUrl };
    };

    // Helper to determine connection status
    const getConnectionStatus = (connectionId: string) => {
      const conn = activeConnectionsMap.get(connectionId);
      if (!conn) return 'missing' as const;
      return conn.status;
    };

    // Build Scheduled Posts with Metadata
    const scheduledPosts: ScheduledPostWithMetadata[] = rawScheduledPosts
      .map((post) => {
        const { campaignTitle, thumbnailUrl } = getCampaignInfo(post.campaignId);
        const connectionStatus = getConnectionStatus(post.socialConnectionId);
        return {
          ...post,
          campaignTitle,
          thumbnailUrl: post.mediaUrls?.[0] || thumbnailUrl,
          connectionStatus,
        };
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    // Build Publish Jobs with Metadata
    const publishJobs: PublishJobWithMetadata[] = rawPublishJobs
      .map((job) => {
        const { campaignTitle, thumbnailUrl } = getCampaignInfo(job.campaignId);
        const connectionStatus = getConnectionStatus(job.socialConnectionId);
        return {
          ...job,
          campaignTitle,
          thumbnailUrl: job.mediaUrl || thumbnailUrl,
          connectionStatus,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Summary Counts
    const totalScheduled = scheduledPosts.filter((p) => p.status === 'scheduled').length;
    const totalPublished = publishJobs.filter((j) => j.status === 'published').length;
    const totalFailedJobs = publishJobs.filter((j) => j.status === 'failed').length;
    const totalFailedPosts = scheduledPosts.filter((p) => p.status === 'failed').length;
    const totalFailed = Math.max(totalFailedJobs, totalFailedPosts);

    const revokedConnectionsCount = connections.filter((c) => c.status !== 'active').length;
    const totalNeedsAttention = totalFailed + revokedConnectionsCount;

    const userTimezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'Asia/Kolkata';

    return {
      scheduledPosts,
      publishJobs,
      connections,
      summary: {
        totalScheduled,
        totalPublished,
        totalFailed,
        totalNeedsAttention,
      },
      timezone: userTimezone,
    };
  },
};
