# Mitra — Deployment Runbook

**Status:** written 2026-10-03 from the repository and the Firebase CLI's own `--help` output. Commands
marked **[VERIFY]** depend on console state that the repo cannot prove; check them before relying on them.
Nothing in this document has been executed against production.

**Companion document:** `docs/PRODUCTION_PADDLE_DEPLOYMENT_RUNBOOK.md` holds the detailed Paddle cut-over
plan and decisions. This runbook covers everything else and links there for Paddle.

**Conventions:** `<project>` is the Firebase project id from `.firebaserc` (`brainwise-ai-marketing-engine`;
both `default` and `dev` point at it — **there is no separate dev or staging project in the repo**). Commands
are written for a POSIX shell (Git Bash on Windows). **Never paste a secret value into a command, a chat or a
file.**

---

## 0. Read first — current known blockers (2026-10-03)

Do not run a production deploy until each is resolved or consciously accepted.

| #   | Blocker                                                                                                                                                       | Evidence / where                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | `npm run lint` fails (29 errors, 17 warnings; script uses `--max-warnings 0`). The CI `frontend-lint` job runs it, and every deploy job `needs:` it.          | Mostly unused variables outside the files touched so far  |
| 2   | A design-inspector overlay (`src/components/shared/MesurerWrapper.tsx`, mounted in `src/app/layout.tsx`) appears in a production build and intercepts clicks. | Found in the Playwright run; confirm on the deployed site |
| 3   | The Playwright golden-path spec has never passed (overlay above; the spec also never ticks the Terms checkbox that sign-up requires).                         | `tests/e2e/mvp-golden-path.spec.ts`                       |
| 4   | `META_TOKEN_ENCRYPTION_KEY` falls back to a key derived from the (non-secret) project id when unset.                                                          | `functions/src/services/meta/crypto.ts`                   |
| 5   | Sentry variables are not in `apphosting.yaml`, so production error reporting is probably off.                                                                 | See §6                                                    |
| 6   | App Hosting branch topology: two backends exist; see §4.4. The wrong branch push can redeploy the wrong backend.                                              | Console state, **[VERIFY]**                               |
| 7   | The working tree is large and uncommitted. Deploy only from a clean, reviewed commit.                                                                         | `git status`                                              |
| 8   | Local Node is v24; the project requires Node 20.x.                                                                                                            | §1                                                        |

---

## 1. Prerequisites

| Item                        | Required                                                                                                                     | Source                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Node.js                     | **20.x** (`package.json` `engines.node` = `20.x`, `functions/package.json` = `20`, `.nvmrc` = `20`, CI `NODE_VERSION: '20'`) | repo                               |
| npm                         | **11.12.1** (`package.json` `packageManager`)                                                                                | repo                               |
| npm config                  | `.npmrc` sets `legacy-peer-deps=true` (needed because of a `firebase` peer conflict); keep it                                | repo                               |
| Firebase CLI                | **15.29.0** (CI installs `firebase-tools@15.29.0`; `npx firebase --version` resolves the same locally)                       | `.github/workflows/ci-cd.yml`      |
| Java (JDK)                  | needed by the Firestore and Storage emulators (CI uses `actions/setup-java`)                                                 | CI                                 |
| Google Cloud CLI (`gcloud`) | only for the **reel renderer** Cloud Run service (§4.7) and Cloud Run revision rollback                                      | `services/reel-renderer/README.md` |
| Playwright browser          | `npx playwright install chromium` before E2E                                                                                 | `playwright.config.ts`             |

Check your toolchain:

```bash
node -v        # must print v20.x
npm -v         # 11.12.1
npx firebase --version   # 15.29.0
java -version
```

If `node -v` is not 20.x, switch before doing anything else (`nvm use` reads `.nvmrc`).

**Access you need** (confirm each before the deploy window): Firebase project **Owner/Editor** on
`<project>` (Auth, Firestore, Storage, Functions, App Hosting); **Secret Manager** admin
(`firebase functions:secrets:set`, `firebase apphosting:secrets:set`); the **GitHub** repo
`Rakesh9k/ai-marketing-engine` (push, Actions); the **Paddle** dashboard (live and sandbox); the **Google
Cloud console** for Cloud Run/Logging; **Sentry** (not provisioned yet — §6).

Authenticate:

```bash
npx firebase login          # interactive; CI uses the FIREBASE_TOKEN repository secret instead
npx firebase projects:list  # confirm <project> is visible
```

---

## 2. Environment configuration

The authoritative inventory (names, public vs secret, dev vs prod, owning subsystem, stale entries) is
**`.env.example`**; the README has a summary table. Rules that matter at deploy time:

- `NEXT_PUBLIC_*` values are **public** and **inlined at build time**. A change needs a new build/rollout.
- Server secrets never use the `NEXT_PUBLIC_` prefix and never go in the frontend env.
- **Where each group is configured:**

| Group                                                                                                   | Where                                                                                                                                       | How                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend public config (Firebase web config, App Check site key, Paddle env + price IDs, emulator flag) | `apphosting.yaml` (backend `mitra-web`); plain `value:` for non-sensitive items, `secret:` references for the Paddle token and 11 price IDs | edit file / `firebase apphosting:secrets:set <NAME>`                                                                                                                                              |
| Frontend Sentry (optional)                                                                              | not currently in `apphosting.yaml`                                                                                                          | add to `apphosting.yaml` — §6                                                                                                                                                                     |
| Functions **secrets**                                                                                   | Secret Manager, bound per function via `secrets: [...]`                                                                                     | `firebase functions:secrets:set <NAME>`: `GEMINI_API_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY` (and `PAYU_SALT` only if PayU is re-enabled) |
| Functions **non-secret params**                                                                         | gitignored `functions/.env.<project-id>`, picked up at deploy (`firebase.json` ignores only `*.local`)                                      | `PADDLE_ENVIRONMENT`, 11 × `PADDLE_PRICE_ID_*`, `APP_URL`, `META_APP_ID`, `META_REDIRECT_URI`, `META_GRAPH_API_VERSION`, `REEL_RENDERER_URL`, `REEL_RENDERER_API_KEY`, optional model overrides   |
| Functions emulator only                                                                                 | `functions/.env.local`                                                                                                                      | never deployed                                                                                                                                                                                    |

> `REEL_RENDERER_API_KEY` is read as a plain environment value in `functions/src/config/env.ts`; it is not
> bound with `secrets: [...]` in the code. Treat it as sensitive anyway and keep it out of git.

### 2.1 Verify configuration without printing secrets

```bash
# Functions secrets: metadata only (versions, state). `functions:secrets:get` does NOT print the value.
npx firebase functions:secrets:get PADDLE_API_KEY --project <project>
npx firebase functions:secrets:get PADDLE_WEBHOOK_SECRET --project <project>
npx firebase functions:secrets:get GEMINI_API_KEY --project <project>

# App Hosting secrets: metadata only.
npx firebase apphosting:secrets:describe NEXT_PUBLIC_PADDLE_CLIENT_TOKEN --project <project>

# Non-secret Functions params: list NAMES only, never values.
grep -oE '^[A-Z][A-Z0-9_]+' functions/.env.<project-id>

# Compare names required by code with names present (no values involved).
grep -oE 'PADDLE_PRICE_ID_[A-Z0-9_]+' functions/src/config/env.ts | sort -u
grep -oE '^PADDLE_PRICE_ID_[A-Z0-9_]+' functions/.env.<project-id> | sort -u
```

**Never run** `firebase functions:secrets:access` or `firebase apphosting:secrets:access`: they print the
secret value to the terminal.

Sanity checks that need no secrets: the Paddle environment, API key prefix (`pdl_sdbx_` vs `pdl_live_`) and
client token prefix (`test_` vs `live_`) must all agree; the code throws at runtime if they do not. Production
must have `NEXT_PUBLIC_USE_EMULATORS=false` (set explicitly in `apphosting.yaml`).

---

## 3. Local verification (run on the exact commit you intend to deploy)

```bash
git status                    # must be clean; deploy from a reviewed commit, not a dirty tree
npm ci                        # root install; the postinstall hook also installs functions/
npm run lint                  # frontend ESLint (--max-warnings 0)
npm run typecheck             # frontend tsc --noEmit
npm run functions:lint
npm run functions:typecheck
npm test -- --coverage=false  # frontend Jest
npm run functions:test        # functions Jest
npm run functions:build       # tsc -> functions/lib (what is deployed)
NEXT_PUBLIC_USE_EMULATORS=false npm run build   # production Next.js build; use real public values
```

Security-rules tests (as CI runs them; requires Java):

```bash
npx firebase emulators:exec --only firestore,auth,storage --project demo-mitra \
  "npm run test -- --testPathPattern=\"security\" --coverage=false"
```

Functions tests against emulators (as CI runs them):

```bash
npx firebase emulators:exec --only auth,firestore,storage --project demo-mitra \
  "npm --prefix functions run test -- --coverage=false"
```

**E2E** (Playwright, single golden-path spec). It needs the emulators and a locally running app:

```bash
npm run dev:emulators                                   # terminal 1: firebase emulators:start
NEXT_PUBLIC_USE_EMULATORS=true npm run build && NEXT_PUBLIC_USE_EMULATORS=true npm run start   # terminal 2
npx playwright test                                     # terminal 3 (E2E_BASE_URL defaults to http://localhost:3000)
```

The AI and payment steps need a Gemini key on the Functions emulator and Paddle sandbox config. **As of
2026-10-03 this suite fails at sign-up (see §0 blockers 2 and 3); do not treat E2E as a passing gate.**

The CI workflow (`.github/workflows/ci-cd.yml`) runs lint, typecheck, tests and build for both packages, plus
the rules tests, on pushes and PRs to `master` and `develop`.

---

## 4. Firebase

Services in use (from `firebase.json` and the code): **Authentication, Firestore, Storage, Cloud Functions
(Gen2, region `asia-south1`), App Hosting (backend `mitra-web`), App Check (reCAPTCHA Enterprise).** There is
**no Firebase Hosting block** — do not use `firebase deploy --only hosting`.

### 4.1 Project selection

```bash
npx firebase use                                  # show the active alias
npx firebase use default                          # alias -> <project> (dev points at the same project)
npx firebase deploy ... --project <project>       # prefer an explicit --project on every deploy
```

### 4.2 Emulators

Defined in `firebase.json`: Auth 9099, Functions 5001, Firestore 8080, Storage 9199, UI 4000.

```bash
npm run dev:emulators                                           # = firebase emulators:start
NEXT_PUBLIC_USE_EMULATORS=true npm run dev                      # frontend against the emulators
npm run functions:serve                                         # = build + emulators:start --only functions
```

### 4.3 Rules and indexes

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project <project>
npx firebase deploy --only storage --project <project>          # storage.rules
```

Run the rules tests (§3) first. Index builds can take time; new composite indexes serve queries only after
they finish building (Firebase console → Firestore → Indexes).

### 4.4 Frontend — App Hosting

The deployed frontend is Firebase App Hosting, driven by the root `apphosting.yaml`. Useful commands (all
exist in CLI 15.29.0):

```bash
npx firebase apphosting:backends:list --project <project>
npx firebase apphosting:backends:get mitra-web --project <project>
npx firebase apphosting:rollouts:create mitra-web --git-branch <branch> --project <project>
npx firebase apphosting:rollouts:create mitra-web --git-commit <sha>   --project <project>
```

> **[VERIFY] Branch topology.** On 2026-10-02 the console showed backend `mitra-web` with live branch
> `main`, and an older backend `ai-marketing-engine` (serving `www.brain-wise.com`) with live branch
> `master` and automatic rollouts on. Both read the same `apphosting.yaml`. Before pushing anything, run
> `apphosting:backends:get` for both and confirm which branch each tracks and which serves
> `www.brain-wise.com`. A push to the wrong branch redeploys the wrong backend. Branch/rollout settings
> are changed only in the console, by the owner.

`apphosting.yaml` references Secret Manager secrets for the Paddle token and 11 price IDs. **A missing
secret fails the build** (intended). Create them first and grant the backend access:

```bash
npx firebase apphosting:secrets:set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN --project <project>    # prompts for the value
npx firebase apphosting:secrets:grantaccess NEXT_PUBLIC_PADDLE_CLIENT_TOKEN --backend mitra-web --project <project>
# repeat for each NEXT_PUBLIC_PADDLE_PRICE_ID_* listed in apphosting.yaml
```

Also required in the Firebase console for the live domain: Authentication → Settings → **Authorized
domains** must include `www.brain-wise.com`, and the reCAPTCHA Enterprise key's allowed domains must include
it (a missing domain blocks sign-in with an App Check error).

### 4.5 Functions

**Never run an unscoped `firebase deploy --only functions` against production.** It deploys every exported
function and offers to delete deployed functions that are no longer exported (the Razorpay/PayU functions
are deployed but not exported). If the CLI proposes a deletion, answer **No** and stop.

```bash
npm run functions:build
npx firebase functions:list --project <project>        # what is deployed now
npx firebase deploy --only functions:<name>[,functions:<name2>] --project <project>
```

Common targeted sets: Paddle —
`functions:createPaddleCheckout,functions:cancelPaddleSubscription,functions:paddleWebhook`.
A secret change needs a redeploy of the functions that bind it. The full exported function list is in
`functions/src/index.ts`.

The CI job `deploy-backend-production` runs `firebase deploy --only functions` (unscoped) and is gated to a
manual `workflow_dispatch` on `master`; the staging job deploys on `develop`. Do not use the production CI
job for a Paddle-only change.

### 4.6 Scheduled functions

The functions exported from `index.ts` include scheduled jobs (`reconcileStaleReservations`,
`cleanupExpiredRateLimits`, `expireSubscriptions`, `processScheduledPublishJobs`, `processScheduledPosts`).
A functions deploy re-creates their schedules; check Cloud Scheduler after deploying.

### 4.7 Reel renderer (separate Cloud Run service)

`services/reel-renderer` is deployed independently of Functions and App Hosting, and is excluded from the App
Hosting upload (`.vercelignore`, `firebase.json` ignore). Commands are in its README:

```bash
cd services/reel-renderer && npm run build && npm run smoke-test
gcloud builds submit --tag asia-south1-docker.pkg.dev/<project>/reel-renderer/reel-renderer:latest .
gcloud run deploy reel-renderer --image asia-south1-docker.pkg.dev/<project>/reel-renderer/reel-renderer:latest \
  --region asia-south1 --no-allow-unauthenticated --memory 2Gi --cpu 2 --timeout 900s --concurrency 2
```

Then set `REEL_RENDERER_URL` (and, if used, `REEL_RENDERER_API_KEY`) in the Functions params and grant the
Functions service account `roles/run.invoker` on the service (exact command in the README). Without
`REEL_RENDERER_URL`, reel generation uses a mock renderer. Use the README's IAM and env instructions rather
than putting the API key on the command line.

---

## 5. Paddle

Full plan: `docs/PRODUCTION_PADDLE_DEPLOYMENT_RUNBOOK.md`. Summary of what to verify at deploy time:

**Configuration (names only).**

- Frontend: `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, 11 ×
  `NEXT_PUBLIC_PADDLE_PRICE_ID_*` (4 paid plans × monthly/yearly, plus `PACK_500`, `PACK_1200`, `PACK_3000`).
- Functions: secrets `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`; params `PADDLE_ENVIRONMENT` and 11 ×
  `PADDLE_PRICE_ID_*`.
- The two sets of price IDs must be identical (the client refuses checkout if they differ). Free has no price.
- Environment, API key prefix and client token prefix must agree (sandbox ⇄ production).

**Catalog.** `scripts/setup-paddle-catalog.mjs` is idempotent and dry-run by default; it reads the compiled
`functions/lib/config/pricing.js`:

```bash
npm run functions:build
PADDLE_API_KEY=<set in your shell, not on the command line history> node scripts/setup-paddle-catalog.mjs          # dry run
# --apply writes; production additionally requires --allow-production. Run only with explicit approval.
```

**Amounts must match the catalog.** `tests/pricingParity.test.ts` and
`functions/src/services/entitlements.pricingParity.test.ts` pin the frontend mirrors and entitlements to
`functions/src/config/pricing.ts`.

**Webhook.** URL pattern: `https://asia-south1-<project>.cloudfunctions.net/paddleWebhook`. Verify without
Paddle sending anything real:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://asia-south1-<project>.cloudfunctions.net/paddleWebhook            # expect 405 (GET)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://asia-south1-<project>.cloudfunctions.net/paddleWebhook   # expect 400 (no valid signature)
```

The notification destination is created in the Paddle dashboard (subscribed events and the per-destination
signing secret are listed in the Paddle runbook §5). Rotating the secret needs a `paddleWebhook` redeploy.

**Entitlement verification (Firestore, after a sandbox or first live purchase).** Check the user's
`subscriptions` doc (plan, status), the current `usage` doc (`creditsIncluded`, `bonusCredits`),
`paddle_grants`, `processed_webhook_events`, and a `transactions` record. Replaying the same notification
must not grant twice.

**Safe test procedure.** Use Paddle **Sandbox** only: sandbox keys on a deployment configured for sandbox,
a dedicated test user, a sandbox test card, the cheapest item (500-credit pack or Starter monthly), then
verify as above and replay once. Never mix sandbox and live values in one deployment. **Do not make a real
purchase** except the deliberate first live payment described in the Paddle runbook §6.

---

## 6. Sentry (monitoring)

State: the SDK is wired (`src/instrumentation-client.ts`, `src/instrumentation.ts`, `next.config.ts`) with
scrubbing for events, transactions and breadcrumbs (`src/lib/sentryScrub.ts`, 71 tests). **No DSN is
configured**, so the SDK sends nothing today.

To enable (names only; values go in the secret store/console, never in git):
`NEXT_PUBLIC_SENTRY_DSN` (browser), `SENTRY_DSN` (server and edge), `NEXT_PUBLIC_SENTRY_RELEASE`,
`SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` (build-time, secret). Add them to `apphosting.yaml`
(`NEXT_PUBLIC_*` need `BUILD` availability; `SENTRY_AUTH_TOKEN` should be a `secret:` reference).

Verify after deploy:

1. Open the site with the browser dev tools Network tab and look for requests to the Sentry ingest host from
   the page (performance sampling is 10 %, `tracesSampleRate: 0.1`, so reload several times). Their payloads
   must show no emails, tokens or `oobCode` values.
2. In Sentry → Issues/Performance, confirm events arrive with the expected `release` and `environment`.
3. Inspect one event: request URL query parameters appear as `[REDACTED]`, no cookies/headers, user shows
   only an id.

There is no dedicated "send a test error" route in the app; do not add debug endpoints to production for
this. If an end-to-end check is required, use a preview deployment.

---

## 7. Deployment — exact order

Run only after §0 blockers are cleared and §3 is green on a clean commit.

1. **Freeze and tag.** Commit the reviewed change; record the SHA: `git rev-parse HEAD`.
2. **Config check** (§2.1): secrets exist, price ID names match, `PADDLE_ENVIRONMENT` is correct.
3. **Rules and indexes** (if changed): `npx firebase deploy --only firestore:rules,firestore:indexes --project <project>`; then `--only storage` if `storage.rules` changed.
4. **Reel renderer** (only if `services/reel-renderer` changed): §4.7, then smoke test it.
5. **Functions** (targeted by name, §4.5): build, `functions:list` to record the current state, deploy the named functions, `functions:list` again.
6. **Frontend**: land the commit on the backend's live branch (or `apphosting:rollouts:create`), then watch the rollout in the console (Cloud Build → Cloud Run). Confirm which backend serves the domain first (§4.4).
7. **Smoke test** (§8) immediately.
8. **Watch** logs and Sentry for 30 minutes (§10).

---

## 8. Smoke testing (post-deploy)

Use a dedicated test account (recognisable email pattern), real mobile device plus desktop. Record the test
user's uid so it can be cleaned up.

- [ ] `GET /api/health` on the production host returns 200 (liveness only).
- [ ] Callable `healthCheck` responds (returns `status: ok`, `environment: production`).
- [ ] **Homepage** loads; no console errors; no dev overlay or inspector toolbar; social preview shows the right title and image.
- [ ] **Signup** (new email, Terms ticked) succeeds; no `appCheck` / recaptcha errors; verification email arrives.
- [ ] **Login / Logout** works; protected pages redirect when logged out.
- [ ] **Onboarding** completes; business saved.
- [ ] **Campaign creation** starts and reaches `generating`; credits reserved.
- [ ] **AI generation** completes: copy, Truth Check result, no `failed` state.
- [ ] **Image generation**: hero image and composited poster/story variants render.
- [ ] **Reel flow**: upload clips → generate; with renderer configured, a real video is produced (mock output means `REEL_RENDERER_URL` is unset).
- [ ] **Pricing page** shows localized prices from Paddle; Billing page shows the correct plan.
- [ ] **Subscription**: Paddle checkout opens with the right price (sandbox test or the planned first live payment only).
- [ ] **Entitlements / credits**: after a purchase, plan and credits match §5 verification; replay grants nothing twice.
- [ ] **Cancel** a test subscription; status becomes cancel-scheduled; access continues to period end.
- [ ] **Mobile**: layout at phone width, tap targets, keyboard does not hide inputs, add-to-home-screen icon looks right.
- [ ] **Offline**: toggle airplane mode; the offline banner appears and the form input is kept.
- [ ] Check Cloud Logging for new errors (§10) and Sentry for new issues.

---

## 9. Rollback

Use the smallest rollback that fixes the problem. Record the current state first (`functions:list`,
`apphosting:backends:get`, current SHA).

| Layer                  | Rollback                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend (App Hosting) | Create a rollout of the previous known-good commit: `npx firebase apphosting:rollouts:create mitra-web --git-commit <previous-sha> --project <project>`. The console also lists past rollouts. App Hosting auto-rollouts follow the live branch, so also stop or revert the bad commit on that branch or the next push redeploys it. |
| Functions              | Check out the previous commit, `npm run functions:build`, and redeploy **the same named functions**: `npx firebase deploy --only functions:<name> --project <project>`. Gen2 functions are Cloud Run services; traffic can also be moved to an earlier revision in the Cloud Run console **[VERIFY]**.                               |
| Rules / indexes        | Re-deploy the previous `firestore.rules`, `firestore.indexes.json`, `storage.rules` from git. Indexes added by a bad deploy can be left in place.                                                                                                                                                                                    |
| Reel renderer          | Cloud Run console → revision routing, or redeploy the previous image tag.                                                                                                                                                                                                                                                            |
| Paddle catalog         | Prices can be archived, not deleted; the setup script never archives or deletes.                                                                                                                                                                                                                                                     |
| Secrets                | Secret Manager keeps versions; a bad value is fixed by adding a new version and redeploying the functions that bind it.                                                                                                                                                                                                              |
| Data                   | **No automated data rollback exists in the repo.** Whether Firestore point-in-time recovery or backups are enabled is **[VERIFY]** in the console. Do not edit billing documents by hand to "undo" a deploy.                                                                                                                         |

If the Paddle path must be disabled quickly: deactivate the notification destination in the Paddle dashboard
(reversible), and make checkout unavailable (it fails closed when a price ID or client token is missing).
Payments that succeeded in Paddle while the webhook was off will need reconciliation afterwards.

---

## 10. Incident response

**Where logs live**

- Cloud Functions: Cloud Logging for `<project>` (Logs Explorer, resource _Cloud Run Revision_ / _Cloud
  Function_, region `asia-south1`); CLI: `npm run functions:logs` (= `firebase functions:log`). Functions emit
  structured logs via `functions/src/utils/logging.ts`, which redacts secrets.
- Frontend: Cloud Run logs for the `mitra-web` service (region `asia-southeast1`) and Cloud Build logs for
  failed builds; also App Hosting → rollouts in the Firebase console.
- Client/server exceptions: Sentry, once the DSN is configured (§6).
- Payments: Paddle dashboard → Developer tools → Notifications (delivery log), and Firestore
  `processed_webhook_events` / `paddle_grants`.

**Identify a failed deployment**

```bash
npx firebase functions:list --project <project>                 # missing/old functions
npx firebase apphosting:backends:get mitra-web --project <project>   # serving rollout
curl -s -o /dev/null -w "%{http_code}\n" https://<production-host>/api/health
```

Compare with the state you recorded before the deploy; check the failed rollout's Cloud Build log.

**Disable or roll back safely** — see §9. Prefer reversible switches (deactivate a webhook destination, roll
the frontend back) over deleting anything.

**Never change during an incident**

- Do not run an unscoped `firebase deploy --only functions`, and never confirm a deletion prompt.
- Do not switch `PADDLE_ENVIRONMENT`, swap sandbox/live keys, or re-point price IDs.
- Do not rotate the webhook secret without immediately redeploying `paddleWebhook`.
- Do not hand-edit `subscriptions`, `usage`, `transactions`, `paddle_grants` or `processed_webhook_events`.
- Do not loosen Firestore/Storage rules, disable App Check enforcement, or add authorized domains "to see if
  it helps".
- Do not delete or recreate the Paddle notification destination (reuse and update it).
- Do not print secrets (`*:secrets:access`) or paste them into chat or tickets.
- Do not force-push or rewrite the history of a branch App Hosting deploys from.

---

## 11. Release checklist

**Code and CI**

- [ ] Deploying from a clean, reviewed commit; SHA recorded
- [ ] Node 20.x, npm 11.12.1, Firebase CLI 15.29.0
- [ ] `npm run lint` and `npm run functions:lint` pass
- [ ] `npm run typecheck` and `npm run functions:typecheck` pass
- [ ] Frontend and functions unit tests pass; rules tests pass
- [ ] `npm run build` and `npm run functions:build` pass
- [ ] E2E golden path passes (currently failing — §0)
- [ ] §0 blockers resolved or explicitly accepted in writing

**Configuration**

- [ ] `.env.example` matches the code; no secret in git (`git status`, `git diff`)
- [ ] All `apphosting.yaml` secrets exist and are granted to the backend
- [ ] Functions secrets exist (`functions:secrets:get`, metadata only)
- [ ] `functions/.env.<project-id>` has the required parameter names
- [ ] `NEXT_PUBLIC_USE_EMULATORS=false`; no `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`
- [ ] Paddle environment, API key prefix and client token prefix agree; price IDs identical on both sides
- [ ] `META_TOKEN_ENCRYPTION_KEY` set to a real random value
- [ ] Authorized domains and reCAPTCHA domains include the production host

**Platform**

- [ ] App Hosting backend/branch topology confirmed (§4.4)
- [ ] Paddle: domain approved, default payment link set, notification destination points at the deployed `paddleWebhook`, signing secret set
- [ ] Reel renderer deployed and `REEL_RENDERER_URL` set (or reels knowingly in mock mode)
- [ ] Cloud Scheduler jobs present after the Functions deploy
- [ ] Sentry DSN configured, or reduced monitoring knowingly accepted

**After deploy**

- [ ] Smoke tests (§8) all pass
- [ ] Test users and test billing data cleaned up
- [ ] Logs and Sentry watched for 30 minutes with no new error class
- [ ] Rollback target (previous SHA, previous function state) written down
