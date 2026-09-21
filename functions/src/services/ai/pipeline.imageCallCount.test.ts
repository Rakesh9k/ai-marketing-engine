/**
 * Proves, by running the REAL GenerationPipeline.execute() end-to-end (not
 * a disconnected helper), that a full campaign generation makes exactly
 * MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN AI image-provider calls — not the
 * 32 the prior implementation made (5 posters + 3 stories x 4 frames +
 * 3 reels x 5 frames, confirmed against the actual pre-Phase-7 code).
 */
const generateStructuredTextMock = jest.fn().mockResolvedValue({});
const analyzeProductImagesMock = jest.fn();
const generateImageMock = jest.fn().mockResolvedValue({
  success: true,
  imageUrl: 'https://provider.example.com/temp-hero.png',
  provider: 'openai',
  model: 'dall-e-3',
});

jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: (...args: unknown[]) => analyzeProductImagesMock(...args),
  generateImage: (...args: unknown[]) => generateImageMock(...args),
}));

const fetchAsBufferMock = jest.fn().mockResolvedValue({ buffer: Buffer.from('fake-bytes'), contentType: 'image/png' });
const uploadGeneratedAssetMock = jest.fn().mockImplementation(async (businessId: string, campaignId: string, type: string) => ({
  url: `https://storage.example.com/${businessId}/${campaignId}/${type}-${Math.random()}`,
  storagePath: `businesses/${businessId}/campaigns/${campaignId}/generated/${type}.png`,
}));

jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: (...args: unknown[]) => fetchAsBufferMock(...args),
  uploadGeneratedAsset: (...args: unknown[]) => uploadGeneratedAssetMock(...args),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN } from '../../config/pricing';

function makeInput(): GenerationPipelineInput {
  return {
    businessId: 'biz_1',
    campaignId: 'camp_1',
    businessName: 'Test Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    businessBrain: {},
    brandProfile: {},
    objective: 'weekend_offer',
    productId: 'prod_1',
    productName: 'Paneer Biryani',
    offerHeadline: 'Weekend Special',
    offerPrice: 299,
    offerOriginalPrice: 332,
    offerType: 'percentage',
    offerValidityStart: '2026-03-10T00:00:00.000Z',
    offerValidityEnd: '2026-03-15T00:00:00.000Z',
    duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {},
    campaignStyle: 'funny',
  };
}

describe('GenerationPipeline — actual image-provider call count (Phase 7)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('makes exactly MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN generateImage calls for a full campaign (not 32)', async () => {
    expect(MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN).toBe(1);

    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInput());

    expect(generateImageMock).toHaveBeenCalledTimes(MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN);
    expect(result.success).toBe(true);
  });

  it('produces a poster, story frames, and a reel storyboard from that single AI image (no per-format AI calls)', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInput());
    const campaignPack = result.campaignPack;

    const posterAssets = campaignPack.assets.filter((a: any) => a.type === 'poster');
    const storyAssets = campaignPack.assets.filter((a: any) => a.type === 'story');
    const reelAssets = campaignPack.assets.filter((a: any) => a.type === 'reel');

    expect(posterAssets.length).toBeGreaterThanOrEqual(1);
    expect(storyAssets.length).toBeGreaterThanOrEqual(1);
    expect(reelAssets.length).toBe(1);

    // Only ONE generateImage call regardless of how many composited outputs exist.
    expect(generateImageMock).toHaveBeenCalledTimes(1);
  });

  it('every generated asset uses an asset type that actually exists in the shared AssetType enum (no "story_frame"/"reel_frame")', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInput());
    const validTypes = ['poster', 'headline', 'ad_copy', 'caption', 'story', 'reel', 'whatsapp', 'cta', 'product', 'campaign', 'brand-kit', 'logo'];
    for (const asset of result.campaignPack.assets) {
      expect(validTypes).toContain(asset.type);
    }
  });

  it('uploads every generated visual to Storage — never persists a raw provider URL', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInput());

    const visualAssets = result.campaignPack.assets.filter((a: any) => a.imageUrl);
    expect(visualAssets.length).toBeGreaterThan(0);
    for (const asset of visualAssets) {
      expect(asset.imageUrl).toMatch(/^https:\/\/storage\.example\.com\//);
      expect(asset.imageUrl).not.toContain('provider.example.com');
    }
  });

  it('if the single AI image call fails, generation fails outright rather than silently shipping a text-only campaign (routes into the existing credit-refund path)', async () => {
    generateImageMock.mockResolvedValueOnce({ success: false, provider: 'openai', model: 'dall-e-3', error: { code: 'X', message: 'boom' } });

    const pipeline = new GenerationPipeline();
    await expect(pipeline.execute(makeInput())).rejects.toThrow(/Image generation failed/);
    expect(uploadGeneratedAssetMock).not.toHaveBeenCalled();
  });
});
