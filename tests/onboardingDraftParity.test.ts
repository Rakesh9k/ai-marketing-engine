/**
 * The onboarding draft's field registry exists twice — server (with value schemas) and browser
 * (to drive the question engine) — because the two packages cannot import each other. This keeps
 * them honest: if one gains a path, industry, role, required fact or dependency the other lacks,
 * it fails here instead of in production as a rejected save or a stale answer.
 */
import { readFileSync } from 'fs';
import {
  DEPENDENT_FIELDS,
  DRAFT_FIELD_PATHS,
  INDUSTRY_IDS,
  OWNER_ROLE_IDS,
} from '@/features/onboarding/engine/fields';
import { QUESTIONS } from '@/features/onboarding/engine/questions';

const server = readFileSync('functions/src/onboarding/draftFields.ts', 'utf8');

/** The text between `export const NAME` and the first `closer` that follows it. */
function sliceAfter(name: string, closer: string): string {
  const start = server.indexOf(`export const ${name}`);
  if (start === -1) throw new Error(`could not find ${name} in draftFields.ts`);
  const end = server.indexOf(closer, start);
  if (end === -1) throw new Error(`could not find end of ${name} in draftFields.ts`);
  return server.slice(start, end);
}

const quoted = (text: string): string[] => [...text.matchAll(/'([^']+)'/g)].map((m) => m[1]!);

describe('onboarding draft field parity (server <-> browser)', () => {
  it('knows the same industries', () => {
    expect([...INDUSTRY_IDS].sort()).toEqual(quoted(sliceAfter('INDUSTRIES', '] as const')).sort());
  });

  it('knows the same owner roles', () => {
    expect([...OWNER_ROLE_IDS].sort()).toEqual(
      quoted(sliceAfter('OWNER_ROLES', '] as const')).sort()
    );
  });

  it('accepts exactly the same field paths', () => {
    const block = sliceAfter('DRAFT_FIELDS', '} as const');
    const serverPaths = [...block.matchAll(/^\s*'([a-z]+\.[A-Za-z]+)':/gm)].map((m) => m[1]!);
    expect(serverPaths.length).toBeGreaterThan(0);
    expect([...DRAFT_FIELD_PATHS].sort()).toEqual(serverPaths.sort());
  });

  it('never asks a question that fills a field the server would reject', () => {
    for (const q of QUESTIONS) expect(DRAFT_FIELD_PATHS).toContain(q.field);
  });

  it('treats the same facts as required (what the server needs before review == what we insist on asking)', () => {
    const serverRequired = quoted(sliceAfter('REQUIRED_FIELDS', '];'));
    const clientRequired = QUESTIONS.filter((q) => q.importance === 'required').map((q) => q.field);
    expect(serverRequired.length).toBeGreaterThan(0);
    expect([...clientRequired].sort()).toEqual([...serverRequired].sort());
  });

  it('discards the same dependent answers when a parent changes', () => {
    const block = sliceAfter('DEPENDENT_FIELDS', '};');
    const serverMap: Record<string, string[]> = {};
    for (const m of block.matchAll(/'([A-Za-z.]+)':\s*\[([^\]]*)\]/g)) {
      serverMap[m[1]!] = quoted(m[2]!).sort();
    }
    const clientMap = Object.fromEntries(
      Object.entries(DEPENDENT_FIELDS).map(([k, v]) => [k, [...(v ?? [])].sort()])
    );
    expect(Object.keys(serverMap).length).toBeGreaterThan(0);
    expect(clientMap).toEqual(serverMap);
  });
});
