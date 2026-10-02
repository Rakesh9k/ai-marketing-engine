const generateStructuredTextMock = jest.fn().mockResolvedValue({
  headlines: [{ text: 'సన్ డే ఫ్రైడే బిర్యానీ ఫన్!', characterCount: 20, variant: 'v1' }],
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
    message: 'Order Chicken Biryani from ABC Biryani now!',
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
import {
  INSTRUCTION_CHAIN_TEST_MATRIX,
  evaluateInstructionChainTestCase,
} from './instructionChain';

function makeBaseInput(): GenerationPipelineInput {
  return {
    businessId: 'biz_ic_100',
    campaignId: 'camp_ic_100',
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
        targetCustomer: 'local food lovers',
        ageRange: { min: 18, max: 45 },
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
    objective: 'promotion',
    productId: 'prod_1',
    productName: 'Chicken Biryani',
    offerHeadline: 'Friday Special Biryani',
    offerPrice: 299,
    offerOriginalPrice: 350,
    offerType: 'fixed',
    offerValidityStart: '2026-03-10T00:00:00.000Z',
    offerValidityEnd: '2026-03-15T00:00:00.000Z',
    duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'], occasion: 'Friday Special' },
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

describe('Instruction Chain Test Matrix (12 Real User Scenarios)', () => {
  let pipeline: GenerationPipeline;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new GenerationPipeline();
  });

  INSTRUCTION_CHAIN_TEST_MATRIX.forEach((testCase) => {
    it(`evaluates instruction chain for "${testCase.userSays}" -> Mitra understands "${testCase.mitraShouldUnderstand}"`, async () => {
      const evalResult = await evaluateInstructionChainTestCase(
        pipeline,
        makeBaseInput(),
        testCase
      );

      expect(evalResult.userIntentPassed).toBe(true);
      expect(evalResult.mitraInterpretationPassed).toBe(true);
      expect(evalResult.geminiInstructionPassed).toBe(true);
      expect(evalResult.geminiOutputPassed).toBe(true);
      expect(evalResult.finalOutputPassed).toBe(true);
      expect(evalResult.overallPassed).toBe(true);
    });
  });
});
