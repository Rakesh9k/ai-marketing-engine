const saveMock = jest.fn().mockResolvedValue(undefined);
const getSignedUrlMock = jest.fn().mockResolvedValue(['https://storage.example.com/signed-url']);
// F2: uploadGeneratedAsset now gets its URL via getDurableDownloadUrl
// (a token-based, non-expiring firebasestorage.googleapis.com URL), not
// file.getSignedUrl — these two mocks back that path.
const getMetadataMock = jest.fn().mockResolvedValue([{ metadata: {} }]);
const setMetadataMock = jest.fn().mockResolvedValue(undefined);
const fileMock = jest.fn().mockReturnValue({
  save: saveMock,
  getSignedUrl: getSignedUrlMock,
  getMetadata: getMetadataMock,
  setMetadata: setMetadataMock,
});
const bucketMock = jest.fn().mockReturnValue({ file: fileMock, name: 'test-bucket' });

jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: bucketMock }),
}));

import { fetchAsBuffer, uploadGeneratedAsset } from './generatedAssetStorage';

describe('fetchAsBuffer', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('downloads bytes and content-type from the given URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as unknown as typeof fetch;

    const result = await fetchAsBuffer('https://provider.example.com/temp-image.png');
    expect(result.contentType).toBe('image/png');
    expect(Buffer.compare(result.buffer, Buffer.from([1, 2, 3]))).toBe(0);
  });

  it('throws a controlled error (not a crash) when the download fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }) as unknown as typeof fetch;
    await expect(fetchAsBuffer('https://provider.example.com/gone.png')).rejects.toThrow(
      /Failed to download/
    );
  });
});

describe('uploadGeneratedAsset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the asset under businesses/{businessId}/campaigns/{campaignId}/generated/ (correct ownership path)', async () => {
    const result = await uploadGeneratedAsset(
      'biz_1',
      'camp_1',
      'poster',
      Buffer.from('fake-image-bytes'),
      'image/png'
    );

    // Called twice for the SAME storagePath: once to save() the bytes,
    // once inside getDurableDownloadUrl (F2) to read/set the download token.
    expect(fileMock).toHaveBeenCalledTimes(2);
    const storagePathArg = fileMock.mock.calls[0][0] as string;
    expect(storagePathArg).toMatch(
      /^businesses\/biz_1\/campaigns\/camp_1\/generated\/poster_.+\.png$/
    );
    expect(fileMock.mock.calls[1][0]).toBe(storagePathArg);
    expect(result.storagePath).toBe(storagePathArg);
  });

  it('never mixes up business/campaign ownership in the path for a different asset', async () => {
    await uploadGeneratedAsset('biz_A', 'camp_A', 'story', Buffer.from('x'), 'image/svg+xml');
    const pathA = fileMock.mock.calls[0][0] as string;

    await uploadGeneratedAsset('biz_B', 'camp_B', 'story', Buffer.from('x'), 'image/svg+xml');
    const pathB = fileMock.mock.calls[2][0] as string;

    expect(pathA).toContain('biz_A');
    expect(pathA).not.toContain('biz_B');
    expect(pathB).toContain('biz_B');
    expect(pathB).not.toContain('biz_A');
  });

  it('uploads with the given content type and returns a durable, non-expiring, non-provider-temporary URL', async () => {
    const result = await uploadGeneratedAsset(
      'biz_1',
      'camp_1',
      'poster',
      Buffer.from('x'),
      'image/svg+xml'
    );
    expect(saveMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ metadata: { contentType: 'image/svg+xml' } })
    );
    // F2: a token-based download URL (same mechanism as the client SDK's
    // getDownloadURL()) — not a 7-day V4 signed URL. Host varies (real
    // firebasestorage.googleapis.com vs. the Storage emulator's own host)
    // depending on whether FIREBASE_STORAGE_EMULATOR_HOST happens to be set
    // in the environment this particular test run is under — see storageUrls.ts.
    expect(result.url).toMatch(/^https?:\/\/[^/]+\/v0\/b\/test-bucket\/o\/.+\?alt=media&token=.+$/);
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });
});
