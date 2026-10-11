/**
 * Cloud Functions lint config. Without this file ESLint walks up to the repo-root
 * .eslintrc.js (Next.js + the root tsconfig, which excludes *.test.ts), so every test file
 * failed to parse and `npm run lint` could never pass. Server code uses the same
 * unused-vars / type-import rules as the web app, minus the React/Next plugins.
 */
module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // A leading underscore marks an intentionally unused binding.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    // Inline import('x').T annotations are used deliberately in this codebase to avoid
    // circular type imports; `import type` is still enforced for real import statements.
    '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
    '@typescript-eslint/no-floating-promises': 'warn',
  },
  ignorePatterns: ['lib/', 'node_modules/', '.eslintrc.js', 'jest.config.js'],
};
