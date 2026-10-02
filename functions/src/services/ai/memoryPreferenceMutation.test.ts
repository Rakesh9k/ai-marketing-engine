import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { resolveUserInstructionConflicts } from './conflictResolver';

const generateStructuredTextMock = jest
  .fn()
  .mockImplementation(async (prompt: string, schema: any) => {
    if (
      prompt.includes('No emojis') ||
      prompt.includes('Avoid emojis') ||
      prompt.includes('DO NOT USE EMOJIS')
    ) {
      return {
        headlines: [
          { text: 'Special Friday Biryani Feast in Kondapur', characterCount: 35, variant: 'v1' },
        ],
        adCopies: [
          {
            primaryText:
              'Enjoy authentic Hyderabadi Chicken Biryani at ₹299 only at ABC Biryani House. Order now.',
            headline: 'Friday Biryani Special',
            description: 'Best biryani in Kondapur',
            cta: 'Order Now',
          },
        ],
        captions: [
          {
            text: 'Authentic Hyderabadi Chicken Biryani for ₹299 only. Visit ABC Biryani House in Kondapur today.',
            hashtags: ['#biryani'],
            characterCount: 80,
          },
        ],
        storyConcepts: [
          {
            frames: [{ copy: 'Special offer', visualCue: 'Biryani plate' }],
            overallTheme: 'Friday Special',
          },
        ],
        reelConcepts: [
          {
            hook: 'Craving biryani?',
            scenes: [
              { description: 'sizzling biryani', visualDirection: 'close up', duration: '3s' },
            ],
            productReveal: 'Chicken Biryani',
            cta: 'Order now',
            caption: 'Try now',
            shootingTips: 'good lighting',
          },
        ],
        whatsappMessage: {
          message: 'Order Special Chicken Biryani at ₹299 today.',
          waLink: 'https://wa.me/919876543210',
          attributionParams: { campaignId: 'c1', creativeId: 'cr1', source: 'wa' },
        },
        ctaVariations: [{ text: 'Order on WhatsApp', variant: 'primary' }],
      };
    } else {
      // Emojis allowed (default or explicit mutation)
      return {
        headlines: [
          { text: 'శుక్రవారం వచ్చిందంటే బిర్యానీ పండగే! 🍗✨', characterCount: 20, variant: 'v1' },
        ],
        adCopies: [
          {
            primaryText: 'Spicy Chicken Biryani at ₹299 only! 😋',
            headline: 'Friday Special 🎉',
            description: 'Best biryani in Kondapur 🤤',
            cta: 'Order Now 📲',
          },
        ],
        captions: [
          {
            text: 'Special weekend offer on Chicken Biryani! 🍗😋 Order now!',
            hashtags: ['#biryani'],
            characterCount: 40,
          },
        ],
        storyConcepts: [
          {
            frames: [{ copy: 'Special offer 🔥', visualCue: 'Biryani plate' }],
            overallTheme: 'Friday Fun',
          },
        ],
        reelConcepts: [
          {
            hook: 'craving biryani? 😋',
            scenes: [
              { description: 'sizzling biryani', visualDirection: 'close up', duration: '3s' },
            ],
            productReveal: 'Chicken Biryani',
            cta: 'Order now',
            caption: 'Try now',
            shootingTips: 'good lighting',
          },
        ],
        whatsappMessage: {
          message: 'Order Chicken Biryani now! 📲',
          waLink: 'https://wa.me/919876543210',
          attributionParams: { campaignId: 'c1', creativeId: 'cr1', source: 'wa' },
        },
        ctaVariations: [{ text: 'Order on WhatsApp 📲', variant: 'primary' }],
      };
    }
  });

const generateImageMock = jest.fn().mockResolvedValue({
  success: true,
  imageUrl: 'https://provider.example.com/temp-hero.png',
  provider: 'gemini',
  model: 'imagen-3',
});

jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: jest.fn(),
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

describe('Mitra Business Brain Memory & Dynamic Preference Mutation Engine', () => {
  function createInputWithPreferences(
    visualPreferences: string,
    audiencePreferences: string
  ): GenerationPipelineInput {
    return {
      businessId: 'biz_memory_test',
      campaignId: `camp_mem_${Date.now()}_${Math.random()}`,
      businessName: 'ABC Biryani House',
      businessCategory: 'restaurant',
      businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      whatsappNumber: '9876543210',
      businessPhone: '9876543210',
      productName: 'Special Chicken Biryani',
      offerHeadline: 'Create another campaign.',
      offerDescription: 'Create another campaign.',
      offerPrice: 299,
      offerType: 'fixed',
      offerValidityStart: '2026-09-01',
      offerValidityEnd: '2026-10-01',
      duration: { start: '2026-09-01', end: '2026-10-01' },
      audience: { localities: ['Kondapur'] },
      cta: 'order_whatsapp',
      campaignStyle: 'funny',
      localizationProfile: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Kondapur',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'light',
        audienceDescription: 'Local food lovers',
        brandTone: 'friendly',
        campaignStyle: 'funny',
        contentFormat: 'poster',
      },
      businessBrain: {
        identity: {
          name: 'ABC Biryani House',
          category: 'restaurant',
          description: 'Authentic Hyderabadi biryani joint',
          location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
          contact: { phone: '9876543210', whatsapp: '9876543210' },
        },
        products: [
          {
            productId: 'p1',
            name: 'Special Chicken Biryani',
            description: 'Spicy Hyderabadi biryani',
            price: 299,
            category: 'biryani',
            tags: [],
            attributes: {},
          },
        ],
        brand: {
          tone: 'friendly',
          personality: 'Approachability and authentic taste',
          visualPreferences: visualPreferences,
          colors: { primary: '#D97706', secondary: '#DC2626', accent: '#F59E0B' },
          fonts: { heading: 'Inter', body: 'Inter' },
        },
        audience: {
          targetCustomer: 'Local food lovers',
          ageRange: { min: 18, max: 45 },
          localities: ['Kondapur'],
          preferences: audiencePreferences,
        },
        localization: {
          primaryLanguage: 'en',
          secondaryLanguage: 'te',
          regionalStyle: 'hyderabadi',
          slangIntensity: 'light',
          languageMixing: 'natural',
        },
        businessRules: {
          openingHours: {},
          deliveryRadiusKm: 5,
          minimumOrder: 100,
          offerValidityRules: '',
          pricingRules: 'Price floor ₹299',
        },
        campaignHistory: [],
        lastSyncedAt: new Date().toISOString(),
      } as any,
      brandProfile: {
        businessId: 'biz_memory_test',
        brandKit: { tone: 'friendly' } as any,
        audience: {} as any,
        localization: {} as any,
        historySummary: [],
      } as any,
      objective: 'promotion',
    };
  }

  it('Step 1: Initial Campaign — Default state allows emojis', async () => {
    const inputState1 = createInputWithPreferences('Vibrant poster styling', 'Spicy food lovers');
    const pipeline = new GenerationPipeline();
    const result1 = await pipeline.execute(inputState1);

    expect(result1).toBeDefined();
    const trace1 = result1.pipelineTrace!;
    expect(trace1.promptBuilder.data.businessContext).not.toContain('DO NOT USE EMOJIS');
    expect(trace1.geminiResponse.data.caption).toMatch(/[\u{1F300}-\u{1F6FF}]/u); // Contains emojis
  });

  it('Step 2: User says "Don\'t use emojis in my campaigns." — Business Brain remembers preference', async () => {
    // User updates preference in Business Brain
    const inputState2 = createInputWithPreferences(
      'DO NOT USE EMOJIS in any campaign copy',
      'Strict text only, no emojis allowed'
    );
    const pipeline = new GenerationPipeline();
    const result2 = await pipeline.execute(inputState2);

    expect(result2).toBeDefined();
    const trace2 = result2.pipelineTrace!;

    // 1. Verify Business Brain Retrieval captured the updated restriction
    expect(trace2.promptBuilder.data.businessContext).toContain('DO NOT USE EMOJIS');

    // 2. Verify model output has ZERO emojis
    const caption = trace2.geminiResponse.data.caption || '';
    const hasEmoji = /[\u{1F300}-\u{1F6FF}]/u.test(caption);
    expect(hasEmoji).toBe(false);
  });

  it('Step 3: User says "Actually emojis are okay now." — Business Brain mutates memory and NEW preference wins', async () => {
    // User mutates preference in Business Brain
    const inputState3 = createInputWithPreferences(
      'Emojis allowed and encouraged, playful tone',
      'Loves emojis and expressive copy'
    );
    const pipeline = new GenerationPipeline();
    const result3 = await pipeline.execute(inputState3);

    expect(result3).toBeDefined();
    const trace3 = result3.pipelineTrace!;

    // 1. Verify New Preference Overwrote Old Preference in Prompt Payload
    expect(trace3.promptBuilder.data.businessContext).toContain('Emojis allowed and encouraged');
    expect(trace3.promptBuilder.data.businessContext).not.toContain('DO NOT USE EMOJIS');

    // 2. Verify model output once again includes emojis (New Preference Wins)
    const caption = trace3.geminiResponse.data.caption || '';
    const hasEmoji = /[\u{1F300}-\u{1F6FF}]/u.test(caption);
    expect(hasEmoji).toBe(true);
  });
});
