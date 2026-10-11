/**
 * Pass 2C — 12-scenario campaign matrix, MOCK MODE (no live AI, no network, no billing).
 *
 * What this CAN prove: with the model stubbed, the REAL pipeline + REAL deterministic Truth Check behave
 * according to contract — grounding in the prompts, verdicts on honest vs. violating copy, output artefacts,
 * failure handling. What it CANNOT prove: that a live model writes good, specific, persuasive copy or images.
 * Those dimensions are recorded as NOT_TESTED, never as passing.
 *
 * Each copy variant has a HARD contract (violating copy must never get a clean PASS; honest copy must never
 * FAIL) and an IDEAL (the verdict we would want). Hard contract broken => FAIL; ideal missed => REVIEW; both
 * met => PASS. Verdicts are written to MATRIX_OUT (JSON) when that env var is set. Assertions pin CURRENT
 * behaviour so a regression or an improvement is noticed; they do not hide a gap — gaps are in the report.
 */
const gst = jest.fn();
const genImage = jest.fn();
jest.mock('./index', () => ({
  generateStructuredText: (...a: unknown[]) => gst(...a),
  analyzeProductImages: jest.fn(),
  generateImage: (...a: unknown[]) => genImage(...a),
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

import { writeFileSync } from 'fs';
import { validateOffer } from '../../utils/offerValidation';
import { GenerationPipeline, CopyPackSchema, type GenerationPipelineInput } from './pipeline';

type Verdict = 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_TESTED';
type TruthStatus = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
interface Row {
  scenario: string;
  dimension: string;
  check: string;
  verdict: Verdict;
  evidence: string;
}
const rows: Row[] = [];
const record = (
  scenario: string,
  dimension: string,
  check: string,
  verdict: Verdict,
  evidence: string
) => rows.push({ scenario, dimension, check, verdict, evidence });

// ---------------------------------------------------------------- fixtures
function copyPack(headlines: string[], body: string, cta = 'Order on WhatsApp', wa = '') {
  const h = (i: number) => headlines[i % headlines.length]!;
  return {
    headlines: [0, 1, 2, 3, 4].map((i) => ({
      text: h(i),
      characterCount: h(i).length,
      variant: `v${i}`,
    })),
    adCopies: [0, 1, 2, 3, 4].map((i) => ({
      primaryText: body,
      headline: h(i),
      description: body,
      cta,
    })),
    captions: [0, 1, 2, 3, 4].map(() => ({
      text: body,
      hashtags: ['#local'],
      characterCount: body.length,
    })),
    storyConcepts: [0, 1, 2].map(() => ({
      frames: [
        { copy: h(0), visualCue: 'product close-up' },
        { copy: body, visualCue: 'logo', cta },
      ],
      overallTheme: 'offer',
    })),
    reelConcepts: [0, 1, 2].map(() => ({
      hook: h(0),
      scenes: [{ description: body, visualDirection: 'close', duration: '3s' }],
      productReveal: h(1),
      cta,
      caption: body,
      shootingTips: 'natural light',
    })),
    whatsappMessage: {
      message: body,
      waLink: wa,
      attributionParams: { campaignId: 'c1', creativeId: 'cr1', source: 'poster' },
    },
    ctaVariations: [0, 1, 2, 3, 4].map((i) => ({ text: cta, variant: `c${i}` })),
  };
}
type Copy = ReturnType<typeof copyPack>;

const base = (o: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'Kondapur Biryani House',
    businessCategory: 'restaurant',
    vertical: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '+919876543210',
    businessBrain: {} as never,
    brandProfile: {},
    objective: 'weekend_offer',
    productName: 'Chicken Dum Biryani',
    offerHeadline: 'Weekend Special',
    offerPrice: 299,
    offerType: 'fixed',
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {} as never,
    campaignStyle: 'urgent',
    ...o,
  }) as GenerationPipelineInput;

const salon = (o: Partial<GenerationPipelineInput> = {}) =>
  base({
    businessName: 'Glow Studio',
    businessCategory: 'salon',
    vertical: 'salon',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
    audience: { localities: ['Banjara Hills'] },
    productName: 'Keratin Treatment',
    offerHeadline: 'Keratin Treatment offer',
    offerPrice: 2499,
    offerOriginalPrice: 3499,
    offerType: 'percentage',
    cta: 'book_appointment',
    businessBrain: {
      verticalProfile: { services: [{ name: 'Keratin Treatment' }, { name: 'Haircut' }] },
    } as never,
    ...o,
  });

const realEstate = (o: Partial<GenerationPipelineInput> = {}) =>
  base({
    businessName: 'Green Meadows Realty',
    businessCategory: 'real_estate',
    vertical: 'real_estate',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Gachibowli' },
    audience: { localities: ['Gachibowli'] },
    productName: '3BHK in Green Meadows',
    offerHeadline: '3BHK ready to move',
    offerPrice: 6500000,
    offerType: 'fixed',
    cta: 'call_now',
    businessBrain: {
      verticalProfile: {
        properties: [
          { title: '3BHK in Green Meadows', bedrooms: 3, possessionStatus: 'ready_to_move' },
        ],
      },
    } as never,
    ...o,
  });

// ---------------------------------------------------------------- runner
interface RunResult {
  truth?: TruthStatus;
  checks: Array<{ category: string; status: string; basis?: string; reason?: string }>;
  prompts: string[];
  assets: Array<{ type: string; status: string; hasImage: boolean }>;
  threw?: string;
  packStatus?: string;
}
async function run(
  input: GenerationPipelineInput,
  copy: Copy | 'throw' | 'empty' = 'empty',
  image: 'ok' | 'fail' | 'throw' = 'ok'
): Promise<RunResult> {
  gst.mockReset();
  genImage.mockReset();
  if (image === 'ok')
    genImage.mockResolvedValue({
      success: true,
      imageUrl: 'https://provider.example.com/h.png',
      provider: 'openai',
      model: 'dall-e-3',
    });
  else if (image === 'fail')
    genImage.mockResolvedValue({
      success: false,
      error: 'provider 503',
      provider: 'openai',
      model: 'dall-e-3',
    });
  else genImage.mockRejectedValue(new Error('network down'));
  gst.mockImplementation(async (_p: string, schema: unknown) => {
    if (schema === CopyPackSchema) {
      if (copy === 'throw') throw new Error('gemini 500');
      return copy === 'empty' ? {} : copy;
    }
    return {};
  });
  try {
    const out: any = await new GenerationPipeline().execute(input);
    const cp = out.campaignPack;
    return {
      truth: cp?.truthCheck?.status,
      checks: cp?.truthCheck?.checks ?? [],
      prompts: gst.mock.calls.map((c) => String(c[0])),
      assets: (cp?.assets ?? []).map((a: any) => ({
        type: a.type,
        status: a.status,
        hasImage: !!a.imageUrl,
      })),
      packStatus: cp?.status,
    };
  } catch (e) {
    return {
      checks: [],
      prompts: gst.mock.calls.map((c) => String(c[0])),
      assets: [],
      threw: (e as Error).message,
    };
  }
}
const notPass = (s?: string) => s !== 'PASS';
const fails = (r: RunResult) =>
  r.checks
    .filter((c) => c.status !== 'PASS')
    .map((c) => `${c.category}:${c.status}`)
    .join(', ') || 'none';
const copyPrompt = (r: RunResult) => r.prompts.find((p) => p.includes('1. 5 HEADLINES')) ?? '';

/** Records a copy variant: hard = must hold; ideal = the verdict we want. */
async function copyVariant(
  scenario: string,
  label: string,
  input: GenerationPipelineInput,
  copy: Copy,
  hard: 'NOT_PASS' | 'NOT_FAIL',
  ideal: TruthStatus
) {
  const r = await run(input, copy);
  const hardOk = hard === 'NOT_PASS' ? notPass(r.truth) : r.truth !== 'FAIL';
  const verdict: Verdict = !hardOk ? 'FAIL' : r.truth === ideal ? 'PASS' : 'REVIEW';
  record(
    scenario,
    'truth',
    label,
    verdict,
    `truthCheck=${r.truth} (ideal ${ideal}); non-pass checks: ${fails(r)}`
  );
  return { r, verdict };
}

// Things no prompt may assert unless the business gave them (shared with pipeline.sparseFacts.test.ts).
const INVENTED: Array<[RegExp, string]> = [
  [/\b5\s?km\b|\b10\s?km\b|\b50\s?km\b/i, 'delivery radius'],
  [/minimumOrder"?\s*:\s*\d/i, 'minimum order'],
  [/Special Price/i, '"special price"'],
  [/₹\s?499\b/, 'old invented price'],
  [/\b[6-9]\d{9}\b|\+91[\s-]?[6-9]\d{4}/, 'phone number'],
  [/₹\s?(?:0|NaN)\b|₹undefined|\bundefined\b|\bNaN\b/, 'broken value'],
  [/\b\d{1,3}\s?%\s?off\b/i, 'discount'],
];
const inventedHits = (prompts: string[]) =>
  prompts.flatMap((p) =>
    INVENTED.flatMap(([re, why]) =>
      [
        ...p.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')),
      ].map(() => why)
    )
  );

afterAll(() => {
  if (process.env['MATRIX_OUT'])
    writeFileSync(process.env['MATRIX_OUT'], JSON.stringify(rows, null, 1));
});

// ---------------------------------------------------------------- scenarios
describe('Pass 2C scenario matrix (mock mode)', () => {
  it('S1 restaurant offer: price, offer, contact accuracy', async () => {
    const i = base();
    const honest = await copyVariant(
      'S1 Restaurant offer',
      'honest copy states ₹299, business, locality, number',
      i,
      copyPack(
        ['Chicken Dum Biryani at ₹299 — Kondapur Biryani House'],
        'Chicken Dum Biryani now ₹299 at Kondapur Biryani House, Kondapur. Order on WhatsApp 9876543210.',
        'Order on WhatsApp',
        'https://wa.me/919876543210'
      ),
      'NOT_FAIL',
      'PASS'
    );
    const wrong = await copyVariant(
      'S1 Restaurant offer',
      'WRONG price ₹199 is caught',
      i,
      copyPack(
        ['Chicken Dum Biryani at ₹199'],
        'Chicken Dum Biryani now ₹199 at Kondapur Biryani House, Kondapur.'
      ),
      'NOT_PASS',
      'FAIL'
    );
    const phone = await copyVariant(
      'S1 Restaurant offer',
      'INVENTED phone number is caught',
      i,
      copyPack(
        ['Chicken Dum Biryani at ₹299'],
        'Kondapur Biryani House, Kondapur. Chicken Dum Biryani ₹299. Call 9000000001.'
      ),
      'NOT_PASS',
      'FAIL'
    );
    const disc = await copyVariant(
      'S1 Restaurant offer',
      'INVENTED "50% off" on a fixed-price offer is caught',
      i,
      copyPack(
        ['50% off Chicken Dum Biryani ₹299'],
        'Kondapur Biryani House Kondapur. Chicken Dum Biryani ₹299, 50% off today. 9876543210'
      ),
      'NOT_PASS',
      'FAIL'
    );
    expect(honest.r.truth).toBe('PASS');
    expect(wrong.r.truth).toBe('FAIL');
    expect(phone.r.truth).toBe('FAIL');
    expect(disc.r.truth).toBe('FAIL'); // risk policy: an unsupported discount blocks delivery
    const prompt = copyPrompt(honest.r);
    const ok = prompt.includes('₹299') && /DISCOUNT: none was provided/.test(prompt);
    record(
      'S1 Restaurant offer',
      'strategy',
      'copy prompt carries the exact price and forbids an invented discount',
      ok ? 'PASS' : 'FAIL',
      'copy-stage prompt inspected'
    );
    expect(ok).toBe(true);
  });

  it('S2 restaurant family meal: emotional appeal without invented claims', async () => {
    const i = base({
      productName: 'Family Combo',
      offerPrice: 799,
      audience: { localities: ['Kondapur'], occasion: 'family' },
    });
    const honest = await copyVariant(
      'S2 Family meal',
      'honest emotional copy (phone number not printed)',
      i,
      copyPack(
        ['Sunday lunch, the whole family, one Family Combo'],
        'Bring everyone together. Family Combo ₹799 at Kondapur Biryani House, Kondapur.'
      ),
      'NOT_FAIL',
      'PASS'
    );
    const sup = await copyVariant(
      'S2 Family meal',
      'superlatives and social-proof claims are caught',
      i,
      copyPack(
        ["Hyderabad's #1 award-winning Family Combo ₹799"],
        'Kondapur Biryani House, Kondapur: the best, most famous Family Combo in Hyderabad, ₹799, rated 5 stars by 10,000 customers. 9876543210'
      ),
      'NOT_PASS',
      'FAIL'
    );
    expect(honest.r.truth).toBe('PASS'); // omitting the phone number is not a claim, so it is not flagged
    expect(sup.r.truth).toBe('FAIL');
    record(
      'S2 Family meal',
      'copy',
      'emotional quality and specificity of the writing',
      'NOT_TESTED',
      'needs a live model; in mock mode the copy is authored by the test'
    );
  });

  it('S3 restaurant curiosity angle: chosen style reaches the copywriter', async () => {
    const a = await run(base({ campaignStyle: 'storytelling' }));
    const b = await run(base({ campaignStyle: 'fomo' }));
    const pa = copyPrompt(a);
    const pb = copyPrompt(b);
    const differ = pa !== pb && /storytelling/i.test(pa) && /fomo/i.test(pb);
    record(
      'S3 Curiosity angle',
      'strategy',
      'chosen campaignStyle is passed to the copywriter and changes the prompt',
      differ ? 'PASS' : 'FAIL',
      `storytelling in prompt A: ${/storytelling/i.test(pa)}; fomo in prompt B: ${/fomo/i.test(pb)}`
    );
    record(
      'S3 Curiosity angle',
      'strategy',
      'creative strategies are genuinely distinct in output',
      'NOT_TESTED',
      'requires live model output; the Creative Brain returned no blueprint under the stub'
    );
    expect(differ).toBe(true);
  });

  it('S4 salon promotion: service, derived discount, booking', async () => {
    const i = salon({ whatsappNumber: '+919811122233' });
    const honest = await copyVariant(
      'S4 Salon promotion',
      'honest copy states ₹2,499, was ₹3,499, 29% off',
      i,
      copyPack(
        ['Keratin Treatment ₹2,499 — 29% off at Glow Studio'],
        'Keratin Treatment at Glow Studio, Banjara Hills: ₹2,499, was ₹3,499 — 29% off. Book on WhatsApp 9811122233.',
        'Book now',
        'https://wa.me/919811122233'
      ),
      'NOT_FAIL',
      'PASS'
    );
    const wrong = await copyVariant(
      'S4 Salon promotion',
      'WRONG discount "50% off" is caught',
      i,
      copyPack(
        ['Keratin Treatment ₹2,499 — 50% off'],
        'Keratin Treatment at Glow Studio, Banjara Hills: ₹2,499, was ₹3,499 — 50% off. Book 9811122233.'
      ),
      'NOT_PASS',
      'FAIL'
    );
    const prompt = copyPrompt(honest.r);
    const ok =
      /exactly 29%/.test(prompt) &&
      /SERVICES: the owner's known services are: Keratin Treatment, Haircut/.test(prompt);
    record(
      'S4 Salon promotion',
      'strategy',
      'discount derived (29%) from the real prices; known services listed',
      ok ? 'PASS' : 'FAIL',
      'copy-stage prompt inspected'
    );
    expect(ok).toBe(true);
    expect(honest.r.truth).toBe('PASS');
    expect(['FAIL', 'REVIEW_REQUIRED']).toContain(wrong.r.truth);
  });

  it('S5 salon premium positioning: tone reaches the model', async () => {
    const i = salon({
      localizationProfile: {
        brandTone: 'luxury',
        primaryLanguage: 'en',
        campaignStyle: 'emotional',
      } as never,
    });
    const r = await run(i);
    const n = r.prompts.filter((p) => /luxury/i.test(p)).length;
    record(
      'S5 Salon premium',
      'copy',
      'brand tone "luxury" is present in the prompts',
      n > 0 ? 'PASS' : 'FAIL',
      `"luxury" found in ${n}/${r.prompts.length} prompts`
    );
    record(
      'S5 Salon premium',
      'visuals',
      'visual suitability of luxury positioning',
      'NOT_TESTED',
      'image content cannot be assessed with a stubbed provider'
    );
    record(
      'S5 Salon premium',
      'copy',
      'tone adherence of the generated words',
      'NOT_TESTED',
      'no deterministic tone checker exists; needs live model plus human review'
    );
    expect(n).toBeGreaterThan(0);
  });

  it('S6 salon incomplete brief: no price, no phone, no brain — nothing invented', async () => {
    const i = salon({
      offerPrice: 0,
      offerOriginalPrice: undefined,
      offerType: 'fixed',
      whatsappNumber: '',
      businessBrain: {} as never,
    });
    const r = await run(i);
    const hits = inventedHits(r.prompts);
    record(
      'S6 Incomplete brief',
      'truth',
      'no prompt asserts a price, phone, discount or radius the business never gave',
      hits.length === 0 ? 'PASS' : 'FAIL',
      hits.length
        ? `hits: ${[...new Set(hits)].join(', ')}`
        : `${r.prompts.length} prompts scanned, 0 hits`
    );
    record(
      'S6 Incomplete brief',
      'reliability',
      'asks the owner a clarifying question',
      'NOT_TESTED',
      'clarification belongs to the Creative Brain question engine, not this pipeline; the callable also requires offer.price > 0, so a price-less brief is rejected before generation'
    );
    expect(r.threw).toBeUndefined();
    expect(hits).toEqual([]);
  });

  it('S7 real estate listing: only recorded facts', async () => {
    const i = realEstate();
    const honest = await copyVariant(
      'S7 Real-estate listing',
      'honest 3BHK ready-to-move copy',
      i,
      copyPack(
        ['3BHK in Green Meadows, ready to move'],
        '3BHK in Green Meadows, Gachibowli — ready to move, ₹65,00,000. Call 9876543210. Green Meadows Realty.',
        'Call now',
        'https://wa.me/919876543210'
      ),
      'NOT_FAIL',
      'PASS'
    );
    const poss = await copyVariant(
      'S7 Real-estate listing',
      'invented possession date / RERA / bathrooms / area are caught',
      i,
      copyPack(
        ['3BHK in Green Meadows, possession Dec 2026'],
        '3BHK in Green Meadows, Gachibowli, ₹65,00,000. Possession December 2026, RERA approved, 3 bathrooms, 1,850 sq ft. Call 9876543210. Green Meadows Realty.'
      ),
      'NOT_PASS',
      'FAIL'
    );
    const prompt = copyPrompt(honest.r);
    const ok =
      /LISTING FACTS[^\n]*3 bedrooms; possession: ready to move/.test(prompt) &&
      /Never state a possession date/.test(prompt);
    record(
      'S7 Real-estate listing',
      'strategy',
      'prompt limited to recorded listing facts; unrecorded fields called out',
      ok ? 'PASS' : 'FAIL',
      'copy-stage prompt inspected'
    );
    expect(ok).toBe(true);
    expect(poss.verdict).not.toBe('FAIL');
  });

  it('S8 real estate lead campaign: contact accuracy', async () => {
    const i = realEstate({ objective: 'lead_generation', cta: 'call_now' });
    const good = await copyVariant(
      'S8 Real-estate lead',
      'correct contact number',
      i,
      copyPack(
        ['Visit the 3BHK in Green Meadows'],
        '3BHK in Green Meadows, Gachibowli, ₹65,00,000. Call 9876543210 to book a visit. Green Meadows Realty.',
        'Call now'
      ),
      'NOT_FAIL',
      'PASS'
    );
    const bad = await copyVariant(
      'S8 Real-estate lead',
      'WRONG contact number is caught',
      i,
      copyPack(
        ['Visit the 3BHK in Green Meadows'],
        '3BHK in Green Meadows, Gachibowli, ₹65,00,000. Call 9123456780 to book a visit. Green Meadows Realty.',
        'Call now'
      ),
      'NOT_PASS',
      'FAIL'
    );
    expect(good.r.truth).not.toBe('FAIL');
    expect(notPass(bad.r.truth)).toBe(true);
  });

  it('S9 generic local business: no industry-specific assumptions leak', async () => {
    const i = base({
      businessName: 'Paper Plane Stationers',
      businessCategory: 'retail',
      vertical: 'general' as never,
      businessLocation: { city: 'Pune', state: 'Maharashtra', locality: 'Kothrud' },
      audience: { localities: ['Kothrud'] },
      productName: 'Notebook Pack (5)',
      offerPrice: 150,
      offerHeadline: 'Back to school',
      objective: 'brand_awareness',
      whatsappNumber: '+919822012345',
    });
    const r = await run(
      i,
      copyPack(
        ['Notebook Pack (5) for ₹150'],
        'Notebook Pack (5) ₹150 at Paper Plane Stationers, Kothrud. WhatsApp 9822012345.'
      )
    );
    const leak = /biryani|\bmenu\b|dine-in|hyderabad|\bsalon\b|haircut|\bBHK\b|possession|RERA/i;
    // The safety-validation prompt carries a stray internal note ("critical for future salon vertical").
    // It is harmless to the output but is industry vocabulary reaching a generic business; pin it exactly so
    // any NEW leak fails the test.
    const strayNote = /critical for future salon vertical/i;
    const leaked = r.prompts
      .map((p) => p.replace(strayNote, ''))
      .filter((p) => leak.test(p))
      .map((p) => (p.match(leak) ?? [''])[0]);
    const strayNoteSeen = r.prompts.some((p) => strayNote.test(p));
    record(
      'S9 Generic business',
      'strategy',
      'no restaurant, salon, real-estate or Hyderabad vocabulary in the prompts',
      leaked.length > 0 ? 'FAIL' : strayNoteSeen ? 'REVIEW' : 'PASS',
      leaked.length
        ? `leaked: ${[...new Set(leaked)].join(', ')}`
        : strayNoteSeen
          ? `only leak: safety-validation prompt says "(critical for future salon vertical)" — stale internal note, no effect on output; ${r.prompts.length} prompts scanned`
          : `${r.prompts.length} prompts scanned`
    );
    record(
      'S9 Generic business',
      'truth',
      'honest copy verdict',
      r.truth === 'PASS' ? 'PASS' : 'REVIEW',
      `truthCheck=${r.truth}; non-pass: ${fails(r)}`
    );
    expect(r.threw).toBeUndefined();
    expect(leaked).toEqual([]);
  });

  it('S10 contradictory offer: original < price, window reversed, headline price disagrees', async () => {
    const i = base({
      offerPrice: 299,
      offerOriginalPrice: 249,
      offerType: 'percentage',
      offerHeadline: 'Flat ₹199 only!',
      offerValidityStart: '2026-10-15T00:00:00.000Z',
      offerValidityEnd: '2026-10-10T00:00:00.000Z',
    });
    const r = await run(
      i,
      copyPack(
        ['Flat ₹199 only!'],
        'Chicken Dum Biryani flat ₹199 only at Kondapur Biryani House, Kondapur. 9876543210'
      )
    );
    const prompt = copyPrompt(r);
    const negativeDiscount = /(-\d+%|exactly -|negative)/i.test(prompt);
    record(
      'S10 Contradictory offer',
      'truth',
      'copy that follows the contradictory headline price (₹199 vs ₹299) is blocked',
      r.truth === 'FAIL' ? 'PASS' : 'FAIL',
      `truthCheck=${r.truth}; non-pass: ${fails(r)}`
    );
    record(
      'S10 Contradictory offer',
      'reliability',
      'prompt never asks for a nonsensical (negative) discount',
      negativeDiscount ? 'FAIL' : 'PASS',
      'copy-stage prompt inspected'
    );
    // The pipeline itself does not validate; the callable does (utils/offerValidation.ts, run before any credit
    // reservation: see generateCampaignStrategy.offerValidation.test.ts). Evaluate the same validator here.
    const offerErrors = validateOffer(
      {
        price: i.offerPrice,
        originalPrice: i.offerOriginalPrice,
        type: i.offerType,
        validityStart: i.offerValidityStart,
        validityEnd: i.offerValidityEnd,
      },
      i.duration
    );
    const flaggedBeforeGeneration = Object.keys(offerErrors).length > 0;
    record(
      'S10 Contradictory offer',
      'reliability',
      'contradiction (original < price, end < start) is rejected BEFORE generation and before any credit is reserved',
      flaggedBeforeGeneration ? 'PASS' : 'FAIL',
      flaggedBeforeGeneration
        ? `rejected: ${Object.keys(offerErrors).join(', ')} (callable-level proof: generateCampaignStrategy.offerValidation.test.ts)`
        : 'not flagged'
    );
    expect(flaggedBeforeGeneration).toBe(true);
    expect(r.threw).toBeUndefined();
    expect(r.truth).toBe('FAIL');
    expect(negativeDiscount).toBe(false);
  });

  it('S11 insufficient Business Brain: nothing invented', async () => {
    const i = base({
      businessName: 'Raju Tiffins',
      businessLocation: { city: 'Vijayawada', state: 'Andhra Pradesh' },
      audience: { localities: ['Vijayawada'] },
      productName: 'Idli',
      offerPrice: 40,
      whatsappNumber: '',
      businessBrain: {} as never,
      brandProfile: {},
    });
    const clean = await run(i);
    const hits = inventedHits(clean.prompts);
    record(
      'S11 Insufficient brain',
      'truth',
      'no prompt asserts facts the business never gave',
      hits.length === 0 ? 'PASS' : 'FAIL',
      hits.length
        ? `hits: ${[...new Set(hits)].join(', ')}`
        : `${clean.prompts.length} prompts scanned`
    );
    const inv = await copyVariant(
      'S11 Insufficient brain',
      'invented heritage / hours / customer-count claims are caught',
      i,
      copyPack(
        ['Since 1995: Idli ₹40'],
        'Raju Tiffins, Vijayawada, serving since 1995, open 24/7, loved by 10,000 happy customers. Idli ₹40.'
      ),
      'NOT_PASS',
      'FAIL'
    );
    record(
      'S11 Insufficient brain',
      'strategy',
      'Creative Brain behaviour on an empty brain',
      'NOT_TESTED',
      'the pipeline continued without a blueprint under the stub; real behaviour needs a live model'
    );
    expect(clean.threw).toBeUndefined();
    expect(hits).toEqual([]);
    expect(notPass(inv.r.truth)).toBe(true);
  });

  it('S12 provider failure: handled without a fabricated success', async () => {
    const copy = copyPack(
      ['Chicken Dum Biryani at ₹299'],
      'Chicken Dum Biryani ₹299 at Kondapur Biryani House, Kondapur. 9876543210'
    );
    const imgFail = await run(base(), copy, 'fail');
    const imgThrow = await run(base(), copy, 'throw');
    const textThrow = await run(base(), 'throw');
    const describeRun = (r: RunResult) =>
      r.threw
        ? `threw "${r.threw}"`
        : `completed; packStatus=${r.packStatus}; truth=${r.truth}; assets=${r.assets
            .map((a) => `${a.type}:${a.status}:${a.hasImage ? 'img' : 'noimg'}`)
            .join('|')}`;
    const imgOk = (r: RunResult) =>
      !!r.threw || r.assets.every((a) => a.status !== 'completed' || a.hasImage);
    record(
      'S12 Provider failure',
      'reliability',
      'image provider returns success:false — no asset claims completion without an image',
      imgOk(imgFail) ? 'PASS' : 'FAIL',
      describeRun(imgFail)
    );
    record(
      'S12 Provider failure',
      'reliability',
      'image provider throws (network) — no asset claims completion without an image',
      imgOk(imgThrow) ? 'PASS' : 'FAIL',
      describeRun(imgThrow)
    );
    record(
      'S12 Provider failure',
      'reliability',
      'text provider throws on the copy stage — never a clean PASS',
      textThrow.threw || textThrow.truth !== 'PASS' ? 'PASS' : 'FAIL',
      describeRun(textThrow)
    );
    expect(imgOk(imgFail)).toBe(true);
    expect(imgOk(imgThrow)).toBe(true);
    expect(textThrow.threw !== undefined || textThrow.truth !== 'PASS').toBe(true);
  });

  it('output integrity: a normal run yields poster, story and reel assets with images', async () => {
    const r = await run(
      base(),
      copyPack(
        ['Chicken Dum Biryani at ₹299'],
        'Chicken Dum Biryani ₹299 at Kondapur Biryani House, Kondapur. 9876543210'
      )
    );
    const visual = r.assets.filter((a) => a.hasImage).map((a) => a.type);
    const ok =
      visual.includes('poster') &&
      visual.includes('story') &&
      visual.includes('reel') &&
      r.assets.every((a) => a.status === 'completed') &&
      // text assets (headline, ad_copy, caption, cta, whatsapp) carry no image by design
      r.assets.some((a) => a.type === 'headline' && !a.hasImage);
    record(
      'All scenarios',
      'output',
      'campaign pack = text assets + visual assets (poster, story, reel), every asset completed, every visual has an image URL',
      ok ? 'PASS' : 'FAIL',
      `visual assets: ${visual.join(',')}; total assets ${r.assets.length}`
    );
    // Delivered creatives must equal the Free plan contract (services/freePlanContract.test.ts):
    // 1 poster + 3 stories + 1 reel concept = 5 social creatives per campaign.
    const count = (t: string) => r.assets.filter((a) => a.hasImage && a.type === t).length;
    const contractOk =
      count('poster') === 1 && count('story') === 3 && count('reel') === 1 && visual.length === 5;
    record(
      'All scenarios',
      'output',
      'delivered visuals match the Free plan promise: 1 poster, 3 stories, 1 reel concept (5 creatives)',
      contractOk ? 'PASS' : 'FAIL',
      `poster ${count('poster')}, story ${count('story')}, reel ${count('reel')}, total ${visual.length}`
    );
    expect(contractOk).toBe(true);
    record(
      'All scenarios',
      'output',
      'pixel dimensions, aspect ratios and legibility of final images',
      'NOT_TESTED',
      'provider and storage are stubbed; no image is rendered (compositor.test.ts covers the compositor in isolation)'
    );
    expect(ok).toBe(true);
  });
});
