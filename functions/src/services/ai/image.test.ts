import { GeminiImageProvider } from './image';
import type { ImageGenerationRequest } from '../../types';

const FAKE_KEY = 'test-fake-gemini-key-for-unit-tests-only';
const req: ImageGenerationRequest = { prompt: 'a biryani hero shot', generationMode: 'product_ad' };
const PNG = Buffer.from('fake-png-bytes');

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const imageOk = (data = PNG.toString('base64')) =>
  jsonResponse(200, {
    candidates: [
      { content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/png', data } }] } },
    ],
  });

describe('GeminiImageProvider', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env['GEMINI_API_KEY'] = FAKE_KEY;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('text-to-image: returns inline image bytes and sends key only in header, never the URL', async () => {
    fetchMock.mockResolvedValueOnce(imageOk());
    const result = await new GeminiImageProvider().generateImage(req);

    expect(result.success).toBe(true);
    expect(Buffer.from(result.imageData!.base64, 'base64').equals(PNG)).toBe(true);
    expect(result.provider).toBe('gemini');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(':generateContent');
    expect(url).not.toContain(FAKE_KEY);
    expect(init.headers['x-goog-api-key']).toBe(FAKE_KEY);
    expect(JSON.parse(init.body).generationConfig.responseModalities).toContain('IMAGE');
  });

  it('reference image: the actual image BYTES are sent as inlineData (not just a URL in the prompt)', async () => {
    const refBytes = Buffer.from('real-product-photo-bytes');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () =>
          refBytes.buffer.slice(refBytes.byteOffset, refBytes.byteOffset + refBytes.length),
      })
      .mockResolvedValueOnce(imageOk());

    const result = await new GeminiImageProvider().generateImage({
      ...req,
      sourceImageUrl: 'https://storage.example.com/photo.jpg',
    });

    expect(result.success).toBe(true);
    expect(result.metadata).toMatchObject({ referenceImageSent: true });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    const parts = body.contents[0].parts;
    const inline = parts.find((p: any) => p.inlineData);
    expect(inline.inlineData.mimeType).toBe('image/jpeg');
    expect(Buffer.from(inline.inlineData.data, 'base64').equals(refBytes)).toBe(true);
    expect(JSON.stringify(parts.filter((p: any) => p.text))).not.toContain('storage.example.com');
  });

  it('rejects an unsupported reference image type before calling Gemini', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'image/gif' },
      arrayBuffer: async () => new ArrayBuffer(4),
    });
    const result = await new GeminiImageProvider().generateImage({
      ...req,
      sourceImageUrl: 'https://x/y.gif',
    });
    expect(result.error?.code).toBe('UNSUPPORTED_IMAGE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized reference image', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new ArrayBuffer(8 * 1024 * 1024),
    });
    const result = await new GeminiImageProvider().generateImage({
      ...req,
      sourceImageUrl: 'https://x/y.png',
    });
    expect(result.error?.code).toBe('IMAGE_TOO_LARGE');
  });

  it('missing API key fails without any network call', async () => {
    process.env['GEMINI_API_KEY'] = '';
    // env config is cached at first read; the provider reads it lazily per call
    const p = new GeminiImageProvider();
    (p as any).apiKey; // touch
    jest.spyOn(p as any, 'apiKey', 'get').mockReturnValue('');
    const result = await p.generateImage(req);
    expect(result.error?.code).toBe('MISSING_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      400,
      { error: { message: 'API key not valid. Please pass a valid API key.' } },
      'INVALID_API_KEY',
    ],
    [403, {}, 'UNAUTHORIZED'],
    [402, {}, 'BILLING_REQUIRED'],
    [404, {}, 'MODEL_UNAVAILABLE'],
    [429, {}, 'RATE_LIMITED'],
    [503, {}, 'PROVIDER_UNAVAILABLE'],
  ])('HTTP %i maps to %s and never leaks the key', async (status, body, code) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(status as number, body));
    const result = await new GeminiImageProvider().generateImage(req);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(code);
    expect(JSON.stringify(result)).not.toContain(FAKE_KEY);
  });

  it('safety block and malformed responses are distinct controlled failures', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { promptFeedback: { blockReason: 'SAFETY' } })
    );
    expect((await new GeminiImageProvider().generateImage(req)).error?.code).toBe('SAFETY_BLOCKED');

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: 'no image' }] } }] })
    );
    expect((await new GeminiImageProvider().generateImage(req)).error?.code).toBe(
      'MALFORMED_RESPONSE'
    );

    fetchMock.mockResolvedValueOnce(imageOk(''));
    expect((await new GeminiImageProvider().generateImage(req)).error?.code).toBe(
      'MALFORMED_RESPONSE'
    );
  });

  it('network failure resolves (never throws) with a generic failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));
    const result = await new GeminiImageProvider().generateImage(req);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('IMAGE_GENERATION_FAILED');
  });
});
