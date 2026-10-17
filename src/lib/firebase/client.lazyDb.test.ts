/**
 * Regression: Firestore initialization is now deferred to getFirebaseDb() lazy getter.
 * No module-evaluation attempt is made, avoiding "Service firestore is not available" warnings.
 * getFirebaseDb() must connect the emulator exactly once on first successful call.
 */
import type * as ClientModule from './client';

process.env['NEXT_PUBLIC_USE_EMULATORS'] = 'true';
process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] = 'demo-project';

const getFirestoreMock = jest.fn();
const connectFirestoreEmulatorMock = jest.fn();

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'app' })),
  getApps: jest.fn(() => [{ name: 'app' }]),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: (...args: unknown[]) => getFirestoreMock(...args),
  connectFirestoreEmulator: (...args: unknown[]) => connectFirestoreEmulatorMock(...args),
}));
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  connectStorageEmulator: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
}));
jest.mock('firebase/app-check', () => ({
  initializeAppCheck: jest.fn(() => ({})),
  ReCaptchaEnterpriseProvider: jest.fn(),
}));

describe('getFirebaseDb (lazy Firestore)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('succeeds on first getFirebaseDb call when Firestore is registered', () => {
    const db = { type: 'firestore' };
    getFirestoreMock.mockImplementation(() => db);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirebaseDb } = require('./client') as typeof ClientModule;

    expect(getFirebaseDb()).toBe(db);
    expect(getFirebaseDb()).toBe(db); // cached afterwards
    expect(getFirestoreMock).toHaveBeenCalledTimes(1); // only lazy getter call
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith(db, 'localhost', 8080);
  });

  it('retries on failure and succeeds on subsequent getFirebaseDb call', () => {
    const db = { type: 'firestore' };
    getFirestoreMock
      .mockImplementationOnce(() => {
        throw new Error('Service firestore is not available');
      })
      .mockImplementation(() => db);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirebaseDb } = require('./client') as typeof ClientModule;

    expect(getFirebaseDb()).toBeUndefined();
    expect(getFirebaseDb()).toBe(db);
    expect(getFirestoreMock).toHaveBeenCalledTimes(2); // 1 failed lazy + 1 retry success
  });

  it('uses the instance created at load when that works, without a second getFirestore call', () => {
    const db = { type: 'firestore' };
    getFirestoreMock.mockImplementation(() => db);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirebaseDb } = require('./client') as typeof ClientModule;

    expect(getFirebaseDb()).toBe(db);
    expect(getFirestoreMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
  });
});
