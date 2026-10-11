/**
 * LIVE model benchmark for the CAMPAIGN text path. OPT-IN: skipped unless `LIVE_GEMINI=1`,
 * `BENCH=1` and a real `GEMINI_API_KEY` are set, so it never runs in normal CI and never spends anything
 * by default.
 *
 *   LIVE_GEMINI=1 BENCH=1 BENCH_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite \
 *     BENCH_OUT=/path/results.json npm --prefix functions run test -- src/services/ai/modelBenchmark.live
 *
 * It runs the REAL GenerationPipeline.execute() — the real prompts, the real zod schemas, the real
 * schema-repair loop and the real Truth Check — once per (scenario × model). Only image generation,
 * and the uploads that follow it, are stubbed (this benchmark is about text). The Google SDK is
 * wrapped so every model call's latency, token usage (including "thinking" tokens) and the model
 * version that actually answered are captured.
 *
 * Synthetic businesses only. The API key is never printed.
 */
const generateImageMock = jest.fn().mockResolvedValue({
  success: true,
  imageUrl: 'https://provider.example.com/temp-hero.png',
  provider: 'openai',
  model: 'dall-e-3',
});
const analyzeProductImagesMock = jest.fn();

jest.mock('./index', () => ({
  ...jest.requireActual('./index'),
  analyzeProductImages: (...args: unknown[]) => analyzeProductImagesMock(...args),
  generateImage: (...args: unknown[]) => generateImageMock(...args),
}));
jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest
    .fn()
    .mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest
    .fn()
    .mockImplementation(async (businessId: string, campaignId: string, type: string) => ({
      url: `https://storage.example.com/${businessId}/${campaignId}/${type}-${Math.random()}`,
      storagePath: `businesses/${businessId}/campaigns/${campaignId}/generated/${type}.png`,
    })),
}));

import * as fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { languageLeaks } from './localizationContract';
import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { buildBusiness, createBusinessSchema } from '../businessCreation';
import { toBusinessCreation } from '../../onboarding/brainMapping';
import { applyUserAnswers, normalizeDraft } from '../../onboarding/draftModel';

const ENABLED =
  process.env['LIVE_GEMINI'] === '1' &&
  process.env['BENCH'] === '1' &&
  !!process.env['GEMINI_API_KEY'];
const describeBench = ENABLED ? describe : describe.skip;

const KEY = process.env['GEMINI_API_KEY'] ?? '';
const MODELS = (process.env['BENCH_MODELS'] || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const ONLY = (process.env['BENCH_SCENARIOS'] || '').split(',').filter(Boolean);
const OUT = process.env['BENCH_OUT'] || '';
const NOW = '2026-10-05T00:00:00.000Z';
const EXPECTED_TEXT_CALLS = 9; // stages 1,2,3,4,5,6,8,9,10

// ── scenarios ───────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  label: string;
  language: 'en' | 'te' | 'hi' | 'te_en' | 'hi_en';
  /** What the copy should be mostly written in, for the script-share check (null = no expectation). */
  expectScript: 'telugu' | 'devanagari' | null;
  input: GenerationPipelineInput;
  allowedPrices: number[];
}

const loc = (city: string, state: string, locality: string) => ({
  country: 'India',
  state,
  city,
  locality,
});

function localization(over: Record<string, unknown>) {
  return {
    country: 'India',
    secondaryLanguage: 'en',
    languageMixing: 'natural',
    slangPreference: 'light',
    brandTone: 'friendly',
    campaignStyle: 'funny',
    contentFormat: 'poster',
    ...over,
  } as any;
}

function baseInput(
  over: Partial<GenerationPipelineInput> & Record<string, unknown>
): GenerationPipelineInput {
  return {
    businessId: 'bench_biz',
    campaignId: 'bench_camp',
    cta: 'order_whatsapp',
    offerType: 'percentage',
    offerValidityStart: '2026-10-10T00:00:00.000Z',
    offerValidityEnd: '2026-10-15T00:00:00.000Z',
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    brandProfile: {},
    campaignStyle: 'funny',
    ...over,
  } as GenerationPipelineInput;
}

function restaurantBrain(extraProducts = 0) {
  const business = buildBusiness(
    createBusinessSchema.parse({
      name: 'Spice Route Kitchen',
      category: 'restaurant',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      contact: { phone: '+919876543210', whatsapp: '+919876543210' },
      language: 'te_en',
      regionalStyle: 'hyderabadi',
      contentStyle: 'funny',
      operatingMode: 'delivery',
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        deliveryRadiusKm: 6,
        minimumOrder: 199,
        openingHours: {
          mon: { open: '11:00', close: '23:00' },
          sat: { open: '11:00', close: '23:30' },
          sun: { open: '11:00', close: '23:30' },
        },
      },
    }),
    'bench_user',
    'bench_biz',
    NOW
  );
  const products = [
    {
      productId: 'p1',
      name: 'Dum Biryani',
      description: 'Slow-cooked in sealed handi',
      price: 299,
      category: 'Biryani',
      tags: ['signature'],
      attributes: { spiceLevel: 'medium' },
    },
  ];
  for (let i = 0; i < extraProducts; i++) {
    products.push({
      productId: `px${i}`,
      name: `House special no. ${i + 1}`,
      description: `Made fresh daily with regional spices, served hot, portion for ${1 + (i % 4)} people, popular with office lunch orders and weekend family dinners.`,
      price: 120 + i * 7,
      category: ['Biryani', 'Starters', 'Curries', 'Desserts'][i % 4]!,
      tags: ['fresh', 'popular'],
      attributes: { spiceLevel: 'mild' },
    });
  }
  return { ...business.businessBrain, products } as any;
}

function generalBrain() {
  // The real conversational-onboarding path: confirmed draft → normalize → business.
  const draft = applyUserAnswers(
    null,
    'bench_user',
    {
      updates: [
        { path: 'owner.name', value: 'Asha' },
        { path: 'identity.industry', value: 'fitness' },
        { path: 'identity.subcategory', value: 'yoga' },
        { path: 'identity.name', value: 'Prana Yoga Studio' },
        { path: 'identity.city', value: 'Delhi' },
        { path: 'identity.state', value: 'Delhi' },
        { path: 'contact.whatsapp', value: '9876543210' },
        { path: 'offering.signature', value: ['Group classes', 'Beginner batches', 'Meditation'] },
        { path: 'audience.primary', value: ['Working professionals', 'Beginners'] },
        { path: 'positioning.usp', value: 'Small batches, so every class gets personal attention' },
      ],
    },
    NOW
  );
  const plan = toBusinessCreation(normalizeDraft(draft), NOW);
  return buildBusiness(plan.data, 'bench_user', 'bench_biz', NOW, plan.extras).businessBrain as any;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'restaurant-te_en',
    label: 'Restaurant · Telugu+English · Hyderabadi · funny',
    language: 'te_en',
    expectScript: null,
    allowedPrices: [299, 332],
    input: baseInput({
      businessName: 'Spice Route Kitchen',
      businessCategory: 'restaurant',
      vertical: 'restaurant',
      businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      whatsappNumber: '+919876543210',
      businessPhone: '+919876543210',
      businessBrain: restaurantBrain(),
      objective: 'weekend_offer',
      productName: 'Dum Biryani',
      offerHeadline: 'Weekend Special',
      offerPrice: 299,
      offerOriginalPrice: 332,
      audience: { localities: ['Kondapur'] },
      localizationProfile: localization({
        ...loc('Hyderabad', 'Telangana', 'Kondapur'),
        primaryLanguage: 'te_en',
        regionalStyle: 'hyderabadi',
        audienceDescription: 'Office crowd and families',
      }),
    }),
  },
  {
    id: 'salon-hi_en',
    label: 'Salon · Hinglish · Mumbai',
    language: 'hi_en',
    expectScript: null,
    allowedPrices: [14999, 17999],
    input: baseInput({
      businessName: 'Glow Studio',
      businessCategory: 'salon',
      vertical: 'salon',
      businessLocation: { city: 'Mumbai', state: 'Maharashtra', locality: 'Andheri West' },
      whatsappNumber: '+919123456780',
      businessPhone: '+919123456780',
      businessBrain: {
        identity: {
          name: 'Glow Studio',
          category: 'salon',
          description: 'Ladies salon and bridal studio',
          location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Andheri West' },
          contact: { phone: '+919123456780', whatsapp: '+919123456780' },
        },
        products: [],
        brand: {
          tone: 'premium',
          personality: 'elegant',
          visualPreferences: 'soft gold tones',
          colors: { primary: '#B8860B', secondary: '#FFFFFF', accent: '#F5DEB3' },
          fonts: { heading: 'Poppins', body: 'Inter' },
        },
        audience: {
          targetCustomer: 'Brides and working women',
          ageRange: { min: 22, max: 45 },
          localities: ['Andheri West'],
          preferences: '',
        },
        localization: {
          primaryLanguage: 'hi_en',
          secondaryLanguage: 'hi',
          regionalStyle: 'mumbai',
          slangIntensity: 'moderate',
          languageMixing: 'natural',
        },
        businessRules: {
          openingHours: {},
          deliveryRadiusKm: 0,
          minimumOrder: 0,
          offerValidityRules: '',
          pricingRules: '',
          operatingMode: 'dine-in',
        },
        verticalProfile: {
          vertical: 'salon',
          services: [
            { id: 's1', name: 'Bridal Makeup', category: 'bridal', price: 12000, active: true },
            { id: 's2', name: 'Hair Spa', category: 'hair', price: 1800, active: true },
          ],
          packages: [
            {
              id: 'k1',
              name: 'Bridal Glow Package',
              serviceIds: ['s1', 's2'],
              packagePrice: 14999,
              originalPrice: 17999,
              active: true,
            },
          ],
          appointmentSettings: { acceptInquiries: true, preferredBookingChannel: 'whatsapp' },
        },
        campaignHistory: [],
        lastSyncedAt: NOW,
      } as any,
      objective: 'package_promotion',
      productName: 'Bridal Glow Package',
      offerHeadline: 'Wedding season offer',
      offerPrice: 14999,
      offerOriginalPrice: 17999,
      cta: 'book_appointment',
      audience: { localities: ['Andheri West'] },
      localizationProfile: localization({
        ...loc('Mumbai', 'Maharashtra', 'Andheri West'),
        primaryLanguage: 'hi_en',
        secondaryLanguage: 'hi',
        regionalStyle: 'mumbai',
        brandTone: 'premium',
        campaignStyle: 'emotional',
        audienceDescription: 'Brides and their families',
      }),
    }),
  },
  {
    id: 'realestate-en',
    label: 'Real estate · English · premium',
    language: 'en',
    expectScript: null,
    allowedPrices: [8500000],
    input: baseInput({
      businessName: 'Skyline Realty',
      businessCategory: 'real_estate',
      vertical: 'real_estate',
      businessLocation: { city: 'Bengaluru', state: 'Karnataka', locality: 'Whitefield' },
      whatsappNumber: '+919988776655',
      businessPhone: '+919988776655',
      businessBrain: {
        identity: {
          name: 'Skyline Realty',
          category: 'real_estate',
          description: 'Residential sales in Whitefield',
          location: { city: 'Bengaluru', state: 'Karnataka', locality: 'Whitefield' },
          contact: { phone: '+919988776655', whatsapp: '+919988776655' },
        },
        products: [],
        brand: {
          tone: 'premium',
          personality: 'trustworthy',
          visualPreferences: 'clean modern',
          colors: { primary: '#1F3A5F', secondary: '#FFFFFF', accent: '#C9A227' },
          fonts: { heading: 'Poppins', body: 'Inter' },
        },
        audience: {
          targetCustomer: 'First-time buyers and families',
          ageRange: { min: 28, max: 50 },
          localities: ['Whitefield'],
          preferences: '',
        },
        localization: {
          primaryLanguage: 'en',
          secondaryLanguage: 'en',
          regionalStyle: 'neutral',
          slangIntensity: 'light',
          languageMixing: 'minimal',
        },
        businessRules: {
          openingHours: {},
          deliveryRadiusKm: 0,
          minimumOrder: 0,
          offerValidityRules: '',
          pricingRules: '',
          operatingMode: 'dine-in',
        },
        verticalProfile: {
          vertical: 'real_estate',
          properties: [
            {
              id: 'r1',
              title: 'Skyline Heights 3BHK',
              propertyType: 'apartment',
              areaSqft: 1450,
              bedrooms: 3,
              bathrooms: 3,
              price: 8500000,
              possessionStatus: 'ready_to_move',
              amenities: ['Clubhouse', 'Swimming pool'],
              availability: 'available',
              active: true,
            },
          ],
        },
        campaignHistory: [],
        lastSyncedAt: NOW,
      } as any,
      objective: 'property_promotion',
      productName: 'Skyline Heights 3BHK',
      offerHeadline: 'Ready to move in',
      offerPrice: 8500000,
      offerType: 'fixed',
      cta: 'call_now',
      audience: { localities: ['Whitefield'] },
      localizationProfile: localization({
        ...loc('Bengaluru', 'Karnataka', 'Whitefield'),
        primaryLanguage: 'en',
        languageMixing: 'minimal',
        regionalStyle: 'neutral',
        brandTone: 'premium',
        campaignStyle: 'storytelling',
        audienceDescription: 'First-time home buyers',
      }),
    }),
  },
  {
    id: 'general-hi',
    label: 'General (yoga, via onboarding) · pure Hindi · Delhi',
    language: 'hi',
    expectScript: 'devanagari',
    allowedPrices: [999],
    input: baseInput({
      businessName: 'Prana Yoga Studio',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: { city: 'Delhi', state: 'Delhi' },
      whatsappNumber: '+919876543210',
      businessPhone: '+919876543210',
      businessBrain: generalBrain(),
      objective: 'service_promotion',
      productName: 'Morning batch',
      offerHeadline: 'New morning batch',
      offerPrice: 999,
      cta: 'order_whatsapp',
      audience: { localities: ['Delhi'] },
      localizationProfile: localization({
        ...loc('Delhi', 'Delhi', 'Delhi'),
        primaryLanguage: 'hi',
        secondaryLanguage: 'hi',
        languageMixing: 'minimal',
        regionalStyle: 'delhi',
        campaignStyle: 'emotional',
        audienceDescription: 'Working professionals',
      }),
    }),
  },
  {
    id: 'general-te',
    label: 'General (boutique) · pure Telugu · Hyderabad',
    language: 'te',
    expectScript: 'telugu',
    allowedPrices: [1499, 1999],
    input: baseInput({
      businessName: 'Threads Boutique',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: { city: 'Hyderabad', state: 'Telangana' },
      whatsappNumber: '+919876500011',
      businessPhone: '+919876500011',
      businessBrain: {
        ...generalBrain(),
        identity: {
          name: 'Threads Boutique',
          category: 'general',
          description: '',
          location: { city: 'Hyderabad', state: 'Telangana' },
          contact: { phone: '+919876500011', whatsapp: '+919876500011' },
          industry: 'retail',
          subcategory: 'fashion',
        },
        offerings: { signature: ['Ethnic wear', 'Festive outfits'] },
        audience: {
          targetCustomer: 'Women shopping for festivals',
          ageRange: { min: 20, max: 50 },
          localities: ['Hyderabad'],
          preferences: '',
          primary: ['Women shopping for festivals'],
        },
        positioning: { usp: 'Handpicked designs from local weavers' },
      },
      objective: 'product_promotion',
      productName: 'Festive silk kurta set',
      offerHeadline: 'Dasara collection',
      offerPrice: 1499,
      offerOriginalPrice: 1999,
      cta: 'order_whatsapp',
      audience: { localities: ['Hyderabad'] },
      localizationProfile: localization({
        ...loc('Hyderabad', 'Telangana', 'Hyderabad'),
        primaryLanguage: 'te',
        secondaryLanguage: 'te',
        languageMixing: 'minimal',
        regionalStyle: 'telangana',
        campaignStyle: 'emotional',
        audienceDescription: 'Women shopping for festivals',
      }),
    }),
  },
  {
    id: 'restaurant-long',
    label: 'Restaurant · LONG Business Brain (60 products) · English',
    language: 'en',
    expectScript: null,
    allowedPrices: [299, 349],
    input: baseInput({
      businessName: 'Spice Route Kitchen',
      businessCategory: 'restaurant',
      vertical: 'restaurant',
      businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
      whatsappNumber: '+919876543210',
      businessPhone: '+919876543210',
      businessBrain: restaurantBrain(60),
      objective: 'new_dish',
      productName: 'Dum Biryani',
      offerHeadline: 'New family pack',
      offerPrice: 299,
      offerOriginalPrice: 349,
      audience: { localities: ['Kondapur'] },
      localizationProfile: localization({
        ...loc('Hyderabad', 'Telangana', 'Kondapur'),
        primaryLanguage: 'en',
        languageMixing: 'minimal',
        regionalStyle: 'hyderabadi',
        audienceDescription: 'Families',
      }),
    }),
  },
];

// ── measurement ─────────────────────────────────────────────────────────────

interface CallRecord {
  ms: number;
  modelVersion?: string;
  promptTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  error?: string;
}

const SKIP_KEYS = /^(imageUrl|storagePath|assetId|createdAt|status|type|index|id|url)$/i;
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.test(k)) strings(v, out);
  }
  return out;
}

const CLAIMS =
  /\b(best|#1|number\s+one|award|awarded|famous|oldest|cheapest|lowest|guarantee[sd]?|certified|licensed|organic|authentic|100%)\b/i;

/** Numbers that are real facts: the offer, plus anything priced or limited in the Business Brain. */
function brainPrices(value: unknown, out = new Set<number>(), key = ''): Set<number> {
  if (typeof value === 'number' && /price|minimumorder/i.test(key)) out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => brainPrices(v, out, key));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) brainPrices(v, out, k);
  }
  return out;
}

function analyse(texts: string[], scenario: Scenario) {
  const all = texts.join('\n');
  const count = (re: RegExp) => (all.match(re) || []).length;
  const telugu = count(/[ఀ-౿]/g);
  const deva = count(/[ऀ-ॿ]/g);
  const latin = count(/[A-Za-z]/g);
  const letters = Math.max(1, telugu + deva + latin);

  const prices = [...all.matchAll(/(?:₹|Rs\.?|INR)\s?([0-9][0-9,]*)/gi)].map((m) =>
    Number(m[1]!.replace(/,/g, ''))
  );
  const factual = new Set([
    ...scenario.allowedPrices,
    ...brainPrices(scenario.input.businessBrain),
  ]);
  const inventedPrices = [...new Set(prices.filter((p) => !factual.has(p)))];

  const wa = scenario.input.whatsappNumber.replace(/\D/g, '');
  const phones = [...all.matchAll(/\+?\d[\d\s-]{8,}\d/g)].map((m) => m[0].replace(/\D/g, ''));
  const inventedPhones = [...new Set(phones.filter((p) => !wa.endsWith(p.slice(-10))))];

  return {
    chars: all.length,
    scriptShare: {
      telugu: +(telugu / letters).toFixed(2),
      devanagari: +(deva / letters).toFixed(2),
      latin: +(latin / letters).toFixed(2),
    },
    languageOk:
      scenario.expectScript === 'telugu'
        ? telugu / letters >= 0.5
        : scenario.expectScript === 'devanagari'
          ? deva / letters >= 0.5
          : true,
    offerPriceShown: prices.some((p) => scenario.allowedPrices.includes(p)),
    inventedPrices,
    inventedPhones,
    claimWords: [
      ...new Set((all.match(new RegExp(CLAIMS.source, 'gi')) || []).map((s) => s.toLowerCase())),
    ],
  };
}

describeBench('Campaign text-model benchmark — LIVE, real pipeline', () => {
  jest.setTimeout(600_000);

  const calls: CallRecord[] = [];
  const results: any[] = [];
  const originalGet = GoogleGenerativeAI.prototype.getGenerativeModel;

  beforeAll(() => {
    // Observe every model call the real pipeline makes, without changing it.
    GoogleGenerativeAI.prototype.getGenerativeModel = function (this: any, ...args: any[]) {
      const model = (originalGet as any).apply(this, args);
      const original = model.generateContent.bind(model);
      model.generateContent = async (...a: any[]) => {
        const started = Date.now();
        try {
          const res = await original(...a);
          const u: any = res.response.usageMetadata || {};
          calls.push({
            ms: Date.now() - started,
            modelVersion: (res.response as any).modelVersion,
            promptTokens: u.promptTokenCount || 0,
            outputTokens: u.candidatesTokenCount || 0,
            thoughtTokens: u.thoughtsTokenCount || 0,
          });
          return res;
        } catch (e: any) {
          calls.push({
            ms: Date.now() - started,
            promptTokens: 0,
            outputTokens: 0,
            thoughtTokens: 0,
            error: String(e.message).split(KEY).join('[KEY]').slice(0, 160),
          });
          throw e;
        }
      };
      return model;
    } as any;
  });

  afterAll(() => {
    GoogleGenerativeAI.prototype.getGenerativeModel = originalGet;
    const text = JSON.stringify(results);
    expect(text).not.toContain(KEY); // the key is nowhere in what we recorded
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  });

  const chosen = SCENARIOS.filter((s) => ONLY.length === 0 || ONLY.includes(s.id));
  const matrix = chosen.flatMap((scenario) => MODELS.map((model) => ({ scenario, model })));

  it.each(matrix)('$scenario.id × $model', async ({ scenario, model }) => {
    // BENCH_MODELS=default runs with NO override, i.e. on the code default.
    if (model === 'default') delete process.env['GEMINI_TEXT_MODEL'];
    else process.env['GEMINI_TEXT_MODEL'] = model;
    calls.length = 0;
    generateImageMock.mockClear();

    const started = Date.now();
    let success = false;
    let error: string | undefined;
    let output: any;
    try {
      output = await new GenerationPipeline().execute(structuredClone(scenario.input));
      success = output.success === true;
      if (!success)
        error = String(output.error?.message ?? output.error ?? 'pipeline reported failure').slice(
          0,
          200
        );
    } catch (e: any) {
      error = String(e.message).split(KEY).join('[KEY]').slice(0, 200);
    }
    const totalMs = Date.now() - started;

    const pack = output?.campaignPack;
    const texts = pack ? strings(pack.assets) : [];
    const truth = pack?.truthCheck;
    const ok = calls.filter((c) => !c.error);

    results.push({
      scenario: scenario.id,
      label: scenario.label,
      model,
      success,
      error,
      totalMs,
      textCalls: calls.length,
      failedCalls: calls.filter((c) => c.error).length,
      extraCalls: Math.max(0, calls.length - EXPECTED_TEXT_CALLS), // repairs + retries
      slowestCallMs: Math.max(0, ...calls.map((c) => c.ms)),
      promptTokens: ok.reduce((s, c) => s + c.promptTokens, 0),
      outputTokens: ok.reduce((s, c) => s + c.outputTokens, 0),
      thoughtTokens: ok.reduce((s, c) => s + c.thoughtTokens, 0),
      modelVersions: [...new Set(ok.map((c) => c.modelVersion).filter(Boolean))],
      truthCheck: truth
        ? {
            status: truth.status,
            details: (truth.checks || [])
              .filter((c: any) => c.status !== 'PASS')
              .map((c: any) => ({
                category: c.category,
                status: c.status,
                reason: String(c.reason ?? '').slice(0, 170),
              })),
            nonPass: (truth.checks || [])
              .filter((c: any) => c.status !== 'PASS')
              .map((c: any) => `${c.category}:${c.status}`),
          }
        : null,
      quality: analyse(texts, scenario),
      // Did the copy leak a language or region the owner never asked for?
      localeLeak: (() => {
        const all = texts.join('\n');
        const profile = (scenario.input as any).localizationProfile;
        return {
          ...languageLeaks(all, profile),
          regionWords: [
            ...new Set(
              (all.match(/hyderabad(?:i)?|telangana|telugu|kondapur|dum lagake/gi) ?? []).map((w) =>
                w.toLowerCase()
              )
            ),
          ],
        };
      })(),
      // Kept so the output can be READ, not just counted.
      sample: texts.filter((t) => t.trim().length > 12).slice(0, 14),
    });
    // A failed run is a RESULT, not a test failure: the benchmark must record it.
    expect(true).toBe(true);
  });
});
