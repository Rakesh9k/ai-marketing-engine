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
| **Deployment**   | Vercel (Frontend), Firebase (Backend)                           |
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

### Client-Side (Public) — `.env.local`

| Variable                                   | Description                             | Required |
| ------------------------------------------ | --------------------------------------- | -------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase Web API Key                    | ✅       |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase Auth Domain                    | ✅       |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase Project ID                     | ✅       |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase Storage Bucket                 | ✅       |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID            | ✅       |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase App ID                         | ✅       |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | Firebase Analytics Measurement ID       | ❌       |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`              | Razorpay Public Key                     | ✅       |
| `NEXT_PUBLIC_APP_URL`                      | Application URL                         | ✅       |
| `NEXT_PUBLIC_APP_NAME`                     | Application Name                        | ✅       |
| `NEXT_PUBLIC_USE_EMULATORS`                | Use Firebase Emulators (`true`/`false`) | ❌       |

### Server-Side (Secrets) — Firebase Functions Secrets

**NEVER put these in `.env.local` or any client-accessible location.**

Set via: `firebase functions:secrets:set SECRET_NAME`

| Secret                        | Description                  |
| ----------------------------- | ---------------------------- |
| `FIREBASE_ADMIN_PROJECT_ID`   | Firebase Admin Project ID    |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service Account Client Email |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | Service Account Private Key  |
| `GEMINI_API_KEY`              | Google Gemini API Key        |
| `OPENAI_API_KEY`              | OpenAI API Key               |
| `NVIDIA_API_KEY`              | NVIDIA API Key               |
| `RAZORPAY_KEY_SECRET`         | Razorpay Secret Key          |
| `RAZORPAY_WEBHOOK_SECRET`     | Razorpay Webhook Secret      |

### Feature Flags

**As of Phase 36, none of the flags below are read anywhere in `src/` or `functions/src/`**
(confirmed by repo-wide search) — they were Phase 1 planning placeholders. Salon and real estate
verticals are fully implemented and always-on (Phases 29–31), not flag-gated. WhatsApp Business
API integration and a dedicated agency workspace UI remain genuinely not implemented (see
`docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md`), but not because a flag disables them — the code
simply doesn't exist yet. Kept here only as a historical record; setting these has no effect.

| Variable                                  | Default | Description (Phase 1 plan — not wired to any code)    |
| ------------------------------------------ | ------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_ENABLE_SALON_VERTICAL`       | `false` | Superseded — salon is implemented and always-on          |
| `NEXT_PUBLIC_ENABLE_REAL_ESTATE_VERTICAL` | `false` | Superseded — real estate is implemented and always-on    |
| `NEXT_PUBLIC_ENABLE_WHATSAPP_API`         | `false` | Still accurate — not implemented                         |
| `NEXT_PUBLIC_ENABLE_AGENCY_WORKSPACE`     | `false` | Still accurate — no dedicated agency UI exists            |

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

- `main` → Production (auto-deploy via Vercel/Firebase)
- `staging` → Staging environment
- `feature/*` → Feature branches

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
