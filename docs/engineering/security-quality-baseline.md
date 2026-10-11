# Engineering Security and Quality Baseline Audit

**Date:** October 10, 2026  
**Application:** AI Marketing Engine (Mitra by Brainwise)  
**Author:** Principal Application Security Engineer & QA Lead

---

## 1. Environment & Architecture Overview

- **Framework:** Next.js 16.3.6 (App Router)
- **Runtime:** Node.js 20.x, React 18.3.1, TypeScript 5.5.4
- **Styling:** Tailwind CSS v4, PostCSS
- **Backend Architecture:**
  - Next.js Route Handlers (`src/app/api/`)
  - Firebase Cloud Functions 2nd Gen (`functions/src/`)
- **Authentication:** Firebase Authentication (ID tokens, custom claims)
- **Database & Storage:** Cloud Firestore (`firestore.rules`), Google Cloud Storage (`storage.rules`)
- **Testing & Quality Tools:** Jest 29, React Testing Library, Playwright (E2E), ESLint 8, Prettier 3, TypeScript `tsc`

---

## 2. Baseline Check Results

| Check | Command | Status | Result / Findings |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | ❌ FAILED | 1 type error in `src/features/agency/hooks/useAgencyContext.ts(93,23)`: `Argument of type 'Client \| undefined' is not assignable to parameter of type 'SetStateAction<Client \| null>'` |
| **Production Build** | `npm run build` | ❌ FAILED | Turbopack compilation succeeded, but build failed at typecheck step due to `TS2345` in `useAgencyContext.ts` |
| **ESLint & Prettier** | `npm run lint` | ❌ FAILED | 168 problems (167 Prettier formatting errors, 1 `@typescript-eslint/no-unused-vars` in `src/features/reel/components/ReelWizard.tsx`) |
| **Jest Unit Tests** | `npm run test` | ✅ PASSED | 103 test suites passed (6 skipped, 0 failed), 1,466 tests passed |
| **Playwright E2E** | `npm run test:e2e` | ⚠️ BLOCKED | Infrastructure prepared (`tests/e2e/mvp-golden-path.spec.ts`), local execution restricted by host AppLocker/WDAC policy |

---

## 3. Initial Security & Quality Vulnerabilities

1. **Unprotected Next.js API Routes (High Severity)**
   - `/api/generate-content`: Lacks server-side authentication, tenant verification, input schemas, and rate limiting. Anyone can send POST requests to trigger content generation logic.
2. **Missing HTTP Security Headers & CSP (Medium Severity)**
   - `next.config.ts` configures several headers (`X-Frame-Options`, `Strict-Transport-Security`, `Permissions-Policy`), but completely omits `Content-Security-Policy`.
3. **Environment Variable Validation (Medium Severity)**
   - No schema-based validation (Zod) enforcing server vs. public configuration at startup.
4. **Lack of Rate Limiting on Next.js API Routes (High Severity)**
   - No distributed rate limiting (e.g. Upstash Redis / @upstash/ratelimit) on Next.js route handlers.
5. **CI/CD Quality Gates & Coverage (Medium Severity)**
   - Coverage thresholds not strictly enforced in Jest configuration.
   - Type checking and linting fail in baseline, blocking automated CI pipelines.
6. **Ad Hoc Network Mocking (Low/Medium Severity)**
   - Inconsistent mocking across tests; MSW integration missing for HTTP-level interception.
7. **Dead Code & Unused Dependencies (Low Severity)**
   - Knip audit not integrated into CI.

---

## 4. Change-Safety Policy

1. **Preserve API Contracts & Product Behavior:** Never break client-facing responses, auth state, or business logic.
2. **Strict Server-Side Enforcement:** Never trust client-provided claims or route-level UI guards as proof of identity or authorization.
3. **Zero Test Fallbacks:** Never swallow security exceptions or return fake success responses in production code to make tests pass.
4. **Incremental & Verifiable Changes:** Rerun `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` after each phase.
