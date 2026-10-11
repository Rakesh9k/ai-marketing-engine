jest.mock('@/lib/firebase/client', () => ({ getFirebaseDb: jest.fn() }));
jest.mock('firebase/firestore', () => ({}));

import { _extractBusinessRules } from './businessBrainService';

/**
 * The rules handed to the dashboard carried "a minimum order is required" and a 50 km radius for every
 * business, whatever the owner said. Only what the owner gave is carried.
 */
const stored = (rules: Record<string, unknown>) =>
  ({ openingHours: {}, offerValidityRules: '', pricingRules: '', ...rules }) as never;

describe('rules extracted from the Business Brain', () => {
  it('carry only the delivery facts the owner gave', () => {
    const rules = _extractBusinessRules(stored({ deliveryRadiusKm: 7, minimumOrder: 250 }));
    expect(rules.availability.deliveryRadiusKm).toBe(7);
    expect(rules.availability.minimumOrderRequired).toBe(true);
  });

  it('an explicit minimum of zero means no minimum; absent means unknown', () => {
    expect(
      _extractBusinessRules(stored({ minimumOrder: 0 })).availability.minimumOrderRequired
    ).toBe(false);
    const unknown = _extractBusinessRules(stored({})).availability;
    expect(unknown).not.toHaveProperty('minimumOrderRequired');
    expect(unknown).not.toHaveProperty('deliveryRadiusKm');
  });

  it('with no Business Brain at all, nothing about delivery or minimum order is claimed', () => {
    const { availability } = _extractBusinessRules(undefined);
    expect(availability).not.toHaveProperty('minimumOrderRequired');
    expect(availability).not.toHaveProperty('deliveryRadiusKm');
    expect(JSON.stringify(availability)).not.toMatch(/50|true/);
  });
});
