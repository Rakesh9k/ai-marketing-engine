import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CreativeBrainService } from './creativeBrainService';
import type { CreativeBrainInput } from './creativeBrain.types';
import * as aiIndex from './index';

// Mock generateStructuredText from aiIndex
jest.mock('./index', () => {
  const actual = jest.requireActual('./index') as any;
  return {
    ...actual,
    generateStructuredText: jest.fn(),
  };
});

describe('Gate 2B — Creative Brain Isolated Quality Audit', () => {
  let service: CreativeBrainService;

  beforeEach(() => {
    service = new CreativeBrainService();
    jest.mocked(aiIndex.generateStructuredText).mockReset();
  });

  // 1. Restaurant Vertical Scenario
  const restaurantInput: CreativeBrainInput = {
    businessBrain: {
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
    },
    vertical: 'restaurant',
    intent: {
      businessId: 'biz-restaurant-1',
      objective: 'weekend_offer',
      offer: {
        headline: 'Weekend Biryani Feast - 20% OFF',
        price: 399,
        originalPrice: 499,
        type: 'percentage',
        validityStart: '2026-10-10T00:00:00Z',
        validityEnd: '2026-10-12T23:59:59Z',
      },
      duration: { start: '2026-10-10T00:00:00Z', end: '2026-10-12T23:59:59Z' },
      audience: { localities: ['Hitec City', 'Madhapur'] },
      cta: 'order_whatsapp',
      localization: {
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
    },
    businessUnderstanding: {
      businessSummary: 'Popular Hyderabadi biryani restaurant located in Hitec City.',
      businessFacts: [
        { category: 'identity', fact: 'Hyderabadi Spice House', source: 'brain', criticality: 'high' },
        { category: 'pricing', fact: 'Biryani ₹399', source: 'brain', criticality: 'high' },
      ],
      missingInformation: [],
      constraints: [],
      verticalContext: {},
    },
    productUnderstanding: {
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
      marketingAngles: ['Authentic taste', 'Weekend special', 'Family feast'],
    },
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  // 2. Salon Vertical Scenario
  const salonInput: CreativeBrainInput = {
    ...restaurantInput,
    vertical: 'salon',
    businessBrain: {
      ...restaurantInput.businessBrain,
      identity: {
        ...restaurantInput.businessBrain.identity,
        name: 'Glow Beauty Lounge',
        category: 'salon',
        industry: 'salon_beauty',
        description: 'Premium organic skin care and bridal facial treatments',
      },
      brand: {
        ...restaurantInput.businessBrain.brand,
        tone: 'premium',
      },
      products: [
        {
          productId: 'prod-salon-1',
          name: 'Bridal Glow Facial',
          description: 'Deep cleansing and botanical brightening facial treatment',
          price: 1499,
          category: 'facial',
          tags: ['facial', 'glow'],
          attributes: {},
        },
      ],
    },
    intent: {
      ...restaurantInput.intent,
      businessId: 'biz-salon-1',
      objective: 'appointment_promotion',
      cta: 'book_appointment',
      offer: {
        headline: 'Bridal Glow Facial - 30% OFF',
        price: 1499,
        originalPrice: 1999,
        type: 'percentage',
        validityStart: '2026-10-10T00:00:00Z',
        validityEnd: '2026-10-20T23:59:59Z',
      },
    },
  };

  // 3. Real Estate Vertical Scenario
  const realEstateInput: CreativeBrainInput = {
    ...restaurantInput,
    vertical: 'real_estate',
    businessBrain: {
      ...restaurantInput.businessBrain,
      identity: {
        ...restaurantInput.businessBrain.identity,
        name: 'Skyline Heights Realty',
        category: 'real_estate',
        industry: 'real_estate',
        description: 'Luxury residential gated communities in Gachibowli',
      },
      brand: {
        ...restaurantInput.businessBrain.brand,
        tone: 'premium',
      },
      products: [
        {
          productId: 'prod-re-1',
          name: 'Luxury 3BHK Apartment',
          description: 'Spacious 2200 sqft apartment with clubhouse and pool view',
          price: 8500000,
          category: 'apartment',
          tags: ['3bhk', 'luxury'],
          attributes: {},
        },
      ],
    },
    intent: {
      ...restaurantInput.intent,
      businessId: 'biz-re-1',
      objective: 'new_listing',
      cta: 'call_now',
      offer: {
        headline: 'Luxury 3BHK Open House Event',
        price: 8500000,
        type: 'fixed',
        validityStart: '2026-10-10T00:00:00Z',
        validityEnd: '2026-10-15T23:59:59Z',
      },
    },
  };

  it('Gate 2B Audit: Restaurant Vertical Output Blueprint Audit', async () => {
    const opp = {
      opportunityId: 'opp-rest',
      vertical: 'restaurant',
      problem: 'Long waiting times at biryani spots on weekends',
      tension: 'Craving authentic biryani vs reluctance to wait in queue',
      motivation: 'Instant delivery or pre-booked table',
      occasion: 'Sunday Biryani Feast',
      audienceInsight: 'IT workers want premium mutton biryani conveniently',
      opportunityStatement: 'Leverage 20% weekend discount and instant WhatsApp ordering for biryani lovers.',
      desiredBusinessOutcome: 'Increase WhatsApp weekend orders by 35%',
      desiredAudienceResponse: 'Order biryani immediately via WhatsApp',
      supportingSignals: ['High weekend demand', 'Verified ₹399 price'],
      constraints: { maxTextDensity: 'medium' as const, toneBoundary: 'friendly', factualLimits: ['Price: ₹399'] },
      confidence: 90,
      rationale: 'High alignment between craving and instant delivery.',
    };

    const concepts = {
      concepts: [
        {
          conceptId: 'rest-c1',
          title: 'Skip the Queue, Enjoy the Feast',
          angle: 'Convenience & Speed',
          coreIdea: 'Highlight instant WhatsApp ordering for weekend biryani',
          hookDirection: 'Craving authentic mutton biryani this Sunday?',
          emotionalDriver: 'friendly' as const,
          audienceFraming: 'Busy IT professionals and families',
          message: 'Order Special Mutton Biryani at ₹399 with instant WhatsApp delivery.',
          offerFraming: '20% OFF Weekend Special (₹399 instead of ₹499)',
          ctaDirection: 'Order on WhatsApp now',
          visualPremise: { emphasis: 'product-led' as const, composition: 'hero-product' as const, mood: 'warm and appetizing', compositionHints: ['Steaming handi'] },
          differentiation: 'Authentic Hyderabadi taste delivered in 30 mins',
          expectedResponse: 'Customer orders via WhatsApp',
          templateId: 'festival-offer-v1',
        },
        {
          conceptId: 'rest-c2',
          title: 'Authentic Family Celebration',
          angle: 'Emotional & Family Gathering',
          coreIdea: 'Bring authentic Hyderabadi dining home for Sunday lunch',
          hookDirection: 'Make Sunday lunch unforgettable with family',
          emotionalDriver: 'premium' as const,
          audienceFraming: 'Families in Hitec City',
          message: 'Share rich Mutton Biryani with your loved ones.',
          offerFraming: 'Special Weekend Price ₹399',
          ctaDirection: 'Order for Family Lunch',
          visualPremise: { emphasis: 'image-led' as const, composition: 'editorial' as const, mood: 'festive', compositionHints: ['Family at table'] },
          differentiation: 'Traditional copper handi presentation',
          expectedResponse: 'Plan family weekend lunch order',
          templateId: 'local-story-v1',
        },
        {
          conceptId: 'rest-c3',
          title: 'Unbeatable Weekend Value Deal',
          angle: 'Direct Price Value',
          coreIdea: 'Focus directly on ₹399 price point and 20% savings',
          hookDirection: 'Special Mutton Biryani at just ₹399!',
          emotionalDriver: 'bold' as const,
          audienceFraming: 'Value-conscious foodies',
          message: 'Save ₹100 on every Mutton Biryani order this weekend.',
          offerFraming: '₹399 (Was ₹499)',
          ctaDirection: 'Claim Offer',
          visualPremise: { emphasis: 'offer-led' as const, composition: 'split-composition' as const, mood: 'high-energy', compositionHints: ['Price tag'] },
          differentiation: 'Highest quality mutton at unbeatable price',
          expectedResponse: 'Click CTA to claim deal',
          templateId: 'value-promo-v1',
        },
      ],
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(opp as any)
      .mockResolvedValueOnce(concepts as any);

    const result = await service.evaluateAndFormBlueprint(restaurantInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(false);
    expect(result.blueprint.opportunity.vertical).toBe('restaurant');
    expect(result.blueprint.winningConcept.conceptId).toBe('rest-c1');
    expect(result.blueprint.strategyDirectives.keyMessages).toContain('Special Offer: ₹399');
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('order_whatsapp');
    expect(result.blueprint.trace.evaluatedConceptsCount).toBe(3);
  });

  it('Gate 2B Audit: Salon Vertical Output Blueprint Audit', async () => {
    const opp = {
      opportunityId: 'opp-salon',
      vertical: 'salon',
      problem: 'Pre-wedding stress and dull skin before upcoming events',
      tension: 'Desire for radiant skin vs high cost of salon treatments',
      motivation: 'Instant skin radiance and affordable luxury',
      occasion: 'Wedding & Festive Season',
      audienceInsight: 'Brides and event guests want visible skin glow without overspending',
      opportunityStatement: 'Offer 30% discount on Botanical Bridal Glow Facial at ₹1499.',
      desiredBusinessOutcome: 'Fill 25 appointment slots this week',
      desiredAudienceResponse: 'Book facial appointment immediately',
      supportingSignals: ['Organic products', 'Verified ₹1499 price'],
      constraints: { maxTextDensity: 'medium' as const, toneBoundary: 'premium', factualLimits: ['Price: ₹1499'] },
      confidence: 92,
      rationale: 'High seasonal demand for wedding skincare.',
    };

    const concepts = {
      concepts: [
        {
          conceptId: 'salon-c1',
          title: 'Radiant Bridal Glow in 60 Mins',
          angle: 'Instant Transformation & Beauty',
          coreIdea: 'Highlight visible skin radiance before big events',
          hookDirection: 'Ready to glow for your special day?',
          emotionalDriver: 'premium' as const,
          audienceFraming: 'Brides and wedding guests',
          message: 'Experience Botanical Bridal Glow Facial at ₹1499 (Was ₹1999).',
          offerFraming: '30% OFF Bridal Glow Facial (₹1499)',
          ctaDirection: 'Book Appointment Now',
          visualPremise: { emphasis: 'image-led' as const, composition: 'editorial' as const, mood: 'serene and luxurious', compositionHints: ['Glowing skin close-up'] },
          differentiation: 'Organic botanical extracts',
          expectedResponse: 'Customer books salon slot',
          templateId: 'festival-offer-v1',
        },
        {
          conceptId: 'salon-c2',
          title: 'Self-Care Pampering Weekend',
          angle: 'Wellness & Relaxation',
          coreIdea: 'Position facial as an essential relaxing weekend treat',
          hookDirection: 'Pamper your skin with luxurious organic care',
          emotionalDriver: 'friendly' as const,
          audienceFraming: 'Working women seeking weekend relaxation',
          message: 'Treat yourself to deep cleansing at special ₹1499 rate.',
          offerFraming: 'Special Package ₹1499',
          ctaDirection: 'Reserve Your Seat',
          visualPremise: { emphasis: 'product-led' as const, composition: 'hero-product' as const, mood: 'calming', compositionHints: ['Spa setup'] },
          differentiation: 'Cruelty-free organic skincare',
          expectedResponse: 'Book weekend slot',
          templateId: 'local-story-v1',
        },
        {
          conceptId: 'salon-c3',
          title: 'Limited Time 30% OFF Beauty Deal',
          angle: 'Direct Savings & Urgency',
          coreIdea: 'Focus directly on ₹500 discount savings',
          hookDirection: 'Save ₹500 on Bridal Glow Facial this week!',
          emotionalDriver: 'bold' as const,
          audienceFraming: 'Deal seeking beauty enthusiasts',
          message: 'Limited 30% discount for first 20 bookings.',
          offerFraming: '30% OFF (₹1499)',
          ctaDirection: 'Claim Discount',
          visualPremise: { emphasis: 'offer-led' as const, composition: 'split-composition' as const, mood: 'energetic', compositionHints: ['Offer badge'] },
          differentiation: 'Unbeatable value for premium facial',
          expectedResponse: 'Claim offer link',
          templateId: 'value-promo-v1',
        },
      ],
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(opp as any)
      .mockResolvedValueOnce(concepts as any);

    const result = await service.evaluateAndFormBlueprint(salonInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(false);
    expect(result.blueprint.opportunity.vertical).toBe('salon');
    expect(result.blueprint.winningConcept.conceptId).toBe('salon-c1');
    expect(result.blueprint.strategyDirectives.keyMessages).toContain('Special Offer: ₹1499');
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('book_appointment');
  });

  it('Gate 2B Audit: Real Estate Vertical Output Blueprint Audit', async () => {
    const opp = {
      opportunityId: 'opp-re',
      vertical: 'real_estate',
      problem: 'Homebuyers struggle to find spacious 3BHKs in gated communities near IT hubs',
      tension: 'Desire for luxury lifestyle vs search fatigue and price transparency',
      motivation: 'Dream home with modern amenities near workplace',
      occasion: 'Weekend Open House Event',
      audienceInsight: 'Senior IT managers seek ready 3BHKs in Gachibowli with quick access to office',
      opportunityStatement: 'Invite prospective buyers to Exclusive 3BHK Open House this Sunday.',
      desiredBusinessOutcome: 'Generate 15 qualified site visits',
      desiredAudienceResponse: 'Call now or register for Open House visit',
      supportingSignals: ['Gated community', 'Price ₹85 Lakhs'],
      constraints: { maxTextDensity: 'medium' as const, toneBoundary: 'premium', factualLimits: ['Price: ₹85,00,000'] },
      confidence: 89,
      rationale: 'High demand for ready-to-move luxury apartments.',
    };

    const concepts = {
      concepts: [
        {
          conceptId: 're-c1',
          title: 'Experience Gated Luxury This Sunday',
          angle: 'Lifestyle & Aspirational',
          coreIdea: 'Showcase clubhouse, pool, and modern 3BHK interior layout',
          hookDirection: 'Step inside your dream 3BHK home this Sunday',
          emotionalDriver: 'premium' as const,
          audienceFraming: 'Families seeking premium gated community living',
          message: 'Visit Open House for Luxury 3BHK Apartments at ₹85 Lakhs in Gachibowli.',
          offerFraming: 'Sunday Open House Event',
          ctaDirection: 'Call Now to Book Tour',
          visualPremise: { emphasis: 'image-led' as const, composition: 'editorial' as const, mood: 'aspirational and majestic', compositionHints: ['Modern living room exterior view'] },
          differentiation: 'Prime Gachibowli location with top-tier amenities',
          expectedResponse: 'Calls to book site visit slot',
          templateId: 'local-story-v1',
        },
        {
          conceptId: 're-c2',
          title: 'Smart Location, Smart Investment',
          angle: 'Location Advantage & ROI',
          coreIdea: 'Emphasize 5-minute commute to IT corridor',
          hookDirection: '5 Mins from your office in Gachibowli',
          emotionalDriver: 'friendly' as const,
          audienceFraming: 'IT professionals looking to reduce commute time',
          message: 'Premium 3BHK apartments starting ₹85 Lakhs.',
          offerFraming: 'Prime Location Listing',
          ctaDirection: 'Get Directions / Call',
          visualPremise: { emphasis: 'product-led' as const, composition: 'hero-product' as const, mood: 'professional', compositionHints: ['Aerial map layout'] },
          differentiation: 'Unbeatable commute convenience',
          expectedResponse: 'Inquire for location map',
          templateId: 'festival-offer-v1',
        },
        {
          conceptId: 're-c3',
          title: 'Exclusive Open House Price Spotlight',
          angle: 'Direct Property Offer',
          coreIdea: 'Highlight ₹85 Lakhs price tag and open house details',
          hookDirection: 'Luxury 3BHK at ₹85 Lakhs - Open House This Sunday!',
          emotionalDriver: 'bold' as const,
          audienceFraming: 'Active home searchers',
          message: 'Limited inventory available at launch prices.',
          offerFraming: 'Open House Special ₹85 Lakhs',
          ctaDirection: 'Call Agent Immediately',
          visualPremise: { emphasis: 'offer-led' as const, composition: 'split-composition' as const, mood: 'bold property showcase', compositionHints: ['Property photo overlay'] },
          differentiation: 'Best price per sqft in prime locality',
          expectedResponse: 'Direct call to agent',
          templateId: 'value-promo-v1',
        },
      ],
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(opp as any)
      .mockResolvedValueOnce(concepts as any);

    const result = await service.evaluateAndFormBlueprint(realEstateInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(false);
    expect(result.blueprint.opportunity.vertical).toBe('real_estate');
    expect(result.blueprint.winningConcept.conceptId).toBe('re-c1');
    expect(result.blueprint.strategyDirectives.keyMessages).toContain('Special Offer: ₹8500000');
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('call_now');
  });
});
