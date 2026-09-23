# Phase 19B — Vercel Preview Deployment Report

Date: 2026-09-21. Status words: PASS / PARTIAL / BLOCKED / FAIL / NOT VERIFIED / UNTOUCHED.

**Result: BLOCKED. No Vercel project or deployment exists yet, so nothing on Vercel could be verified. No Vercel URL was provided, and this environment has no Vercel account access. No result below is inferred or invented.**

## 1. Objective
Deploy the existing Next.js frontend to Vercel from GitHub `master`, then verify the real deployment (rendering, Firebase project, Auth/App Check, Storage/`next/image`, headers, environment safety) before any custom-domain work.

## 2. Repository State
- Branch `master`; local HEAD `3659851684a751e618dd1bd417b8037ca402ade2`; `git ls-remote origin refs/heads/master` = `3659851684a751e618dd1bd417b8037ca402ade2` — **MATCH** (GitHub: PASS).
- Repo `https://github.com/Rakesh9k/ai-marketing-engine` (public). Working tree: only the two intentionally excluded untracked files (`golden-path-manual.mjs`, `functions/tsconfig.eslint.json`); this report is also uncommitted.
- GitHub default branch is still `main` (unrelated "Initial commit"); `master` holds the app. `ci-cd.yml` preserved. No force push, no history rewrite.

## 3. Vercel Configuration (repo side — from files, not from Vercel)
`vercel.json`: `framework: nextjs`, `buildCommand: npm run build`, `installCommand: npm install` (no invalid keys; `projectName` removed in `d882dbb`, checked against Vercel's published schema). `next.config.ts`: no `output` mode, `headers()` + `images.remotePatterns` for `firebasestorage.googleapis.com` and `lh3.googleusercontent.com`. Node: `.nvmrc` = `20`, `engines.node` = `20.x`. Env source of truth: `docs/VERCEL_ENVIRONMENT_VARIABLES.md` (11 `NEXT_PUBLIC_*` variables; exclude `NEXT_PUBLIC_USE_EMULATORS`, the App Check debug token, and all secrets). **Vercel-side settings: NOT VERIFIED.**

## 4. Deployment — NOT STARTED
Evidence that no Vercel deployment exists: GitHub API shows 0 deployments and 0 check runs for the repo; commit `3659851` has state `pending` with no Vercel status context; no `.vercel/` directory; Vercel CLI not installed; no URL supplied. Project name, deployment ID, URL, deployed SHA, build result: none.

## 5. Route Verification
| Route | HTTP | Rendered | Console | Result |
|---|---|---|---|---|
| / | — | — | — | NOT VERIFIED |
| /login | — | — | — | NOT VERIFIED |
| /dashboard | — | — | — | NOT VERIFIED |
| /billing | — | — | — | NOT VERIFIED |
| /campaigns/abc123 | — | — | — | NOT VERIFIED |

## 6. Firebase
| Component | Result | Evidence |
|---|---|---|
| Firebase project | PASS (local build) / NOT VERIFIED (Vercel) | Local production-mode bundle config matched `firebase apps:sdkconfig` (projectId, appId, storageBucket, authDomain, messagingSenderId, apiKey) |
| Auth | NOT VERIFIED | needs preview + authorized domain |
| App Check | NOT VERIFIED | needs preview host on the reCAPTCHA Enterprise key |
| Firestore | NOT VERIFIED | |
| Storage | NOT VERIFIED | rules released earlier; no browser test |
| Functions | NOT VERIFIED from browser | backend deployment count verified earlier: 36 asia-south1 + 2 us-central1 |

## 7. Security
| Check | Result |
|---|---|
| Emulator leakage | PASS on LOCAL production-mode build (0 emulator endpoints, `USE_EMULATORS` inlined false); NOT VERIFIED on Vercel |
| Server secrets exposed | PASS on local bundle scan (0 patterns); NOT VERIFIED on Vercel |
| Firebase config | PASS local; NOT VERIFIED on Vercel |
| Security headers | PASS local `next start`; NOT VERIFIED on Vercel |
| Auth domain | NOT VERIFIED (console-only; preview host unknown) |
| App Check | NOT VERIFIED (enforcement untouched, still `enforceAppCheck: true`) |

## 8. Image Handling — NOT VERIFIED
`next/image` config present; no real Storage image loaded through the optimizer on any deployment.

## 9. Billing — NOT VERIFIED
Checkout.js loader and public key wiring exist in code (`rzp_test_` key locally); page not opened on a deployment; no payment attempted.

## 10. AI — NOT VERIFIED
No AI code in the browser; provider keys belong to Functions secrets. No backend AI execution performed.

## 11. Analytics — NOT VERIFIED
Not exercised in a browser.

## 12. Automated Tests (LOCAL, last run this session; no code changed since)
lint exit 0 · typecheck exit 0 · `npm test` 31 suites / 298 passed / 7 skipped / 0 failed · `npm run build` PASS · `npm run functions:build` exit 0. These say nothing about Vercel.

## 13. Domain Status
brain-wise.com = UNTOUCHED (still Firebase Hosting default 404, re-checked) · www.brain-wise.com = UNTOUCHED · DNS = UNTOUCHED · Firebase Hosting = UNTOUCHED.

## 14. Findings
- **P0:** No Vercel project/deployment exists [ACCESS — needs the account owner].
- **P1:** Preview host not yet authorized in Firebase Auth and the reCAPTCHA Enterprise key (needed before Auth/App Check can work on a preview) [ACCESS, console-only].
- **P1:** Browser-level verification may be limited by this machine's policy (earlier phases reported browser binaries blocked) — HTTP/bundle checks are possible, Auth/App Check/`createBusiness`/Storage/`next/image` may need to be run by the user.
- **P2:** GitHub default branch is `main`; set to `master` so Vercel picks the right production branch.
- **P2:** Repo is public; all pushed files are world-readable (no secrets found).
- **P2:** `og-image.png` referenced but absent (non-blocking); CI triggers on `main`/`develop`.
- **Informational:** old GitHub token pasted in chat earlier should be revoked.

## 15. Final Verdict
**PHASE 19B BLOCKED**
