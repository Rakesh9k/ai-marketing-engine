/**
 * No Jest config existed for functions/ before this (confirmed: `npm run
 * functions:test` reported "No tests found, 165 files checked" against a
 * bare `jest` invocation with no ts-jest transform configured). This is the
 * minimal config needed to actually run functions/src/**\/*.test.ts files.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Source uses explicit .js extensions on relative dynamic imports (Node16
  // module resolution requirement), but the compiled test sources are .ts.
  // Strip the extension so Jest resolves these back to the .ts files/mocks.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  setupFiles: ['<rootDir>/src/testSetup.ts'],
  // The emulator-backed usageControl test leaves an open Firestore gRPC
  // handle after admin.app().delete(); force the process to exit rather
  // than hang in CI.
  forceExit: true,
  // The emulator-backed concurrency tests (rate limit, usage reservations, webhook duplicate
  // delivery) contend on one shared Firestore emulator across parallel workers; the 5s default
  // made them time out under load (never fail on a wrong value). Hang detection stays at 30s.
  testTimeout: 30000,
};
