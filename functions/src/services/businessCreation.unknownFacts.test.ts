import { buildBusiness, createBusinessSchema } from './businessCreation';

/**
 * Unknown is not zero and not a reasonable default. createBusiness used to store deliveryRadiusKm 5 and
 * minimumOrder 0 whenever the owner gave none, in the Business Brain and in the business settings. Those
 * became business facts the copy could state ("we deliver within 5 km", "no minimum order") that the owner
 * never said. A fact the owner did not give stays absent.
 */
const NOW = '2026-10-05T00:00:00.000Z';
const base = {
  name: 'Glow Studio',
  category: 'general' as const,
  location: { country: 'India', state: 'Maharashtra', city: 'Pune' },
  contact: { phone: '+919822012345', whatsapp: '+919822012345' },
};
const build = (extra: Record<string, unknown> = {}) =>
  buildBusiness(createBusinessSchema.parse({ ...base, ...extra }), 'u1', 'b1', NOW);

describe('a business created without delivery facts', () => {
  it('stores no delivery radius and no minimum order, anywhere', () => {
    const business = build();
    const rules = business.businessBrain.businessRules as unknown as Record<string, unknown>;
    expect(rules).not.toHaveProperty('deliveryRadiusKm');
    expect(rules).not.toHaveProperty('minimumOrder');
    expect(business.settings).not.toHaveProperty('deliveryRadiusKm');
    expect(business.settings).not.toHaveProperty('minimumOrder');
  });

  it('settings submitted without those fields are the same', () => {
    const business = build({ settings: { timezone: 'Asia/Kolkata', currency: 'INR' } });
    const rules = business.businessBrain.businessRules as unknown as Record<string, unknown>;
    expect(rules).not.toHaveProperty('deliveryRadiusKm');
    expect(rules).not.toHaveProperty('minimumOrder');
    expect(business.settings).not.toHaveProperty('deliveryRadiusKm');
    expect(business.settings).not.toHaveProperty('minimumOrder');
  });

  it('nothing in the stored business says 5 km or a zero minimum', () => {
    const json = JSON.stringify(build());
    expect(json).not.toMatch(/"deliveryRadiusKm"/);
    expect(json).not.toMatch(/"minimumOrder"/);
  });
});

describe('delivery facts the owner DID give are stored exactly', () => {
  it('in the Business Brain and the settings', () => {
    const business = build({
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        deliveryRadiusKm: 7,
        minimumOrder: 250,
      },
    });
    expect(business.businessBrain.businessRules.deliveryRadiusKm).toBe(7);
    expect(business.businessBrain.businessRules.minimumOrder).toBe(250);
    expect(business.settings.deliveryRadiusKm).toBe(7);
    expect(business.settings.minimumOrder).toBe(250);
  });
});

describe('operating mode: unknown stays unknown', () => {
  it('a business created without one stores none (no silent "dine-in")', () => {
    const rules = build().businessBrain.businessRules as unknown as Record<string, unknown>;
    expect(rules).not.toHaveProperty('operatingMode');
  });

  it.each(['dine-in', 'takeaway', 'delivery'] as const)('a mode the owner gave (%s) is stored as given', (mode) => {
    const rules = build({ operatingMode: mode }).businessBrain.businessRules;
    expect(rules.operatingMode).toBe(mode);
  });
});

describe('SYSTEM_DEFAULT paths stay in step with what buildBusiness really stores', () => {
  const { SYSTEM_DEFAULT_PATHS } = jest.requireActual('../onboarding/brainMapping') as {
    SYSTEM_DEFAULT_PATHS: string[];
  };
  const valueAt = (root: unknown, path: string) =>
    path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], root);

  it('every path marked as a default holds a value in a freshly built Brain (so the marking is true)', () => {
    const brain = build().businessBrain;
    for (const path of SYSTEM_DEFAULT_PATHS) {
      expect({ path, value: valueAt(brain, path) }).not.toEqual({ path, value: undefined });
    }
  });
});
