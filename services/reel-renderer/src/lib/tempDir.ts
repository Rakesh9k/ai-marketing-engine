import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Creates a fresh scratch directory under the OS temp dir for one
 * analyze-clip or render job, and guarantees cleanup via `withTempDir`'s
 * try/finally — this endpoint runs many times per day and Cloud Run
 * containers are reused across requests, so leaked temp files would
 * eventually fill the container's disk.
 */
export async function createTempDir(prefix: string): Promise<string> {
  const dir = path.join(os.tmpdir(), `reel-${prefix}-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function removeTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup; a failure here must never mask the real
    // success/failure of the render itself.
  }
}

export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await createTempDir(prefix);
  try {
    return await fn(dir);
  } finally {
    await removeTempDir(dir);
  }
}
