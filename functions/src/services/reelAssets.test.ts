/**
 * behavior: a reel can only be called complete when its MP4 is really in Storage, and its
 * playback/download URLs are re-derived from the durable path (stored URLs expire in 7 days).
 */
const exists = jest.fn();
const getMetadata = jest.fn();
const getSignedUrl = jest.fn();
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: () => ({ exists, getMetadata, getSignedUrl }) }) }),
}));

import { assertStoredObject, signReadUrl, withFreshReelUrls, MIN_REEL_BYTES } from './reelAssets';
import type { ReelProject } from '../types';

beforeEach(() => {
  exists.mockReset();
  getMetadata.mockReset();
  getSignedUrl.mockReset().mockResolvedValue(['https://signed.example/x']);
});

describe('assertStoredObject', () => {
  it('rejects an object that was never uploaded', async () => {
    exists.mockResolvedValue([false]);
    await expect(assertStoredObject('p.mp4', MIN_REEL_BYTES, 'Rendered reel')).rejects.toThrow(
      /not found in storage/
    );
  });

  it('rejects an empty or truncated upload (a stub "mp4" must never be completed)', async () => {
    exists.mockResolvedValue([true]);
    getMetadata.mockResolvedValue([{ size: '120' }]);
    await expect(assertStoredObject('p.mp4', MIN_REEL_BYTES, 'Rendered reel')).rejects.toThrow(
      /empty or truncated/
    );
  });

  it('accepts a real-sized object', async () => {
    exists.mockResolvedValue([true]);
    getMetadata.mockResolvedValue([{ size: String(3_000_000) }]);
    await expect(
      assertStoredObject('p.mp4', MIN_REEL_BYTES, 'Rendered reel')
    ).resolves.toBeUndefined();
  });
});

describe('signReadUrl', () => {
  it('forces a download only when asked', async () => {
    await signReadUrl('a.mp4');
    expect(getSignedUrl.mock.calls[0][0]).not.toHaveProperty('responseDisposition');
    await signReadUrl('a.mp4', { downloadFileName: 'r.mp4' });
    expect(getSignedUrl.mock.calls[1][0].responseDisposition).toBe('attachment; filename="r.mp4"');
  });
});

describe('withFreshReelUrls', () => {
  const base = { reelId: 'r1', businessId: 'b1' } as unknown as ReelProject;

  it('re-signs completed reels from their storage paths, replacing expired stored URLs', async () => {
    const out = await withFreshReelUrls({
      ...base,
      status: 'completed',
      outputUrl: 'https://expired',
      outputStoragePath: 'businesses/b1/reels/r1/output/reel.mp4',
      thumbnailStoragePath: 'businesses/b1/reels/r1/output/thumbnail.jpg',
    });
    expect(out.outputUrl).toBe('https://signed.example/x');
    expect(out.downloadUrl).toBe('https://signed.example/x');
    expect(out.thumbnailUrl).toBe('https://signed.example/x');
  });

  it('leaves non-completed reels untouched and never signs a path that does not exist', async () => {
    const failed = { ...base, status: 'failed' } as ReelProject;
    expect(await withFreshReelUrls(failed)).toBe(failed);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('keeps the reel (with its stored URLs) if signing fails', async () => {
    getSignedUrl.mockRejectedValue(new Error('iam down'));
    const reel = {
      ...base,
      status: 'completed',
      outputUrl: 'https://stored',
      outputStoragePath: 'p.mp4',
    } as ReelProject;
    expect((await withFreshReelUrls(reel)).outputUrl).toBe('https://stored');
  });
});
