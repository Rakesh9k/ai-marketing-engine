import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { resolveUserInstructionConflicts } from './conflictResolver';

const analyzeProductImagesMock = jest.fn().mockResolvedValue({
  identifiedProduct: 'Special Chicken Biryani',
  visualCues: [
    'Sizzling basmati rice with chicken leg piece',
    'Fresh mint leaves and coriander garnish',
    'Clay pot serving bowl with raita',
  ],
  keyIngredients: ['Chicken leg piece', 'Basmati rice', 'Saffron', 'Mint', 'Raita'],
  packagingType: 'Clay Pot / Handi',
  qualityAssessment: 'High quality food photography',
  confidenceScore: 0.98,
});

const generateStructuredTextMock = jest
  .fn()
  .mockImplementation(async (prompt: string, schema: any) => {
    // Return schema-conforming outputs for each stage
    if (schema?.shape?.businessFacts) {
      return {
        businessFacts: [
          { category: 'identity', fact: 'ABC Biryani House located in Kondapur, Hyderabad' },
        ],
        brandAttributes: { tone: 'friendly', style: 'funny' },
      };
    }
    if (schema?.shape?.productFacts) {
      return {
        productFacts: [
          { category: 'name', fact: 'Special Chicken Biryani' },
          { category: 'price', fact: '₹299' },
        ],
        visualCues: ['Chicken leg piece', 'Sizzling basmati rice'],
      };
    }
    if (schema?.shape?.positioning) {
      return {
        positioning: 'Friday Special Biryani Feast for young food lovers',
        targetAudienceSummary: 'Students and young professionals in Kondapur',
        coreHook: 'Friday Biryani Craving',
      };
    }
    if (schema?.shape?.headlineStyle) {
      return {
        headlineStyle: 'Funny Telugu',
        languageChoice: 'te',
        regionalNuances: ['hyderabadi'],
      };
    }
    if (schema?.shape?.headlines) {
      // Copy Pack Schema Output
      return {
        headlines: [
          { text: 'శుక్రవారం వచ్చిందంటే బిర్యానీ పండగే! 🍗✨', characterCount: 20, variant: 'v1' },
        ],
        adCopies: [
          {
            primaryText:
              'ఆకలి కేకలా? కొండాపూర్ ABC Biryani House కి వచ్చేయండి! Special Chicken Biryani కేవలం ₹299 మాత్రమే! 😋',
            headline: 'Friday Biryani Special',
            description: 'Best chicken biryani in Kondapur',
            cta: 'Order Now',
          },
        ],
        captions: [
          {
            text: 'Special Friday offer on Special Chicken Biryani at ₹299! 🍗😋 Order on WhatsApp now!',
            hashtags: ['#biryani', '#fridaybiryani'],
            characterCount: 60,
          },
        ],
        storyConcepts: [
          {
            frames: [
              {
                copy: 'Friday Special Chicken Biryani ₹299',
                visualCue: 'Sizzling clay pot biryani',
              },
            ],
            overallTheme: 'Friday Biryani Party',
          },
        ],
        reelConcepts: [
          {
            hook: 'Friday night plans?',
            scenes: [
              {
                description: 'sizzling chicken biryani reveal',
                visualDirection: 'close up',
                duration: '3s',
              },
            ],
            productReveal: 'Special Chicken Biryani',
            cta: 'Order on WhatsApp',
            caption: 'Try now',
            shootingTips: 'good lighting',
          },
        ],
        whatsappMessage: {
          message: 'Order Special Chicken Biryani at ₹299 on WhatsApp!',
          waLink: 'https://wa.me/919876543210',
          attributionParams: { campaignId: 'c1', creativeId: 'cr1', source: 'wa' },
        },
        ctaVariations: [{ text: 'WhatsApp లో ఇప్పుడే ఆర్డర్ చేయండి 📲', variant: 'primary' }],
      };
    }
    if (schema?.shape?.primaryPosterPrompt) {
      return {
        primaryPosterPrompt:
          'Professional food photography of Hyderabadi Special Chicken Biryani served in a traditional clay pot with a golden chicken leg piece, garnished with fresh mint and coriander leaves, accompanied by raita.',
        storyFramePrompts: ['Clay pot chicken biryani close up'],
        reelScenePrompts: ['Steam rising from hot chicken biryani'],
      };
    }
    // Default fallback for validation schemas
    return {
      passed: true,
      summary: 'All checks passed',
      checks: [{ category: 'product', status: 'PASS', reason: 'Correct chicken biryani verified' }],
    };
  });

const generateImageMock = jest.fn().mockResolvedValue({
  success: true,
  imageUrl: 'https://provider.example.com/generated-chicken-biryani-poster.png',
  provider: 'gemini',
  model: 'imagen-3',
});

jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: (...args: unknown[]) => analyzeProductImagesMock(...args),
  generateImage: (...args: unknown[]) => generateImageMock(...args),
}));

jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest
    .fn()
    .mockResolvedValue({ buffer: Buffer.from('bytes'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest
    .fn()
    .mockImplementation(async (biz: string, camp: string, type: string) => ({
      url: `https://storage.example.com/${biz}/${camp}/${type}.png`,
      storagePath: `businesses/${biz}/campaigns/${camp}/${type}.png`,
    })),
}));

describe('Mitra Image → Vision AI → Campaign Pipeline ("Chicken Biryani Photo + User Instruction")', () => {
  const UPLOADED_CHICKEN_BIRYANI_IMAGE =
    'https://storage.googleapis.com/test-bucket/chicken_biryani_photo.jpg';

  const imageCampaignInput: GenerationPipelineInput = {
    businessId: 'biz_img_test_100',
    campaignId: 'camp_img_test_100',
    businessName: 'ABC Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    productName: 'Special Chicken Biryani',
    offerHeadline: 'Make a Friday offer campaign. Funny Telugu. Target young people.',
    offerDescription: 'Make a Friday offer campaign. Funny Telugu. Target young people.',
    offerPrice: 299,
    offerType: 'fixed',
    offerValidityStart: '2026-09-01',
    offerValidityEnd: '2026-10-01',
    duration: { start: '2026-09-01', end: '2026-10-01' },
    audience: { localities: ['Kondapur'], occasion: 'Friday Special' },
    cta: 'order_whatsapp',
    campaignStyle: 'funny',
    newProduct: {
      name: 'Special Chicken Biryani',
      description: 'Authentic Hyderabadi chicken biryani with mirchi ka salan',
      price: 299,
      category: 'biryani',
      images: [UPLOADED_CHICKEN_BIRYANI_IMAGE],
    },
    localizationProfile: {
      country: 'IN',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'te',
      secondaryLanguage: 'en',
      languageMixing: 'natural',
      regionalStyle: 'hyderabadi',
      slangPreference: 'light',
      audienceDescription: 'Young food lovers & students',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    businessBrain: {
      identity: {
        name: 'ABC Biryani House',
        category: 'restaurant',
        description: 'Authentic Hyderabadi biryani joint in Kondapur',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      products: [
        {
          productId: 'p_biryani_chicken',
          name: 'Special Chicken Biryani',
          description: 'Spicy Hyderabadi chicken biryani',
          price: 299,
          category: 'biryani',
          tags: ['chicken', 'spicy', 'hyderabadi'],
          attributes: { veg: false, spiceLevel: 'hot' },
        },
      ],
      brand: {
        tone: 'friendly',
        personality: 'Fun, approachable, local',
        visualPreferences: 'Vibrant amber and red food photography',
        colors: { primary: '#D97706', secondary: '#DC2626', accent: '#F59E0B' },
        fonts: { heading: 'Noto Sans Telugu', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'Students and young professionals in Kondapur',
        ageRange: { min: 18, max: 30 },
        localities: ['Kondapur'],
        preferences: 'High value, Friday deals, spicy flavor',
      },
      localization: {
        primaryLanguage: 'te',
        secondaryLanguage: 'en',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'light',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 5,
        minimumOrder: 150,
        offerValidityRules: 'Friday Special Only',
        pricingRules: 'Price floor ₹299',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    } as any,
    brandProfile: {
      businessId: 'biz_img_test_100',
      brandKit: { tone: 'friendly' } as any,
      audience: {} as any,
      localization: {} as any,
      historySummary: [],
    } as any,
    objective: 'promotion',
  };

  it('1. Vision AI: should process uploaded chicken biryani photo and extract key visual features', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(imageCampaignInput);

    expect(result).toBeDefined();
    expect(analyzeProductImagesMock).toHaveBeenCalledWith(
      [UPLOADED_CHICKEN_BIRYANI_IMAGE],
      expect.objectContaining({ name: 'Special Chicken Biryani', price: 299 }),
      expect.objectContaining({ name: 'ABC Biryani House' })
    );
  });

  it('2. Product Grounding: should strictly ground product as Chicken Biryani and NEVER hallucinate Mutton Biryani', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(imageCampaignInput);

    const trace = result.pipelineTrace!;
    const assembledPrompt = trace.promptBuilder.data.businessContext;

    // Must be grounded as Special Chicken Biryani
    expect(assembledPrompt).toContain('Special Chicken Biryani');

    // MUST NOT hallucinate Mutton Biryani or alter product identity
    expect(assembledPrompt).not.toContain('Mutton Biryani');
    expect(assembledPrompt).not.toContain('Veg Biryani');
    expect(assembledPrompt).not.toContain('Fish Curry');

    // Generated caption & headline must refer to Chicken Biryani
    const caption = trace.geminiResponse.data.caption || '';
    expect(caption.toLowerCase()).toContain('biryani');
    expect(caption).not.toContain('Mutton');
  });

  it('3. User Instruction Alignment: should incorporate Friday Special, Telugu language, and Funny tone', async () => {
    const pipeline = new GenerationPipeline();
    const result = await pipeline.execute(imageCampaignInput);

    const trace = result.pipelineTrace!;
    const geminiData = trace.geminiResponse.data;

    expect(geminiData.language).toBe('te');
    expect(geminiData.headline).toContain('బిర్యానీ'); // Telugu text
    expect(trace.promptBuilder.data.businessContext).toContain('Friday Special');
    expect(trace.promptBuilder.data.userRequest).toContain('Funny Telugu');
  });

  it('4. Validation & Truth Check: should pass 100% of ground-truth non-negotiable checks (Product, Price, Business)', async () => {
    const conflictRes = resolveUserInstructionConflicts(imageCampaignInput);

    expect(conflictRes.nonNegotiables.businessName).toBe('ABC Biryani House');
    expect(conflictRes.nonNegotiables.productName).toBe('Special Chicken Biryani');
    expect(conflictRes.nonNegotiables.price).toBe('₹299');
    expect(conflictRes.nonNegotiables.location).toBe('Kondapur, Hyderabad');
  });
});
