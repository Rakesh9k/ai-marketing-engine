const generateStructuredTextMock = jest.fn().mockResolvedValue({
  headlines: [{ text: 'ABC Biryani: Special Friday Offer', characterCount: 30, variant: 'v1' }],
  adCopies: [
    {
      primaryText: 'ABC Biryani: Spicy Chicken Biryani at ₹299 only',
      headline: 'Friday Special',
      description: 'Delicious biryani in Kondapur',
      cta: 'Order Now',
    },
  ],
  captions: [
    {
      text: 'ABC Biryani special weekend offer on Chicken Biryani',
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
    message: 'Order Chicken Biryani from ABC Biryani now! Call 9876543210',
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

describe('Gemini Context Assembly Verification Suite', () => {
  it('verifies that Gemini request payload receives the FULL enriched context and rules for a minimal user prompt', async () => {
    const pipeline = new GenerationPipeline();

    // User configured settings:
    // User says: "Create a biryani campaign."
    // Language: Telugu
    // Style: Quirky
    // Location: Hyderabad
    // Audience: Young professionals
    // Brand tone: Friendly
    const input: GenerationPipelineInput = {
      businessId: 'biz_ctx_100',
      campaignId: 'camp_ctx_100',
      businessName: 'ABC Biryani',
      businessCategory: 'restaurant',
      businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      whatsappNumber: '9876543210',
      businessPhone: '9876543210',
      businessBrain: {
        identity: {
          name: 'ABC Biryani',
          category: 'restaurant',
          description: 'Famous biryani place',
          location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
          contact: { phone: '9876543210', whatsapp: '9876543210' },
        },
        products: [
          {
            productId: 'prod_1',
            name: 'Chicken Biryani',
            description: 'Spicy chicken biryani',
            price: 299,
            category: 'Main',
            tags: ['biryani'],
            attributes: {},
          },
        ],
        brand: {
          tone: 'friendly',
          personality: 'warm',
          visualPreferences: 'vibrant',
          colors: { primary: '#FF5722', secondary: '#4CAF50', accent: '#FFC107' },
          fonts: { heading: 'Inter', body: 'Inter' },
        },
        audience: {
          targetCustomer: 'Young professionals',
          ageRange: { min: 21, max: 35 },
          localities: ['Kondapur'],
          preferences: 'foodie',
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
      brandProfile: { tone: 'friendly' },
      objective: 'Promotion',
      productId: 'prod_1',
      productName: 'Chicken Biryani',
      offerHeadline: 'Create a biryani campaign.',
      offerPrice: 299,
      offerOriginalPrice: 350,
      offerType: 'fixed',
      offerValidityStart: '2026-03-10T00:00:00.000Z',
      offerValidityEnd: '2026-03-15T00:00:00.000Z',
      duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
      audience: { localities: ['Kondapur'], targetCustomer: 'Young professionals' } as any,
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
        audienceDescription: 'Young professionals',
        brandTone: 'friendly',
        campaignStyle: 'quirky',
        contentFormat: 'poster',
      },
      campaignStyle: 'quirky',
    };

    const result = await pipeline.execute(input);

    expect(result.success).toBe(true);
    expect(result.pipelineTrace).toBeDefined();

    const promptData = result.pipelineTrace?.promptBuilder.data;
    expect(promptData).toBeDefined();

    // 1. Verify User Request is captured
    expect(promptData?.userRequest).toContain('Create a biryani campaign.');

    // 2. Verify Relevant Business Context includes all configured facts
    const contextText = promptData?.businessContext || '';
    expect(contextText).toContain('Location: Kondapur, Hyderabad');
    expect(contextText).toContain('Language: Telugu');
    expect(contextText).toContain('Audience: Young professionals');
    expect(contextText).toContain('Brand tone: friendly');
    expect(contextText).toContain('Style: quirky');

    // 3. Verify Product and Objective
    expect(contextText).toContain('PRODUCT:\nChicken Biryani');
    expect(contextText).toContain('OBJECTIVE:\nPromotion');

    // 4. Verify Strict Rules
    expect(contextText).toContain('Do not invent pricing (Locked to ₹299)');
    expect(contextText).toContain('Do not change product facts (Chicken Biryani)');
    expect(contextText).toContain('Never invent phone numbers, URLs, or non-existent discounts');
  });
});
