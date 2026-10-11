/**
 * `general` is a real, fully supported vertical — for retail, fitness, clinics, coaching, boutiques
 * and every other business that is not a restaurant, salon or real-estate agency. These tests prove
 * it is a working vertical with its own context, not a "not supported" placeholder, and that it
 * neither leaks other verticals' vocabulary nor loses the Truth Check protections.
 */
import {
  VERTICAL_CONFIGS,
  assertVerticalImplemented,
  getVerticalConfig,
  getVerticalConfigOrDefault,
  isVerticalImplemented,
} from './verticals';
import { GenerationPipeline } from '../services/ai/pipeline';
import { runDeterministicTruthCheck } from '../services/ai/truthCheck';
import type { GenerationPipelineInput } from '../types';

const general = VERTICAL_CONFIGS.general;

describe('general vertical — a genuine, implemented vertical', () => {
  it('is implemented, so campaign generation actually runs for it', () => {
    expect(general.implemented).toBe(true);
    expect(isVerticalImplemented('general')).toBe(true);
    expect(() => assertVerticalImplemented('general')).not.toThrow();
    expect(getVerticalConfig('general')).toBe(general);
    expect(getVerticalConfigOrDefault('general')).toBe(general);
  });

  it('has real, non-empty marketing context in every prompt slot — not a placeholder', () => {
    for (const [slot, value] of Object.entries(general.promptContext)) {
      // A slot is a sentence, or a list of requirement lines (imageStyleRequirements).
      const parts = Array.isArray(value) ? value : [value];
      expect(parts.length).toBeGreaterThan(0);
      for (const text of parts) {
        expect(text.length).toBeGreaterThan(Array.isArray(value) ? 20 : 40); // real guidance (one slot is a short persona fragment by design)
        expect(text).not.toMatch(/todo|placeholder|unsupported|coming soon/i);
      }
      expect(slot).toBeTruthy();
    }
    expect(general.label).not.toMatch(/unsupported|coming soon/i);
  });

  it('is written for any local business: no restaurant, salon or property vocabulary', () => {
    const text = Object.values(general.promptContext).join(' ').toLowerCase();
    for (const word of [
      'hyderabadi',
      'restaurant',
      'menu',
      'dish',
      'salon',
      'real estate',
      'rera',
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it('tells the model to use only what the owner said and never invent credentials', () => {
    expect(general.promptContext.copywriterSystemRules).toMatch(/Preserve ALL business facts/);
    expect(general.promptContext.copywriterSystemRules).toMatch(
      /never invent offers, prices, guarantees, certifications, awards or credentials/i
    );
    expect(general.promptContext.campaignStrategistPersona).toMatch(
      /only on what the owner has told you/i
    );
  });

  it('offers generic objectives — products and services, offers and occasions — and no vertical-only ones', () => {
    expect(general.allowedObjectives).toEqual(
      expect.arrayContaining(['product_promotion', 'new_product', 'service_promotion', 'discount'])
    );
    for (const other of [
      'new_dish',
      'package_promotion',
      'appointment_promotion',
      'property_promotion',
      'open_house',
    ]) {
      expect(general.allowedObjectives).not.toContain(other);
    }
  });

  it('offers CTAs that fit a generic business (WhatsApp, booking, call, directions) — never "book a table" or "view menu"', () => {
    expect(general.allowedCTAs).toEqual(
      expect.arrayContaining(['order_whatsapp', 'book_appointment', 'call_now', 'get_directions'])
    );
    expect(general.allowedCTAs).not.toContain('book_table');
    expect(general.allowedCTAs).not.toContain('view_menu');
  });

  it('does not offer a delivery discount it cannot assume (free_delivery is restaurant-shaped)', () => {
    expect(general.allowedOfferTypes).not.toContain('free_delivery');
  });

  it('only needs the facts onboarding always collects', () => {
    expect(general.requiredBusinessFields).toEqual(['name', 'location', 'contact.whatsapp']);
  });

  it('the other three verticals are untouched', () => {
    expect(Object.keys(VERTICAL_CONFIGS).sort()).toEqual([
      'general',
      'real_estate',
      'restaurant',
      'salon',
    ]);
    expect(VERTICAL_CONFIGS.restaurant.promptContext.copywriterSystemRules).toContain(
      'marketing copywriter for a local restaurant'
    );
  });
});

describe('general vertical — the pipeline really uses its config', () => {
  const baseInput = {
    businessId: 'biz_1',
    businessName: 'Fit Studio',
    businessCategory: 'general',
    businessBrain: {} as any,
    brandProfile: {},
    objective: 'product_promotion',
    productName: 'Monthly pass',
    offerHeadline: 'Offer',
    offerPrice: 999,
    offerType: 'percentage',
    offerValidityStart: new Date().toISOString(),
    offerValidityEnd: new Date().toISOString(),
    duration: { start: new Date().toISOString(), end: new Date().toISOString() },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {} as any,
    campaignStyle: 'funny',
    vertical: 'general',
  } as unknown as GenerationPipelineInput;

  it('builds a generic-business copy prompt, not the restaurant one', () => {
    const prompt = (new GenerationPipeline() as any).buildCopyGenerationPrompt(
      baseInput,
      {}
    ) as string;
    expect(prompt).toContain('marketing copywriter for a local business');
    expect(prompt).not.toContain('Hyderabadi marketing copywriter');
    expect(prompt).not.toContain('restaurant');
  });

  it('puts the business context (industry, offerings, audience, positioning) in front of the model', () => {
    const brain = {
      identity: { name: 'Fit Studio', industry: 'fitness', subcategory: 'yoga' },
      offerings: { signature: ['Group classes', 'Diet plans'] },
      audience: { targetCustomer: 'Working professionals', primary: ['Working professionals'] },
      positioning: { usp: 'Small batches, so every class gets personal attention' },
    };
    const prompt = (new GenerationPipeline() as any).buildBusinessUnderstandingPrompt({
      ...baseInput,
      businessBrain: brain,
    }) as string;
    for (const fact of [
      '"industry": "fitness"',
      'Group classes',
      'Working professionals',
      'Small batches',
    ]) {
      expect(prompt).toContain(fact);
    }
    expect(prompt).toContain('General local-business context');
  });
});

describe('general vertical — Truth Check', () => {
  const previous = { businessUnderstanding: { businessFacts: [] } };
  const input = (): GenerationPipelineInput =>
    ({
      businessId: 'biz_1',
      businessName: 'Fit Studio',
      businessCategory: 'general',
      businessBrain: {} as any,
      brandProfile: {},
      objective: 'discount',
      productName: 'Monthly pass',
      offerHeadline: 'Offer',
      offerPrice: 999,
      offerType: 'percentage',
      offerValidityStart: new Date().toISOString(),
      offerValidityEnd: new Date().toISOString(),
      duration: { start: new Date().toISOString(), end: new Date().toISOString() },
      audience: { localities: ['Kondapur'] },
      cta: 'order_whatsapp',
      localizationProfile: {} as any,
      campaignStyle: 'funny',
      vertical: 'general',
    }) as unknown as GenerationPipelineInput;

  const unsupported = (text: string) =>
    runDeterministicTruthCheck(input(), {
      ...previous,
      copyPack: { headlines: [{ text }] },
    }).checks.find((c) => c.reason?.includes('Unsupported claims detected'));

  it.each([
    ['Lifetime warranty on every purchase!', 'warranty'],
    ['Money-back if you are not happy', 'money-back'],
    ['Free installation at your doorstep', 'free installation'],
    ['EMI available on all items', 'emi available'],
    ['Certified trainers only', 'certified'],
    ['Open 24x7 for you', '24x7'],
  ])('sends an invented claim to the owner for review: %s', (text) => {
    const check = unsupported(text);
    expect(check).toBeDefined();
    expect(check!.status).toBe('REVIEW_REQUIRED');
  });

  it('lets ordinary marketing copy through untouched', () => {
    expect(
      unsupported('Join our new morning batch this Monday. Message us on WhatsApp!')
    ).toBeUndefined();
  });

  it("does not apply another vertical's claim table (no RERA or walk-in logic for a general business)", () => {
    expect(unsupported('This RERA approved plot is ready!')).toBeUndefined();
  });
});
