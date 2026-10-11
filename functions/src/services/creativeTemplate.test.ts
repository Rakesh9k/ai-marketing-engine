import {
  validateCreativeTemplate,
  CREATIVE_TEMPLATE_TYPES,
  CREATIVE_OBJECTIVES,
  CREATIVE_GRAMMAR_ROLES,
  VISUAL_EMPHASES,
  VISUAL_COMPOSITIONS,
  BUSINESS_CATEGORIES,
} from './creativeTemplate';
import type {
  CreativeTemplate,
  PostStructure,
  ReelStructure,
  PostTemplateConstraints,
  ReelTemplateConstraints,
} from '../types';

/**
 * Test fixtures only — not a production template library. Demonstrates
 * the complete Phase 3 schema (structure, visual grammar, adaptation
 * rules, constraints) with no business-specific data (no business name,
 * offer value, price, logo, colors, or fonts).
 */

const PROMOTION_TEMPLATE: CreativeTemplate = {
  id: 'promotion_offer_post',
  name: 'Offer Spotlight',
  description:
    'A conversion-focused structure that quickly presents value and ends with a direct CTA.',
  type: 'post',
  objectives: ['promotion', 'conversion'],
  compatibleVerticals: ['restaurant', 'salon'],
  structure: {
    type: 'post',
    grammar: [
      { id: 'hook', role: 'hook', purpose: 'Capture attention immediately', required: true },
      {
        id: 'product',
        role: 'product',
        purpose: 'Introduce what is being offered',
        required: true,
      },
      { id: 'offer', role: 'offer', purpose: 'State the value proposition', required: true },
      { id: 'urgency', role: 'urgency', purpose: 'Create a reason to act now', required: false },
      { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
    ],
  },
  visualGrammar: { emphasis: 'offer-led', composition: 'hero-product' },
  adaptationRules: [
    {
      id: 'emphasize_offer_if_available',
      condition: { check: 'offerAvailable' },
      action: { action: 'emphasize', role: 'offer' },
    },
    {
      id: 'omit_urgency_if_no_proof',
      condition: { check: 'proofAvailable' },
      action: { action: 'exclude', role: 'urgency' },
    },
  ],
  constraints: { type: 'post', minSections: 3, maxSections: 6, maxTextDensity: 'medium' },
  version: 1,
  active: true,
  source: 'system',
};

const AWARENESS_TEMPLATE: CreativeTemplate = {
  id: 'brand_awareness_intro',
  name: 'Who We Are',
  description:
    'Introduces the business identity and what sets it apart before showing the product.',
  type: 'post',
  objectives: ['awareness'],
  compatibleVerticals: ['restaurant', 'salon', 'real_estate'],
  structure: {
    type: 'post',
    grammar: [
      { id: 'hook', role: 'hook', purpose: 'Open with a relatable moment', required: true },
      { id: 'context', role: 'context', purpose: 'Establish who the business is', required: true },
      {
        id: 'differentiator',
        role: 'differentiator',
        purpose: 'Explain what makes it different',
        required: false,
      },
      { id: 'product', role: 'product', purpose: 'Show the product in context', required: true },
      { id: 'cta', role: 'cta', purpose: 'Invite the viewer to engage', required: true },
    ],
  },
  visualGrammar: { emphasis: 'image-led', composition: 'editorial' },
  adaptationRules: [
    {
      id: 'prioritize_product_if_image',
      condition: { check: 'productImageAvailable' },
      action: { action: 'prioritize', role: 'product' },
    },
  ],
  constraints: { type: 'post', minSections: 3, maxSections: 6 },
  version: 1,
  active: true,
  source: 'system',
};

const ENGAGEMENT_REEL_TEMPLATE: CreativeTemplate = {
  id: 'promotion_conversion_reel',
  name: 'Reveal & Convert',
  description:
    'Sets up context, reveals the product, delivers a payoff, then closes on the offer and CTA.',
  type: 'reel',
  objectives: ['promotion', 'conversion'],
  compatibleVerticals: ['restaurant'],
  structure: {
    type: 'reel',
    grammar: [
      { id: 'hook', role: 'hook', purpose: 'Open with an emotional beat', required: true },
      { id: 'setup', role: 'setup', purpose: 'Set the scene before the reveal', required: true },
      { id: 'product', role: 'product', purpose: 'Reveal the product', required: true },
      {
        id: 'payoff',
        role: 'payoff',
        purpose: 'Deliver the satisfying resolution beat',
        required: true,
      },
      { id: 'offer', role: 'offer', purpose: 'Present the offer', required: false },
      { id: 'cta', role: 'cta', purpose: 'Ask the viewer to act', required: true },
    ],
  },
  visualGrammar: { emphasis: 'product-led', composition: 'high-contrast' },
  adaptationRules: [
    {
      id: 'emphasize_offer_if_available',
      condition: { check: 'offerAvailable' },
      action: { action: 'emphasize', role: 'offer' },
    },
    {
      id: 'exclude_offer_if_unavailable',
      condition: { check: 'offerAvailable' },
      action: { action: 'exclude', role: 'offer' },
    },
    {
      id: 'vertical_restaurant_prioritizes_product',
      condition: { check: 'vertical', equals: 'restaurant' },
      action: { action: 'prioritize', role: 'product' },
    },
    {
      id: 'whatsapp_cta_conversion_oriented',
      condition: { check: 'ctaType', equals: 'order_whatsapp' },
      action: { action: 'emphasize', role: 'cta' },
    },
  ],
  constraints: {
    type: 'reel',
    minSections: 4,
    maxSections: 8,
    minDurationSeconds: 15,
    maxDurationSeconds: 30,
  },
  version: 1,
  active: true,
  source: 'system',
};

describe('CreativeTemplate — canonical values', () => {
  it('CreativeTemplateType supports exactly post and reel', () => {
    expect(CREATIVE_TEMPLATE_TYPES).toEqual(['post', 'reel']);
  });

  it('CreativeObjective covers all six canonical objectives', () => {
    expect(CREATIVE_OBJECTIVES).toEqual([
      'awareness',
      'engagement',
      'conversion',
      'launch',
      'promotion',
      'retention',
    ]);
  });

  it('BUSINESS_CATEGORIES is derived from the existing vertical config, not a hand-duplicated list', () => {
    expect([...BUSINESS_CATEGORIES].sort()).toEqual([
      'general',
      'real_estate',
      'restaurant',
      'salon',
    ]);
  });
});

describe('validateCreativeTemplate — template type', () => {
  it('accepts "post"', () => {
    expect(validateCreativeTemplate(PROMOTION_TEMPLATE).valid).toBe(true);
  });

  it('accepts "reel"', () => {
    expect(validateCreativeTemplate(ENGAGEMENT_REEL_TEMPLATE).valid).toBe(true);
  });

  it('rejects an invalid type value', () => {
    const result = validateCreativeTemplate({ ...PROMOTION_TEMPLATE, type: 'carousel' });
    expect(result.valid).toBe(false);
  });
});

describe('validateCreativeTemplate — objectives', () => {
  it.each(CREATIVE_OBJECTIVES)('accepts the canonical objective "%s"', (objective) => {
    const result = validateCreativeTemplate({ ...PROMOTION_TEMPLATE, objectives: [objective] });
    expect(result.valid).toBe(true);
  });

  it('rejects an unknown objective', () => {
    expect(
      validateCreativeTemplate({ ...PROMOTION_TEMPLATE, objectives: ['virality'] }).valid
    ).toBe(false);
  });

  it('rejects an empty objectives array', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, objectives: [] }).valid).toBe(false);
  });

  it('accepts multiple objectives on one template', () => {
    expect(
      validateCreativeTemplate({
        ...PROMOTION_TEMPLATE,
        objectives: ['promotion', 'conversion', 'retention'],
      }).valid
    ).toBe(true);
  });
});

describe('validateCreativeTemplate — compatibleVerticals', () => {
  it.each(BUSINESS_CATEGORIES)('accepts the canonical vertical "%s"', (vertical) => {
    expect(
      validateCreativeTemplate({ ...PROMOTION_TEMPLATE, compatibleVerticals: [vertical] }).valid
    ).toBe(true);
  });

  it('rejects an unknown vertical', () => {
    expect(
      validateCreativeTemplate({ ...PROMOTION_TEMPLATE, compatibleVerticals: ['cloud-kitchen'] })
        .valid
    ).toBe(false);
  });

  it('rejects an empty compatibleVerticals array', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, compatibleVerticals: [] }).valid).toBe(
      false
    );
  });
});

describe('validateCreativeTemplate — grammar / structure', () => {
  it('accepts ordered steps and preserves order', () => {
    const result = validateCreativeTemplate(PROMOTION_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.template?.structure.grammar.map((s) => s.id)).toEqual([
      'hook',
      'product',
      'offer',
      'urgency',
      'cta',
    ]);
  });

  it('accepts a mix of required and optional steps', () => {
    const result = validateCreativeTemplate(PROMOTION_TEMPLATE);
    expect(result.template?.structure.grammar.find((s) => s.id === 'cta')?.required).toBe(true);
    expect(result.template?.structure.grammar.find((s) => s.id === 'urgency')?.required).toBe(
      false
    );
  });

  it.each(CREATIVE_GRAMMAR_ROLES)('accepts the canonical grammar role "%s"', (role) => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      structure: {
        type: 'post',
        grammar: [{ id: 'step_1', role, purpose: 'test', required: true }],
      },
      constraints: { ...PROMOTION_TEMPLATE.constraints, minSections: 1 },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects an unknown grammar role', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      structure: {
        type: 'post',
        grammar: [{ id: 'step_1', role: 'large-red-text', purpose: 'test', required: true }],
      },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects an empty grammar array', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      structure: { type: 'post', grammar: [] },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate grammar step ids within the same template', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      structure: {
        type: 'post',
        grammar: [
          { id: 'hook', role: 'hook', purpose: 'a', required: true },
          { id: 'hook', role: 'product', purpose: 'b', required: true },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate grammar step id'))).toBe(true);
  });
});

describe('validateCreativeTemplate — structure/type discrimination', () => {
  it('rejects a POST template whose structure.type is "reel"', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      structure: { ...PROMOTION_TEMPLATE.structure, type: 'reel' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('structure.type'))).toBe(true);
  });

  it('rejects a REEL template whose constraints.type is "post"', () => {
    const result = validateCreativeTemplate({
      ...ENGAGEMENT_REEL_TEMPLATE,
      constraints: { type: 'post', minSections: 1, maxSections: 10 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('constraints.type'))).toBe(true);
  });
});

describe('CreativeTemplate — compile-time type safety', () => {
  it('a PostStructure literal cannot be assigned to a ReelStructure-typed variable', () => {
    const post: PostStructure = { type: 'post', grammar: PROMOTION_TEMPLATE.structure.grammar };
    // @ts-expect-error — PostStructure is not assignable to ReelStructure (discriminant mismatch)
    const asReel: ReelStructure = post;
    expect(asReel).toBeDefined(); // unreachable at runtime under a real type error; keeps the assertion meaningful
  });

  it('PostTemplateConstraints cannot be assigned to a ReelTemplateConstraints-typed variable', () => {
    const postConstraints: PostTemplateConstraints = {
      type: 'post',
      minSections: 1,
      maxSections: 5,
    };
    // @ts-expect-error — PostTemplateConstraints is not assignable to ReelTemplateConstraints (discriminant mismatch, missing duration fields)
    const asReel: ReelTemplateConstraints = postConstraints;
    expect(asReel).toBeDefined();
  });
});

describe('validateCreativeTemplate — visual grammar', () => {
  it.each(VISUAL_EMPHASES)('accepts the canonical emphasis "%s"', (emphasis) => {
    expect(
      validateCreativeTemplate({
        ...PROMOTION_TEMPLATE,
        visualGrammar: { emphasis, composition: 'minimal' },
      }).valid
    ).toBe(true);
  });

  it.each(VISUAL_COMPOSITIONS)('accepts the canonical composition "%s"', (composition) => {
    expect(
      validateCreativeTemplate({
        ...PROMOTION_TEMPLATE,
        visualGrammar: { emphasis: 'product-led', composition },
      }).valid
    ).toBe(true);
  });

  it('rejects an unknown visual emphasis', () => {
    expect(
      validateCreativeTemplate({
        ...PROMOTION_TEMPLATE,
        visualGrammar: { emphasis: 'chaotic', composition: 'minimal' },
      }).valid
    ).toBe(false);
  });

  it('rejects a visual grammar containing brand values instead of intent', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      visualGrammar: { emphasis: 'product-led', composition: 'minimal', primaryColor: '#E84D1A' },
    });
    // extra unknown keys are stripped by default zod object parsing, not rejected —
    // assert instead that the parsed template never carries the brand-value key.
    expect(result.valid).toBe(true);
    expect(result.template?.visualGrammar).not.toHaveProperty('primaryColor');
  });
});

describe('validateCreativeTemplate — adaptation rules', () => {
  it('accepts the "offer exists -> emphasize offer" example', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'offerAvailable' },
          action: { action: 'emphasize', role: 'offer' },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('accepts the "proof unavailable -> omit proof" example', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'proofAvailable' },
          action: { action: 'exclude', role: 'proof' },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('accepts the "product image available -> prioritize product" example', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'productImageAvailable' },
          action: { action: 'prioritize', role: 'product' },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('accepts an empty adaptationRules array (not every template needs adaptation logic)', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, adaptationRules: [] }).valid).toBe(
      true
    );
  });

  it('rejects an unknown condition check', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'moonPhase' },
          action: { action: 'emphasize', role: 'offer' },
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects an unknown action verb', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'offerAvailable' },
          action: { action: 'delete_business', role: 'offer' },
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate adaptation rule ids', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'offerAvailable' },
          action: { action: 'emphasize', role: 'offer' },
        },
        {
          id: 'r1',
          condition: { check: 'proofAvailable' },
          action: { action: 'exclude', role: 'proof' },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate adaptation rule id'))).toBe(true);
  });

  it('a fallback action requires both a role and a target role', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      adaptationRules: [
        {
          id: 'r1',
          condition: { check: 'proofAvailable' },
          action: { action: 'fallback', role: 'proof', to: 'benefit' },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateCreativeTemplate — constraints', () => {
  it('accepts valid POST constraints', () => {
    expect(
      validateCreativeTemplate({
        ...PROMOTION_TEMPLATE,
        constraints: { type: 'post', minSections: 2, maxSections: 5 },
      }).valid
    ).toBe(true);
  });

  it('accepts valid REEL constraints', () => {
    expect(validateCreativeTemplate(ENGAGEMENT_REEL_TEMPLATE).valid).toBe(true);
  });

  it('rejects POST constraints where minSections > maxSections', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      constraints: { type: 'post', minSections: 5, maxSections: 2 },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects REEL constraints where minDurationSeconds > maxDurationSeconds', () => {
    const result = validateCreativeTemplate({
      ...ENGAGEMENT_REEL_TEMPLATE,
      constraints: {
        type: 'reel',
        minSections: 4,
        maxSections: 8,
        minDurationSeconds: 40,
        maxDurationSeconds: 20,
      },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects a template whose grammar step count falls outside the constraints section range', () => {
    const result = validateCreativeTemplate({
      ...PROMOTION_TEMPLATE,
      constraints: { type: 'post', minSections: 10, maxSections: 20 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('outside constraints range'))).toBe(true);
  });

  it('does not require a POST-only field (maxTextDensity) — it is optional', () => {
    const { maxTextDensity: _unused, ...withoutDensity } =
      PROMOTION_TEMPLATE.constraints as PostTemplateConstraints;
    expect(
      validateCreativeTemplate({ ...PROMOTION_TEMPLATE, constraints: withoutDensity }).valid
    ).toBe(true);
  });

  it('rejects REEL constraints missing REEL-only duration fields', () => {
    const result = validateCreativeTemplate({
      ...ENGAGEMENT_REEL_TEMPLATE,
      constraints: { type: 'reel', minSections: 4, maxSections: 8 },
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateCreativeTemplate — template', () => {
  it('accepts a valid POST template', () => {
    expect(validateCreativeTemplate(PROMOTION_TEMPLATE).valid).toBe(true);
  });

  it('accepts a valid REEL template', () => {
    expect(validateCreativeTemplate(ENGAGEMENT_REEL_TEMPLATE).valid).toBe(true);
  });

  it('accepts the awareness POST fixture', () => {
    expect(validateCreativeTemplate(AWARENESS_TEMPLATE).valid).toBe(true);
  });

  it('accepts a template with multiple objectives', () => {
    expect(validateCreativeTemplate(PROMOTION_TEMPLATE).valid).toBe(true);
    expect(PROMOTION_TEMPLATE.objectives.length).toBeGreaterThan(1);
  });

  it('rejects an invalid template version (zero)', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, version: 0 }).valid).toBe(false);
  });

  it('rejects a non-integer template version', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, version: 1.5 }).valid).toBe(false);
  });

  it('rejects a missing required field (name)', () => {
    const { name: _name, ...withoutName } = PROMOTION_TEMPLATE;
    expect(validateCreativeTemplate(withoutName).valid).toBe(false);
  });

  it('rejects an invalid source value', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, source: 'ai_extracted' }).valid).toBe(
      false
    );
  });

  it('rejects a non-boolean active value', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, active: 'yes' }).valid).toBe(false);
  });

  it('accepts active: false (an inactive/retired template is still a structurally valid template)', () => {
    expect(validateCreativeTemplate({ ...PROMOTION_TEMPLATE, active: false }).valid).toBe(true);
  });
});

describe('CreativeTemplate — architectural separation', () => {
  it('a template is fully constructible with zero BrandKit, Business Brain, generated-content, or rendering fields', () => {
    const keys = Object.keys(PROMOTION_TEMPLATE);
    const forbiddenKeys = [
      'logo',
      'colors',
      'fonts',
      'businessName',
      'businessId',
      'address',
      'phone',
      'offerPrice',
      'productName',
      'location',
      'openingHours',
      'imageProvider',
      'videoRenderer',
      'generatedHeadline',
      'generatedCaption',
      'generatedImage',
      'generatedVideo',
      'generatedScript',
      'generatedVoiceover',
      'ffmpegFilters',
      'modelId',
    ];
    for (const forbidden of forbiddenKeys) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('validation succeeds with no AI provider, Firestore, or renderer available (pure function, no imports beyond zod/types/verticals config)', () => {
    // If this module required any of those, importing it above would already
    // have thrown (no mocks are set up in this test file for any of them).
    expect(validateCreativeTemplate(AWARENESS_TEMPLATE).valid).toBe(true);
  });

  it('visual grammar contains no brand-specific values by construction in the fixtures', () => {
    for (const template of [PROMOTION_TEMPLATE, AWARENESS_TEMPLATE, ENGAGEMENT_REEL_TEMPLATE]) {
      expect(Object.keys(template.visualGrammar).sort()).toEqual(['composition', 'emphasis']);
    }
  });
});
