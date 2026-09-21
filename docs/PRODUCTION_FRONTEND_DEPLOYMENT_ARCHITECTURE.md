# Production Frontend Deployment Architecture

Status: AUDIT ONLY. Nothing in this document has been implemented. No code, config, DNS, rules, Functions, Auth or App Check was changed while producing it. The only commands run were read-only, plus `npm run build` (output goes to the gitignored `.next/`) and `firebase deploy --only storage --dry-run` (validates, deploys nothing).

Evidence labels: **VERIFIED** = observed this session (command output / file read). **INFERRED** = follows from verified facts but was not executed. **UNVERIFIED** = needs a human or a dashboard.

---

## 1. Current Deployment State

| Component | State | Evidence |
|---|---|---|
| Cloud Functions (asia-south1) | 37 live, all "unchanged" on latest deploy | VERIFIED `firebase deploy --only functions,firestore` |
| Auth triggers (us-central1) | `onUserCreatedHandler`, `onUserDeletedHandler` live | VERIFIED |
| Firestore rules + indexes | Deployed | VERIFIED |
| Storage rules | Compile OK, **deployed status UNVERIFIED** (see §16) | VERIFIED dry-run |
| Firebase Hosting | **Not configured** — `firebase.json` has no `hosting` key | VERIFIED |
| Next.js frontend | **Not deployed anywhere verifiable** | Docs Phase 19/19A; Vercel link UNVERIFIED |
| Custom domain `brain-wise.com` | Listed under Firebase Hosting default site as "Custom" (user-supplied) | Console screenshot text from user |
| Firebase project | `brainwise-ai-marketing-engine` (691254604957), single Web app `1:691254604957:web:caf76181c86efb6a7b5074` | VERIFIED `firebase use`, `apps:list` |

## 2. Current Next.js Architecture

- Next.js **15.5.25**, React **18.3.1**, Firebase JS SDK **10.14.1**, Tailwind 4. `engines.node: 20.x` (local machine runs Node 24.15 — build still passes).
- **App Router only.** `src/app/`; no `pages/`, no `src/pages/`.
- `next.config.ts` (complete, exact): `reactStrictMode: true`; `experimental.optimizePackageImports: ['firebase']`; `images.remotePatterns` for `firebasestorage.googleapis.com` and `lh3.googleusercontent.com`; `headers()` adding `X-DNS-Prefetch-Control`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy` on `/:path*`. **No `output`** (neither `export` nor `standalone`), no `redirects`, no `rewrites`, no `basePath`.
- `npm run build` → standard server build. VERIFIED output: 22 pages; 19 routes `○ (Static)`, **1 route `ƒ (Dynamic)`: `/campaigns/[campaignId]`**. Build produced `.next/required-server-files.json`, `next-server.js.nft.json`, `server/` — i.e. a normal Next server build, not `standalone`, not `out/`.
- `vercel.json`: `{"framework":"nextjs","buildCommand":"npm run build","installCommand":"npm install","projectName":"brainwise-ai-marketing-engine"}`.
- No `apphosting.yaml`. No `middleware.ts`/`proxy.ts`.

Route map (all under `src/app/`):

| Route | Render (build) | Runtime data | Auth | Notes |
|---|---|---|---|---|
| `/` | Static | none | public | landing |
| `/login`, `/signup`, `/forgot-password` | Static | Firebase Auth (browser) | public | client components |
| `/onboarding` | Static | Functions/Firestore (browser) | client guard | |
| `/dashboard`, `/analytics`, `/billing`, `/brand`, `/business-profile`, `/campaigns`, `/campaigns/new`, `/products`, `/products/new`, `/reels`, `/reels/new`, `/usage` | Static shell | Firestore + callables from browser | `ProtectedRoute` (client) | |
| `/campaigns/[campaignId]` | **ƒ Dynamic** | campaign ID from URL, read in browser via `useParams()` | client guard | only dynamic route; no `generateStaticParams` |

"Static shell" = HTML prerendered with the loading/unauthenticated state; all data arrives client-side after Firebase Auth resolves.

## 3. Frontend Runtime Requirements

Verified by grep over `src/` (tests excluded):

- **No** route handlers (`route.ts`), **no** middleware/proxy, **no** server actions (`"use server"`), **no** `cookies()`/`headers()`/`draftMode()`, **no** `next/server`, **no** `firebase-admin`, **no** `server-only`, **no** `force-dynamic`/`revalidate`/`generateStaticParams`/`generateMetadata`.
- 26 of 27 page/layout files carry `'use client'`. Only `src/app/layout.tsx` is a server component: it uses `next/font/google` (Geist, fetched at build), static `metadata`/`viewport`, an inline theme script, and two providers.
- `process.env` is read **only** as `NEXT_PUBLIC_*` (`src/lib/firebase/client.ts`, `src/app/billing/page.tsx`). No server-only env var exists in the Next app.
- Firebase client init is guarded by `typeof window === 'undefined'` → returns undefined instances on the server; everything real happens in the browser.
- Runtime needs that a host must supply for the **current** code: (a) a Next server runtime for the one `ƒ` route, (b) the Next image optimizer for `<Image>` in `CampaignDetailContent.tsx` with Firebase Storage URLs and `remotePatterns`, (c) application of `next.config` `headers()`.

## 4. Firebase Backend Architecture

```
Browser (Next.js client code)
  ├─ Firebase Auth (email/password)                       ← client SDK
  ├─ Firebase App Check (reCAPTCHA Enterprise)            ← client SDK, token auto-attached to callables
  ├─ Cloud Functions callables, asia-south1               ← httpsCallable; all enforceAppCheck: true
  │      └─ Firestore / Storage / AI providers / Razorpay (server-side secrets)
  ├─ Firestore reads (rules-gated)                        ← client SDK (services/database)
  └─ Storage uploads via signed URLs minted by getUploadUrl / getReelClipUploadUrl (server-side)
```

- Frontend uses Auth, Firestore, Functions directly. Storage: client requests a signed URL from a function then PUTs to it (`getUploadUrl.ts` uses `getSignedUrl`; no `uploadBytes`/`getDownloadURL` in `src/`).
- Server-side Next code touching Firebase: **none.**
- Every callable uses `{ region: 'asia-south1', enforceAppCheck: true }` (VERIFIED grep, 28+ registrations, none `false`).
- Custom claim `businessIds` is set by `onUserCreated`/`createBusiness`; Storage rules depend on it.

## 5. Authentication

- 100% client-side Firebase Auth: `useAuth` → `subscribeToAuthState` (`onAuthStateChanged`), `loginWithEmailPassword`, `signupWithEmailPassword`, `sendPasswordReset`, `logout`.
- Route protection is a client component (`ProtectedRoute`) used in layouts. No cookies, no session cookie, no middleware, no Admin SDK in Next.
- Persistence is the Firebase SDK's IndexedDB/local persistence, per-origin.
- Consequence: authentication does **not** require a server runtime. Authorization is enforced server-side (Functions + Firestore/Storage rules).
- Host-dependent requirement: `brain-wise.com` (and `www.brain-wise.com` if used) must be in **Firebase Auth → Settings → Authorized domains**. UNVERIFIED (console-only).

## 6. App Check

- `src/lib/firebase/client.ts`: `initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(NEXT_PUBLIC_RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true })`, run before `getFunctions()`.
- Debug token path is gated on `NEXT_PUBLIC_USE_EMULATORS === 'true'` only. With that flag unset (production), no debug token is set.
- If the site key is missing in production the code logs a loud `console.error` and skips initialization (every callable then fails UNAUTHENTICATED) — fail-closed, not a bypass.
- Host requirement: the reCAPTCHA Enterprise key's **allowed domains** must include `brain-wise.com` (+ `www`, + any Vercel preview domain you want working). Hosting platform is otherwise irrelevant; App Check validates the browser origin against the key, not the hosting provider. UNVERIFIED (console-only).
- Emulator note (Phase 20B/20C): no App Check emulator exists; local runs use a real registered debug token.

## 7. Environment Variables

All variables the Next app reads are `NEXT_PUBLIC_*`, therefore **PUBLIC and BUILD-TIME** (inlined into the JS bundle at `next build`). There is **no SERVER-ONLY / RUNTIME variable in the Next app.** (Values not printed; presence only.)

| Variable | Class | When needed | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`, `_MEASUREMENT_ID` | PUBLIC | build | Web config; not secrets |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | PUBLIC | build | Must be the Enterprise key registered for the prod domain. **Absent from CI's build env** (CI only builds; harmless there) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | PUBLIC | build | Publishable key id only. Must be `rzp_live_…` for prod |
| `NEXT_PUBLIC_APP_URL` | PUBLIC | build | `.env.local` = `http://localhost:3000`; set to `https://brain-wise.com` in prod |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENABLE_*` flags | PUBLIC | build | in `.env.example` |
| `NEXT_PUBLIC_USE_EMULATORS` | PUBLIC | build | **MUST be unset/`false` in production.** `.env.local` sets it `true` |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | PUBLIC (but sensitive-ish) | dev only | Must NOT be set in production |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, Admin creds | SERVER-ONLY | Functions runtime | Live in Firebase Functions secrets; **never** needed by the frontend host |

Hazard (VERIFIED): `.env.local` contains `NEXT_PUBLIC_USE_EMULATORS=true`. Any *local* `next build` / `vercel build` inlines emulator wiring (`localhost:9099` etc.) into the bundle. Production builds must come from the host's Git build with dashboard env vars only, never from this working directory.

## 8. AI Architecture

- No AI SDKs in `package.json` (`firebase`, `next`, `react`, `zod`, `date-fns`, `uuid` only). No provider keys read by the Next app. `src/features/ai/ImageAI.ts` is a provider-neutral TypeScript interface, not a client.
- Flow is `Browser → callable Function → AI provider` (keys in Functions secrets). Matches the expected architecture. No architectural concern.

## 9. Razorpay Architecture

- Frontend: `src/lib/razorpay/loadCheckout.ts` injects `https://checkout.razorpay.com/v1/checkout.js` on demand from `/billing`; uses the public key id.
- Backend: `createSubscription`, `verifyPayment`, `razorpayWebhook` (HTTPS function) hold the secrets and are the payment authority.
- The frontend host needs **no** server-side Razorpay runtime. Two things depend on the host but not on its type: (a) any CSP added later must allow `checkout.razorpay.com`; (b) the Razorpay dashboard webhook targets the Cloud Function URL, not the frontend domain.

## 10. Static Export Compatibility

Verdict: **NOT COMPATIBLE as the code stands** (would need code changes; do not do them merely for hosting convenience).

| Feature | Static compatible? | Evidence |
|---|---|---|
| Public pages (`/`, legal) | Yes | Prerendered `○` |
| Login / Signup / Forgot | Yes | Client Firebase Auth only |
| Dashboard / Onboarding / Business Brain / Brand | Yes | `'use client'`, browser data |
| Asset upload | Yes | Signed URL from callable, browser PUT |
| Campaign creation (`/campaigns/new`) | Yes | client + callables |
| Campaign review (`/campaigns/[campaignId]`) | **No** | `ƒ Dynamic`; ID unknown at build; no `generateStaticParams`. `output:'export'` requires every dynamic segment be enumerated at build → build error (**INFERRED**, not executed) |
| Billing | Yes | client Razorpay + callables |
| Dynamic routes | **No** (1 route) | as above |
| Authenticated pages | Yes | client-side guard |
| Firebase client / App Check | Yes | browser-only |
| Server actions / API routes / middleware | N/A — none exist | grep |
| Image optimization | **No** | `next/image` with remote Storage URLs needs the optimizer; export needs `images.unoptimized: true` (behavior change) |
| `next.config` `headers()` | **No** | Not applied by static export/Firebase Hosting; would need re-expression in `firebase.json` |
| Server env vars | Yes | none exist |

To make static export work you would need to (1) move campaign detail to a non-dynamic route (e.g. `/campaigns/view?id=…`) or add a hosting rewrite of `/campaigns/**` to a single shell page, (2) set `images.unoptimized`, (3) port headers, (4) set `output: 'export'`, output dir `out/`. Every one is an application change. Not recommended.

## 11. Vercel Compatibility

**COMPATIBLE — zero code changes.** Evidence: standard server build; `ƒ` route handled natively; `next/image` optimizer and `headers()` honored natively; `vercel.json` already present and correct (`framework: nextjs`); no server-only env vars; no middleware/Edge constraints; custom domains and HTTPS automatic. Requirements: a Vercel project connected to the Git repo (UNVERIFIED that one exists), the public env vars from §7, Node 20.x.

## 12. Firebase App Hosting Compatibility

**COMPATIBLE — needs new deployment files, no app code changes.** It runs the same standard Next server build (Cloud Build → Cloud Run). Requires: `apphosting.yaml` (env/secret config), a backend created via `firebase apphosting:backends:create` linked to a GitHub repo, Blaze plan (already required by Functions), IAM for the App Hosting service account, and env vars in `apphosting.yaml` (public vars are non-secret). Region availability for the backend (asia-south1 or otherwise) should be checked at creation. It adds value only if you want frontend and backend billed/managed in one Google project. The code gives no reason to prefer it: nothing in the app needs it.

## 13. Firebase Static Hosting Compatibility

**NOT COMPATIBLE** with the current app (see §10). Pointing Hosting at `.next/static` (a previous attempt) is invalid: that directory contains only hashed JS/CSS chunks — no HTML, no server. Evidence of the earlier failed attempts remains in `.firebase/` caches: `hosting.…next\server.cache`, `…next\standalone.cache`, `…next\static.cache`. The legacy "web frameworks" Hosting integration would work only by deploying a hidden Cloud Function; superseded by App Hosting; not recommended.

## 14. Domain Architecture

Recommended (after platform verified): `brain-wise.com` → frontend platform (canonical); `www.brain-wise.com` → 301 to apex. **Caveat:** the domain is currently attached to the Firebase Hosting default site. If the frontend goes to Vercel, remove the custom domain from Firebase Hosting first, then add it in Vercel and update DNS (A `76.76.21.21` / CNAME per Vercel's dashboard values at the time). Do not touch DNS until the platform decision is confirmed.

## 15. Security Considerations

- **PASS** No secrets in the frontend: grep of `src/` for `process.env` shows only `NEXT_PUBLIC_*`; no AI SDKs; no Admin SDK; Razorpay secret only in Functions.
- **PASS** App Check enforced on all callables; client debug-token path is gated on the emulator flag.
- **PASS** Authorization is server-side (Functions + Firestore/Storage rules).
- **RISK (medium)** `.env.local` has `NEXT_PUBLIC_USE_EMULATORS=true` + a debug token. Only matters for local builds; mitigate by never deploying from local.
- **RISK (low)** `X-Frame-Options: DENY` etc. are set only via `next.config` `headers()`; fine on Vercel/App Hosting.
- **RISK (low)** No CSP is set (pre-existing; not a deployment blocker).
- **DRIFT (low)** `src/app/layout.tsx` metadata: `openGraph.url = https://app.aimarketingengine.in` (not `brain-wise.com`), no `metadataBase` (build warns; OG image resolves to `localhost:3000`), placeholder `verification.google`, `/og-image.png` referenced but not present in `public/` (public has only `brand/` and default SVGs). Cosmetic/SEO, not blocking.
- Firebase config has a single project used as both `default` and `dev` — no staging/prod separation.

## 16. Storage Rules Status

- `storage.rules` (staged, +10 lines vs HEAD = the `shared/reel-music` block): owner/agency-scoped reads and writes under `businesses/{id}/**` (via `businessIds` claim), owner-only `temp/{uid}/**`, authenticated read-only `shared/reel-music/**`, everything else denied by default.
- Client uploads go through server-minted signed URLs, so the rules mainly govern client **reads**.
- Minor: agency-member write branch reads `resource.metadata` which is null on create → agency creates rely on signed URLs, not the rule. Not a blocker.
- VERIFIED: `firebase deploy --only storage --dry-run` → "rules file storage.rules compiled successfully".
- **Deployed status: UNKNOWN.** The earlier deploy targeted `functions,firestore` only, and nothing in this session shows a Storage release. Production-ready: **yes (restrictive, compiles)**. Recommended command (not run): `firebase deploy --only storage`.

## 17. Deployment Drift

| Item | Repo | Live | Drift |
|---|---|---|---|
| Hosting | none in `firebase.json`; `.firebaserc` has vestigial `targets.hosting` → site `ai-marketing-engine` | Default site + `brain-wise.com` attached | Yes — domain attached to a site that serves nothing from this repo |
| Functions | 37 + 2 | 37 + 2 | None |
| Firestore rules/indexes | current | released | None |
| Storage rules | current (staged) | unknown | Unknown |
| App Check | client + all callables enforcing | console state unverified | Unknown |
| Project aliases | `default` and `dev` → same project | — | No prod/staging split |
| CI | `.github/workflows/ci-cd.yml` triggers on `main`/`develop`, uses `./ai-marketing-engine` working dir; git branch is `master`, repo root is the app dir | — | Likely never runs (INFERRED); unrelated to frontend hosting |
| Docs | `PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`, `SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md` **do not exist** in `docs/` | — | Read `ARCHITECTURE_AI_CONTEXT.md`, `ARCHITECTURE_DISCOVERY_REPORT.md` and Phase 19/19A/20/20A/20B/20C reports instead |

## 18. Recommended Production Architecture

**A. Vercel** for the Next.js frontend; Firebase remains backend (Auth, App Check, Functions, Firestore, Storage).

Because, specifically: (1) `next build` yields a standard server build with a `ƒ` route (`/campaigns/[campaignId]`) that needs a Next runtime; (2) `next/image` with `remotePatterns` for Firebase Storage needs the image optimizer; (3) `headers()` in `next.config.ts` carries security headers that only a Next-aware host applies; (4) `vercel.json` already exists and Phases 19/19A documented Vercel as the intended host; (5) there are no server-only secrets or Firebase Admin usage in the Next app, so the frontend host does not need to sit inside Google Cloud IAM.

Honest note: Firebase App Hosting is *also* technically compatible with this exact code. The code does not force Vercel over App Hosting; the tie-breakers are documented intent, existing `vercel.json`, and App Hosting needing new config/IAM/Cloud Build setup for no functional gain. If you prefer single-vendor Google, App Hosting is a valid switch with no app changes.

## 19. Required Changes Before Deployment

Blocking (none require app-logic changes):
1. A Vercel project connected to the Git repo (**human action**).
2. Vercel env vars per §7 (prod values; `USE_EMULATORS` unset).
3. `brain-wise.com` (+`www`) added to Firebase Auth authorized domains.
4. `brain-wise.com` (+`www`) added to the reCAPTCHA Enterprise key's allowed domains; App Check "enforce" already on for Functions.
5. Detach `brain-wise.com` from Firebase Hosting; add to Vercel; update DNS.
6. Deploy Storage rules (`firebase deploy --only storage`).

Non-blocking cleanup: fix `openGraph.url`/`metadataBase`, add `og-image.png`, remove vestigial `.firebaserc` `targets.hosting`, fix CI branch/paths, consider separate staging Firebase project, Razorpay live keys.

## 20. Exact Deployment Sequence

See the phased plan in `PRODUCTION_DEPLOYMENT_ARCHITECTURE_AUDIT.md` (Deployment Sequence, Smoke Test, Rollback). Do not execute until approved.

### Diagram

```mermaid
flowchart TD
    U[User browser] --> D[brain-wise.com]
    D --> V[Next.js 15 on Vercel<br/>static shells + 1 dynamic route + image optimizer]
    V -. serves JS bundle .-> U
    U --> AUTH[Firebase Auth]
    U --> AC[Firebase App Check<br/>reCAPTCHA Enterprise]
    U --> FS[Firestore reads<br/>rules-gated]
    U --> FN[Cloud Functions asia-south1<br/>enforceAppCheck + auth]
    AUTH -. ID token .-> FN
    AC -. App Check token .-> FN
    FN --> FS
    FN --> ST[Cloud Storage<br/>signed URLs]
    U -- PUT via signed URL --> ST
    FN --> AI[AI providers<br/>Gemini / OpenAI / NVIDIA]
    FN --> RZ[Razorpay API]
    RZW[Razorpay webhook] --> FN
    U -. checkout.js .-> RZC[Razorpay Checkout]
```
