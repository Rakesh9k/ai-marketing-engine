import '@testing-library/jest-dom';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

if (typeof Headers !== 'undefined' && !(Headers.prototype as any).getSetCookie) {
  (Headers.prototype as any).getSetCookie = function () {
    return [];
  };
}

if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn() as any;
  global.Headers = class Headers {
    private _map = new Map<string, string>();
    constructor(init?: any) {
      if (init) {
        if (typeof init.forEach === 'function') {
          init.forEach((v: string, k: string) => this._map.set(k.toLowerCase(), v));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([k, v]) => this._map.set(k.toLowerCase(), String(v)));
        }
      }
    }
    get(key: string) {
      return this._map.get(key.toLowerCase()) || null;
    }
    getSetCookie() {
      return [];
    }
    append(k: string, v: string) {
      this._map.set(k.toLowerCase(), v);
    }
    set(k: string, v: string) {
      this._map.set(k.toLowerCase(), v);
    }
    delete(k: string) {
      this._map.delete(k.toLowerCase());
    }
    has(k: string) {
      return this._map.has(k.toLowerCase());
    }
    forEach(cb: any) {
      this._map.forEach(cb);
    }
  } as any;
  global.Request = class Request {
    url: string;
    method: string;
    headers: any;
    body: any;
    constructor(input: any, init?: any) {
      this.url = typeof input === 'string' ? input : input?.url || '';
      this.method = init?.method || 'GET';
      this.headers = new (global.Headers as any)(init?.headers);
      this.body = init?.body;
    }
    json() {
      return Promise.resolve(
        typeof this.body === 'string' ? JSON.parse(this.body) : this.body || {}
      );
    }
  } as any;
  global.Response = class Response {
    headers: any;
    status: number;
    _body: any;
    constructor(body?: any, init?: any) {
      this._body = body;
      this.status = init?.status ?? 200;
      this.headers = new (global.Headers as any)(init?.headers);
    }
    json() {
      return Promise.resolve(
        typeof this._body === 'string' ? JSON.parse(this._body) : this._body || {}
      );
    }
    text() {
      return Promise.resolve(
        typeof this._body === 'string' ? this._body : JSON.stringify(this._body || '')
      );
    }
  } as any;
}

if (typeof (global.Response as any).json !== 'function') {
  (global.Response as any).json = function (data: any, init?: any) {
    const res = new (global.Response as any)();
    (res as any).status = init?.status ?? 200;
    (res as any).json = () => Promise.resolve(data);
    (res as any).headers = init?.headers || {};
    return res;
  };
}

process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] = 'test-api-key';
process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] = 'test.firebaseapp.com';
process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] = 'test-project';
process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'] = 'test-bucket';
process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'] = '123456789';
process.env['NEXT_PUBLIC_FIREBASE_APP_ID'] = '1:12345:web:12345';

/**
 * tests/security.test.ts, tests/phase27-authz.test.ts,
 * tests/phase27-bulk-approval-auth-roles.test.ts, and tests/storage.test.ts
 * all call expect(promise)['toSucceed']() / ['toDeny'](), but these custom
 * matchers were never actually registered anywhere in the codebase.
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

if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('node:crypto');
  (window.crypto as unknown as { randomUUID: () => string }).randomUUID = () =>
    nodeCrypto.randomUUID();
}

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

  if (typeof window.IntersectionObserver === 'undefined') {
    class IntersectionObserverMock {
      readonly root: Element | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      disconnect = jest.fn();
      observe = jest.fn();
      takeRecords = jest.fn().mockReturnValue([]);
      unobserve = jest.fn();
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: IntersectionObserverMock,
    });
    Object.defineProperty(global, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: IntersectionObserverMock,
    });
  }
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
