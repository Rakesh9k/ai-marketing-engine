import {
  applyUserAnswers,
  confirmedValues,
  decodePath,
  DraftValidationError,
  encodePath,
  mergeFact,
  newDraft,
  normalizeDraft,
  type KnowledgeEntry,
} from './draftModel';
import { DRAFT_FIELD_PATHS, INDUSTRIES, INDUSTRY_TO_VERTICAL } from './draftFields';

const T0 = '2026-10-04T10:00:00.000Z';
const T1 = '2026-10-04T10:05:00.000Z';

const entry = (over: Partial<KnowledgeEntry>): KnowledgeEntry => ({
  value: 'x',
  source: 'AI_INFERRED',
  confidence: 0.5,
  confirmed: false,
  updatedAt: T0,
  ...over,
});

describe('mergeFact — AI never overwrites confirmed truth', () => {
  it('accepts anything when nothing exists yet', () => {
    const incoming = entry({ value: 'a' });
    expect(mergeFact(undefined, incoming)).toBe(incoming);
  });

  it('lets the owner overwrite their own earlier answer (a correction)', () => {
    const old = entry({ source: 'USER_CONFIRMED', confirmed: true, confidence: 1, value: 'old' });
    const next = entry({ source: 'USER_CONFIRMED', confirmed: true, confidence: 1, value: 'new' });
    expect(mergeFact(old, next).value).toBe('new');
  });

  it('lets the owner overwrite an AI guess', () => {
    const guess = entry({ source: 'AI_DETECTED', confidence: 0.99, value: 'guess' });
    const mine = entry({ source: 'USER_CONFIRMED', confirmed: true, confidence: 1, value: 'mine' });
    expect(mergeFact(guess, mine).value).toBe('mine');
  });

  it.each(['AI_DETECTED', 'AI_INFERRED'] as const)(
    'refuses to let %s replace a confirmed fact, however confident',
    (source) => {
      const confirmed = entry({
        source: 'USER_CONFIRMED',
        confirmed: true,
        confidence: 1,
        value: 'mine',
      });
      const ai = entry({ source, confidence: 1, value: 'ai' });
      expect(mergeFact(confirmed, ai).value).toBe('mine');
    }
  );

  it('keeps a detection over a later inference, and a more confident value over a weaker one', () => {
    const detected = entry({ source: 'AI_DETECTED', confidence: 0.6, value: 'detected' });
    expect(mergeFact(detected, entry({ source: 'AI_INFERRED', confidence: 0.9 })).value).toBe(
      'detected'
    );

    const strong = entry({ source: 'AI_INFERRED', confidence: 0.9, value: 'strong' });
    expect(
      mergeFact(strong, entry({ source: 'AI_INFERRED', confidence: 0.4, value: 'weak' })).value
    ).toBe('strong');
    expect(
      mergeFact(strong, entry({ source: 'AI_INFERRED', confidence: 0.95, value: 'better' })).value
    ).toBe('better');
  });
});

describe('applyUserAnswers', () => {
  it('creates a draft on first save and stamps provenance server-side', () => {
    const d = applyUserAnswers(
      null,
      'u1',
      { updates: [{ path: 'owner.name', value: '  Asha ' }] },
      T0
    );
    const fact = d.facts[encodePath('owner.name')]!;
    expect(fact).toMatchObject({
      value: 'Asha', // trimmed by the field schema
      source: 'USER_CONFIRMED',
      confidence: 1,
      confirmed: true,
      updatedAt: T0,
    });
    expect(d.revision).toBe(1);
    expect(d.uid).toBe('u1');
    expect(d.status).toBe('in_progress');
  });

  it('ignores any client-supplied provenance — a caller cannot forge source/confidence', () => {
    const forged = {
      path: 'owner.name',
      value: 'Asha',
      source: 'AI_DETECTED',
      confidence: 0.01,
      confirmed: false,
    } as unknown as { path: string; value: unknown };
    const d = applyUserAnswers(null, 'u1', { updates: [forged] }, T0);
    expect(d.facts[encodePath('owner.name')]).toMatchObject({
      source: 'USER_CONFIRMED',
      confidence: 1,
      confirmed: true,
    });
  });

  it('rejects unknown paths and invalid values (the draft is a closed registry, not a free bag)', () => {
    expect(() =>
      applyUserAnswers(
        null,
        'u1',
        { updates: [{ path: 'brand.colors.primary', value: '#fff' }] },
        T0
      )
    ).toThrow(DraftValidationError);
    expect(() =>
      applyUserAnswers(
        null,
        'u1',
        { updates: [{ path: 'owner.role', value: 'ceo-of-everything' }] },
        T0
      )
    ).toThrow(/Invalid value/);
    expect(() =>
      applyUserAnswers(null, 'u1', { updates: [{ path: 'owner.name', value: '   ' }] }, T0)
    ).toThrow(/Invalid value/);
    expect(() =>
      applyUserAnswers(null, 'u1', { updates: [{ path: 'owner.name', value: 'x'.repeat(61) }] }, T0)
    ).toThrow(/Invalid value/);
  });

  it('caps the number of updates in one save', () => {
    const updates = Array.from({ length: 21 }, () => ({ path: 'owner.name', value: 'A' }));
    expect(() => applyUserAnswers(null, 'u1', { updates }, T0)).toThrow(/Too many/);
  });

  it('merges into an existing draft without losing earlier answers, and bumps the revision', () => {
    const first = applyUserAnswers(
      null,
      'u1',
      { updates: [{ path: 'owner.name', value: 'Asha' }] },
      T0
    );
    const second = applyUserAnswers(
      first,
      'u1',
      { updates: [{ path: 'owner.role', value: 'founder' }] },
      T1
    );
    expect(confirmedValues(second)).toEqual({ 'owner.name': 'Asha', 'owner.role': 'founder' });
    expect(second.revision).toBe(2);
    expect(second.createdAt).toBe(T0);
    expect(second.updatedAt).toBe(T1);
  });

  it('lets the owner correct an answer', () => {
    const a = applyUserAnswers(
      null,
      'u1',
      { updates: [{ path: 'owner.name', value: 'Asah' }] },
      T0
    );
    const b = applyUserAnswers(a, 'u1', { updates: [{ path: 'owner.name', value: 'Asha' }] }, T1);
    expect(confirmedValues(b)['owner.name']).toBe('Asha');
  });

  it('records skips, but never lets a skip discard an answer already given', () => {
    const answered = applyUserAnswers(
      null,
      'u1',
      { updates: [{ path: 'owner.role', value: 'owner' }] },
      T0
    );
    const d = applyUserAnswers(
      answered,
      'u1',
      { skip: ['owner.role', 'identity.subcategory'] },
      T1
    );
    expect(d.skipped).toEqual(['identity.subcategory']);
    expect(confirmedValues(d)['owner.role']).toBe('owner');
  });

  it('un-skips a field when the owner later answers it', () => {
    const skipped = applyUserAnswers(null, 'u1', { skip: ['identity.subcategory'] }, T0);
    const answered = applyUserAnswers(
      skipped,
      'u1',
      { updates: [{ path: 'identity.subcategory', value: 'cafe' }] },
      T1
    );
    expect(answered.skipped).toEqual([]);
  });

  it('discards a dependent answer when its parent changes (no stale subcategory)', () => {
    const first = applyUserAnswers(
      null,
      'u1',
      {
        updates: [
          { path: 'identity.industry', value: 'restaurant_food' },
          { path: 'identity.subcategory', value: 'cloud_kitchen' },
        ],
      },
      T0
    );
    const switched = applyUserAnswers(
      first,
      'u1',
      { updates: [{ path: 'identity.industry', value: 'salon_beauty' }] },
      T1
    );
    expect(confirmedValues(switched)).toEqual({ 'identity.industry': 'salon_beauty' });
  });

  it('keeps the dependent answer when the parent is re-sent unchanged, or re-answered in the same save', () => {
    const first = applyUserAnswers(
      null,
      'u1',
      {
        updates: [
          { path: 'identity.industry', value: 'restaurant_food' },
          { path: 'identity.subcategory', value: 'cloud_kitchen' },
        ],
      },
      T0
    );
    const same = applyUserAnswers(
      first,
      'u1',
      { updates: [{ path: 'identity.industry', value: 'restaurant_food' }] },
      T1
    );
    expect(confirmedValues(same)['identity.subcategory']).toBe('cloud_kitchen');

    const both = applyUserAnswers(
      first,
      'u1',
      {
        updates: [
          { path: 'identity.industry', value: 'salon_beauty' },
          { path: 'identity.subcategory', value: 'spa' },
        ],
      },
      T1
    );
    expect(confirmedValues(both)).toEqual({
      'identity.industry': 'salon_beauty',
      'identity.subcategory': 'spa',
    });
  });

  it('remembers that the welcome screen was seen, and never forgets it', () => {
    const a = applyUserAnswers(null, 'u1', { welcomed: true }, T0);
    expect(a.welcomed).toBe(true);
    expect(applyUserAnswers(a, 'u1', {}, T1).welcomed).toBe(true);
  });

  it("refuses to write another user's draft or a completed one", () => {
    const theirs = newDraft('someone-else', T0);
    expect(() => applyUserAnswers(theirs, 'u1', {}, T1)).toThrow(/different user/);
    const done = { ...newDraft('u1', T0), status: 'completed' as const };
    expect(() => applyUserAnswers(done, 'u1', {}, T1)).toThrow(/already complete/);
  });
});

describe('path encoding', () => {
  it('round-trips and keeps map keys dot-free', () => {
    for (const p of DRAFT_FIELD_PATHS) {
      expect(encodePath(p)).not.toContain('.');
      expect(decodePath(encodePath(p))).toBe(p);
    }
  });
});

describe('normalizeDraft — draft -> Business Brain slots', () => {
  it('reads only confirmed facts, so an unconfirmed AI guess cannot leak into the Brain', () => {
    const d = newDraft('u1', T0);
    d.facts[encodePath('identity.industry')] = entry({
      value: 'retail',
      source: 'AI_INFERRED',
      confirmed: false,
    });
    const n = normalizeDraft(d);
    expect(n.identity.industry).toBeUndefined();
    expect(n.missing).toContain('identity.industry');
  });

  it('maps a supported industry to its campaign vertical', () => {
    const d = applyUserAnswers(
      null,
      'u1',
      {
        updates: [
          { path: 'owner.name', value: 'Asha' },
          { path: 'identity.industry', value: 'restaurant_food' },
          { path: 'identity.subcategory', value: 'cloud_kitchen' },
        ],
      },
      T0
    );
    const n = normalizeDraft(d);
    expect(n.owner).toEqual({ name: 'Asha', role: undefined });
    expect(n.identity).toMatchObject({
      industry: 'restaurant_food',
      subcategory: 'cloud_kitchen',
      vertical: 'restaurant',
    });
    // Business name, city, state and WhatsApp are still unanswered, so this is not reviewable yet.
    expect(n.ready).toBe(false);
    expect(n.missing).toEqual([
      'identity.name',
      'identity.city',
      'identity.state',
      'contact.whatsapp',
    ]);
  });

  it('does NOT coerce an industry without a vertical into restaurant — it stays null', () => {
    const d = applyUserAnswers(
      null,
      'u1',
      { updates: [{ path: 'identity.industry', value: 'fitness' }] },
      T0
    );
    expect(normalizeDraft(d).identity).toMatchObject({ industry: 'fitness', vertical: null });
  });

  it('covers every industry in the vertical map', () => {
    expect(Object.keys(INDUSTRY_TO_VERTICAL).sort()).toEqual([...INDUSTRIES].sort());
  });
});
