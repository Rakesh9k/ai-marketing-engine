import { VERTICAL_CTAS, VERTICAL_OBJECTIVES } from './constants';
import { applyQuickIdea, quickIdeasFor } from './quickIdeas';
import { createInitialWizardState } from './types';

/**
 * The wizard's "quick ideas" used to manufacture a whole campaign for every business, restaurant-flavoured:
 * invented prices (₹295 from ₹350), a "15% OFF" discount, dates, descriptions with made-up claims ("Free
 * delivery within 3km", "Includes 2 Special Biryanis + 2 Drinks + Dessert"), and the first product picked
 * for the owner. Clicking Generate published a price the owner never set, and Truth Check passed it because
 * it checked against the preset's own invented number.
 *
 * An idea is a starting point, not a fact: it suggests an objective, an action and a headline, and nothing
 * else. Price, discount, dates, description and product stay the owner's to enter.
 */
const CATEGORIES = ['restaurant', 'salon', 'real_estate', 'general'] as const;

describe('ideas are specific to the kind of business', () => {
  it.each(CATEGORIES)('%s gets at least three ideas', (category) => {
    expect(quickIdeasFor(category).length).toBeGreaterThanOrEqual(3);
  });

  it('a restaurant idea never appears for a salon, a property agent or a general business', () => {
    const restaurant = quickIdeasFor('restaurant').map((i) => i.id);
    for (const other of ['salon', 'real_estate', 'general'] as const) {
      const ids = quickIdeasFor(other).map((i) => i.id);
      expect(ids.filter((id) => restaurant.includes(id))).toEqual([]);
    }
  });

  it('no idea mentions food unless it is for a restaurant', () => {
    for (const category of ['salon', 'real_estate', 'general'] as const) {
      for (const idea of quickIdeasFor(category)) {
        expect(`${idea.label} ${idea.headline}`).not.toMatch(
          /biryani|lunch|dish|menu|meal|combo|feast/i
        );
      }
    }
  });

  it('an unknown or missing category is treated as a general business', () => {
    expect(quickIdeasFor(undefined).map((i) => i.id)).toEqual(
      quickIdeasFor('general').map((i) => i.id)
    );
  });

  it.each(CATEGORIES)(
    'every %s idea uses an objective and an action that business is allowed to use',
    (category) => {
      for (const idea of quickIdeasFor(category)) {
        expect(VERTICAL_OBJECTIVES[category]).toContain(idea.objective);
        expect(VERTICAL_CTAS[category]).toContain(idea.cta);
      }
    }
  );
});

describe('an idea contains no fact', () => {
  it.each(CATEGORIES)(
    '%s: no digits, percentages, prices, distances or "free" in the label or headline',
    (category) => {
      for (const idea of quickIdeasFor(category)) {
        expect(`${idea.label} ${idea.headline}`).not.toMatch(/\d|%|₹|\bkm\b|\bfree\b|\boff\b/i);
      }
    }
  );
});

describe('applying an idea', () => {
  const locale = { primaryLanguage: 'hi_en', regionalStyle: 'mumbai' } as const;
  const salonIdea = quickIdeasFor('salon')[0]!;

  it('sets the objective, the action and a headline suggestion, and moves to choosing the product', () => {
    const next = applyQuickIdea(createInitialWizardState(), salonIdea, locale as never);
    expect(next.type).toBe('post');
    expect(next.objective).toBe(salonIdea.objective);
    expect(next.cta).toBe(salonIdea.cta);
    expect(next.offer.headline).toBe(salonIdea.headline);
    expect(next.step).toBe(4);
  });

  it('creates no price, discount, offer type, description, dates, product or photo', () => {
    const next = applyQuickIdea(createInitialWizardState(), salonIdea, locale as never);
    expect(next.offer.price).toBe('');
    expect(next.offer.originalPrice).toBe('');
    expect(next.offer.type).toBeNull();
    expect(next.offer.description).toBe('');
    expect(next.offer.terms).toBe('');
    expect(next.duration).toEqual({ start: '', end: '' });
    expect(next.selectedProductId).toBeNull();
    expect(next.photos).toEqual([]);
  });

  it("uses the owner's language and place style only where they have not chosen one", () => {
    const fresh = applyQuickIdea(createInitialWizardState(), salonIdea, locale as never);
    expect(fresh.primaryLanguage).toBe('hi_en');
    expect(fresh.regionalStyle).toBe('mumbai');
    const chosen = {
      ...createInitialWizardState(),
      primaryLanguage: 'en' as const,
      regionalStyle: 'neutral' as const,
    };
    const kept = applyQuickIdea(chosen, salonIdea, locale as never);
    expect(kept.primaryLanguage).toBe('en');
    expect(kept.regionalStyle).toBe('neutral');
  });

  it('never overwrites what the owner already entered', () => {
    const entered = {
      ...createInitialWizardState(),
      selectedProductId: 'p-7',
      cta: 'call_now' as const,
      offer: {
        headline: 'My own headline',
        description: 'My own words',
        price: '799',
        originalPrice: '999',
        type: 'percentage' as const,
        terms: 'T&C',
      },
      duration: { start: '2026-10-10', end: '2026-10-15' },
    };
    const next = applyQuickIdea(entered, salonIdea, locale as never);
    expect(next.selectedProductId).toBe('p-7');
    expect(next.cta).toBe('call_now');
    expect(next.offer).toEqual(entered.offer);
    expect(next.duration).toEqual(entered.duration);
  });
});
