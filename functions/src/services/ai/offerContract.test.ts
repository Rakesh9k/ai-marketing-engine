import {
  PROHIBITED_CLAIM_PHRASES,
  buildOfferContractPrompt,
  dateMentionInWindow,
  dateMentionMatches,
  discountPercentFor,
  extractDateMentions,
  extractQualifiedPrices,
  formatDateForCopy,
  contactNumbersOnFile,
  extractPresentedContactNumbers,
  hasDefinedOpeningHours,
  mentionsHoursClaim,
  deliverySupportedBy,
  offerConceptPresent,
  priceAppears,
  prohibitedPhrasesFor,
} from './offerContract';

/**
 * The offer contract is the single place that says what the copy must state and what Truth Check
 * verifies. Both the copy prompt and Truth Check read it, so they cannot drift apart again: the old
 * Truth Check demanded "NN%", a numeric date and a ₹-first price that the prompt never asked for.
 */

describe('prices: any normal spelling of the same amount', () => {
  it.each([
    '₹999',
    '₹ 999',
    'Rs 999',
    'Rs. 999',
    'Rs.999',
    'INR 999',
    '999 INR',
    '999 inr only',
    '999/-',
    'Rs. 999/-',
    '999 rupees',
    '999 Rs',
  ])('recognises %p as 999', (text) => {
    expect(extractQualifiedPrices(`Biryani for ${text} today`)).toContain(999);
    expect(priceAppears(`Biryani for ${text} today`, 999)).toBe(true);
  });

  it('understands comma grouping and decimals', () => {
    expect(extractQualifiedPrices('₹1,999 and Rs 12,34,567 and ₹249.50')).toEqual([
      1999, 1234567, 249.5,
    ]);
  });

  it('a bare number is NOT a price (no currency, no claim)', () => {
    expect(priceAppears('Serves 4, ready in 30 minutes, 999 reasons to smile', 999)).toBe(false);
    expect(extractQualifiedPrices('Serves 4 in 30 minutes')).toEqual([]);
  });

  it('is exact: a different amount does not match, and a longer number is not a prefix match', () => {
    expect(priceAppears('Only ₹9990', 999)).toBe(false);
    expect(priceAppears('Only ₹399', 999)).toBe(false);
  });

  it('works on the JSON-escaped copy pack Truth Check is given', () => {
    const json = JSON.stringify({ body: 'Fresh\n999 INR\nOrder now' }).toLowerCase();
    expect(priceAppears(json, 999)).toBe(true);
  });

  it('does not read words that merely contain "inr" or "rs" as currency', () => {
    expect(extractQualifiedPrices('5 inroads and 7 orders')).toEqual([]);
  });
});

describe('discount percentage', () => {
  it('is derived only from real facts', () => {
    expect(discountPercentFor(799, 999)).toBe(20);
    expect(discountPercentFor(299, 332)).toBe(10);
  });
  it.each([
    [999, undefined],
    [999, null],
    [999, 0],
    [999, 999],
    [999, 500],
  ])('is null when there is no real discount (%p vs %p)', (price, original) => {
    expect(discountPercentFor(price, original as number | undefined)).toBeNull();
  });
});

describe('dates', () => {
  it('formats the window the way the copy should state it, in India time', () => {
    expect(formatDateForCopy('2026-10-10T00:00:00.000Z')).toBe('10 Oct 2026');
    // local midnight in India sent as UTC the previous evening is still the 10th
    expect(formatDateForCopy('2026-10-09T18:30:00.000Z')).toBe('10 Oct 2026');
    expect(formatDateForCopy('not a date')).toBeNull();
  });

  it.each([
    ['valid till 15 Oct 2026', { day: 15, month: 10, year: 2026 }],
    ['from 10th October to 15th October', { day: 10, month: 10 }],
    ['Oct 15, 2026', { day: 15, month: 10, year: 2026 }],
    ['ends 15 of october', { day: 15, month: 10 }],
    ['valid till 15/10/2026', { day: 15, month: 10, year: 2026 }],
    ['valid 2026-10-15', { day: 15, month: 10, year: 2026 }],
    ['5 sept', { day: 5, month: 9 }],
  ])('finds the date in %p', (text, expected) => {
    expect(extractDateMentions(text)).toContainEqual(expect.objectContaining(expected));
  });

  it('does not mistake ordinary numbers for dates', () => {
    for (const text of [
      'rated 4.5 stars',
      'serves 4-5 people',
      'open 24/7',
      'a 1/2 portion',
      'ready in 20 minutes',
      '₹299.50 only',
      'since 1998',
      'may we suggest the biryani?',
    ]) {
      expect(extractDateMentions(text)).toEqual([]);
    }
  });

  it('matches a mention against the window', () => {
    const start = '2026-10-10T00:00:00.000Z';
    const end = '2026-10-15T00:00:00.000Z';
    expect(dateMentionMatches({ day: 15, month: 10 }, end)).toBe(true);
    expect(dateMentionMatches({ day: 15, month: 10, year: 2025 }, end)).toBe(false);
    expect(dateMentionInWindow({ day: 12, month: 10 }, start, end)).toBe(true);
    expect(dateMentionInWindow({ day: 10, month: 10 }, start, end)).toBe(true);
    expect(dateMentionInWindow({ day: 15, month: 10 }, start, end)).toBe(true);
    expect(dateMentionInWindow({ day: 20, month: 10 }, start, end)).toBe(false);
    expect(dateMentionInWindow({ day: 9, month: 10 }, start, end)).toBe(false);
  });
});

describe('offer-type wording', () => {
  it.each([
    ['bogo', 'Buy one get one free on all biryani'],
    ['bogo', 'BOGO this weekend'],
    ['bogo', '1+1 offer'],
    ['combo', 'Our family combo is back'],
    ['free_delivery', 'Enjoy free delivery within 5 km'],
    ['free_delivery', 'Delivery is free this week'],
    ['loyalty', 'Earn reward points on every order'],
  ])('%s is communicated by %p', (type, text) => {
    expect(offerConceptPresent(text, type)).toBe(true);
  });

  it('is not communicated by unrelated copy', () => {
    expect(offerConceptPresent('Fresh biryani, made daily', 'bogo')).toBe(false);
    expect(offerConceptPresent('Fresh biryani, made daily', 'free_delivery')).toBe(false);
  });
});

describe('prohibited phrases', () => {
  it('is one list with no duplicates', () => {
    expect(new Set(PROHIBITED_CLAIM_PHRASES).size).toBe(PROHIBITED_CLAIM_PHRASES.length);
    expect(PROHIBITED_CLAIM_PHRASES).toEqual(
      expect.arrayContaining(['best in', 'famous', 'guaranteed', 'trusted'])
    );
  });

  it('a free-delivery offer may say "free delivery"; nothing else is exempted', () => {
    const normal = prohibitedPhrasesFor('fixed');
    const freeDelivery = prohibitedPhrasesFor('free_delivery');
    expect(normal).toContain('free delivery');
    expect(freeDelivery).not.toContain('free delivery');
    expect(freeDelivery).not.toContain('free home delivery');
    expect(freeDelivery).toContain('famous');
    expect(freeDelivery.length).toBe(normal.length - 2);
  });
});

describe('prohibited phrases shown per business type', () => {
  it('only phrases that belong to the business are shown; Truth Check still rejects them all', () => {
    const general = buildOfferContractPrompt({
      offerPrice: 99,
      offerType: 'fixed',
      vertical: 'general',
    });
    expect(general.toLowerCase()).not.toContain('restaurant');
    expect(general).not.toContain('best property');
    expect(general).toContain('famous');

    const restaurant = buildOfferContractPrompt({
      offerPrice: 99,
      offerType: 'fixed',
      vertical: 'restaurant',
    });
    expect(restaurant).toContain('best restaurant');
    expect(restaurant).toContain('best food');
    expect(restaurant).not.toContain('best property');

    const realEstate = buildOfferContractPrompt({
      offerPrice: 99,
      offerType: 'fixed',
      vertical: 'real_estate',
    });
    expect(realEstate).toContain('best property');
    expect(realEstate).not.toContain('best restaurant');

    // an unknown vertical behaves like a general business; Truth Check (no vertical given) rejects all
    expect(prohibitedPhrasesFor('fixed')).toEqual(
      expect.arrayContaining(['best restaurant', 'best food', 'best property'])
    );
    expect(prohibitedPhrasesFor('fixed', 'general')).not.toContain('best restaurant');
  });
});

describe('the copy prompt contract', () => {
  const base = { offerPrice: 799, offerType: 'percentage', offerOriginalPrice: 999 };

  it('states the price exactly, rupee sign first', () => {
    const p = buildOfferContractPrompt(base);
    expect(p).toContain('₹799');
    expect(p).toMatch(/no "INR" or "Rs"/i);
  });

  it('asks for the discount only when there really is one (percentage offer, original above price)', () => {
    const p = buildOfferContractPrompt(base);
    expect(p).toContain('20% off');
    expect(p).toContain('₹999');
    expect(buildOfferContractPrompt({ ...base, offerOriginalPrice: undefined })).not.toMatch(
      /\d+% off/
    );
    expect(buildOfferContractPrompt({ ...base, offerOriginalPrice: undefined })).toMatch(
      /do not (write|state) any percentage/i
    );
  });

  it('a fixed-price offer with an original price may show "was ₹X" but never a percentage', () => {
    const p = buildOfferContractPrompt({
      offerPrice: 499,
      offerType: 'fixed',
      offerOriginalPrice: 799,
    });
    expect(p).toContain('₹799');
    expect(p).not.toMatch(/\d+% off/);
    expect(p).toMatch(/do not (write|state) any percentage/i);
  });

  it('never asks for a discount, price or date it was not given', () => {
    const p = buildOfferContractPrompt({});
    expect(p).not.toMatch(/₹\d/);
    expect(p).not.toMatch(/\d+% off/);
    expect(p).toMatch(/no price was provided/i);
    expect(p).toMatch(/do not mention any (specific )?date/i);
  });

  it('gives the validity window pre-formatted and tells the model to use no other date', () => {
    const p = buildOfferContractPrompt({
      ...base,
      validityStart: '2026-10-10T00:00:00.000Z',
      validityEnd: '2026-10-15T00:00:00.000Z',
    });
    expect(p).toContain('10 Oct 2026');
    expect(p).toContain('15 Oct 2026');
    expect(p).toMatch(/no other date/i);
  });

  it('names the offer concept for bogo / combo / free delivery / loyalty', () => {
    expect(buildOfferContractPrompt({ offerPrice: 99, offerType: 'bogo' })).toMatch(
      /buy one get one/i
    );
    expect(buildOfferContractPrompt({ offerPrice: 99, offerType: 'free_delivery' })).toMatch(
      /free delivery/i
    );
  });

  it('lists the prohibited phrases, minus the one the offer itself implies', () => {
    const p = buildOfferContractPrompt(base);
    for (const phrase of ['famous', 'best in', 'guaranteed']) expect(p).toContain(phrase);
    expect(p).toMatch(/rejected automatically/i);
    const free = buildOfferContractPrompt({ offerPrice: 99, offerType: 'free_delivery' });
    expect(free).not.toMatch(/never write[^\n]*free delivery/i);
  });
});

describe('business hours', () => {
  it.each([
    'Open daily 11 am to 11 pm',
    'We close at 10pm',
    'open till late',
    'Open 24/7',
    'Opens at 9',
    'closed on Sundays',
    'Open from Monday to Saturday',
    'our business hours are flexible',
    'check our timings',
    'Open now!',
  ])('%p is a claim about opening hours', (text) => {
    expect(mentionsHoursClaim(text)).toBe(true);
  });

  it.each([
    'Join our open house this Sunday',
    'Just 5 minutes, close to the metro station',
    'Opening soon in Kondapur',
    'a closer look at our menu',
    'Enclosed balcony and open-air terrace',
    'Open for orders on WhatsApp',
    'Fresh biryani, made daily',
  ])('%p is not', (text) => {
    expect(mentionsHoursClaim(text)).toBe(false);
  });

  it('hours are "on file" only when some day is actually open with times', () => {
    expect(hasDefinedOpeningHours(undefined)).toBe(false);
    expect(hasDefinedOpeningHours({})).toBe(false);
    expect(hasDefinedOpeningHours({ openingHours: {} } as never)).toBe(false);
    expect(hasDefinedOpeningHours({ openingHours: { monday: { closed: true } } } as never)).toBe(
      false
    );
    expect(
      hasDefinedOpeningHours({
        openingHours: { monday: { open: '09:00', close: '21:00', closed: false } },
      } as never)
    ).toBe(true);
  });

  it('the prompt forbids stating hours only when none are on file', () => {
    expect(buildOfferContractPrompt({ offerPrice: 99, hoursOnFile: false })).toMatch(
      /no opening hours are on file/i
    );
    expect(buildOfferContractPrompt({ offerPrice: 99, hoursOnFile: true })).not.toMatch(
      /opening hours/i
    );
    expect(buildOfferContractPrompt({ offerPrice: 99 })).not.toMatch(/opening hours/i);
  });
});

describe('delivery support', () => {
  it('a delivery radius or an owner-stated delivery mode supports delivery claims', () => {
    expect(deliverySupportedBy({ deliveryRadiusKm: 5 } as never)).toBe(true);
    expect(deliverySupportedBy({ operatingMode: 'delivery' } as never)).toBe(true);
    expect(deliverySupportedBy({ operatingMode: 'dine-in' } as never)).toBe(false);
    expect(deliverySupportedBy({ deliveryRadiusKm: 0 } as never)).toBe(false);
    expect(deliverySupportedBy(undefined)).toBe(false);
  });
});

describe('contact numbers presented as the business contact', () => {
  it.each([
    ['WhatsApp us at 9876543210', '9876543210'],
    ['WhatsApp us on +91 98765 43210', '9876543210'],
    ['Call 98765-43210 now', '9876543210'],
    ['Phone: +919876543210', '9876543210'],
    ['contact us on 09876543210', '9876543210'],
    ['book at https://wa.me/919876543210?text=hi', '9876543210'],
    ['tel:+919876543210', '9876543210'],
    ['Message us on whatsapp\n98765 43210', '9876543210'],
  ])('finds the number in %p', (text, digits) => {
    expect(extractPresentedContactNumbers(text)).toContain(digits);
  });

  it('ignores digits that are not presented as a contact number', () => {
    for (const text of [
      'Over 9876543210 meals served',
      'Ticket 9123456789 is yours',
      'Since 1998, 20% off, ₹9999',
      'Call us today, ready in 30 minutes',
      'Reference 1234567890 for WhatsApp offers',
    ]) {
      expect(extractPresentedContactNumbers(text)).toEqual([]);
    }
  });

  it('collects the numbers the business actually has, from the input and the Brain, normalised', () => {
    const on = contactNumbersOnFile({
      whatsappNumber: '+91 98765 43210',
      businessPhone: '9123456780',
      businessBrain: { identity: { contact: { phone: '9123456780', whatsapp: '+919876543210' } } },
    } as never);
    expect(on.sort()).toEqual(['9123456780', '9876543210']);
    expect(contactNumbersOnFile({} as never)).toEqual([]);
  });

  it('the prompt names the only number allowed, or says none is on file', () => {
    expect(buildOfferContractPrompt({ offerPrice: 99, contactNumbers: ['9876543210'] })).toMatch(
      /only (phone|number)[^\n]*9876543210/i
    );
    expect(buildOfferContractPrompt({ offerPrice: 99, contactNumbers: [] })).toMatch(
      /no phone or whatsapp number is on file/i
    );
    expect(buildOfferContractPrompt({ offerPrice: 99 })).not.toMatch(/WhatsApp number is on file/i);
  });
});

describe('contact number formats and non-claims (release gate)', () => {
  it.each([
    ['Call +91 98765-43210 to book', '9876543210'],
    ['WhatsApp (+91) 98765 43210', '9876543210'],
    ['Order on WhatsApp: 98765 43210', '9876543210'],
    ['Phone 9876543210.', '9876543210'],
  ])('mixed formats are understood: %p', (text, digits) => {
    expect(extractPresentedContactNumbers(text)).toContain(digits);
  });

  it.each([
    'Rated 4.5 by 9876 customers',
    'Open 10 AM - 10 PM, 7 days a week',
    'Combo for 2: ₹499 (was ₹699)',
    'Since 1998 we have served 1,000,000 plates',
  ])('ordinary numbers in prose are not phone claims: %p', (text) => {
    expect(extractPresentedContactNumbers(text)).toEqual([]);
  });
});
