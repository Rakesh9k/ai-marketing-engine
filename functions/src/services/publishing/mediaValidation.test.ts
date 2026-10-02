import { validateAndResolveMedia, MediaValidationError } from './mediaValidation';

describe('mediaValidation', () => {
  it('validates HTTP/HTTPS URLs for posts', async () => {
    const url = 'https://storage.googleapis.com/bucket/poster.png';
    const resolved = await validateAndResolveMedia(url, 'instagram', 'post');
    expect(resolved).toEqual(url);
  });

  it('rejects empty or invalid URLs', async () => {
    await expect(validateAndResolveMedia('', 'instagram', 'post')).rejects.toThrow(
      MediaValidationError
    );
    await expect(
      validateAndResolveMedia('ftp://invalid.com/pic.png', 'instagram', 'post')
    ).rejects.toThrow(MediaValidationError);
  });

  it('validates Reel content type requires video extension or storage video URL', async () => {
    const reelUrl = 'https://storage.googleapis.com/bucket/reel_sample.mp4';
    const resolved = await validateAndResolveMedia(reelUrl, 'instagram', 'reel');
    expect(resolved).toEqual(reelUrl);
  });
});
