const generateStructuredTextMock = jest.fn().mockResolvedValue({
  headlines: [{ text: 'ABC Biryani: Special Friday Offer', characterCount: 30, variant: 'v1' }],
  adCopies: [
    {
      primaryText: 'ABC Biryani: Spicy Chicken Biryani at ₹199 only',
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

import { resolveUserInstructionConflicts } from './conflictResolver';
import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

function makeBaseInput(overrides: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput {
  return {
    businessId: 'biz_conflict_100',
    campaignId: 'camp_conflict_100',
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
      audienceDescription: 'Local food lovers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    campaignStyle: 'funny',
    ...overrides,
  } as unknown as GenerationPipelineInput;
}

describe('Deliberate Conflict Testing & Truth Hierarchy Verification', () => {
  describe('Conflict Scenario 1: Style Contradiction ("serious premium ad but also funny")', () => {
    it('resolves conflicting tones to witty-professional tone with explicit Gemini directives', () => {
      const input = makeBaseInput({
        offerHeadline: 'Make a serious premium ad but also funny and meme-like for Chicken Biryani',
        campaignStyle: 'serious',
      });

      const plan = resolveUserInstructionConflicts(input);

      expect(plan.conflictsDetected.some((c) => c.category === 'style_contradiction')).toBe(true);
      const styleConflict = plan.conflictsDetected.find(
        (c) => c.category === 'style_contradiction'
      )!;
      expect(styleConflict.appliedHierarchy).toBe('application_constraint');
      expect(plan.resolvedInput.campaignStyle).toBe('witty_professional');
      expect(plan.geminiConflictDirectives.some((d) => d.includes('witty & professional'))).toBe(
        true
      );
    });
  });

  describe('Conflict Scenario 2: Language Mix Conflict ("Telugu but headline in English")', () => {
    it('resolves Telugu primary language with explicit English headline rule', () => {
      const input = makeBaseInput({
        offerHeadline: 'Use Telugu, but keep the headline in English for Biryani offer',
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
          audienceDescription: 'Local food lovers',
          brandTone: 'friendly',
          campaignStyle: 'funny',
          contentFormat: 'poster',
        },
      });

      const plan = resolveUserInstructionConflicts(input);

      expect(plan.conflictsDetected.some((c) => c.category === 'language_mixing')).toBe(true);
      const langConflict = plan.conflictsDetected.find((c) => c.category === 'language_mixing')!;
      expect(langConflict.appliedHierarchy).toBe('explicit_user_instruction');
      expect(
        plan.geminiConflictDirectives.some((d) => d.includes('headline MUST be written in English'))
      ).toBe(true);
    });
  });

  describe('Conflict Scenario 3: Length vs Detail Conflict ("Make it short but explain everything")', () => {
    it('resolves short vs detailed conflict into high-density scannable copy format', () => {
      const input = makeBaseInput({
        offerHeadline: 'Make it short but explain everything about our Chicken Biryani offer',
      });

      const plan = resolveUserInstructionConflicts(input);

      expect(plan.conflictsDetected.some((c) => c.category === 'length_vs_detail')).toBe(true);
      const lengthConflict = plan.conflictsDetected.find((c) => c.category === 'length_vs_detail')!;
      expect(lengthConflict.appliedHierarchy).toBe('application_constraint');
      expect(
        plan.geminiConflictDirectives.some((d) => d.includes('High-density scannable format'))
      ).toBe(true);
    });
  });

  describe('Conflict Scenario 4: Explicit User Price Override vs Business Brain Catalog Price', () => {
    it('allows explicit user campaign price ₹199 to override default catalog price ₹299', () => {
      const input = makeBaseInput({
        offerHeadline: 'Use ₹199 for Chicken Biryani Friday Special',
        offerPrice: 199,
      });

      const plan = resolveUserInstructionConflicts(input);

      expect(plan.conflictsDetected.some((c) => c.category === 'price_override')).toBe(true);
      const priceConflict = plan.conflictsDetected.find((c) => c.category === 'price_override')!;
      expect(priceConflict.appliedHierarchy).toBe('explicit_user_instruction');
      expect(plan.resolvedInput.offerPrice).toBe(199);
      expect(plan.geminiConflictDirectives.some((d) => d.includes('strictly locked to ₹199'))).toBe(
        true
      );
    });

    it('enforces Business Brain price floor when user price drops below minimum floor', () => {
      const input = makeBaseInput({
        offerPrice: 99,
        businessBrain: {
          ...makeBaseInput().businessBrain,
          businessRules: {
            ...makeBaseInput().businessBrain?.businessRules,
            priceFloor: 150,
          } as any,
        },
      });

      const plan = resolveUserInstructionConflicts(input);

      expect(plan.conflictsDetected.some((c) => c.category === 'price_override')).toBe(true);
      const priceConflict = plan.conflictsDetected.find((c) => c.category === 'price_override')!;
      expect(priceConflict.appliedHierarchy).toBe('business_brain');
      expect(plan.resolvedInput.offerPrice).toBe(150);
      expect(
        plan.geminiConflictDirectives.some((d) => d.includes('locked to price floor ₹150'))
      ).toBe(true);
    });

    it('enforces catalog price when Business Brain rule prohibits custom discounts', () => {
      const input = makeBaseInput({
        offerPrice: 199,
        businessBrain: {
          ...makeBaseInput().businessBrain,
          businessRules: {
            ...makeBaseInput().businessBrain?.businessRules,
            prohibitCustomDiscounts: true,
          } as any,
        },
      });

      const plan = resolveUserInstructionConflicts(input);

      expect(plan.conflictsDetected.some((c) => c.category === 'price_override')).toBe(true);
      const priceConflict = plan.conflictsDetected.find((c) => c.category === 'price_override')!;
      expect(priceConflict.appliedHierarchy).toBe('business_brain');
      expect(plan.resolvedInput.offerPrice).toBe(299);
      expect(plan.geminiConflictDirectives.some((d) => d.includes('Do NOT use ₹199'))).toBe(true);
    });
  });

  describe('Non-Negotiable Fact Locking', () => {
    it('locks all 9 non-negotiables deterministically so Gemini cannot hallucinate them', () => {
      const input = makeBaseInput({ offerPrice: 199 });
      const plan = resolveUserInstructionConflicts(input);

      expect(plan.nonNegotiables.businessName).toBe('ABC Biryani');
      expect(plan.nonNegotiables.productName).toBe('Chicken Biryani');
      expect(plan.nonNegotiables.price).toBe('₹199');
      expect(plan.nonNegotiables.phoneNumber).toBe('9876543210');
      expect(plan.nonNegotiables.location).toBe('Kondapur, Hyderabad');
      expect(plan.nonNegotiables.offerType).toBe('fixed');
      expect(plan.nonNegotiables.validityDates?.start).toBe('2026-03-10T00:00:00.000Z');
      expect(plan.nonNegotiables.urlPlaceholder).toBe('https://wa.me/919876543210');
    });
  });

  describe('Full GenerationPipeline Integration', () => {
    it('executes GenerationPipeline with conflicting input and outputs verified campaign with conflict trace', async () => {
      const pipeline = new GenerationPipeline();
      const input = makeBaseInput({
        offerHeadline: 'Use Telugu, but keep the headline in English for ₹199 Chicken Biryani',
        offerPrice: 199,
      });

      const result = await pipeline.execute(input);

      expect(result.success).toBe(true);
      expect(result.pipelineTrace).toBeDefined();
      expect(result.pipelineTrace?.conflictResolution).toBeDefined();
      expect(result.pipelineTrace?.conflictResolution?.conflictsDetected.length).toBeGreaterThan(0);
    });
  });
});
