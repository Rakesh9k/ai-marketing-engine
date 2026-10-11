/**
 * THE INVARIANT: unknown stays unknown. A sparse business goes through the whole real pipeline (every stage,
 * including the Creative Brain) with the model stubbed, and not one prompt sent to the model may contain a
 * fact the business never gave: a delivery radius, a minimum order, a phone number, a discount, a price it
 * does not have, an opening hour, or another city's / language's flavour.
 *
 * It exists because the same class of bug kept turning up in different places: a hard-coded ₹499, "Delivery
 * Radius 5km", "Special Price", deliveryRadiusKm 5 / minimumOrder 0 stored as facts, "Hyderabad" in prompts,
 * borrowed example angles. Each was an unknown filled in with a plausible default.
 *
 * Known to the pipeline here: business name, city, product name, and the offer price (the campaign endpoint
 * requires one). Unknown: discount / original price, delivery radius, minimum order, phone, opening hours,
 * validity dates, brand colours, logo.
 */
const generateStructuredTextMock = jest.fn().mockResolvedValue({});
jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: jest.fn(),
  generateImage: jest.fn().mockResolvedValue({
    success: true,
    imageUrl: 'https://provider.example.com/temp-hero.png',
    provider: 'openai',
    model: 'dall-e-3',
  }),
}));
jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest
    .fn()
    .mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest.fn().mockResolvedValue({
    url: 'https://storage.example.com/x.png',
    storagePath: 'businesses/b/campaigns/c/generated/x.png',
  }),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

const sparse = (over: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'Pune Cafe',
    businessCategory: 'restaurant',
    vertical: 'restaurant',
    businessLocation: { city: 'Pune', state: 'Maharashtra' },
    whatsappNumber: '',
    businessBrain: {
      identity: {
        name: 'Pune Cafe',
        category: 'restaurant',
        location: { city: 'Pune', state: 'Maharashtra' },
        contact: {},
      },
      // no deliveryRadiusKm, no minimumOrder, no opening hours, no operating mode
      businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
    } as never,
    brandProfile: {},
    objective: 'brand_awareness',
    productName: 'Filter Coffee',
    offerHeadline: 'Our filter coffee',
    offerPrice: 120,
    offerType: 'fixed',
    audience: { localities: ['Pune'] },
    // The campaign endpoint requires a duration, so it is known to the pipeline.
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    cta: 'order_whatsapp',
    localizationProfile: {
      country: 'India',
      state: 'Maharashtra',
      city: 'Pune',
      locality: 'Pune',
      primaryLanguage: 'en',
      secondaryLanguage: 'en',
      languageMixing: 'minimal',
      regionalStyle: 'neutral',
      slangPreference: 'none',
      audienceDescription: 'Local customers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    } as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

/** Each entry: something a prompt must never assert for this business, and why. */
const INVENTED: Array<[RegExp, string]> = [
  [/\b5\s?km\b|\b10\s?km\b|\b50\s?km\b/i, 'a delivery radius nobody gave'],
  [/deliveryRadiusKm"?\s*:\s*\d/i, 'a delivery radius nobody gave (as data)'],
  [/minimumOrder"?\s*:\s*\d/i, 'a minimum order nobody gave (as data)'],
  [/minimumOrderRequired"?\s*:/i, 'a minimum-order decision nobody made'],
  [/Min(?:imum)? Order\s*₹\s*\d/i, 'a minimum order amount nobody gave'],
  [/Special Price/i, 'a "special price" that does not exist'],
  [/₹\s?499\b/, 'the old invented price'],
  [/\b[6-9]\d{9}\b|\+91[\s-]?[6-9]\d{4}/, 'a phone number nobody gave'],
  [/dine-in\s*&\s*takeaway\s*&\s*delivery/i, 'service modes nobody listed'],
  [/hyderabad|telangana|telugu|kondapur|cheyyandi/i, "another city's or language's flavour"],
  [
    /₹\s?(?:0|NaN)\b|₹undefined|\bundefined\b|\bNaN\b/,
    'a broken or empty value printed as if it were a fact',
  ],
  [/\b\d{1,3}\s?%\s?off\b/i, 'a discount nobody gave'],
];

async function promptsFor(input: GenerationPipelineInput): Promise<string[]> {
  generateStructuredTextMock.mockClear();
  await new GenerationPipeline().execute(input);
  return generateStructuredTextMock.mock.calls.map((c) => String(c[0]));
}

const hits = (prompts: string[]) =>
  prompts.flatMap((p, i) =>
    INVENTED.flatMap(([re, why]) =>
      [
        ...p.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')),
      ].map((m) => {
        const at = m.index ?? 0;
        return `prompt #${i} [${p
          .split('\n')
          .find((l) => l.trim())
          ?.slice(
            0,
            40
          )}] ${why}: …${p.slice(Math.max(0, at - 45), at + 55).replace(/\s+/g, ' ')}…`;
      })
    )
  );

describe('unknown stays unknown: a sparse business through the whole pipeline', () => {
  it('no prompt asserts a fact the business never gave', async () => {
    const prompts = await promptsFor(sparse());
    expect(prompts.length).toBeGreaterThan(5);
    expect(hits(prompts)).toEqual([]);
  });

  it('a fact the owner DID give is passed through exactly (the guard is not blanket removal)', async () => {
    const prompts = await promptsFor(
      sparse({
        whatsappNumber: '+919822012345',
        businessBrain: {
          businessRules: {
            openingHours: {},
            deliveryRadiusKm: 7,
            minimumOrder: 250,
            offerValidityRules: '',
            pricingRules: '',
          },
        } as never,
      })
    );
    const all = prompts.join('\n');
    expect(all).toMatch(/\b7\b/);
    expect(all).toMatch(/9822012345/);
    expect(all).toMatch(/250/);
  });

  it('the same sparse business with no price at all never prints a broken price', async () => {
    const prompts = await promptsFor(sparse({ offerPrice: 0 as never }));
    const broken = prompts.flatMap((p, i) =>
      [...p.matchAll(/₹\s?(?:0|NaN)\b|₹undefined/g)].map((m) => {
        const at = m.index ?? 0;
        return `#${i} [${p
          .split('\n')
          .find((l) => l.trim())
          ?.slice(0, 40)}] …${p.slice(Math.max(0, at - 60), at + 30).replace(/\s+/g, ' ')}…`;
      })
    );
    expect(broken).toEqual([]);
  });
});
