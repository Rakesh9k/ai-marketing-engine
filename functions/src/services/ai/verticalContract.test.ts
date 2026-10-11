import {
  SALON_SERVICE_KEYWORDS,
  buildVerticalContractPrompt,
  findListing,
  knownSalonOfferings,
  unsupportedSalonServices,
  possessionDateClaim,
} from './verticalContract';

/**
 * Business facts -> vertical contract -> generation prompt -> Truth Check. The model is given exactly the
 * facts the owner recorded and told to state no others; Truth Check verifies the same set. Nothing is
 * hard-coded to make a check pass: a fact that is not on file is simply not stated.
 */

const salon = (brain: Record<string, unknown>, productName = 'Haircut & Styling') => ({
  vertical: 'salon',
  businessName: 'Glow Beauty Parlour',
  productName,
  businessBrain: brain,
});

const realEstate = (
  properties: Array<Record<string, unknown>>,
  productName = '3BHK in Green Meadows'
) => ({
  vertical: 'real_estate',
  productName,
  businessBrain: { verticalProfile: { properties } },
});

const GREEN_MEADOWS = {
  title: '3BHK in Green Meadows',
  bedrooms: 3,
  bathrooms: 2,
  areaSqft: 1450,
  possessionStatus: 'ready_to_move',
  amenities: ['gym', 'parking'],
};

describe("salon: the owner's known offerings", () => {
  it("are the defined services and packages, the signature offerings and the campaign's own product", () => {
    const known = knownSalonOfferings(
      salon({
        verticalProfile: { services: [{ name: 'Facial' }], packages: [{ name: 'Bridal Package' }] },
        offerings: { signature: ['Hair Spa'] },
      }) as never
    );
    expect(known).toEqual(
      expect.arrayContaining(['facial', 'bridal package', 'hair spa', 'haircut & styling'])
    );
  });

  it('is just the campaign product when nothing else is recorded', () => {
    expect(knownSalonOfferings(salon({}) as never)).toEqual(['haircut & styling']);
  });
});

describe('salon: services the copy names must be known', () => {
  const known = ['facial', 'haircut & styling'];

  it('flags a service the owner never recorded', () => {
    expect(unsupportedSalonServices('Try our keratin treatment today', known)).toEqual(['keratin']);
  });

  it('accepts a recorded service, however it is worded around the keyword', () => {
    expect(unsupportedSalonServices('A relaxing facial and a fresh haircut', known)).toEqual([]);
  });

  it('a recorded offering that contains the keyword supports it', () => {
    expect(unsupportedSalonServices('Book bridal makeup', ['bridal makeup package'])).toEqual([]);
  });

  it("does not count the business's own name as a claim", () => {
    expect(
      unsupportedSalonServices('Welcome to Glow Facial Studio', known, 'Glow Facial Studio')
    ).toEqual([]);
    expect(
      unsupportedSalonServices(
        'Welcome to Glow Facial Studio for keratin',
        ['haircut'],
        'Glow Facial Studio'
      )
    ).toEqual(['keratin']);
  });

  it('ignores copy that names no specific service', () => {
    expect(unsupportedSalonServices('Walk in and feel great', [])).toEqual([]);
  });

  it('has a keyword list of real treatments', () => {
    expect(SALON_SERVICE_KEYWORDS).toEqual(
      expect.arrayContaining(['keratin', 'facial', 'haircut', 'hair spa'])
    );
  });
});

describe('real estate: the listing and its recorded facts', () => {
  it('matches the listing by title exactly as Truth Check does', () => {
    const props = [GREEN_MEADOWS, { title: '2BHK Lakeview', bedrooms: 2 }];
    expect(findListing(props as never, '3BHK in Green Meadows')?.title).toBe(
      '3BHK in Green Meadows'
    );
    expect(findListing(props as never, 'green meadows')?.title).toBe('3BHK in Green Meadows');
    expect(findListing(props as never, 'Unknown tower')).toBeUndefined();
    expect(findListing(props as never, '')).toBeUndefined();
    expect(findListing([] as never, 'anything')).toBeUndefined();
  });

  it('a possession DATE is a claim no record can support', () => {
    expect(possessionDateClaim('Possession in March 2027')).toBe(true);
    expect(possessionDateClaim('possession by Dec 2026!')).toBe(true);
    expect(possessionDateClaim('Possession expected 2028')).toBe(true);
    expect(possessionDateClaim('Ready to move, immediate possession')).toBe(false);
    expect(possessionDateClaim('Open house on 12 Oct 2026')).toBe(false);
  });
});

describe('the vertical prompt block', () => {
  it('salon with recorded offerings: names them and forbids others', () => {
    const p = buildVerticalContractPrompt(
      salon({
        verticalProfile: {
          services: [{ name: 'Facial' }, { name: 'Haircut' }],
          packages: [{ name: 'Bridal Package' }],
        },
      }) as never
    );
    expect(p).toMatch(/SERVICES[^\n]*Facial[^\n]*Haircut/);
    expect(p).toMatch(/only these/i);
    expect(p).toMatch(/PACKAGES[^\n]*Bridal Package/);
  });

  it('salon with nothing recorded: no specific treatment is to be named', () => {
    const p = buildVerticalContractPrompt(salon({}, '') as never);
    expect(p).toMatch(/no specific services are on file/i);
    expect(p).toMatch(/do not name any specific (treatment|service)/i);
    expect(p).toMatch(/do not mention a package/i);
  });

  it('salon names the recorded signature offerings too', () => {
    const p = buildVerticalContractPrompt(
      salon({ offerings: { signature: ['Hair Spa', 'Facial'] } }, '') as never
    );
    expect(p).toMatch(/SERVICES[^\n]*Hair Spa[^\n]*Facial/);
  });

  it('real estate: states exactly the recorded facts and says what is not recorded', () => {
    const p = buildVerticalContractPrompt(realEstate([GREEN_MEADOWS]) as never);
    expect(p).toContain('3 bedrooms');
    expect(p).toContain('2 bathrooms');
    expect(p).toContain('1450 sq ft');
    expect(p).toContain('ready to move');
    expect(p).toMatch(/amenities: gym, parking/i);
    expect(p).toMatch(/never state a possession date/i);
    expect(p).not.toMatch(/not recorded for this listing/i);

    const partial = buildVerticalContractPrompt(
      realEstate([{ title: '3BHK in Green Meadows', bedrooms: 3 }]) as never
    );
    expect(partial).toMatch(
      /not recorded for this listing: bathrooms, area, possession status, amenities/i
    );
  });

  it('real estate: an upcoming listing may be neither "ready to move" nor "under construction"', () => {
    const p = buildVerticalContractPrompt(
      realEstate([{ ...GREEN_MEADOWS, possessionStatus: 'upcoming' }]) as never
    );
    expect(p).toMatch(/possession: upcoming/i);
    expect(p).toMatch(/do not (say|call it)[^\n]*ready to move[^\n]*under construction/i);
  });

  it('real estate with no matching listing: no property fact may be stated', () => {
    const p = buildVerticalContractPrompt(realEstate([GREEN_MEADOWS], 'Unknown tower') as never);
    expect(p).toMatch(/no recorded facts for this listing/i);
    expect(p).toMatch(/do not state (any )?bedrooms/i);
    expect(buildVerticalContractPrompt(realEstate([]) as never)).toMatch(
      /no recorded facts for this listing/i
    );
  });

  it('other verticals get nothing', () => {
    for (const vertical of ['restaurant', 'general', undefined]) {
      expect(
        buildVerticalContractPrompt({ vertical, productName: 'x', businessBrain: {} } as never)
      ).toBe('');
    }
  });
});

describe('possession status wording (live: an under-construction listing got a "Ready to move?" sticker)', () => {
  const listing = (possessionStatus: 'under_construction' | 'ready_to_move' | 'upcoming') => ({
    vertical: 'real_estate' as const,
    productName: 'Skyline 2BHK',
    businessBrain: {
      verticalProfile: {
        vertical: 'real_estate',
        properties: [{ id: 'p1', title: 'Skyline 2BHK', possessionStatus, active: true }],
      },
    },
  });

  it('an under-construction listing is told never to be called ready to move, or asked about it', () => {
    const prompt = buildVerticalContractPrompt(listing('under_construction') as never);
    expect(prompt).toMatch(/UNDER CONSTRUCTION/);
    expect(prompt).toMatch(/never call it "ready to move"/);
  });

  it('a ready-to-move listing is told not to be called under construction', () => {
    expect(buildVerticalContractPrompt(listing('ready_to_move') as never)).toMatch(/Do not say it is "under construction"/);
  });
});
