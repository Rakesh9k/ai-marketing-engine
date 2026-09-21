/**
 * Phase 11 — mass-assignment / extra-field attack test (§56). Proves that
 * validateInput (Zod, no schema anywhere in this project uses
 * .passthrough()/.strict() to opt into forwarding unknown keys) silently
 * strips unexpected fields rather than forwarding them to a handler that
 * might trust them.
 */
import { z } from 'zod';
import { validateInput } from './validation';

describe('validateInput — mass assignment / extra field attack protection (Phase 11 §56)', () => {
  it('strips privileged/unexpected fields not declared in the schema', () => {
    const schema = z.object({ planId: z.enum(['starter', 'business', 'agency']) });
    const validate = validateInput(schema);

    const result = validate({
      planId: 'starter',
      role: 'admin',
      credits: 999999,
      ownerId: 'victim',
      agencyId: 'other-agency',
      status: 'approved',
      amount: 1,
    } as any);

    expect(result).toEqual({ planId: 'starter' });
    expect((result as any).role).toBeUndefined();
    expect((result as any).credits).toBeUndefined();
    expect((result as any).ownerId).toBeUndefined();
    expect((result as any).agencyId).toBeUndefined();
    expect((result as any).amount).toBeUndefined();
  });

  it('rejects a request missing a required field, even if extra fields try to compensate', () => {
    const schema = z.object({ businessId: z.string().min(1) });
    const validate = validateInput(schema);

    expect(() => validate({ role: 'admin', credits: 999999 } as any)).toThrow();
  });
});
