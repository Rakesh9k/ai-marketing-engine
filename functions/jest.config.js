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
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/src/testSetup.ts'],
  // The emulator-backed usageControl test leaves an open Firestore gRPC
  // handle after admin.app().delete(); force the process to exit rather
  // than hang in CI.
  forceExit: true,
};
