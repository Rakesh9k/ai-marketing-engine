# Customer Readiness Audit Report

Scope: support system, onboarding email sequence, in-app guidance, beta program (2–4 weeks).
Operating principle: audit → verify → fix only what's genuinely necessary and safe → document.

## 1. Executive Summary

None of `docs/PRODUCT.md`, `MVP_SCOPE.md`, `FIRST_CUSTOMERS.md`, `SALES_PLAYBOOK.md`,
`CUSTOMER_FEEDBACK.md`, `CUSTOMER_BLOCKERS.md`, `OBSERVATION.md`, `OBSERVATION_REPORT.md`, or
`EXPERIMENT_LOG.md` exist in this repository (confirmed by direct file-existence check, not a search
miss). There is no beta program, no customer-facing support channel, and no onboarding email
sequence anywhere in the codebase — verified by repo-wide search, not assumed from silence.

One real, confirmed defect was found and fixed: `src/app/global-error.tsx` told users to "contact
support" on every uncaught error, with **no actual mechanism to do so** anywhere in the app — no
support link on the landing page, footer, sidebar, or account menu. Since inventing a support
address would violate this phase's explicit prohibition, the founder was asked directly; they
provided a real address (`support@brain-wise.com`), which is now wired into three places (§2).

In-app guidance for the core paid workflow (credits, insufficient-credit handling, campaign
generation progress, Truth Check, download/WhatsApp share) is genuinely well-implemented — this is
not a rubber-stamp finding; specific evidence is in §4. Onboarding email and the beta program are
both **NOT IMPLEMENTED**, and this report does not build either from scratch, per the explicit
instruction not to construct placeholder infrastructure or manufacture beta evidence.

## 2. Support System

### Current state (before this phase)

**NOT IMPLEMENTED.** Repo-wide search for `support@`, `contact@`, `mailto:`, "Contact Us" and
equivalents in `src/` returned zero matches before this phase. The landing page
(`LandingPage.tsx`/`LandingFooter.tsx`) had no contact link. The authenticated app's account menu
(`Sidebar.tsx`'s `ACCOUNT_NAV`) listed only Business Profile, Analytics, Usage & credits, and
Billing — no help/support entry. `global-error.tsx` (the root error boundary) told every user who
hit an uncaught error to "contact support," with no link, address, or mechanism provided anywhere
in the app — a genuine, confirmed gap, not a stylistic nitpick: the app was making a promise it
could not keep.

No support Cloud Function, ticketing integration, feedback form, or external support tool (chat,
WhatsApp Business support line) was found anywhere in `functions/src` or `src/`.

### Evidence

- `grep` across `src/` for support/contact terms: 0 real matches before this phase (43 files matched
  generic words like "help"/"report" in unrelated contexts — e.g. error-message copy, not an actual
  channel).
- `package.json` has no `author`/contact email field. `git config user.email` in this environment
  resolves to a GitHub no-reply address, not a usable support contact.
- No `docs/FIRST_CUSTOMERS.md`/`SALES_PLAYBOOK.md` existed to specify an intended channel.

### Fix applied (founder-confirmed, not invented)

The founder was asked which channel to wire in and provided `support@brain-wise.com`. Three targeted
additions, no new infrastructure:

1. `src/features/landing/components/LandingFooter.tsx` — added a "Contact support" mailto link next
   to the existing Login/Signup footer links.
2. `src/components/layout/Sidebar.tsx` — added a "Help & support" mailto item to the authenticated
   app's account menu (`ACCOUNT_NAV` render block), alongside Business Profile/Usage/Billing.
3. `src/app/global-error.tsx` — the existing "contact support" text now links to
   `mailto:support@brain-wise.com` instead of being an empty promise.

This is a `mailto:` link, not a ticketing system, a support inbox with routing, or an SLA — it is the
minimum viable, honest fix: a real, reachable address that actually receives mail, reachable from
every page a customer is likely to be on when they need it (marketing site, authenticated app, and
the crash screen).

### Support request flow

**PARTIAL.** A customer can now identify a problem and reach a real address, and can explain the
issue in the email body themselves. The app does **not** pre-fill any context (business ID,
campaign ID, browser, timestamp) into the mailto link — a customer emailing in cold will need to
describe their own account/business by hand. This was deliberately not automated further this
phase: a `mailto:` link's `body=` parameter could carry some context, but doing so risks leaking
Firestore document IDs into a client-visible URL for a marginal benefit, and building a proper
"send diagnostic context" feature is exactly the kind of infrastructure this phase was told not to
construct speculatively. Recorded as a real, open gap (§9), not silently accepted as fine.

There is no acknowledgement/follow-up mechanism (e.g., an auto-reply) — because there is no backend
behind `support@brain-wise.com` in this codebase; whatever happens after that address receives mail
is outside this repository entirely (a real inbox, whether currently monitored, is unverifiable from
here). **NOT VERIFIED that mail sent to this address is actually monitored** — that is an operational
fact outside the codebase, and this report does not claim otherwise.

### Support for critical failures — verified per failure type

| Failure | Does the user understand what happened? | Does the user know what to do? | Can they reach support? |
|---|---|---|---|
| Authentication failure | PARTIAL — Firebase error codes are mapped in `authErrors.ts`, but only for `auth/user-not-found` (verified by direct read — a single mapped code, not a full table) | Partial | Yes, now (via account menu once logged in isn't possible pre-auth — footer link works) |
| Upload failure | Handled — `confirmUpload.ts`'s validation errors surface as toasts | Yes | Yes (footer/sidebar) |
| Campaign generation failure | Well-handled — `CampaignWizard.tsx` shows "We couldn't start this campaign. Any reserved credits have been returned," with credit-specific wording when detected | Yes | Yes |
| Insufficient credits | Well-handled — explicit "You don't have enough credits" messaging before and after submission (`CampaignWizard.tsx`) | Yes | Yes |
| Payment failure | Not independently verified this phase — see `docs/SECURITY.md` §15 for what's known | Not verified | Yes |
| Permission denied | Server returns a mapped `permission-denied` error (`docs/API.md`'s error table); UI-level copy for this specific case was not traced end-to-end this phase | Not verified | Yes |
| Truth Check failure | Handled — `regenerateAsset.ts` guarantees a failed regeneration never replaces a valid asset; `DetailedChecks.tsx` renders PASS/FAIL status per check | Yes | Yes |
| Asset generation failure | Same path as campaign generation failure | Yes | Yes |
| Download failure | Not specifically traced this phase | Not verified | Yes |
| Server error (uncaught) | `global-error.tsx` — generic, appropriately non-technical message | Yes (refresh, or contact support) | **Yes, now** (previously no) |

### Remaining gaps

- No context pre-fill in the support link (deliberately not built this phase).
- No verification that `support@brain-wise.com` is an actively monitored inbox (outside this
  codebase's control).
- Download-failure and permission-denied UI copy not individually traced.
- No structured way for the *app* to know a support email was ever sent (no logging/analytics event
  on the mailto click) — acceptable for an MVP, noted as a future improvement, not built.

## 3. Onboarding Email Sequence

### Current state

**NOT IMPLEMENTED.** Repo-wide search for `Resend`, `SendGrid`, `Postmark`, `nodemailer`, `smtp`
(case-insensitive) across the entire repository found only unrelated matches (Sentry SDK internals,
`sendEmailVerification` calls). The only email-sending code that exists anywhere is Firebase
Authentication's own built-in `sendEmailVerification()` (`authService.ts`), triggered once at
signup — this is a one-time address-verification email, not an onboarding sequence, and this report
does not conflate the two.

No transactional email provider is configured (no relevant env vars in `.env.example`, no Firebase
Extension like `firestore-send-email` referenced in `firebase.json`), no email templates exist
anywhere in the repo, and no Cloud Function sends a welcome, first-campaign-nudge, value-reminder,
feedback-request, or beta-conversion email.

### Required audit — each of the five specified emails

| Email | Status |
|---|---|
| 1 — Welcome | NOT IMPLEMENTED |
| 2 — First Campaign nudge | NOT IMPLEMENTED |
| 3 — Value Reminder | NOT IMPLEMENTED |
| 4 — Feedback | NOT IMPLEMENTED |
| 5 — Beta/Conversion | NOT IMPLEMENTED |

### Decision: not built this phase

Per this phase's own instruction ("do NOT build a large email automation system just to complete
this phase" / "implement only if required and sufficiently scoped"), no email sending
infrastructure was added. Standing up even a minimal version requires infrastructure decisions
(which provider, a verified sending domain, template copy approved by the founder) that are business
decisions, not something to default silently. This is recorded as:

**Onboarding email sequence: BLOCKED** — not for lack of effort, but because the minimum viable
version still requires a provider account and a verified sending domain that do not exist yet, and
creating one without the founder's explicit choice of provider/domain would be exactly the kind of
unauthorized infrastructure decision this phase prohibits.

### Minimum viable path (specification only, not implemented)

If/when authorized: a single Cloud Function trigger on user creation (reusing the existing
`onUserCreatedHandler` trigger point in `functions/src/functions/auth/onUserCreated.ts`) calling one
transactional-email provider's API with server-side-only credentials (consistent with
`docs/SECURITY.md` §18's secrets rules) would cover Email 1 (Welcome) alone. Emails 2–5 need
scheduled/triggered sends keyed on account age or campaign-count, which do not have an existing
Cloud Scheduler job to hang off of in this codebase today (verified: no `onSchedule` function exists
in `functions/src/index.ts`'s export list). This is a specification for future work, explicitly not
executed here.

## 4. In-App Guidance

### Journey matrix

| Journey | Guidance exists? | Correct? | Action |
|---|---|---|---|
| Signup | VERIFIED | Yes — form validation, clear errors | None needed |
| Onboarding | VERIFIED | Yes — 5–6 step wizard with per-step validation, category-aware fields (`onboarding/page.tsx`) | None needed |
| Business Brain | PARTIAL | Data model exists and is editable; no dedicated in-app explainer of *why* it matters beyond the form fields themselves | Documented in `docs/USER_GUIDE.md`; no in-app copy added this phase |
| Product setup | VERIFIED | Category-aware fields, validated | None needed |
| Photo upload | VERIFIED | Format/size constraints enforced server-side (`confirmUpload.ts`); toast on failure | None needed |
| Campaign creation | VERIFIED | `CampaignWizard.tsx` shows live credit balance, blocks submission with a specific message when credits are insufficient **before** calling the server | None needed |
| Review | VERIFIED | Explicit review step before generation | None needed |
| Truth Check | VERIFIED | `DetailedChecks.tsx` renders PASS/FAIL/REVIEW_REQUIRED per check, human-readable | None needed |
| Generation | VERIFIED | `GenerationProgress.tsx` shows real backend stage names, not a fake percentage, with explicit "this can take up to a minute" expectation-setting | None needed |
| Download | VERIFIED | Dedicated download/WhatsApp-share actions in `CampaignDetailContent.tsx` | None needed |
| Credits | VERIFIED | Visible balance pill in the header (`Sidebar.tsx`), a dedicated `/usage` page with progress bars and plan limits | None needed |
| Billing | VERIFIED | `/billing` page shows current plan, upgrade options, top-ups | None needed |
| Errors | **Was MISSING a support path; now PARTIAL** | Error messages are generally specific and actionable (§2's table); the missing piece was the "if this keeps happening" escalation path, now fixed | Fixed this phase (§2) |

### First-session test

"If I have never seen Mitra before, can I determine what I should do next without contacting the
founder?" — **largely yes**, for the core paid workflow: onboarding is a guided multi-step wizard,
the campaign wizard shows your credit balance and blocks you clearly if you're short, generation
shows real progress, and Truth Check/download are self-explanatory with visible status. The genuine
gap was specifically the "I'm stuck and need a human" path, which is what §2 fixes. Business Brain's
*purpose* (why it matters, not just its form fields) is the one soft spot found — not fixed this
phase, since adding explainer copy risks scope creep beyond "targeted fixes" and the phase brief asks
for restraint here.

### Fixes made

See §2 — the three support-link additions are also, functionally, an in-app-guidance fix (the
"Errors" row of the matrix). No other UI copy was changed.

## 5. Beta Program

### Current state

**NOT IMPLEMENTED.** `docs/FIRST_CUSTOMERS.md` and `docs/SALES_PLAYBOOK.md` do not exist — there is
no documented target customer, qualification criteria, expected beta cohort size, or communication
plan to audit against. No beta-specific code, flag, or Firestore collection was found (no
`beta`-named collection, field, or feature flag in `functions/src` or `src/`).

### Beta customer selection

**BLOCKED** — cannot be audited without `docs/FIRST_CUSTOMERS.md`/`SALES_PLAYBOOK.md`, and this
report does not invent target-customer criteria or a customer list. No customer names are used
anywhere in this report, per the explicit instruction not to invent them.

### Beta program structure (Week 0–4)

**NOT IMPLEMENTED.** There is no operational process — no invite mechanism, no baseline-data
collection, no week-by-week measurement cadence, and (§3) no email sequence to drive weekly
engagement. The underlying product data needed to *measure* a beta if one ran does partially exist:
campaign counts, credit usage, and WhatsApp click tracking are real, server-recorded metrics
(`getAnalyticsDashboard`, `docs/PERFORMANCE_ENGINE.md`) — but nothing aggregates them into a
beta-cohort view, and nothing distinguishes a "beta customer" from any other user in the data model.

### Feedback collection

**NOT IMPLEMENTED.** `docs/CUSTOMER_FEEDBACK.md`, `CUSTOMER_BLOCKERS.md`, `OBSERVATION.md`, and
`OBSERVATION_REPORT.md` all do not exist. No in-app feedback form, no structured issue-capture
mechanism, and no external tool integration were found. The support mailto link (§2) is, today, the
only channel through which a beta customer's feedback could reach anyone — informal, unstructured,
and not a substitute for the structured record (customer/date/stage/problem/severity/frequency/
impact/workaround/resolution/response) the phase brief asks for.

### Customer evidence

**None exists.** There is no beta cohort, so there is no activation, usage, real-world-use, or
commercial signal data to report — reporting placeholder numbers here would be exactly the
fabrication this phase prohibits. This section is intentionally empty of metrics rather than
populated with invented ones.

### Beta scorecard

Not populated — there is no beta in progress. The dimensions the phase brief asks to track
(Activation / Usage / Real-world use / Product quality / Commercial signal) are listed here only as
a template for when a real beta starts, using the metrics that already exist in the product to
populate them (campaign creation events, download/WhatsApp-click events, credit spend, and support
emails as a proxy for blocker frequency) — not as a scored result.

## 6. Security Review

- The three support-link additions are static `mailto:` links with a hardcoded, founder-provided
  address — no new Cloud Function, no new Firestore access pattern, no new data collection. There is
  nothing here that could expose one customer's business information to another.
- No authentication, App Check, tenant-isolation, credit-control, payment-verification, Truth Check,
  Storage-security, or rate-limiting code was touched.
- No secret, credential, or API key was added to any template, frontend code, or documentation — the
  only "credential-shaped" string introduced is the support email address itself, which is not a
  secret.
- No email-sending backend was built, so there is no new attack surface from that area either.

## 7. Testing

Because only three frontend files were changed (`LandingFooter.tsx`, `Sidebar.tsx`,
`global-error.tsx` — no backend, no Firestore/Storage rules, no CI/CD), the following were run:

| Check | Result |
|---|---|
| `npx tsc --noEmit` (root) | 0 errors |
| `npx jest` (root) | **248 passed, 0 failed, 67 skipped** (35 tests fewer counted than "315 total" shown — this matches the pre-existing skip set from every prior phase in this session; no new skip was introduced) |
| `npm run build` | Succeeded — bundle sizes byte-identical to the last recorded baseline (163 kB shared JS floor, 312 kB heaviest route, in `docs/PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md`) |

Functions were not touched, so `functions`'s typecheck/test/build were not re-run this phase (no
functions source changed).

**Browser/manual customer-readiness verification: BLOCKED.** No browser automation tool exists in
this environment (consistent with every prior phase this session). The mailto links' actual
click-through behavior (does the OS/browser correctly open a mail client) was not, and cannot be,
verified here — this is standard, well-supported browser behavior for `mailto:` hrefs, but "standard
behavior" is not the same claim as "verified in this session," and this report does not conflate
them.

## 8. Files Changed

- `src/features/landing/components/LandingFooter.tsx` — added a "Contact support" mailto link.
- `src/components/layout/Sidebar.tsx` — added a "Help & support" mailto item to the account menu.
- `src/app/global-error.tsx` — the existing "contact support" text now links to a real address.
- `docs/CUSTOMER_READINESS_AUDIT_REPORT.md` (new) — this report.

No functions/backend code, Firestore/Storage rules, CI/CD, dependencies, or unrelated files were
changed.

## 9. Remaining Gaps

- Onboarding email sequence (all 5 emails): not implemented, requires a provider/domain decision
  outside this phase's authority.
- Beta program: no operational process, no customer selection, no feedback system, no measurement
  cadence — none of it exists; none of it was fabricated here.
- Support context pre-fill (business ID, campaign ID, browser info) into the support email: not
  built, deliberately, this phase.
- No confirmation that `support@brain-wise.com` is an actively monitored inbox — outside this
  codebase's visibility.
- Download-failure and permission-denied UI copy: not individually traced end-to-end.
- Business Brain's *purpose* explainer: a soft in-app-guidance gap, not fixed (would risk scope
  creep beyond a targeted fix).

## 10. Final Status Matrix

| Area | Status | Evidence |
|---|---|---|
| Support system | **PARTIAL** | Real, reachable mailto link now on 3 surfaces (landing footer, account menu, crash screen); no ticketing, no context capture, inbox monitoring unverified |
| Support error handling | **PARTIAL** | Most failure types have specific, actionable messaging (§2 table); a couple not individually traced |
| Onboarding email infrastructure | **NOT IMPLEMENTED / BLOCKED** | No provider, no templates, no sending backend found anywhere; requires a founder decision on provider/domain not made this phase |
| Email sequence | **NOT IMPLEMENTED** | None of the 5 specified emails exist |
| In-app guidance | **VERIFIED (core workflow), PARTIAL (Business Brain explainer)** | Journey matrix, §4 |
| Beta process | **NOT IMPLEMENTED** | No source-of-truth docs exist; no code artifacts found |
| Feedback collection | **NOT IMPLEMENTED** | No structured system; the new support link is the only channel, informal |
| Customer evidence | **NONE (no beta has run)** | N/A — not fabricated |
| Security regression | **VERIFIED — none introduced** | §6 |
| Overall Customer Readiness | **PARTIAL** | The core self-serve workflow has been substantially verified in production, including authentication, Business Brain creation, asset upload, product creation, campaign wizard progression, credit enforcement, and security boundaries. Full campaign generation, Truth Check, AI generation, and download remain dependent on completing the available-credit/payment test path; a customer can now reach a real human when stuck; email nurture and a structured beta process are absent |

## Final Recommendation

Customer Readiness is **FROZEN / PARTIAL**. The implemented customer-facing foundations — a
production-verified signup-through-campaign-wizard workflow with correct credit enforcement and
security boundaries, and a real, working support contact point — are in place. Full campaign
generation, Truth Check, AI generation, and download remain dependent on completing the
available-credit/payment test path, not on any gap this phase found or fixed. The onboarding email
sequence and the beta operating process are genuine, named gaps that require founder-level decisions
(an email provider and sending domain; a beta customer list and communication plan) that this phase
correctly did not make unilaterally.

**Founder-confirmed sequencing (not this phase's decision, recorded here for continuity):** this
area is explicitly **not** being reopened next. The stated priority order is production domain
(`brain-wise.com` actually serving the Mitra app) → production campaign generation → first real
customers → feedback → payment → only then onboarding-email/beta automation. Polishing
customer-readiness infrastructure further before the app is actually reachable at its production
domain would be solving the wrong problem first. Do not restart this phase's remaining gaps without
new authorization.
