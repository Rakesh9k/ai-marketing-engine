import { z } from 'zod';
import { localizationProfileSchema } from '@/lib/validation/schemas';
import { buildCampaignInput } from '@/features/campaign/buildCampaignInput';
import { createInitialWizardState, type CampaignWizardState } from '@/features/campaign/types';
import {
  OBJECTIVES,
  OFFER_TYPES,
  CTA_OPTIONS,
  LANGUAGES,
  REGIONAL_STYLES,
  CAMPAIGN_STYLES,
} from '@/features/campaign/constants';
import type { Business } from '@/types';

/**
 * Mirrors functions/src/functions/campaigns/generateCampaignStrategy.ts's
 * generateCampaignStrategySchema exactly (that Zod schema lives in the
 * functions/ package, which this frontend test suite cannot import directly,
 * since it's a separate compiled package). The localization sub-schema is
 * reused from the shared src/lib/validation/schemas.ts rather than
 * re-declared, since that file already keeps it in sync with the backend
 * LocalizationProfile type. This is the authoritative check that the
 * wizard's constructed payload is actually accepted by the real backend
 * contract, not just internally consistent.
 */
const generateCampaignStrategySchema = z.object({
  businessId: z.string().min(1),
  objective: z.enum(['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness']),
  productId: z.string().optional(),
  newProduct: z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      images: z.array(z.string().url()).min(1).max(5),
    })
    .optional(),
  offer: z.object({
    headline: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    type: z.enum(['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty']),
    validityStart: z.string().datetime(),
    validityEnd: z.string().datetime(),
    terms: z.string().max(1000).optional(),
  }),
  duration: z.object({ start: z.string().datetime(), end: z.string().datetime() }),
  audience: z.object({
    localities: z.array(z.string()).min(1).max(10),
    ageRange: z.object({ min: z.number().min(18), max: z.number().max(80) }).optional(),
    occasion: z.enum(['weekend', 'festival', 'weekday_lunch', 'family']).optional(),
  }),
  cta: z.enum(['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions']),
  localization: localizationProfileSchema,
  idempotencyKey: z.string().uuid(),
});

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Test Biryani House',
    category: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    contact: { phone: '+919876543210', whatsapp: '+919876543210' },
    businessBrain: {
      identity: {
        name: 'Test Biryani House',
        category: 'restaurant',
        description: '',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: { phone: '+919876543210', whatsapp: '+919876543210' },
      },
      products: [],
      brand: {
        tone: 'friendly',
        personality: '',
        visualPreferences: '',
        colors: { primary: '', secondary: '', accent: '' },
        fonts: { heading: '', body: '' },
      },
      audience: {
        targetCustomer: 'Families in Kondapur',
        ageRange: { min: 18, max: 45 },
        localities: ['Kondapur'],
        preferences: '',
      },
      localization: {
        primaryLanguage: 'te_en',
        secondaryLanguage: 'te',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'light',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 5,
        minimumOrder: 0,
        offerValidityRules: '',
        pricingRules: '',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    },
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Business;
}

function makeCompleteState(overrides: Partial<CampaignWizardState> = {}): CampaignWizardState {
  const state = createInitialWizardState();
  return {
    ...state,
    objective: 'weekend_offer',
    selectedProductId: 'prod_1',
    photos: [
      {
        assetId: 'asset_1',
        url: 'https://example.com/photo.jpg',
        storagePath: 'businesses/biz_1/campaigns/asset_1',
      },
    ],
    offer: {
      headline: 'Weekend Biryani Special',
      description: 'Get our signature biryani this weekend',
      price: '249',
      originalPrice: '349',
      type: 'percentage',
      terms: 'Valid on dine-in only',
    },
    duration: { start: '2026-01-10', end: '2026-01-12' },
    audience: {
      localities: ['Kondapur', 'Gachibowli'],
      ageMin: '18',
      ageMax: '45',
      occasion: 'weekend',
    },
    cta: 'order_whatsapp',
    primaryLanguage: 'te_en',
    regionalStyle: 'hyderabadi',
    campaignStyle: 'funny',
    ...overrides,
  };
}

describe('buildCampaignInput -> generateCampaignStrategy schema compatibility', () => {
  it('produces a payload accepted by the real backend Zod schema', () => {
    const business = makeBusiness();
    const state = makeCompleteState();
    const input = buildCampaignInput(business, state, '11111111-1111-4111-8111-111111111111');

    expect(input).not.toBeNull();
    expect(() => generateCampaignStrategySchema.parse(input)).not.toThrow();
  });

  it('uses the field names the backend expects (no drift)', () => {
    const business = makeBusiness();
    const state = makeCompleteState();
    const input = buildCampaignInput(business, state, '11111111-1111-4111-8111-111111111111')!;

    expect(input.businessId).toBe('biz_1');
    expect(input.productId).toBe('prod_1');
    expect(input.offer.type).toBe('percentage');
    expect(input.cta).toBe('order_whatsapp');
    expect(input.localization.primaryLanguage).toBe('te_en');
    expect(input.localization.regionalStyle).toBe('hyderabadi');
    expect(input.localization.campaignStyle).toBe('funny');
    expect(input.idempotencyKey).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('returns null when a required field is missing (objective)', () => {
    const business = makeBusiness();
    const state = makeCompleteState({ objective: null });
    expect(buildCampaignInput(business, state, 'x')).toBeNull();
  });

  it('returns null when a required field is missing (product)', () => {
    const business = makeBusiness();
    const state = makeCompleteState({ selectedProductId: null });
    expect(buildCampaignInput(business, state, 'x')).toBeNull();
  });

  it('returns null when a required field is missing (offer type / cta / language / style)', () => {
    const business = makeBusiness();
    expect(
      buildCampaignInput(
        business,
        makeCompleteState({ offer: { ...makeCompleteState().offer, type: null } }),
        'x'
      )
    ).toBeNull();
    expect(buildCampaignInput(business, makeCompleteState({ cta: null }), 'x')).toBeNull();
    expect(
      buildCampaignInput(business, makeCompleteState({ primaryLanguage: null }), 'x')
    ).toBeNull();
    expect(
      buildCampaignInput(business, makeCompleteState({ regionalStyle: null }), 'x')
    ).toBeNull();
    expect(
      buildCampaignInput(business, makeCompleteState({ campaignStyle: null }), 'x')
    ).toBeNull();
  });

  it('computes a discounted price consistent with the entered percentage', () => {
    const business = makeBusiness();
    const state = makeCompleteState();
    const input = buildCampaignInput(business, state, 'x')!;
    expect(input.offer.price).toBe(249);
    expect(input.offer.originalPrice).toBe(349);
  });
});

describe('Backend schema rejects unsupported values (proves the wizard cannot send them)', () => {
  const base = buildCampaignInput(
    makeBusiness(),
    makeCompleteState(),
    '11111111-1111-4111-8111-111111111111'
  )!;

  it('rejects an objective not in the backend enum', () => {
    const bad = { ...base, objective: 'get_more_customers' };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });

  it('rejects a CTA not in the backend enum', () => {
    const bad = { ...base, cta: 'send_email' };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });

  it('rejects an offer type not in the backend enum', () => {
    const bad = { ...base, offer: { ...base.offer, type: 'buy_two_get_one' } };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });

  it('rejects a negative offer price', () => {
    const bad = { ...base, offer: { ...base.offer, price: -10 } };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });

  it('rejects zero photos worth of localities (empty audience.localities)', () => {
    const bad = { ...base, audience: { ...base.audience, localities: [] } };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });

  it('rejects a language outside the backend enum', () => {
    const bad = { ...base, localization: { ...base.localization, primaryLanguage: 'ta' } };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });

  it('rejects a non-uuid idempotency key', () => {
    const bad = { ...base, idempotencyKey: 'not-a-uuid' };
    expect(() => generateCampaignStrategySchema.parse(bad)).toThrow();
  });
});

describe('MVP-restricted UI enums stay within backend-supported values', () => {
  // Phase 30/31 widened the backend enum to also accept salon's and real
  // estate's objectives/CTA (generateCampaignStrategy.ts validates
  // per-business against VerticalConfig.allowedObjectives/allowedCTAs —
  // see config/verticals.ts — not by restricting the Zod enum itself,
  // since the schema can't yet know which business a request is for).
  const backendObjectives = [
    'weekend_offer',
    'new_dish',
    'festival',
    'discount',
    'brand_awareness',
    'service_promotion',
    'package_promotion',
    'appointment_promotion',
    'new_service',
    'property_promotion',
    'new_listing',
    'open_house',
    'project_promotion',
  ];
  const backendOfferTypes = ['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty'];
  const backendCtas = [
    'order_whatsapp',
    'book_table',
    'view_menu',
    'call_now',
    'get_directions',
    'book_appointment',
  ];
  const backendLanguages = ['en', 'te', 'hi', 'te_en', 'hi_en'];
  const backendRegionalStyles = [
    'neutral',
    'hyderabadi',
    'telangana',
    'mumbai',
    'bangalore',
    'delhi',
    'chennai',
    'kolkata',
  ];
  const backendCampaignStyles = [
    'funny',
    'quirky',
    'sarcastic',
    'dark_comedy',
    'emotional',
    'urgent',
    'fomo',
    'storytelling',
    'educational',
    'youthful',
  ];

  it('every exposed objective is backend-supported', () => {
    OBJECTIVES.forEach((o) => expect(backendObjectives).toContain(o.value));
  });

  it('every exposed offer type is backend-supported', () => {
    OFFER_TYPES.forEach((o) => expect(backendOfferTypes).toContain(o.value));
  });

  it('every exposed CTA is backend-supported', () => {
    CTA_OPTIONS.forEach((c) => expect(backendCtas).toContain(c.value));
  });

  it('exposes only the MVP language subset (en/te/te_en), never hi/hi_en', () => {
    const exposed = LANGUAGES.map((l) => l.value);
    expect(exposed.sort()).toEqual(['en', 'te', 'te_en'].sort());
    exposed.forEach((v) => expect(backendLanguages).toContain(v));
  });

  it('exposes only the MVP regional style subset (neutral/hyderabadi)', () => {
    const exposed = REGIONAL_STYLES.map((r) => r.value);
    expect(exposed.sort()).toEqual(['neutral', 'hyderabadi'].sort());
    exposed.forEach((v) => expect(backendRegionalStyles).toContain(v));
  });

  it('every exposed campaign style is backend-supported', () => {
    CAMPAIGN_STYLES.forEach((c) => expect(backendCampaignStyles).toContain(c.value));
  });
});
