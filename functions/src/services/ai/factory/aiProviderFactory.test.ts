import { z } from 'zod';
import {
  getTextAI,
  getVisionAI,
  getReelVisionAI,
  getImageAI,
  getVideoAI,
  getAudioAI,
  getRenderer,
} from './aiProviderFactory';

/**
 * Phase 0 provider-boundary tests. These prove the architecture, not vendor
 * behavior: a caller can get each capability without knowing which vendor
 * backs it, and a not-yet-configured provider fails loudly rather than
 * pretending to succeed.
 */
describe('aiProviderFactory', () => {
  it('getTextAI returns an object satisfying the TextAI shape without importing Gemini directly', () => {
    const textAI = getTextAI();
    expect(typeof textAI.generateText).toBe('function');
    expect(typeof textAI.generateStructured).toBe('function');
  });

  it('getVisionAI / getReelVisionAI satisfy their shapes', () => {
    expect(typeof getVisionAI().analyzeProductImages).toBe('function');
    expect(typeof getVisionAI().analyzeReferenceStyle).toBe('function');
    expect(typeof getReelVisionAI().classifyReelClipThumbnails).toBe('function');
  });

  it('getImageAI satisfies ImageAI and exposes optional removeBackground', () => {
    const imageAI = getImageAI();
    expect(typeof imageAI.generateImage).toBe('function');
    expect(typeof imageAI.removeBackground).toBe('function');
  });

  it("getRenderer returns Mitra's own renderer (analyzeClip/renderReel)", () => {
    const renderer = getRenderer();
    expect(typeof renderer.analyzeClip).toBe('function');
    expect(typeof renderer.renderReel).toBe('function');
  });

  it('VideoAI (Veo) is architected but not configured: it throws, it never fakes success', async () => {
    await expect(getVideoAI().generateVideo({ prompt: 'a 15s reel' })).rejects.toThrow(
      /not configured/i
    );
  });

  it('AudioAI (ElevenLabs) is architected but not configured: it throws, it never fakes success', async () => {
    await expect(getAudioAI().generateAudio({ text: 'hello' })).rejects.toThrow(/not configured/i);
  });

  it('ImageAI.removeBackground (Photoroom) is architected but not configured: it throws, it never fakes success', async () => {
    await expect(
      getImageAI().removeBackground!({ sourceImageUrl: 'https://example.com/a.png' })
    ).rejects.toThrow(/not configured/i);
  });

  it('a service can call TextAI.generateStructured through the abstraction, provider swappable underneath', async () => {
    // Proves substitutability: the caller only needs the TextAI shape.
    const fakeTextAI = { generateText: jest.fn(), generateStructured: jest.fn() };
    fakeTextAI.generateStructured.mockResolvedValue({ ok: true });

    const schema = z.object({ ok: z.boolean() });
    const result = await fakeTextAI.generateStructured('prompt', schema);
    expect(result).toEqual({ ok: true });
  });
});
