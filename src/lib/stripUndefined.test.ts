import { stripUndefined } from './stripUndefined';

describe('stripUndefined', () => {
  it('drops undefined fields (deeply) so Firestore accepts a product with no compare-at price', () => {
    expect(
      stripUndefined({
        name: 'Veg Biryani',
        price: 299,
        originalPrice: undefined,
        attributes: { veg: true, spice: undefined },
      })
    ).toEqual({ name: 'Veg Biryani', price: 299, attributes: { veg: true } });
  });

  it('keeps null, 0, empty strings and arrays', () => {
    expect(stripUndefined({ a: null, b: 0, c: '', d: [1, undefined, { e: undefined }] })).toEqual({
      a: null,
      b: 0,
      c: '',
      d: [1, undefined, {}],
    });
  });
});
