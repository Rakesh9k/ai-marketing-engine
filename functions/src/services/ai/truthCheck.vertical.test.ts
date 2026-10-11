import { runDeterministicTruthCheck } from './truthCheck';
import type { GenerationPipelineInput } from '../../types';

/**
 * Truth Check verifies the same vertical facts the copywriter was given (verticalContract.ts): what the
 * owner recorded is allowed; a service, possession date or property fact nobody recorded is flagged.
 */
const base = (over: Partial<GenerationPipelineInput>): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'Glow Beauty Parlour',
    businessCategory: 'salon',
    vertical: 'salon',
    businessLocation: { city: 'Pune', state: 'Maharashtra', locality: 'Kothrud' },
    whatsappNumber: '9822012345',
    businessBrain: {} as never,
    brandProfile: {},
    objective: 'service_promotion',
    productName: 'Facial',
    offerHeadline: 'Glow Facial',
    offerPrice: 799,
    offerType: 'fixed',
    audience: { localities: ['Kothrud'] },
    cta: 'order_whatsapp',
    localizationProfile: {} as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

const run = (input: GenerationPipelineInput, text: string) =>
  runDeterministicTruthCheck(input, {
    businessUnderstanding: { businessFacts: [] },
    productUnderstanding: { productFacts: [] },
    copyPack: { body: text },
  });

const SALON_BASE = 'Glow Beauty Parlour in Kothrud, Pune. WhatsApp 9822012345. Just ₹799.';
const serviceItem = (r: ReturnType<typeof run>) =>
  r.checks.find((c) => c.category === 'claim' && /services not among/i.test(c.reason ?? ''));

describe('salon: a named service must be one the owner recorded', () => {
  it('an unrecorded treatment is flagged, and the campaign cannot PASS', () => {
    const r = run(base({}), `${SALON_BASE} Try our keratin treatment.`);
    expect(serviceItem(r)!.status).toBe('REVIEW_REQUIRED');
    expect(serviceItem(r)!.basis).toBe('invalid_claim');
    expect(serviceItem(r)!.generatedValue).toContain('keratin');
    expect(r.status).not.toBe('PASS');
  });

  it("the campaign's own product is a known offering", () => {
    expect(serviceItem(run(base({}), `${SALON_BASE} A glowing facial.`))).toBeUndefined();
  });

  it('services recorded in the Brain (profile or signature offerings) are known', () => {
    const profile = base({
      businessBrain: { verticalProfile: { services: [{ name: 'Keratin Smoothening' }] } } as never,
    });
    expect(
      serviceItem(run(profile, `${SALON_BASE} Keratin smoothening this week.`))
    ).toBeUndefined();
    const signature = base({ businessBrain: { offerings: { signature: ['Hair Spa'] } } as never });
    expect(serviceItem(run(signature, `${SALON_BASE} A relaxing hair spa.`))).toBeUndefined();
  });

  it('copy that names no specific treatment raises nothing', () => {
    expect(serviceItem(run(base({}), `${SALON_BASE} Come and feel great.`))).toBeUndefined();
  });

  it('never runs for other verticals', () => {
    const r = run(
      base({ vertical: 'restaurant', businessCategory: 'restaurant' }),
      `${SALON_BASE} keratin facial`
    );
    expect(serviceItem(r)).toBeUndefined();
  });
});

describe('real estate: facts come from the listing, and no possession date can be stated', () => {
  const listing = {
    title: '3BHK in Green Meadows',
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 1450,
    possessionStatus: 'ready_to_move',
    amenities: ['gym', 'parking'],
  };
  const re = base({
    vertical: 'real_estate',
    businessCategory: 'real_estate',
    productName: '3BHK in Green Meadows',
    businessBrain: { verticalProfile: { properties: [listing] } } as never,
  });
  const RE_BASE =
    'Glow Beauty Parlour in Kothrud, Pune. WhatsApp 9822012345. Just ₹799. 3BHK in Green Meadows.';
  const dateItem = (r: ReturnType<typeof run>) =>
    r.checks.find((c) => /possession date/i.test(c.reason ?? ''));

  it('a possession date nobody recorded is flagged', () => {
    for (const claim of [
      'Possession in March 2027',
      'possession by Dec 2026',
      'Possession expected 2028',
    ]) {
      const r = run(re, `${RE_BASE} ${claim}.`);
      expect(dateItem(r)!.status).toBe('REVIEW_REQUIRED');
      expect(dateItem(r)!.basis).toBe('invalid_claim');
    }
  });

  it('the recorded status without a date is fine', () => {
    expect(dateItem(run(re, `${RE_BASE} Ready to move, immediate possession.`))).toBeUndefined();
  });

  it('the recorded facts still pass and a contradicting one still fails (unchanged)', () => {
    expect(
      run(re, `${RE_BASE} 3 bedrooms, 2 bathrooms, 1450 sq ft, gym and parking.`).checks.some(
        (c) => c.status === 'FAIL' && c.category === 'product'
      )
    ).toBe(false);
    expect(run(re, `${RE_BASE} Under construction, 4 bedrooms.`).status).toBe('FAIL');
  });
});
