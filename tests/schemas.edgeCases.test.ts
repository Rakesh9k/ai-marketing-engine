/**
 * Phase 7 — edge-case coverage for src/lib/validation/schemas.ts.
 *
 * Two kinds of tests live here:
 *  - "enforced" tests assert boundaries the schemas clearly intend to enforce.
 *  - "documented gaps" tests pin what the schemas ACCEPT today even though a
 *    stricter rule looks intended (whitespace-only names, javascript: URLs,
 *    inverted date ranges, ...). They characterise current behaviour, they do
 *    not endorse it: if a gap is closed deliberately, flip the assertion.
 */
import {
  createBusinessInputSchema,
  createBrandKitInputSchema,
  createCampaignInputSchema,
  createCampaignAssetInputSchema,
  createGenerationLogInputSchema,
  createProductInputSchema,
  createSubscriptionInputSchema,
  createUsageInputSchema,
  createUserInputSchema,
  businessContactSchema,
  localizationProfileSchema,
} from '@/lib/validation/schemas';

// ---------------------------------------------------------------------------
// Realistic Mitra fixtures (Hyderabad restaurant / campaign)
// ---------------------------------------------------------------------------
const localization = {
  country: 'India',
  state: 'Telangana',
  city: 'Hyderabad',
  locality: 'Kondapur',
  primaryLanguage: 'te_en',
  secondaryLanguage: 'en',
  languageMixing: 'natural',
  regionalStyle: 'hyderabadi',
  slangPreference: 'moderate',
  audienceDescription: 'IT professionals working near Kondapur',
  brandTone: 'friendly',
  campaignStyle: 'funny',
  contentFormat: 'poster',
};

const business = () => ({
  businessId: 'biz_1',
  userId: 'user_1',
  name: 'Paradise Biryani House',
  category: 'restaurant',
  description: 'Dum biryani and kebabs since 1995',
  location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
  contact: { phone: '+919876543210', whatsapp: '+919876543210' },
  businessBrain: {},
  settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
});

const campaign = () => ({
  campaignId: 'camp_1',
  businessId: 'biz_1',
  userId: 'user_1',
  objective: 'weekend_offer',
  offer: {
    headline: 'Weekend Biryani Feast',
    price: 299,
    originalPrice: 399,
    type: 'fixed',
    validityStart: '2026-10-10T00:00:00.000Z',
    validityEnd: '2026-10-12T23:59:59.000Z',
  },
  duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-12T23:59:59.000Z' },
  audience: { localities: ['Kondapur', 'Gachibowli'] },
  cta: 'order_whatsapp',
  localization,
  status: 'draft',
  creditsReserved: 10,
  metadata: { idempotencyKey: '123e4567-e89b-12d3-a456-426614174000' },
});

const product = () => ({
  productId: 'prod_1',
  businessId: 'biz_1',
  name: 'Chicken Dum Biryani',
  price: 299,
  category: 'main',
  images: [
    { url: 'https://storage.googleapis.com/b/p.jpg', storagePath: 'p/p.jpg', isPrimary: true },
  ],
});

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

/** Returns the dotted paths of every issue, so tests assert WHICH field failed. */
const failedPaths = (
  schema: {
    safeParse: (v: unknown) => {
      success: boolean;
      error?: { issues: { path: (string | number)[] }[] };
    };
  },
  v: unknown
) => {
  const r = schema.safeParse(v);
  return r.success ? [] : (r.error?.issues ?? []).map((i) => i.path.join('.'));
};

describe('fixtures are valid (guards every negative test below)', () => {
  it.each([
    ['business', createBusinessInputSchema, business()],
    ['campaign', createCampaignInputSchema, campaign()],
    ['product', createProductInputSchema, product()],
  ] as const)('%s fixture parses', (_n, schema, value) => {
    expect(ok(schema, value)).toBe(true);
  });
});

describe('required fields', () => {
  const required = ['businessId', 'userId', 'name', 'category', 'location', 'contact', 'settings'];

  it.each(required)('business rejects missing %s', (key) => {
    const b: Record<string, unknown> = business();
    delete b[key];
    expect(failedPaths(createBusinessInputSchema, b)).toContain(key);
  });

  it.each([null, undefined, ''])('business rejects name=%p', (name) => {
    expect(failedPaths(createBusinessInputSchema, { ...business(), name })).toContain('name');
  });

  it('business rejects a non-object body', () => {
    expect(ok(createBusinessInputSchema, null)).toBe(false);
    expect(ok(createBusinessInputSchema, undefined)).toBe(false);
    expect(ok(createBusinessInputSchema, 'biz')).toBe(false);
  });

  it('business requires currency to be exactly INR', () => {
    expect(ok(createBusinessInputSchema, { ...business(), settings: { currency: 'USD' } })).toBe(
      false
    );
    expect(ok(createBusinessInputSchema, { ...business(), settings: {} })).toBe(false);
  });

  it('applies defaults for omitted optional settings', () => {
    const parsed = createBusinessInputSchema.parse(business());
    expect(parsed.status).toBe('active');
    expect(parsed.settings.openingHours).toEqual({});
  });

  it('campaign rejects missing idempotency key inside metadata when metadata is present', () => {
    expect(failedPaths(createCampaignInputSchema, { ...campaign(), metadata: {} })).toContain(
      'metadata.idempotencyKey'
    );
  });
});

describe('strings: length boundaries', () => {
  it('business name accepts exactly 100 chars and rejects 101', () => {
    expect(ok(createBusinessInputSchema, { ...business(), name: 'a'.repeat(100) })).toBe(true);
    expect(ok(createBusinessInputSchema, { ...business(), name: 'a'.repeat(101) })).toBe(false);
  });

  it('description accepts exactly 500 chars and rejects 501', () => {
    expect(ok(createBusinessInputSchema, { ...business(), description: 'd'.repeat(500) })).toBe(
      true
    );
    expect(ok(createBusinessInputSchema, { ...business(), description: 'd'.repeat(501) })).toBe(
      false
    );
  });

  it('offer headline: 1..100 chars', () => {
    const withHeadline = (headline: string) => ({
      ...campaign(),
      offer: { ...campaign().offer, headline },
    });
    expect(ok(createCampaignInputSchema, withHeadline('x'))).toBe(true);
    expect(ok(createCampaignInputSchema, withHeadline('x'.repeat(100)))).toBe(true);
    expect(ok(createCampaignInputSchema, withHeadline(''))).toBe(false);
    expect(ok(createCampaignInputSchema, withHeadline('x'.repeat(101)))).toBe(false);
  });

  it('offer terms: accepts 1000 chars, rejects 1001', () => {
    const withTerms = (terms: string) => ({
      ...campaign(),
      offer: { ...campaign().offer, terms },
    });
    expect(ok(createCampaignInputSchema, withTerms('t'.repeat(1000)))).toBe(true);
    expect(ok(createCampaignInputSchema, withTerms('t'.repeat(1001)))).toBe(false);
  });

  it('accepts Telugu / Hindi / emoji business names (no ASCII-only restriction)', () => {
    for (const name of [
      'హైదరాబాదీ బిర్యానీ',
      'दिल्ली दरबार',
      'Biryani 🍗 Corner',
      "Ravi's Café & Bar",
    ]) {
      expect(ok(createBusinessInputSchema, { ...business(), name })).toBe(true);
    }
  });

  it('counts the max length in UTF-16 units (an emoji is 2)', () => {
    // 50 emoji = 100 UTF-16 code units -> allowed; 51 = 102 -> rejected.
    expect(ok(createBusinessInputSchema, { ...business(), name: '🍗'.repeat(50) })).toBe(true);
    expect(ok(createBusinessInputSchema, { ...business(), name: '🍗'.repeat(51) })).toBe(false);
  });

  it('location city/state must be non-empty', () => {
    expect(
      failedPaths(createBusinessInputSchema, {
        ...business(),
        location: { city: '', state: 'Telangana' },
      })
    ).toContain('location.city');
    expect(
      failedPaths(createBusinessInputSchema, {
        ...business(),
        location: { city: 'Hyderabad', state: '' },
      })
    ).toContain('location.state');
  });
});

describe('numbers', () => {
  const withPrice = (price: unknown) => ({ ...product(), price });

  it.each([0, -1, -0.01, NaN, '299', null, undefined])('product rejects price=%p', (price) => {
    expect(ok(createProductInputSchema, withPrice(price))).toBe(false);
  });

  it.each([0.01, 1, 299, 299.5, 99999999])('product accepts price=%p', (price) => {
    expect(ok(createProductInputSchema, withPrice(price))).toBe(true);
  });

  it('campaign offer price must be positive (zero rejected, free offers use free_delivery type)', () => {
    const offer = (price: number) => ({ ...campaign(), offer: { ...campaign().offer, price } });
    expect(ok(createCampaignInputSchema, offer(0))).toBe(false);
    expect(ok(createCampaignInputSchema, offer(-5))).toBe(false);
    expect(ok(createCampaignInputSchema, offer(NaN))).toBe(false);
  });

  it('creditsReserved must be > 0 but creditsUsed may be 0', () => {
    expect(ok(createCampaignInputSchema, { ...campaign(), creditsReserved: 0 })).toBe(false);
    expect(ok(createCampaignInputSchema, { ...campaign(), creditsReserved: -1 })).toBe(false);
    expect(ok(createCampaignInputSchema, { ...campaign(), creditsUsed: 0 })).toBe(true);
    expect(ok(createCampaignInputSchema, { ...campaign(), creditsUsed: -1 })).toBe(false);
  });

  it('audience ageRange: min >= 18 and max <= 80', () => {
    const age = (min: number, max: number) => ({
      ...campaign(),
      audience: { localities: ['Kondapur'], ageRange: { min, max } },
    });
    expect(ok(createCampaignInputSchema, age(18, 80))).toBe(true);
    expect(ok(createCampaignInputSchema, age(17, 40))).toBe(false);
    expect(ok(createCampaignInputSchema, age(25, 81))).toBe(false);
  });

  it('usage counters are integers >= 0 (decimals and negatives rejected)', () => {
    const usage = {
      usageId: 'u1',
      userId: 'user_1',
      periodStart: '2026-10-01T00:00:00.000Z',
      periodEnd: '2026-10-31T23:59:59.000Z',
      planId: 'starter',
      campaignsCreated: 0,
      creditsUsed: 0,
      imagesGenerated: 0,
      copyGenerations: 0,
      regenerations: 0,
      failedGenerations: 0,
    };
    expect(ok(createUsageInputSchema, usage)).toBe(true);
    expect(failedPaths(createUsageInputSchema, { ...usage, creditsUsed: 1.5 })).toContain(
      'creditsUsed'
    );
    expect(failedPaths(createUsageInputSchema, { ...usage, imagesGenerated: -1 })).toContain(
      'imagesGenerated'
    );
    expect(ok(createUsageInputSchema, { ...usage, campaignsCreated: NaN })).toBe(false);
  });

  it('generation log latency is a positive integer (0 and 12.5 rejected)', () => {
    const log = {
      logId: 'l1',
      campaignId: 'c1',
      stage: 'copy',
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      inputHash: 'abc123',
      latencyMs: 850,
      status: 'success',
      retryCount: 0,
    };
    expect(ok(createGenerationLogInputSchema, log)).toBe(true);
    expect(ok(createGenerationLogInputSchema, { ...log, latencyMs: 0 })).toBe(false);
    expect(ok(createGenerationLogInputSchema, { ...log, latencyMs: 12.5 })).toBe(false);
    expect(ok(createGenerationLogInputSchema, { ...log, retryCount: -1 })).toBe(false);
  });

  it('campaign asset index must be a non-negative integer', () => {
    const asset = {
      assetId: 'a1',
      campaignId: 'c1',
      businessId: 'b1',
      type: 'poster',
      index: 0,
      content: {},
      status: 'completed',
    };
    expect(ok(createCampaignAssetInputSchema, asset)).toBe(true);
    expect(ok(createCampaignAssetInputSchema, { ...asset, index: -1 })).toBe(false);
    expect(ok(createCampaignAssetInputSchema, { ...asset, index: 1.5 })).toBe(false);
  });
});

describe('arrays', () => {
  it('audience.localities: 1..10 entries', () => {
    const loc = (n: number) => ({
      ...campaign(),
      audience: { localities: Array.from({ length: n }, (_, i) => `Area ${i}`) },
    });
    expect(ok(createCampaignInputSchema, loc(0))).toBe(false);
    expect(ok(createCampaignInputSchema, loc(1))).toBe(true);
    expect(ok(createCampaignInputSchema, loc(10))).toBe(true);
    expect(ok(createCampaignInputSchema, loc(11))).toBe(false);
  });

  it('newProduct.images: 1..5 URLs', () => {
    const np = (n: number) => ({
      ...campaign(),
      newProduct: {
        name: 'Haleem',
        price: 250,
        images: Array.from({ length: n }, (_, i) => `https://example.com/${i}.jpg`),
      },
    });
    expect(ok(createCampaignInputSchema, np(0))).toBe(false);
    expect(ok(createCampaignInputSchema, np(5))).toBe(true);
    expect(ok(createCampaignInputSchema, np(6))).toBe(false);
  });

  it('product requires at least one image', () => {
    expect(failedPaths(createProductInputSchema, { ...product(), images: [] })).toContain('images');
  });

  it('product tags accept only known values; unknown tag fails with the index in the path', () => {
    expect(ok(createProductInputSchema, { ...product(), tags: ['signature', 'spicy'] })).toBe(true);
    expect(
      failedPaths(createProductInputSchema, { ...product(), tags: ['signature', 'halal'] })
    ).toContain('tags.1');
  });

  it('product variants require name and positive price', () => {
    expect(
      ok(createProductInputSchema, { ...product(), variants: [{ name: 'Half', price: 180 }] })
    ).toBe(true);
    expect(
      ok(createProductInputSchema, { ...product(), variants: [{ name: '', price: 180 }] })
    ).toBe(false);
    expect(
      ok(createProductInputSchema, { ...product(), variants: [{ name: 'Half', price: 0 }] })
    ).toBe(false);
  });

  it('defaults tags and variants to empty arrays', () => {
    const parsed = createProductInputSchema.parse(product());
    expect(parsed.tags).toEqual([]);
    expect(parsed.variants).toEqual([]);
  });

  it('rejects a scalar where an array is expected', () => {
    expect(ok(createUserInputSchema, { ...userInput(), businessIds: 'biz1' })).toBe(false);
  });
});

describe('enums (exact, case-sensitive)', () => {
  it('business category accepts only the three verticals', () => {
    for (const category of ['restaurant', 'salon', 'real_estate']) {
      expect(ok(createBusinessInputSchema, { ...business(), category })).toBe(true);
    }
    for (const category of ['Restaurant', 'RESTAURANT', 'real estate', 'cafe', '', null]) {
      expect(ok(createBusinessInputSchema, { ...business(), category })).toBe(false);
    }
  });

  it('campaign objective / cta / status reject wrong casing and unknown values', () => {
    expect(ok(createCampaignInputSchema, { ...campaign(), objective: 'Weekend_Offer' })).toBe(
      false
    );
    expect(ok(createCampaignInputSchema, { ...campaign(), cta: 'ORDER_WHATSAPP' })).toBe(false);
    expect(ok(createCampaignInputSchema, { ...campaign(), status: 'verified' })).toBe(false);
    expect(ok(createCampaignInputSchema, { ...campaign(), status: 'completed' })).toBe(true);
  });

  it('localization rejects values outside each enum', () => {
    expect(ok(localizationProfileSchema, localization)).toBe(true);
    expect(
      failedPaths(localizationProfileSchema, { ...localization, primaryLanguage: 'ta' })
    ).toContain('primaryLanguage');
    expect(
      failedPaths(localizationProfileSchema, { ...localization, regionalStyle: 'Hyderabadi' })
    ).toContain('regionalStyle');
    expect(
      failedPaths(localizationProfileSchema, { ...localization, campaignStyle: 'business' })
    ).toContain('campaignStyle');
  });

  it('subscription plan ids are lowercase and exclude retired plans', () => {
    const sub = subscriptionInput();
    expect(ok(createSubscriptionInputSchema, sub)).toBe(true);
    expect(ok(createSubscriptionInputSchema, { ...sub, planId: 'Starter' })).toBe(false);
    expect(ok(createSubscriptionInputSchema, { ...sub, planId: 'pro' })).toBe(false);
    expect(ok(createSubscriptionInputSchema, { ...sub, status: 'paused' })).toBe(false);
  });

  it('user role defaults to "user" and rejects admin', () => {
    expect(createUserInputSchema.parse(userInput()).role).toBe('user');
    expect(ok(createUserInputSchema, { ...userInput(), role: 'admin' })).toBe(false);
  });
});

describe('URLs', () => {
  const withWebsite = (website: string) => ({
    phone: '+919876543210',
    whatsapp: '+919876543210',
    website,
  });

  it('contact.website accepts empty string, https and http', () => {
    expect(ok(businessContactSchema, withWebsite(''))).toBe(true);
    expect(ok(businessContactSchema, withWebsite('https://paradise.example.in'))).toBe(true);
    expect(ok(businessContactSchema, withWebsite('http://paradise.example.in/menu?x=1'))).toBe(
      true
    );
  });

  it.each(['not a url', 'paradise.example.in', '//paradise.example.in', 'https://', ' '])(
    'contact.website rejects malformed %p',
    (website) => {
      expect(ok(businessContactSchema, withWebsite(website))).toBe(false);
    }
  );

  it('photoURL / product image URL / newProduct image URL reject malformed values', () => {
    expect(ok(createUserInputSchema, { ...userInput(), photoURL: 'photo.jpg' })).toBe(false);
    expect(
      ok(createProductInputSchema, {
        ...product(),
        images: [{ url: 'p.jpg', storagePath: 'p', isPrimary: true }],
      })
    ).toBe(false);
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        newProduct: { name: 'x', price: 1, images: ['nope'] },
      })
    ).toBe(false);
  });

  it('empty photoURL is rejected (only contact.website allows an empty string)', () => {
    expect(ok(createUserInputSchema, { ...userInput(), photoURL: '' })).toBe(false);
  });

  // Documented gap: z.string().url() validates syntax only, not the protocol.
  it('GAP: accepts non-http(s) schemes such as javascript: and ftp:', () => {
    expect(ok(businessContactSchema, withWebsite('javascript:alert(1)'))).toBe(true);
    expect(ok(businessContactSchema, withWebsite('ftp://files.example.in/menu.pdf'))).toBe(true);
    expect(ok(createUserInputSchema, { ...userInput(), photoURL: 'javascript:alert(1)' })).toBe(
      true
    );
  });
});

describe('dates (z.string().datetime())', () => {
  const withDates = (start: string, end: string) => ({
    ...campaign(),
    duration: { start, end },
  });

  it('accepts ISO-8601 UTC with and without milliseconds', () => {
    expect(
      ok(createCampaignInputSchema, withDates('2026-10-10T00:00:00Z', '2026-10-11T00:00:00.000Z'))
    ).toBe(true);
  });

  it.each([
    ['date only', '2026-10-10'],
    ['space separator', '2026-10-10 00:00:00'],
    ['no timezone', '2026-10-10T00:00:00'],
    ['epoch millis', '1790000000000'],
    ['empty', ''],
    ['natural language', 'next friday'],
    ['month 13', '2026-13-01T00:00:00Z'],
    ['day 32', '2026-10-32T00:00:00Z'],
    ['hour 25', '2026-10-10T25:00:00Z'],
  ])('rejects %s', (_label, value) => {
    expect(
      failedPaths(createCampaignInputSchema, withDates(value, '2026-10-12T00:00:00Z'))
    ).toContain('duration.start');
  });

  it('rejects impossible calendar dates in the leap-year boundary', () => {
    expect(
      ok(createCampaignInputSchema, withDates('2028-02-29T00:00:00Z', '2028-03-01T00:00:00Z'))
    ).toBe(true);
    expect(
      ok(createCampaignInputSchema, withDates('2027-02-29T00:00:00Z', '2027-03-01T00:00:00Z'))
    ).toBe(false);
  });

  it('rejects numeric timestamps and Date objects (strings only)', () => {
    expect(
      ok(
        createCampaignInputSchema,
        withDates(1790000000000 as unknown as string, '2026-10-12T00:00:00Z')
      )
    ).toBe(false);
    expect(
      ok(
        createCampaignInputSchema,
        withDates(new Date() as unknown as string, '2026-10-12T00:00:00Z')
      )
    ).toBe(false);
  });

  it('rejects local-offset timestamps such as IST (+05:30); clients must send UTC "Z"', () => {
    expect(
      ok(createCampaignInputSchema, withDates('2026-10-10T09:00:00+05:30', '2026-10-12T00:00:00Z'))
    ).toBe(false);
  });

  // Documented gaps: there is no cross-field date rule.
  it('GAP: accepts an end date before the start date (duration and offer validity)', () => {
    expect(
      ok(createCampaignInputSchema, withDates('2026-10-12T00:00:00Z', '2026-10-10T00:00:00Z'))
    ).toBe(true);
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        offer: {
          ...campaign().offer,
          validityStart: '2026-10-12T00:00:00Z',
          validityEnd: '2026-10-10T00:00:00Z',
        },
      })
    ).toBe(true);
  });
});

describe('business data (realistic Mitra inputs)', () => {
  it('accepts a salon and a real-estate profile', () => {
    expect(
      ok(createBusinessInputSchema, {
        ...business(),
        businessId: 'biz_salon',
        name: 'Glow Unisex Salon',
        category: 'salon',
        location: {
          city: 'Hyderabad',
          state: 'Telangana',
          locality: 'Madhapur',
          address: 'Plot 12, Madhapur',
        },
      })
    ).toBe(true);
    expect(
      ok(createBusinessInputSchema, {
        ...business(),
        businessId: 'biz_re',
        name: 'Skyline Realty',
        category: 'real_estate',
      })
    ).toBe(true);
  });

  it('validates opening hours entries (open/close strings required per day)', () => {
    const settings = (openingHours: unknown) => ({
      ...business(),
      settings: { currency: 'INR', openingHours },
    });
    expect(
      ok(createBusinessInputSchema, settings({ mon: { open: '10:00', close: '23:00' } }))
    ).toBe(true);
    expect(
      ok(createBusinessInputSchema, settings({ sun: { open: '', close: '', closed: true } }))
    ).toBe(true);
    expect(ok(createBusinessInputSchema, settings({ mon: { open: '10:00' } }))).toBe(false);
  });

  it('deliveryRadiusKm and minimumOrder must be positive when present', () => {
    const settings = (extra: object) => ({
      ...business(),
      settings: { currency: 'INR', ...extra },
    });
    expect(
      ok(createBusinessInputSchema, settings({ deliveryRadiusKm: 5, minimumOrder: 199 }))
    ).toBe(true);
    expect(ok(createBusinessInputSchema, settings({ deliveryRadiusKm: 0 }))).toBe(false);
    expect(ok(createBusinessInputSchema, settings({ minimumOrder: -50 }))).toBe(false);
  });

  it('location coordinates need numeric latitude AND longitude', () => {
    const loc = (coordinates: unknown) => ({
      ...business(),
      location: { city: 'Hyderabad', state: 'Telangana', coordinates },
    });
    expect(ok(createBusinessInputSchema, loc({ latitude: 17.385, longitude: 78.4867 }))).toBe(true);
    expect(ok(createBusinessInputSchema, loc({ latitude: 17.385 }))).toBe(false);
    expect(ok(createBusinessInputSchema, loc({ latitude: '17.385', longitude: '78.4867' }))).toBe(
      false
    );
  });

  it('brand kit colours must be 6-digit hex with a leading #', () => {
    const kit = (primary: string) => ({
      businessId: 'biz_1',
      colors: { primary },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      tone: 'premium',
    });
    expect(ok(createBrandKitInputSchema, kit('#D4380D'))).toBe(true);
    expect(ok(createBrandKitInputSchema, kit('#d4380d'))).toBe(true);
    for (const bad of ['D4380D', '#D43', '#GGGGGG', '#D4380D00', 'red', '']) {
      expect(ok(createBrandKitInputSchema, kit(bad))).toBe(false);
    }
  });

  it('brand kit applies default background and text colours', () => {
    const parsed = createBrandKitInputSchema.parse({
      businessId: 'biz_1',
      colors: { primary: '#D4380D' },
      fonts: { heading: 'A', body: 'B' },
      tone: 'bold',
    });
    expect(parsed.colors.background).toBe('#FFFFFF');
    expect(parsed.colors.text).toBe('#1A1A1A');
  });

  it('contact requires non-empty phone and whatsapp', () => {
    expect(ok(businessContactSchema, { phone: '', whatsapp: '+91' })).toBe(false);
    expect(ok(businessContactSchema, { phone: '+919876543210', whatsapp: '' })).toBe(false);
  });
});

describe('campaign data (realistic Mitra inputs)', () => {
  it('accepts a festival campaign with a new product and age targeting', () => {
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        objective: 'festival',
        newProduct: {
          name: 'Pista House Haleem',
          price: 320,
          images: ['https://storage.googleapis.com/b/haleem.jpg'],
        },
        audience: {
          localities: ['Kondapur'],
          ageRange: { min: 21, max: 45 },
          occasion: 'festival',
        },
      })
    ).toBe(true);
  });

  it('rejects an unknown audience.occasion', () => {
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        audience: { localities: ['Kondapur'], occasion: 'midnight' },
      })
    ).toBe(false);
  });

  it('requires the idempotency key to be a UUID when metadata is supplied', () => {
    const meta = (idempotencyKey: string) => ({ ...campaign(), metadata: { idempotencyKey } });
    expect(ok(createCampaignInputSchema, meta('not-a-uuid'))).toBe(false);
    expect(ok(createCampaignInputSchema, meta(''))).toBe(false);
  });

  it('error block, when present, needs code/message/stage/retryable', () => {
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        status: 'failed',
        error: {
          code: 'AI_TIMEOUT',
          message: 'Provider timed out',
          stage: 'generating_copy',
          retryable: true,
        },
      })
    ).toBe(true);
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        status: 'failed',
        error: { code: 'AI_TIMEOUT' },
      })
    ).toBe(false);
  });

  it('strips unknown top-level keys instead of failing (zod default)', () => {
    const parsed = createCampaignInputSchema.parse({ ...campaign(), isAdmin: true });
    expect('isAdmin' in parsed).toBe(false);
  });

  it('a campaign body nested under the wrong key fails on every required field', () => {
    const paths = failedPaths(createCampaignInputSchema, { campaign: campaign() });
    expect(paths).toEqual(expect.arrayContaining(['campaignId', 'offer', 'duration', 'audience']));
  });

  // Documented gaps.
  it('GAP: accepts offer.originalPrice lower than the offer price', () => {
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        offer: { ...campaign().offer, price: 500, originalPrice: 100 },
      })
    ).toBe(true);
  });

  it('GAP: accepts an inverted age range (min greater than max)', () => {
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        audience: { localities: ['Kondapur'], ageRange: { min: 60, max: 20 } },
      })
    ).toBe(true);
  });

  it('GAP: accepts Infinity for price and creditsReserved (no .finite())', () => {
    expect(ok(createProductInputSchema, { ...product(), price: Infinity })).toBe(true);
    expect(ok(createCampaignInputSchema, { ...campaign(), creditsReserved: Infinity })).toBe(true);
  });

  it('GAP: accepts whitespace-only names and headlines (no trim)', () => {
    expect(ok(createBusinessInputSchema, { ...business(), name: '   ' })).toBe(true);
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        offer: { ...campaign().offer, headline: '   ' },
      })
    ).toBe(true);
  });

  it('GAP: accepts duplicate localities', () => {
    expect(
      ok(createCampaignInputSchema, {
        ...campaign(),
        audience: { localities: ['Kondapur', 'Kondapur'] },
      })
    ).toBe(true);
  });
});

describe('user input', () => {
  it('rejects malformed e-mail addresses', () => {
    for (const email of [
      '',
      'plainaddress',
      '@example.com',
      'a@',
      'a b@example.com',
      'a@@example.com',
    ]) {
      expect(failedPaths(createUserInputSchema, { ...userInput(), email })).toContain('email');
    }
  });

  it('accepts plus-addressing and sub-domains', () => {
    expect(
      ok(createUserInputSchema, { ...userInput(), email: 'owner+mitra@mail.paradise.co.in' })
    ).toBe(true);
  });

  it('settings.language is limited to en / te / hi', () => {
    expect(
      ok(createUserInputSchema, {
        ...userInput(),
        settings: { notifications: true, language: 'te' },
      })
    ).toBe(true);
    expect(
      ok(createUserInputSchema, {
        ...userInput(),
        settings: { notifications: true, language: 'te_en' },
      })
    ).toBe(false);
  });
});

function userInput() {
  return {
    userId: 'user_1',
    email: 'owner@example.com',
    settings: { notifications: true, language: 'en', timezone: 'Asia/Kolkata' },
  };
}

function subscriptionInput() {
  return {
    subscriptionId: 'sub_1',
    userId: 'user_1',
    planId: 'starter',
    status: 'active',
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-31T23:59:59.000Z',
    creditsIncluded: 200,
    creditsUsed: 0,
    cancelAtPeriodEnd: false,
  };
}
