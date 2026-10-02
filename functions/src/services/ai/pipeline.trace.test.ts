const generateStructuredTextMock = jest.fn().mockResolvedValue({
  headlines: [{ text: 'సన్ డే ఫ్రైడే బిర్యానీ ఫన్!', characterCount: 20, variant: 'v1' }],
  adCopies: [
    {
      primaryText: 'Spicy Chicken Biryani at ₹299 only',
      headline: 'Friday Special',
      description: 'Best biryani in Kondapur',
      cta: 'Order Now',
    },
  ],
  captions: [
    {
      text: 'Special weekend offer on Chicken Biryani',
      hashtags: ['#biryani'],
      characterCount: 40,
    },
  ],
  storyConcepts: [
    { frames: [{ copy: 'Special offer', visualCue: 'Biryani plate' }], overallTheme: 'Friday Fun' },
  ],
  reelConcepts: [
    {
      hook: 'craving biryani?',
      scenes: [{ description: 'sizzling biryani', visualDirection: 'close up', duration: '3s' }],
      productReveal: 'Chicken Biryani',
      cta: 'Order now',
      caption: 'Try now',
      shootingTips: 'good lighting',
    },
  ],
  whatsappMessage: {
    message: 'Order Chicken Biryani now!',
    waLink: 'https://wa.me/919876543210',
    attributionParams: { campaignId: 'c1', creativeId: 'cr1', source: 'wa' },
  },
  ctaVariations: [{ text: 'Order on WhatsApp', variant: 'primary' }],
});
const analyzeProductImagesMock = jest.fn();
const generateImageMock = jest.fn().mockResolvedValue({
  success: true,
  imageUrl: 'https://provider.example.com/temp-hero.png',
  provider: 'gemini',
  model: 'imagen-3',
});

jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: (...args: unknown[]) => analyzeProductImagesMock(...args),
  generateImage: (...args: unknown[]) => generateImageMock(...args),
}));

const fetchAsBufferMock = jest
  .fn()
  .mockResolvedValue({ buffer: Buffer.from('fake-bytes'), contentType: 'image/png' });
const uploadGeneratedAssetMock = jest
  .fn()
  .mockImplementation(async (businessId: string, campaignId: string, type: string) => ({
    url: `https://storage.example.com/${businessId}/${campaignId}/${type}-${Math.random()}`,
    storagePath: `businesses/${businessId}/campaigns/${campaignId}/generated/${type}.png`,
  }));

jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: (...args: unknown[]) => fetchAsBufferMock(...args),
  uploadGeneratedAsset: (...args: unknown[]) => uploadGeneratedAssetMock(...args),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

function makeTraceInput(): GenerationPipelineInput {
  return {
    businessId: 'biz_trace_123',
    campaignId: 'camp_trace_456',
    businessName: 'ABC Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    businessBrain: {
      identity: {
        name: 'ABC Biryani House',
        category: 'restaurant',
        description: 'Authentic Hyderabadi Biryani',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      products: [
        {
          productId: 'prod_biryani',
          name: 'Chicken Biryani',
          description: 'Spicy dum biryani',
          price: 299,
          category: 'Main',
          tags: ['biryani', 'chicken'],
          attributes: {},
        },
      ],
      brand: {
        tone: 'friendly',
        personality: 'fun and local',
        visualPreferences: 'vibrant',
        colors: { primary: '#FF5722', secondary: '#4CAF50', accent: '#FFC107' },
        fonts: { heading: 'Inter', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'local food lovers',
        ageRange: { min: 18, max: 45 },
        localities: ['Kondapur'],
        preferences: 'spicy food',
      },
      localization: {
        primaryLanguage: 'te',
        secondaryLanguage: 'en',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'moderate',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 5,
        minimumOrder: 200,
        offerValidityRules: '',
        pricingRules: '',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    },
    brandProfile: {
      tone: 'friendly',
    },
    objective: 'promotion',
    productId: 'prod_biryani',
    productName: 'Chicken Biryani',
    offerHeadline: 'Friday Biryani Special',
    offerPrice: 299,
    offerOriginalPrice: 350,
    offerType: 'percentage',
    offerValidityStart: '2026-03-10T00:00:00.000Z',
    offerValidityEnd: '2026-03-15T00:00:00.000Z',
    duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'], occasion: 'Friday special' },
    cta: 'order_whatsapp',
    localizationProfile: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'te',
      secondaryLanguage: 'en',
      languageMixing: 'natural',
      regionalStyle: 'hyderabadi',
      slangPreference: 'moderate',
    },
    campaignStyle: 'funny',
  } as unknown as GenerationPipelineInput;
}

describe('GenerationPipeline 11-Stage Trace Building', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a complete 11-stage PipelineTrace covering every required stage', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(makeTraceInput());

    expect(result.success).toBe(true);
    expect(result.pipelineTrace).toBeDefined();

    const trace = result.pipelineTrace!;
    expect(trace.campaignId).toBe('camp_trace_456');
    expect(trace.businessId).toBe('biz_trace_123');

    // 1. User Request
    expect(trace.userRequest.data.targetProduct).toBe('Chicken Biryani');
    expect(trace.userRequest.data.language).toBe('te');
    expect(trace.userRequest.data.style).toBe('funny');

    // 2. Mitra UI
    expect(trace.mitraUi.data['ctaSelection']).toBe('order_whatsapp');

    // 3. Intent Extraction
    expect(trace.intentExtraction.data.extractedProduct).toBe('Chicken Biryani');

    // 4. Business Brain Retrieval
    expect(trace.businessBrainRetrieval.data.business).toBe('ABC Biryani House');
    expect(trace.businessBrainRetrieval.data.price).toBe('₹299');

    // 5. Context Selected by Mitra
    expect(trace.contextAssembly.data.selectedContext.businessIdentity).toBe(true);
    expect(trace.contextAssembly.data.selectedContext.productInformation).toBe(true);

    // 6. Actual Gemini Request
    expect(trace.promptBuilder.data.systemInstruction).toContain('Mitra');

    // 7. Gemini Response
    expect(trace.geminiResponse.data.headline).toBeDefined();

    // 8. Validation / Truth Check
    expect(trace.validationTruthCheck.data.checks.length).toBeGreaterThanOrEqual(5);

    // 9. Mitra Transformations
    expect(trace.mitraTransformations.data.appliedTransformations.length).toBeGreaterThan(0);

    // 10. Creative Generation
    expect(trace.creativeGeneration.data.generatedPostersCount).toBeGreaterThanOrEqual(1);

    // 11. Final Campaign
    expect(trace.finalCampaign.data.campaignId).toBe('camp_trace_456');
  });
});
