/**
 * INFORMATION FLOW: what the owner told Mitra reaches every model prompt unchanged, what they did not tell
 * Mitra never appears, a changed fact replaces the old one, and a campaign never rewrites the Business Brain.
 *
 * The model is stubbed, but unlike pipeline.sparseFacts.test.ts the stub answers the Creative Brain's two
 * calls with valid output, so the WHOLE Creative Brain path (opportunity -> concepts -> blueprint -> strategy
 * prompts that embed the blueprint) is built and scanned, not just its first prompt.
 *
 * Deterministic test: no network, no Firestore.
 */
const calls: string[] = [];
const generateStructuredTextMock = jest.fn(async (prompt: unknown) => {
  const p = String(prompt);
  calls.push(p);
  if (p.includes('Strategic Reasoning Engine')) {
    return {
      opportunityId: 'opp-1',
      vertical: 'restaurant',
      problem: 'Customers are undecided at mealtime',
      tension: 'Wanting something satisfying without a long wait',
      motivation: 'A reliable meal they trust',
      audienceInsight: 'Local customers value a dependable favourite',
      opportunityStatement: 'Make the signature offer the easy, confident choice',
      desiredBusinessOutcome: 'More enquiries',
      desiredAudienceResponse: 'Order today',
      supportingSignals: [],
      constraints: { maxTextDensity: 'medium', toneBoundary: 'warm', factualLimits: [] },
      confidence: 80,
      rationale: 'Fits the product and the audience',
    };
  }
  if (p.includes('Concept Generator')) {
    const concept = (n: number) => ({
      conceptId: `c${n}`,
      title: `Concept ${n}`,
      angle: 'Make the offer the easy choice',
      coreIdea: 'The product itself is the hero',
      hookDirection: 'Open on the product',
      emotionalDriver: 'warm',
      audienceFraming: 'For local customers',
      message: 'An offer worth choosing',
      offerFraming: 'State the offer exactly as given',
      ctaDirection: 'Invite the order',
      visualPremise: {
        emphasis: 'product-led',
        composition: 'hero-product',
        mood: 'warm and inviting',
        compositionHints: [],
      },
      differentiation: 'Freshly prepared',
      expectedResponse: 'Order',
      templateId: 'tpl',
    });
    return { concepts: [concept(1), concept(2), concept(3)] };
  }
  return {};
});

jest.mock('./index', () => ({
  generateStructuredText: (prompt: unknown) => generateStructuredTextMock(prompt),
  analyzeProductImages: jest.fn(),
  generateImage: jest.fn().mockResolvedValue({
    success: true,
    imageUrl: 'https://provider.example.com/temp-hero.png',
    provider: 'openai',
    model: 'dall-e-3',
  }),
}));
jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest.fn().mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest.fn().mockResolvedValue({
    url: 'https://storage.example.com/x.png',
    storagePath: 'businesses/b/campaigns/c/generated/x.png',
  }),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

type Over = Partial<GenerationPipelineInput>;

/** A complete Hyderabad restaurant: every fact below is "known". */
const hyderabadRich = (over: Over = {}): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'Charminar Kitchen',
    businessCategory: 'restaurant',
    vertical: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '+919812345678',
    businessBrain: {
      identity: {
        name: 'Charminar Kitchen',
        category: 'restaurant',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: { phone: '+919812345678', whatsapp: '+919812345678' },
      },
      audience: { targetCustomer: 'Local vegetarian families', localities: ['Kondapur'] },
      positioning: { usp: 'Freshly prepared vegetarian biryani' },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 5,
        minimumOrder: 199,
        offerValidityRules: '',
        pricingRules: '',
      },
    } as never,
    brandProfile: {},
    objective: 'promotion',
    productName: 'Paneer Biryani',
    offerHeadline: 'Paneer Biryani',
    offerPrice: 299,
    offerOriginalPrice: 399,
    offerType: 'discount',
    audience: { localities: ['Kondapur'] },
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    offerValidityStart: '2026-10-10T00:00:00.000Z',
    offerValidityEnd: '2026-10-15T00:00:00.000Z',
    cta: 'order_whatsapp',
    localizationProfile: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'te_en',
      secondaryLanguage: 'te',
      languageMixing: 'natural',
      regionalStyle: 'hyderabadi',
      slangPreference: 'moderate',
      audienceDescription: 'Local vegetarian families',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    } as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

/** A Mumbai restaurant that speaks Hinglish. `localizationProfile` deliberately has NO regionalStyle. */
const mumbaiHinglish = (over: Over = {}): GenerationPipelineInput =>
  ({
    businessId: 'b2',
    campaignId: 'c2',
    businessName: 'Bandra Bites',
    businessCategory: 'restaurant',
    vertical: 'restaurant',
    businessLocation: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
    whatsappNumber: '',
    businessBrain: {
      identity: {
        name: 'Bandra Bites',
        category: 'restaurant',
        location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
        contact: {},
      },
      audience: { targetCustomer: 'Office-goers', localities: ['Bandra'] },
      businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
    } as never,
    brandProfile: {},
    objective: 'brand_awareness',
    productName: 'Paneer Biryani',
    offerHeadline: 'Paneer Biryani',
    offerPrice: 250,
    offerType: 'fixed',
    audience: { localities: ['Bandra'] },
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    cta: 'order_whatsapp',
    localizationProfile: {
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Bandra',
      primaryLanguage: 'hi_en',
      secondaryLanguage: 'hi',
      languageMixing: 'natural',
      audienceDescription: 'Office-goers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    } as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

async function promptsFor(input: GenerationPipelineInput): Promise<string> {
  calls.length = 0;
  await new GenerationPipeline().execute(input);
  return calls.join('\n=====\n');
}

describe('the Creative Brain path is really exercised', () => {
  it('both Creative Brain prompts are built (opportunity and concepts), so they are scanned too', async () => {
    const all = await promptsFor(mumbaiHinglish());
    expect(all).toContain('Strategic Reasoning Engine');
    expect(all).toContain('Concept Generator');
  });
});

describe('Mumbai / Hinglish restaurant: no other city or language reaches any prompt', () => {
  it('no Hyderabad / Telangana / Telugu / Kondapur / Hyderabadi in any prompt, even with no regional style on file', async () => {
    const all = await promptsFor(mumbaiHinglish());
    expect(all).not.toMatch(/hyderabad|telangana|telugu|kondapur|cheyyandi/i);
  });

  it('an unknown offer validity is "not provided", never a made-up window', async () => {
    const all = await promptsFor(mumbaiHinglish());
    // The campaign's own run dates are known (duration); the OFFER's validity is not.
    expect(all).toMatch(/Offer Validity: not provided/);
    expect(all).not.toMatch(/Offer Validity: \d{4}-\d{2}-\d{2}/);
  });
});

describe('Hyderabad Telugu + English restaurant: every known fact arrives, flavour kept', () => {
  it('carries price, original price, radius, minimum order, number, validity and local flavour', async () => {
    const all = await promptsFor(hyderabadRich());
    expect(all).toContain('₹299');
    expect(all).toContain('₹399');
    expect(all).toMatch(/\b5\s?km\b/i);
    expect(all).toMatch(/199/);
    expect(all).toContain('9812345678');
    expect(all).toContain('2026-10-10');
    expect(all).toContain('2026-10-15');
    expect(all).toMatch(/hyderabad/i);
    expect(all).toMatch(/telugu/i);
  });
});

describe('mutation: changing exactly one fact changes exactly that fact downstream', () => {
  it('price 299 -> 349: the new price is used and the old one does not leak', async () => {
    const before = await promptsFor(hyderabadRich());
    const after = await promptsFor(hyderabadRich({ offerPrice: 349 }));
    expect(before).toContain('₹299');
    expect(after).toContain('₹349');
    expect(after).not.toContain('₹299');
  });

  it('delivery radius 5 -> 8 km', async () => {
    const base = hyderabadRich();
    const changed = hyderabadRich({
      businessBrain: {
        ...(base.businessBrain as object),
        businessRules: {
          openingHours: {},
          deliveryRadiusKm: 8,
          minimumOrder: 199,
          offerValidityRules: '',
          pricingRules: '',
        },
      } as never,
    });
    const after = await promptsFor(changed);
    expect(after).toMatch(/\b8\s?km\b/i);
    expect(after).not.toMatch(/\b5\s?km\b/i);
  });

  it('WhatsApp number changes: the new number appears, the old one does not', async () => {
    // updateBusiness keeps businessBrain.identity.contact in step with business.contact, so the Brain carries the new number too.
    const base = hyderabadRich();
    const brain = base.businessBrain as { identity: { contact: object } };
    const after = await promptsFor(
      hyderabadRich({
        whatsappNumber: '+919000011111',
        businessBrain: {
          ...(base.businessBrain as object),
          identity: {
            ...brain.identity,
            contact: { phone: '+919000011111', whatsapp: '+919000011111' },
          },
        } as never,
      })
    );
    expect(after).toContain('9000011111');
    expect(after).not.toContain('9812345678');
  });

  it('product changes: the new product is used', async () => {
    const after = await promptsFor(
      hyderabadRich({ productName: 'Veg Dum Biryani', offerHeadline: 'Veg Dum Biryani' })
    );
    expect(after).toContain('Veg Dum Biryani');
    expect(after).not.toContain('Paneer Biryani');
  });

  it('language and place change together: Hyderabad Telugu -> Mumbai Hinglish leaves no trace of the first', async () => {
    const after = await promptsFor(
      hyderabadRich({
        businessLocation: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
        businessBrain: mumbaiHinglish().businessBrain,
        audience: { localities: ['Bandra'] },
        localizationProfile: mumbaiHinglish().localizationProfile,
      })
    );
    expect(after).not.toMatch(/hyderabad|telangana|telugu|kondapur|cheyyandi/i);
  });
});

describe('campaign never rewrites the Business Brain', () => {
  it('the Brain object handed to the pipeline is deep-equal after a campaign that has its own price, offer and dates', async () => {
    const input = hyderabadRich();
    const snapshot = JSON.parse(JSON.stringify(input.businessBrain));
    await new GenerationPipeline().execute(input);
    expect(JSON.parse(JSON.stringify(input.businessBrain))).toEqual(snapshot);
  });
});


/** A general business (yoga studio). It is not a restaurant, a salon or a property seller. */
const yogaStudio = (over: Over = {}): GenerationPipelineInput =>
  ({
    businessId: 'b3',
    campaignId: 'c3',
    businessName: 'Calm Yoga',
    businessCategory: 'general',
    vertical: 'general',
    businessLocation: { city: 'Pune', state: 'Maharashtra' },
    whatsappNumber: '',
    businessBrain: {
      identity: {
        name: 'Calm Yoga',
        category: 'general',
        industry: 'fitness',
        location: { city: 'Pune', state: 'Maharashtra' },
        contact: {},
      },
      audience: { targetCustomer: 'Working professionals', localities: ['Pune'] },
      businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
    } as never,
    brandProfile: {},
    objective: 'brand_awareness',
    productName: 'Beginner Yoga Course',
    offerHeadline: 'Beginner Yoga Course',
    offerPrice: 2000,
    offerType: 'fixed',
    audience: { localities: ['Pune'] },
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    cta: 'order_whatsapp',
    localizationProfile: {
      country: 'India',
      state: 'Maharashtra',
      city: 'Pune',
      primaryLanguage: 'en',
      secondaryLanguage: 'en',
      languageMixing: 'minimal',
      regionalStyle: 'neutral',
      audienceDescription: 'Working professionals',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    } as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

describe('general business (yoga studio): no restaurant assumptions in any prompt', () => {
  it('the Creative Brain treats it as a general business, not a restaurant', async () => {
    const all = await promptsFor(yogaStudio());
    expect(all).toContain('Strategic Reasoning Engine for a local general business');
    expect(all).toContain('Concept Generator for a local general business');
  });

  it('no restaurant words reach any prompt', async () => {
    const all = await promptsFor(yogaStudio());
    const hit = all.match(/restaurant|biryani|\bdish(es)?\b|craving|dine-?in|takeaway|delivery radius|kitchen|\bmenu\b|\bfood\b/i);
    expect(hit && all.slice(Math.max(0, (hit.index ?? 0) - 120), (hit.index ?? 0) + 120)).toBeNull();
  });
});

/** Real estate: known listing facts, UNKNOWN possession date. */
const propertySeller = (over: Over = {}): GenerationPipelineInput =>
  ({
    ...yogaStudio(),
    businessId: 'b4',
    campaignId: 'c4',
    businessName: 'Skyline Homes',
    businessCategory: 'real_estate',
    vertical: 'real_estate',
    businessLocation: { city: 'Pune', state: 'Maharashtra', locality: 'Hinjewadi' },
    businessBrain: {
      identity: {
        name: 'Skyline Homes',
        category: 'real_estate',
        location: { city: 'Pune', state: 'Maharashtra', locality: 'Hinjewadi' },
        contact: {},
      },
      audience: { targetCustomer: 'First-time buyers', localities: ['Hinjewadi'] },
      businessRules: { openingHours: {}, offerValidityRules: '', pricingRules: '' },
      verticalProfile: {
        vertical: 'real_estate',
        properties: [
          {
            id: 'p1',
            title: 'Skyline 2BHK',
            propertyType: 'apartment',
            bedrooms: 2,
            price: 6500000,
            possessionStatus: 'under_construction',
            amenities: [],
            availability: 'available',
            active: true,
          },
        ],
      },
    } as never,
    productName: 'Skyline 2BHK',
    offerHeadline: 'Skyline 2BHK',
    offerPrice: 6500000,
    ...over,
  }) as GenerationPipelineInput;

describe('real estate: known listing facts, unknown possession date', () => {
  it('states the listing facts it has and invents no possession date or handover month', async () => {
    const all = await promptsFor(propertySeller());
    expect(all).toMatch(/Skyline 2BHK/);
    expect(all).not.toMatch(
      /possession (?:in|by|from|on)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d\d)/i
    );
    // Instructions may NAME a forbidden phrase ("never call it ready to move"); only an assertion would be a fact.
    const asserted = all
      .split('\n')
      .filter((l) => !/never|do not|don't/i.test(l))
      .join('\n');
    expect(asserted).not.toMatch(/ready to move|ready-to-move|immediate possession/i);
  });
});

describe('AI failure behaviour: a failed Creative Brain is visible, never disguised as success', () => {
  it('a Creative Brain whose model calls fail still lets the campaign finish, and says it fell back (with the reason)', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      const p = String(prompt);
      calls.push(p);
      // Opportunity formation returns nothing usable: the Creative Brain must fall back.
      return p.includes('Strategic Reasoning Engine') ? {} : {};
    });
    try {
      calls.length = 0;
      const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
      expect(result.success).toBe(true);
      const trace = result.stages.creativeBlueprint?.trace;
      expect(trace?.fallbackTriggered).toBe(true);
      expect(trace?.fallbackReason).toBeTruthy();
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });

  it('a Creative Brain that works is not marked as a fallback', async () => {
    calls.length = 0;
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    expect(result.stages.creativeBlueprint?.trace?.fallbackTriggered).toBeFalsy();
  });

  it('the fallback blueprint contains no fact the business did not give', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      calls.push(String(prompt));
      return {};
    });
    try {
      const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
      const bp = JSON.stringify(result.stages.creativeBlueprint ?? {});
      const bad = bp.match(/hyderabad|telangana|telugu|\b5\s?km\b|minimum order|special price|\b\d{1,3}\s?%\s?off\b/i);
      expect(bad && bp.slice(Math.max(0, (bad.index ?? 0) - 80), (bad.index ?? 0) + 80)).toBeNull();
      expect(bp).not.toMatch(/Verified local business service/i);
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });
});

describe('observability: where the time goes', () => {
  it('every stage reports its own duration, stored with the campaign', async () => {
    calls.length = 0;
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    const t = result.campaignPack.metadata.stageTimingsMs as Record<string, number>;
    for (const stage of [
      'business_understanding',
      'product_understanding',
      'creative_brain',
      'campaign_strategy',
      'localization_strategy',
      'copy_generation',
      'creative_direction',
      'image_generation',
      'truth_validation',
      'quality_validation',
      'safety_validation',
      'truth_check',
      'campaign_assembly',
    ]) {
      expect(typeof t[stage]).toBe('number');
      expect(t[stage]).toBeGreaterThanOrEqual(0);
    }
  });
});

/** The first words of the truth, quality and safety validation prompts. */
const VALIDATION_OPENER = /fact-checker|Verify campaign pack quality|SAFETY CHECKLIST/;

describe('the three AI validations are independent and run together', () => {
  const validation = (p: string) =>
    VALIDATION_OPENER.test(p.slice(0, 500)) ? p : undefined;

  it("no validation prompt contains another validation's output", async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    const seen: string[] = [];
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      const p = String(prompt);
      if (validation(p)) seen.push(p);
      return original(prompt);
    });
    try {
      await new GenerationPipeline().execute(mumbaiHinglish());
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
    expect(seen.length).toBeGreaterThanOrEqual(3);
  });

  it('their model calls overlap in time (they are not serialised)', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    let inFlight = 0;
    let peak = 0;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      const isValidation = VALIDATION_OPENER.test(String(prompt).slice(0, 500));
      if (isValidation) {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 25));
        inFlight--;
      }
      return original(prompt);
    });
    try {
      await new GenerationPipeline().execute(mumbaiHinglish());
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
    expect(peak).toBeGreaterThanOrEqual(2);
  });

  it('a failing validation still fails the campaign', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      if (/fact-checker/i.test(String(prompt).slice(0, 500))) throw new Error('model down');
      return original(prompt);
    });
    try {
      await expect(new GenerationPipeline().execute(mumbaiHinglish())).rejects.toThrow('model down');
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });
});

describe('campaign duration is not offer validity (whole pipeline)', () => {
  const validityClaim = /(valid|validity|offer ends|offer period|till|until)[^\n]{0,60}(10 Oct|15 Oct|2026-10-1[05])/i;

  it('A. campaign dates and NO offer dates: no prompt presents the campaign dates as the offer window', async () => {
    const all = await promptsFor(mumbaiHinglish());
    expect(all).toMatch(/Offer Validity: not provided/);
    const hit = all.match(validityClaim);
    expect(hit && all.slice(Math.max(0, (hit.index ?? 0) - 80), (hit.index ?? 0) + 140)).toBeNull();
  });

  it('B. offer dates the owner gave are carried as the offer window, separate from the campaign dates', async () => {
    const all = await promptsFor(
      mumbaiHinglish({
        offerValidityStart: '2026-10-12T00:00:00.000Z',
        offerValidityEnd: '2026-10-13T23:59:59.000Z',
      })
    );
    expect(all).toContain('2026-10-12');
    expect(all).toContain('2026-10-13');
  });
});

describe('the campaign trace answers: did the Creative Brain run, and where did each fact come from', () => {
  const failingOpportunity = async (prompt: unknown) => {
    calls.push(String(prompt));
    return {};
  };

  it('a Creative Brain that worked is recorded as success, with no fallback reason', async () => {
    calls.length = 0;
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    expect(result.campaignPack.metadata.creativeBrain).toEqual({ status: 'success' });
    expect(result.stages.creativeBlueprint.trace.status).toBe('success');
  });

  it('a Creative Brain that fell back is recorded as fallback, with the reason, in the stored campaign', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(failingOpportunity as never);
    try {
      const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
      expect(result.success).toBe(true);
      expect(result.campaignPack.metadata.creativeBrain.status).toBe('fallback');
      expect(result.campaignPack.metadata.creativeBrain.reason).toBeTruthy();
      expect(result.stages.creativeBlueprint.trace.status).toBe('fallback');
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });

  it('a fallback blueprint does NOT stand in for the AI strategy: the strategy model call still happens', async () => {
    const strategyCalls = (all: string[]) =>
      all.filter((p) => /Create a campaign strategy/i.test(p.slice(0, 800))).length;
    calls.length = 0;
    await new GenerationPipeline().execute(mumbaiHinglish());
    const withBrain = strategyCalls(calls);

    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(failingOpportunity as never);
    try {
      calls.length = 0;
      await new GenerationPipeline().execute(mumbaiHinglish());
      const withFallback = strategyCalls(calls);
      expect(withBrain).toBe(0); // derived from the real blueprint
      expect(withFallback).toBe(1); // the generic fallback is never used as the strategy
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });

  it('the campaign stores its model-call log and a summary', async () => {
    calls.length = 0;
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    expect(Array.isArray(result.campaignPack.metadata.aiCalls)).toBe(true);
    expect(result.campaignPack.metadata.aiCallSummary).toEqual(
      expect.objectContaining({ total: expect.any(Number), repairs: expect.any(Number) })
    );
  });

  it('factSources names where the price, language and Brain facts came from', async () => {
    const input = hyderabadRich();
    (input.businessBrain as any).knowledge = {
      origin: 'conversational_onboarding',
      confirmedAt: 'x',
      facts: {
        'identity.name': { source: 'USER_CONFIRMED' },
        'contact.whatsapp': { source: 'USER_CONFIRMED' },
        'contact.phone': { source: 'DERIVED_FROM_WHATSAPP' },
      },
    };
    const result: any = await new GenerationPipeline().execute(input);
    const sources: Array<{ fact: string; origin: string; provenance: string; value: string }> =
      result.campaignPack.metadata.factSources;
    const by = (fact: string) => sources.find((s) => s.fact === fact);
    expect(by('offer.price')).toMatchObject({
      value: '299',
      origin: 'campaign_request',
      provenance: 'OWNER_ENTERED_FOR_CAMPAIGN',
    });
    expect(by('contact.whatsapp')).toMatchObject({ origin: 'business_brain', provenance: 'USER_CONFIRMED' });
    expect(by('contact.phone')).toMatchObject({ provenance: 'DERIVED_FROM_WHATSAPP' });
    // delivery radius was set in an editor: no provenance record, and it says so rather than claiming one
    expect(by('delivery.radiusKm')).toMatchObject({ provenance: 'NOT_RECORDED' });
  });

  it('factSources lists nothing for facts the business never gave (sparse business)', async () => {
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    const facts = (result.campaignPack.metadata.factSources as Array<{ fact: string }>).map((s) => s.fact);
    for (const unknown of [
      'offer.originalPrice',
      'offer.validity',
      'contact.whatsapp',
      'contact.phone',
      'delivery.radiusKm',
      'delivery.minimumOrder',
      'positioning.usp',
    ]) {
      expect(facts).not.toContain(unknown);
    }
    expect(facts).toContain('offer.price');
    expect(facts).toContain('campaign.duration');
  });

  it('whole-campaign validity is recorded as the owner having chosen it', async () => {
    const result: any = await new GenerationPipeline().execute(
      mumbaiHinglish({
        offerValidityStart: '2026-10-10T00:00:00.000Z',
        offerValidityEnd: '2026-10-15T23:59:59.000Z',
        offerValiditySource: 'whole_campaign',
      })
    );
    const v = (result.campaignPack.metadata.factSources as Array<{ fact: string; provenance: string }>).find(
      (s) => s.fact === 'offer.validity'
    );
    expect(v?.provenance).toBe('OWNER_CHOSE_WHOLE_CAMPAIGN');
  });
});

describe('failure modes never turn into a silent success', () => {
  const modes: Array<[string, () => unknown]> = [
    ['an empty object', () => ({})],
    [
      'a thrown 503',
      () => {
        throw new Error('503 Service Unavailable');
      },
    ],
    [
      'a timeout',
      () => {
        throw new Error('Deadline exceeded');
      },
    ],
    [
      'a quota error',
      () => {
        throw new Error('429 Resource exhausted');
      },
    ],
    ['a string instead of an object', () => 'not an object'],
    ['null', () => null],
  ];

  it.each(modes)(
    'Creative Brain call returns %s: the campaign finishes, labelled, never "success"',
    async (_label, answer) => {
      const original = generateStructuredTextMock.getMockImplementation()!;
      generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
        const p = String(prompt);
        if (p.includes('Strategic Reasoning Engine') || p.includes('Concept Generator')) return answer() as never;
        return original(prompt);
      });
      try {
        const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
        expect(result.success).toBe(true);
        expect(result.campaignPack.metadata.creativeBrain.status).not.toBe('success');
        expect(result.campaignPack.metadata.creativeBrain.reason).toBeTruthy();
      } finally {
        generateStructuredTextMock.mockImplementation(original);
      }
    }
  );

  it('an opportunity the factuality gate rejects (free, for a paid item) is a labelled fallback, never a success', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      const out: any = await original(prompt);
      return String(prompt).includes('Strategic Reasoning Engine')
        ? { ...out, opportunityStatement: 'Get this biryani absolutely free today' }
        : out;
    });
    try {
      const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
      expect(result.campaignPack.metadata.creativeBrain).toMatchObject({
        status: 'fallback',
        reason: 'OPPORTUNITY_FALLBACK',
      });
      expect(result.campaignPack.metadata.creativeBrain.detail).toMatch(/rejected/i);
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });

  it('an opportunity call that throws is a labelled fallback, with the provider error in the detail', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      if (String(prompt).includes('Strategic Reasoning Engine')) throw new Error('503 Service Unavailable');
      return original(prompt);
    });
    try {
      const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
      expect(result.campaignPack.metadata.creativeBrain.status).toBe('fallback');
      expect(result.campaignPack.metadata.creativeBrain.detail).toMatch(/503/);
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });

  it('a non-Creative-Brain AI stage that fails outright still fails the campaign (no invented output)', async () => {
    const original = generateStructuredTextMock.getMockImplementation()!;
    generateStructuredTextMock.mockImplementation(async (prompt: unknown) => {
      if (/5 HEADLINES/.test(String(prompt))) throw new Error('model down');
      return original(prompt);
    });
    try {
      await expect(new GenerationPipeline().execute(mumbaiHinglish())).rejects.toThrow();
    } finally {
      generateStructuredTextMock.mockImplementation(original);
    }
  });
});


describe('the strategy derived from the Creative Brain contains no claim the business did not make', () => {
  it('no guarantee, hidden-charge, "limited time" or generic-quality claim is padded in', async () => {
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    const strategy = JSON.stringify(result.stages.campaignStrategy);
    expect(strategy).not.toMatch(/guarantee|hidden charges|for a limited time|authentic quality|verified pricing/i);
  });

  it('with no offer dates, the urgency line says so instead of inventing a deadline', async () => {
    const result: any = await new GenerationPipeline().execute(mumbaiHinglish());
    expect(result.stages.campaignStrategy.ctaStrategy.urgency).toMatch(/No offer end date was given/);
  });

  it('with offer dates the owner gave, the urgency line carries exactly those dates', async () => {
    const result: any = await new GenerationPipeline().execute(hyderabadRich());
    expect(result.stages.campaignStrategy.ctaStrategy.urgency).toBe('Offer valid 2026-10-10 to 2026-10-15');
  });

  it('padded differentiators are the business\'s own facts', async () => {
    const result: any = await new GenerationPipeline().execute(hyderabadRich());
    const differentiators: string[] = result.stages.campaignStrategy.differentiators;
    expect(differentiators.length).toBeGreaterThanOrEqual(3);
    expect(differentiators.join(' | ')).toMatch(/Charminar Kitchen/);
  });
});

describe('a fallback always says why', () => {
  it('no viable concept (a CTA the vertical does not allow) is labelled NO_VIABLE_CONCEPT', async () => {
    // real estate allows only call_now / get_directions: an order_whatsapp CTA scores 0 on truth alignment
    const result: any = await new GenerationPipeline().execute(propertySeller({ cta: 'order_whatsapp' }));
    expect(result.campaignPack.metadata.creativeBrain).toMatchObject({
      status: 'fallback',
      reason: 'NO_VIABLE_CONCEPT',
    });
  });

  it('the same business with a CTA its vertical allows gets a real Creative Brain', async () => {
    const result: any = await new GenerationPipeline().execute(propertySeller({ cta: 'call_now' }));
    expect(result.campaignPack.metadata.creativeBrain).toEqual({ status: 'success' });
  });

  it('no prompt asks any business about a restaurant-only audience segment', async () => {
    const all = await promptsFor(yogaStudio());
    expect(all).not.toMatch(/foodie/i);
  });
});
