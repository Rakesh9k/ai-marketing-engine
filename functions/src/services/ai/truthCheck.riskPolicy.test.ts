import { runDeterministicTruthCheck, extractDiscountContextPercentages } from './truthCheck';
import type { GenerationPipelineInput } from '../../types';

/**
 * Risk-based delivery policy for the Truth Check (Pass 2C P1-A).
 *
 *   BLOCK (FAIL)   unsupported prices, discounts, legal approvals (RERA…), possession dates, and property
 *                  specs (bedrooms / bathrooms / area) nobody recorded — each names the offending claim.
 *   REVIEW         missing or unverifiable NON-essential details (and operational claims such as delivery or
 *                  opening hours, which stay REVIEW so honest restaurants are not blocked).
 *   PASS           honest copy — including copy that simply does not print the phone number.
 *
 * A factual CONTRADICTION is never conflated with a MISSING fact: blocking is by claim class, not "every
 * review becomes a failure".
 */
const base = (over: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'Kondapur Biryani House',
    businessCategory: 'restaurant',
    vertical: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessBrain: {} as never,
    brandProfile: {},
    objective: 'weekend_offer',
    productName: 'Chicken Dum Biryani',
    offerHeadline: 'Weekend Special',
    offerPrice: 299,
    offerType: 'fixed',
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {} as never,
    campaignStyle: 'urgent',
    ...over,
  }) as GenerationPipelineInput;

const run = (i: GenerationPipelineInput, text: string) =>
  runDeterministicTruthCheck(i, {
    businessUnderstanding: { businessFacts: [] },
    productUnderstanding: { productFacts: [] },
    copyPack: { body: text },
  });

const REST = 'Chicken Dum Biryani ₹299 at Kondapur Biryani House, Kondapur.';
const failing = (r: ReturnType<typeof run>) => r.checks.filter((c) => c.status === 'FAIL');

describe('unsupported discounts block delivery and are named', () => {
  it('an invented "50% off" on a fixed-price offer FAILs and the summary names it', () => {
    const r = run(base(), `${REST} 50% off today.`);
    expect(r.status).toBe('FAIL');
    const item = r.checks.find(
      (c) => c.category === 'offer' && /50%/.test(c.generatedValue ?? '')
    )!;
    expect(item.status).toBe('FAIL');
    expect(item.basis).toBe('invalid_claim');
    expect(r.summary).toMatch(/50%/);
    expect(r.summary).toMatch(/no discount was provided/);
  });

  it.each(['Flat 40% discount', 'Save 30% now', 'Upto 25% off', 'a discount of 15%'])(
    '"%s" is recognised as a discount claim',
    (phrase) => {
      expect(extractDiscountContextPercentages(phrase).length).toBeGreaterThan(0);
      expect(run(base(), `${REST} ${phrase}.`).status).toBe('FAIL');
    }
  );

  it('the correct derived discount passes; a wrong one fails', () => {
    const i = base({ offerType: 'percentage', offerPrice: 160, offerOriginalPrice: 200 });
    const ok = run(
      i,
      'Chicken Dum Biryani ₹160, was ₹200, 20% off at Kondapur Biryani House, Kondapur.'
    );
    expect(
      ok.checks.find((c) => c.category === 'offer' && /percentage|discount/i.test(c.reason ?? ''))
        ?.status ?? 'PASS'
    ).toBe('PASS');
    expect(
      failing(
        run(i, 'Chicken Dum Biryani ₹160, was ₹200, 35% off at Kondapur Biryani House, Kondapur.')
      ).length
    ).toBeGreaterThan(0);
  });

  it('a percentage the OWNER wrote in the headline is owner-stated, not invented', () => {
    const i = base({
      offerHeadline: 'Flat 20% off on weekends',
      offerType: 'percentage',
      offerPrice: 240,
    });
    const r = run(
      i,
      'Chicken Dum Biryani ₹240 at Kondapur Biryani House, Kondapur. Flat 20% off on weekends.'
    );
    expect(
      r.checks.find((c) => c.category === 'offer' && /not match|no discount/i.test(c.reason ?? ''))
    ).toBeUndefined();
  });

  it('a bare percentage with no discount wording ("25% more chicken") is NOT a price claim: review at most', () => {
    const r = run(base(), `${REST} Now 25% more chicken in every plate.`);
    const pct = r.checks.find(
      (c) => c.category === 'offer' && /Percentage claim/.test(c.reason ?? '')
    );
    expect(pct?.status).toBe('REVIEW_REQUIRED');
    expect(r.status).not.toBe('FAIL');
  });
});

describe('real estate: legal approvals, possession dates and property specs', () => {
  const listing = (over: Record<string, unknown> = {}) => ({
    title: '3BHK in Green Meadows',
    bedrooms: 3,
    possessionStatus: 'ready_to_move',
    ...over,
  });
  const re = (props: Record<string, unknown>, over: Partial<GenerationPipelineInput> = {}) =>
    base({
      businessName: 'Green Meadows Realty',
      businessCategory: 'real_estate',
      vertical: 'real_estate',
      businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Gachibowli' },
      audience: { localities: ['Gachibowli'] },
      productName: '3BHK in Green Meadows',
      offerPrice: 6500000,
      businessBrain: { verticalProfile: { properties: [props] } } as never,
      ...over,
    });
  const RE =
    '3BHK in Green Meadows by Green Meadows Realty, Gachibowli. ₹65,00,000. WhatsApp 9876543210.';

  it('an honest listing PASSes', () => {
    expect(run(re(listing()), `${RE} Ready to move.`).status).toBe('PASS');
  });

  it('"RERA approved" with no recorded approval FAILs and is named', () => {
    const r = run(re(listing()), `${RE} RERA approved project.`);
    expect(r.status).toBe('FAIL');
    expect(r.summary).toMatch(/rera/i);
  });

  it('a possession date FAILs', () => {
    expect(run(re(listing()), `${RE} Possession in March 2027.`).status).toBe('FAIL');
  });

  it('an unrecorded bathroom count FAILs (previously passed silently)', () => {
    const r = run(re(listing()), `${RE} 3 bathrooms.`);
    expect(r.status).toBe('FAIL');
    expect(r.summary).toMatch(/bathrooms/);
  });

  it('an unrecorded area FAILs, unless the owner wrote it in the listing title', () => {
    expect(run(re(listing()), `${RE} 1,850 sq ft.`).status).toBe('FAIL');
    const stated = re(listing(), { productName: '3BHK 1850 sq ft in Green Meadows' });
    expect(
      run(stated, `${RE} 1850 sq ft.`).checks.some(
        (c) => c.status === 'FAIL' && /area/i.test(c.reason ?? '')
      )
    ).toBe(false);
  });

  it('a bedroom count is allowed when the owner wrote it in the title even if not recorded', () => {
    const noBedrooms = re({ title: '3BHK in Green Meadows', possessionStatus: 'ready_to_move' });
    const r = run(noBedrooms, `${RE} 3 BHK.`);
    expect(r.checks.some((c) => c.status === 'FAIL' && /bedroom/i.test(c.reason ?? ''))).toBe(
      false
    );
    const wrong = run(noBedrooms, `${RE} 5 BHK villa feel.`);
    expect(wrong.checks.some((c) => c.status === 'FAIL' && /bedroom/i.test(c.reason ?? ''))).toBe(
      true
    );
  });
});

describe('phone numbers: an omission is not a claim, an invention is', () => {
  it('honest copy that prints no number PASSes (not_applicable)', () => {
    const r = run(base(), REST);
    const c = r.checks.find((x) => x.category === 'contact' && x.expectedValue === '9876543210')!;
    expect(c.status).toBe('PASS');
    expect(c.basis).toBe('not_applicable');
    expect(r.status).toBe('PASS');
  });

  it('copy that prints the right number PASSes', () => {
    expect(run(base(), `${REST} Call 9876543210.`).status).toBe('PASS');
  });

  it('copy that prints a DIFFERENT number FAILs', () => {
    const r = run(base(), `${REST} Call 9000000001.`);
    expect(r.status).toBe('FAIL');
    expect(r.summary).toMatch(/contact number/i);
  });
});

describe('what intentionally stays REVIEW', () => {
  it('an operational claim the Business Brain does not support (delivery) is reviewed, not blocked', () => {
    const r = run(base(), `${REST} Home delivery available.`);
    expect(r.status).toBe('REVIEW_REQUIRED');
    expect(failing(r)).toEqual([]);
  });

  it('a FAIL summary lists at most three problems and always names the claim', () => {
    const r = run(base(), "Hyderabad's #1 award-winning biryani, 50% off! Call 9000000001.");
    expect(r.status).toBe('FAIL');
    expect(r.summary.split(';').length).toBeLessThanOrEqual(3);
  });
});
