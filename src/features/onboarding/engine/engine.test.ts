import type { DraftFieldPath, Known, Suggestions } from './fields';
import { INDUSTRY_IDS } from './fields';
import {
  labelFor,
  MAX_AT_ONCE,
  missingRequired,
  progress,
  selectNext,
  unconfirmed,
} from './engine';
import { isPlausibleWhatsApp, optionsWithGuesses, QUESTIONS, resolve } from './questions';
import { AUDIENCE_PRESETS, OFFERING_PRESETS, SUBCATEGORIES } from './taxonomy';

const state = (
  known: Known = {},
  skipped: DraftFieldPath[] = [],
  suggestions: Suggestions = {}
) => ({
  known,
  skipped: new Set(skipped),
  suggestions,
});

const PERSON: Known = { 'owner.name': 'Asha', 'owner.role': 'owner' };
const BUSINESS: Known = {
  ...PERSON,
  'identity.industry': 'restaurant_food',
  'identity.subcategory': 'cloud_kitchen',
};
const LOCATED: Known = {
  ...BUSINESS,
  'identity.name': 'Biryani House',
  'identity.city': 'Hyderabad',
  'identity.state': 'Telangana',
  'contact.whatsapp': '98765 43210',
};

const fields = (s: ReturnType<typeof state>) => selectNext(s).map((q) => q.field);

describe('question definitions', () => {
  it('gives every question a reason to exist (rule: every question has a purpose)', () => {
    for (const q of QUESTIONS) {
      for (const industry of INDUSTRY_IDS) {
        const why = resolve(q.purpose, { 'identity.industry': industry });
        expect(why.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('has one question per fact, with unique ids', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    expect(new Set(QUESTIONS.map((q) => q.field)).size).toBe(QUESTIONS.length);
  });

  it('defines a second-level question, offerings and audiences for every industry', () => {
    for (const id of INDUSTRY_IDS) {
      expect(SUBCATEGORIES[id].prompt).toBeTruthy();
      expect(SUBCATEGORIES[id].why).toBeTruthy();
      expect(OFFERING_PRESETS[id]).toBeDefined();
      expect(AUDIENCE_PRESETS[id].length).toBeGreaterThan(0);
    }
  });

  it('asks a reasonable number of things in total', () => {
    expect(QUESTIONS.length).toBeLessThanOrEqual(12); // not a 40-field form
  });
});

describe('selectNext — answer, understand, choose the next question', () => {
  it('opens with the personal pair and never shows more than two questions at once', () => {
    expect(fields(state())).toEqual(['owner.name', 'owner.role']);
    for (const known of [{}, PERSON, BUSINESS, LOCATED] as Known[]) {
      expect(selectNext(state(known)).length).toBeLessThanOrEqual(MAX_AT_ONCE);
    }
  });

  it('walks the whole conversation in a sensible order', () => {
    const order: DraftFieldPath[][] = [];
    const known: Known = {};
    const answers: Known = {
      'owner.name': 'Asha',
      'owner.role': 'owner',
      'identity.industry': 'restaurant_food',
      'identity.subcategory': 'cafe',
      'identity.name': 'Cafe 9',
      'identity.city': 'Pune',
      'identity.state': 'Maharashtra',
      'contact.whatsapp': '9876543210',
      'offering.signature': ['Coffee'],
      'audience.primary': ['Students'],
      'positioning.usp': 'Slow-brewed',
    };
    for (let i = 0; i < 20; i++) {
      const next = selectNext(state(known));
      if (next.length === 0) break;
      order.push(next.map((q) => q.field));
      for (const q of next) (known as Record<string, unknown>)[q.field] = answers[q.field];
    }
    expect(order).toEqual([
      ['owner.name', 'owner.role'],
      ['identity.industry'],
      ['identity.subcategory'],
      ['identity.name'],
      ['identity.city', 'identity.state'],
      ['contact.whatsapp'],
      ['offering.signature'],
      ['audience.primary'],
      ['positioning.usp'],
    ]);
  });

  it('asks the follow-up only after the answer it depends on, and adapts to it', () => {
    expect(fields(state(PERSON))).toEqual(['identity.industry']);
    const withIndustry: Known = { ...PERSON, 'identity.industry': 'salon_beauty' };
    const [q] = selectNext(state(withIndustry));
    expect(q?.field).toBe('identity.subcategory');
    expect(resolve(q!.prompt, withIndustry)).toBe('What kind of beauty business is it?');
    expect(q!.options!(withIndustry).map((o) => o.id)).toContain('barbershop');
  });

  it('does not ask for offerings until it knows what kind of business this is', () => {
    const noSub: Known = { ...PERSON, 'identity.industry': 'retail' };
    expect(fields(state(noSub))).not.toContain('offering.signature');
  });

  it('adapts the same question to the industry (offering and audience wording)', () => {
    const ask = (known: Known, field: DraftFieldPath) =>
      resolve(QUESTIONS.find((q) => q.field === field)!.prompt, known);
    const salon: Known = { 'identity.industry': 'salon_beauty', 'identity.subcategory': 'spa' };
    const realty: Known = { 'identity.industry': 'real_estate', 'identity.subcategory': 'plots' };
    const retail: Known = { 'identity.industry': 'retail', 'identity.subcategory': 'fashion' };
    expect(ask(salon, 'offering.signature')).toMatch(/service do customers come to you for/i);
    expect(ask(realty, 'offering.signature')).toMatch(/properties/i);
    expect(ask(retail, 'offering.signature')).toMatch(/buy from you/i);
    expect(ask(salon, 'audience.primary')).toMatch(/walking through your doors/i);
    expect(ask(realty, 'audience.primary')).toMatch(/trying to reach/i);
  });

  it('adapts to the SUBCATEGORY too: a cloud kitchen is asked about orders, not walk-ins', () => {
    const ask = (known: Known, field: DraftFieldPath) =>
      resolve(QUESTIONS.find((q) => q.field === field)!.prompt, known);
    const cloud: Known = {
      'identity.industry': 'restaurant_food',
      'identity.subcategory': 'cloud_kitchen',
    };
    const dineIn: Known = {
      'identity.industry': 'restaurant_food',
      'identity.subcategory': 'fine_dining',
    };
    expect(ask(cloud, 'offering.signature')).toBe('What do people usually order from you?');
    expect(ask(dineIn, 'offering.signature')).toBe('What are you best known for?');
    expect(ask(cloud, 'audience.primary')).toBe('Who do you most want ordering from you?');
    expect(ask(dineIn, 'audience.primary')).toMatch(/walking through your doors/i);
    expect(ask(cloud, 'identity.city')).toMatch(/deliver from/i);
    expect(ask(dineIn, 'identity.city')).toMatch(/based in/i);
  });

  it('uses a free-text, own-words path for "something else" (generic adaptive path)', () => {
    const known: Known = { ...PERSON, 'identity.industry': 'other' };
    const [q] = selectNext(state(known));
    expect(q?.field).toBe('identity.subcategory');
    expect(resolve(q!.input, known)).toBe('text');
  });

  it('never blocks on optional information: skipping a useful question moves on', () => {
    expect(fields(state({ 'owner.name': 'Asha' }, ['owner.role']))[0]).toBe('identity.industry');
    const done = state({ ...LOCATED }, [
      'offering.signature',
      'audience.primary',
      'positioning.usp',
    ]);
    expect(selectNext(done)).toEqual([]);
  });

  it('keeps required identity facts required (no skip)', () => {
    for (const field of [
      'owner.name',
      'identity.industry',
      'identity.subcategory',
      'identity.name',
      'identity.city',
      'identity.state',
      'contact.whatsapp',
    ] as DraftFieldPath[]) {
      expect(QUESTIONS.find((q) => q.field === field)!.importance).toBe('required');
    }
    for (const field of [
      'owner.role',
      'offering.signature',
      'audience.primary',
      'positioning.usp',
    ] as DraftFieldPath[]) {
      expect(QUESTIONS.find((q) => q.field === field)!.importance).not.toBe('required');
    }
  });
});

describe('suggestions are hints, never facts', () => {
  const guesses: Suggestions = {
    'offering.signature': ['Biryani', 'Haleem'],
    'audience.primary': ['Families'],
    'owner.name': 'Asha',
  };

  it('do not resolve a question or change what is asked next', () => {
    expect(fields(state({}, [], guesses))).toEqual(['owner.name', 'owner.role']);
    expect(fields(state(LOCATED, [], guesses))).toEqual(['offering.signature']);
  });

  it('do not count toward progress', () => {
    expect(progress(state(LOCATED, [], guesses))).toBe(progress(state(LOCATED)));
  });

  it('are listed as unconfirmed until the owner answers that field', () => {
    expect(unconfirmed(state(LOCATED, [], guesses)).sort()).toEqual([
      'audience.primary',
      'offering.signature',
    ]);
    expect(
      unconfirmed(state({ ...LOCATED, 'offering.signature': ['Biryani'] }, [], guesses))
    ).toEqual(['audience.primary']);
  });

  it('appear beside the presets, flagged as guesses and not duplicated', () => {
    const q = QUESTIONS.find((x) => x.field === 'offering.signature')!;
    const options = optionsWithGuesses(q, BUSINESS, ['Biryani', 'Haleem', 'Mandi']);
    expect(options.filter((o) => o.guess).map((o) => o.label)).toEqual(['Haleem', 'Mandi']);
    expect(options.filter((o) => o.label === 'Biryani')).toHaveLength(1); // already a preset
  });

  it('are ignored when they are not a list (single-value guesses are pre-filled, not chips)', () => {
    const q = QUESTIONS.find((x) => x.field === 'offering.signature')!;
    expect(optionsWithGuesses(q, BUSINESS, 'Biryani').some((o) => o.guess)).toBe(false);
  });
});

describe('progress', () => {
  it('starts at 0, ends at 1, and never moves backwards as follow-ups appear', () => {
    const full: Known = {
      ...LOCATED,
      'offering.signature': ['Biryani'],
      'audience.primary': ['Families'],
      'positioning.usp': 'Dum style',
    };
    const order = Object.keys(full) as DraftFieldPath[];
    const values: number[] = [];
    const known: Known = {};
    values.push(progress(state(known)));
    for (const field of order) {
      (known as Record<string, unknown>)[field] = full[field];
      values.push(progress(state({ ...known })));
    }
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(1);
    for (let i = 1; i < values.length; i++)
      expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!);
  });
});

describe('missingRequired / labelFor', () => {
  it('lists required facts still unknown', () => {
    expect(missingRequired(state({ 'owner.name': 'A' }))).toEqual([
      'identity.industry',
      'identity.subcategory',
      'identity.name',
      'identity.city',
      'identity.state',
      'contact.whatsapp',
    ]);
    expect(missingRequired(state(LOCATED))).toEqual([]);
  });

  it("shows friendly labels, lists as text, and the owner's own words", () => {
    const s = state({
      ...LOCATED,
      'owner.role': 'founder',
      'audience.primary': ['Families', 'Office crowd'],
    });
    expect(labelFor('identity.industry', s)).toBe('Restaurant & Food');
    expect(labelFor('identity.subcategory', s)).toBe('Cloud Kitchen');
    expect(labelFor('owner.role', s)).toBe('Founder');
    expect(labelFor('audience.primary', s)).toBe('Families, Office crowd');

    const custom = state({
      'identity.industry': 'restaurant_food',
      'identity.subcategory': 'Home-style tiffins',
    });
    expect(labelFor('identity.subcategory', custom)).toBe('Home-style tiffins');
  });
});

describe('isPlausibleWhatsApp', () => {
  it.each(['98765 43210', '+91 98765 43210', '9876543210', '098765 43210'])('accepts %s', (v) => {
    expect(isPlausibleWhatsApp(v)).toBeUndefined();
  });
  it.each(['12345', 'call me', '', '+91 98765 43210 99999999'])('rejects %p', (v) => {
    expect(isPlausibleWhatsApp(v)).toBeTruthy();
  });
});
