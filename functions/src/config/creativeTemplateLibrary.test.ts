import { BUILTIN_CREATIVE_TEMPLATES } from './creativeTemplateLibrary';
import { validateCreativeTemplate } from '../services/creativeTemplate';

/**
 * Validates the Phase 4/5 built-in template library against the Phase 3
 * schema, and asserts the library-level properties (count, uniqueness,
 * distinctiveness) the task requires. This is deliberately NOT a
 * template-registry test — there is no lookup/selection function to
 * exercise, only the static array and its conformance to the schema.
 */

const FORBIDDEN_FIELD_KEYS = [
  'businessName',
  'businessId',
  'address',
  'phone',
  'price',
  'offerPrice',
  'discount',
  'rating',
  'reviewCount',
  'imageUrl',
  'videoUrl',
  'logo',
  'color',
  'colors',
  'font',
  'fonts',
];

const FABRICATED_CONTENT_PATTERNS: RegExp[] = [
  /\d+%\s*off/i,
  /₹\s*\d/,
  /\$\s*\d/,
  /\b\d+(\.\d+)?\s*stars?\b/i,
  /\b\d{2,}[,]?\d*\+?\s*(happy\s+)?customers?\b/i,
  /\bbest\s+(biryani|salon|property)\s+in\b/i,
  /\btoday\s+only\b/i,
  /\blast\s+chance\b/i,
  /\bonly\s+\d+\s+left\b/i,
];

const HARDCODED_LOCALIZATION_TERMS = [
  'hyderabadi',
  'telugu',
  'hindi',
  'hinglish',
  'diwali',
  'holi',
  'eid',
  'christmas',
  "valentine's",
  'hyderabad',
  'mumbai',
  'delhi',
  'bengaluru',
];

function allTextFields(template: (typeof BUILTIN_CREATIVE_TEMPLATES)[number]): string[] {
  return [template.name, template.description, ...template.structure.grammar.map((s) => s.purpose)];
}

describe('BUILTIN_CREATIVE_TEMPLATES — count', () => {
  it('contains exactly 30 templates (10 POST + 20 REEL, after the Phase 5 20-template Reel expansion)', () => {
    expect(BUILTIN_CREATIVE_TEMPLATES.length).toBe(30);
  });

  it('contains exactly 10 POST templates', () => {
    expect(BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.type === 'post').length).toBe(10);
  });

  it('contains exactly 20 canonical REEL templates', () => {
    expect(BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.type === 'reel').length).toBe(20);
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — required coverage', () => {
  const expectedPostIds = [
    'post-product-hero',
    'post-offer',
    'post-menu-spotlight',
    'post-local-relatable',
    'post-festival-occasion',
    'post-new-launch',
    'post-problem-solution',
    'post-social-proof',
    'post-differentiator',
    'post-question-engagement',
  ];
  const expectedReelIds = [
    // Product
    'reel-product-reveal',
    'reel-3-shot-food',
    'reel-cinematic-product',
    'reel-product-detail',
    // Offer / conversion
    'reel-offer',
    'reel-limited-time-offer',
    'reel-bundle-combo',
    'reel-price-value',
    // Story / problem / transformation
    'reel-problem-solution',
    'reel-before-after',
    'reel-customer-journey',
    'reel-how-it-works',
    // Social / engagement
    'reel-local-comedy',
    'reel-pov',
    'reel-relatable-situation',
    'reel-question-interaction',
    // Trust / proof
    'reel-customer-proof',
    'reel-behind-scenes',
    // Launch / brand
    'reel-new-launch',
    'reel-brand-story',
  ];

  it.each([...expectedPostIds, ...expectedReelIds])(
    'includes the required template id "%s"',
    (id) => {
      expect(BUILTIN_CREATIVE_TEMPLATES.some((t) => t.id === id)).toBe(true);
    }
  );

  it('does NOT retain the two Phase 4 Reel ids that were reconciled away (reel-offer-drop, reel-local-relatable)', () => {
    expect(BUILTIN_CREATIVE_TEMPLATES.some((t) => t.id === 'reel-offer-drop')).toBe(false);
    expect(BUILTIN_CREATIVE_TEMPLATES.some((t) => t.id === 'reel-local-relatable')).toBe(false);
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — schema validation', () => {
  it.each(BUILTIN_CREATIVE_TEMPLATES.map((t) => [t.id, t] as const))(
    'template "%s" validates against the Phase 3 CreativeTemplate schema',
    (_id, template) => {
      const result = validateCreativeTemplate(template);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  );

  it('every template is active (per the Phase 4 instruction: production templates start active: true)', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      expect(template.active).toBe(true);
    }
  });

  it('every template is version 1, except reel-product-reveal (version 2 after its Phase 5 grammar reconciliation)', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      if (template.id === 'reel-product-reveal') {
        expect(template.version).toBe(2);
      } else {
        expect(template.version).toBe(1);
      }
    }
  });

  it('every template is source "system" (built-in, not user-created)', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      expect(template.source).toBe('system');
    }
  });

  it("every template's structure.type matches its own type", () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      expect(template.structure.type).toBe(template.type);
    }
  });

  it("every template's constraints.type matches its own type", () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      expect(template.constraints.type).toBe(template.type);
    }
  });

  it('no Reel template accidentally carries a POST structure (or vice versa)', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      if (template.type === 'reel') {
        expect(template.structure.type).toBe('reel');
        expect(template.constraints.type).toBe('reel');
      }
      if (template.type === 'post') {
        expect(template.structure.type).toBe('post');
        expect(template.constraints.type).toBe('post');
      }
    }
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — uniqueness', () => {
  it('all template ids are unique', () => {
    const ids = BUILTIN_CREATIVE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all template names are unique', () => {
    const names = BUILTIN_CREATIVE_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('ids are stable, human-readable kebab-case (not random/generated)', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      expect(template.id).toMatch(/^(post|reel)-[a-z0-9-]+$/);
    }
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — distinctiveness', () => {
  it('no two templates of the same type share an identical grammar role sequence', () => {
    const roleSequenceByType = new Map<string, Set<string>>();
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      const sequence = template.structure.grammar.map((s) => s.role).join('->');
      const seen = roleSequenceByType.get(template.type) ?? new Set<string>();
      expect(seen.has(sequence)).toBe(false);
      seen.add(sequence);
      roleSequenceByType.set(template.type, seen);
    }
  });

  it('the library covers at least 8 distinct dominant visual emphases/compositions combined', () => {
    const combos = new Set(
      BUILTIN_CREATIVE_TEMPLATES.map(
        (t) => `${t.visualGrammar.emphasis}:${t.visualGrammar.composition}`
      )
    );
    expect(combos.size).toBeGreaterThanOrEqual(8);
  });

  it('at least one template is vertical-specific and at least one is broad (compatibleVerticals varies)', () => {
    const vertSpecific = BUILTIN_CREATIVE_TEMPLATES.some((t) => t.compatibleVerticals.length < 3);
    const broad = BUILTIN_CREATIVE_TEMPLATES.some((t) => t.compatibleVerticals.length === 3);
    expect(vertSpecific).toBe(true);
    expect(broad).toBe(true);
  });

  it('Local Comedy and Relatable Situation are meaningfully different grammars (comedic/punchline-specific vs. universal-situation)', () => {
    const comedy = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-local-comedy');
    const relatable = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-relatable-situation');
    expect(comedy).toBeDefined();
    expect(relatable).toBeDefined();
    expect(comedy?.structure.grammar.map((s) => s.role)).not.toEqual(
      relatable?.structure.grammar.map((s) => s.role)
    );
  });

  it('Offer and Limited-Time Offer are meaningfully different grammars (no deadline beat vs. an explicit deadline/availability beat)', () => {
    const offer = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-offer');
    const limitedTime = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-limited-time-offer');
    expect(offer).toBeDefined();
    expect(limitedTime).toBeDefined();
    expect(limitedTime!.structure.grammar.length).toBeGreaterThan(offer!.structure.grammar.length);
  });

  it('Product Reveal and Cinematic Product are meaningfully different grammars (tease/reveal/close-up vs. atmosphere/details/hero/brand)', () => {
    const reveal = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-product-reveal');
    const cinematic = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-cinematic-product');
    expect(reveal?.structure.grammar.map((s) => s.role)).not.toEqual(
      cinematic?.structure.grammar.map((s) => s.role)
    );
  });

  it('Product Reveal and Product Detail are meaningfully different grammars', () => {
    const reveal = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-product-reveal');
    const detail = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-product-detail');
    expect(reveal?.structure.grammar.map((s) => s.role)).not.toEqual(
      detail?.structure.grammar.map((s) => s.role)
    );
  });

  it('Customer Proof and Customer Journey are meaningfully different grammars (evidence/trust vs. need/experience/outcome)', () => {
    const proof = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-customer-proof');
    const journey = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-customer-journey');
    expect(proof?.structure.grammar.map((s) => s.role)).not.toEqual(
      journey?.structure.grammar.map((s) => s.role)
    );
  });

  it('Problem→Solution and How It Works are meaningfully different grammars (problem/agitation/solution vs. process/steps/result)', () => {
    const problemSolution = BUILTIN_CREATIVE_TEMPLATES.find(
      (t) => t.id === 'reel-problem-solution'
    );
    const howItWorks = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-how-it-works');
    expect(problemSolution?.structure.grammar.map((s) => s.role)).not.toEqual(
      howItWorks?.structure.grammar.map((s) => s.role)
    );
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — Phase 5 20-template coverage matrix', () => {
  const reelIdsByCategory: Record<string, string[]> = {
    product: [
      'reel-product-reveal',
      'reel-3-shot-food',
      'reel-cinematic-product',
      'reel-product-detail',
    ],
    offer: ['reel-offer', 'reel-limited-time-offer', 'reel-bundle-combo', 'reel-price-value'],
    story: [
      'reel-problem-solution',
      'reel-before-after',
      'reel-customer-journey',
      'reel-how-it-works',
    ],
    engagement: [
      'reel-local-comedy',
      'reel-pov',
      'reel-relatable-situation',
      'reel-question-interaction',
    ],
    trust: ['reel-customer-proof', 'reel-behind-scenes'],
    brand: ['reel-new-launch', 'reel-brand-story'],
  };

  it.each(Object.entries(reelIdsByCategory))(
    'every "%s" category id exists in the library',
    (_category, ids) => {
      for (const id of ids) {
        expect(BUILTIN_CREATIVE_TEMPLATES.some((t) => t.id === id)).toBe(true);
      }
    }
  );

  it('the six categories account for exactly the 20 canonical Reel ids (no gaps, no extras)', () => {
    const allCategorized = Object.values(reelIdsByCategory).flat();
    expect(allCategorized.length).toBe(20);
    expect(new Set(allCategorized).size).toBe(20);
    const actualReelIds = BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.type === 'reel').map(
      (t) => t.id
    );
    expect([...allCategorized].sort()).toEqual([...actualReelIds].sort());
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — no fake or hardcoded content', () => {
  it.each(BUILTIN_CREATIVE_TEMPLATES.map((t) => [t.id, t] as const))(
    'template "%s" contains no business-specific field keys',
    (_id, template) => {
      const flatKeys = JSON.stringify(template);
      for (const forbidden of FORBIDDEN_FIELD_KEYS) {
        expect(flatKeys.toLowerCase()).not.toContain(`"${forbidden.toLowerCase()}"`);
      }
    }
  );

  it.each(BUILTIN_CREATIVE_TEMPLATES.map((t) => [t.id, t] as const))(
    'template "%s" contains no fabricated price/rating/review/urgency claims in any text field',
    (_id, template) => {
      for (const text of allTextFields(template)) {
        for (const pattern of FABRICATED_CONTENT_PATTERNS) {
          expect(pattern.test(text)).toBe(false);
        }
      }
    }
  );

  it.each(BUILTIN_CREATIVE_TEMPLATES.map((t) => [t.id, t] as const))(
    'template "%s" contains no hardcoded language/festival/city localization terms',
    (_id, template) => {
      for (const text of allTextFields(template)) {
        const lower = text.toLowerCase();
        for (const term of HARDCODED_LOCALIZATION_TERMS) {
          expect(lower).not.toContain(term);
        }
      }
    }
  );

  it('no template description reads like a giant AI image/video generation prompt', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      // A structured domain description stays short; a smuggled-in AI prompt
      // for an image/video model tends to be long and imperative ("Create a...").
      expect(template.description.length).toBeLessThan(260);
      expect(template.description.toLowerCase().startsWith('create a')).toBe(false);
    }
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — Phase 5 reconciliation', () => {
  it('reel-product-reveal exists exactly once (reconciled in place, not duplicated)', () => {
    const matches = BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.id === 'reel-product-reveal');
    expect(matches.length).toBe(1);
  });

  it('reel-product-reveal carries the Phase 5 tease/reveal/close-up grammar, not the Phase 4 setup/benefit grammar', () => {
    const template = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === 'reel-product-reveal');
    expect(template?.structure.grammar.map((s) => s.id)).toEqual([
      'hook',
      'visual_tease',
      'reveal',
      'close_up',
      'cta',
    ]);
  });

  it('reel-problem-solution, reel-before-after, reel-behind-scenes, reel-customer-proof, and reel-new-launch survive unchanged from Phase 4 (still version 1)', () => {
    for (const id of [
      'reel-problem-solution',
      'reel-before-after',
      'reel-behind-scenes',
      'reel-customer-proof',
      'reel-new-launch',
    ]) {
      const template = BUILTIN_CREATIVE_TEMPLATES.find((t) => t.id === id);
      expect(template).toBeDefined();
      expect(template?.version).toBe(1);
    }
  });
});

describe('BUILTIN_CREATIVE_TEMPLATES — architectural separation', () => {
  it('the library is a plain array with no lookup/selection/ranking function exported alongside it', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require('./creativeTemplateLibrary');
    const exportedKeys = Object.keys(moduleExports);
    expect(exportedKeys).toEqual(['BUILTIN_CREATIVE_TEMPLATES']);
  });

  it('every grammar step id is unique within its own template (schema-level guarantee, re-checked here explicitly)', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      const ids = template.structure.grammar.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('every adaptation rule id is unique within its own template', () => {
    for (const template of BUILTIN_CREATIVE_TEMPLATES) {
      const ids = template.adaptationRules.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
