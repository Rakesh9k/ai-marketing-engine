/**
 * Billing/entitlement reads must never turn an infrastructure failure into "Free plan, 0 credits".
 *
 * The data services return `null` when a document does not exist (a legitimate state: the
 * documented default is Free) and THROW when Firestore cannot be read. Callers used to swallow
 * both with `.catch(() => null)`, so a real paid customer looked unsubscribed whenever Firestore
 * was unavailable. These helpers keep the two cases apart.
 */

export type ReadResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Non-sensitive description of a failure: error code/name + message, never IDs or payloads. */
export function describeReadError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; name?: unknown; message?: unknown };
    const code =
      typeof e.code === 'string' ? e.code : typeof e.name === 'string' ? e.name : 'error';
    const message = typeof e.message === 'string' ? e.message.slice(0, 200) : '';
    return message ? `${code}: ${message}` : code;
  }
  return String(error).slice(0, 200);
}

/** Runs a read and reports success or a described failure instead of throwing. */
export async function settleRead<T>(label: string, read: () => Promise<T>): Promise<ReadResult<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    const description = describeReadError(error);
    // eslint-disable-next-line no-console
    console.error(`[billing] ${label} read failed`, description);
    return { ok: false, error: description };
  }
}
