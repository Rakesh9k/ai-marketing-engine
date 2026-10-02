/**
 * Regression: Firestore used to be created once at module evaluation. When the bundler evaluated
 * client.ts before Firestore's service registration, getFirestore() threw "Service firestore is
 * not available", the error was only warned, and getFirebaseDb() returned undefined for the whole
 * session — every Firestore read in the app silently returned nothing (a paying customer saw the
 * Free plan). getFirebaseDb() must recover on a later call and connect the emulator exactly once.
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

  it('recovers when Firestore was not registered yet at module load', () => {
    const db = { type: 'firestore' };
    getFirestoreMock
      .mockImplementationOnce(() => {
        throw new Error('Service firestore is not available'); // module-evaluation attempt
      })
      .mockImplementation(() => db);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirebaseDb } = require('./client') as typeof ClientModule;

    expect(getFirebaseDb()).toBe(db);
    expect(getFirebaseDb()).toBe(db); // cached afterwards
    expect(getFirestoreMock).toHaveBeenCalledTimes(2); // 1 failed at load + 1 lazy success
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith(db, 'localhost', 8080);
  });

  it('returns undefined (without throwing) while Firestore is still unavailable, then succeeds', () => {
    const db = { type: 'firestore' };
    getFirestoreMock
      .mockImplementationOnce(() => {
        throw new Error('Service firestore is not available');
      })
      .mockImplementationOnce(() => {
        throw new Error('Service firestore is not available');
      })
      .mockImplementation(() => db);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirebaseDb } = require('./client') as typeof ClientModule;

    expect(getFirebaseDb()).toBeUndefined();
    expect(getFirebaseDb()).toBe(db);
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
