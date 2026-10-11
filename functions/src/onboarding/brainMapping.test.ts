import { BrainMappingError, SYSTEM_DEFAULT_PATHS, toBusinessCreation } from './brainMapping';
import { applySystemFacts, applyUserAnswers, normalizeDraft } from './draftModel';
import { buildBusiness } from '../services/businessCreation';
import { DELIVERY_FIRST_SUBCATEGORIES } from './draftFields';

const T = '2026-10-04T10:00:00.000Z';

const answers = (over: Record<string, unknown> = {}) => {
  const base: Record<string, unknown> = {
    'owner.name': 'Asha',
    'owner.role': 'founder',
    'identity.industry': 'fitness',
    'identity.subcategory': 'yoga',
    'identity.name': 'Prana Yoga Studio',
    'identity.city': 'Hyderabad',
    'identity.state': 'Telangana',
    'contact.whatsapp': '98765 43210',
    ...over,
  };
  const updates = Object.entries(base)
    .filter(([, v]) => v !== undefined)
    .map(([path, value]) => ({ path, value }));
  return applyUserAnswers(null, 'u1', { updates }, T);
};

const plan = (over: Record<string, unknown> = {}, explicitPhone?: string) =>
  toBusinessCreation(normalizeDraft(answers(over)), T, explicitPhone);

describe('toBusinessCreation — general vertical', () => {
  it('serves a non-restaurant/salon/real-estate business as `general`, never forced into another vertical', () => {
    for (const industry of [
      'retail',
      'fitness',
      'education',
      'health_wellness',
      'home_services',
      'other',
    ]) {
      expect(plan({ 'identity.industry': industry }).data.category).toBe('general');
    }
  });

  it('still maps the three specialised industries to their own verticals', () => {
    expect(
      plan({ 'identity.industry': 'restaurant_food', 'identity.subcategory': 'cafe' }).data.category
    ).toBe('restaurant');
    expect(
      plan({ 'identity.industry': 'salon_beauty', 'identity.subcategory': 'spa' }).data.category
    ).toBe('salon');
    expect(
      plan({ 'identity.industry': 'real_estate', 'identity.subcategory': 'plots' }).data.category
    ).toBe('real_estate');
  });

  it("keeps the owner's real line of work separate from the campaign vertical", () => {
    const { extras, data } = plan();
    expect(data.category).toBe('general');
    expect(extras.industry).toBe('fitness');
    expect(extras.subcategory).toBe('yoga');
  });
});

describe('toBusinessCreation — phone is derived from WhatsApp, with honest provenance', () => {
  it('normalises WhatsApp and copies it to phone, recorded as DERIVED_FROM_WHATSAPP (not as typed by the owner)', () => {
    const { data, extras } = plan();
    expect(data.contact.whatsapp).toBe('+919876543210');
    expect(data.contact.phone).toBe('+919876543210');
    expect(extras.knowledge!.facts['contact.phone']).toEqual({ source: 'DERIVED_FROM_WHATSAPP' });
    expect(extras.knowledge!.facts['contact.whatsapp']).toEqual({ source: 'USER_CONFIRMED' });
  });

  it("an explicitly provided phone replaces the derived one and is recorded as the owner's own", () => {
    const { data, extras } = plan({}, '040 2345 6789'.replace(/^/, '+91 '));
    expect(data.contact.phone).toBe('+914023456789');
    expect(data.contact.whatsapp).toBe('+919876543210');
    expect(extras.knowledge!.facts['contact.phone']).toEqual({ source: 'USER_CONFIRMED' });
  });

  it('normalises server-side, whatever the owner typed', () => {
    expect(plan({ 'contact.whatsapp': '09876543210' }).data.contact.whatsapp).toBe('+919876543210');
    expect(plan({ 'contact.whatsapp': '+44 7700 900123' }).data.contact.whatsapp).toBe(
      '+447700900123'
    );
  });

  it('refuses a number it cannot normalise, instead of storing it', () => {
    expect(() => plan({}, 'call me')).toThrow(BrainMappingError);
  });
});

describe('toBusinessCreation — only owner-confirmed facts reach the business', () => {
  it('refuses an incomplete draft', () => {
    const draft = answers({ 'contact.whatsapp': undefined });
    expect(() => toBusinessCreation(normalizeDraft(draft), T)).toThrow(/missing/i);
  });

  it('never includes an unconfirmed AI guess, however confident', () => {
    const base = answers();
    const withGuess = applySystemFacts(
      base,
      [
        {
          path: 'offering.signature',
          value: ['Mystery guess'],
          source: 'AI_INFERRED',
          confidence: 0.7,
        },
        {
          path: 'audience.primary',
          value: ['Imaginary crowd'],
          source: 'AI_INFERRED',
          confidence: 0.7,
        },
      ],
      T
    );
    const { extras, data } = toBusinessCreation(normalizeDraft(withGuess), T);
    const business = buildBusiness(data, 'u1', 'b1', T, extras);
    expect(JSON.stringify(business)).not.toContain('Mystery guess');
    expect(JSON.stringify(business)).not.toContain('Imaginary crowd');
    expect(business.businessBrain.offerings).toBeUndefined();
    expect(business.businessBrain.audience.primary).toBeUndefined();
    expect(extras.knowledge!.facts['offering.signature']).toBeUndefined();
  });

  it('a guess the owner then confirmed IS included, and recorded as confirmed', () => {
    const withGuess = applySystemFacts(
      answers(),
      [
        {
          path: 'offering.signature',
          value: ['Group classes'],
          source: 'AI_INFERRED',
          confidence: 0.5,
        },
      ],
      T
    );
    const confirmed = applyUserAnswers(
      withGuess,
      'u1',
      { updates: [{ path: 'offering.signature', value: ['Group classes'] }] },
      T
    );
    const { extras } = toBusinessCreation(normalizeDraft(confirmed), T);
    expect(extras.offerings).toEqual({ signature: ['Group classes'] });
    expect(extras.knowledge!.facts['offering.signature']).toEqual({ source: 'USER_CONFIRMED' });
  });

  it('records provenance for exactly the facts the Brain holds — nothing more', () => {
    const { extras } = plan();
    expect(Object.keys(extras.knowledge!.facts).sort()).toEqual(
      [
        ...SYSTEM_DEFAULT_PATHS,
        'contact.phone',
        'contact.whatsapp',
        'identity.city',
        'identity.industry',
        'identity.name',
        'identity.state',
        'identity.subcategory',
        'owner.name',
        'owner.role',
      ].sort()
    );
    expect(extras.knowledge!.origin).toBe('conversational_onboarding');
    expect(extras.knowledge!.confirmedAt).toBe(T);
  });

  it('every value Mitra filled in itself is marked SYSTEM_DEFAULT, never as the owner’s', () => {
    const { extras } = plan();
    for (const path of SYSTEM_DEFAULT_PATHS) {
      expect(extras.knowledge!.facts[path]).toEqual({ source: 'SYSTEM_DEFAULT' });
    }
    // and nothing the owner did say is marked as a default
    for (const [path, fact] of Object.entries(extras.knowledge!.facts)) {
      if (!SYSTEM_DEFAULT_PATHS.includes(path)) expect(fact.source).not.toBe('SYSTEM_DEFAULT');
    }
  });
});

describe('toBusinessCreation — delivery-first businesses', () => {
  it.each(DELIVERY_FIRST_SUBCATEGORIES)(
    '%s is created delivery-first, with honest provenance',
    (sub) => {
      const { data, extras } = plan({
        'identity.industry': 'restaurant_food',
        'identity.subcategory': sub,
      });
      expect(data.operatingMode).toBe('delivery');
      expect(extras.knowledge!.facts['businessRules.operatingMode']).toEqual({
        source: 'DERIVED_FROM_SUBCATEGORY',
      });
    }
  );

  it('a dine-in business gets no derived operating mode', () => {
    const { data, extras } = plan({
      'identity.industry': 'restaurant_food',
      'identity.subcategory': 'fine_dining',
    });
    expect(data.operatingMode).toBeUndefined();
    expect(extras.knowledge!.facts['businessRules.operatingMode']).toBeUndefined();
  });

  it('only restaurants are treated as delivery-first', () => {
    expect(
      plan({ 'identity.industry': 'retail', 'identity.subcategory': 'cloud_kitchen' }).data
        .operatingMode
    ).toBeUndefined();
  });
});

describe('buildBusiness — the Business Brain the owner confirmed', () => {
  const build = (over: Record<string, unknown> = {}) => {
    const withAll = applyUserAnswers(
      answers(over),
      'u1',
      {
        updates: [
          { path: 'offering.signature', value: ['Group classes', 'Diet plans'] },
          { path: 'audience.primary', value: ['Working professionals', 'Women'] },
          {
            path: 'positioning.usp',
            value: 'Small batches, so every class gets personal attention',
          },
        ],
      },
      T
    );
    const { data, extras } = toBusinessCreation(normalizeDraft(withAll), T);
    return buildBusiness(data, 'u1', 'biz-1', T, extras);
  };

  it("carries the owner's own words into the Brain slots, unrewritten", () => {
    const b = build();
    const brain = b.businessBrain;
    expect(brain.identity).toMatchObject({
      name: 'Prana Yoga Studio',
      industry: 'fitness',
      subcategory: 'yoga',
    });
    expect(brain.owner).toEqual({ name: 'Asha', role: 'founder' });
    expect(brain.offerings).toEqual({ signature: ['Group classes', 'Diet plans'] });
    expect(brain.audience.primary).toEqual(['Working professionals', 'Women']);
    expect(brain.positioning).toEqual({
      usp: 'Small batches, so every class gets personal attention',
    });
  });

  it('feeds the audience into the field the generation pipeline already reads', () => {
    expect(build().businessBrain.audience.targetCustomer).toBe('Working professionals, Women');
  });

  it('is a normal, complete business: active, INR, IST, located, with a campaign-ready contact', () => {
    const b = build();
    expect(b).toMatchObject({
      businessId: 'biz-1',
      userId: 'u1',
      category: 'general',
      status: 'active',
      location: { city: 'Hyderabad', state: 'Telangana' },
      contact: { phone: '+919876543210', whatsapp: '+919876543210' },
      settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
    });
    expect(b.businessBrain.audience.localities).toEqual(['Hyderabad']);
    expect(b.businessBrain.verticalProfile).toBeUndefined(); // general has no vertical profile
  });

  it('does not invent what the conversation never asked (no products, no hours, no brand claims)', () => {
    const b = build();
    expect(b.businessBrain.products).toEqual([]);
    expect(b.businessBrain.businessRules.openingHours).toEqual({});
    expect(b.businessBrain.campaignHistory).toEqual([]);
  });

  it('a legacy business (no extras) is exactly as before: none of the new Brain fields appear', () => {
    const b = buildBusiness(
      {
        name: 'Old Cafe',
        category: 'restaurant',
        location: { city: 'Pune', state: 'Maharashtra' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      'u1',
      'b2',
      T
    );
    for (const key of ['owner', 'offerings', 'positioning', 'knowledge']) {
      expect(b.businessBrain).not.toHaveProperty(key);
    }
    expect(b.businessBrain.identity).not.toHaveProperty('industry');
    expect(b.businessBrain.audience).not.toHaveProperty('primary');
    expect(b.businessBrain.audience.targetCustomer).toBe('');
  });
});
