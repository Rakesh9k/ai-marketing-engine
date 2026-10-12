/**
 * LIVE validation of the whole campaign pipeline, Creative Brain included, against the REAL Gemini model, on ten
 * synthetic businesses. OPT-IN: skipped unless LIVE_GEMINI=1 and CB_LIVE=1 and a real GEMINI_API_KEY are set, so it
 * never runs in CI and never spends anything by default.
 *
 *   LIVE_GEMINI=1 CB_LIVE=1 CB_LIVE_OUT=/path/results.json CB_LIVE_ONLY=sparse,yoga \
 *     npm --prefix functions run test -- src/services/ai/creativeBrain.live
 *
 * For every scenario it runs the REAL GenerationPipeline (real prompts, schemas, repair loop, Truth Check); only image
 * generation and storage are stubbed. It records: did the Creative Brain really succeed (or fall back, and why), the
 * Truth Check outcome, model-call counts and every schema-repair reason, per-stage timings, where each fact came
 * from, and scans EVERY prompt sent to the model and the final campaign text for things the business never said.
 * Synthetic data only. The API key is never printed.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'fs';

const promptSink = new AsyncLocalStorage<string[]>();
jest.mock('./index', () => {
  const actual = jest.requireActual('./index');
  return {
    ...actual,
    generateImage: jest.fn().mockResolvedValue({
      success: true,
      imageUrl: 'https://provider.example.com/temp-hero.png',
      provider: 'openai',
      model: 'dall-e-3',
    }),
    generateStructuredText: (prompt: string, schema: unknown, opts?: unknown) => {
      promptSink.getStore()?.push(String(prompt));
      return actual.generateStructuredText(prompt, schema, opts);
    },
  };
});
jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest
    .fn()
    .mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest.fn().mockImplementation(async (b: string, c: string, t: string) => ({
    url: `https://storage.example.com/${b}/${c}/${t}-${Math.random()}`,
    storagePath: `businesses/${b}/campaigns/${c}/generated/${t}.png`,
  })),
}));

import { installLiveBudgetOrThrow } from './liveBudget';
import { withMeterContext, installUsageMeter } from './usageMeter';
import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';
import { extractPresentedContactNumbers, mentionsHoursClaim } from './offerContract';

const live =
  process.env['LIVE_GEMINI'] === '1' &&
  process.env['CB_LIVE'] === '1' &&
  !!process.env['GEMINI_API_KEY'];
const describeLive = live ? describe : describe.skip;
const ONLY = (process.env['CB_LIVE_ONLY'] || '').split(',').filter(Boolean);

type Fact = { name: string; pattern: RegExp; expectInOutput?: boolean };
interface Scenario {
  id: string;
  label: string;
  input: GenerationPipelineInput;
  /** Facts the business gave: they must reach the prompts (PRESERVED); some must also reach the output. */
  known: Fact[];
  /** Facts the business did NOT give: they must be absent from every prompt and from the output. */
  unknown: Array<{ name: string; pattern: RegExp }>;
  /** Anything matching in a prompt or in the output is a leak for this business. */
  forbidden: Array<{ name: string; pattern: RegExp }>;
  /** Phone numbers on file; any other presented as contact is invented. */
  phonesOnFile: string[];
  hoursOnFile: boolean;
}

// ── shared patterns ────────────────────────────────────────────────────────────────────────────
const FOOD = /restaurant|biryani|\bdish(es)?\b|craving|dine-?in|takeaway|\bfoodie?s?\b|\bfood\b/i;
const TELUGU_PLACE = /telugu|telangana|hyderabad|kondapur|cheyyandi|[ఀ-౿]/i;
const DEVANAGARI = /[ऀ-ॿ]/;
const HINGLISH = /\b(hai|aapka|aap|kijiye|ke liye|mein|khaas|ekdum|jaldi|abhi|shaadi)\b/i;
const DISCOUNT = /\b\d{1,3}\s?%\s?off\b|\bflat\s+\d+\s?%|\bdiscount\b|\bsale\b/i;
const DELIVERY = /free delivery|home delivery|delivery within|\bdeliver(?:y|ed)?\b|\b\d+\s?km\b/i;
const PHONE_LIKE = /\b[6-9]\d{4}[\s-]?\d{5}\b/;
const HOURS =
  /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|open (?:daily|late|till|until)|business hours|timings?/i;

const baseLoc = (city: string, state: string, locality?: string) => ({
  country: 'India',
  state,
  city,
  ...(locality ? { locality } : {}),
});
const loc = (
  city: string,
  state: string,
  primaryLanguage: string,
  secondaryLanguage: string,
  regionalStyle: string,
  locality: string | undefined,
  audienceDescription: string
) => ({
  ...baseLoc(city, state, locality),
  primaryLanguage,
  secondaryLanguage,
  languageMixing: primaryLanguage.includes('_') ? 'natural' : 'minimal',
  regionalStyle,
  slangPreference: 'light',
  audienceDescription,
  brandTone: 'friendly',
  campaignStyle: 'funny',
  contentFormat: 'poster',
});
const window = { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T23:59:59.000Z' };

function business(over: Record<string, unknown>): GenerationPipelineInput {
  return {
    businessId: `live_${over['id']}`,
    campaignId: `live_c_${over['id']}`,
    brandProfile: {},
    objective: 'brand_awareness',
    offerType: 'fixed',
    cta: 'order_whatsapp',
    campaignStyle: 'funny',
    duration: window,
    ...over,
  } as unknown as GenerationPipelineInput;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'hyd-restaurant',
    label: '1. Hyderabad restaurant, Telugu + English, real product and price',
    phonesOnFile: ['9848012345'],
    hoursOnFile: false,
    input: business({
      id: 'hyd-restaurant',
      businessName: 'Charminar Kitchen',
      businessCategory: 'restaurant',
      vertical: 'restaurant',
      businessLocation: baseLoc('Hyderabad', 'Telangana', 'Kondapur'),
      whatsappNumber: '+919848012345',
      productName: 'Paneer Dum Biryani',
      offerHeadline: 'Paneer Dum Biryani',
      offerPrice: 299,
      offerOriginalPrice: 399,
      offerType: 'percentage',
      audience: { localities: ['Kondapur'] },
      localizationProfile: loc(
        'Hyderabad',
        'Telangana',
        'te_en',
        'te',
        'hyderabadi',
        'Kondapur',
        'Local vegetarian families'
      ),
      businessBrain: {
        identity: {
          name: 'Charminar Kitchen',
          category: 'restaurant',
          location: baseLoc('Hyderabad', 'Telangana', 'Kondapur'),
          contact: { whatsapp: '+919848012345', phone: '+919848012345' },
        },
        audience: { targetCustomer: 'Local vegetarian families', localities: ['Kondapur'] },
        positioning: { usp: 'Freshly prepared vegetarian dum biryani' },
        businessRules: {
          openingHours: {},
          deliveryRadiusKm: 5,
          minimumOrder: 199,
          offerValidityRules: '',
          pricingRules: '',
        },
      },
    }),
    known: [
      { name: 'price 299', pattern: /299/, expectInOutput: true },
      { name: 'original price 399', pattern: /399/ },
      { name: 'product', pattern: /Paneer Dum Biryani/i, expectInOutput: true },
      { name: 'city', pattern: /Hyderabad|Kondapur/i },
      { name: 'language te_en', pattern: /Telugu/i },
      { name: 'delivery radius 5 km', pattern: /\b5\s?km\b/i },
    ],
    unknown: [
      {
        name: 'offer validity window',
        pattern: /(?:valid|offer ends?|till|until)[^\n]{0,40}(?:10 Oct|15 Oct|2026-10-1[05])/i,
      },
    ],
    forbidden: [],
  },
  {
    id: 'mumbai-salon',
    label: '2. Mumbai salon, Hinglish, known services',
    phonesOnFile: ['9822012345'],
    hoursOnFile: false,
    input: business({
      id: 'mumbai-salon',
      businessName: 'Glow Studio',
      businessCategory: 'salon',
      vertical: 'salon',
      cta: 'book_appointment',
      businessLocation: baseLoc('Mumbai', 'Maharashtra', 'Bandra'),
      whatsappNumber: '+919822012345',
      productName: 'Haircut & Styling',
      offerHeadline: 'Haircut & Styling',
      offerPrice: 500,
      audience: { localities: ['Bandra'] },
      localizationProfile: loc(
        'Mumbai',
        'Maharashtra',
        'hi_en',
        'hi',
        'mumbai',
        'Bandra',
        'Working professionals'
      ),
      businessBrain: {
        identity: {
          name: 'Glow Studio',
          category: 'salon',
          location: baseLoc('Mumbai', 'Maharashtra', 'Bandra'),
          contact: { whatsapp: '+919822012345', phone: '+919822012345' },
        },
        audience: { targetCustomer: 'Working professionals', localities: ['Bandra'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
        verticalProfile: {
          vertical: 'salon',
          services: [
            { id: 's1', name: 'Haircut & Styling', category: 'hair', price: 500, active: true },
          ],
          packages: [],
          appointmentSettings: { acceptInquiries: true, preferredBookingChannel: 'whatsapp' },
        },
      },
    }),
    known: [
      { name: 'price 500', pattern: /500/, expectInOutput: true },
      { name: 'service', pattern: /Haircut/i, expectInOutput: true },
      { name: 'city', pattern: /Mumbai|Bandra/i },
    ],
    unknown: [
      {
        name: 'unlisted treatment',
        pattern: /keratin|rebonding|botox|bridal makeup|facial|spa\b|hair colou?r|smoothening/i,
      },
    ],
    forbidden: [
      { name: 'Hyderabad/Telugu leakage', pattern: TELUGU_PLACE },
      { name: 'food vocabulary', pattern: FOOD },
    ],
  },
  {
    id: 'realestate',
    label: '3. Real estate, known listing facts, unknown possession date',
    phonesOnFile: ['9890012345'],
    hoursOnFile: false,
    input: business({
      id: 'realestate',
      businessName: 'Skyline Homes',
      businessCategory: 'real_estate',
      vertical: 'real_estate',
      cta: 'call_now',
      businessLocation: baseLoc('Pune', 'Maharashtra', 'Hinjewadi'),
      whatsappNumber: '+919890012345',
      productName: 'Skyline 2BHK',
      offerHeadline: 'Skyline 2BHK',
      offerPrice: 6500000,
      audience: { localities: ['Hinjewadi'] },
      localizationProfile: loc(
        'Pune',
        'Maharashtra',
        'en',
        'en',
        'neutral',
        'Hinjewadi',
        'First-time home buyers'
      ),
      businessBrain: {
        identity: {
          name: 'Skyline Homes',
          category: 'real_estate',
          location: baseLoc('Pune', 'Maharashtra', 'Hinjewadi'),
          contact: { whatsapp: '+919890012345', phone: '+919890012345' },
        },
        audience: { targetCustomer: 'First-time home buyers', localities: ['Hinjewadi'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
        verticalProfile: {
          vertical: 'real_estate',
          properties: [
            {
              id: 'p1',
              title: 'Skyline 2BHK',
              propertyType: 'apartment',
              areaSqft: 1050,
              bedrooms: 2,
              price: 6500000,
              possessionStatus: 'under_construction',
              amenities: [],
              availability: 'available',
              active: true,
            },
          ],
        },
      },
    }),
    known: [
      { name: 'listing', pattern: /Skyline 2BHK|2\s?BHK/i, expectInOutput: true },
      { name: 'area 1050 sqft', pattern: /1,?050/ },
      { name: 'price 65 lakh', pattern: /65\s?(?:lakh|lac|L)|6,?500,?000|65,00,000/i },
    ],
    unknown: [
      {
        name: 'possession date',
        pattern:
          /possession\s+(?:in|by|from|on|date)\s+[^\n]{0,20}(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d\d)/i,
      },
      { name: 'ready to move', pattern: /ready[\s-]to[\s-]move|immediate possession/i },
      {
        name: 'unlisted amenities',
        pattern: /swimming pool|clubhouse|\bgym\b|garden|jogging track|power backup|lift|parking/i,
      },
    ],
    forbidden: [
      { name: 'Hyderabad/Telugu leakage', pattern: TELUGU_PLACE },
      { name: 'food vocabulary', pattern: FOOD },
    ],
  },
  {
    id: 'yoga',
    label: '4. Yoga studio (general vertical)',
    phonesOnFile: [],
    hoursOnFile: false,
    input: business({
      id: 'yoga',
      businessName: 'Calm Yoga',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: baseLoc('Pune', 'Maharashtra'),
      whatsappNumber: '',
      productName: 'Beginner Yoga Course',
      offerHeadline: 'Beginner Yoga Course',
      offerPrice: 2000,
      audience: { localities: ['Pune'] },
      localizationProfile: loc(
        'Pune',
        'Maharashtra',
        'en',
        'en',
        'neutral',
        undefined,
        'Working professionals'
      ),
      businessBrain: {
        identity: {
          name: 'Calm Yoga',
          category: 'general',
          industry: 'fitness',
          subcategory: 'yoga',
          location: baseLoc('Pune', 'Maharashtra'),
          contact: {},
        },
        audience: { targetCustomer: 'Working professionals', localities: ['Pune'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
      },
    }),
    known: [
      { name: 'price 2000', pattern: /2,?000/, expectInOutput: true },
      { name: 'product', pattern: /Yoga/i, expectInOutput: true },
    ],
    unknown: [
      { name: 'phone number', pattern: PHONE_LIKE },
      { name: 'discount', pattern: DISCOUNT },
    ],
    forbidden: [
      { name: 'restaurant / food vocabulary', pattern: FOOD },
      { name: 'Hyderabad/Telugu leakage', pattern: TELUGU_PLACE },
    ],
  },
  {
    id: 'pottery',
    label: '5. Pottery studio (general vertical)',
    phonesOnFile: [],
    hoursOnFile: false,
    input: business({
      id: 'pottery',
      businessName: 'Clay & Co',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: baseLoc('Jaipur', 'Rajasthan'),
      whatsappNumber: '',
      productName: 'Weekend Pottery Workshop',
      offerHeadline: 'Weekend Pottery Workshop',
      offerPrice: 1500,
      audience: { localities: ['Jaipur'] },
      localizationProfile: loc(
        'Jaipur',
        'Rajasthan',
        'en',
        'en',
        'neutral',
        undefined,
        'Creative hobbyists'
      ),
      businessBrain: {
        identity: {
          name: 'Clay & Co',
          category: 'general',
          industry: 'education',
          subcategory: 'crafts',
          location: baseLoc('Jaipur', 'Rajasthan'),
          contact: {},
        },
        audience: { targetCustomer: 'Creative hobbyists', localities: ['Jaipur'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
      },
    }),
    known: [
      { name: 'price 1500', pattern: /1,?500/, expectInOutput: true },
      { name: 'product', pattern: /Pottery/i, expectInOutput: true },
    ],
    unknown: [
      { name: 'phone number', pattern: PHONE_LIKE },
      { name: 'discount', pattern: DISCOUNT },
    ],
    forbidden: [
      { name: 'restaurant / food vocabulary', pattern: FOOD },
      { name: 'Hyderabad/Telugu leakage', pattern: TELUGU_PLACE },
    ],
  },
  {
    id: 'sparse',
    label:
      "6. Sparse business: name, city, vertical, one offering (price is the campaign endpoint's one required fact)",
    phonesOnFile: [],
    hoursOnFile: false,
    input: business({
      id: 'sparse',
      businessName: 'Known Cafe',
      businessCategory: 'restaurant',
      vertical: 'restaurant',
      businessLocation: baseLoc('Mumbai', 'Maharashtra'),
      whatsappNumber: '',
      productName: 'Paneer Biryani',
      offerHeadline: 'Paneer Biryani',
      offerPrice: 220,
      audience: { localities: ['Mumbai'] },
      localizationProfile: loc(
        'Mumbai',
        'Maharashtra',
        'en',
        'en',
        'neutral',
        undefined,
        'Local customers in Mumbai'
      ),
      businessBrain: {
        identity: {
          name: 'Known Cafe',
          category: 'restaurant',
          location: baseLoc('Mumbai', 'Maharashtra'),
          contact: {},
        },
        audience: { targetCustomer: '', ageRange: { min: 18, max: 65 }, localities: ['Mumbai'] },
        brand: { tone: 'friendly', colors: { primary: '#E84D1A' }, fonts: { heading: 'Poppins' } },
        localization: {
          primaryLanguage: 'en',
          secondaryLanguage: 'en',
          regionalStyle: 'neutral',
          slangIntensity: 'moderate',
          languageMixing: 'minimal',
        },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
        knowledge: {
          origin: 'conversational_onboarding',
          confirmedAt: 'x',
          facts: {
            'brand.tone': { source: 'SYSTEM_DEFAULT' },
            'brand.colors': { source: 'SYSTEM_DEFAULT' },
            'brand.fonts': { source: 'SYSTEM_DEFAULT' },
            'localization.primaryLanguage': { source: 'SYSTEM_DEFAULT' },
            'localization.regionalStyle': { source: 'SYSTEM_DEFAULT' },
            'audience.ageRange': { source: 'SYSTEM_DEFAULT' },
          },
        },
      },
    }),
    known: [
      { name: 'price 220', pattern: /220/, expectInOutput: true },
      { name: 'product', pattern: /Paneer Biryani/i, expectInOutput: true },
    ],
    unknown: [
      { name: 'discount / original price', pattern: DISCOUNT },
      { name: 'delivery claim', pattern: DELIVERY },
      { name: 'phone number', pattern: PHONE_LIKE },
      { name: 'opening hours', pattern: HOURS },
      { name: 'age range placeholder', pattern: /\b18\s?(?:-|–|to)\s?65\b/ },
      {
        name: 'offer validity window',
        pattern: /(?:valid|offer ends?|till|until)[^\n]{0,40}(?:10 Oct|15 Oct|2026-10-1[05])/i,
      },
    ],
    forbidden: [{ name: 'Hyderabad/Telugu leakage', pattern: TELUGU_PLACE }],
  },
  {
    id: 'rich',
    label:
      '7. Rich business: every fact given (Bengaluru restaurant, English, delivery, offer dates)',
    phonesOnFile: ['9845012345'],
    hoursOnFile: true,
    input: business({
      id: 'rich',
      businessName: 'Lalbagh Meals',
      businessCategory: 'restaurant',
      vertical: 'restaurant',
      businessLocation: baseLoc('Bengaluru', 'Karnataka', 'Jayanagar'),
      whatsappNumber: '+919845012345',
      productName: 'Veg Thali',
      offerHeadline: 'Veg Thali',
      offerPrice: 349,
      offerOriginalPrice: 449,
      offerType: 'percentage',
      offerValidityStart: '2026-10-12T00:00:00.000Z',
      offerValidityEnd: '2026-10-13T23:59:59.000Z',
      offerValiditySource: 'owner_dates',
      audience: { localities: ['Jayanagar'] },
      localizationProfile: loc(
        'Bengaluru',
        'Karnataka',
        'en',
        'en',
        'bangalore',
        'Jayanagar',
        'Office-goers and families'
      ),
      businessBrain: {
        identity: {
          name: 'Lalbagh Meals',
          category: 'restaurant',
          location: baseLoc('Bengaluru', 'Karnataka', 'Jayanagar'),
          contact: { whatsapp: '+919845012345', phone: '+919845012345' },
        },
        audience: { targetCustomer: 'Office-goers and families', localities: ['Jayanagar'] },
        positioning: { usp: 'Home-style meals cooked fresh every morning' },
        businessRules: {
          openingHours: { mon: { open: '11:00', close: '22:00' } },
          deliveryRadiusKm: 4,
          minimumOrder: 250,
          operatingMode: 'delivery',
          offerValidityRules: '',
          pricingRules: '',
        },
      },
    }),
    known: [
      { name: 'price 349', pattern: /349/, expectInOutput: true },
      { name: 'original price 449', pattern: /449/ },
      { name: 'offer dates', pattern: /2026-10-12|12 Oct/i },
      { name: 'delivery radius 4 km', pattern: /\b4\s?km\b/i },
      { name: 'minimum order 250', pattern: /250/ },
      { name: 'product', pattern: /Veg Thali/i, expectInOutput: true },
    ],
    unknown: [],
    forbidden: [{ name: 'Hyderabad/Telugu leakage', pattern: TELUGU_PLACE }],
  },
  {
    id: 'english-only',
    label: '8. English-only business (Delhi boutique)',
    phonesOnFile: [],
    hoursOnFile: false,
    input: business({
      id: 'english-only',
      businessName: 'Threads Boutique',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: baseLoc('New Delhi', 'Delhi', 'Hauz Khas'),
      whatsappNumber: '',
      productName: 'Handloom Kurta',
      offerHeadline: 'Handloom Kurta',
      offerPrice: 1800,
      audience: { localities: ['Hauz Khas'] },
      localizationProfile: loc(
        'New Delhi',
        'Delhi',
        'en',
        'en',
        'neutral',
        'Hauz Khas',
        'Fashion-conscious shoppers'
      ),
      businessBrain: {
        identity: {
          name: 'Threads Boutique',
          category: 'general',
          industry: 'retail',
          subcategory: 'boutique',
          location: baseLoc('New Delhi', 'Delhi', 'Hauz Khas'),
          contact: {},
        },
        audience: { targetCustomer: 'Fashion-conscious shoppers', localities: ['Hauz Khas'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
      },
    }),
    known: [
      { name: 'price 1800', pattern: /1,?800/, expectInOutput: true },
      { name: 'product', pattern: /Kurta/i, expectInOutput: true },
    ],
    unknown: [{ name: 'discount', pattern: DISCOUNT }],
    forbidden: [
      { name: 'Telugu/Hyderabad', pattern: TELUGU_PLACE },
      { name: 'Hindi script', pattern: DEVANAGARI },
      { name: 'Hinglish', pattern: HINGLISH },
      { name: 'food vocabulary', pattern: FOOD },
    ],
  },
  {
    id: 'hindi',
    label: '9. Hindi business (Delhi coaching class, pure Hindi)',
    phonesOnFile: [],
    hoursOnFile: false,
    input: business({
      id: 'hindi',
      businessName: 'Gyan Coaching',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: baseLoc('New Delhi', 'Delhi', 'Laxmi Nagar'),
      whatsappNumber: '',
      productName: 'Class 10 Maths Batch',
      offerHeadline: 'Class 10 Maths Batch',
      offerPrice: 3000,
      audience: { localities: ['Laxmi Nagar'] },
      localizationProfile: loc(
        'New Delhi',
        'Delhi',
        'hi',
        'en',
        'delhi',
        'Laxmi Nagar',
        'Students and parents'
      ),
      businessBrain: {
        identity: {
          name: 'Gyan Coaching',
          category: 'general',
          industry: 'education',
          subcategory: 'coaching',
          location: baseLoc('New Delhi', 'Delhi', 'Laxmi Nagar'),
          contact: {},
        },
        audience: { targetCustomer: 'Students and parents', localities: ['Laxmi Nagar'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
      },
    }),
    known: [{ name: 'price 3000', pattern: /3,?000/, expectInOutput: true }],
    unknown: [{ name: 'discount', pattern: DISCOUNT }],
    forbidden: [
      { name: 'Telugu/Hyderabad', pattern: TELUGU_PLACE },
      { name: 'food vocabulary', pattern: FOOD },
    ],
  },
  {
    id: 'hyd-telugu-boutique',
    label: '10. Hyderabad Telugu + English business (boutique)',
    phonesOnFile: ['9866012345'],
    hoursOnFile: false,
    input: business({
      id: 'hyd-telugu-boutique',
      businessName: 'Pochampally Looms',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: baseLoc('Hyderabad', 'Telangana', 'Banjara Hills'),
      whatsappNumber: '+919866012345',
      productName: 'Pochampally Silk Saree',
      offerHeadline: 'Pochampally Silk Saree',
      offerPrice: 4500,
      audience: { localities: ['Banjara Hills'] },
      localizationProfile: loc(
        'Hyderabad',
        'Telangana',
        'te_en',
        'te',
        'hyderabadi',
        'Banjara Hills',
        'Saree lovers'
      ),
      businessBrain: {
        identity: {
          name: 'Pochampally Looms',
          category: 'general',
          industry: 'retail',
          subcategory: 'boutique',
          location: baseLoc('Hyderabad', 'Telangana', 'Banjara Hills'),
          contact: { whatsapp: '+919866012345', phone: '+919866012345' },
        },
        audience: { targetCustomer: 'Saree lovers', localities: ['Banjara Hills'] },
        businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
      },
    }),
    known: [
      { name: 'price 4500', pattern: /4,?500/, expectInOutput: true },
      { name: 'product', pattern: /Saree/i, expectInOutput: true },
      { name: 'language te_en', pattern: /Telugu/i },
      { name: 'city', pattern: /Hyderabad|Banjara/i },
    ],
    unknown: [{ name: 'discount', pattern: DISCOUNT }],
    forbidden: [
      { name: 'Hindi script', pattern: DEVANAGARI },
      { name: 'food vocabulary', pattern: FOOD },
    ],
  },
];

function scan(text: string, p: RegExp): string | null {
  const m = text.match(new RegExp(p.source, p.flags.replace('g', '')));
  return m
    ? text.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + 70).replace(/\s+/g, ' ')
    : null;
}

async function runScenario(sc: Scenario) {
  const prompts: string[] = [];
  const started = Date.now();
  let result: any;
  let error: string | undefined;
  try {
    result = await promptSink.run(prompts, () => new GenerationPipeline().execute(sc.input));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const allPrompts = prompts.join('\n=====\n');
  const pack = result?.campaignPack ?? {};
  const { metadata, ...visible } = pack;
  const output = JSON.stringify(visible);
  // The visible copy: every asset that is not an image prompt or a visual spec (aspect ratios like 9:16 are not opening hours).
  const copyText = Array.isArray(visible.assets)
    ? JSON.stringify(
        visible.assets
          .filter((a: { type?: string }) => !/image|prompt|visual|template/i.test(a.type ?? ''))
          .map((a: { content?: unknown }) => a.content)
      )
    : output;
  const meta = metadata ?? {};

  const findings: string[] = [];
  const trace = {
    known: sc.known.map((f) => ({
      fact: f.name,
      inPrompts: f.pattern.test(allPrompts),
      inOutput: f.pattern.test(output),
      class: f.pattern.test(allPrompts) ? 'PRESERVED' : 'LOST',
    })),
    unknown: sc.unknown.map((u) => {
      // Prompts carry guard text ("never state a discount") that names what must not be said; only facts that would be
      // INPUT (a phone, the age placeholder, an offer window) are scanned in prompts. Claims are scanned in the copy.
      const promptScoped = /phone|age range|validity/i.test(u.name);
      const inPrompt = promptScoped ? scan(allPrompts, u.pattern) : null;
      const inOutput = scan(copyText, u.pattern);
      return {
        fact: u.name,
        class: inPrompt || inOutput ? 'INVENTED' : 'UNKNOWN',
        inPrompt,
        inOutput,
      };
    }),
  };
  for (const k of trace.known) {
    if (k.class === 'LOST') findings.push(`LOST: ${k.fact}`);
    const f = sc.known.find((x) => x.name === k.fact)!;
    if (f.expectInOutput && !k.inOutput) findings.push(`not in output: ${k.fact}`);
  }
  for (const u of trace.unknown)
    if (u.class === 'INVENTED') findings.push(`INVENTED: ${u.fact} (${u.inPrompt ?? u.inOutput})`);
  for (const f of sc.forbidden) {
    const inP = scan(allPrompts, f.pattern);
    const inO = scan(output, f.pattern);
    if (inP) findings.push(`LEAK in prompt: ${f.name} …${inP}…`);
    if (inO) findings.push(`LEAK in output: ${f.name} …${inO}…`);
  }
  const phones = extractPresentedContactNumbers(copyText);
  for (const p of phones) if (!sc.phonesOnFile.includes(p)) findings.push(`INVENTED phone: ${p}`);
  if (!sc.hoursOnFile && mentionsHoursClaim(copyText))
    findings.push(
      `INVENTED opening-hours claim in copy: …${scan(copyText, /\b\d{1,2}[:.]\d{2}\b|open(?:s|ing)? \w+|business hours|timings?/i)}…`
    );

  const calls = (meta.aiCalls ?? []) as Array<{
    stage: string;
    repair: boolean;
    ok: boolean;
    problem?: string;
    model: string;
    ms: number;
  }>;
  return {
    id: sc.id,
    label: sc.label,
    error,
    totalMs: Date.now() - started,
    creativeBrain: meta.creativeBrain,
    truthCheck: result?.stages?.truthCheck
      ? {
          status: result.stages.truthCheck.status ?? result.stages.truthCheck.overallStatus,
          nonPass: (result.stages.truthCheck.checks ?? [])
            .filter((d: any) => d.status !== 'PASS')
            .map(
              (d: any) =>
                `${d.category}: ${d.status}${d.basis ? ' (' + d.basis + ')' : ''} - ${d.reason ?? ''}`
            ),
        }
      : undefined,
    models: [...new Set(calls.map((c) => c.model))],
    aiCallSummary: meta.aiCallSummary,
    repairs: calls
      .filter((c) => !c.ok)
      .map((c) => ({ stage: c.stage, attempt: c.repair, problem: c.problem })),
    stageTimingsMs: meta.stageTimingsMs,
    factSources: (meta.factSources ?? []).map((s: any) => `${s.fact}=${s.value} [${s.provenance}]`),
    trace,
    findings,
    scriptShare: {
      devanagari: +(
        (copyText.match(/[\u0900-\u097F]/g) ?? []).length / Math.max(1, copyText.length)
      ).toFixed(3),
      telugu: +(
        (copyText.match(/[\u0C00-\u0C7F]/g) ?? []).length / Math.max(1, copyText.length)
      ).toFixed(3),
    },
    campaignCopyChars: copyText.length,
  };
}

describeLive('Creative Brain + pipeline — LIVE, ten businesses', () => {
  jest.setTimeout(1_500_000);

  it('runs every scenario against the real model and scans for fabrication and leakage', async () => {
    // Hard spend cap: refuses to start without an explicit LIVE_BUDGET_INR and pinned, priced models.
    const meter = installLiveBudgetOrThrow();
    const chosen = SCENARIOS.filter((s) => ONLY.length === 0 || ONLY.includes(s.id));
    const results: Awaited<ReturnType<typeof runScenario>>[] = [];
    const queue = [...chosen];
    const worker = async () => {
      for (let sc = queue.shift(); sc && !meter.stopped; sc = queue.shift()) {
        const scenario = sc;
        results.push(
          await withMeterContext({ scenario: scenario.id }, () => runScenario(scenario))
        );
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    // eslint-disable-next-line no-console
    console.log('LIVE SPEND REPORT', JSON.stringify(meter.summary(), null, 1));
    installUsageMeter(null);
    expect({ stopped: meter.stopped, overruns: meter.overruns }).toEqual({
      stopped: null,
      overruns: [],
    });
    results.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    if (process.env['CB_LIVE_OUT'])
      fs.writeFileSync(process.env['CB_LIVE_OUT'], JSON.stringify(results, null, 1));

    // The headline numbers are always printed; failures are listed per scenario.
    // eslint-disable-next-line no-console
    console.log(
      results
        .map(
          (r) =>
            `${r.label}\n  CB=${r.creativeBrain?.status}${r.creativeBrain?.reason ? '(' + r.creativeBrain.reason + ')' : ''} truth=${r.truthCheck?.status} calls=${r.aiCallSummary?.total} repairs=${r.aiCallSummary?.repairs} ${Math.round(r.totalMs / 1000)}s\n  findings: ${r.findings.length ? r.findings.join(' | ') : 'none'}`
        )
        .join('\n')
    );
    for (const r of results) {
      expect({ id: r.id, error: r.error }).toEqual({ id: r.id, error: undefined });
      expect({ id: r.id, creativeBrain: r.creativeBrain?.status }).toEqual({
        id: r.id,
        creativeBrain: 'success',
      });
    }
  });
});
