import {
  applySystemFacts,
  applyUserAnswers,
  confirmedValues,
  deriveOnboardingEvents,
  encodePath,
  newDraft,
  normalizeDraft,
  suggestedValues,
  type OnboardingDraft,
} from './draftModel';
import { REQUIRED_FIELDS } from './draftFields';

const T0 = '2026-10-04T10:00:00.000Z';
const T1 = '2026-10-04T10:05:00.000Z';

const answered = (updates: Array<{ path: string; value: unknown }>, from?: OnboardingDraft) =>
  applyUserAnswers(from ?? null, 'u1', { updates }, T0);

const FULL = [
  { path: 'owner.name', value: 'Asha' },
  { path: 'identity.industry', value: 'restaurant_food' },
  { path: 'identity.subcategory', value: 'cloud_kitchen' },
  { path: 'identity.name', value: 'Biryani House' },
  { path: 'identity.city', value: 'Hyderabad' },
  { path: 'identity.state', value: 'Telangana' },
  { path: 'contact.whatsapp', value: '+91 98765 43210' },
];

describe('new fields are validated like everything else', () => {
  it('accepts a normal list and de-duplicates it case-insensitively', () => {
    const d = answered([
      { path: 'offering.signature', value: ['Biryani', 'biryani', 'Haleem', ' Haleem '] },
    ]);
    expect(confirmedValues(d)['offering.signature']).toEqual(['Biryani', 'Haleem']);
  });

  it('caps a list at five distinct items, and rejects empty lists and blank items', () => {
    const six = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'];
    expect(() => answered([{ path: 'audience.primary', value: six }])).toThrow(/Invalid value/);
    expect(() => answered([{ path: 'audience.primary', value: [] }])).toThrow(/Invalid value/);
    expect(() => answered([{ path: 'audience.primary', value: ['  '] }])).toThrow(/Invalid value/);
    expect(() => answered([{ path: 'audience.primary', value: 'Families' }])).toThrow(
      /Invalid value/
    );
  });

  it.each(['+91 98765 43210', '9876543210', '098765 43210'])('accepts WhatsApp number %s', (v) => {
    expect(() => answered([{ path: 'contact.whatsapp', value: v }])).not.toThrow();
  });

  it.each(['12345', 'call me', '+91 98765 43210 99999999', '<script>'])(
    'rejects WhatsApp value %p',
    (v) => {
      expect(() => answered([{ path: 'contact.whatsapp', value: v }])).toThrow(/Invalid value/);
    }
  );
});

describe("applySystemFacts — Mitra's guesses are never facts", () => {
  const guess = (path: string, value: unknown, over: Record<string, unknown> = {}) => ({
    path,
    value,
    source: 'AI_INFERRED' as const,
    confidence: 0.5,
    ...over,
  });

  it('stores a guess as unconfirmed, readable only as a suggestion', () => {
    const d = applySystemFacts(newDraft('u1', T0), [guess('offering.signature', ['Biryani'])], T1);
    const entry = d.facts[encodePath('offering.signature')]!;
    expect(entry).toMatchObject({ source: 'AI_INFERRED', confirmed: false });
    expect(confirmedValues(d)).toEqual({});
    expect(suggestedValues(d)).toEqual({ 'offering.signature': ['Biryani'] });
  });

  it('can never overwrite an answer the owner confirmed, however confident', () => {
    const mine = answered([{ path: 'offering.signature', value: ['Haleem'] }]);
    const after = applySystemFacts(
      mine,
      [guess('offering.signature', ['Pizza'], { source: 'AI_DETECTED', confidence: 1 })],
      T1
    );
    expect(confirmedValues(after)['offering.signature']).toEqual(['Haleem']);
    expect(suggestedValues(after)).toEqual({});
  });

  it('caps claimed confidence so a guess cannot pass for near-certainty', () => {
    const d = applySystemFacts(
      newDraft('u1', T0),
      [guess('audience.primary', ['Families'], { confidence: 1 })],
      T1
    );
    expect(d.facts[encodePath('audience.primary')]!.confidence).toBe(0.7);
    const detected = applySystemFacts(
      newDraft('u1', T0),
      [guess('owner.name', 'Asha', { source: 'AI_DETECTED', confidence: 5 })],
      T1
    );
    expect(detected.facts[encodePath('owner.name')]!.confidence).toBe(0.95);
  });

  it('drops invalid or unknown facts instead of failing — discovery is best-effort', () => {
    const d = applySystemFacts(
      newDraft('u1', T0),
      [
        guess('brand.colors.primary', '#fff'),
        guess('offering.signature', 'not-a-list'),
        guess('audience.primary', ['Families']),
      ],
      T1
    );
    expect(Object.keys(d.facts)).toEqual([encodePath('audience.primary')]);
  });

  it('the owner confirming a suggestion makes it a fact, without discarding their other answers', () => {
    const base = answered(FULL);
    const withGuess = applySystemFacts(
      base,
      [guess('offering.signature', ['Biryani', 'Haleem'])],
      T1
    );
    const confirmed = applyUserAnswers(
      withGuess,
      'u1',
      { updates: [{ path: 'offering.signature', value: ['Biryani'] }] },
      T1
    );
    expect(confirmedValues(confirmed)['offering.signature']).toEqual(['Biryani']);
    expect(confirmedValues(confirmed)['identity.industry']).toBe('restaurant_food');
  });
});

describe('dependent answers', () => {
  it('switching industry discards the subcategory, offerings and audience built on it', () => {
    const d = answered([
      ...FULL,
      { path: 'offering.signature', value: ['Biryani'] },
      { path: 'audience.primary', value: ['Families'] },
    ]);
    const switched = applyUserAnswers(
      d,
      'u1',
      { updates: [{ path: 'identity.industry', value: 'salon_beauty' }] },
      T1
    );
    const known = confirmedValues(switched);
    expect(known['identity.subcategory']).toBeUndefined();
    expect(known['offering.signature']).toBeUndefined();
    expect(known['audience.primary']).toBeUndefined();
    // …but everything unrelated survives.
    expect(known['identity.name']).toBe('Biryani House');
    expect(known['owner.name']).toBe('Asha');
  });

  it('answering over an unconfirmed guess does not wipe unrelated answers', () => {
    const base = applySystemFacts(
      answered(FULL),
      [{ path: 'owner.name', value: 'Ash', source: 'AI_DETECTED', confidence: 0.9 }],
      T1
    );
    const out = applyUserAnswers(
      base,
      'u1',
      { updates: [{ path: 'identity.industry', value: 'retail' }] },
      T1
    );
    expect(confirmedValues(out)['identity.name']).toBe('Biryani House');
  });
});

describe('normalizeDraft — the review boundary', () => {
  it('is ready only when every required fact is confirmed', () => {
    expect(normalizeDraft(answered(FULL)).ready).toBe(true);
    expect(normalizeDraft(answered(FULL.slice(0, -1))).missing).toEqual(['contact.whatsapp']);
    expect(REQUIRED_FIELDS.every((p) => FULL.some((f) => f.path === p))).toBe(true);
  });

  it('keeps unconfirmed guesses OUT of the normalized Brain and lists them for review', () => {
    const d = applySystemFacts(
      answered(FULL),
      [{ path: 'audience.primary', value: ['Families'], source: 'AI_INFERRED', confidence: 0.5 }],
      T1
    );
    const n = normalizeDraft(d);
    expect(n.audience.primary).toBeUndefined();
    expect(n.unconfirmed).toEqual(['audience.primary']);
  });

  it('carries the confirmed offering, audience and USP into their Brain slots', () => {
    const n = normalizeDraft(
      answered([
        ...FULL,
        { path: 'offering.signature', value: ['Biryani'] },
        { path: 'audience.primary', value: ['Families', 'Office crowd'] },
        { path: 'positioning.usp', value: 'Cooked dum style in sealed handis' },
      ])
    );
    expect(n.offering.signature).toEqual(['Biryani']);
    expect(n.audience.primary).toEqual(['Families', 'Office crowd']);
    expect(n.positioning.usp).toBe('Cooked dum style in sealed handis');
  });

  it("a detected-but-unconfirmed name is not the owner's name yet", () => {
    const d = applySystemFacts(
      newDraft('u1', T0),
      [{ path: 'owner.name', value: 'Asha', source: 'AI_DETECTED', confidence: 0.9 }],
      T1
    );
    expect(normalizeDraft(d).owner.name).toBeUndefined();
    expect(suggestedValues(d)).toEqual({ 'owner.name': 'Asha' });
  });
});

describe('deriveOnboardingEvents — the funnel', () => {
  const run = (before: OnboardingDraft | null, input: Parameters<typeof applyUserAnswers>[2]) => {
    const after = applyUserAnswers(before, 'u1', input, T1);
    return { after, events: deriveOnboardingEvents(before, after, input) };
  };

  it('records "started" exactly once, on creation', () => {
    const first = run(null, { welcomed: true });
    expect(first.events.map((e) => e.name)).toEqual(['onboarding_started']);
    expect(run(first.after, { welcomed: true }).events).toEqual([]);
  });

  it('records which field was answered, and the industry/subcategory milestones', () => {
    const a = run(null, { updates: [{ path: 'identity.industry', value: 'fitness' }] });
    expect(a.events.map((e) => e.name)).toEqual([
      'onboarding_started',
      'onboarding_answered',
      'onboarding_industry_selected',
    ]);
    expect(a.events.find((e) => e.name === 'onboarding_industry_selected')!.metadata).toEqual({
      industry: 'fitness',
    });

    const b = run(a.after, { updates: [{ path: 'identity.subcategory', value: 'gym' }] });
    expect(b.events.map((e) => e.name)).toEqual([
      'onboarding_answered',
      'onboarding_subcategory_selected',
    ]);
  });

  it('uses deterministic ids so a retried save cannot double-count a milestone', () => {
    const a = run(null, { updates: [{ path: 'identity.industry', value: 'fitness' }] });
    const again = deriveOnboardingEvents(null, a.after, {
      updates: [{ path: 'identity.industry', value: 'fitness' }],
    });
    expect(again.map((e) => e.id)).toEqual(a.events.map((e) => e.id));
  });

  it('does not count a correction as a new milestone', () => {
    const a = run(null, { updates: [{ path: 'identity.industry', value: 'fitness' }] });
    const fix = run(a.after, { updates: [{ path: 'identity.industry', value: 'retail' }] });
    expect(fix.events).toEqual([]);
  });

  it('records skips', () => {
    const a = run(null, { skip: ['owner.role'] });
    expect(a.events.find((e) => e.metadata['skipped'])?.metadata).toEqual({
      field: 'owner.role',
      skipped: true,
    });
  });

  it("never logs the owner's own words — only taxonomy ids and the field name", () => {
    const a = run(null, {
      updates: [
        { path: 'owner.name', value: 'Asha Rao' },
        { path: 'contact.whatsapp', value: '+91 98765 43210' },
        { path: 'positioning.usp', value: 'Our secret masala recipe' },
        { path: 'identity.subcategory', value: 'Home-style tiffins' },
      ],
    });
    const logged = JSON.stringify(a.events);
    for (const secret of ['Asha', '98765', 'secret masala', 'tiffins']) {
      expect(logged).not.toContain(secret);
    }
    expect(
      a.events.find((e) => e.name === 'onboarding_subcategory_selected')!.metadata
    ).toMatchObject({
      isCustom: true,
    });
  });
});
