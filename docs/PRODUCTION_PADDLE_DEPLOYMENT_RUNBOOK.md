# Production Paddle deployment — runbook (NOT executed)

**Status: plan only. Nothing in this document has been run.** Paddle Sandbox has been verified end to end
(checkout → signed webhook → Firestore → credits, replay-safe; cancellation; local emulator + tunnel).
The live Paddle catalog exists (see below). Nothing is deployed to production. Do not treat the sandbox
result as production proof: the deployed-function path, live checkout and live webhook are all untested.

Legend: **[YOU]** you run it / only you can do it · **[ME]** I can do it, after showing you the exact action ·
**[GATE]** do not continue until it passes.

---

## Decisions recorded (founder, 2026-10-02)

1. **No separate staging Firebase project.** Sandbox verification runs on the existing Firebase project
   (**Option B**), with clearly identified, dedicated test users and test billing data. Sandbox credentials
   are used only for sandbox; never mixed with live. Existing production user/payment data and the
   PayU/Razorpay infrastructure are not modified or deleted. All test data is to be identified and cleaned
   up before launch. No second Firebase project unless a real technical requirement appears.
2. **Production frontend = Vercel.** Firebase stays the backend (Auth, Firestore, Storage, Functions).
   Frontend config goes in **Vercel environment variables**; server credentials in Firebase secrets.
   `x-vercel-ip-country` feeds the existing Paddle country-localization logic.
3. **Legal decisions D1–D6** — see `docs/LEGAL_PADDLE_WORDING_DRAFT.md` (pending founder answers).

### Consequences of these decisions (read before deploying anything)

- **One Functions deployment = one Paddle environment at a time.** The deployed Paddle functions read a
  single `PADDLE_ENVIRONMENT`, API key and webhook secret. While they run in *sandbox* mode on the
  production project, **no real customer may be offered checkout**: a real customer clicking Subscribe
  would get a sandbox checkout (no real payment, but they would believe they paid). Keep the Paddle UI
  unreachable by real users during the sandbox window — e.g. verify through a **Vercel Preview deployment**
  (sandbox `NEXT_PUBLIC_PADDLE_*` values, Preview scope only) while the Production deployment still has no
  live Paddle UI. Switching to live is a *cut-over*: swap secrets + env, redeploy the three functions, then
  enable the Production frontend.
- **Vercel env scoping:** set the **sandbox** token and sandbox price IDs only in the *Preview* (and
  *Development*) scopes and the **live** values only in *Production*. `NEXT_PUBLIC_*` values are inlined at
  build time, so a change needs a new Vercel build/redeploy. Never let a Preview deployment build with the
  live token.
- **Domains to register on the Vercel hostname(s):** Firebase Auth → Authorized domains; reCAPTCHA/App Check
  site-key domains; Paddle → approved checkout domain (+ default payment link). A `*.vercel.app` preview
  hostname will not be approved for live Paddle checkout.
- **Test-data hygiene on the shared Firestore:** use test users with a recognisable email pattern (e.g.
  `paddle-sandbox-*@…`), record their UIDs, and delete those users and their `users/subscriptions/usage/
  transactions/paddle_grants/processed_webhook_events` documents before launch. Sandbox Paddle customer
  and transaction IDs live only in Paddle Sandbox.
- **The webhook secret is per destination:** the sandbox and live destinations have different secrets, and
  the function verifies against one secret at a time, so sandbox and live events can never be accepted
  concurrently by one deployment. This is the safe direction.

---

## 0. Hard rules (learned from the repo, not assumed)

1. **Never run `firebase deploy --only functions` against production.** It deploys *every* exported
   function and offers to **delete** deployed functions that are no longer exported. The deployed project
   currently still has the Razorpay/PayU functions (`createSubscription`, `cancelSubscription`,
   `verifyPayment`, `razorpayWebhook`, `createPayUPayment`, `payuWebhook`, `payuCallback`), none of which
   `functions/src/index.ts` exports. The CI job `deploy-backend-staging` uses exactly that command — it
   must not be pointed at production.
2. **Deploy only the three Paddle functions, by name:**
   `firebase deploy --only functions:createPaddleCheckout,functions:cancelPaddleSubscription,functions:paddleWebhook --project <prod>`
   (If the CLI proposes deleting anything, answer **No** and stop.)
3. **`.firebaserc` maps both `default` and `dev` to the same project (`brainwise-ai-marketing-engine`).**
   There is no separate dev project, so every deploy from this repo targets production unless you pass a
   different `--project`. A staging project may exist (CI references `FIREBASE_PROJECT_ID_STAGING`); see §2.
4. **The working tree has 553 uncommitted changes on `master`** (289 modified, 251 untracked, 13 deleted),
   far beyond the billing work. A Functions deploy builds the whole `functions` codebase from the working
   tree, so it would ship unreviewed, unrelated changes (some with known failing emulator tests in
   analytics/onboarding). **Deploy from a clean, reviewed commit**, never from this dirty tree.
5. **Sandbox and live values must never mix.** The code fails loudly if `PADDLE_ENVIRONMENT`, the API key
   (`pdl_sdbx_…` vs `pdl_live_…`) or the client token (`test_…` vs `live_…`) disagree.
6. **Rotate every key that has appeared in chat** (two sandbox API keys, one live API key) before using
   live credentials for anything real.

---

## 1. Live Paddle state (verified read-only, 2026-10-02)

| Item | State |
| ---- | ----- |
| Catalog | **Created**: 5 products, 11 INR prices, no trials, amounts equal `pricing.ts` (India previews total exactly Mitra's prices, GST-inclusive). Re-running the script reports 0 changes. |
| Notification destinations | **0** |
| Approved checkout domains | **0** |
| Default payment link | not set (dashboard only) |
| Subscriptions / transactions | 0 / 0 |
| Account approval | unknown (not visible via the API) |

Live price IDs (not secrets) are in the project notes and the script output; they go into **both**
`PADDLE_PRICE_ID_*` (Functions) and `NEXT_PUBLIC_PADDLE_PRICE_ID_*` (Next.js).

---

## 2. Decide the path (recommended: staging first)

| Option | What it proves | Notes |
| ------ | -------------- | ----- |
| **A. Deploy to a separate staging Firebase project against Paddle *Sandbox*** | The real deployed-function path (secrets, public webhook URL, App Check, IAM) with zero live risk | Needs a staging project. CI already references one (`FIREBASE_PROJECT_ID_STAGING`) — **[YOU]** confirm it exists. Strongly recommended before any production deploy. |
| **B. Deploy the three functions to production with Paddle *Sandbox* config** | Same, but on the live project | Runs sandbox payments inside the production Firestore (test data in prod). Acceptable only with a dedicated test account and clean-up. |
| **C. Straight to production with live Paddle** | Nothing beforehand | Not recommended. |

Chosen path: **B** (see Decisions recorded). Do it completely — including §5 — before §6 (live).

---

## 3. Preconditions **[GATE]**

- [ ] Billing/Paddle changes are on a reviewed commit/branch, separate from the 553-file working tree; the
      deploy is run from a clean checkout of that commit.
- [ ] Legal pages updated (see `docs/LEGAL_PADDLE_WORDING_DRAFT.md`, decisions D1–D6 made). Paddle reviews
      the site before enabling live payments.
- [ ] Production frontend host confirmed — the repo has an `apphosting.yaml` (Firebase App Hosting) **and**
      CI comments saying Vercel deploys the frontend. **[YOU]** state which one serves the live site; the
      `NEXT_PUBLIC_*` variables below must be set *there*.
- [ ] `npm test` (frontend + functions), typecheck, lint and `next build` green on that commit (currently:
      807 frontend / 876 functions tests pass; build succeeds).
- [ ] All exposed keys rotated.

---

## 4. Configuration to prepare (names only — values never go in chat or git)

**Functions (Firebase secrets — [YOU] via `firebase functions:secrets:set`):**
`PADDLE_API_KEY` (server key, `pdl_live_…` for live / `pdl_sdbx_…` for staging) and
`PADDLE_WEBHOOK_SECRET` (created together with the destination in §5/§6).
Both are currently **not** in Secret Manager (`PADDLE_API_KEY` returned "not found").

**Functions (non-secret env — a gitignored `functions/.env.<projectId>` file picked up at deploy):**
`PADDLE_ENVIRONMENT` (`sandbox` | `production`, **no default**), `APP_URL`, and the 11 `PADDLE_PRICE_ID_*`.
Note `firebase.json` ignores only `*.local`, so a `.env.<projectId>` file *is* deployed.

**Frontend host:**
`NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (`test_…` / `live_…`) and the 11
`NEXT_PUBLIC_PADDLE_PRICE_ID_*`. Confirm `NEXT_PUBLIC_USE_EMULATORS` is `false` in production.

---

## 5. Staging/sandbox verification on deployed functions (Option A or B)

1. **[YOU]** set secrets (sandbox key for now) and deploy the three functions by name (rule 2).
2. **[ME]** confirm the deployed URL answers: `GET …/paddleWebhook` → 405; unsigned POST → 400.
3. **[ME, after showing you the exact action]** create the sandbox notification destination at the deployed
   URL (not the temporary tunnel; the old one `ntfset_01m3xfwy5n…` is deactivated), subscribed to:
   `transaction.completed`, `transaction.payment_failed`, `subscription.created/activated/updated/
   past_due/paused/resumed/canceled`, `adjustment.created/updated`; traffic source `all`.
   **[YOU]** `firebase functions:secrets:set PADDLE_WEBHOOK_SECRET`, redeploy `paddleWebhook` (a secret
   change needs a new deploy).
4. **[YOU]** set the sandbox **default payment link** to the staging/production site (approved domain).
5. **[YOU + ME]** repeat the proven tests on the deployed stack: Starter monthly, Starter yearly, 500-credit
   pack, replay (no double grant), cancellation — verifying Firestore after each.
6. **[GATE]** Billing and Welcome show the right plan/credits in a normal browser; no console errors.

---

## 6. Live cut-over (only after §5 passes)

1. **[YOU]** Paddle live dashboard: add and **approve the real Mitra domain**; set the **default payment
   link**; confirm account/business verification is complete. (Not doable via API.)
2. **[YOU]** Create a **fresh** live server API key (catalog/transactions/subscriptions/customers scope — not
   full admin) and a live **client-side token** (`live_…`).
3. **[YOU]** Set production secrets/env/frontend variables (§4) with **live** values and
   `PADDLE_ENVIRONMENT=production`.
4. Deploy the three functions by name to production (rule 2) from the clean commit; deploy the frontend.
5. **[ME, after showing you the exact action]** create the **live** notification destination at the real
   production webhook URL. **[YOU]** set `PADDLE_WEBHOOK_SECRET` and redeploy `paddleWebhook`.
6. **[GATE] First live payment** — you, a real card, the cheapest option (500-credit pack ₹499 or Starter
   monthly), then verify: Paddle live transaction → webhook delivered (200) → Firestore plan/credits →
   `/welcome` → Billing. Then **replay** the notification once and confirm no second grant.
7. Refund that first payment from the Paddle dashboard; note what Mitra does (it logs the adjustment for
   manual review and does **not** claw back credits — decide policy D1).

## 7. Rollback

- **Fastest kill switch:** deactivate the live notification destination (reversible) — but then payments
  succeed in Paddle without granting credits, so also remove/hide the Subscribe buttons or set the
  frontend variables so checkout is disabled (checkout fails closed if a price ID or token is missing).
- **Code:** redeploy the previous commit's three functions by name. PayU/Razorpay functions were never
  removed, so the old path still exists; re-point `src/app/billing/page.tsx` to it only if you decide to
  roll back to PayU.
- **Catalog:** prices can be archived, not deleted; the script never archives or deletes.

## 8. Known gaps (not blocking sandbox, but real before launch)

- No in-place plan upgrade (users must cancel and re-subscribe).
- Real **renewal** cannot be fast-forwarded in the sandbox; it is covered by emulator tests only. First
  live renewal is therefore the first real proof — watch it.
- Refunds are not automated (logged for manual review).
- Top-up credits are per calendar month and do not roll over (needs policy D3).
- `/cancellation` has no page of its own (it redirects to `/refund`).

## 9. Production configuration readiness (2026-10-02) — names only, NOT deployed

Production web = **Firebase App Hosting → backend `mitra-web` → branch `master`**, canonical `https://www.brain-wise.com`. Vercel is not production.

**Web (`apphosting.yaml`, backend `mitra-web`)** — `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production` is a plain value; the client token and the 11 price IDs are Secret Manager references (secret ID = variable name). Create each secret once with `firebase apphosting:secrets:set <NAME>` and grant the backend access when prompted:
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_ID_{STARTER,BUSINESS,PRO,AGENCY}_{MONTHLY,YEARLY}`, `NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_{500,1200,3000}`. The token must start `live_`. A missing secret fails the build (intended); do not merge to `master` before they exist. No Paddle live values for local dev or previews.

**Functions** — secrets (new, rotated values only; enter via the CLI prompt, never in chat/files): `firebase functions:secrets:set PADDLE_API_KEY`, `firebase functions:secrets:set PADDLE_WEBHOOK_SECRET`. Params in the gitignored `functions/.env.<project-id>` at deploy time: `PADDLE_ENVIRONMENT=production` and `PADDLE_PRICE_ID_{STARTER,BUSINESS,PRO,AGENCY}_{MONTHLY,YEARLY}`, `PADDLE_PRICE_ID_PACK_{500,1200,3000}`. Mismatched environment/key prefixes throw at runtime by design.

**Mapping** — 11 price variables = 4 paid plans x {monthly, yearly} + 3 credit packs. Free has no Paddle price. No notification-destination ID is read by any code; `paddleWebhook` needs only the signing secret (idempotency is keyed on the event/transaction, not the destination).

**Manual, not done by code:** rotate/revoke the live API key and webhook secret that were pasted in chat; Firebase Console → Authentication → Settings → Authorized domains must include `www.brain-wise.com`; attach `www.brain-wise.com` to `mitra-web` (App Hosting → Domains) and confirm the backend's live branch is `master`; Paddle dashboard: default payment link, domain approval, payouts/business verification; update the live destination URL in place after `paddleWebhook` is deployed.
