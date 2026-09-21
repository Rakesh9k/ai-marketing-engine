import '@testing-library/jest-dom';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

/**
 * tests/security.test.ts, tests/phase27-authz.test.ts,
 * tests/phase27-bulk-approval-auth-roles.test.ts, and tests/storage.test.ts
 * all call expect(promise)['toSucceed']() / ['toDeny'](), but these custom
 * matchers were never actually registered anywhere in the codebase. Since
 * every one of those test files has always run in an environment where
 * FIRESTORE_EMULATOR_HOST is unset (self-skipping before ever reaching an
 * assertion), this was never caught — the matchers were dead references.
 * Implemented directly on top of @firebase/rules-unit-testing's own
 * assertSucceeds/assertFails, which is exactly what these matcher names
 * were always meant to wrap.
 */
expect.extend({
  async toSucceed(received: Promise<unknown>) {
    try {
      await assertSucceeds(received);
      return { pass: true, message: () => 'Expected the operation to be denied, but it succeeded' };
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `Expected the operation to succeed, but it was denied: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
  async toDeny(received: Promise<unknown>) {
    try {
      await assertFails(received);
      return { pass: true, message: () => 'Expected the operation to succeed, but it was denied' };
    } catch {
      return {
        pass: false,
        message: () => 'Expected the operation to be denied, but it succeeded',
      };
    }
  },
});

// jsdom's window.crypto does not implement randomUUID (Node's own global
// crypto does). Components that call crypto.randomUUID() (e.g. the
// regenerate-asset idempotency key in CampaignDetailContent) crash in any
// jsdom-environment test without this — this project had no .tsx component
// tests before Phase 8, so it was never exercised.
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('node:crypto');
  (window.crypto as unknown as { randomUUID: () => string }).randomUUID = () =>
    nodeCrypto.randomUUID();
}

// Guarded: this setup file also runs for tests forced into the 'node'
// environment (e.g. Firestore rules tests via the @jest-environment node
// pragma), where `window` does not exist.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
  });
}

const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};
