/**
 * Classifies a thrown error so the UI can say what actually happened instead of a blanket
 * "Something went wrong". Offline is only reported when there is positive evidence (the
 * browser says it is offline, or the SDK reports a network-level failure) — a Cloud Function
 * returning `unavailable` while the browser is online is a SERVER problem, not the user's
 * connection.
 */
export type ErrorKind = 'offline' | 'auth' | 'validation' | 'rate_limit' | 'server' | 'unknown';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  name?: unknown;
}

const NETWORK_MESSAGE =
  /failed to fetch|networkerror|network request failed|network error|client is offline|load failed|err_internet_disconnected|err_network/i;

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Strips a "functions/" or "auth/" style prefix: "functions/unavailable" -> "unavailable". */
function bareCode(code: string): string {
  return code.includes('/') ? code.slice(code.indexOf('/') + 1) : code;
}

export function classifyError(error: unknown): ErrorKind {
  const e: ErrorLike = error && typeof error === 'object' ? (error as ErrorLike) : {};
  const code = typeof e.code === 'string' ? e.code : '';
  const bare = bareCode(code);
  const message =
    typeof e.message === 'string' ? e.message : typeof error === 'string' ? error : '';
  const status = typeof e.status === 'number' ? e.status : undefined;

  // Positive evidence of a connectivity problem comes first.
  if (isBrowserOffline()) return 'offline';
  if (code === 'auth/network-request-failed') return 'offline';
  if (NETWORK_MESSAGE.test(message)) return 'offline';
  if (e.name === 'TypeError' && /fetch/i.test(message)) return 'offline';

  if (code === 'auth/too-many-requests' || bare === 'resource-exhausted' || status === 429) {
    return 'rate_limit';
  }

  if (
    bare === 'unauthenticated' ||
    bare === 'permission-denied' ||
    code.startsWith('auth/') ||
    status === 401 ||
    status === 403
  ) {
    return 'auth';
  }

  if (
    bare === 'invalid-argument' ||
    bare === 'failed-precondition' ||
    bare === 'out-of-range' ||
    bare === 'already-exists' ||
    bare === 'not-found' ||
    status === 400 ||
    status === 422
  ) {
    return 'validation';
  }

  if (
    bare === 'unavailable' ||
    bare === 'internal' ||
    bare === 'deadline-exceeded' ||
    bare === 'data-loss' ||
    bare === 'unknown' ||
    (status !== undefined && status >= 500)
  ) {
    return 'server';
  }

  return 'unknown';
}

export interface ErrorCopy {
  kind: ErrorKind;
  /** One or two sentences: what happened, what was interrupted, and what to do next. */
  message: string;
  /** Whether trying the same action again is worth suggesting. */
  retryable: boolean;
}

/**
 * User-facing copy. `action` is a short verb phrase for what was interrupted
 * ("start this campaign"); `workKept` should only be true where the user's input genuinely
 * survives the failure (a form still on screen), because the copy promises it.
 */
export function describeError(
  error: unknown,
  action: string,
  options: { workKept?: boolean } = {}
): ErrorCopy {
  const kind = classifyError(error);
  const kept = options.workKept ? ' Your details are still here.' : '';
  switch (kind) {
    case 'offline':
      return {
        kind,
        retryable: true,
        message: `You appear to be offline, so we couldn’t ${action}.${kept} Reconnect and try again.`,
      };
    case 'auth':
      return {
        kind,
        retryable: false,
        message: `Your session may have expired, so we couldn’t ${action}. Please sign in again.`,
      };
    case 'rate_limit':
      return {
        kind,
        retryable: true,
        message: `There are too many requests right now, so we couldn’t ${action}.${kept} Wait a minute, then try again.`,
      };
    case 'validation':
      return {
        kind,
        retryable: false,
        message: `We couldn’t ${action} because something in the request needs fixing.${kept} Check the details and try again.`,
      };
    case 'server':
      return {
        kind,
        retryable: true,
        message: `Our servers had a problem, so we couldn’t ${action}. Your connection looks fine.${kept} Please try again in a moment.`,
      };
    default:
      return {
        kind,
        retryable: true,
        message: `We couldn’t ${action}.${kept} Please try again.`,
      };
  }
}
