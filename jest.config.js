module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@functions/(.*)$': '<rootDir>/functions/src/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'functions/src/**/*.ts',
    '!src/**/*.d.ts',
    '!functions/src/**/*.d.ts',
    '!src/app/**/*.tsx',
    '!src/**/*.stories.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    // The app's own tsconfig.json sets jsx: "preserve" (Next.js compiles JSX
    // itself via SWC after tsc). ts-jest has no such downstream compiler —
    // "preserve" mode leaves raw JSX syntax in the transformed output, which
    // Node can't execute at all. This project had no .tsx test files before
    // Phase 8, so this was never exercised. Overridden to "react-jsx" for
    // the test transform only; the real app build is unaffected.
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
};
