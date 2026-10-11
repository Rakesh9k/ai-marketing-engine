import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import * as aiIndex from './index';

// Mock generateStructuredText and generateImage from aiIndex
jest.mock('./index', () => {
  const actual = jest.requireActual('./index') as any;
  return {
    ...actual,
    generateStructuredText: jest.fn(),
    generateImage: jest.fn(),
  };
});

// Mock generatedAssetStorage for Cloud Storage upload during unit/smoke test
jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest.fn<any>().mockResolvedValue({
    buffer: Buffer.from('mock-buffer'),
    contentType: 'image/png',
  }),
  uploadGeneratedAsset: jest.fn<any>().mockImplementation(async (businessId: string, campaignId: string, assetType: string) => ({
    url: `https://storage.googleapis.com/mock-bucket/${businessId}/${campaignId}/${assetType}.png`,
    storagePath: `mock-bucket/${businessId}/${campaignId}/${assetType}.png`,
  })),
  downloadFromStoragePath: jest.fn<any>().mockResolvedValue({
    buffer: Buffer.from('mock-buffer'),
    contentType: 'image/png',
  }),
}));

describe('Gate 2F — Creative Brain End-to-End Pipeline Smoke Test', () => {
  let pipeline: GenerationPipeline;

  beforeEach(() => {
    pipeline = new GenerationPipeline();
    jest.mocked(aiIndex.generateStructuredText).mockReset();
    jest.mocked(aiIndex.generateImage).mockReset();
  });

  const baseBusinessBrain = {
    identity: {
      name: 'Hyderabadi Spice House',
      category: 'restaurant',
      description: 'Authentic Hyderabadi Biryani and Mughlai cuisine',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
      contact: { phone: '+919876543210', whatsapp: '+919876543210' },
      industry: 'restaurant_food',
      subcategory: 'biryani',
    },
    products: [
      {
        productId: 'prod-1',
        name: 'Special Mutton Biryani',
        description: 'Aromatic basmati rice cooked with tender mutton in copper handi',
        price: 399,
        category: 'main',
        tags: ['biryani', 'spicy'],
        attributes: { veg: false, spiceLevel: 'spicy' },
      },
    ],
    brand: {
      tone: 'friendly',
      personality: 'Authentic and traditional',
      visualPreferences: 'Rich warm colors with traditional copper handi',
      colors: { primary: '#E84D1A', secondary: '#FFD700', accent: '#8B0000' },
      fonts: { heading: 'Playfair', body: 'Inter' },
    },
    audience: {
      targetCustomer: 'IT Professionals and Biryani lovers in Hitec City',
      ageRange: { min: 22, max: 45 },
      localities: ['Hitec City', 'Madhapur', 'Gachibowli'],
      preferences: 'Prefers quick weekend lunch and authentic taste',
    },
    localization: {
      primaryLanguage: 'en',
      secondaryLanguage: 'te',
      regionalStyle: 'hyderabadi',
      slangIntensity: 'moderate',
      languageMixing: 'natural',
    },
    businessRules: {
      openingHours: { mon: { open: '11:00', close: '23:00' } },
      deliveryRadiusKm: 7,
      minimumOrder: 200,
      offerValidityRules: 'Valid on weekends',
      pricingRules: 'Fixed prices',
    },
    lastSyncedAt: new Date().toISOString(),
    campaignHistory: [],
  };

  const pipelineInput: GenerationPipelineInput = {
    campaignId: 'camp-smoke-1',
    businessId: 'biz-smoke-1',
    businessName: 'Hyderabadi Spice House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
    businessPhone: '+919876543210',
    whatsappNumber: '+919876543210',
    productName: 'Special Mutton Biryani',
    productId: 'prod-1',
    offerHeadline: 'Weekend Biryani Feast - 20% OFF',
    offerPrice: 399,
    offerOriginalPrice: 499,
    offerType: 'percentage',
    offerValidityStart: '2026-10-10T00:00:00Z',
    offerValidityEnd: '2026-10-12T23:59:59Z',
    audience: { localities: ['Hitec City', 'Madhapur'] },
    cta: 'order_whatsapp',
    objective: 'weekend_offer',
    creativeObjective: 'weekend_offer',
    vertical: 'restaurant',
    businessBrain: baseBusinessBrain as any,
    brandProfile: { tone: 'friendly' as const },
    campaignStyle: 'humorous' as const,
    duration: { start: '2026-10-10T00:00:00Z', end: '2026-10-12T23:59:59Z' },
    localizationProfile: {
      country: 'IN',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Hitec City',
      primaryLanguage: 'en',
      secondaryLanguage: 'te',
      languageMixing: 'natural',
      regionalStyle: 'hyderabadi',
      slangPreference: 'moderate',
      audienceDescription: 'IT professionals seeking weekend biryani feast',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
  };

  it('Gate 2F Smoke Test: should execute full generation pipeline with CreativeBrain reasoning', async () => {
    // Stage 1: Business Understanding Mock
    const businessUnderstanding = {
      businessSummary: 'Popular Hyderabadi biryani restaurant located in Hitec City.',
      businessFacts: [
        { category: 'identity', fact: 'Hyderabadi Spice House', source: 'brain', criticality: 'high' },
        { category: 'pricing', fact: 'Biryani ₹399', source: 'brain', criticality: 'high' },
      ],
      missingInformation: [],
      constraints: [],
      verticalContext: {},
    };

    // Stage 2: Product Understanding Mock
    const productUnderstanding = {
      productSummary: 'Special Mutton Biryani',
      productFacts: [{ fact: 'Made with authentic spices', source: 'metadata', criticality: 'high' }],
      visualAttributes: {
        dishName: 'Special Mutton Biryani',
        platingStyle: 'Copper Handi',
        colorPalette: ['#E84D1A', '#FFD700'],
        ambianceCues: ['Warm lighting', 'Traditional spices'],
        keyVisualElements: ['Garnished biryani in handi', 'Saffron rice'],
        suggestedCompositions: ['Hero top-down shot'],
      },
      missingInformation: [],
      marketingAngles: ['Authentic taste', 'Weekend special', 'Family feast', 'Quick delivery', 'IT lunch favorite'],
    };

    // CreativeBrain LLM Mocks
    const cbOpportunity = {
      opportunityId: 'opp-smoke-1',
      vertical: 'restaurant',
      problem: 'Weekend diners face long queues at biryani spots',
      tension: 'Craving authentic biryani vs reluctance to wait',
      motivation: 'Instant delivery via WhatsApp',
      occasion: 'Sunday Family Feast',
      audienceInsight: 'IT workers in Hitec City want premium biryani conveniently',
      opportunityStatement: 'Leverage 20% discount and instant WhatsApp ordering for biryani lovers.',
      desiredBusinessOutcome: 'Drive 35% more WhatsApp delivery orders',
      desiredAudienceResponse: 'Order biryani immediately on WhatsApp',
      supportingSignals: ['High weekend demand', 'Verified ₹399 price'],
      constraints: { maxTextDensity: 'medium' as const, toneBoundary: 'friendly', factualLimits: ['Price: ₹399'] },
      confidence: 90,
      rationale: 'High alignment between craving and instant delivery.',
    };

    const cbConcepts = {
      concepts: [
        {
          conceptId: 'smoke-c1',
          title: 'Skip the Queue, Enjoy the Feast',
          angle: 'Convenience and Speed for Weekend Diners',
          coreIdea: 'Highlight instant WhatsApp ordering for weekend biryani',
          hookDirection: 'Craving authentic mutton biryani this Sunday?',
          emotionalDriver: 'friendly' as const,
          audienceFraming: 'Busy IT professionals and families',
          message: 'Order Special Mutton Biryani at ₹399 with instant WhatsApp delivery.',
          offerFraming: '20% OFF Weekend Special (₹399 instead of ₹499)',
          ctaDirection: 'Order on WhatsApp now',
          visualPremise: {
            emphasis: 'product-led' as const,
            composition: 'hero-product' as const,
            mood: 'warm and appetizing',
            compositionHints: ['Steaming biryani handi close-up'],
          },
          differentiation: 'Authentic Hyderabadi taste delivered in 30 mins',
          expectedResponse: 'Customer orders immediately via WhatsApp',
          templateId: 'festival-offer-v1',
        },
      ],
    };

    // Stage 4 Localization Mock
    const localizationStrategy = {
      vocabulary: { biryani: 'biryani', order: 'WhatsApp cheyyandi' },
      phrasingRules: ['Short and punchy'],
      humorStyle: 'conversational',
      ctaPatterns: ['Order on WhatsApp now'],
      slangGuide: {},
      culturalReferences: [],
      languageMixingRules: { ratio: '70-30', rule: 'Natural mix' },
    };

    // Stage 5 Copy Pack Mock
    const copyPack = {
      headlines: [{ text: 'Special Mutton Biryani at ₹399', hook: 'Craving Biryani?' }],
      captions: [{ text: 'Order authentic Hyderabadi Biryani now.' }],
      adCopies: [{ headline: 'Mutton Biryani ₹399', body: 'Order on WhatsApp', cta: 'Order Now' }],
      whatsappMessage: { message: 'Order Special Mutton Biryani for ₹399 on WhatsApp!' },
      reelConcepts: [],
    };

    // Stage 6 Prompts Mock
    const imagePrompts = {
      posterPrompts: [{ prompt: 'Steaming biryani handi', negativePrompt: 'blurry', aspectRatio: '1:1' }],
      storyPrompts: [[{ prompt: 'Biryani closeup', negativePrompt: 'blurry', aspectRatio: '9:16' }]],
      reelFramePrompts: [],
    };

    // Stage 8 Truth Validation Mock
    const truthValidation = { passed: true, violations: [], assetStatus: {} };

    // Stage 9 Quality Validation Mock
    const qualityValidation = { passed: true, issues: [], assetScores: {} };

    // Stage 10 Safety Validation Mock
    const safetyValidation = { passed: true, violations: [] };

    // Set up mock queue for generateStructuredText calls
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(businessUnderstanding as any)
      .mockResolvedValueOnce(productUnderstanding as any)
      .mockResolvedValueOnce(cbOpportunity as any) // CreativeBrain opportunity
      .mockResolvedValueOnce(cbConcepts as any)     // CreativeBrain candidate concepts
      .mockResolvedValueOnce(localizationStrategy as any)
      .mockResolvedValueOnce(copyPack as any)
      .mockResolvedValueOnce(imagePrompts as any)
      .mockResolvedValueOnce(truthValidation as any)
      .mockResolvedValueOnce(qualityValidation as any)
      .mockResolvedValueOnce(safetyValidation as any);

    // Image provider mock
    jest.mocked(aiIndex.generateImage).mockResolvedValueOnce({
      success: true,
      imageData: { base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mimeType: 'image/png' },
      provider: 'imagen3',
      model: 'imagen-3.0-generate-002',
    });

    const result = await pipeline.execute(pipelineInput);

    expect(result.success).toBe(true);
    expect(result.stages['creativeBlueprint']).toBeDefined();
    expect(result.stages['creativeBlueprint'].blueprintId).toContain('bp-');
    expect(result.stages['creativeBlueprint'].winningConcept.conceptId).toBe('smoke-c1');
    expect(result.stages['creativeBlueprint'].strategyDirectives.ctaPrimary).toBe('order_whatsapp');
    expect(result.stages['campaignStrategy'].ctaStrategy.primary).toBe('order_whatsapp');
    expect(result.pipelineTrace).toBeDefined();
  });
});
