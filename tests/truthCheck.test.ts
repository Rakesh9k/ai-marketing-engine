import { runDeterministicTruthCheck } from '@functions/services/ai/truthCheck';
import type { GenerationPipelineInput } from '@functions/services/ai/pipeline';

describe('Truth Check - Deterministic Validation', () => {
  const createMockInput = (
    overrides: Partial<GenerationPipelineInput> = {}
  ): GenerationPipelineInput => ({
    businessId: 'biz_123',
    campaignId: 'camp_123',
    businessName: 'Hyderabad Biryani House',
    businessCategory: 'restaurant',
    businessLocation: {
      city: 'Hyderabad',
      state: 'Telangana',
      locality: 'Kondapur',
    },
    whatsappNumber: '+919876543210',
    productId: 'prod_123',
    productName: 'Chicken Biryani',
    offerHeadline: 'Weekend Special',
    offerDescription: '20% off on all biryanis',
    offerPrice: 299,
    offerOriginalPrice: 399,
    offerType: 'percentage',
    offerValidityStart: '2026-01-10T00:00:00Z',
    offerValidityEnd: '2026-01-12T23:59:59Z',
    offerTerms: 'Valid on weekends only',
    objective: 'weekend_offer',
    audience: {
      localities: ['Kondapur', 'Gachibowli'],
      ageRange: { min: 25, max: 35 },
      occasion: 'weekend',
    },
    cta: 'order_whatsapp',
    localizationProfile: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'te_en',
      secondaryLanguage: 'en',
      languageMixing: 'natural',
      regionalStyle: 'hyderabadi',
      slangPreference: 'moderate',
      audienceDescription: 'Young office workers (25-35), tech corridor',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    campaignStyle: 'funny',
    duration: {
      start: '2026-01-10T00:00:00Z',
      end: '2026-01-12T23:59:59Z',
    },
    brandProfile: {
      businessId: 'biz_123',
      brandName: 'Hyderabad Biryani House',
      tagline: 'Authentic Hyderabadi Biryani',
      brandTone: 'friendly',
      brandPersonality: 'Warm, authentic, local pride',
      visualPreferences: 'Warm lighting, copper handi, traditional',
      colors: {
        primary: '#E84D1A',
        secondary: '#FFD700',
        accent: '#FFFFFF',
        background: '#FFF8F0',
        text: '#1A1A1A',
      },
      fonts: {
        heading: 'Poppins',
        body: 'Inter',
      },
    },
    businessBrain: {
      identity: {
        name: 'Hyderabad Biryani House',
        category: 'restaurant',
        description: 'Authentic Hyderabadi biryani since 1985',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: {
          phone: '9030012345',
          whatsapp: '+919876543210',
          website: '',
          instagram: '@hydbiryani',
        },
      },
      products: [
        {
          productId: 'prod_123',
          name: 'Chicken Biryani',
          description: 'Authentic Hyderabadi dum biryani',
          price: 299,
          category: 'main',
          tags: ['signature', 'bestseller'],
          attributes: { veg: false, spiceLevel: 'medium', prepTimeMinutes: 45 },
        },
        {
          productId: 'prod_124',
          name: 'Mutton Biryani',
          description: 'Tender mutton with aromatic spices',
          price: 399,
          category: 'main',
          tags: ['premium'],
          attributes: { veg: false, spiceLevel: 'hot', prepTimeMinutes: 60 },
        },
      ],
      brand: {
        tone: 'friendly',
        personality: 'Warm, authentic, local pride',
        visualPreferences: 'Warm lighting, copper handi',
        colors: { primary: '#E84D1A', secondary: '#FFD700', accent: '#FFFFFF' },
        fonts: { heading: 'Poppins', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'Young office workers (25-35)',
        ageRange: { min: 25, max: 35 },
        localities: ['Kondapur', 'Gachibowli'],
        preferences: 'Authentic, value for money, quick service',
      },
      localization: {
        primaryLanguage: 'te_en',
        secondaryLanguage: 'en',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'moderate',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: {
          monday: { open: '11:00', close: '23:00' },
          sunday: { open: '11:00', close: '23:00' },
        },
        deliveryRadiusKm: 10,
        minimumOrder: 200,
        offerValidityRules: 'Weekend offers valid Sat-Sun',
        pricingRules: 'No dynamic pricing',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    },
    ...overrides,
  });

  const createMockPreviousResults = (overrides: any = {}) => ({
    businessUnderstanding: {
      businessFacts: [
        {
          category: 'identity',
          fact: 'Business name: Hyderabad Biryani House',
          source: 'businessBrain.identity.name',
          criticality: 'high',
        },
        {
          category: 'identity',
          fact: 'Category: restaurant',
          source: 'businessBrain.identity.category',
          criticality: 'high',
        },
        {
          category: 'location',
          fact: 'Location: Kondapur, Hyderabad, Telangana',
          source: 'businessBrain.identity.location',
          criticality: 'high',
        },
        {
          category: 'contact',
          fact: 'WhatsApp: +919876543210',
          source: 'businessBrain.identity.contact.whatsapp',
          criticality: 'high',
        },
        {
          category: 'contact',
          fact: 'Phone: 9030012345',
          source: 'businessBrain.identity.contact.phone',
          criticality: 'high',
        },
        {
          category: 'policy',
          fact: 'Delivery radius: 10 km',
          source: 'businessBrain.businessRules.deliveryRadiusKm',
          criticality: 'medium',
        },
        {
          category: 'policy',
          fact: 'Minimum order: ₹200',
          source: 'businessBrain.businessRules.minimumOrder',
          criticality: 'medium',
        },
        {
          category: 'hours',
          fact: 'Open daily 11:00-23:00',
          source: 'businessBrain.businessRules.openingHours',
          criticality: 'medium',
        },
      ],
      businessSummary:
        'Hyderabad Biryani House is a restaurant in Kondapur, Hyderabad serving authentic Hyderabadi biryani.',
      missingInformation: [],
      constraints: [],
      verticalContext: {},
    },
    productUnderstanding: {
      productSummary: 'Chicken Biryani - Authentic Hyderabadi dum biryani at ₹299',
      productFacts: [
        { fact: 'Product name: Chicken Biryani', source: 'metadata', criticality: 'high' },
        { fact: 'Price: ₹299', source: 'metadata', criticality: 'high' },
        { fact: 'Category: main', source: 'metadata', criticality: 'medium' },
        { fact: 'Authentic Hyderabadi dum process', source: 'vision', criticality: 'high' },
      ],
      visualAttributes: {
        dishName: 'Chicken Biryani',
        platingStyle: 'copper handi',
        colorPalette: ['golden', 'saffron', 'white', 'green'],
        ambianceCues: ['traditional kitchen', 'copper handi', 'steam'],
        keyVisualElements: ['copper handi', 'fried onions', 'mint', 'lemon'],
        suggestedCompositions: [
          'top-down copper handi',
          'side view with steam',
          'close-up rice grains',
        ],
      },
      missingInformation: [],
      marketingAngles: [
        'Authentic Hyderabadi dum process',
        'Value-for-money portion',
        'Weekend family feast',
        'Late-night craving solution',
        'Tech corridor lunch',
      ],
    },
    campaignStrategy: {
      angle: 'Weekend family feast with authentic Hyderabadi biryani',
      hook: 'Weekend lo biryani cravings aa?',
      offerFraming: '20% off on signature Chicken Biryani - only ₹239 (was ₹299)',
      audienceInsight: 'Kondapur techies crave authentic weekend comfort food',
      keyMessages: [
        'Authentic Hyderabadi dum biryani cooked in copper handi',
        '20% off - only ₹239 for signature Chicken Biryani',
        'Perfect for weekend family meals in Kondapur',
        'Order on WhatsApp, delivered hot to your doorstep',
        'Authentic taste that reminds you of home',
      ],
      ctaStrategy: {
        primary: 'Order on WhatsApp',
        urgency: 'Weekend offer ends Sunday',
        valueProposition: 'Authentic biryani at 20% off',
      },
      differentiators: ['Copper handi cooking', '45-year legacy recipe', 'Kondapur local favorite'],
      creativeDirection: {
        visualStyle: 'Warm, steamy, authentic Hyderabadi kitchen',
        mood: 'Comforting, crave-inducing, local pride',
        compositionHints: ['Copper handi center frame', 'Steam rising', 'Family sharing moment'],
      },
      riskFlags: [],
    },
    copyPack: {
      headlines: [
        { text: 'Weekend lo biryani cravings aa?', characterCount: 32, variant: 'question' },
        {
          text: 'Chicken Biryani ₹239 - Weekend Special!',
          characterCount: 42,
          variant: 'price-led',
        },
        { text: 'Kondapur ka famous biryani ab ₹239 mein', characterCount: 40, variant: 'local' },
        {
          text: 'Dum lagake biryani, weekend special price mein',
          characterCount: 44,
          variant: 'hyderabadi',
        },
        { text: 'Family weekend = Hyderabad Biryani House', characterCount: 40, variant: 'family' },
      ],
      adCopies: [
        {
          primaryText:
            'Weekend lo biryani cravings aa? Hyderabad Biryani House aanu Kondapur lo authentic Chicken Biryani ₹239 ki (was ₹299). 20% off weekend special! Order on WhatsApp now.',
          headline: 'Weekend Biryani Offer',
          description: 'Authentic Hyderabadi dum biryani at 20% off',
          cta: 'Order on WhatsApp',
        },
        {
          primaryText:
            'Kondapur techies, weekend plan ready? Chicken Biryani ₹239 lo - authentic dum style, copper handi lo. WhatsApp cheyyandi order kosam!',
          headline: 'Kondapur Special',
          description: 'Tech corridor favorite biryani at weekend price',
          cta: 'WhatsApp Order',
        },
        {
          primaryText:
            'Family weekend = biryani time! Hyderabad Biryani House lo Chicken Biryani ₹239 (was ₹299). Copper handi dum style, authentic Hyderabadi taste. WhatsApp order chesko!',
          headline: 'Family Weekend',
          description: 'Perfect family meal at weekend price',
          cta: 'Order Now',
        },
        {
          primaryText:
            'Biryani lovers, listen up! Hyderabad Biryani House aanu Kondapur lo 20% off. Chicken Biryani ₹239. Authentic dum process, copper handi lo. WhatsApp order chesko!',
          headline: 'Biryani Lovers Alert',
          description: 'Authentic taste at discount price',
          cta: 'Get 20% Off',
        },
        {
          primaryText:
            'Weekend treat yourself! Hyderabad Biryani House aanu Chicken Biryani ₹239. Dum lagake authentic taste, Kondapur delivery available. WhatsApp kosam link lo undi.',
          headline: 'Treat Yourself',
          description: 'Weekend indulgence at great price',
          cta: 'Claim Offer',
        },
      ],
      captions: [
        {
          text: 'Weekend vibes = Biryani time! 🍚 Hyderabad Biryani House Kondapur lo Chicken Biryani ₹239 (was ₹299). Authentic dum style, copper handi lo. Order: WhatsApp link in bio! #HyderabadFood #BiryaniLove #KondapurEats #WeekendSpecial #FoodieLife',
          hashtags: [
            '#HyderabadFood',
            '#BiryaniLove',
            '#KondapurEats',
            '#WeekendSpecial',
            '#FoodieLife',
          ],
          characterCount: 220,
        },
        {
          text: 'Techies of Kondapur, weekend plan sorted! 🖥️🍚 Chicken Biryani ₹239 only this weekend. Authentic Hyderabadi dum style. WhatsApp order chesko! #TechieLife #BiryaniTime #HyderabadEats',
          hashtags: ['#TechieLife', '#BiryaniTime', '#HyderabadEats'],
          characterCount: 195,
        },
        {
          text: 'Family weekend = Biryani time! ❤️🍚 Hyderabad Biryani House lo authentic Chicken Biryani ₹239. Copper handi dum style, ghar jaisa taste. Order on WhatsApp! #FamilyTime #BiryaniLovers #Hyderabad',
          hashtags: ['#FamilyTime', '#BiryaniLovers', '#Hyderabad'],
          characterCount: 210,
        },
      ],
      storyConcepts: [
        {
          frames: [
            {
              copy: 'Monday-Thursday: Work mode 😴',
              visualCue: 'Tired office worker',
              cta: '',
              interactive: '',
            },
            {
              copy: 'Friday 5 PM: Freedom! 🎉',
              visualCue: 'Happy employee leaving office',
              cta: '',
              interactive: '',
            },
            {
              copy: 'Saturday 1 PM: Biryani time! 🍚',
              visualCue: 'Copper handi opening, steam rising',
              cta: 'Swipe up to order',
              interactive: 'poll',
            },
            {
              copy: 'Sunday: Family feast! 👨‍👩‍👧‍👦',
              visualCue: 'Family enjoying biryani together',
              cta: 'Order on WhatsApp',
              interactive: '',
            },
          ],
          overallTheme: 'Weekend countdown to biryani',
        },
        {
          frames: [
            {
              copy: 'POV: You in Kondapur, craving biryani',
              visualCue: 'Map pin on Kondapur',
              cta: '',
              interactive: '',
            },
            {
              copy: 'Hyderabad Biryani House - 2 min away',
              visualCue: 'Map directions',
              cta: '',
              interactive: '',
            },
            {
              copy: 'Chicken Biryani ₹239 - Order karo!',
              visualCue: 'Phone with WhatsApp open',
              cta: 'Tap to order',
              interactive: '',
            },
            {
              copy: 'Delivered hot in 30 mins! 🔥',
              visualCue: 'Delivery bag arriving',
              cta: '',
              interactive: '',
            },
          ],
          overallTheme: 'Quick order to delivery',
        },
        {
          frames: [
            { copy: 'Monday blues? 😔', visualCue: 'Sad face at desk', cta: '', interactive: '' },
            {
              copy: 'But wait... weekend offer! 🎉',
              visualCue: '20% off banner',
              cta: '',
              interactive: '',
            },
            {
              copy: 'Chicken Biryani ₹239 - Order now!',
              visualCue: 'WhatsApp chat opening',
              cta: 'Order now',
              interactive: '',
            },
            {
              copy: 'Weekend sorted! 😎',
              visualCue: 'Happy eating biryani',
              cta: '',
              interactive: '',
            },
          ],
          overallTheme: 'Problem -> Solution -> Joy',
        },
      ],
      reelConcepts: [
        {
          hook: 'POV: You craving biryani at 1 PM on Saturday',
          scenes: [
            {
              description: 'Close-up: Tired face at desk',
              visualDirection: 'Close up, tired expression',
              duration: '2s',
            },
            {
              description: 'Phone opens WhatsApp',
              visualDirection: 'Screen recording style',
              duration: '3s',
            },
            {
              description: 'Types: Chicken Biryani ₹239',
              visualDirection: 'Close up on screen',
              duration: '2s',
            },
            {
              description: 'Biryani delivered, steam rising',
              visualDirection: 'Slow motion, macro',
              duration: '4s',
            },
            {
              description: 'First bite - pure joy!',
              visualDirection: 'Reaction shot, happy face',
              duration: '3s',
            },
          ],
          productReveal: 'Only ₹239 this weekend at Hyderabad Biryani House!',
          cta: 'WhatsApp "BIRYANI" to +919876543210',
          caption: 'Weekend cravings sorted 🍚🔥 #HyderabadFood #BiryaniLover #KondapurEats',
          shootingTips: 'Use natural light, capture steam, show portion size',
        },
        {
          hook: 'Kondapur techies, this one for you! 💻🍚',
          scenes: [
            {
              description: 'Laptop screen with code',
              visualDirection: 'Wide shot, desk setup',
              duration: '2s',
            },
            {
              description: 'Notification: Weekend offer!',
              visualDirection: 'Phone screen close up',
              duration: '2s',
            },
            {
              description: 'Biryani ₹239 - tap to order',
              visualDirection: 'Thumb on screen',
              duration: '2s',
            },
            {
              description: 'Biryani arrives, steam everywhere',
              visualDirection: 'Slow motion delivery',
              duration: '3s',
            },
            {
              description: 'Code + Biryani = Perfect weekend',
              visualDirection: 'Split screen',
              duration: '3s',
            },
          ],
          productReveal: 'Chicken Biryani ₹239 at Hyderabad Biryani House!',
          cta: 'WhatsApp "BIRYANI" to +919876543210',
          caption: 'Code + Biryani = Perfect Weekend 💻🍚 #TechieLife #BiryaniTime #Kondapur',
          shootingTips: 'Film at desk, use screen recording for phone shots',
        },
        {
          hook: 'Stop scrolling! Your weekend biryani is here 🛑🍚',
          scenes: [
            {
              description: 'Thumb stopping on feed',
              visualDirection: 'POV phone scroll',
              duration: '1s',
            },
            {
              description: 'Copper handi reveal - WOW!',
              visualDirection: 'Dramatic lid lift, steam',
              duration: '3s',
            },
            { description: '₹239 price flash', visualDirection: 'Text animation', duration: '1s' },
            {
              description: 'Delivery bike arriving',
              visualDirection: 'Street view',
              duration: '2s',
            },
            {
              description: 'Happy faces eating together',
              visualDirection: 'Group shot, genuine smiles',
              duration: '3s',
            },
          ],
          productReveal: 'Hyderabad Biryani House - Kondapur - ₹239 Weekend Special',
          cta: 'Link in bio to order on WhatsApp',
          caption: 'Stop scrolling, start ordering! 🍚 #HyderabadBiryani #WeekendVibes',
          shootingTips: 'Hook in first second, use trending audio',
        },
      ],
      whatsappMessage: {
        message:
          "Hi! I saw your Weekend Biryani Offer — Chicken Biryani at ₹239 (was ₹299). I'd like to order 1 portion for delivery to Kondapur. What's the delivery time?",
        waLink:
          'https://wa.me/919876543210?text=Hi%21%20I%20saw%20your%20Weekend%20Biryani%20Offer%20%E2%80%94%20Chicken%20Biryani%20at%20%E2%82%B9239%20(was%20%E2%82%B9299).%20I%27d%20like%20to%20order%201%20portion%20for%20delivery%20to%20Kondapur.',
        attributionParams: {
          campaignId: 'camp_123',
          creativeId: 'asset_whatsapp_0',
          source: 'instagram_organic',
        },
      },
      ctaVariations: [
        { text: 'Order on WhatsApp →', variant: 'direct' },
        { text: 'WhatsApp "BIRYANI" to order', variant: 'keyword' },
        { text: 'Get 20% Off Now', variant: 'urgency' },
        { text: 'Claim Weekend Offer', variant: 'benefit' },
        { text: 'WhatsApp "BIRYANI" to +919876543210', variant: 'direct_number' },
      ],
    },
    localizationStrategy: {
      vocabulary: {
        delicious: 'dum lagake',
        visit: 'aao',
        order: 'WhatsApp cheyyandi',
        today: 'aaj',
        weekend: 'weekend lo',
        special: 'special aahe',
        offer: 'offer aahe',
        discount: 'discount aahe',
        price: 'price aahe',
        tasty: 'mast',
        yummy: 'khaane mein mast',
        spicy: 'teekha',
        fresh: 'taza',
        hot: 'garam',
        steam: 'bhaap',
        authentic: 'asli',
        traditional: 'paramparik',
        family: 'parivaar',
        deliver: 'deliver',
      },
      phrasingRules: [
        'Short, punchy sentences',
        'Question-led openings',
        'Conversational tone',
        'Code-switching at word level',
        'Hyderabadi slang naturally integrated',
      ],
      humorStyle: 'Self-deprecating, food-obsessed, local pride with "mast" energy',
      ctaPatterns: [
        'WhatsApp cheyyandi!',
        'Order madi!',
        'Link lo undi',
        'Aao order karo',
        'WhatsApp pe message karo',
      ],
      slangGuide: {
        cheyyandi: {
          term: 'cheyyandi',
          meaning: 'do it (respectful)',
          usage: 'high',
          examples: ['WhatsApp cheyyandi', 'Order cheyyandi'],
          avoidWith: [],
        },
        mast: {
          term: 'mast',
          meaning: 'awesome/great',
          usage: 'high',
          examples: ['Mast biryani', 'Mast offer'],
          avoidWith: [],
        },
        khaana: {
          term: 'khaana',
          meaning: 'food/eat',
          usage: 'medium',
          examples: ['Khaana ready', 'Khaane chalo'],
          avoidWith: [],
        },
      },
      culturalReferences: [
        'Ramzan special',
        'Sunday family lunch',
        'Kondapur techies',
        'Biryani culture',
        'Charminar area',
        'Golconda fort',
        'Hussain Sagar',
        'Hyderabadi dum',
        'Nawabi culture',
        'Irani chai',
      ],
      languageMixingRules: {
        pattern: 'natural',
        sentenceLevel: true,
        wordLevel: true,
        examples: ['Weekend lo biryani', 'Order cheyyandi', 'Mast offer aahe'],
        avoid: ['Forced code-switching', 'Word-for-word translation'],
      },
      audienceAdaptation: {
        officeWorkers: ['Quick lunch', 'Delivery to desk', 'Weekend treat'],
        families: ['Family feast', 'Value for money', 'Kids love it'],
        students: ['Budget friendly', 'Late night', 'Group orders'],
        foodies: ['Authentic dum', 'Copper handi', 'Traditional recipe'],
      },
    },
    ...overrides,
  });

  describe('Business Identity Check', () => {
    it('PASS when business name matches exactly', async () => {
      const input = createMockInput();
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const businessCheck = result.checks.find((c) => c.category === 'business');
      expect(businessCheck).toBeDefined();
      expect(businessCheck?.status).toBe('PASS');
    });

    it('FAIL when business name is wrong', async () => {
      const input = createMockInput({ businessName: 'Wrong Restaurant' });
      const previousResults = createMockPreviousResults({
        businessUnderstanding: {
          businessFacts: [
            {
              category: 'identity',
              fact: 'Business name: Hyderabad Biryani House',
              source: 'businessBrain.identity.name',
              criticality: 'high',
            },
          ],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const businessCheck = result.checks.find((c) => c.category === 'business');
      expect(businessCheck).toBeDefined();
      expect(businessCheck?.status).toBe('FAIL');
    });
  });

  describe('Product Name Check', () => {
    it('PASS when product name matches exactly', async () => {
      const input = createMockInput({ productName: 'Chicken Biryani' });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const productCheck = result.checks.find((c) => c.category === 'product');
      expect(productCheck).toBeDefined();
      expect(productCheck?.status).toBe('PASS');
    });

    it('FAIL when product name is wrong', async () => {
      const input = createMockInput({ productName: 'Chicken 65' });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const productCheck = result.checks.find((c) => c.category === 'product');
      expect(productCheck).toBeDefined();
      expect(productCheck?.status).toBe('FAIL');
    });
  });

  describe('Price Check', () => {
    it('PASS when price matches exactly', async () => {
      const input = createMockInput({ offerPrice: 299 });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const priceCheck = result.checks.find((c) => c.category === 'price');
      expect(priceCheck).toBeDefined();
      expect(priceCheck?.status).toBe('PASS');
    });

    it('FAIL when price is wrong', async () => {
      const input = createMockInput({ offerPrice: 399 });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const priceCheck = result.checks.find((c) => c.category === 'price');
      expect(priceCheck).toBeDefined();
      expect(priceCheck?.status).toBe('FAIL');
    });

    it('PASS with Rs 299 format', async () => {
      const input = createMockInput({ offerPrice: 299 });
      const previousResults = createMockPreviousResults({
        copyPack: {
          headlines: [{ text: 'Rs 299 only!' }],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const priceCheck = result.checks.find((c) => c.category === 'price');
      expect(priceCheck?.status).toBe('PASS');
    });
  });

  describe('Offer Check', () => {
    it('PASS when discount percentage matches', async () => {
      const input = createMockInput({
        offerType: 'percentage',
        offerPrice: 239,
        offerOriginalPrice: 299,
      });
      const previousResults = createMockPreviousResults({
        copyPack: {
          headlines: [{ text: '20% off on biryani!' }],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const offerCheck = result.checks.find((c) => c.category === 'offer');
      expect(offerCheck).toBeDefined();
      expect(offerCheck?.status).toBe('PASS');
    });

    it('FAIL when discount percentage is wrong', async () => {
      const input = createMockInput({
        offerType: 'percentage',
        offerPrice: 199,
        offerOriginalPrice: 299,
      });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const offerCheck = result.checks.find((c) => c.category === 'offer');
      expect(offerCheck).toBeDefined();
      expect(offerCheck?.status).toBe('FAIL');
    });
  });

  describe('Location Check', () => {
    it('PASS when location matches', async () => {
      const input = createMockInput({
        businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const locationCheck = result.checks.find((c) => c.category === 'location');
      expect(locationCheck).toBeDefined();
      expect(locationCheck?.status).toBe('PASS');
    });

    it('FAIL when location is wrong', async () => {
      const input = createMockInput({
        businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Jubilee Hills' },
      });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const locationCheck = result.checks.find((c) => c.category === 'location');
      expect(locationCheck).toBeDefined();
      expect(locationCheck?.status).toBe('FAIL');
    });
  });

  describe('WhatsApp Number Check', () => {
    it('PASS when WhatsApp number matches', async () => {
      const input = createMockInput({ whatsappNumber: '+919876543210' });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const whatsappCheck = result.checks.find(
        (c) => c.category === 'contact' && c.reason?.includes('WhatsApp')
      );
      expect(whatsappCheck).toBeDefined();
      expect(whatsappCheck?.status).toBe('PASS');
    });

    it('REVIEW_REQUIRED when WhatsApp number is wrong', async () => {
      const input = createMockInput({ whatsappNumber: '+919999999999' });
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      const whatsappCheck = result.checks.find(
        (c) => c.category === 'contact' && c.reason?.includes('WhatsApp')
      );
      expect(whatsappCheck).toBeDefined();
      expect(whatsappCheck?.status).toBe('REVIEW_REQUIRED');
    });
  });

  describe('Prohibited Claims Check', () => {
    it('FAIL when prohibited claims detected', async () => {
      const input = createMockInput();
      const previousResults = createMockPreviousResults({
        copyPack: {
          headlines: [{ text: 'Best restaurant in Hyderabad!' }],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const claimsCheck = result.checks.find((c) => c.category === 'claim' && c.status === 'FAIL');
      expect(claimsCheck).toBeDefined();
      expect(claimsCheck?.status).toBe('FAIL');
    });

    it('PASS when no prohibited claims', async () => {
      const input = createMockInput();
      const previousResults = createMockPreviousResults({
        copyPack: {
          headlines: [
            { text: 'Weekend biryani cravings?', characterCount: 25, variant: 'question' },
            {
              text: 'Chicken Biryani ₹239 - Weekend Special!',
              characterCount: 42,
              variant: 'price-led',
            },
          ],
          adCopies: [],
          captions: [],
          storyConcepts: [],
          reelConcepts: [],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const claimsCheck = result.checks.find((c) => c.category === 'claim' && c.status === 'PASS');
      expect(claimsCheck).toBeDefined();
      expect(claimsCheck?.status).toBe('PASS');
    });
  });

  describe('Unsupported Claims Check', () => {
    it('REVIEW_REQUIRED when delivery claimed but not supported', async () => {
      const input = createMockInput();
      const previousResults = createMockPreviousResults({
        businessUnderstanding: {
          businessFacts: [],
          businessRules: { availability: { deliveryRadiusKm: 0 } },
        },
        copyPack: {
          headlines: [{ text: 'Delivery available now!' }],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const unsupportedCheck = result.checks.find(
        (c) => c.category === 'claim' && c.reason?.includes('delivery')
      );
      expect(unsupportedCheck).toBeDefined();
      expect(unsupportedCheck?.status).toBe('REVIEW_REQUIRED');
    });
  });

  describe('Operations Check', () => {
    it('REVIEW_REQUIRED when delivery claimed but not supported', async () => {
      const input = createMockInput();
      const previousResults = createMockPreviousResults({
        businessUnderstanding: {
          businessFacts: [],
          businessRules: { availability: { deliveryRadiusKm: 0 } },
        },
        copyPack: {
          headlines: [{ text: 'Delivery available now!' }],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const opsCheck = result.checks.find(
        (c) => c.category === 'operations' && c.reason?.includes('verified')
      );
      expect(opsCheck).toBeDefined();
      expect(opsCheck?.status).toBe('REVIEW_REQUIRED');
    });
  });

  describe('Missing Data Handling', () => {
    it('REVIEW_REQUIRED when delivery claimed but no delivery info in Business Brain', async () => {
      const input = createMockInput();
      const previousResults = createMockPreviousResults({
        businessUnderstanding: {
          businessFacts: [
            {
              category: 'identity',
              fact: 'Business name: Test',
              source: 'businessBrain',
              criticality: 'high',
            },
          ],
          businessRules: {},
        },
        copyPack: {
          headlines: [{ text: 'Delivery available now!' }],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      const deliveryCheck = result.checks.find((c) => c.reason?.includes('delivery'));
      expect(deliveryCheck).toBeDefined();
      expect(deliveryCheck?.status).toBe('REVIEW_REQUIRED');
    });
  });

  describe('Aggregation Logic', () => {
    it('FAIL when any critical check fails', async () => {
      const input = createMockInput({ offerPrice: 399 }); // Wrong price
      const previousResults = createMockPreviousResults();
      const result = await runDeterministicTruthCheck(input, previousResults);

      expect(result.status).toBe('FAIL');
    });

    it('REVIEW_REQUIRED when no FAIL but some REVIEW_REQUIRED', async () => {
      const input = createMockInput({ offerType: 'fixed' });
      const previousResults = createMockPreviousResults({
        businessUnderstanding: {
          businessFacts: [],
          businessRules: { availability: { deliveryRadiusKm: 0 } },
        },
        copyPack: {
          headlines: [
            {
              text: 'Hyderabad Biryani House - Chicken Biryani ₹299',
              characterCount: 45,
              variant: 'price-led',
            },
            { text: 'Delivery available now in Kondapur!', characterCount: 35, variant: 'local' },
          ],
          adCopies: [],
          captions: [],
          storyConcepts: [],
          reelConcepts: [],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      expect(result.status).toBe('REVIEW_REQUIRED');
    });

    it('PASS when all checks pass', async () => {
      const input = createMockInput({ offerPrice: 299, offerOriginalPrice: 399 });
      const previousResults = createMockPreviousResults({
        copyPack: {
          headlines: [
            {
              text: 'Hyderabad Biryani House - Chicken Biryani ₹299 (was ₹399)',
              characterCount: 50,
              variant: 'price-led',
            },
            { text: '25% off weekend special in Kondapur', characterCount: 35, variant: 'local' },
            { text: 'Order on WhatsApp +919876543210', characterCount: 35, variant: 'cta' },
            {
              text: 'Offer valid 2026-01-10 to 2026-01-12',
              characterCount: 35,
              variant: 'validity',
            },
          ],
          adCopies: [
            {
              primaryText:
                'Hyderabad Biryani House aanu Kondapur lo authentic Chicken Biryani ₹299 ki (was ₹399). 25% off weekend special! Order on WhatsApp now.',
              headline: 'Weekend Biryani Offer',
              description: 'Authentic Hyderabadi dum biryani at 25% off',
              cta: 'Order on WhatsApp',
            },
          ],
          captions: [
            {
              text: 'Weekend vibes = Biryani time! Hyderabad Biryani House Kondapur lo Chicken Biryani ₹299 (was ₹399). Authentic dum style, copper handi lo. Order: WhatsApp link in bio! #HyderabadFood #BiryaniLove #KondapurEats #WeekendSpecial #FoodieLife',
              hashtags: [
                '#HyderabadFood',
                '#BiryaniLove',
                '#KondapurEats',
                '#WeekendSpecial',
                '#FoodieLife',
              ],
              characterCount: 220,
            },
          ],
          storyConcepts: [],
          reelConcepts: [],
        },
      });
      const result = await runDeterministicTruthCheck(input, previousResults);

      expect(result.status).toBe('PASS');
    });
  });
});
