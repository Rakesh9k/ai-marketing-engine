# Production Frontend Deployment Report

Date: 2026-09-21. Architecture (from `PRODUCTION_DEPLOYMENT_ARCHITECTURE_AUDIT.md`): Next.js → Vercel → `brain-wise.com`; Firebase = backend.

Verdict vocabulary: PASS / PARTIAL / BLOCKED / FAIL / NOT VERIFIED. Issue class in brackets: CODE, CONFIG, ENV (environment), ACCESS, NV (not verified).

**The frontend has NOT been deployed. No Vercel project connection was verified. `brain-wise.com` is NOT serving Mitra.** This session had no Vercel access (no CLI, no `.vercel/`, `gh` on this machine is a broken npm package) and no Firebase/Vercel/DNS console access.

## 1. Deployment Architecture
Unchanged and respected: no static export, no Firebase Hosting/App Hosting, no `output` mode, no secrets moved to the frontend, App Check/rules untouched. `next.config.ts`, `vercel.json` (framework `nextjs`, build `npm run build`, install `npm install`) verified correct and unmodified.

## 2. Firebase Backend State — PASS
- Active project VERIFIED: `brainwise-ai-marketing-engine` (`.firebaserc` default and `dev` alias both → it; web app `1:691254604957:web:caf76181c86efb6a7b5074`).
- **Finding:** `createBusiness` had disappeared from the deployed function list (present earlier this session, absent on re-list; source exports it; cause unknown — possibly removed while clearing the earlier orphaned Cloud Run service). Redeployed only it: `firebase deploy --only functions:createBusiness` → "Successful create operation". [CONFIG]
- Now VERIFIED live: **36 Functions in asia-south1 + 2 v1 Auth triggers in us-central1 = 38** (the "37" quoted earlier was one short; `createBusiness` was the 37th/38th). Firestore rules/indexes deployed earlier this session; not re-deployed.

## 3. Storage Deployment — PASS
`storage.rules` reviewed: restrictive (owner/agency-scoped `businesses/**`, owner-only `temp/{uid}/**`, auth-read-only `shared/reel-music/**`, default deny), unchanged. `firebase deploy --only storage` → "released rules storage.rules to firebase.storage". (CLI noted the ruleset content already existed, so the release re-attached it; either way it is now the released ruleset.)

## 4. Vercel Project — NOT VERIFIED [ACCESS]
Cannot tell if a Vercel project exists/is connected. Repo: `https://github.com/Rakesh9k/ai-marketing-engine.git`, branch `master` only. No `.vercel/` directory. Nothing created, no IDs invented.

## 5. Environment Variables
Every variable the Next app reads is `NEXT_PUBLIC_*` (VERIFIED by grep; only `client.ts` and `billing/page.tsx`). No server secret is, or should be, on Vercel.

| Variable | Required | Public? | Development value | Production requirement |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Yes | real project web key (from `.env.local`) | same project's web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Yes | `brainwise-ai-marketing-engine.firebaseapp.com` | same (verified matches project) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Yes | `brainwise-ai-marketing-engine` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Yes | `brainwise-ai-marketing-engine.firebasestorage.app` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Yes | `691254604957` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Yes | `1:691254604957:web:caf76181…` | same (matches `firebase apps:list`) |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional | Yes | set | same |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | **Yes** | Yes | set (Enterprise) | reCAPTCHA Enterprise key whose allowed domains include `brain-wise.com` (§7) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes (billing) | Yes | `rzp_test_…` | `rzp_live_…` only when going live; test key acceptable for staging |
| `NEXT_PUBLIC_APP_URL` | Recommended | Yes | `http://localhost:3000` | `https://brain-wise.com` |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENABLE_*` | Optional | Yes | in `.env.example` | as desired |
| `NEXT_PUBLIC_USE_EMULATORS` | — | Yes | `true` (local only) | **leave UNSET (or `false`) in Vercel Production and Preview** |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | — | Yes | dev only | **do not set in Vercel** |
| Razorpay secret/webhook secret, AI keys, Admin creds | — | **No** | Functions secrets | **never on Vercel** |

Scope guidance: Production + Preview: the real-project vars above (Preview can use the same real project, since there is no staging project; note Preview origins need to be on the reCAPTCHA key and Auth authorized domains or App Check/Auth will fail there). Development scope: leave empty; local dev uses `.env.local`. `.env.example` already documents every variable; nothing missing.

## 6. Production Emulator Safety — PASS (LOCAL BUILD evidence)
Mechanism: `process.env['NEXT_PUBLIC_USE_EMULATORS'] === 'true'` in `src/lib/firebase/client.ts` gates the `connect*Emulator` calls (hardcoded localhost:9099/8080/9199/5001) and the App Check debug token assignment. Since `.env.local` sets it `true`, the check was run with shell env overriding it (`NEXT_PUBLIC_USE_EMULATORS=false`, debug token blank, `APP_URL=https://brain-wise.com`; process env takes precedence over `.env.local`):
- Bundle scan of `.next/static` and `.next/server`: `localhost:9099/8080/9199/5001` = **0 files**, `127.0.0.1` = 0, `USE_EMULATORS` = 0 (flag inlined and branch eliminated).
- `demo-project` appears only inside the Firebase SDK's own `mockUserToken` helper (not app config); `callFunctionWithEmulator` (the only app `demo-project` user) is unused and tree-shaken.
- App Check initializes with `ReCaptchaEnterpriseProvider` and the inlined site key; no debug-token assignment.
- Secret-pattern scan (`sk_live_`, `rzp_live_`, PEM private keys, `sk-…`): 0 matches.
Remaining risk: a build made in a directory containing `.env.local` without overriding. Vercel's Git build does not have that file (gitignored — VERIFIED). Never run `vercel build`/`vercel --prod` from this working directory.
This is a **local production-mode build**, not a Vercel build.

## 7. App Check — NOT VERIFIED [ACCESS]
Code side PASS: enforced on all callables; client initializes it before Functions; no bypass. Console side unverifiable here. **Manual:** Firebase Console → App Check → Apps → web app → reCAPTCHA Enterprise; and Google Cloud Console → reCAPTCHA Enterprise → the key → Domains: add `brain-wise.com` (and `www.brain-wise.com` if used; plus the Vercel preview domain if previews are to work). Confirm App Check enforcement remains on for Functions. No production request has been made, so App Check is not proven.

## 8. Firebase Auth — NOT VERIFIED [ACCESS]
Client-only email/password auth; no server dependency. **Manual:** Firebase Console → Authentication → Settings → Authorized domains: add `brain-wise.com` (and `www.brain-wise.com` if used). Keep the default `*.firebaseapp.com`/`*.web.app` entries.

## 9. Domain Configuration — BLOCKED until Vercel exists
Current state (VERIFIED by DNS/HTTP, read-only):
- `brain-wise.com` A → `199.36.158.100` (Firebase Hosting); TXT `hosting-site=brainwise-ai-marketing-engine`; AAAA not published by the zone (only NAT64 from resolver).
- `https://brain-wise.com` → **HTTP 404 from Firebase Hosting** (no release). Not serving Mitra.
- `www.brain-wise.com` → **NXDOMAIN** (no record).
- `https://brainwise-ai-marketing-engine.web.app` → 404 (nothing released).
Target: `brain-wise.com` → Vercel (canonical); `www` → redirect to apex.

## 10. DNS — NOT CHANGED
Registrar/DNS host: Hostinger (`ns1/ns2.dns-parking.com`). No MX records observed, no other visible TXT besides the Firebase one (CNAME/other records could not be fully enumerated without the Hostinger panel). Nothing modified. **Manual sequence:** (1) Firebase Console → Hosting → Domains → remove `brain-wise.com` from the site (or leave and just repoint; removing avoids Firebase re-claiming it); (2) Vercel → Project → Settings → Domains → add `brain-wise.com` (set as primary) and `www.brain-wise.com` (redirect to apex); (3) in Hostinger DNS replace **only** the apex A record `199.36.158.100` (and delete the `hosting-site` TXT if desired) with the exact values Vercel displays; add the `www` CNAME Vercel displays. Do not touch MX/other TXT/NS.

## 11. Next.js Production Build — PASS
Repo checks (this session, after changes): `npm run lint` PASS (0 warnings), `npm run typecheck` PASS, `npm test` PASS (31 suites, 298 passed, 7 skipped, 0 failed), `npm run functions:build` PASS, `npm run build` PASS (22 pages; `ƒ /campaigns/[campaignId]` dynamic). No static export/standalone/Firebase Hosting config exists in the repo.
LOCAL `next start` (production server, port 3111, since stopped): `/`, `/login`, `/campaigns/abc123`, `/billing` → 200; security headers present on the dynamic route (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-XSS-Protection`, `X-DNS-Prefetch-Control`); `og:url` and `og:image` resolve to `https://brain-wise.com`. This is LOCAL evidence — it does not prove Vercel preserves headers (PARTIAL; expected but unverified). `next/image` optimizer could not be meaningfully tested (no real Storage image URL available; a fake URL returned 404 as expected) → NOT VERIFIED.

Files changed this session: `src/app/layout.tsx` (added `metadataBase`, `openGraph.url` → `https://brain-wise.com`), `.firebaserc` (removed inert `targets.hosting` block). No other config changed. `og-image.png` is referenced by metadata but absent from `public/` → non-blocking, image not fabricated. CI: `.github/workflows/ci-cd.yml` triggers on `main`/`develop` and uses `./ai-marketing-engine` paths while the repo is `master` and the root is the app dir → CI probably never runs; **not a production deployment problem** because frontend deploys via Vercel Git integration, not this workflow; left unchanged.

## 12. Production Browser Verification — NOT VERIFIED [ENV/ACCESS]
No deployed site exists to test, and no browser automation ran (Phase 19/20 report browser binaries blocked on this machine). Checks 1–26 in the request (homepage, signup/login, App Check, Firestore/Storage, campaign flow, `/campaigns/[id]`, images, download, WhatsApp, billing) are all NOT VERIFIED at PRODUCTION and VERCEL PREVIEW level. Emulator-level evidence from earlier phases does not count.

## 13. Security Verification — PARTIAL
PASS: no secrets in bundle (scan), no AI/Razorpay/Admin credentials in frontend, no emulator wiring in production build, Firestore rules untouched, Storage rules restrictive and released, correct Firebase project in bundled config. NOT VERIFIED: App Check console config, Auth authorized domains, response headers on Vercel. Note: `.env.local` still holds `USE_EMULATORS=true` and a debug token (untracked, gitignored; local only). Razorpay key is `rzp_test_` — correct for test, must be swapped for live keys at launch.

## 14. AI Verification — NOT VERIFIED
Frontend has no AI code path or keys (architecture unchanged). No provider-backed execution performed.

## 15. Razorpay Verification — NOT VERIFIED
Frontend loads Checkout.js with a test key id; secrets/verification/webhook remain in Functions. No payment attempted.

## 16. Remaining Blockers
1. No Vercel project confirmed/connected [ACCESS].
2. `brain-wise.com` still on Firebase Hosting DNS [CONFIG].
3. reCAPTCHA Enterprise key domains and Auth authorized domains not confirmed [ACCESS].
4. No production/preview browser test [ENV].
5. Live Razorpay keys/webhook, AI provider credentials unverified.
6. `og-image.png` missing (non-blocking); no CSP (pre-existing, non-blocking).

## 17. Manual Actions Required (in order)
1. Vercel: import GitHub repo `Rakesh9k/ai-marketing-engine` (root = repo root, framework Next.js, Node 20.x); push `master` (the local tree has uncommitted staged work — the Vercel build only sees what is pushed).
2. Vercel → Environment Variables (Production + Preview): all Firebase web config vars, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_APP_URL=https://brain-wise.com`. Do NOT add `NEXT_PUBLIC_USE_EMULATORS` or the debug token.
3. Deploy; test on the `*.vercel.app` URL first (add that domain to reCAPTCHA + Auth authorized domains for the test).
4. Console steps in §7 and §8.
5. DNS/domain steps in §10.
6. Run the smoke test (audit doc) on `https://brain-wise.com`.

## 18. Rollback Procedure
Frontend: Vercel → Deployments → previous good deployment → "Promote to Production" (instant). Domain: restore Hostinger apex A to `199.36.158.100` (and TXT) if the domain move must be reverted. Backend: unchanged by this phase except the `createBusiness` recreate; Storage rules can be reverted by re-releasing the prior ruleset from Console → Storage → Rules history. Code changes this session (`layout.tsx` metadata, `.firebaserc`) are two small reversible edits via git.

## Final Verdict

BACKEND: PASS
STORAGE: PASS
NEXT.JS BUILD: PASS
VERCEL: NOT VERIFIED
PRODUCTION ENVIRONMENT: PARTIAL
APP CHECK: NOT VERIFIED
FIREBASE AUTH: NOT VERIFIED
CUSTOM DOMAIN: BLOCKED
SECURITY: PARTIAL
PRODUCTION BROWSER: NOT VERIFIED
AI: NOT VERIFIED
RAZORPAY: NOT VERIFIED
OVERALL FRONTEND DEPLOYMENT: BLOCKED (on Vercel/console access; repository is ready)
