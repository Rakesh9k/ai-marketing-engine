# Automated Test Coverage & CI Quality Gates

**Date:** October 10, 2026  
**Status:** Configured in `jest.config.js` & `.github/workflows/ci-cd.yml`

---

## 1. Coverage Thresholds Configuration

Coverage is measured automatically across unit and integration tests:

| Target Scope | Branch Threshold | Line Threshold | Function Threshold | Statement Threshold | Enforcement Level |
|---|---|---|---|---|---|
| **Global Scope** (`src/`, `functions/src/`) | 75% | 75% | 75% | 75% | CI Hard Gate |
| **Critical Server Logic** (`src/lib/server/**/*.ts`) | 85% | 85% | 85% | 85% | Strict Module Gate |

---

## 2. GitHub Actions Quality Gates

1. **Frontend Lint & Type Check:** ESLint (zero warnings allowed), TypeScript (`tsc --noEmit`), build verification (`next build`).
2. **Backend / Cloud Functions:** ESLint, `tsc --noEmit`, callable function unit tests.
3. **Unit & Integration Test Suite:** Jest runner execution with coverage threshold enforcement (`npm run test:coverage`).
4. **Security & Dependency Audit:** Dependency vulnerabilities scan and secret leakage prevention checks.
