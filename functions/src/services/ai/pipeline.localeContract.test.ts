/**
 * Regression for the Telugu leak. A trace of a Mumbai / Hinglish salon, with the owner's localisation correct
 * at the pipeline's entry, showed Hyderabad and Telugu injected by the pipeline's own prompts: the
 * localisation stage ("You are a Hyderabadi localization expert … Telugu-English", Telugu CTAs, "Kondapur
 * techies"), the product prompt's example angles, the strategy prompt ("regional insights for Hyderabad") and
 * the quality prompt's hashtag hint. The model was told to write Hyderabadi Telugu-English whoever the owner was.
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

const TELUGU_OR_HYDERABAD =
  /telugu|hyderabad|telangana|kondapur|cheyyandi|\bmadi\b|lo undi|dum lagake|\baao\b/i;

type Locale = Record<string, string>;
const locale = (over: Locale): Locale => ({
  country: 'India',
  slangPreference: 'light',
  audienceDescription: 'Local customers',
  brandTone: 'friendly',
  campaignStyle: 'funny',
  contentFormat: 'poster',
  ...over,
});

const MUMBAI = locale({
  state: 'Maharashtra',
  city: 'Mumbai',
  locality: 'Bandra',
  primaryLanguage: 'hi_en',
  secondaryLanguage: 'hi',
  languageMixing: 'natural',
  regionalStyle: 'mumbai',
});
const PUNE_ENGLISH = locale({
  state: 'Maharashtra',
  city: 'Pune',
  locality: 'Kothrud',
  primaryLanguage: 'en',
  secondaryLanguage: 'en',
  languageMixing: 'minimal',
  regionalStyle: 'neutral',
});
const HYDERABAD = locale({
  state: 'Telangana',
  city: 'Hyderabad',
  locality: 'Kondapur',
  primaryLanguage: 'te_en',
  secondaryLanguage: 'te',
  languageMixing: 'natural',
  regionalStyle: 'hyderabadi',
});

const input = (
  profile: Locale,
  over: Partial<GenerationPipelineInput> = {}
): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'Glow Beauty Parlour',
    businessCategory: 'salon',
    vertical: 'salon',
    businessLocation: {
      city: profile['city'],
      state: profile['state'],
      locality: profile['locality'],
    },
    whatsappNumber: '+919822012345',
    businessBrain: {} as never,
    brandProfile: {},
    objective: 'service_promotion',
    productName: 'Facial',
    offerHeadline: 'Glow Facial',
    offerPrice: 799,
    offerType: 'fixed',
    offerValidityStart: '2026-10-10T00:00:00.000Z',
    offerValidityEnd: '2026-10-15T00:00:00.000Z',
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    audience: { localities: [profile['locality']] },
    cta: 'order_whatsapp',
    localizationProfile: profile as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

async function promptsFor(
  profile: Locale,
  over: Partial<GenerationPipelineInput> = {}
): Promise<string[]> {
  generateStructuredTextMock.mockClear();
  await new GenerationPipeline().execute(input(profile, over));
  return generateStructuredTextMock.mock.calls.map((c) => String(c[0]));
}

const leaks = (prompts: string[]) =>
  prompts.flatMap((p, i) =>
    [...p.matchAll(new RegExp(TELUGU_OR_HYDERABAD, 'gi'))].map(
      (m) =>
        `#${i}: …${p.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + 50).replace(/\s+/g, ' ')}…`
    )
  );

describe("the owner's language and region reach the model unchanged", () => {
  it('a Mumbai / Hinglish business: no prompt mentions Telugu, Hyderabad or Kondapur', async () => {
    const prompts = await promptsFor(MUMBAI);
    expect(prompts.length).toBeGreaterThan(5);
    expect(leaks(prompts)).toEqual([]);
  });

  it('the localisation stage is written for Hinglish and for Bandra, Mumbai', async () => {
    const stage = (await promptsFor(MUMBAI)).find((p) => p.includes('localization rules'))!;
    expect(stage).toMatch(/Hinglish/);
    expect(stage).toMatch(/Bandra, Mumbai/);
    expect(stage).toMatch(/Write ONLY in Hindi and English/);
  });

  it('an English-only business gets no Telugu or Hindi persona and no Hyderabad', async () => {
    const prompts = await promptsFor(PUNE_ENGLISH);
    expect(leaks(prompts)).toEqual([]);
    const stage = prompts.find((p) => p.includes('localization rules'))!;
    expect(stage).toMatch(/Write ONLY in English/);
    expect(stage).not.toMatch(/hindi|karo|karein/i);
  });

  it("the strategy and quality prompts name the business's own place, not a fixed city", async () => {
    const prompts = await promptsFor(MUMBAI);
    expect(prompts.some((p) => p.includes('Uses regional insights for Bandra, Mumbai'))).toBe(true);
    expect(prompts.some((p) => /HASHTAGS: Relevant \(Mumbai,/.test(p))).toBe(true);
  });

  it('a stale secondary language on an English business never reaches the copywriter', async () => {
    // Legacy records carry secondaryLanguage "te" next to primaryLanguage "en". The owner asked for English.
    const stale = { ...PUNE_ENGLISH, secondaryLanguage: 'te' };
    const copy = (await promptsFor(stale)).find((p) => p.includes('1. 5 HEADLINES'))!;
    expect(copy).toMatch(/^- Language: English$/m);
    expect(copy).not.toMatch(/Language: en \+ te/);
    expect(copy).toMatch(/Write ONLY in English/);
  });

  it("the copywriter is told Hinglish, with the owner's mixing level, for a Hinglish business", async () => {
    const copy = (await promptsFor(MUMBAI)).find((p) => p.includes('1. 5 HEADLINES'))!;
    expect(copy).toMatch(
      /^- Language: Hinglish \(Hindi and English mixed naturally\) with natural mixing$/m
    );
  });

  it('a Hyderabad Telugu+English business still gets its Telugu / Hyderabadi flavour (it asked for it)', async () => {
    const stage = (await promptsFor(HYDERABAD)).find((p) => p.includes('localization rules'))!;
    expect(stage).toMatch(/Telugu/);
    expect(stage).toMatch(/Hyderabad/);
    expect(stage).toMatch(/cheyyandi/i);
  });

  it('the product prompt offers no borrowed example angles (they came from a Hyderabad restaurant)', async () => {
    const product = (await promptsFor(MUMBAI)).find((p) => p.includes('marketingAngles'))!;
    expect(product).not.toMatch(/hyderabadi|dum process|late-night/i);
  });
});
