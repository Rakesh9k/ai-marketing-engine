/**
 * Proves, using the REAL GenerationPipeline.execute() (not a disconnected
 * helper), that BrandKit values survive the full chain:
 *
 *   BrandKit -> getBrandCreativeContext() -> GenerationPipelineInput.brandProfile
 *     -> buildCreativeBrief() -> buildBrandStyle() -> composeCreativeSVG()
 *
 * and land in the actual uploaded SVG bytes — not just in an intermediate
 * object that never reaches the renderer. This is the specific chain that
 * was broken before this phase: brandProfile was typed `any`, so
 * `brandProfile.logo.url` (wrong — the real field is `logo.primary.url`)
 * and `brandProfile.brandTone` (wrong — the real field is `tone`) silently
 * read `undefined` at runtime with no compiler warning.
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

const fetchAsBufferMock = jest
  .fn()
  .mockResolvedValue({ buffer: Buffer.from('fake-bytes'), contentType: 'image/png' });
const uploadGeneratedAssetMock = jest.fn().mockImplementation(
  async (businessId: string, campaignId: string, type: string) => ({
    url: `https://storage.example.com/${businessId}/${campaignId}/${type}-${Math.random()}`,
    storagePath: `businesses/${businessId}/campaigns/${campaignId}/generated/${type}.svg`,
  })
);

jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: (...args: unknown[]) => fetchAsBufferMock(...args),
  uploadGeneratedAsset: (...args: unknown[]) => uploadGeneratedAssetMock(...args),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { getBrandCreativeContext } from './brandCreativeContext';
import type { BrandKit } from '../../types';

const DISTINCTIVE_BRAND_KIT: BrandKit = {
  businessId: 'biz_brand_1',
  logo: {
    primary: {
      url: 'https://example.test/logo-primary.png',
      storagePath: 'businesses/biz_brand_1/brand/logo-primary.png',
      width: 512,
      height: 512,
    },
  },
  colors: {
    primary: '#123456',
    secondary: '#ABCDEF',
    accent: '#0F1E2D',
    background: '#FFFFFF',
    text: '#000000',
  },
  fonts: {
    heading: 'TestHeadingFont',
    body: 'TestBodyFont',
  },
  tone: 'premium',
  visualPreferences: 'cinematic, moody lighting',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeInput(): GenerationPipelineInput {
  return {
    businessId: 'biz_brand_1',
    campaignId: 'camp_brand_1',
    businessName: 'Distinctive Test Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    businessBrain: {},
    brandProfile: getBrandCreativeContext(DISTINCTIVE_BRAND_KIT),
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

describe('BrandKit -> BrandCreativeContext -> compositor (end-to-end)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('the distinctive brand primary color set on BrandKit reaches the uploaded poster SVG', async () => {
    const pipeline = new GenerationPipeline();
    await pipeline.execute(makeInput());

    // Two uploads happen with type 'poster': the re-hosted raw AI hero image
    // (content type image/png, not brand-styled) and the actual composited
    // SVG poster — only the latter carries brand colors, so filter on the
    // SVG content type rather than the asset type alone.
    const posterCall = uploadGeneratedAssetMock.mock.calls.find(
      (call) => call[2] === 'poster' && call[4] === 'image/svg+xml'
    );
    expect(posterCall).toBeDefined();
    const svg = (posterCall as unknown[])[3] as Buffer;
    expect(svg.toString('utf-8')).toContain('#123456');
  });

  it('business name, price, and CTA reach the same SVG through the existing (non-BrandKit) campaign context', async () => {
    const pipeline = new GenerationPipeline();
    await pipeline.execute(makeInput());

    const posterCall = uploadGeneratedAssetMock.mock.calls.find(
      (call) => call[2] === 'poster' && call[4] === 'image/svg+xml'
    );
    const svg = ((posterCall as unknown[])[3] as Buffer).toString('utf-8');

    expect(svg).toContain('Distinctive Test Biryani House');
    expect(svg).toContain('₹299');
    expect(svg).toContain('Order on WhatsApp');
  });

  it('a business with no BrandKit still renders (falls back to default brand style, never crashes)', async () => {
    const input = makeInput();
    input.brandProfile = getBrandCreativeContext(null);

    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(input);

    expect(result.success).toBe(true);
  });
});
