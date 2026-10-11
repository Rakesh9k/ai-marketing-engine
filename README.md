# AI Marketing Engine

**One Photo + One Offer → Complete Local Campaign**

AI Marketing Engine is a marketing platform that helps Indian local businesses (starting with Hyderabad restaurants) create high-converting marketing campaigns without marketing expertise, design skills, or agency budgets. Upload a product photo, define an offer, and get a complete campaign pack: 5 posters, 5 headlines, 5 ad copies, 5 captions, 3 Story concepts, 3 Reel concepts, and 1 WhatsApp promotion — all in Hyderabadi Telugu-English that drives WhatsApp orders.

---

## Current Phase

**PHASE 36 — FINAL INTEGRATION, REGRESSION & PRODUCTION READINESS**

The sections below ("Phase Boundary", feature-flag defaults, "Remaining Issues") describe Phase 1
(local development scaffolding only) and are now historical — kept for the record, not current
status. As of Phase 36, the product is functionally complete for all three verticals (restaurant,
salon, real estate): onboarding, Business Brain, product/service/property management, AI campaign
generation, Truth Check fact verification, regeneration, download, WhatsApp CTA + click tracking,
credits, Razorpay billing, and analytics are all implemented and tested. See
`docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md` for the authoritative, evidence-based status of
every area (PASS/PARTIAL/BLOCKED/FAIL/NOT IMPLEMENTED per area, not a summary claim) and
`docs/PHASE_*_*.md` for the detailed report of each phase that built a given area.

---

## Technology Stack

| Layer            | Technology                                                      |
| ---------------- | --------------------------------------------------------------- |
| **Frontend**     | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS     |
| **Backend**      | Firebase Cloud Functions (Gen 2, Node.js 20, TypeScript)        |
| **Database**     | Cloud Firestore (Native mode, `asia-south1`)                    |
| **Auth**         | Firebase Authentication (Email/Password, Phone OTP, Google)     |
| **Storage**      | Firebase Storage                                                |
| **Payments**     | Razorpay (INR subscriptions)                                    |
| **AI Providers** | NVIDIA Nemotron, Gemini 1.5 Pro, GPT-4o (via abstraction layer) |
| **Deployment**   | Firebase App Hosting (Frontend), Firebase Functions (Backend)   |
| **Testing**      | Jest, React Testing Library                                     |
| **Code Quality** | ESLint, Prettier, TypeScript (strict)                           |

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool                 | Version    | Installation                                                                              |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| **Node.js**          | 20.x (LTS) | [nodejs.org](https://nodejs.org/) or `nvm install 20`                                     |
| **npm**              | 10.x+      | Included with Node.js                                                                     |
| **Git**              | 2.x+       | [git-scm.com](https://git-scm.com/)                                                       |
| **Firebase CLI**     | 13.x+      | `npm install -g firebase-tools`                                                           |
| **Cursor / VS Code** | Latest     | [cursor.sh](https://cursor.sh/) / [code.visualstudio.com](https://code.visualstudio.com/) |
| **GitHub CLI**       | 2.x+       | `winget install GitHub.cli` (Windows)                                                     |

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-marketing-engine
```

### 2. Install Dependencies

```bash
# Install root dependencies (Next.js frontend)
npm install

# Install Cloud Functions dependencies
npm --prefix functions install
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your Firebase configuration
# Get values from Firebase Console > Project Settings > General > Your apps
```

### 4. Set Up Firebase (Development)

```bash
# Login to Firebase
firebase login

# Start Firebase Emulators (in a separate terminal)
npm run dev:emulators

# Or start individual emulators
firebase emulators:start --only auth,firestore,storage,functions
```

### 5. Start Development Server

```bash
# Terminal 1: Firebase Emulators
npm run dev:emulators

# Terminal 2: Next.js Development Server
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## Development Commands

| Command                       | Description                       |
| ----------------------------- | --------------------------------- |
| `npm run dev`                 | Start Next.js development server  |
| `npm run build`               | Build for production              |
| `npm run start`               | Start production server           |
| `npm run lint`                | Run ESLint                        |
| `npm run lint:fix`            | Run ESLint with auto-fix          |
| `npm run typecheck`           | Run TypeScript type checking      |
| `npm run test`                | Run tests                         |
| `npm run test:watch`          | Run tests in watch mode           |
| `npm run test:coverage`       | Run tests with coverage report    |
| `npm run format`              | Format code with Prettier         |
| `npm run format:check`        | Check code formatting             |
| `npm run dev:emulators`       | Start Firebase Emulators          |
| `npm run functions:build`     | Build Cloud Functions             |
| `npm run functions:serve`     | Build and serve Functions locally |
| `npm run functions:deploy`    | Deploy Functions to Firebase      |
| `npm run functions:logs`      | View Functions logs               |
| `npm run functions:lint`      | Lint Functions code               |
| `npm run functions:typecheck` | Type check Functions code         |
| `npm run functions:test`      | Run Functions tests               |

---

## Environment Variables

`.env.example` is the authoritative inventory (names only, safe placeholders, per-variable notes on
where each is set). Summary:

### Frontend — public `NEXT_PUBLIC_*` (`.env.local` / `apphosting.yaml` / Vercel)

Inlined into the browser bundle at **build** time; public by design. Never put a secret here.

| Group      | Variables                                                                                                         | Dev | Prod |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | --- | ---- |
| Firebase   | `NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,MESSAGING_SENDER_ID,APP_ID}`                 | ✅  | ✅   |
| Firebase   | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (Analytics)                                                                 | ❌  | ❌   |
| App Check  | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`                                                                                  | ❌  | ✅   |
| App Check  | `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` (emulator mode only; never in `apphosting.yaml`)                               | ❌  | ❌   |
| Emulators  | `NEXT_PUBLIC_USE_EMULATORS` (`false` in production)                                                               | ❌  | ✅   |
| Paddle     | `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`                                               | ✅  | ✅   |
| Paddle     | `NEXT_PUBLIC_PADDLE_PRICE_ID_{STARTER,BUSINESS,PRO,AGENCY}_{MONTHLY,YEARLY}`, `..._PACK_{500,1200,3000}` (11 IDs) | ✅  | ✅   |
| Monitoring | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_VERCEL_ENV`                                  | ❌  | ❌   |

### Frontend — server/build only (not `NEXT_PUBLIC_`)

| Variable                       | Purpose                                        | Secret |
| ------------------------------ | ---------------------------------------------- | ------ |
| `SENTRY_DSN`                   | Server/edge error reporting                    | ❌     |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Source-map upload (build)                      | ❌     |
| `SENTRY_AUTH_TOKEN`            | Source-map upload (build)                      | ✅     |
| `E2E_BASE_URL`                 | Playwright base URL (default `localhost:3000`) | ❌     |

### Cloud Functions

**NEVER put these in the frontend `.env.local` or any client-accessible location.** Secrets:
`firebase functions:secrets:set NAME`. Non-secret params: gitignored `functions/.env.<project-id>`
(emulator: `functions/.env.local`).

| Variable                                                                | Kind   | Used by                                                             |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                                        | secret | campaign, calendar, regenerate, reel and style functions            |
| `GEMINI_IMAGE_MODEL`, `*_MODEL_PRIMARY` / `*_MODEL_FALLBACK`            | param  | model routing (optional)                                            |
| `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`                               | secret | `createPaddleCheckout`, `cancelPaddleSubscription`, `paddleWebhook` |
| `PADDLE_ENVIRONMENT`, `PADDLE_PRICE_ID_*` (11)                          | param  | Paddle services (no default; must match the API key)                |
| `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY`                          | secret | Meta OAuth / token storage                                          |
| `META_APP_ID`, `META_REDIRECT_URI`, `META_GRAPH_API_VERSION`, `APP_URL` | param  | Meta OAuth                                                          |
| `REEL_RENDERER_URL`                                                     | param  | reel generation (mock renderer when unset)                          |
| `REEL_RENDERER_API_KEY`                                                 | secret | Functions and `services/reel-renderer` (shared)                     |

Platform-provided (do not set): `FIREBASE_PROJECT_ID` / `GCLOUD_PROJECT`, `FUNCTIONS_EMULATOR`,
`K_REVISION`.

### Obsolete / unused

- Legacy providers whose functions are **not exported** (rollback only): PayU (`PAYU_*`) and Razorpay
  (`RAZORPAY_*`).
- Declared in `functions/src/config/env.ts` but read by no code: `NVIDIA_API_KEY`, `VEO_API_KEY`,
  `ELEVENLABS_API_KEY`, `PHOTOROOM_API_KEY`, `ADMIN_EMAILS`, `FIREBASE_REGION`.
- Previously documented, read by no code (remove from any `.env.local`): `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, the four `NEXT_PUBLIC_ENABLE_*` feature flags
  (Phase 1 placeholders), `FIREBASE_ADMIN_*`, `OPENAI_API_KEY`.

---

## Project Structure

```
ai-marketing-engine/
│
├── .github/                    # GitHub Actions workflows
├── docs/                       # Per-phase implementation + verification reports
│   ├── PHASE_4_CAMPAIGN_CREATION_REPORT.md ... PHASE_35_FRONTEND_TEST_HARDENING_REPORT.md
│   ├── PHASE_36_FINAL_MITRA_READINESS_REPORT.md   # current, evidence-based status
│   ├── PERFORMANCE_ENGINE.md / PERFORMANCE_DATA_READINESS.md
│   # Note: the Phase-0-era planning docs this tree once listed (PRODUCT.md,
│   # ARCHITECTURE.md, DATABASE.md, AI_ARCHITECTURE.md, DESIGN_SYSTEM.md,
│   # SECURITY.md, MVP_SCOPE.md, TEST_PLAN.md, PROMPT_SYSTEM.md) were never
│   # actually created — the per-phase reports above are this project's real
│   # source-of-truth documentation instead.
│
├── functions/                  # Firebase Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── index.ts           # Functions entry point
│   │   ├── config/            # Configuration (env, pricing, AI providers)
│   │   ├── middleware/        # Auth, validation, rate limiting
│   │   ├── services/          # Business logic (Firestore, AI, Billing, WhatsApp)
│   │   ├── functions/         # Callable functions by domain
│   │   └── utils/             # Errors, logging, crypto
│   ├── package.json
│   └── tsconfig.json
│
├── public/                     # Static assets
│
├── src/                        # Next.js Frontend
│   ├── app/                   # App Router pages
│   │   ├── (auth)/           # Auth layout group
│   │   ├── (dashboard)/      # Protected dashboard layout
│   │   ├── api/              # API routes (thin proxies)
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles + design tokens
│   ├── components/           # React components
│   │   ├── ui/               # Design system primitives
│   │   ├── forms/            # Form components
│   │   ├── campaign/         # Campaign-specific components
│   │   └── layout/           # Sidebar, Header, Navigation
│   ├── lib/                  # Utilities & configurations
│   │   ├── firebase/         # Firebase client config
│   │   ├── api/              # Cloud Function callers
│   │   ├── ai/               # AI types, schemas, prompt builders
│   │   ├── validation/       # Zod schemas
│   │   ├── utils/            # Helpers (date, currency, file)
│   │   └── constants/        # Enums, options
│   ├── hooks/                # Custom React hooks
│   ├── types/                # Shared TypeScript types
│   └── styles/               # Additional styles
│
├── tests/                      # Test files
│   ├── setup.ts              # Jest setup
│   └── *.test.ts             # Test files
│
├── .env.example              # Environment template
├── .gitignore
├── .nvmrc                    # Node.js version
├── .prettierrc               # Prettier config
├── .prettierignore
├── eslint.config.mjs         # ESLint config (flat)
├── firebase.json             # Firebase config
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore composite indexes
├── storage.rules             # Storage security rules
├── jest.config.js            # Jest configuration
├── next.config.ts            # Next.js configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## Firebase Emulator Suite

For local development, use the Firebase Emulator Suite:

```bash
# Start all emulators
npm run dev:emulators

# Or start specific emulators
firebase emulators:start --only auth,firestore,storage,functions
```

Emulator UI: `http://localhost:4000`

| Emulator    | Port |
| ----------- | ---- |
| Auth        | 9099 |
| Firestore   | 8080 |
| Storage     | 9199 |
| Functions   | 5001 |
| Emulator UI | 4000 |

When using emulators, set `NEXT_PUBLIC_USE_EMULATORS=true` in `.env.local`.

---

## Secret Management

### Local Development

- Create `.env.local` from `.env.example`
- **Never commit `.env.local`** (gitignored)
- Use Firebase Emulators for local development (no real secrets needed)

### Staging / Production

- **Frontend (Vercel)**: Set public variables in Vercel Project Settings → Environment Variables
- **Backend (Firebase Functions)**: Use `firebase functions:secrets:set` for all secrets

```bash
# Example: Set Gemini API key
firebase functions:secrets:set GEMINI_API_KEY

# Deploy functions with secrets
firebase deploy --only functions
```

### Secret Classification

| Variable                  | Location           | Secret? |
| ------------------------- | ------------------ | ------- |
| `GEMINI_API_KEY`          | Functions Secrets  | ✅      |
| `OPENAI_API_KEY`          | Functions Secrets  | ✅      |
| `NVIDIA_API_KEY`          | Functions Secrets  | ✅      |
| `RAZORPAY_KEY_SECRET`     | Functions Secrets  | ✅      |
| `RAZORPAY_WEBHOOK_SECRET` | Functions Secrets  | ✅      |
| `RAZORPAY_KEY_ID`         | Vercel (public)    | ❌      |
| `APP_URL`                 | Vercel + Functions | ❌      |
| `NEXT_PUBLIC_*`           | Vercel (public)    | ❌      |

---

## Quality Checks

Run all quality checks before committing:

```bash
# Run all checks
npm run lint && npm run typecheck && npm run test && npm run build

# Frontend only
npm run lint && npm run typecheck && npm run test && npm run build

# Functions only
npm run functions:lint && npm run functions:typecheck && npm run functions:test && npm run functions:build
```

---

## Git Workflow

### Branch Strategy

- `master` → current default branch (this repo does not have a `main` branch as of this writing)
- `feature/*` → Feature branches

### Deployment (current, as of Phase 19C/20C)

The frontend deploys to **Firebase App Hosting** (backend id `mitra-web`), not Vercel — a Vercel
project and `vercel.json`/`.vercelignore` exist as leftovers from an earlier, superseded attempt
(see `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` §11, "NOT USED in the target
architecture"). Current architecture:

```
GitHub (Rakesh9k/ai-marketing-engine, master)
  → Firebase App Hosting (mitra-web, asia-southeast1, Cloud Build + Cloud Run + CDN)
    → Next.js
      → Firebase Auth / App Check (reCAPTCHA Enterprise) — client-side
      → Cloud Functions (asia-south1) — server-authoritative logic
        → Firestore / Storage / AI providers / Razorpay
```

See `docs/PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md` for the full architecture audit and
`docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` / `docs/PHASE_20C_REAL_FIREBASE_APPCHECK_ENVIRONMENT_REPORT.md`
for the latest verified deployment state, including which production gates were passing/blocked as
of that report. Do not assume GitHub-linked continuous deployment is active — the most recent
verified report describes a **local-source rollout**, with GitHub App Hosting integration recorded
as a pending one-time console step.

### Commit Convention

Follow conventional commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`

### Initial Commit

```bash
git add .
git commit -m "chore: initialize project foundation"
```

---

## Development Principles

1. **Minimum Viable Infrastructure** — No unnecessary dependencies
2. **TypeScript Everywhere** — Strict mode, no `any` without justification
3. **No Secrets in Git** — All secrets in Firebase Functions Secrets / Vercel
4. **Environment Separation** — Development, Staging, Production configs
5. **Local-First Development** — Firebase Emulators for local dev
6. **Reproducibility** — Another developer can clone and run immediately

---

## Phase Boundary (historical — Phase 1 only)

**NO PRODUCT FEATURES WERE IMPLEMENTED IN PHASE 1.** This list described what was out of scope at
that point. It is entirely historical now — every item below was implemented in a later phase.
See `docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md` for the current, evidence-based status of each.

- ✅ Authentication UI — implemented (Phase 2/3-era)
- ✅ Business onboarding — implemented, all 3 verticals (Phases 4, 29–31)
- ✅ Business Brain — implemented, plus a customer-facing edit UI (Phases 4–6, 33)
- ✅ Brand Kit — implemented (`/brand`)
- ✅ Campaign Wizard — implemented, vertical-aware (Phase 4, hardened Phase 35)
- ✅ AI campaign generation — implemented (Phase 5)
- ✅ Image generation — implemented (Phase 7)
- ✅ Telugu/Hyderabadi generation — implemented (localization pipeline)
- ✅ WhatsApp campaign generation — implemented (CTA + Phase 34 click tracking)
- ✅ Razorpay integration — implemented (Phase 19A)
- ✅ Subscription system — implemented
- ✅ Credit system — implemented, with concurrency/idempotency tests (Phase 10+)
- ✅ Dashboard — implemented
- ✅ Campaign history — implemented (campaign list/detail)
- ✅ Analytics — implemented (Phase 32), performance pipeline (Phase 34)
- ⚠️ Content calendar — **not implemented** (never built in any phase)
- ⚠️ Agency functionality — **partial**: agency-member authorization/isolation exists and is
  tested (`verifyBusinessAccess`, `tests/phase27-authz.test.ts`), but there is no dedicated agency
  workspace UI

---

## Verification Checklist

After setup, verify:

- [ ] `node --version` → `v20.x.x`
- [ ] `npm --version` → `10.x.x` or `11.x.x`
- [ ] `git --version` → `2.x.x`
- [ ] `firebase --version` → `13.x.x`
- [ ] `npm install` → succeeds
- [ ] `npm run lint` → passes
- [ ] `npm run typecheck` → passes
- [ ] `npm run test` → passes
- [ ] `npm run build` → succeeds
- [ ] `npm run dev:emulators` → starts emulators
- [ ] `npm run dev` → starts Next.js on `localhost:3000`
- [ ] `npm run functions:build` → compiles TypeScript
- [ ] `.env.local` created from `.env.example`
- [ ] No secrets in Git (`git status` shows no `.env` files)

---

## Problems & Resolutions

| Problem                         | Resolution                           |
| ------------------------------- | ------------------------------------ |
| Firebase init is interactive    | Created config files manually        |
| PowerShell doesn't support `&&` | Used semicolons or separate commands |
| Next.js 15 with Tailwind v4     | Updated globals.css for v4 syntax    |

---

## Remaining Issues (as of Phase 36)

Historical Phase 1 setup items (Firebase project creation, GitHub Actions CI/CD) are done — a
`.github/workflows/ci-cd.yml` exists and a real Firebase project is configured. What's actually
still open, per `docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md`:

- [ ] Domain configuration / production deployment (this repo has not been deployed to a live
      production environment — see the Phase 36 report's verdict)
- [ ] Sentry (or equivalent) error tracking setup
- [ ] Content calendar (never built — not a regression, never in scope for any phase so far)
- [ ] Dedicated agency workspace UI (agency-member authorization exists and is tested; no UI)
- [ ] Real inquiry/outcome data source for the Performance Engine (`docs/PERFORMANCE_ENGINE.md`
      and `docs/PERFORMANCE_DATA_READINESS.md` — status remains "DATA NOT YET SUFFICIENT" for any
      learning/optimization use)
- [ ] `npm run functions:lint` still fails on pre-existing unused-import lint debt across ~30
      backend files predating Phase 28 (not a regression from any phase in this project's history;
      see the Phase 36 report for the full file list)

---

## Next Steps

Per the user's own stated roadmap (see `docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md`'s closing
section for the full two-track breakdown): the next step is **customer validation** — deploying
the restaurant MVP to real restaurants and gathering actual usage/payment/feedback data — not
further feature phases. Product-expansion work (salon, real estate, analytics, Business Brain UI,
performance pipeline, frontend tests) is complete through Phase 35; the Performance Engine
specifically still needs a real behavioral-outcome data source (not a schema) before it can learn
from anything, per `docs/PERFORMANCE_ENGINE.md`.

---

## License

Proprietary — AI Marketing Engine
