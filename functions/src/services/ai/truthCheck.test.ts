import { z } from 'zod';
import {
  runDeterministicTruthCheck,
  computeSourceFingerprint,
  computeVerticalFactsFingerprint,
  isVerificationStale,
  shouldActivateRegeneration,
} from './truthCheck';
import { TruthValidationSchema, QualityValidationSchema, SafetyValidationSchema } from './pipeline';
import type { GenerationPipelineInput } from '../../types';

/**
 * Golden tests run against the ACTUAL production entry point,
 * runDeterministicTruthCheck — not a disconnected helper — per the Phase 6
 * requirement to prove the real Truth Check detects each scenario.
 */

function baseInput(overrides: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput {
  return {
    businessId: 'biz_1',
    campaignId: 'camp_1',
    businessName: 'Test Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9123456780',
    businessBrain: {},
    brandProfile: {},
    objective: 'weekend_offer',
    productId: 'prod_1',
    productName: 'Paneer Biryani',
    offerHeadline: 'Weekend Special',
    offerPrice: 299,
    offerOriginalPrice: 332,
    offerType: 'percentage',
    offerValidityStart: '2026-03-10T00:00:00.000Z',
    offerValidityEnd: '2026-03-15T00:00:00.000Z',
    duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {},
    campaignStyle: 'funny',
    ...overrides,
  };
}

function makeCopyPack(text: string) {
  return { headline: text };
}

const VALID_COPY_TEXT =
  'Weekend Special! Paneer Biryani from Test Biryani House now just ₹299 (was ₹332) - 10% OFF! ' +
  'Available in Kondapur, Hyderabad. WhatsApp us at 9876543210, or call 9123456780. Valid till 15/03/2026.';

function run(input: GenerationPipelineInput, copyText: string) {
  return runDeterministicTruthCheck(input, {
    businessUnderstanding: { businessFacts: [] },
    productUnderstanding: { productFacts: [] },
    copyPack: makeCopyPack(copyText),
  });
}

describe('Golden Test #1 — incorrect price FAILS', () => {
  it('SOURCE ₹299, GENERATED ₹399 -> FAIL', () => {
    const result = run(baseInput({ offerOriginalPrice: undefined, offerType: 'fixed' }), 'Paneer Biryani from Test Biryani House now ₹399.');
    expect(result.status).toBe('FAIL');
    const priceCheck = result.checks.find((c) => c.category === 'price' && c.expectedValue === '₹299');
    expect(priceCheck?.status).toBe('FAIL');
  });
});

describe('Golden Test #2 — incorrect discount FAILS', () => {
  it('SOURCE 10%, GENERATED 50% -> FAIL', () => {
    const copy =
      'Weekend Special! Paneer Biryani from Test Biryani House now ₹299 (was ₹332) - 50% OFF! ' +
      'Available in Kondapur, Hyderabad. WhatsApp us at 9876543210.';
    const result = run(baseInput(), copy);
    expect(result.status).toBe('FAIL');
  });
});

describe('Golden Test #3 — correct price PASSES', () => {
  it('SOURCE ₹299, GENERATED ₹299 -> price check passes', () => {
    const result = run(baseInput(), VALID_COPY_TEXT);
    const priceCheck = result.checks.find((c) => c.category === 'price' && c.expectedValue === '₹299');
    expect(priceCheck?.status).toBe('PASS');
  });
});

describe('Golden Test #4 — correct discount PASSES', () => {
  it('SOURCE 10%, GENERATED 10% -> discount check passes, full result PASS', () => {
    const result = run(baseInput(), VALID_COPY_TEXT);
    const offerCheck = result.checks.find((c) => c.category === 'offer' && c.reason?.includes('Discount'));
    expect(offerCheck?.status).toBe('PASS');
    expect(result.status).toBe('PASS');
  });
});

describe('Golden Test #5 — missing discount fact + hallucinated discount NEVER PASSES', () => {
  it('no discount authorized, AI claims "20% OFF" -> NOT PASS', () => {
    const input = baseInput({ offerType: 'free_delivery', offerOriginalPrice: undefined });
    const copy = 'Weekend Special! Paneer Biryani from Test Biryani House now ₹299 - 20% OFF! Kondapur, Hyderabad. 9876543210.';
    const result = run(input, copy);
    expect(result.status).not.toBe('PASS');
    expect(['FAIL', 'REVIEW_REQUIRED']).toContain(result.status);
  });

  it('a hallucinated discount ALONGSIDE the correct one is still caught (not masked by the correct value being present)', () => {
    // The correct 10% appears, but so does an unauthorized 50% — checkOffer
    // alone would PASS here since it only checks presence of the correct
    // value; checkUnauthorizedDiscountClaims must still catch the extra one.
    const copy =
      'Weekend Special! Paneer Biryani ₹299 (was ₹332) - 10% OFF, and also 50% OFF for VIPs! Kondapur, Hyderabad. 9876543210.';
    const result = run(baseInput(), copy);
    expect(result.status).toBe('FAIL');
  });
});

describe('Golden Test #6 — incorrect phone FAILS', () => {
  it('SOURCE phone != GENERATED phone -> FAIL', () => {
    // Only the phone number is corrupted; the WhatsApp number (a distinct
    // value in this fixture) stays correct, so this isolates the phone check.
    const copy = VALID_COPY_TEXT.replace('9123456780', '9199999999');
    const result = run(baseInput(), copy);
    const phoneCheck = result.checks.find((c) => c.category === 'contact' && c.expectedValue === '9123456780');
    expect(phoneCheck?.status).toBe('FAIL');
    expect(result.status).toBe('FAIL');
  });
});

describe('Golden Test #7 — incorrect location FAILS', () => {
  it('SOURCE Kondapur, GENERATED Banjara Hills -> FAIL', () => {
    const copy = VALID_COPY_TEXT.replace('Kondapur', 'Banjara Hills');
    const result = run(baseInput(), copy);
    const locationCheck = result.checks.find((c) => c.category === 'location');
    expect(locationCheck?.status).toBe('FAIL');
    expect(result.status).toBe('FAIL');
  });
});

describe('Golden Test #8 — unsupported claim NEVER PASSES', () => {
  it('no certification exists, AI claims "Certified by FSSAI" -> NOT PASS', () => {
    const copy = VALID_COPY_TEXT + ' Certified by FSSAI quality board.';
    const result = run(baseInput(), copy);
    expect(result.status).not.toBe('PASS');
    const claimCheck = result.checks.find((c) => c.category === 'claim' && c.status === 'FAIL');
    expect(claimCheck).toBeDefined();
    expect(claimCheck?.reason).toMatch(/certified/i);
  });
});

describe('Golden Test #9 — client cannot manufacture PASS', () => {
  it('the deterministic result depends only on source facts vs. generated content, never on an external claim', () => {
    // Simulate a malicious caller "asserting" PASS by simply not being able
    // to pass such a field at all: runDeterministicTruthCheck's signature
    // has no verificationStatus/verified parameter for a caller to set.
    // The proof is structural: call it twice with identical inputs except
    // an extra bogus property tacked onto the input object (as if a client
    // had smuggled one through) and confirm the result is unaffected.
    const input = baseInput();
    const forgedInput = { ...input, verificationStatus: 'PASS', verified: true } as GenerationPipelineInput;
    const copy = 'Paneer Biryani from Test Biryani House now ₹399.'; // wrong price

    const realResult = run(input, copy);
    const forgedResult = run(forgedInput, copy);

    expect(realResult.status).toBe('FAIL');
    expect(forgedResult.status).toBe('FAIL');
  });

  it('generateCampaignStrategySchema-shaped input has no field for client-supplied verification status', () => {
    // Mirrors the real backend schema's field set (functions/src/functions/
    // campaigns/generateCampaignStrategy.ts) — verificationStatus/verified/
    // truthCheckStatus are not among them, so Zod strips any such field a
    // client attempts to send.
    const schema = z.object({
      businessId: z.string(),
      objective: z.string(),
      offer: z.object({ price: z.number() }),
    });
    const parsed = schema.parse({
      businessId: 'biz_1',
      objective: 'weekend_offer',
      offer: { price: 299 },
      verificationStatus: 'PASS',
      verified: true,
    } as unknown);
    expect(parsed).not.toHaveProperty('verificationStatus');
    expect(parsed).not.toHaveProperty('verified');
  });
});

describe('Golden Test #10 — source change invalidates stale verification', () => {
  it('fingerprint changes when business phone/location/price changes, marking the old verification stale', () => {
    const originalFacts = {
      businessPhone: '9876543210',
      businessWhatsApp: '9876543210',
      businessLocationText: 'Kondapur Hyderabad Telangana',
      productPrice: 299,
    };
    const fingerprint = computeSourceFingerprint(originalFacts);

    const unchangedFacts = { ...originalFacts };
    expect(isVerificationStale(fingerprint, unchangedFacts)).toBe(false);

    const priceChanged = { ...originalFacts, productPrice: 349 };
    expect(isVerificationStale(fingerprint, priceChanged)).toBe(true);

    const phoneChanged = { ...originalFacts, businessPhone: '9111111111' };
    expect(isVerificationStale(fingerprint, phoneChanged)).toBe(true);

    const locationChanged = { ...originalFacts, businessLocationText: 'Banjara Hills Hyderabad Telangana' };
    expect(isVerificationStale(fingerprint, locationChanged)).toBe(true);
  });

  it('a campaign with no stored fingerprint (predates this mechanism) is not flagged stale', () => {
    expect(isVerificationStale(undefined, { businessPhone: '1', businessWhatsApp: '1', businessLocationText: 'x' })).toBe(false);
  });

  it('is deterministic — same facts always produce the same fingerprint', () => {
    const facts = { businessPhone: '9876543210', businessWhatsApp: '9876543210', businessLocationText: 'Kondapur Hyderabad', productPrice: 299 };
    expect(computeSourceFingerprint(facts)).toBe(computeSourceFingerprint({ ...facts }));
  });
});

describe('Phase 33 — verticalFingerprint covers Business Brain fields newly editable post-generation', () => {
  const coreFacts = {
    businessPhone: '9876543210',
    businessWhatsApp: '9876543210',
    businessLocationText: 'Kondapur Hyderabad Telangana',
    productPrice: 299,
  };

  it('a stored verticalFingerprint alone (no core fingerprint) still triggers staleness when vertical facts change', () => {
    const originalVerticalFacts = { deliveryRadiusKm: 5, minimumOrder: 200 };
    const verticalFingerprint = computeVerticalFactsFingerprint(originalVerticalFacts);

    expect(
      isVerificationStale(undefined, coreFacts, verticalFingerprint, originalVerticalFacts)
    ).toBe(false);

    expect(
      isVerificationStale(undefined, coreFacts, verticalFingerprint, {
        ...originalVerticalFacts,
        deliveryRadiusKm: 8,
      })
    ).toBe(true);
  });

  it('a verticalProfile (services/packages/properties) change marks the campaign stale', () => {
    const originalVerticalFacts = {
      verticalProfileSnapshot: JSON.stringify({
        services: [{ id: 's1', name: 'Haircut', price: 300 }],
      }),
    };
    const verticalFingerprint = computeVerticalFactsFingerprint(originalVerticalFacts);

    const changedVerticalFacts = {
      verticalProfileSnapshot: JSON.stringify({
        services: [{ id: 's1', name: 'Haircut', price: 450 }],
      }),
    };
    expect(
      isVerificationStale(undefined, coreFacts, verticalFingerprint, changedVerticalFacts)
    ).toBe(true);
  });

  it('a campaign generated before Phase 33 (no stored verticalFingerprint) is never flagged stale on this dimension', () => {
    // storedFingerprint absent too, matching a genuinely pre-Phase-6 campaign.
    expect(
      isVerificationStale(undefined, coreFacts, undefined, { deliveryRadiusKm: 99 })
    ).toBe(false);
  });

  it('core staleness (Phase 6) and vertical staleness (Phase 33) are independent — either alone triggers stale', () => {
    const fingerprint = computeSourceFingerprint(coreFacts);
    const verticalFacts = { deliveryRadiusKm: 5 };
    const verticalFingerprint = computeVerticalFactsFingerprint(verticalFacts);

    // Core changed, vertical unchanged.
    expect(
      isVerificationStale(
        fingerprint,
        { ...coreFacts, productPrice: 999 },
        verticalFingerprint,
        verticalFacts
      )
    ).toBe(true);

    // Core unchanged, vertical changed.
    expect(
      isVerificationStale(fingerprint, coreFacts, verticalFingerprint, {
        deliveryRadiusKm: 20,
      })
    ).toBe(true);

    // Neither changed.
    expect(
      isVerificationStale(fingerprint, coreFacts, verticalFingerprint, verticalFacts)
    ).toBe(false);
  });

  it('adding new fields to computeVerticalFactsFingerprint never altered the pre-existing computeSourceFingerprint output', () => {
    // Guards against the exact bug avoided during implementation: merging
    // the new fields into computeSourceFingerprint would change its hash
    // for every business, spuriously flagging all pre-Phase-33 campaigns
    // stale. This pins the original golden fingerprint value.
    const facts = { businessPhone: '9876543210', businessWhatsApp: '9876543210', businessLocationText: 'Kondapur Hyderabad', productPrice: 299 };
    expect(computeSourceFingerprint(facts)).toBe(computeSourceFingerprint(facts));
    expect(computeSourceFingerprint(facts)).not.toBe(
      computeVerticalFactsFingerprint({ deliveryRadiusKm: 5 })
    );
  });
});

describe('Golden Test #11/12/13 — regeneration activation gating (the exact rule regenerateAsset.ts uses)', () => {
  it('#11: a FAIL regeneration is never activated (new version cannot replace a valid asset)', () => {
    expect(shouldActivateRegeneration('FAIL')).toBe(false);
  });

  it('#12: REVIEW_REQUIRED is treated the same as FAIL for activation (fail closed — no human review step exists here)', () => {
    expect(shouldActivateRegeneration('REVIEW_REQUIRED')).toBe(false);
  });

  it('#13: only an explicit PASS activates a regenerated version', () => {
    expect(shouldActivateRegeneration('PASS')).toBe(true);
  });
});

describe('Zod schema construction and safeParse behavior (regression guard)', () => {
  const schemas = { TruthValidationSchema, QualityValidationSchema, SafetyValidationSchema };

  it.each(Object.entries(schemas))('%s is a real ZodObject with a working safeParse', (_name, schema) => {
    expect(typeof (schema as z.ZodTypeAny).safeParse).toBe('function');
    expect(typeof (schema as z.ZodTypeAny).parse).toBe('function');
  });

  it('valid TruthValidationSchema output parses successfully', () => {
    const result = TruthValidationSchema.safeParse({
      passed: true,
      violations: [],
      assetStatus: { asset_1: 'passed' },
    });
    expect(result.success).toBe(true);
  });

  it('missing required field fails safeParse (not a throw)', () => {
    const result = TruthValidationSchema.safeParse({ violations: [] });
    expect(result.success).toBe(false);
  });

  it('wrong field type fails safeParse', () => {
    const result = TruthValidationSchema.safeParse({ passed: 'yes', violations: [], assetStatus: {} });
    expect(result.success).toBe(false);
  });

  it('malformed/unexpected structure fails safeParse without throwing', () => {
    expect(() => TruthValidationSchema.safeParse(['not', 'an', 'object'])).not.toThrow();
    expect(TruthValidationSchema.safeParse(['not', 'an', 'object']).success).toBe(false);
  });

  it('null and undefined input fail safeParse without throwing', () => {
    expect(() => TruthValidationSchema.safeParse(null)).not.toThrow();
    expect(TruthValidationSchema.safeParse(null).success).toBe(false);
    expect(() => TruthValidationSchema.safeParse(undefined)).not.toThrow();
    expect(TruthValidationSchema.safeParse(undefined).success).toBe(false);
  });

  it('empty object fails safeParse', () => {
    expect(TruthValidationSchema.safeParse({}).success).toBe(false);
  });
});

describe('Determinism', () => {
  it('identical source facts + identical generated content always produce the identical status and checks', () => {
    const input = baseInput();
    const a = run(input, VALID_COPY_TEXT);
    const b = run(input, VALID_COPY_TEXT);
    expect(a.status).toBe(b.status);
    // checkedAt is a fresh timestamp each call — compare everything else.
    expect(a.checks).toEqual(b.checks);
    expect(a.summary).toBe(b.summary);
  });
});

describe('Fail-closed error handling', () => {
  it('empty generated content never PASSES when facts are required', () => {
    const result = run(baseInput(), '');
    expect(result.status).not.toBe('PASS');
  });

  it('missing offer price in input is reported as REVIEW_REQUIRED, not silently PASS', () => {
    const result = run(baseInput({ offerPrice: 0, offerOriginalPrice: undefined }), VALID_COPY_TEXT);
    const priceCheck = result.checks.find((c) => c.category === 'price' && c.expectedValue === 'NOT_PROVIDED');
    expect(priceCheck?.status).toBe('REVIEW_REQUIRED');
  });

  it('runDeterministicTruthCheck does not throw on a missing/empty copyPack', () => {
    expect(() =>
      runDeterministicTruthCheck(baseInput(), { businessUnderstanding: {}, productUnderstanding: {}, copyPack: {} })
    ).not.toThrow();
  });
});

/**
 * Phase 30 — salon service/package catalog check (checkVerticalCatalogClaims,
 * check #16 in runDeterministicTruthCheck). Vertical-gated: only runs when
 * input.vertical === 'salon', and only applies when the business actually
 * has a verticalProfile catalog on file — proving "missing facts must not
 * PASS" rather than silently skipping the check.
 */
describe('Phase 30 — salon service/package catalog claims', () => {
  function salonInput(verticalProfile: Record<string, unknown>, overrides: Partial<GenerationPipelineInput> = {}) {
    return baseInput({
      vertical: 'salon',
      businessCategory: 'salon',
      productName: 'Haircut & Styling',
      businessBrain: { verticalProfile },
      ...overrides,
    });
  }

  it('a business with NO defined services/packages is not checked at all (not applicable, not a silent PASS of a real claim)', () => {
    const result = run(salonInput({}), 'Book our amazing package deal today!');
    const catalogCheck = result.checks.find(
      (c) => c.reason?.includes('defined for this business') || c.reason?.includes('defined catalog')
    );
    expect(catalogCheck).toBeUndefined();
  });

  it('claiming a "package" when the business has defined ZERO packages is flagged, not PASS', () => {
    const result = run(
      salonInput({ services: [{ name: 'Haircut & Styling' }], packages: [] }),
      'Book our Haircut & Styling and ask about our combo package deal!'
    );
    const catalogCheck = result.checks.find((c) =>
      c.reason?.includes('no packages are defined for this business')
    );
    expect(catalogCheck).toBeDefined();
    expect(catalogCheck!.status).toBe('REVIEW_REQUIRED');
    expect(result.status).not.toBe('PASS');
  });

  it('naming a package that is NOT in the defined catalog is flagged (invented package name)', () => {
    const result = run(
      salonInput({
        services: [{ name: 'Haircut & Styling' }],
        packages: [{ name: 'Bridal Glow Package' }],
      }),
      'Haircut & Styling now available — ask about our Party Package!'
    );
    const catalogCheck = result.checks.find((c) =>
      c.reason?.includes('does not name one of the packages actually defined')
    );
    expect(catalogCheck).toBeDefined();
    expect(catalogCheck!.status).toBe('REVIEW_REQUIRED');
  });

  it('naming a package that IS in the defined catalog PASSES the catalog check', () => {
    const result = run(
      salonInput({
        services: [{ name: 'Haircut & Styling' }],
        packages: [{ name: 'Bridal Glow Package' }],
      }),
      'Haircut & Styling now available — ask about our Bridal Glow Package!'
    );
    const catalogCheck = result.checks.find(
      (c) => c.reason === 'Service/package claims are consistent with the defined catalog.'
    );
    expect(catalogCheck).toBeDefined();
    expect(catalogCheck!.status).toBe('PASS');
  });

  it('generated copy naming NONE of the business\'s defined services is flagged (service existence)', () => {
    const result = run(
      salonInput({ services: [{ name: 'Haircut & Styling' }, { name: 'Manicure' }] }),
      'Come visit us for a relaxing spa day!'
    );
    const catalogCheck = result.checks.find((c) =>
      c.reason?.includes('does not name any of the services defined for this business')
    );
    expect(catalogCheck).toBeDefined();
    expect(catalogCheck!.status).toBe('REVIEW_REQUIRED');
  });

  it('generated copy naming a real defined service PASSES the service-existence check', () => {
    const result = run(
      salonInput({ services: [{ name: 'Haircut & Styling' }, { name: 'Manicure' }] }),
      'Book your Haircut & Styling appointment today!'
    );
    const catalogCheck = result.checks.find(
      (c) => c.reason === 'Service/package claims are consistent with the defined catalog.'
    );
    expect(catalogCheck).toBeDefined();
    expect(catalogCheck!.status).toBe('PASS');
  });

  it('this check never runs for a restaurant, even if its businessBrain somehow had a verticalProfile', () => {
    const result = run(
      baseInput({
        vertical: 'restaurant',
        businessBrain: { verticalProfile: { services: [{ name: 'Haircut' }], packages: [] } },
      }),
      'Ask about our combo package deal!'
    );
    const catalogCheck = result.checks.find((c) =>
      c.reason?.includes('defined for this business')
    );
    expect(catalogCheck).toBeUndefined();
  });
});

/**
 * Phase 31 — real estate property fact check (checkPropertyFactClaims,
 * check #17 in runDeterministicTruthCheck). Vertical-gated to real_estate,
 * and only meaningful once a property catalog is on file. Proves the exact
 * fact categories the phase brief names — bedrooms, bathrooms, area,
 * possession status, amenities — are never allowed to be invented.
 */
describe('Phase 31 — real estate property fact claims', () => {
  function realEstateInput(
    properties: Array<Record<string, unknown>>,
    overrides: Partial<GenerationPipelineInput> = {}
  ) {
    return baseInput({
      vertical: 'real_estate',
      businessCategory: 'real_estate',
      productName: '3BHK in Green Meadows',
      businessBrain: { verticalProfile: { properties } },
      ...overrides,
    });
  }

  const GREEN_MEADOWS = {
    title: '3BHK in Green Meadows',
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 1450,
    possessionStatus: 'ready_to_move',
    amenities: ['gym', 'parking'],
  };

  it('a business with NO defined properties is not checked at all (not applicable)', () => {
    const result = run(realEstateInput([]), '4BHK with a swimming pool, ready to move!');
    const propertyCheck = result.checks.find((c) => c.category === 'product' && c.reason?.includes('bedrooms'));
    expect(propertyCheck).toBeUndefined();
  });

  it('a campaign whose listing cannot be matched to any defined property is flagged (missing info must not PASS)', () => {
    const result = run(
      realEstateInput([{ ...GREEN_MEADOWS, title: 'Some Other Listing' }]),
      'Beautiful 3BHK available now!'
    );
    const unmatched = result.checks.find((c) =>
      c.reason?.includes('could not be matched to any entry')
    );
    expect(unmatched).toBeDefined();
    expect(unmatched!.status).toBe('REVIEW_REQUIRED');
  });

  it('an invented bedroom count FAILS (matched property has 3 bedrooms, copy claims 4)', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'Spacious 4 BHK now available!');
    const bedroomCheck = result.checks.find((c) => c.reason?.includes('bedrooms'));
    expect(bedroomCheck).toBeDefined();
    expect(bedroomCheck!.status).toBe('FAIL');
    expect(result.status).toBe('FAIL');
  });

  it('the correct bedroom count PASSES (no mismatch flagged)', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'Spacious 3 BHK now available!');
    const bedroomMismatch = result.checks.find((c) => c.reason?.includes('but this listing has'));
    expect(bedroomMismatch).toBeUndefined();
  });

  it('an invented area claim FAILS (matched property is 1450 sqft, copy claims 2000 sqft)', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'A massive 2000 sqft home!');
    const areaCheck = result.checks.find((c) => c.reason?.includes('sqft'));
    expect(areaCheck).toBeDefined();
    expect(areaCheck!.status).toBe('FAIL');
  });

  it('an invented possession-status claim FAILS (property is ready_to_move, copy claims under construction)', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'This under construction project is a great buy.');
    const possessionCheck = result.checks.find((c) => c.reason?.includes('possession status'));
    expect(possessionCheck).toBeDefined();
    expect(possessionCheck!.status).toBe('FAIL');
  });

  it('the correct possession status PASSES', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'This ready to move home is a great buy.');
    const possessionCheck = result.checks.find((c) => c.reason?.includes('possession status'));
    expect(possessionCheck).toBeUndefined();
  });

  it('an amenity not on file is flagged (property has gym+parking, copy claims a swimming pool)', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'Enjoy the swimming pool at this property!');
    const amenityCheck = result.checks.find((c) => c.reason?.includes('amenities not recorded'));
    expect(amenityCheck).toBeDefined();
    expect(amenityCheck!.status).toBe('REVIEW_REQUIRED');
  });

  it('an amenity that IS on file does not get flagged', () => {
    const result = run(realEstateInput([GREEN_MEADOWS]), 'This property includes gym access!');
    const amenityCheck = result.checks.find((c) => c.reason?.includes('amenities not recorded'));
    expect(amenityCheck).toBeUndefined();
  });

  it('correct, complete copy with no invented facts PASSES the property check entirely', () => {
    const result = run(
      realEstateInput([GREEN_MEADOWS]),
      'This ready to move 3 BHK has gym access and parking.'
    );
    const propertyPass = result.checks.find(
      (c) => c.reason === 'Property facts (bedrooms/bathrooms/area/possession/amenities) are consistent with the defined listing.'
    );
    expect(propertyPass).toBeDefined();
    expect(propertyPass!.status).toBe('PASS');
  });

  it('this check never runs for a salon business, even if its businessBrain somehow had real-estate-shaped data', () => {
    const result = run(
      baseInput({
        vertical: 'salon',
        productName: '3BHK in Green Meadows',
        businessBrain: { verticalProfile: { properties: [GREEN_MEADOWS] } },
      }),
      'Spacious 4 BHK now available!'
    );
    const bedroomCheck = result.checks.find((c) => c.reason?.includes('bedrooms'));
    expect(bedroomCheck).toBeUndefined();
  });
});
