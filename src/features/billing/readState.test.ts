import { describeReadError, settleRead } from './readState';

describe('settleRead', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('a successful read of an existing document is ok', async () => {
    expect(await settleRead('subscription', async () => ({ planId: 'starter' }))).toEqual({
      ok: true,
      value: { planId: 'starter' },
    });
  });

  it('a successful read of a MISSING document is ok with null (documented default), not a failure', async () => {
    const result = await settleRead('subscription', async () => null);
    expect(result).toEqual({ ok: true, value: null });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('an infrastructure failure is NOT ok and is logged without sensitive data', async () => {
    const result = await settleRead('subscription', async () => {
      throw Object.assign(new Error('Firestore not initialized'), { code: 'failed-precondition' });
    });
    expect(result).toEqual({ ok: false, error: 'failed-precondition: Firestore not initialized' });
    expect(console.error).toHaveBeenCalledWith(
      '[billing] subscription read failed',
      'failed-precondition: Firestore not initialized'
    );
  });

  it('describeReadError never throws on odd inputs and truncates long messages', () => {
    expect(describeReadError(undefined)).toBe('undefined');
    expect(describeReadError('boom')).toBe('boom');
    expect(describeReadError(new Error('x'.repeat(500))).length).toBeLessThan(220);
  });
});
