import {
  validateOffer,
  validateAgainstCatalog,
  statedDiscountPercent,
  firstMessage,
  MAX_PRICE_INR,
} from './offerValidation';

const WINDOW = { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' };
const ok = (over: Record<string, unknown> = {}) =>
  validateOffer({ price: 299, type: 'fixed', ...over } as never, WINDOW);

describe('a valid offer produces no errors', () => {
  it('fixed price, no original price, no dates', () => {
    expect(ok()).toEqual({});
  });
  it('percentage with a real discount', () => {
    expect(ok({ type: 'percentage', price: 160, originalPrice: 200 })).toEqual({});
  });
  it('validity dates inside the campaign window', () => {
    expect(
      ok({ validityStart: '2026-10-11T00:00:00.000Z', validityEnd: '2026-10-14T00:00:00.000Z' })
    ).toEqual({});
  });
});

describe('original vs offer price', () => {
  it('rejects an original price BELOW the offer price (any offer type)', () => {
    for (const type of ['percentage', 'fixed', 'combo']) {
      const e = ok({ type, price: 299, originalPrice: 249 });
      expect(e['offer.originalPrice']?.[0]).toMatch(/lower than the offer price/);
    }
  });

  it('boundary: original == price is fine for a non-discount offer but rejected for a percentage offer', () => {
    expect(ok({ type: 'fixed', price: 299, originalPrice: 299 })).toEqual({});
    expect(
      ok({ type: 'percentage', price: 299, originalPrice: 299 })['offer.originalPrice']?.[0]
    ).toMatch(/no discount to state/);
  });

  it('boundary: a 1% discount is the smallest accepted; under 1% is rejected', () => {
    expect(statedDiscountPercent(99, 100)).toBe(1);
    expect(ok({ type: 'percentage', price: 99, originalPrice: 100 })).toEqual({});
    expect(
      ok({ type: 'percentage', price: 999.5, originalPrice: 1000 })['offer.originalPrice']?.[0]
    ).toMatch(/under 1%/);
  });

  it('a very large discount is still a valid calculation', () => {
    expect(ok({ type: 'percentage', price: 1, originalPrice: 1000 })).toEqual({});
  });
});

describe('price fields', () => {
  it.each([0, -5, NaN, Infinity, MAX_PRICE_INR + 1, 10.999])(
    'rejects an invalid price %p',
    (price) => {
      expect(ok({ price })['offer.price']).toBeDefined();
    }
  );
  it('accepts up to 2 decimals and the maximum', () => {
    expect(ok({ price: 299.5 })).toEqual({});
    expect(ok({ price: MAX_PRICE_INR })).toEqual({});
  });
  it('rejects an invalid original price', () => {
    expect(
      ok({ type: 'percentage', price: 100, originalPrice: -1 })['offer.originalPrice']
    ).toBeDefined();
    expect(
      ok({ type: 'percentage', price: 100, originalPrice: 200.123 })['offer.originalPrice']
    ).toBeDefined();
  });
});

describe('dates', () => {
  it('rejects an offer whose end is before its start', () => {
    const e = ok({
      validityStart: '2026-10-15T00:00:00.000Z',
      validityEnd: '2026-10-10T00:00:00.000Z',
    });
    expect(e['offer.validityEnd']?.[0]).toMatch(/earlier than its start/);
  });
  it('boundary: end == start is allowed', () => {
    const d = '2026-10-12T00:00:00.000Z';
    expect(ok({ validityStart: d, validityEnd: d })).toEqual({});
  });
  it('rejects a campaign whose end is before its start', () => {
    const e = validateOffer(
      { price: 299, type: 'fixed' },
      { start: WINDOW.end, end: WINDOW.start }
    );
    expect(e['duration.end']?.[0]).toMatch(/campaign end date/);
  });
  it('boundary: campaign end == start is allowed', () => {
    expect(
      validateOffer({ price: 299, type: 'fixed' }, { start: WINDOW.start, end: WINDOW.start })
    ).toEqual({});
  });
  it('rejects an offer that is over before the campaign starts; allows ending exactly at the start', () => {
    expect(ok({ validityEnd: '2026-10-09T23:59:59.000Z' })['offer.validityEnd']?.[0]).toMatch(
      /ends before the campaign starts/
    );
    expect(ok({ validityEnd: WINDOW.start })).toEqual({});
  });
  it('a single validity date on its own is not a contradiction', () => {
    expect(ok({ validityEnd: '2026-10-12T00:00:00.000Z' })).toEqual({});
    expect(ok({ validityStart: '2026-10-12T00:00:00.000Z' })).toEqual({});
  });
});

describe('catalogue (Business Brain) conflict', () => {
  const pct = { type: 'percentage', price: 160, originalPrice: 200 };
  it('a "was" price that differs from the catalogue price is rejected', () => {
    const e = validateAgainstCatalog(pct, 250);
    expect(e['offer.originalPrice']?.[0]).toMatch(
      /does not match this product's price in your catalogue/
    );
    expect(firstMessage(e)).toMatch(/₹200/);
  });
  it('matching the catalogue is fine', () => {
    expect(validateAgainstCatalog(pct, 200)).toEqual({});
  });
  it('only applies to a percentage offer that states an original price', () => {
    expect(validateAgainstCatalog({ type: 'fixed', price: 160, originalPrice: 200 }, 250)).toEqual(
      {}
    );
    expect(validateAgainstCatalog({ type: 'percentage', price: 160 }, 250)).toEqual({});
    expect(validateAgainstCatalog(pct, undefined)).toEqual({});
  });
});
