# Environment Configuration & Schema Validation

**Date:** October 10, 2026  
**Implementation:** Zod Schema Validation (`src/lib/config/env.ts`)

---

## 1. Classification & Scope

Environment variables are categorized into two strict boundaries:

### Client-Exposed (Public) Variables — `NEXT_PUBLIC_*`
- Inlined into client JS bundle during build time.
- Must never contain private backend keys, database master passwords, or admin tokens.
- Examples: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.

### Server-Only Secret Variables
- Evaluated strictly in Node.js server environments (Route Handlers, Server Components, Cloud Functions).
- Examples: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `FIREBASE_PROJECT_ID`.

---

## 2. Validation Rules & Error Diagnostics

- Executed on startup and API request boundaries.
- Uses Zod schema (`publicEnvSchema` & `serverEnvSchema`).
- In case of invalid configuration:
  - Fails fast with explicit variable names and validation constraints.
  - Never logs or prints actual secret string values.
