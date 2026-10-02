import type { PublishErrorCode } from '@/types';

export interface NormalizedPublishError {
  code: PublishErrorCode;
  userMessage: string;
  isRetryable: boolean;
  actionType: 'retry' | 'reconnect' | 'open_campaign' | 'none';
  actionLabel: string;
}

export function normalizePublishError(
  code?: PublishErrorCode | string | null,
  rawMessage?: string | null
): NormalizedPublishError {
  const errorCode = (code || 'UNKNOWN') as PublishErrorCode;

  switch (errorCode) {
    case 'CONNECTION_REVOKED':
    case 'PERMISSION_DENIED':
    case 'AUTH_REQUIRED':
      return {
        code: errorCode,
        userMessage: 'Social connection is inactive, revoked, or requires updated permissions.',
        isRetryable: false,
        actionType: 'reconnect',
        actionLabel: 'Reconnect Account',
      };

    case 'INVALID_MEDIA':
    case 'UNSUPPORTED_CONTENT':
      return {
        code: errorCode,
        userMessage: rawMessage || 'The media file or format is invalid or unsupported by Meta.',
        isRetryable: false,
        actionType: 'open_campaign',
        actionLabel: 'Open Campaign',
      };

    case 'RATE_LIMITED':
      return {
        code: errorCode,
        userMessage: 'Publishing was temporarily rate-limited. Mitra will retry automatically.',
        isRetryable: true,
        actionType: 'retry',
        actionLabel: 'Retry Now',
      };

    case 'PROCESSING_TIMEOUT':
      return {
        code: errorCode,
        userMessage: "Media processing timed out on Meta's servers.",
        isRetryable: true,
        actionType: 'retry',
        actionLabel: 'Retry',
      };

    case 'META_API_ERROR':
      return {
        code: errorCode,
        userMessage: rawMessage || 'Meta Graph API reported a temporary error.',
        isRetryable: true,
        actionType: 'retry',
        actionLabel: 'Retry',
      };

    case 'NETWORK_ERROR':
      return {
        code: errorCode,
        userMessage: 'A transient network error occurred during publishing.',
        isRetryable: true,
        actionType: 'retry',
        actionLabel: 'Retry',
      };

    case 'UNKNOWN':
    default:
      return {
        code: 'UNKNOWN',
        userMessage: rawMessage || 'Publishing encountered an unexpected error.',
        isRetryable: true,
        actionType: 'retry',
        actionLabel: 'Retry',
      };
  }
}
