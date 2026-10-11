import { mergePatches, SaveQueue, type Patch, type SaveStatus } from './saveQueue';

const patch = (p: Partial<Patch>): Patch => ({ updates: {}, skip: [], ...p });

describe('mergePatches', () => {
  it('lets the newer answer win', () => {
    const m = mergePatches(
      patch({ updates: { 'owner.name': 'Asah' } }),
      patch({ updates: { 'owner.name': 'Asha' } })
    );
    expect(m.updates['owner.name']).toBe('Asha');
  });

  it('cancels a pending skip when the field is answered, and an answer when it is skipped', () => {
    expect(
      mergePatches(patch({ skip: ['owner.role'] }), patch({ updates: { 'owner.role': 'owner' } }))
        .skip
    ).toEqual([]);
    const m = mergePatches(
      patch({ updates: { 'owner.role': 'owner' } }),
      patch({ skip: ['owner.role'] })
    );
    expect(m.updates['owner.role']).toBeUndefined();
    expect(m.skip).toEqual(['owner.role']);
  });

  it('never forgets that the welcome screen was seen', () => {
    expect(mergePatches(patch({ welcomed: true }), patch({})).welcomed).toBe(true);
  });
});

describe('SaveQueue', () => {
  it('sends one answer immediately and reports saving -> idle', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const statuses: SaveStatus[] = [];
    const q = new SaveQueue(send, (s) => statuses.push(s));
    await q.enqueue({ updates: { 'owner.name': 'Asha' } });
    expect(send).toHaveBeenCalledWith({ updates: { 'owner.name': 'Asha' }, skip: [] });
    expect(statuses).toEqual(['saving', 'idle']);
    expect(q.hasPending).toBe(false);
  });

  it('coalesces answers that arrive while a save is in flight into one follow-up call', async () => {
    let release!: () => void;
    const send = jest
      .fn()
      .mockImplementationOnce(() => new Promise<void>((r) => (release = r)))
      .mockResolvedValue(undefined);
    const q = new SaveQueue(send);

    const first = q.enqueue({ updates: { 'owner.name': 'Asha' } });
    void q.enqueue({ updates: { 'owner.role': 'owner' } });
    void q.enqueue({ updates: { 'identity.industry': 'retail' } });
    expect(send).toHaveBeenCalledTimes(1); // serial: nothing overlaps

    release();
    await first;
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({
      updates: { 'owner.role': 'owner', 'identity.industry': 'retail' },
      skip: [],
    });
  });

  it('keeps a failed save pending, reports the error, and succeeds on retry', async () => {
    const send = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const statuses: SaveStatus[] = [];
    const q = new SaveQueue(send, (s) => statuses.push(s));

    await q.enqueue({ updates: { 'owner.name': 'Asha' } });
    expect(statuses.at(-1)).toBe('error');
    expect(q.hasPending).toBe(true);

    await q.flush();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ updates: { 'owner.name': 'Asha' }, skip: [] });
    expect(q.hasPending).toBe(false);
    expect(statuses.at(-1)).toBe('idle');
  });

  it('on failure, a newer answer made meanwhile still beats the one that failed', async () => {
    let fail!: (e: Error) => void;
    const send = jest
      .fn()
      .mockImplementationOnce(() => new Promise<void>((_, rej) => (fail = rej)))
      .mockResolvedValue(undefined);
    const q = new SaveQueue(send);

    const first = q.enqueue({ updates: { 'owner.name': 'Asah' } });
    void q.enqueue({ updates: { 'owner.name': 'Asha' } });
    fail(new Error('network'));
    await first;
    await q.flush();
    expect(send).toHaveBeenLastCalledWith({ updates: { 'owner.name': 'Asha' }, skip: [] });
  });

  it('mirrors pending work to the store and restores it after a "refresh"', async () => {
    let saved: Patch | null = null;
    const store = { load: () => saved, save: (p: Patch | null) => (saved = p) };

    const offline = new SaveQueue(
      jest.fn().mockRejectedValue(new Error('offline')),
      undefined,
      store
    );
    await offline.enqueue({ updates: { 'owner.name': 'Asha' } });
    expect(saved).toEqual({ updates: { 'owner.name': 'Asha' }, skip: [] });

    // New page load: a fresh queue picks the unsent answer back up and delivers it.
    const send = jest.fn().mockResolvedValue(undefined);
    const reloaded = new SaveQueue(send, undefined, store);
    expect(reloaded.hasPending).toBe(true);
    await reloaded.flush();
    expect(send).toHaveBeenCalledWith({ updates: { 'owner.name': 'Asha' }, skip: [] });
    expect(saved).toBeNull();
  });
});
