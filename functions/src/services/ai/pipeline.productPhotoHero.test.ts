/**
 * I1 (Pass 2 fix plan) — when a real product photo exists, the pipeline
 * must use it directly as the hero image rather than generating a fake one
 * with DALL-E 3 (whose images.generate API cannot accept a reference image
 * at all — see image.ts and imagePromptBuilder.ts's removed "EXACT visual
 * reference" claim). Proven by running the REAL GenerationPipeline.execute()
 * end-to-end, the same pattern pipeline.imageCallCount.test.ts uses.
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

const REAL_PRODUCT_PHOTO_URL =
  'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/businesses%2Fbiz_1%2Fproducts%2Fp1%2F1.jpg?alt=media&token=real-token';

const fetchAsBufferMock = jest.fn().mockResolvedValue({
  buffer: Buffer.from('real-product-photo-bytes'),
  contentType: 'image/jpeg',
});
const uploadGeneratedAssetMock = jest
  .fn()
  .mockImplementation(async (businessId: string, campaignId: string, type: string) => ({
    url: `https://storage.example.com/${businessId}/${campaignId}/${type}-${Math.random()}`,
    storagePath: `businesses/${businessId}/campaigns/${campaignId}/generated/${type}.png`,
  }));

jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: (...args: unknown[]) => fetchAsBufferMock(...args),
  uploadGeneratedAsset: (...args: unknown[]) => uploadGeneratedAssetMock(...args),
  downloadFromStoragePath: jest.fn().mockRejectedValue(new Error('no logo in this test')),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

function makeInputWithProductPhoto(): GenerationPipelineInput {
  return {
    businessId: 'biz_1',
    campaignId: 'camp_1',
    businessName: 'Test Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    businessBrain: {} as any,
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
    localizationProfile: {} as any,
    campaignStyle: 'funny',
    // Populated the same way generateCampaignStrategy.ts populates it for
    // BOTH a brand-new product and an EXISTING selected product (see
    // pipelineProduct in that file) — the real, saved product photo.
    newProduct: {
      name: 'Paneer Biryani',
      price: 299,
      images: [REAL_PRODUCT_PHOTO_URL],
      category: 'main',
    },
  };
}

describe('GenerationPipeline — real product photo used as hero (I1)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the real product photo and never calls the AI image provider when one exists', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInputWithProductPhoto());

    expect(fetchAsBufferMock).toHaveBeenCalledWith(REAL_PRODUCT_PHOTO_URL);
    expect(generateImageMock).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('still produces a composited poster (the real photo + deterministic text overlay)', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInputWithProductPhoto());

    const posterAssets = result.campaignPack.assets.filter((a: any) => a.type === 'poster');
    expect(posterAssets.length).toBeGreaterThanOrEqual(1);
    // Composited via uploadGeneratedAsset — never the raw product-photo URL
    // or a raw AI-provider URL persisted directly as the asset.
    expect(posterAssets[0].imageUrl).toMatch(/^https:\/\/storage\.example\.com\//);
  });

  it('falls back to AI generation when no real product photo exists', async () => {
    const pipeline = new GenerationPipeline();
    const input = makeInputWithProductPhoto();
    delete (input as any).newProduct;

    await pipeline.execute(input);

    expect(fetchAsBufferMock).not.toHaveBeenCalledWith(REAL_PRODUCT_PHOTO_URL);
    expect(generateImageMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to AI generation if the real photo fails to load (never crashes generation)', async () => {
    fetchAsBufferMock.mockRejectedValueOnce(new Error('photo storage read failed'));

    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeInputWithProductPhoto());

    expect(generateImageMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
