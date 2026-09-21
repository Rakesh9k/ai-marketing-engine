# Vercel Preview Deployment Report (preparation phase)

Date: 2026-09-21. Scope: prepare repo + verify locally + push; production domain NOT touched. Verdict words: PASS / PARTIAL / BLOCKED / FAIL / NOT VERIFIED.

**Headline: the code is committed locally but NOT pushed (GitHub rejected the push: token lacks `workflow` scope). No Vercel project or preview exists. Nothing on Vercel has been verified.**

## 1. Repository State
- Branch `master`, remote `origin` = `https://github.com/Rakesh9k/ai-marketing-engine.git`. `origin/master` is still at `b5a2485` (first commit); local is 5 commits ahead.
- `.env.local` is git-ignored (`.gitignore:21`) and NOT tracked (`git ls-files` empty). No `.env*` (other than `.env.example`, placeholders only), `*.pem`, `*.key`, service-account or adminsdk files are tracked or staged. Secret-pattern scan of the entire staged diff + new files: only fake test fixtures / prose, no real secrets.
- Left uncommitted on purpose (unrelated, untracked): `golden-path-manual.mjs` (a Playwright helper with synthetic test identities), `functions/tsconfig.eslint.json` (unreferenced).
- Unstaged working-tree edits found that I did not make and that match what was deployed to Firebase: `firestore.indexes.json` (4 redundant single-field indexes removed), `package.json`/`package-lock.json` (`firebase` `^10.12.5`→`^10.14.1`, matching installed). Included in the commit.

## 2. Git Commit
`d882dbb` "Prepare Vercel production frontend deployment" (293 files). Includes: full MVP app/functions/tests state, `vercel.json` fix, `layout.tsx` metadata (`metadataBase`, `openGraph.url` → `https://brain-wise.com`), `.firebaserc` cleanup, audit/report docs, `VERCEL_ENVIRONMENT_VARIABLES.md`. This report was added in a follow-up docs-only commit.
**Push: BLOCKED.** GitHub: `refusing to allow a Personal Access Token to create or update workflow .github/workflows/ci-cd.yml without workflow scope`. That workflow file was added by an earlier local commit (`b9087c8`), so it cannot be excluded without rewriting history (not done). Stored credential helper is `store`; credentials were not touched.

## 3. Firebase Project
Active: `brainwise-ai-marketing-engine` (VERIFIED). Deployed functions re-counted: **36 in asia-south1 + 2 in us-central1 = 38** (`firebase functions:list`). Bundled web config compared against `firebase apps:sdkconfig WEB 1:691254604957:web:caf76181c86efb6a7b5074`: projectId, appId, storageBucket, authDomain, messagingSenderId and apiKey all MATCH. Firestore/Storage rules deployed earlier (not redeployed).

## 4. Environment Variables
See `VERCEL_ENVIRONMENT_VARIABLES.md`. The app reads 11 `NEXT_PUBLIC_*` variables only; six others in `.env.example` (`APP_URL`, `APP_NAME`, four `ENABLE_*`) are not read. No server secret belongs on Vercel.

## 5. Local Build Verification (LOCAL — not Vercel evidence)
`npm run lint` PASS (0 warnings) · `npm run typecheck` PASS · `npm test` PASS (31 suites, 298 passed, 7 skipped, 0 failed) · `npm run functions:build` PASS · `npm run build` PASS (22 pages; `ƒ /campaigns/[campaignId]`).
Config checks: Next 15.5.25, App Router, `next.config.ts` has no `output`/rewrites, `headers()` + `next/image` remotePatterns present; `.nvmrc` = `20`, `engines.node` = `20.x` (Vercel will use Node 20). `postinstall` runs `npm --prefix functions install` (works on Vercel; adds install time). Build via `next build` also runs lint+types.
**Vercel blocker found and fixed:** `vercel.json` contained `"projectName"`, which is not in Vercel's published `vercel.json` schema (`additionalProperties: false`; checked against `https://openapi.vercel.sh/vercel.json`) and would make Vercel reject the config. Removed; file is now `framework`/`buildCommand`/`installCommand` only, all valid. No other config changed.

## 6. Production Build Safety (LOCAL BUILD)
Built with a temporary git-ignored `.env.production.local` (`NEXT_PUBLIC_USE_EMULATORS=false`, blank debug token), then deleted it; `.env.local` untouched. Build log: "Environments: .env.production.local, .env.local". Bundle scan of `.next/static` + `.next/server`: `localhost:9099/8080/9199/5001` 0, `127.0.0.1` 0, `USE_EMULATORS` 0, debug-token assignment 0, secret patterns (`sk_live_`, `rzp_live_`, private-key headers, `whsec_`, `client_email`) 0. Verdict PASS. (`demo-project` occurs only inside the Firebase SDK's own helper; app's `callFunctionWithEmulator` is unused/tree-shaken — verified in the previous phase.)

## 7. Vercel Project — NOT VERIFIED
No Vercel CLI, no `.vercel/`, no account access. Nothing created or assumed. Also, until the push succeeds, Vercel has only the first commit to build.

## 8. Vercel Preview URL — NOT VERIFIED
None exists. `https://brain-wise.com` is still Firebase Hosting's 404 (expected; deliberately untouched).

## 9–15, 24. Browser / Auth / App Check / Functions / Firestore / Storage / next/image / headers
NOT VERIFIED — no preview URL exists. (Local `next start` evidence from the previous phase: routes 200 and security headers present; that is LOCAL only.)

## 16–17. AI / Razorpay
NOT VERIFIED. Frontend holds no AI keys or Razorpay secrets; local `.env.local` Razorpay key is `rzp_test_`.

## 18. Console configuration needed (cannot be checked from here)
- Firebase Auth → Authorized domains: add the `*.vercel.app` preview host (later `brain-wise.com`, `www.brain-wise.com`).
- reCAPTCHA Enterprise key → allowed domains: same hosts. (Firebase App Check for a web app uses this key's domain list; enforcement stays ON.)
Until done, a preview will fail sign-in (`auth/unauthorized-domain`) or callables (`UNAUTHENTICATED`) — configuration, not code.

## 19. Production Domain — NOT STARTED
No DNS, Firebase Hosting, or Vercel-domain change was made.

## 20. Remaining Blockers
1. **Push blocked** — GitHub token lacks `workflow` scope [ACCESS].
2. No Vercel project [ACCESS].
3. Auth/reCAPTCHA authorized domains for the preview host [ACCESS].
4. `og-image.png` missing (non-blocking); CI triggers on `main`/`develop` not `master` (non-blocking, Vercel deploys independently).

## 21. Manual Actions
1. Create a GitHub token that includes `workflow` (classic PAT: `repo` + `workflow`; fine-grained: Contents RW + Workflows RW on this repo). Clear the old stored one, then push and enter the new token when prompted:
   `printf "protocol=https\nhost=github.com\n\n" | git credential reject` then `git push origin master`
   (or authenticate with GitHub CLI/Git Credential Manager, which has the scope by default).
2. Vercel → Add New Project → import `Rakesh9k/ai-marketing-engine` → Framework Next.js, Production Branch `master`, Node 20, Root Directory = repo root. Add the variables in `VERCEL_ENVIRONMENT_VARIABLES.md` (Production + Preview). Do NOT add `NEXT_PUBLIC_USE_EMULATORS` or `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`. Deploy.
3. Add the resulting `*.vercel.app` host to Firebase Auth authorized domains and the reCAPTCHA Enterprise key domains.
4. If the preview shows a Vercel login/401, Deployment Protection is on: report "deployed but protected" (do not disable unless you decide to).

## 22. Next Step
Complete manual actions 1–3, send the `*.vercel.app` URL, and the preview verification phase (routes, headers, bundle, Auth, App Check, `createBusiness`, image optimizer) can run.

## Final Verdict
REPOSITORY: PARTIAL (committed locally, push BLOCKED)
SECRETS: PASS
LOCAL BUILD: PASS
PRODUCTION ENVIRONMENT: PASS (local build evidence); Vercel-side NOT VERIFIED
VERCEL PROJECT: NOT VERIFIED
VERCEL PREVIEW: NOT VERIFIED
FIREBASE AUTH: NOT VERIFIED
APP CHECK: NOT VERIFIED
FUNCTIONS: NOT VERIFIED (deployment count PASS: 36 + 2)
FIRESTORE: NOT VERIFIED
STORAGE: NOT VERIFIED (rules released earlier)
NEXT/IMAGE: NOT VERIFIED
SECURITY HEADERS: NOT VERIFIED on Vercel (local PASS)
CUSTOM DOMAIN: NOT STARTED
AI: NOT VERIFIED
RAZORPAY: NOT VERIFIED
OVERALL: BLOCKED (on the GitHub push scope and Vercel access); the repo itself is ready for preview verification

---

# Update — GitHub push → Vercel handoff attempt (2026-09-21, second run)

Earlier sections above are preserved unchanged as historical evidence. Status words: PASS / PARTIAL / BLOCKED / FAIL / NOT VERIFIED / NOT STARTED.

## Repository State
Branch `master`; `origin` = `https://github.com/Rakesh9k/ai-marketing-engine.git`; local `master` **ahead 6** of `origin/master` (`b5a2485`, confirmed with `git ls-remote`); tip `e250ac2`. Only uncommitted items are the two intentionally excluded untracked files (`golden-path-manual.mjs`, `functions/tsconfig.eslint.json`; neither tracked). `.env.local` git-ignored (`.gitignore:21`), untracked. Secret scan of the whole unpushed diff: only the known fake test fixtures/prose. Deployment commits reviewed: `d882dbb` (293 files: `vercel.json` valid with no `projectName`, `metadataBase` + `openGraph.url` = `https://brain-wise.com`, `.firebaserc` hosting-target cleanup, docs) and `e250ac2` (docs only).

## Local validation (LOCAL only — not Vercel evidence)
`npm run lint` exit 0 · `npm run typecheck` exit 0 · `npm test` 31 suites, 298 passed / 7 skipped / 0 failed · `npm run functions:build` exit 0 · `npm run build` PASS (22 pages, `ƒ /campaigns/[campaignId]`), built with temporary git-ignored `.env.production.local` (emulators off, no debug token; deleted afterwards). Bundle scan: emulator endpoints 0, `USE_EMULATORS` 0, secret patterns 0.

## GitHub Push — BLOCKED
Push retried (prompts disabled): rejected again — `refusing to allow a Personal Access Token to create or update workflow .github/workflows/ci-cd.yml without workflow scope`. Cause: the stored token lacks `workflow`; the workflow file is in earlier local commit `b9087c8`. Not worked around: workflow kept, no history rewrite, no force push, stored credential not modified (the session cannot enter a new token interactively; `gh` on this machine is a broken npm package). `origin/master` unchanged.

## Vercel Project / Deployment / Preview URL — NOT VERIFIED / NOT STARTED
No Vercel access from this session; no project, deployment or URL exists to report. None invented.

## Environment Variables
Source of truth `docs/VERCEL_ENVIRONMENT_VARIABLES.md`. Not to be added on Vercel: `NEXT_PUBLIC_USE_EMULATORS`, `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`, any AI/Razorpay/Admin/webhook secret.

## Firebase Auth, App Check, Functions, Firestore, Storage, next/image, Security Headers, Dynamic Routes — NOT VERIFIED
No preview exists. (Backend deployment count re-verified previously: 36 functions asia-south1 + 2 auth triggers us-central1.) Preview host must be added to Firebase Auth authorized domains and to the reCAPTCHA Enterprise key's allowed domains — NOT VERIFIED (console-only).

## AI / Razorpay — NOT VERIFIED
## Custom Domain — NOT STARTED (DNS, Firebase Hosting and Vercel domains untouched; `brain-wise.com` still Firebase Hosting 404)

## Remaining Blockers
1. GitHub token without `workflow` scope [ACCESS].
2. No Vercel project [ACCESS].
3. Preview host not yet authorized in Firebase Auth / reCAPTCHA [ACCESS].

## Manual Actions
1. Create a token: classic PAT with `repo` + `workflow`, or fine-grained with Contents RW + Workflows RW on `Rakesh9k/ai-marketing-engine`.
2. In your own terminal: `printf "protocol=https\nhost=github.com\n\n" | git credential reject`, then `git push origin master`; enter your GitHub username and the token as the password. (Never paste the token into a file or chat.)
3. Vercel → Add New Project → import `Rakesh9k/ai-marketing-engine` → Next.js, production branch `master`, Node 20, env vars per the doc → Deploy. Do not add the custom domain.
4. Add the resulting `*.vercel.app` host to Firebase Auth authorized domains and the reCAPTCHA Enterprise key domains.

## Next Step
Push `master`; then send the real `*.vercel.app` URL for the preview verification run.
