# Production Deployment Architecture Audit

Companion to `PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md` (full evidence, route map, env table, diagram). This file is the decision record. Audit only — nothing implemented.

## Executive Summary

Mitra's Next.js app is a standard server-built Next 15.5 App Router app, fully client-side for Firebase Auth / Firestore / Functions, with **no server-only code or secrets**. It has exactly one dynamic route (`/campaigns/[campaignId]`), uses `next/image` with remote Storage URLs, and relies on `next.config` `headers()`. That makes it **incompatible with a plain Firebase Hosting static deploy** without app changes, and **compatible unchanged with Vercel and Firebase App Hosting**. Recommendation: **Vercel** (documented intent + existing `vercel.json` + no extra setup), with Firebase staying the backend. The Firebase backend is live; Storage rules are ready but not confirmed deployed.

## Current Deployment State

Live (VERIFIED): 37 callable/HTTPS Functions (asia-south1), 2 Auth triggers (us-central1), Firestore rules + indexes. Not configured: Firebase Hosting. Not verifiably deployed: the frontend. `brain-wise.com` is attached to the Firebase Hosting default site (per user).

## Next.js Architecture

Next 15.5.25 / React 18.3.1, App Router only, no `output` mode. `npm run build` → 22 pages, 19 static + 1 `ƒ`. No middleware, route handlers, server actions, cookies/headers, Admin SDK. 26/27 page/layout files are `'use client'`. Details: architecture doc §2–3.

## Firebase Architecture

Browser → Auth + App Check → callables (all `enforceAppCheck: true`) → Firestore / Storage (signed URLs) / AI / Razorpay. No server-side Next code touches Firebase.

## Hosting Requirements

The host must provide: a Next server runtime (1 dynamic route), the image optimizer (remote Storage images), `headers()` support, HTTPS + custom domain, and build-time injection of `NEXT_PUBLIC_*` variables. It does not need: secrets, Admin credentials, Firebase IAM, cookies/session handling.

## Static Export Analysis

NOT COMPATIBLE as-is: dynamic route without `generateStaticParams` (INFERRED build failure, not executed), image optimizer dependency, `headers()` not applied. Would require app changes (query-param or rewrite for campaign detail, `images.unoptimized`, header port). `.next/static` is never a valid Hosting root.

## Vercel Analysis

COMPATIBLE, no changes. `vercel.json` correct. Needs project connected to Git (UNVERIFIED), public env vars, domain. Domain, HTTPS automatic. Function/region choice irrelevant (dynamic route is a client shell).

## Firebase App Hosting Analysis

COMPATIBLE, no app changes; needs `apphosting.yaml`, GitHub-linked backend, Cloud Build/Run, IAM, region check. Functionally equivalent for this app; extra operational surface; no feature the app needs.

## Firebase Hosting Analysis

NOT COMPATIBLE (static) — see above. Legacy web-frameworks integration not recommended.

## Domain Analysis

`brain-wise.com` canonical, `www` → apex redirect. Currently attached to Firebase Hosting → must be detached before moving to Vercel. `brainwise-ai-marketing-engine.web.app` / `.firebaseapp.com`: keep as Firebase project defaults (`authDomain` for Auth helper pages, `/__/auth/*`); do not use as customer-facing URLs; they will serve Firebase's default page while Hosting is unconfigured.

## Security Analysis

PASS on: no frontend secrets, no AI keys/Admin SDK/Razorpay secret client-side, App Check enforced, server-side authorization, restrictive Firestore/Storage rules. Watch items: local `.env.local` sets `NEXT_PUBLIC_USE_EMULATORS=true` (never build for prod locally); no CSP; OG/metadata drift; single Firebase project for all environments. Console-only items unverified: App Check key domains, Auth authorized domains, App Check enforcement toggle.

## Environment Variable Analysis

All Next variables are `NEXT_PUBLIC_*` → PUBLIC, BUILD-TIME. No SERVER-ONLY/RUNTIME variables exist in the Next app; all secrets live in Firebase Functions secrets. Prod must set: Firebase web config, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` (live), `NEXT_PUBLIC_APP_URL=https://brain-wise.com`; must NOT set `NEXT_PUBLIC_USE_EMULATORS` or `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`.

## Storage Rules Status

`storage.rules` compiles (dry-run OK), restrictive, includes the new `shared/reel-music` read-only block. Not included in the earlier deploy; live status UNKNOWN. Ready to deploy: `firebase deploy --only storage` (not run).

## Deployment Drift

Hosting missing vs domain attached; vestigial `.firebaserc` `targets.hosting`; `default` and `dev` aliases identical; CI triggers `main`/`develop` while branch is `master` and uses `./ai-marketing-engine` paths (INFERRED non-functional); requested docs `PRODUCT/ARCHITECTURE/DATABASE/AI_ARCHITECTURE/SECURITY/MVP_SCOPE/TEST_PLAN.md` don't exist. Functions/Firestore: no drift.

## Architecture Recommendation

**A. Vercel** (frontend) + Firebase (backend).

## Why This Architecture Fits

Specific repository facts: standard server build with `ƒ /campaigns/[campaignId]`; `next/image` `remotePatterns` for `firebasestorage.googleapis.com`; `headers()` security headers in `next.config.ts`; existing correct `vercel.json`; Phase 19/19A documented Vercel as intended; zero server-only secrets so no reason to host inside Google IAM. App Hosting is a technically valid alternative; the code does not force the choice.

## What Must NOT Be Changed

`enforceAppCheck: true` on all callables; App Check client init; Firestore/Storage rules restrictiveness; server-side authorization; secrets remaining in Functions secrets; `next.config` `output` (leave unset); Functions region asia-south1; Razorpay verification/webhook on backend.

## Required Implementation Changes

No application code changes required. Operational: connect Vercel project; set env vars; Auth authorized domains; reCAPTCHA key domains; detach domain from Firebase Hosting and attach to Vercel; deploy Storage rules. Optional cleanup: metadata URL/`metadataBase`/OG image, `.firebaserc` hosting target, CI branch/paths, staging project.

## Deployment Sequence (do not run automatically)

**PHASE A — Configuration:** confirm Vercel account/project linked to this repo; confirm Node 20.x; no `next.config` change.
**PHASE B — Environment variables:** in Vercel (Production scope) set the §7 public vars with production values; leave `USE_EMULATORS` and debug token unset. In Razorpay dashboard confirm webhook points to the `razorpayWebhook` Function URL.
**PHASE C — Frontend deployment:** trigger a Git-based Vercel build from the default branch (not a local build). Verify on the `*.vercel.app` URL first.
**PHASE D — Custom domain:** remove `brain-wise.com` from Firebase Hosting; add `brain-wise.com` and `www.brain-wise.com` in Vercel (apex canonical, www redirects); update DNS per Vercel's displayed records; wait for certificate.
**PHASE E — Firebase App Check / Auth production configuration:** add `brain-wise.com`, `www.brain-wise.com` (and the Vercel preview domain if wanted) to the reCAPTCHA Enterprise key allowed domains and to Firebase Auth authorized domains; keep enforcement on; run `firebase deploy --only storage`.
**PHASE F — Browser verification:** run the smoke test below.
**PHASE G — Security verification:** view page source/bundle for `localhost:9099`, emulator or debug-token strings (must be absent); confirm response headers (`X-Frame-Options`, `nosniff`); confirm callable without App Check token is rejected; confirm unauthenticated Firestore/Storage reads denied.
**PHASE H — Rollback:** Vercel "Promote previous deployment" (instant); if DNS is the problem, revert DNS records; backend needs no rollback (unchanged).

## Production Smoke Test

Legend: **A** = automated test, **E** = emulator test, **B** = real browser test, **P** = production test.

| # | Check | Type |
|---|---|---|
| 1–3 | Open `brain-wise.com`, HTTPS valid, app renders | P |
| 4 | No console errors (incl. App Check) | P |
| 5–8 | Signup → login → logout → login again | P (logic covered by A/E tests) |
| 9 | Firebase Auth user appears in console | P |
| 10 | App Check token attached / callables succeed | P (only real proof; emulator doesn't verify tokens) |
| 11–12 | Create business → Firestore doc + `businessIds` claim | P |
| 13–14 | Upload asset → object in Storage | P |
| 15–16 | Start campaign → Cloud Function logs | P |
| 17–18 | AI generation + Truth Check result | P |
| 19–20 | Review campaign (`/campaigns/<id>` deep link + refresh) → download asset | P |
| 21 | WhatsApp CTA opens correctly | B/P |
| 22–23 | Billing page; Razorpay flow in test mode if keys allow | P |
| 24 | Credits change after purchase/generation | P |
| 25 | Logout/login persistence | P |
| — | Unit/component suites (`npm test`), Functions tests | A |
| — | Firestore/Storage rules, callable flow with debug token | E |

## Rollback Strategy

See Phase H. Frontend is stateless; backend untouched by this change.

## Remaining Blockers

1. Vercel project/Git connection unverified (human).
2. reCAPTCHA Enterprise key domains and Auth authorized domains for `brain-wise.com` unverified (console).
3. Storage rules deployment unconfirmed.
4. `brain-wise.com` still attached to Firebase Hosting.
5. Production Razorpay live key/webhook state unverified.
6. No production browser E2E has ever been run (Phase 19/20).

## Final Verdict

FRONTEND ARCHITECTURE: PASS
STATIC EXPORT: NOT COMPATIBLE
VERCEL: COMPATIBLE
FIREBASE APP HOSTING: COMPATIBLE
FIREBASE STATIC HOSTING: NOT COMPATIBLE
CUSTOM DOMAIN: REQUIRES CONFIGURATION
FIREBASE BACKEND: DEPLOYED
STORAGE RULES: UNKNOWN
SECURITY: PARTIAL
OVERALL DEPLOYMENT ARCHITECTURE: READY FOR IMPLEMENTATION
