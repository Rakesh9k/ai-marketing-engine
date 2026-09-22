/**
 * Regression test — usage document ID must be derived in UTC.
 *
 * Found in real-browser production verification (Phase 19C): the backend
 * creates `usage/{uid}_{YYYY-MM-01}` from the UTC month start, but the client
 * built the ID from the LOCAL month start. For any timezone ahead of UTC
 * (all of India) that yields the previous day, a document that does not
 * exist; the usage read rule denies missing documents, so every dashboard
 * load failed with "Missing or insufficient permissions".
 *
 * The bug is invisible on a UTC machine (CI), so tests/globalSetup.js pins the
 * whole Jest run to IST; the first test below fails loudly if that ever stops
 * being true.
 */

const getDocMock = jest.fn();
const docMock = jest.fn((_db: unknown, collectionName: string, id: string) => {
  const ref = { path: `${collectionName}/${id}`, withConverter: () => ref };
  return ref;
});

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: (...args: [unknown, string, string]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: () => ({}),
}));

import { usageService } from '@/services/database';

describe('usageService.getCurrentPeriod — UTC usage document id', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    docMock.mockClear();
    getDocMock.mockResolvedValue({ exists: () => false });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs in IST (precondition for the cases below)', () => {
    expect(new Date().getTimezoneOffset()).toBe(-330);
  });

  it.each([
    ['2026-09-21T12:00:00Z', 'uid1_2026-09-01'],
    ['2026-09-01T00:30:00Z', 'uid1_2026-09-01'], // 06:00 IST on the 1st
    ['2026-08-31T20:00:00Z', 'uid1_2026-08-01'], // already Sep 1 in IST, but the UTC month (what the backend uses) is still August
    ['2026-09-30T20:00:00Z', 'uid1_2026-09-01'], // already Oct 1 in IST, still Sep 30 UTC
  ])('at %s requests %s', async (isoNow, expectedId) => {
    jest.setSystemTime(new Date(isoNow));

    await usageService.getCurrentPeriod('uid1');

    const requested = docMock.mock.calls.map((c) => `${c[1]}/${c[2]}`);
    expect(requested).toEqual([`usage/${expectedId}`]);
  });
});
