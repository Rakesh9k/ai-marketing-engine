import type { PublishPlatform, PublishContentType, PublishErrorCode } from './publishing';

export type ScheduledPostStatus = 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';

export interface ScheduledPost {
  scheduledPostId: string;
  userId: string;
  businessId: string;
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  mediaUrls: string[];
  caption: string;
  scheduledAt: string; // ISO 8601 UTC timestamp string
  timezone: string; // IANA timezone e.g. "Asia/Kolkata"
  status: ScheduledPostStatus;

  // Lease & worker concurrency locking fields
  processingBy?: string | null;
  processingAt?: string | null;
  leaseExpiresAt?: string | null;
  attemptId?: string | null;

  // Phase 10 execution bridge & published metadata
  publishJobId?: string | null;
  externalPostId?: string | null;

  // Retry tracking
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;

  // Error details
  errorCode?: PublishErrorCode | string | null;
  errorMessage?: string | null;

  publishedAt?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  scheduledAt: string; // ISO 8601 string
  timezone: string; // IANA timezone
  captionOverride?: string;
  idempotencyKey?: string;
}

export interface RescheduleInput {
  scheduledPostId: string;
  newScheduledAt: string; // ISO 8601 string
  timezone: string; // IANA timezone
}
