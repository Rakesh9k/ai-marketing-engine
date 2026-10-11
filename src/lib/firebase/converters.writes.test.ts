import { productConverter } from './converters';
import type { Product } from '@/types';

describe('converters never write undefined (Firestore rejects it)', () => {
  it('a product saved without a compare-at price or description is writable', () => {
    const product = {
      productId: 'p1',
      businessId: 'b1',
      name: 'Veg Biryani',
      price: 299,
      originalPrice: undefined,
      description: undefined,
      category: 'biryani',
      currency: 'INR',
      tags: [],
      variants: [],
      images: [],
      attributes: { veg: true },
      status: 'active',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Product;
    const data = productConverter.toFirestore(product) as Record<string, unknown>;
    expect('originalPrice' in data).toBe(false);
    expect(Object.values(data).some((v) => v === undefined)).toBe(false);
    expect(data['price']).toBe(299);
  });
});
