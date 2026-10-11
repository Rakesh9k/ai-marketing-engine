/**
 * Drift guard. The callable's offer validator (functions/src/utils/offerValidation.ts) is the authority; the
 * wizard uses a copy (src/lib/validation/offerValidation.ts) so it can show the same rules beside the offending
 * field. The functions package deploys alone, so the code cannot be a single shared import; instead ONE generated
 * case table, covering every boundary, is run through BOTH and the results (field keys AND messages) must be equal.
 */
import { describe, it, expect } from '@jest/globals';
import * as backend from '../functions/src/utils/offerValidation';
import * as frontend from '@/lib/validation/offerValidation';

const prices = [0, -1, 1, 99, 99.5, 100, 249, 299, 299.5, 300, 10.999, 1e9, 1e9 + 1, NaN, Infinity];
const originals = [undefined, 0, 50, 99, 100, 249, 299, 300, 399, 1000, 200.123, NaN];
const types = ['fixed', 'percentage', 'combo', 'bogo'];
const D = (d: string) => `2026-10-${d}T00:00:00.000Z`;
const validity: Array<[string | undefined, string | undefined]> = [
  [undefined, undefined],
  [D('11'), D('14')], // inside the window
  [D('15'), D('10')], // reversed
  [D('12'), D('12')], // end == start
  [undefined, D('09')], // over before the campaign starts
  [undefined, D('10')], // ends exactly when the campaign starts
  [D('12'), undefined],
];
const windows = [
  { start: D('10'), end: D('15') },
  { start: D('15'), end: D('10') }, // reversed
  { start: D('10'), end: D('10') }, // zero length
  { start: '', end: '' },
];

describe('frontend and backend offer validators agree exactly', () => {
  it('validateOffer: identical errors (keys and messages) across the whole case table', () => {
    let compared = 0;
    for (const price of prices)
      for (const originalPrice of originals)
        for (const type of types)
          for (const [validityStart, validityEnd] of validity)
            for (const w of windows) {
              const offer = { price, originalPrice, type, validityStart, validityEnd };
              expect(frontend.validateOffer(offer, w)).toEqual(backend.validateOffer(offer, w));
              compared++;
            }
    expect(compared).toBeGreaterThan(10000);
  });

  it('validateAgainstCatalog: identical across catalogue prices', () => {
    for (const catalogPrice of [undefined, 0, 100, 200, 200.004, 200.01, 250, NaN])
      for (const originalPrice of originals)
        for (const type of types)
          for (const price of [100, 160]) {
            const offer = { type, originalPrice, price };
            expect(frontend.validateAgainstCatalog(offer, catalogPrice)).toEqual(
              backend.validateAgainstCatalog(offer, catalogPrice)
            );
          }
  });

  it('helpers and constants are identical', () => {
    expect(frontend.MAX_PRICE_INR).toBe(backend.MAX_PRICE_INR);
    for (const p of [1, 99, 160, 299])
      for (const o of [undefined, 100, 200, 300])
        expect(frontend.statedDiscountPercent(p, o)).toBe(backend.statedDiscountPercent(p, o));
    const e = { 'offer.price': ['a'], 'offer.originalPrice': ['b'] };
    expect(frontend.firstMessage(e)).toBe(backend.firstMessage(e));
    expect(frontend.firstMessage({})).toBe(backend.firstMessage({}));
  });
});
