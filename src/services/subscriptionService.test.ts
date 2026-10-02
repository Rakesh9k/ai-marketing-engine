/**
 * Regression: a paying user has several live subscription docs (the Free one from signup stays
 * active). getByUserId must return the paid one — via the users/{uid}.subscriptionId pointer,
 * else by preferring a paid live subscription — never an arbitrary one.
 */
type Row = { id: string; data: Record<string, unknown> };
let docs: Record<string, Record<string, unknown> | undefined> = {};
let queryRows: Row[] = [];

jest.mock('@/lib/firebase/client', () => ({ getFirebaseDb: () => ({}) }));
jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  const makeRef = (path: string) => ({ path, withConverter: () => makeRef(path) });
  return {
    ...actual,
    doc: (_db: unknown, col: string, id: string) => makeRef(`${col}/${id}`),
    collection: (_db: unknown, col: string) => ({
      ...makeRef(col),
      withConverter: () => makeRef(col),
    }),
    getDoc: async (ref: { path: string }) => {
      const data = docs[ref.path];
      return { exists: () => data !== undefined, data: () => data };
    },
    getDocs: async () => ({ docs: queryRows.map((r) => ({ id: r.id, data: () => r.data })) }),
    query: (...args: unknown[]) => args[0],
    where: () => ({}),
    limit: () => ({}),
  };
});
jest.mock('@/lib/firebase/converters', () => {
  const actual = jest.requireActual('@/lib/firebase/converters');
  const passthrough = { toFirestore: (x: unknown) => x, fromFirestore: (x: unknown) => x };
  return { ...actual, subscriptionConverter: passthrough };
});

import { subscriptionService } from './database';

const free = { subscriptionId: '01a_free', userId: 'u1', planId: 'free', status: 'active' };
const paid = { subscriptionId: 'sub_paid', userId: 'u1', planId: 'business', status: 'active' };

describe('subscriptionService.getByUserId', () => {
  beforeEach(() => {
    docs = {};
    queryRows = [];
  });

  it('uses the user pointer, so the paid plan wins even when Free sorts first', async () => {
    docs['users/u1'] = { subscriptionId: 'sub_paid' };
    docs['subscriptions/sub_paid'] = paid;
    queryRows = [
      { id: '01a_free', data: free },
      { id: 'sub_paid', data: paid },
    ];
    expect((await subscriptionService.getByUserId('u1'))?.planId).toBe('business');
  });

  it('without a pointer, prefers a paid live subscription over Free', async () => {
    docs['users/u1'] = {};
    queryRows = [
      { id: '01a_free', data: free },
      { id: 'sub_paid', data: paid },
    ];
    expect((await subscriptionService.getByUserId('u1'))?.planId).toBe('business');
  });

  it('ignores a pointer to a canceled or foreign subscription', async () => {
    docs['users/u1'] = { subscriptionId: 'sub_old' };
    docs['subscriptions/sub_old'] = { ...paid, subscriptionId: 'sub_old', status: 'canceled' };
    queryRows = [{ id: '01a_free', data: free }];
    expect((await subscriptionService.getByUserId('u1'))?.planId).toBe('free');

    docs['users/u1'] = { subscriptionId: 'sub_foreign' };
    docs['subscriptions/sub_foreign'] = {
      ...paid,
      subscriptionId: 'sub_foreign',
      userId: 'someone-else',
    };
    expect((await subscriptionService.getByUserId('u1'))?.planId).toBe('free');
  });

  it('returns null when there is nothing live', async () => {
    docs['users/u1'] = {};
    expect(await subscriptionService.getByUserId('u1')).toBeNull();
  });
});
