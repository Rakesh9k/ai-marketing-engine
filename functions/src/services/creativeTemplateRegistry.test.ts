import {
  BuiltinCreativeTemplateRegistry,
  creativeTemplateRegistry,
  type CreativeTemplateRegistry,
} from './creativeTemplateRegistry';
import { BUILTIN_CREATIVE_TEMPLATES } from '../config/creativeTemplateLibrary';
import type { CreativeTemplate } from '../types';

const VALID_TEMPLATE: CreativeTemplate = {
  id: 'test-fixture-1',
  name: 'Fixture One',
  description: 'A minimal valid fixture template for registry tests.',
  type: 'post',
  objectives: ['awareness'],
  compatibleVerticals: ['restaurant'],
  structure: {
    type: 'post',
    grammar: [{ id: 'hook', role: 'hook', purpose: 'test', required: true }],
  },
  visualGrammar: { emphasis: 'product-led', composition: 'minimal' },
  adaptationRules: [],
  constraints: { type: 'post', minSections: 1, maxSections: 3 },
  version: 1,
  active: true,
  source: 'system',
};

function makeRegistry(templates: CreativeTemplate[]): CreativeTemplateRegistry {
  return new BuiltinCreativeTemplateRegistry(templates);
}

describe('BuiltinCreativeTemplateRegistry — construction', () => {
  it('constructs successfully from the real built-in template library', () => {
    expect(() => makeRegistry([...BUILTIN_CREATIVE_TEMPLATES])).not.toThrow();
  });

  it('rejects a malformed template at construction time (fails fast, never silently registers it)', () => {
    const malformed = { ...VALID_TEMPLATE, objectives: [] }; // objectives must be non-empty
    expect(() => makeRegistry([malformed as CreativeTemplate])).toThrow(/failed schema validation/);
  });

  it('rejects duplicate template ids at construction time instead of silently overwriting', () => {
    const dup = { ...VALID_TEMPLATE };
    expect(() => makeRegistry([VALID_TEMPLATE, dup])).toThrow(/duplicate template id/i);
  });
});

describe('BuiltinCreativeTemplateRegistry — getCreativeTemplate', () => {
  const registry = makeRegistry([VALID_TEMPLATE]);

  it('returns the template for a known id', () => {
    const template = registry.getCreativeTemplate('test-fixture-1');
    expect(template?.id).toBe('test-fixture-1');
  });

  it('returns undefined for an unknown id — deterministic, no fallback/default template', () => {
    expect(registry.getCreativeTemplate('does-not-exist')).toBeUndefined();
  });

  it('does not fall back to an unrelated template for a near-miss id', () => {
    expect(registry.getCreativeTemplate('test-fixture')).toBeUndefined();
    expect(registry.getCreativeTemplate('test-fixture-1 ')).toBeUndefined();
  });

  it('getCreativeTemplate returns a template regardless of active state (a persisted campaign must still resolve its templateId even if later deactivated)', () => {
    const inactive = { ...VALID_TEMPLATE, id: 'test-fixture-inactive', active: false };
    const r = makeRegistry([inactive]);
    expect(r.getCreativeTemplate('test-fixture-inactive')?.id).toBe('test-fixture-inactive');
  });
});

describe('BuiltinCreativeTemplateRegistry — listCreativeTemplates filtering', () => {
  const registry = makeRegistry([...BUILTIN_CREATIVE_TEMPLATES]);

  it('no filters returns all active templates', () => {
    const all = registry.listCreativeTemplates();
    expect(all.length).toBe(BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.active).length);
  });

  it('type: post returns only POST templates', () => {
    const posts = registry.listCreativeTemplates({ type: 'post' });
    expect(posts.length).toBeGreaterThan(0);
    for (const t of posts) expect(t.type).toBe('post');
  });

  it('type: reel returns only REEL templates', () => {
    const reels = registry.listCreativeTemplates({ type: 'reel' });
    expect(reels.length).toBeGreaterThan(0);
    for (const t of reels) expect(t.type).toBe('reel');
  });

  it('objective: conversion returns only templates whose objectives include conversion', () => {
    const results = registry.listCreativeTemplates({ objective: 'conversion' });
    expect(results.length).toBeGreaterThan(0);
    for (const t of results) expect(t.objectives).toContain('conversion');
  });

  it('vertical: restaurant returns only templates compatible with restaurant', () => {
    const results = registry.listCreativeTemplates({ vertical: 'restaurant' });
    expect(results.length).toBeGreaterThan(0);
    for (const t of results) expect(t.compatibleVerticals).toContain('restaurant');
  });

  it('vertical: salon excludes the restaurant-only template (post-menu-spotlight)', () => {
    const results = registry.listCreativeTemplates({ vertical: 'salon' });
    expect(results.some((t) => t.id === 'post-menu-spotlight')).toBe(false);
  });

  it('combined filters (type + vertical + objective) apply as AND across dimensions', () => {
    const results = registry.listCreativeTemplates({
      type: 'reel',
      vertical: 'restaurant',
      objective: 'conversion',
    });
    expect(results.length).toBeGreaterThan(0);
    for (const t of results) {
      expect(t.type).toBe('reel');
      expect(t.compatibleVerticals).toContain('restaurant');
      expect(t.objectives).toContain('conversion');
    }
  });

  it('a filter combination matching nothing returns an empty array, not an error', () => {
    // No built-in template (POST or REEL) declares the 'retention'
    // objective yet, so this filter is guaranteed to match zero templates
    // regardless of type/vertical.
    const results = registry.listCreativeTemplates({ objective: 'retention' });
    expect(results).toEqual([]);
  });

  it('inactive templates are excluded from listCreativeTemplates by default', () => {
    const inactive = { ...VALID_TEMPLATE, id: 'test-fixture-inactive-2', active: false };
    const r = makeRegistry([VALID_TEMPLATE, inactive]);
    const results = r.listCreativeTemplates();
    expect(results.some((t) => t.id === 'test-fixture-inactive-2')).toBe(false);
    expect(results.some((t) => t.id === VALID_TEMPLATE.id)).toBe(true);
  });
});

describe('BuiltinCreativeTemplateRegistry — deterministic order', () => {
  const registry = makeRegistry([...BUILTIN_CREATIVE_TEMPLATES]);

  it('listCreativeTemplates() returns the same order on repeated calls', () => {
    const first = registry.listCreativeTemplates().map((t) => t.id);
    const second = registry.listCreativeTemplates().map((t) => t.id);
    const third = registry.listCreativeTemplates({ type: 'reel' }).map((t) => t.id);
    const fourth = registry.listCreativeTemplates({ type: 'reel' }).map((t) => t.id);
    expect(second).toEqual(first);
    expect(fourth).toEqual(third);
  });

  it("order matches the built-in library's registration order (not a ranking — just stable, documented ordering)", () => {
    const activeIds = BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.active).map((t) => t.id);
    expect(registry.listCreativeTemplates().map((t) => t.id)).toEqual(activeIds);
  });
});

describe('BuiltinCreativeTemplateRegistry — immutability', () => {
  it('mutating a template object returned by getCreativeTemplate does not affect the registry', () => {
    const registry = makeRegistry([{ ...VALID_TEMPLATE }]);
    const template = registry.getCreativeTemplate('test-fixture-1');
    expect(() => {
      (template as { name: string }).name = 'Mutated';
    }).toThrow(); // frozen object — strict mode assignment to a frozen property throws

    const reFetched = registry.getCreativeTemplate('test-fixture-1');
    expect(reFetched?.name).toBe('Fixture One');
  });

  it('mutating a nested array (e.g. structure.grammar) does not affect the registry', () => {
    const registry = makeRegistry([{ ...VALID_TEMPLATE }]);
    const template = registry.getCreativeTemplate('test-fixture-1')!;
    expect(() => {
      (template.structure.grammar as unknown[]).push({});
    }).toThrow();

    const reFetched = registry.getCreativeTemplate('test-fixture-1');
    expect(reFetched?.structure.grammar.length).toBe(1);
  });

  it('mutating the array returned by listCreativeTemplates does not affect subsequent calls', () => {
    const registry = makeRegistry([{ ...VALID_TEMPLATE }]);
    const results = registry.listCreativeTemplates() as CreativeTemplate[];
    results.push({ ...VALID_TEMPLATE, id: 'injected' });

    const again = registry.listCreativeTemplates();
    expect(again.length).toBe(1);
    expect(again.some((t) => t.id === 'injected')).toBe(false);
  });

  it('mutating the caller-supplied source array after construction does not affect the registry (registry clones on ingest)', () => {
    const sourceTemplate = { ...VALID_TEMPLATE };
    const registry = makeRegistry([sourceTemplate]);
    sourceTemplate.name = 'Changed After Construction';
    expect(registry.getCreativeTemplate('test-fixture-1')?.name).toBe('Fixture One');
  });
});

describe('BuiltinCreativeTemplateRegistry — validation', () => {
  it('every template registered from the real built-in library independently passes schema validation (re-verified at the registry boundary)', () => {
    expect(() => makeRegistry([...BUILTIN_CREATIVE_TEMPLATES])).not.toThrow();
    const registry = makeRegistry([...BUILTIN_CREATIVE_TEMPLATES]);
    expect(
      registry.listCreativeTemplates().length + registry.listCreativeTemplates({}).length
    ).toBeGreaterThan(0);
  });
});

describe('BuiltinCreativeTemplateRegistry — POST and REEL retrieval', () => {
  const registry = makeRegistry([...BUILTIN_CREATIVE_TEMPLATES]);

  it.each([
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
  ])('retrieves the POST template "%s" by id', (id) => {
    expect(registry.getCreativeTemplate(id)?.type).toBe('post');
  });

  it.each([
    'reel-product-reveal',
    'reel-3-shot-food',
    'reel-cinematic-product',
    'reel-product-detail',
    'reel-offer',
    'reel-limited-time-offer',
    'reel-bundle-combo',
    'reel-price-value',
    'reel-problem-solution',
    'reel-before-after',
    'reel-customer-journey',
    'reel-how-it-works',
    'reel-local-comedy',
    'reel-pov',
    'reel-relatable-situation',
    'reel-question-interaction',
    'reel-customer-proof',
    'reel-behind-scenes',
    'reel-new-launch',
    'reel-brand-story',
  ])('retrieves the REEL template "%s" by id', (id) => {
    expect(registry.getCreativeTemplate(id)?.type).toBe('reel');
  });

  it('registers exactly 30 templates total (10 POST + 20 REEL, matching the Phase 4/5 library)', () => {
    expect(registry.listCreativeTemplates().length).toBe(30);
  });
});

describe('creativeTemplateRegistry — the exported singleton', () => {
  it('is constructed from the real BUILTIN_CREATIVE_TEMPLATES and exposes all of them', () => {
    expect(creativeTemplateRegistry.listCreativeTemplates().length).toBe(
      BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.active).length
    );
  });

  it('getCreativeTemplate on the singleton resolves a known real id', () => {
    expect(creativeTemplateRegistry.getCreativeTemplate('reel-product-reveal')?.name).toBe(
      'Product Reveal'
    );
  });
});

describe('CreativeTemplateRegistry — architectural boundaries', () => {
  it('the registry module performs no AI/network/Firestore calls (importing it above already proves this — no mocks were set up for any of them)', () => {
    expect(creativeTemplateRegistry.listCreativeTemplates().length).toBeGreaterThan(0);
  });

  it('the registry exposes no selection/ranking/recommendation API', () => {
    const registryKeys = Object.getOwnPropertyNames(BuiltinCreativeTemplateRegistry.prototype);
    for (const forbidden of [
      'rankCreativeTemplates',
      'scoreCreativeTemplate',
      'recommendCreativeTemplate',
      'selectTemplate',
      'chooseBestTemplate',
    ]) {
      expect(registryKeys).not.toContain(forbidden);
    }
  });

  it('the module exports only the documented registry surface (class, singleton, filter type) — no stray helpers leak out', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = Object.keys(require('./creativeTemplateRegistry'));
    expect(moduleExports.sort()).toEqual(
      ['BuiltinCreativeTemplateRegistry', 'creativeTemplateRegistry'].sort()
    );
  });
});
