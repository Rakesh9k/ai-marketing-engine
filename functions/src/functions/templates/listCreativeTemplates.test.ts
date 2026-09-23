/**
 * Phase 7 — the one HTTP boundary exposing the Phase 6 CreativeTemplateRegistry
 * to the frontend. Pure in-memory read (no Firestore, no AI, no credits) so
 * this runs as a plain unit test, no emulator required.
 */
import { listCreativeTemplates } from './listCreativeTemplates';
import { BUILTIN_CREATIVE_TEMPLATES } from '../../config/creativeTemplateLibrary';

function callableRequest(data: unknown, uid = 'user-1') {
  return { data, auth: { uid, token: {} as any } } as any;
}

describe('listCreativeTemplates callable', () => {
  it('requires authentication', async () => {
    await expect((listCreativeTemplates as any).run({ data: {}, auth: null } as any)).rejects.toThrow();
  });

  it('returns every active built-in template when no filters are supplied', async () => {
    const result = await (listCreativeTemplates as any).run(callableRequest({}));
    expect(result.templates.length).toBe(BUILTIN_CREATIVE_TEMPLATES.filter((t) => t.active).length);
  });

  it('filters by type', async () => {
    const result = await (listCreativeTemplates as any).run(callableRequest({ type: 'reel' }));
    expect(result.templates.length).toBe(20);
    for (const t of result.templates) expect(t.type).toBe('reel');
  });

  it('filters by objective', async () => {
    const result = await (listCreativeTemplates as any).run(callableRequest({ objective: 'conversion' }));
    expect(result.templates.length).toBeGreaterThan(0);
    for (const t of result.templates) expect(t.objectives).toContain('conversion');
  });

  it('filters by vertical', async () => {
    const result = await (listCreativeTemplates as any).run(callableRequest({ vertical: 'restaurant' }));
    expect(result.templates.length).toBeGreaterThan(0);
    for (const t of result.templates) expect(t.compatibleVerticals).toContain('restaurant');
  });

  it('combines all three filters (AND)', async () => {
    const result = await (listCreativeTemplates as any).run(
      callableRequest({ type: 'reel', objective: 'conversion', vertical: 'restaurant' })
    );
    expect(result.templates.length).toBeGreaterThan(0);
    for (const t of result.templates) {
      expect(t.type).toBe('reel');
      expect(t.objectives).toContain('conversion');
      expect(t.compatibleVerticals).toContain('restaurant');
    }
  });

  it('returns an empty array (not an error) for a filter combination matching nothing', async () => {
    const result = await (listCreativeTemplates as any).run(callableRequest({ objective: 'retention' }));
    expect(result.templates).toEqual([]);
  });

  it('rejects an invalid type value', async () => {
    await expect((listCreativeTemplates as any).run(callableRequest({ type: 'carousel' }))).rejects.toThrow();
  });

  it('never returns internal creative grammar (structure/visualGrammar/adaptationRules/constraints) to the client', async () => {
    const result = await (listCreativeTemplates as any).run(callableRequest({ type: 'post' }));
    for (const t of result.templates) {
      expect(t).not.toHaveProperty('structure');
      expect(t).not.toHaveProperty('visualGrammar');
      expect(t).not.toHaveProperty('adaptationRules');
      expect(t).not.toHaveProperty('constraints');
      expect(Object.keys(t).sort()).toEqual(
        ['compatibleVerticals', 'description', 'id', 'name', 'objectives', 'type'].sort()
      );
    }
  });
});
