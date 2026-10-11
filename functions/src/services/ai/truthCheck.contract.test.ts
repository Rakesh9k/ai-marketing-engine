import { runDeterministicTruthCheck } from './truthCheck';
import type { GenerationPipelineInput, TruthCheckItem } from '../../types';

/**
 * The Truth Check side of the offer contract (see offerContract.ts). Truth Check verifies what the
 * copy prompt actually asks for — no more:
 *   - the same price/discount/date is accepted however it is normally written, but stays exact;
 *   - a fact the campaign does not have is never demanded;
 *   - a MISSING required statement is reported differently from an INVALID claim.
 */

const WINDOW = {
  offerValidityStart: '2026-10-10T00:00:00.000Z',
  offerValidityEnd: '2026-10-15T00:00:00.000Z',
};

function input(over: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput {
  return {
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'The Higher Taste',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessBrain: {} as never,
    brandProfile: {},
    objective: 'weekend_offer',
    productId: 'p1',
    productName: 'Spring Roll',
    offerHeadline: 'Weekend Special',
    offerPrice: 180,
    offerType: 'fixed',
    ...WINDOW,
    duration: { start: WINDOW.offerValidityStart, end: WINDOW.offerValidityEnd },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {} as never,
    campaignStyle: 'funny',
    ...over,
  } as GenerationPipelineInput;
}

const BASE_COPY =
  'The Higher Taste in Kondapur, Hyderabad. Crispy Spring Roll, WhatsApp 9876543210.';
const run = (i: GenerationPipelineInput, text: string) =>
  runDeterministicTruthCheck(i, {
    businessUnderstanding: { businessFacts: [] },
    productUnderstanding: { productFacts: [] },
    copyPack: { headline: text },
  });
const item = (
  r: ReturnType<typeof run>,
  category: string,
  match?: RegExp
): TruthCheckItem | undefined =>
  r.checks.find((c) => c.category === category && (!match || match.test(c.reason ?? '')));
const items = (r: ReturnType<typeof run>, category: string) =>
  r.checks.filter((c) => c.category === category);

describe('a campaign that follows the contract passes', () => {
  it('fixed price, no discount, with a validity window', () => {
    const r = run(input(), `${BASE_COPY} Just ₹180 only. Valid 10 Oct 2026 to 15 Oct 2026.`);
    expect(r.status).toBe('PASS');
    expect(r.checks.filter((c) => c.status === 'FAIL')).toEqual([]);
  });

  it('percentage offer with an original price', () => {
    const r = run(
      input({ offerType: 'percentage', offerPrice: 160, offerOriginalPrice: 200 }),
      `${BASE_COPY} Now ₹160, was ₹200: 20% off. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    expect(r.status).toBe('PASS');
  });
});

describe('price: any normal spelling, always exact', () => {
  it.each(['180 INR', 'Rs. 180', 'Rs 180/-', 'INR 180', '180 rupees', '₹ 180'])(
    '%s satisfies a ₹180 offer',
    (spelling) => {
      const r = run(input(), `${BASE_COPY} Only ${spelling}. Valid 10 Oct 2026 to 15 Oct 2026.`);
      expect(item(r, 'price')!.status).toBe('PASS');
      expect(r.status).toBe('PASS');
    }
  );

  it('a different amount in any spelling still FAILS', () => {
    for (const wrong of ['150 INR', 'Rs. 150', '₹150']) {
      const r = run(input(), `${BASE_COPY} Only ${wrong}. Valid 10 Oct 2026 to 15 Oct 2026.`);
      expect(item(r, 'price')!.status).toBe('FAIL');
      expect(r.status).toBe('FAIL');
    }
  });

  it('no price at all in the copy still FAILS', () => {
    expect(item(run(input(), `${BASE_COPY} Come hungry.`), 'price')!.status).toBe('FAIL');
  });
});

describe('discount', () => {
  const pct = (over = {}) =>
    input({ offerType: 'percentage', offerPrice: 160, offerOriginalPrice: 200, ...over });

  it('stating the real discount passes; leaving it out fails (the prompt asks for it)', () => {
    expect(
      item(
        run(pct(), `${BASE_COPY} ₹160, was ₹200, 20% off. Valid 10 Oct 2026 to 15 Oct 2026.`),
        'offer',
        /discount|percentage/i
      )!.status
    ).toBe('PASS');
    const missing = run(
      pct(),
      `${BASE_COPY} Now ₹160, was ₹200. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    expect(
      items(missing, 'offer').some((c) => c.status === 'FAIL' && /20%/.test(c.reason ?? ''))
    ).toBe(true);
  });

  it('an invented extra percentage still FAILS', () => {
    const r = run(
      pct(),
      `${BASE_COPY} ₹160, was ₹200, 20% off, plus 50% more. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    expect(r.status).toBe('FAIL');
  });

  it('a percentage offer WITHOUT an original price is missing information, not a failed claim', () => {
    const r = run(
      input({
        offerType: 'percentage',
        offerPrice: 160,
        offerOriginalPrice: undefined,
        offerHeadline: 'Festival Offer',
      }),
      `${BASE_COPY} Now only ₹160. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    const offer = item(r, 'offer', /original price|discount/i)!;
    expect(offer.status).toBe('REVIEW_REQUIRED');
    expect(offer.basis).toBe('missing_input');
    expect(r.checks.some((c) => c.status === 'FAIL')).toBe(false);
  });

  it('a fixed-price offer never needs a percentage, and one that appears is flagged', () => {
    const ok = run(input(), `${BASE_COPY} ₹180. Valid 10 Oct 2026 to 15 Oct 2026.`);
    expect(ok.status).toBe('PASS');
    const bad = run(input(), `${BASE_COPY} ₹180, 30% off! Valid 10 Oct 2026 to 15 Oct 2026.`);
    expect(bad.status).not.toBe('PASS');
  });
});

describe('concept offers (bogo / combo / free delivery / loyalty)', () => {
  const cases: Array<[string, string, string]> = [
    ['bogo', 'Buy one get one on every roll', 'Fresh rolls, made daily'],
    ['combo', 'Try our family combo', 'Fresh rolls, made daily'],
    ['loyalty', 'Earn reward points with every order', 'Fresh rolls, made daily'],
    ['free_delivery', 'Enjoy free delivery in Kondapur', 'Fresh rolls, made daily'],
  ];
  it.each(cases)('%s: communicating the concept passes, omitting it fails', (type, good, bad) => {
    const i = input({ offerType: type as never, offerHeadline: 'Something Special' });
    const tail = ' ₹180. Valid 10 Oct 2026 to 15 Oct 2026.';
    expect(item(run(i, `${BASE_COPY} ${good}.${tail}`), 'offer', /offer|communicat/i)!.status).toBe(
      'PASS'
    );
    expect(
      run(i, `${BASE_COPY} ${bad}.${tail}`).checks.some(
        (c) => c.category === 'offer' && c.status === 'FAIL'
      )
    ).toBe(true);
  });

  it("the owner's own headline, quoted, also counts", () => {
    const i = input({ offerType: 'combo', offerHeadline: 'Triple Treat Box' });
    const r = run(
      i,
      `${BASE_COPY} Grab the Triple Treat Box for ₹180. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    expect(r.checks.some((c) => c.category === 'offer' && c.status === 'FAIL')).toBe(false);
  });

  it('a free-delivery offer may say "free delivery"; any other offer may not', () => {
    const tail = ' ₹180. Valid 10 Oct 2026 to 15 Oct 2026.';
    const free = run(
      input({ offerType: 'free_delivery' }),
      `${BASE_COPY} Free delivery today.${tail}`
    );
    expect(item(free, 'claim')!.status).toBe('PASS');
    const other = run(input(), `${BASE_COPY} Free delivery today.${tail}`);
    expect(item(other, 'claim')!.status).toBe('FAIL');
  });
});

describe('validity dates', () => {
  it('no dates in the input: nothing is demanded and nothing is flagged', () => {
    const r = run(
      input({ offerValidityStart: undefined, offerValidityEnd: undefined }),
      `${BASE_COPY} ₹180.`
    );
    const v = r.checks.find(
      (c) => c.category === 'offer' && /validity|window|dates/i.test(c.reason ?? '')
    )!;
    expect(v.status).toBe('PASS');
    expect(v.basis).toBe('not_applicable');
    expect(r.status).toBe('PASS');
  });

  it.each([
    'Valid 10 Oct 2026 to 15 Oct 2026',
    'valid till 15th October',
    'from 10/10/2026 to 15/10/2026',
    'Oct 15, 2026',
  ])('stating the window as "%s" is recognised', (phrase) => {
    const r = run(input(), `${BASE_COPY} ₹180. ${phrase}.`);
    const v = r.checks.find(
      (c) => c.category === 'offer' && /validity|window|dates/i.test(c.reason ?? '')
    )!;
    expect(v.status).toBe('PASS');
  });

  it('a window that is never stated is a missing statement, not an invalid claim', () => {
    const r = run(input(), `${BASE_COPY} ₹180.`);
    const v = r.checks.find(
      (c) => c.category === 'offer' && /validity|window|dates/i.test(c.reason ?? '')
    )!;
    expect(v.status).toBe('REVIEW_REQUIRED');
    expect(v.basis).toBe('required_mention_missing');
  });

  it('a date OUTSIDE the window is an invalid claim and FAILS', () => {
    const r = run(input(), `${BASE_COPY} ₹180. Valid till 31 Oct 2026.`);
    const v = r.checks.find((c) => c.category === 'offer' && c.basis === 'invalid_claim')!;
    expect(v.status).toBe('FAIL');
    expect(r.status).toBe('FAIL');
  });

  it('a date inside the window is fine', () => {
    const r = run(
      input(),
      `${BASE_COPY} ₹180. Special on Sunday 12 Oct. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    expect(r.status).toBe('PASS');
  });

  it('ordinary numbers are not mistaken for dates', () => {
    const r = run(
      input(),
      `${BASE_COPY} ₹180. Rated 4.5 stars by 4-5 friends. Valid 10 Oct 2026 to 15 Oct 2026.`
    );
    expect(r.checks.some((c) => c.basis === 'invalid_claim')).toBe(false);
  });
});

describe('what must still fail (the contract does not weaken Truth Check)', () => {
  const tail = ' ₹180. Valid 10 Oct 2026 to 15 Oct 2026.';
  it.each(['best in town', 'famous biryani', 'guaranteed fresh', 'trusted by all', '100% fresh'])(
    'prohibited phrase %p',
    (phrase) => {
      expect(run(input(), `${BASE_COPY} ${phrase}.${tail}`).status).toBe('FAIL');
    }
  );
  it('missing business name', () => {
    expect(run(input(), `Crispy Spring Roll in Kondapur, WhatsApp 9876543210.${tail}`).status).toBe(
      'FAIL'
    );
  });
});

describe('every check says why it did not pass', () => {
  it('missing-input and missing-statement items carry a basis; claims that were wrong are FAIL', () => {
    const r = run(
      input({ offerType: 'percentage', offerPrice: 160, offerOriginalPrice: undefined }),
      `${BASE_COPY} ₹160.`
    );
    for (const c of r.checks.filter(
      (x) => x.status === 'REVIEW_REQUIRED' && x.category === 'offer'
    )) {
      expect(c.basis).toBeDefined();
    }
  });
});

describe('operations claims are checked as claims, not as words', () => {
  const ops = (r: ReturnType<typeof run>) => r.checks.filter((c) => c.category === 'operations');
  const tail = ' ₹180. Valid 10 Oct 2026 to 15 Oct 2026.';

  it('"open house" and "close to the metro" are not opening-hours claims', () => {
    const r = run(input(), `${BASE_COPY} Join our open house, close to the metro.${tail}`);
    expect(ops(r).every((c) => c.status === 'PASS')).toBe(true);
    expect(r.status).toBe('PASS');
  });

  it('an invented opening time is still flagged when no hours are on file', () => {
    for (const claim of ['Open daily till 11 pm', 'We close at 10pm', 'Open 11 am to 11 pm']) {
      const r = run(input(), `${BASE_COPY} ${claim}.${tail}`);
      expect(ops(r).some((c) => c.status !== 'PASS' && /hours/i.test(c.reason ?? ''))).toBe(true);
      expect(r.status).not.toBe('PASS');
    }
  });

  it('the same claim passes when the owner has real hours on file', () => {
    const withHours = input({
      businessBrain: {
        businessRules: {
          openingHours: { monday: { open: '11:00', close: '23:00', closed: false } },
        },
      } as never,
    });
    const r = run(withHours, `${BASE_COPY} Open daily till 11 pm.${tail}`);
    expect(ops(r).some((c) => /hours/i.test(c.reason ?? '') && c.status !== 'PASS')).toBe(false);
  });

  it('a delivery-only business (cloud kitchen) may say it delivers', () => {
    const cloudKitchen = input({
      businessBrain: { businessRules: { operatingMode: 'delivery' } } as never,
    });
    const r = run(cloudKitchen, `${BASE_COPY} Home delivery across Kondapur.${tail}`);
    expect(ops(r).every((c) => c.status === 'PASS')).toBe(true);
  });

  it('but "delivery mode" does not support a distance: a radius claim needs a radius on file', () => {
    const cloudKitchen = input({
      businessBrain: { businessRules: { operatingMode: 'delivery' } } as never,
    });
    const r = run(cloudKitchen, `${BASE_COPY} We deliver within 5 km of Kondapur.${tail}`);
    expect(
      ops(r).some((c) => c.status === 'REVIEW_REQUIRED' && /radius/i.test(c.reason ?? ''))
    ).toBe(true);
    const withRadius = input({
      businessBrain: { businessRules: { operatingMode: 'delivery', deliveryRadiusKm: 5 } } as never,
    });
    const ok = run(withRadius, `${BASE_COPY} We deliver within 5 km of Kondapur.${tail}`);
    expect(ops(ok).every((c) => c.status === 'PASS')).toBe(true);
  });

  it('a business with no delivery fact still cannot claim delivery', () => {
    const r = run(input(), `${BASE_COPY} Home delivery across Kondapur.${tail}`);
    expect(ops(r).some((c) => c.status === 'REVIEW_REQUIRED')).toBe(true);
  });
});

describe("a contact number presented as the business contact must be the business's own", () => {
  const tail = ' ₹180. Valid 10 Oct 2026 to 15 Oct 2026.';
  const copyWith = (contact: string) =>
    'The Higher Taste in Kondapur, Hyderabad. Crispy Spring Roll. ' + contact + tail;
  const contactClaim = (r: ReturnType<typeof run>) =>
    r.checks.find(
      (c) => c.category === 'contact' && /presents|presented|contact number/i.test(c.reason ?? '')
    );

  it('a different WhatsApp number presented as the contact is an invalid claim: FAIL', () => {
    const r = run(input(), copyWith('WhatsApp us at 9123456789.'));
    expect(contactClaim(r)!.status).toBe('FAIL');
    expect(contactClaim(r)!.basis).toBe('invalid_claim');
    expect(r.status).toBe('FAIL');
  });

  it.each([
    'WhatsApp us at 9876543210',
    'WhatsApp +91 98765 43210',
    'Call 98765-43210',
    'https://wa.me/919876543210',
  ])('the right number in the form %p passes', (contact) => {
    const r = run(input(), copyWith(contact + '.'));
    expect(contactClaim(r)!.status).toBe('PASS');
    expect(r.status).toBe('PASS');
  });

  it('the business phone and its WhatsApp number may differ; both are its own', () => {
    const i = input({ businessPhone: '9123456780' });
    const r = run(i, copyWith('WhatsApp 9876543210 or call 9123456780.'));
    expect(contactClaim(r)!.status).toBe('PASS');
  });

  it("numbers on file in the Business Brain count as the business's own", () => {
    const i = input({
      whatsappNumber: '',
      businessBrain: { identity: { contact: { whatsapp: '+919876543210' } } } as never,
    });
    expect(contactClaim(run(i, copyWith('WhatsApp 9876543210.')))!.status).toBe('PASS');
  });

  it('a number with no contact cue is not treated as a contact claim', () => {
    const r = run(input(), copyWith('WhatsApp 9876543210. Over 9123456789 meals served.'));
    expect(contactClaim(r)!.status).toBe('PASS');
    expect(r.status).toBe('PASS');
  });

  it('a business with NO number on file cannot present one (that would be invented)', () => {
    const i = input({ whatsappNumber: '', businessBrain: {} as never });
    const r = run(i, copyWith('WhatsApp us at 9123456789.'));
    expect(contactClaim(r)!.status).toBe('FAIL');
  });

  it('no number presented: nothing is demanded by this check', () => {
    const r = run(input(), copyWith('Order on WhatsApp.'));
    expect(contactClaim(r)!.status).toBe('PASS');
    expect(contactClaim(r)!.basis).toBe('not_applicable');
  });

  it('leaving the number out is NOT flagged: honest copy that prints no number makes no contact claim', () => {
    const r = run(input(), copyWith('Order on WhatsApp.'));
    const whatsapp = r.checks.find(
      (c) => c.category === 'contact' && c.expectedValue === '9876543210'
    )!;
    expect(whatsapp.status).toBe('PASS');
    expect(whatsapp.basis).toBe('not_applicable');
    expect(r.status).toBe('PASS');
  });
});

describe('copy stays in the languages the owner asked for', () => {
  const tail = ' ₹180. Valid 10 Oct 2026 to 15 Oct 2026.';
  const withLocale = (primaryLanguage: string) =>
    input({ localizationProfile: { primaryLanguage } as never });
  const langItem = (r: ReturnType<typeof run>) =>
    r.checks.find((c) => c.category === 'claim' && /language/i.test(c.reason ?? ''));

  it('a native script nobody asked for is an invalid claim: FAIL', () => {
    const r = run(withLocale('hi_en'), `${BASE_COPY} మీ కోసం ప్రత్యేక ఆఫర్.${tail}`);
    expect(langItem(r)!.status).toBe('FAIL');
    expect(langItem(r)!.basis).toBe('invalid_claim');
    expect(r.status).toBe('FAIL');
  });

  it('distinctive romanised Telugu in a business that did not ask for Telugu needs review', () => {
    const r = run(withLocale('hi_en'), `${BASE_COPY} WhatsApp cheyyandi!${tail}`);
    expect(langItem(r)!.status).toBe('REVIEW_REQUIRED');
    expect(r.status).not.toBe('PASS');
  });

  it('the same copy is fine for a Telugu + English business', () => {
    const r = run(withLocale('te_en'), `${BASE_COPY} WhatsApp cheyyandi! మీ కోసం.${tail}`);
    expect(langItem(r)).toBeUndefined();
    expect(r.status).toBe('PASS');
  });

  it('Hindi script is fine when Hindi was asked for, and is a leak for English-only', () => {
    expect(langItem(run(withLocale('hi_en'), `${BASE_COPY} आज ही आइए.${tail}`))).toBeUndefined();
    expect(langItem(run(withLocale('en'), `${BASE_COPY} आज ही आइए.${tail}`))!.status).toBe('FAIL');
  });

  it("when the owner's localisation is unknown nothing is claimed", () => {
    expect(langItem(run(input(), `${BASE_COPY} మీ కోసం.${tail}`))).toBeUndefined();
  });

  it('ordinary English and Hinglish copy raises nothing', () => {
    const r = run(
      withLocale('hi_en'),
      `${BASE_COPY} Aaj ka special, ekdum mast! Madison style.${tail}`
    );
    expect(langItem(r)).toBeUndefined();
    expect(r.status).toBe('PASS');
  });
});
