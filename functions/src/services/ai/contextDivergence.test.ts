import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { resolveUserInstructionConflicts } from './conflictResolver';

const generateStructuredTextMock = jest
  .fn()
  .mockImplementation(async (prompt: string, schema: any) => {
    if (
      prompt.includes('The Royal Nizam Palace') ||
      prompt.includes('Bandra') ||
      prompt.includes('Mumbai') ||
      prompt.includes('899')
    ) {
      return {
        headlines: [
          {
            text: 'Experience Saffron-Infused Royalty in Bandra West 👑✨',
            characterCount: 30,
            variant: 'v1',
          },
        ],
        adCopies: [
          {
            primaryText: 'Organic Low-Oil Dum Biryani at ₹899 at The Royal Nizam Palace',
            headline: 'Luxury Gourmet Selection',
            description: 'Handcrafted in Bandra West',
            cta: 'Reserve Table',
          },
        ],
        captions: [
          {
            text: 'Crafted with organic basmati and slow-dumping methods',
            hashtags: ['#gourmet'],
            characterCount: 50,
          },
        ],
        storyConcepts: [
          {
            frames: [{ copy: 'Royal Biryani', visualCue: 'Royal silver handi' }],
            overallTheme: 'Luxury Dining',
          },
        ],
        reelConcepts: [
          {
            hook: 'fine dining craving?',
            scenes: [
              { description: 'royal ambience', visualDirection: 'wide shot', duration: '3s' },
            ],
            productReveal: 'Organic Dum Biryani',
            cta: 'Book Table',
            caption: 'Experience luxury',
            shootingTips: 'warm lighting',
          },
        ],
        whatsappMessage: {
          message: 'Reserve your table for Organic Dum Biryani!',
          waLink: 'https://wa.me/919123456789',
          attributionParams: { campaignId: 'c2', creativeId: 'cr2', source: 'wa' },
        },
        ctaVariations: [{ text: 'Reserve Table on WhatsApp', variant: 'primary' }],
      };
    } else {
      return {
        headlines: [
          { text: 'శుక్రవారం వచ్చిందంటే బిర్యానీ పండగే! 🍗✨', characterCount: 20, variant: 'v1' },
        ],
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
          {
            frames: [{ copy: 'Special offer', visualCue: 'Biryani plate' }],
            overallTheme: 'Friday Fun',
          },
        ],
        reelConcepts: [
          {
            hook: 'craving biryani?',
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
          message: 'Order Chicken Biryani now!',
          waLink: 'https://wa.me/919876543210',
          attributionParams: { campaignId: 'c1', creativeId: 'cr1', source: 'wa' },
        },
        ctaVariations: [{ text: 'Order on WhatsApp', variant: 'primary' }],
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

describe('Mitra Context Divergence Engine ("Same Prompt, Different Business Context")', () => {
  const BARE_USER_PROMPT = 'Create a biryani campaign.';

  // Restaurant A Profile: Hyderabadi Mass-Market Budget Biryani
  const restaurantA_Input: GenerationPipelineInput = {
    businessId: 'biz_rest_A',
    campaignId: 'camp_rest_A',
    businessName: 'ABC Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    productName: 'Special Chicken Biryani',
    offerHeadline: BARE_USER_PROMPT,
    offerDescription: BARE_USER_PROMPT,
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
      primaryLanguage: 'te',
      secondaryLanguage: 'en',
      languageMixing: 'natural',
      regionalStyle: 'hyderabadi',
      slangPreference: 'moderate',
      audienceDescription: 'Local food lovers & budget diners',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    businessBrain: {
      identity: {
        name: 'ABC Biryani House',
        category: 'restaurant',
        description: 'Budget-friendly authentic Hyderabadi biryani joint',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      products: [
        {
          productId: 'p_biryani_a',
          name: 'Special Chicken Biryani',
          description: 'Spicy Hyderabadi chicken biryani with mirchi ka salan',
          price: 299,
          category: 'biryani',
          tags: ['spicy', 'hyderabadi', 'popular'],
          attributes: { veg: false, spiceLevel: 'hot' },
        },
      ],
      brand: {
        tone: 'friendly',
        personality: 'Fun, approachable, local',
        visualPreferences: 'Vibrant amber and red street-food vibes',
        colors: { primary: '#D97706', secondary: '#DC2626', accent: '#F59E0B' },
        fonts: { heading: 'Noto Sans Telugu', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'Students, young professionals, local food lovers',
        ageRange: { min: 18, max: 35 },
        localities: ['Kondapur', 'Madhapur', 'Gachibowli'],
        preferences: 'High value, big portions, bold spicy flavor',
      },
      localization: {
        primaryLanguage: 'te',
        secondaryLanguage: 'en',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'moderate',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: { monday: { open: '11:00', close: '23:00' } },
        deliveryRadiusKm: 5,
        minimumOrder: 150,
        offerValidityRules: 'Valid on weekends',
        pricingRules: 'Fixed menu price',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    } as any,
    brandProfile: {
      businessId: 'biz_rest_A',
      brandKit: { tone: 'friendly' } as any,
      audience: {} as any,
      localization: {} as any,
      historySummary: [],
    } as any,
    objective: 'promotion',
  };

  // Restaurant B Profile: Mumbai Luxury Fine-Dining Biryani
  const restaurantB_Input: GenerationPipelineInput = {
    businessId: 'biz_rest_B',
    campaignId: 'camp_rest_B',
    businessName: 'The Royal Nizam Palace',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra West' },
    whatsappNumber: '9123456789',
    businessPhone: '9123456789',
    productName: 'Organic Low-Oil Dum Biryani',
    offerHeadline: BARE_USER_PROMPT,
    offerDescription: BARE_USER_PROMPT,
    offerPrice: 899,
    offerType: 'fixed',
    offerValidityStart: '2026-09-01',
    offerValidityEnd: '2026-10-01',
    duration: { start: '2026-09-01', end: '2026-10-01' },
    audience: { localities: ['Bandra West'] },
    cta: 'book_table',
    campaignStyle: 'funny',
    localizationProfile: {
      country: 'IN',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Bandra West',
      primaryLanguage: 'en',
      secondaryLanguage: 'hi_en',
      languageMixing: 'minimal',
      regionalStyle: 'mumbai',
      slangPreference: 'none',
      audienceDescription: 'High-net-worth professionals & health gourmets',
      brandTone: 'luxury',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    businessBrain: {
      identity: {
        name: 'The Royal Nizam Palace',
        category: 'restaurant',
        description: 'Fine-dining organic slow-dum royal biryani restaurant',
        location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra West' },
        contact: { phone: '9123456789', whatsapp: '9123456789' },
      },
      products: [
        {
          productId: 'p_biryani_b',
          name: 'Organic Low-Oil Dum Biryani',
          description: 'Saffron-infused organic basmati biryani with zero artificial colors',
          price: 899,
          category: 'gourmet_biryani',
          tags: ['organic', 'low_oil', 'fine_dining', 'royal'],
          attributes: { veg: false, spiceLevel: 'mild' },
        },
      ],
      brand: {
        tone: 'luxury',
        personality: 'Sophisticated, royal, health-conscious',
        visualPreferences: 'Deep navy, royal gold, minimalistic elegance',
        colors: { primary: '#1E3A8A', secondary: '#D97706', accent: '#F59E0B' },
        fonts: { heading: 'Cinzel', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'HNI executives, luxury diners, fitness gourmets',
        ageRange: { min: 28, max: 55 },
        localities: ['Bandra West', 'Juhu', 'Worli'],
        preferences: 'Organic ingredients, low oil, regal presentation',
      },
      localization: {
        primaryLanguage: 'en',
        secondaryLanguage: 'hi_en',
        regionalStyle: 'mumbai',
        slangIntensity: 'none',
        languageMixing: 'minimal',
      },
      businessRules: {
        openingHours: { monday: { open: '12:00', close: '24:00' } },
        deliveryRadiusKm: 10,
        minimumOrder: 500,
        offerValidityRules: 'Reservation required',
        pricingRules: 'Gourmet pricing floor ₹899',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    } as any,
    brandProfile: {
      businessId: 'biz_rest_B',
      brandKit: { tone: 'luxury' } as any,
      audience: {} as any,
      localization: {} as any,
      historySummary: [],
    } as any,
    objective: 'promotion',
  };

  it('should process identical prompt "Create a biryani campaign." with 100% context separation', async () => {
    // Execute Restaurant A pipeline
    const pipelineA = new GenerationPipeline();
    const resultA = await pipelineA.execute(restaurantA_Input);

    // Execute Restaurant B pipeline
    const pipelineB = new GenerationPipeline();
    const resultB = await pipelineB.execute(restaurantB_Input);

    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    const traceA = resultA.pipelineTrace!;
    const traceB = resultB.pipelineTrace!;

    // 1. Verify Business Brain Retrieval Divergence
    expect(traceA.businessBrainRetrieval.data.business).toBe('ABC Biryani House');
    expect(traceA.businessBrainRetrieval.data.location).toBe('Kondapur, Hyderabad');
    expect(traceA.businessBrainRetrieval.data.price).toBe('₹299');

    expect(traceB.businessBrainRetrieval.data.business).toBe('The Royal Nizam Palace');
    expect(traceB.businessBrainRetrieval.data.location).toBe('Bandra West, Mumbai');
    expect(traceB.businessBrainRetrieval.data.price).toBe('₹899');

    // 2. Verify Prompt Builder Instruction Divergence
    const promptDataA = traceA.promptBuilder.data;
    const promptDataB = traceB.promptBuilder.data;

    // Restaurant A Prompt Check
    expect(promptDataA.businessContext).toContain('Kondapur, Hyderabad');
    expect(promptDataA.businessContext).toContain('Special Chicken Biryani');
    expect(promptDataA.businessContext).toContain('₹299');
    expect(promptDataA.businessContext).not.toContain('Bandra West');
    expect(promptDataA.businessContext).not.toContain('₹899');

    // Restaurant B Prompt Check
    expect(promptDataB.businessContext).toContain('Bandra West, Mumbai');
    expect(promptDataB.businessContext).toContain('Organic Low-Oil Dum Biryani');
    expect(promptDataB.businessContext).toContain('₹899');
    expect(promptDataB.businessContext).not.toContain('Kondapur');
    expect(promptDataB.businessContext).not.toContain('₹299');

    // 3. Verify Radical Output Divergence between A and B
    expect(traceA.geminiResponse.data.headline).toContain('బిర్యానీ');
    expect(traceB.geminiResponse.data.headline).toContain('Royalty');

    // 4. Verify Zero Context Cross-Contamination
    const promptStrA = JSON.stringify(promptDataA);
    const promptStrB = JSON.stringify(promptDataB);

    expect(promptStrA.includes('Bandra')).toBe(false);
    expect(promptStrB.includes('Kondapur')).toBe(false);
  });

  it('should enforce price floor ₹899 for Restaurant B and ₹299 for Restaurant A even when prompt is generic', () => {
    const conflictA = resolveUserInstructionConflicts(restaurantA_Input);
    const conflictB = resolveUserInstructionConflicts(restaurantB_Input);

    expect(conflictA.nonNegotiables.price).toBe('₹299');
    expect(conflictB.nonNegotiables.price).toBe('₹899');

    expect(conflictA.nonNegotiables.location).toBe('Kondapur, Hyderabad');
    expect(conflictB.nonNegotiables.location).toBe('Bandra West, Mumbai');
  });
});
