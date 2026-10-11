/**
 * The owner's personal details and the provenance map must never reach a generation model. A live
 * benchmark caught the model printing the owner's first name into a public ad ("Asha gari ethnic wear
 * collection"); this makes that structurally impossible rather than a matter of prompt wording.
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

import { brainForGeneration } from './brainForGeneration';
import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

const BRAIN = {
  identity: {
    name: 'Prana Yoga Studio',
    category: 'general',
    industry: 'fitness',
    subcategory: 'yoga',
  },
  owner: { name: 'Asha', role: 'founder' },
  offerings: { signature: ['Group classes'] },
  audience: { targetCustomer: 'Working professionals', primary: ['Working professionals'] },
  positioning: { usp: 'Small batches, so every class gets personal attention' },
  knowledge: {
    origin: 'conversational_onboarding',
    confirmedAt: '2026-10-05T00:00:00.000Z',
    facts: { 'contact.phone': { source: 'DERIVED_FROM_WHATSAPP' } },
  },
  businessRules: { operatingMode: 'dine-in', openingHours: {} },
};

describe('brainForGeneration', () => {
  it("removes the owner's details, the provenance map and the unprovenanced default operating mode, and nothing else", () => {
    const out = brainForGeneration(BRAIN) as Record<string, unknown>;
    expect(out).not.toHaveProperty('owner');
    expect(out).not.toHaveProperty('knowledge');
    expect(out).toEqual({
      identity: BRAIN.identity,
      offerings: BRAIN.offerings,
      audience: BRAIN.audience,
      positioning: BRAIN.positioning,
      // "dine-in" had no provenance on this onboarding Brain, so it is Mitra's default and is not shown.
      businessRules: { openingHours: {} },
    });
  });

  it('does not mutate the stored Business Brain', () => {
    const copy = structuredClone(BRAIN);
    brainForGeneration(BRAIN);
    expect(BRAIN).toEqual(copy);
  });

  it('leaves a legacy Brain (no owner, no knowledge) exactly as it was', () => {
    const legacy = { identity: { name: 'Old Cafe' }, products: [] };
    expect(brainForGeneration(legacy)).toEqual(legacy);
  });

  it.each([undefined, null])('passes %p through untouched', (v) => {
    expect(brainForGeneration(v)).toBe(v);
  });
});

describe('the real pipeline never sends the owner to the model', () => {
  const input = (): GenerationPipelineInput =>
    ({
      businessId: 'biz_1',
      campaignId: 'camp_1',
      businessName: 'Prana Yoga Studio',
      businessCategory: 'general',
      vertical: 'general',
      businessLocation: { city: 'Delhi', state: 'Delhi' },
      whatsappNumber: '+919876543210',
      businessPhone: '+919876543210',
      businessBrain: BRAIN as any,
      brandProfile: {},
      objective: 'service_promotion',
      productName: 'Morning batch',
      offerHeadline: 'New morning batch',
      offerPrice: 999,
      offerType: 'percentage',
      offerValidityStart: '2026-10-10T00:00:00.000Z',
      offerValidityEnd: '2026-10-15T00:00:00.000Z',
      duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
      audience: { localities: ['Delhi'] },
      cta: 'order_whatsapp',
      localizationProfile: {} as any,
      campaignStyle: 'funny',
    }) as GenerationPipelineInput;

  it('no prompt contains the owner name or provenance, while the business facts still do', async () => {
    generateStructuredTextMock.mockClear();
    await new GenerationPipeline().execute(input());

    const prompts = generateStructuredTextMock.mock.calls.map((c) => String(c[0]));
    expect(prompts.length).toBeGreaterThan(0);
    const everything = prompts.join('\n');

    expect(everything).not.toContain('Asha');
    expect(everything).not.toContain('founder');
    expect(everything).not.toContain('DERIVED_FROM_WHATSAPP');
    expect(everything).not.toContain('conversational_onboarding');

    // …and the useful facts the owner gave still reach the model.
    expect(everything).toContain('Group classes');
    expect(everything).toContain('Working professionals');
    expect(everything).toContain('Small batches');
    expect(everything).toContain('"industry": "fitness"');
  });

  it("does not alter the caller's input object", async () => {
    const original = input();
    await new GenerationPipeline().execute(original);
    expect((original.businessBrain as any).owner).toEqual({ name: 'Asha', role: 'founder' });
  });
});

describe('placeholder defaults are not business facts', () => {
  it('drops the 18-65 age range Mitra stores for a new Brain, keeping the rest of the audience', () => {
    const out = brainForGeneration({
      audience: { targetCustomer: 'Working professionals', ageRange: { min: 18, max: 65 } },
    }) as { audience: Record<string, unknown> };
    expect(out.audience['ageRange']).toBeUndefined();
    expect(out.audience['targetCustomer']).toBe('Working professionals');
  });

  it('keeps an age range the owner actually set', () => {
    const out = brainForGeneration({
      audience: { targetCustomer: 'Students', ageRange: { min: 18, max: 24 } },
    }) as { audience: { ageRange: { min: number; max: number } } };
    expect(out.audience.ageRange).toEqual({ min: 18, max: 24 });
  });

  it('does not mutate the Brain it was given', () => {
    const brain = { audience: { ageRange: { min: 18, max: 65 } } };
    brainForGeneration(brain);
    expect(brain.audience.ageRange).toEqual({ min: 18, max: 65 });
  });
});

describe('bookkeeping and unprovenanced defaults stay out of the prompt', () => {
  const onboarded = (facts: Record<string, unknown> = {}) => ({
    knowledge: { origin: 'conversational_onboarding', confirmedAt: 'x', facts },
    lastSyncedAt: '2026-10-01T00:00:00.000Z',
    campaignHistory: [],
    businessRules: { openingHours: {}, operatingMode: 'dine-in' },
  });

  it('drops lastSyncedAt and an empty campaignHistory, keeps a real one', () => {
    const out = brainForGeneration(onboarded()) as Record<string, unknown>;
    expect(out['lastSyncedAt']).toBeUndefined();
    expect(out['campaignHistory']).toBeUndefined();
    const withHistory = brainForGeneration({ campaignHistory: [{ id: 'c1' }] }) as Record<string, unknown>;
    expect(withHistory['campaignHistory']).toEqual([{ id: 'c1' }]);
  });

  it('an onboarding Brain with no provenance for operatingMode: the default "dine-in" is not shown', () => {
    const out = brainForGeneration(onboarded()) as { businessRules: Record<string, unknown> };
    expect(out.businessRules['operatingMode']).toBeUndefined();
  });

  it('an operatingMode with provenance (derived from a cloud-kitchen subcategory) is shown', () => {
    const brain = onboarded({ 'businessRules.operatingMode': { source: 'DERIVED_FROM_SUBCATEGORY' } });
    brain.businessRules.operatingMode = 'delivery';
    const out = brainForGeneration(brain) as { businessRules: Record<string, unknown> };
    expect(out.businessRules['operatingMode']).toBe('delivery');
  });

  it('an older Brain with no provenance at all is left exactly as stored (we cannot tell what the owner chose)', () => {
    const out = brainForGeneration({ businessRules: { operatingMode: 'takeaway' } }) as {
      businessRules: Record<string, unknown>;
    };
    expect(out.businessRules['operatingMode']).toBe('takeaway');
  });
});

describe('SYSTEM_DEFAULT provenance: a placeholder never reaches the model as a business fact', () => {
  const brain = () => ({
    brand: { tone: 'friendly', colors: { primary: '#E84D1A' }, fonts: { heading: 'Poppins' }, personality: 'warm' },
    localization: { primaryLanguage: 'en', secondaryLanguage: 'en', regionalStyle: 'neutral', slangIntensity: 'moderate', languageMixing: 'minimal' },
    audience: { targetCustomer: 'Office-goers', ageRange: { min: 18, max: 65 } },
    knowledge: {
      origin: 'conversational_onboarding',
      confirmedAt: 'x',
      facts: {
        'brand.tone': { source: 'SYSTEM_DEFAULT' },
        'brand.colors': { source: 'SYSTEM_DEFAULT' },
        'brand.fonts': { source: 'SYSTEM_DEFAULT' },
        'localization.primaryLanguage': { source: 'SYSTEM_DEFAULT' },
        'localization.secondaryLanguage': { source: 'SYSTEM_DEFAULT' },
        'localization.regionalStyle': { source: 'SYSTEM_DEFAULT' },
        'localization.slangIntensity': { source: 'SYSTEM_DEFAULT' },
        'localization.languageMixing': { source: 'SYSTEM_DEFAULT' },
        'audience.ageRange': { source: 'SYSTEM_DEFAULT' },
        'audience.primary': { source: 'USER_CONFIRMED' },
      },
    },
  });

  it('every path recorded as SYSTEM_DEFAULT is removed from what the model sees', () => {
    const out = brainForGeneration(brain()) as any;
    expect(out.brand.tone).toBeUndefined();
    expect(out.brand.colors).toBeUndefined();
    expect(out.brand.fonts).toBeUndefined();
    expect(out.localization).toEqual({});
    expect(out.audience.ageRange).toBeUndefined();
  });

  it('what the owner did say is untouched', () => {
    const out = brainForGeneration(brain()) as any;
    expect(out.brand.personality).toBe('warm');
    expect(out.audience.targetCustomer).toBe('Office-goers');
  });

  it('a value whose provenance is USER_CONFIRMED is kept even at the same path', () => {
    const b: any = brain();
    b.localization.primaryLanguage = 'hi_en';
    b.knowledge.facts['localization.primaryLanguage'] = { source: 'USER_CONFIRMED' };
    const out = brainForGeneration(b) as any;
    expect(out.localization.primaryLanguage).toBe('hi_en');
    expect(out.localization.regionalStyle).toBeUndefined();
  });

  it('the stored Brain is never mutated', () => {
    const b = brain();
    const copy = JSON.parse(JSON.stringify(b));
    brainForGeneration(b);
    expect(b).toEqual(copy);
  });
});
