/**
 * Phase 29 (foundation) / Phase 30 (salon) / Phase 31 (real_estate) — proves:
 * 1. Restaurant's config is a faithful, byte-identical extraction of the
 *    strings that used to be hard-coded in pipeline.ts/vision.ts/truthCheck.ts
 *    (regression protection — restaurant behavior must not change).
 * 2. All three verticals are now fully implemented; assertVerticalImplemented
 *    only refuses a genuinely unknown category (proven via a cast, since
 *    every real BusinessCategory value is implemented as of this phase).
 * 3. The shared AI pipeline and deterministic Truth Check actually consume
 *    VerticalConfig (not a parallel/duplicate system) — proven by invoking
 *    the real (private, via reflection) pipeline prompt builders and the
 *    real exported runDeterministicTruthCheck with different `vertical`
 *    values and observing the output change accordingly.
 */
import {
  VERTICAL_CONFIGS,
  getVerticalConfig,
  getVerticalConfigOrDefault,
  isVerticalImplemented,
  assertVerticalImplemented,
  UnsupportedVerticalError,
} from './verticals';
import { GenerationPipeline } from '../services/ai/pipeline';
import { runDeterministicTruthCheck } from '../services/ai/truthCheck';
import type { GenerationPipelineInput } from '../types';

describe('VerticalConfig — restaurant is unchanged', () => {
  it('all three verticals are implemented as of Phase 31', () => {
    expect(VERTICAL_CONFIGS.restaurant.implemented).toBe(true);
    expect(VERTICAL_CONFIGS.salon.implemented).toBe(true);
    expect(VERTICAL_CONFIGS.real_estate.implemented).toBe(true);
  });

  it('carries the exact prompt strings that used to be hard-coded (regression guard)', () => {
    const ctx = VERTICAL_CONFIGS.restaurant.promptContext;
    expect(ctx.businessUnderstandingVerticalContext).toBe(
      'Restaurant-specific context (menu structure, service modes, time-parts, occasions, offer types)'
    );
    expect(ctx.productAnalystPersona).toBe('a product analyst for restaurant marketing');
    expect(ctx.imageAnalystPersona).toBe(
      'You are an expert food/product analyst for Indian restaurant marketing campaigns. Analyze the provided product images and return a detailed structured analysis.'
    );
    expect(ctx.campaignStrategistPersona).toBe(
      'You are a senior marketing strategist for Indian local restaurants. Create a campaign strategy that drives WhatsApp orders.'
    );
    expect(ctx.copywriterSystemRules).toBe(
      'You are a Hyderabadi marketing copywriter. Generate a complete campaign pack for a Hyderabad restaurant. Use the localization strategy to write NATURAL Telugu-English-Hinglish copy. Every piece must drive WhatsApp action. Preserve ALL business facts exactly.'
    );
    expect(ctx.creativeDirectorSystemRules).toBe(
      'You are a creative director for Instagram food marketing. Generate detailed, actionable image prompts for AI image generation. Each prompt must produce Instagram-ready vertical images (4:5 for posts, 9:16 for Stories/Reels). Include brand colors, logo placement, and offer text overlays.'
    );
  });

  it('carries the exact Truth Check claim-keyword table that used to be hard-coded in truthCheck.ts', () => {
    const keywords = VERTICAL_CONFIGS.restaurant.truthCheckClaimKeywords.map((k) => k.keyword);
    expect(keywords).toEqual(
      expect.arrayContaining(['free delivery', 'dine in', 'takeaway', 'parking', 'wifi', 'catering'])
    );
    expect(keywords.length).toBe(24);
  });
});

describe('VerticalConfig — unsupported verticals cannot accidentally appear', () => {
  it('every implemented vertical has a real, non-empty Truth Check keyword table', () => {
    expect(VERTICAL_CONFIGS.restaurant.truthCheckClaimKeywords.length).toBeGreaterThan(0);
    expect(VERTICAL_CONFIGS.salon.truthCheckClaimKeywords.length).toBeGreaterThan(0);
    expect(VERTICAL_CONFIGS.real_estate.truthCheckClaimKeywords.length).toBeGreaterThan(0);
  });

  it('isVerticalImplemented reports true for all three current verticals', () => {
    expect(isVerticalImplemented('restaurant')).toBe(true);
    expect(isVerticalImplemented('salon')).toBe(true);
    expect(isVerticalImplemented('real_estate')).toBe(true);
  });

  it('assertVerticalImplemented never throws for a real, current BusinessCategory', () => {
    expect(() => assertVerticalImplemented('restaurant')).not.toThrow();
    expect(() => assertVerticalImplemented('salon')).not.toThrow();
    expect(() => assertVerticalImplemented('real_estate')).not.toThrow();
  });

  it('assertVerticalImplemented DOES throw for a genuinely unknown category (proves the gate is a real check, not a no-op)', () => {
    expect(() => assertVerticalImplemented('spa' as any)).toThrow(UnsupportedVerticalError);
  });

  it('getVerticalConfig throws for a genuinely unknown category rather than guessing', () => {
    expect(() => getVerticalConfig('spa' as any)).toThrow(/unknown business vertical/i);
  });
});

describe('VerticalConfig — salon objectives/CTAs never leak restaurant-only values', () => {
  it('salon allows only its own objectives', () => {
    expect(VERTICAL_CONFIGS.salon.allowedObjectives).toEqual([
      'service_promotion',
      'package_promotion',
      'appointment_promotion',
      'new_service',
    ]);
    expect(VERTICAL_CONFIGS.salon.allowedObjectives).not.toContain('new_dish');
  });

  it('salon allows book_appointment but never restaurant-specific CTAs', () => {
    expect(VERTICAL_CONFIGS.salon.allowedCTAs).toContain('book_appointment');
    expect(VERTICAL_CONFIGS.salon.allowedCTAs).not.toContain('book_table');
    expect(VERTICAL_CONFIGS.salon.allowedCTAs).not.toContain('view_menu');
    expect(VERTICAL_CONFIGS.salon.allowedCTAs).not.toContain('order_whatsapp');
  });
});

describe('VerticalConfig — real_estate objectives/CTAs never leak restaurant/salon-only values (Phase 31)', () => {
  it('real_estate allows exactly its own four objectives, nothing invented', () => {
    expect(VERTICAL_CONFIGS.real_estate.allowedObjectives).toEqual([
      'property_promotion',
      'new_listing',
      'open_house',
      'project_promotion',
    ]);
    expect(VERTICAL_CONFIGS.real_estate.allowedObjectives).not.toContain('new_dish');
    expect(VERTICAL_CONFIGS.real_estate.allowedObjectives).not.toContain('service_promotion');
  });

  it('real_estate allows only call_now/get_directions — never restaurant or salon CTAs', () => {
    expect(VERTICAL_CONFIGS.real_estate.allowedCTAs).toEqual(['call_now', 'get_directions']);
    expect(VERTICAL_CONFIGS.real_estate.allowedCTAs).not.toContain('book_table');
    expect(VERTICAL_CONFIGS.real_estate.allowedCTAs).not.toContain('book_appointment');
    expect(VERTICAL_CONFIGS.real_estate.allowedCTAs).not.toContain('order_whatsapp');
  });
});

describe('VerticalConfig — backward compatibility for legacy/unknown category values', () => {
  it('falls back to the restaurant config, not an error, for an unrecognized category', () => {
    expect(getVerticalConfigOrDefault('some-legacy-value')).toBe(VERTICAL_CONFIGS.restaurant);
    expect(getVerticalConfigOrDefault(undefined)).toBe(VERTICAL_CONFIGS.restaurant);
    expect(getVerticalConfigOrDefault(null)).toBe(VERTICAL_CONFIGS.restaurant);
  });

  it('resolves a known category to its own config, not always restaurant', () => {
    expect(getVerticalConfigOrDefault('salon')).toBe(VERTICAL_CONFIGS.salon);
  });
});

describe('Shared AI pipeline actually consumes VerticalConfig (not a parallel system)', () => {
  const baseInput: Partial<GenerationPipelineInput> = {
    businessId: 'biz_1',
    businessName: 'Test Biz',
    businessCategory: 'restaurant',
    businessBrain: {},
    brandProfile: {},
    objective: 'weekend_offer',
    productName: 'Test Product',
    offerHeadline: 'Offer',
    offerPrice: 199,
    offerType: 'percentage',
    offerValidityStart: new Date().toISOString(),
    offerValidityEnd: new Date().toISOString(),
    duration: { start: new Date().toISOString(), end: new Date().toISOString() },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {},
    campaignStyle: 'funny',
  };

  function buildCopyPrompt(vertical?: 'restaurant' | 'salon' | 'real_estate') {
    const pipeline = new GenerationPipeline();
    // buildCopyGenerationPrompt is private — reflection is the only way to
    // unit-test it directly without running the full 13-stage pipeline
    // (which requires real/mocked AI provider calls at every stage).
    return (pipeline as any).buildCopyGenerationPrompt(
      { ...baseInput, vertical } as GenerationPipelineInput,
      {}
    ) as string;
  }

  it('produces the restaurant-flavored prompt when vertical is restaurant (or unset — default)', () => {
    expect(buildCopyPrompt('restaurant')).toContain('Hyderabadi marketing copywriter');
    expect(buildCopyPrompt(undefined)).toContain('Hyderabadi marketing copywriter');
  });

  it('produces a DIFFERENT, salon-flavored prompt when vertical is salon — proving the pipeline reads VerticalConfig, not a hard-coded string', () => {
    const salonPrompt = buildCopyPrompt('salon');
    expect(salonPrompt).not.toContain('Hyderabadi marketing copywriter');
    expect(salonPrompt).toContain('salon');
  });

  it('produces a DIFFERENT, real-estate-flavored prompt when vertical is real_estate (Phase 31)', () => {
    const realEstatePrompt = buildCopyPrompt('real_estate');
    expect(realEstatePrompt).not.toContain('Hyderabadi marketing copywriter');
    expect(realEstatePrompt).not.toContain('salon');
    expect(realEstatePrompt).toContain('real estate');
  });
});

describe('Shared deterministic Truth Check receives correct vertical context', () => {
  const previousResults = {
    businessUnderstanding: { businessFacts: [] },
  };

  function baseInput(vertical?: 'restaurant' | 'salon' | 'real_estate'): GenerationPipelineInput {
    return {
      businessId: 'biz_1',
      businessName: 'Test Biz',
      businessCategory: vertical || 'restaurant',
      businessBrain: {},
      brandProfile: {},
      objective: 'weekend_offer',
      productName: 'Test Product',
      offerHeadline: 'Offer',
      offerPrice: 199,
      offerType: 'percentage',
      offerValidityStart: new Date().toISOString(),
      offerValidityEnd: new Date().toISOString(),
      duration: { start: new Date().toISOString(), end: new Date().toISOString() },
      audience: { localities: ['Kondapur'] },
      cta: 'order_whatsapp',
      localizationProfile: {},
      campaignStyle: 'funny',
      vertical,
    } as GenerationPipelineInput;
  }

  // "parking" is deliberately used here (not "free delivery") because
  // "free delivery" also appears in checkProhibitedClaims' universal,
  // vertical-agnostic list — using it would leave this test unable to tell
  // whether it was the vertical-gated check or the universal one that
  // fired. "parking" only appears in the vertical-specific keyword table.
  it('flags an unsupported "parking" claim for restaurant (its keyword table is populated)', () => {
    const result = runDeterministicTruthCheck(baseInput('restaurant'), {
      ...previousResults,
      copyPack: { headlines: [{ text: 'We have parking available for all customers.' }] },
    });
    const unsupportedCheck = result.checks.find((c) =>
      c.reason?.includes('Unsupported claims detected')
    );
    expect(unsupportedCheck).toBeDefined();
    expect(unsupportedCheck!.status).toBe('REVIEW_REQUIRED');
  });

  it('does NOT flag "parking" for salon — that keyword belongs to restaurant, not salon (vertical isolation, not an empty table)', () => {
    const result = runDeterministicTruthCheck(baseInput('salon'), {
      ...previousResults,
      copyPack: { headlines: [{ text: 'We have parking available for all customers.' }] },
    });
    const unsupportedCheck = result.checks.find((c) =>
      c.reason?.includes('Unsupported claims detected')
    );
    expect(unsupportedCheck).toBeUndefined();
  });

  it('flags an unsupported "walk-in" claim for salon — Phase 30\'s real salon keyword table', () => {
    const result = runDeterministicTruthCheck(baseInput('salon'), {
      ...previousResults,
      copyPack: { headlines: [{ text: 'Walk-in anytime, no appointment needed!' }] },
    });
    const unsupportedCheck = result.checks.find((c) =>
      c.reason?.includes('Unsupported claims detected')
    );
    expect(unsupportedCheck).toBeDefined();
    expect(unsupportedCheck!.status).toBe('REVIEW_REQUIRED');
  });

  it('does NOT flag "walk-in" for restaurant — that keyword belongs to salon, not restaurant', () => {
    const result = runDeterministicTruthCheck(baseInput('restaurant'), {
      ...previousResults,
      copyPack: { headlines: [{ text: 'Walk-in anytime, no appointment needed!' }] },
    });
    const unsupportedCheck = result.checks.find((c) =>
      c.reason?.includes('Unsupported claims detected')
    );
    expect(unsupportedCheck).toBeUndefined();
  });

  it('flags an unsupported "RERA approved" claim for real_estate — Phase 31\'s real keyword table', () => {
    const result = runDeterministicTruthCheck(baseInput('real_estate'), {
      ...previousResults,
      copyPack: { headlines: [{ text: 'This RERA approved project is ready for you!' }] },
    });
    const unsupportedCheck = result.checks.find((c) =>
      c.reason?.includes('Unsupported claims detected')
    );
    expect(unsupportedCheck).toBeDefined();
    expect(unsupportedCheck!.status).toBe('REVIEW_REQUIRED');
  });

  it('does NOT flag "RERA approved" for restaurant or salon — that keyword belongs only to real_estate', () => {
    for (const vertical of ['restaurant', 'salon'] as const) {
      const result = runDeterministicTruthCheck(baseInput(vertical), {
        ...previousResults,
        copyPack: { headlines: [{ text: 'This RERA approved project is ready for you!' }] },
      });
      const unsupportedCheck = result.checks.find((c) =>
        c.reason?.includes('Unsupported claims detected')
      );
      expect(unsupportedCheck).toBeUndefined();
    }
  });

  it('universally prohibits real-estate investment overclaims regardless of vertical (Phase 31)', () => {
    const result = runDeterministicTruthCheck(baseInput('real_estate'), {
      ...previousResults,
      copyPack: { headlines: [{ text: 'Guaranteed returns on the best property in town!' }] },
    });
    expect(result.status).toBe('FAIL');
    const prohibitedCheck = result.checks.find((c) => c.reason?.includes('Prohibited claims'));
    expect(prohibitedCheck?.status).toBe('FAIL');
  });
});
