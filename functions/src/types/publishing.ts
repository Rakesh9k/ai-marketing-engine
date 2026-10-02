export type PublishPlatform = 'instagram' | 'facebook';

export type PublishContentType = 'post' | 'reel';

export type PublishStatus =
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'processing'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type PublishErrorCode =
  | 'AUTH_REQUIRED'
  | 'CONNECTION_REVOKED'
  | 'PERMISSION_DENIED'
  | 'INVALID_MEDIA'
  | 'UNSUPPORTED_CONTENT'
  | 'RATE_LIMITED'
  | 'META_API_ERROR'
  | 'NETWORK_ERROR'
  | 'PROCESSING_TIMEOUT'
  | 'UNKNOWN';

export interface PublishJob {
  jobId: string;
  userId: string;
  businessId: string;
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  mediaUrl: string;
  caption: string;
  scheduledAt?: string | null;
  status: PublishStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  publishedAt?: string | null;
  externalPostId?: string | null;
  externalContainerId?: string | null;
  idempotencyKey: string;
  errorCode?: PublishErrorCode | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishInput {
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  scheduledAt?: string | null;
  captionOverride?: string;
  idempotencyKey?: string;
}

export interface PublishResult {
  success: boolean;
  job: PublishJob;
  externalPostId?: string | null;
  error?: {
    code: PublishErrorCode;
    message: string;
    retryable: boolean;
  };
}
