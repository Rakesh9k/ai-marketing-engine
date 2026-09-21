# Phase 16 — End-to-End MVP Golden Path Test

**Priority:** 🔴 P0 — Release Gate
**Verdict: PHASE 16 BLOCKED**

## 1. Executive Summary

The MVP golden-path E2E test — a fresh customer walking through signup → onboarding → business → product → upload → campaign generation → Truth Check → download → WhatsApp → credits → payment → second campaign → logout/login → persistence, driven through a real browser against the real frontend — **could not be executed in this environment**, for a fundamental, environment-level reason discovered during setup, not a bug in the application: this machine's Application Control policy (Windows Defender Application Control / AppLocker) blocks execution of any downloaded browser binary. Every attempt to launch Chromium — via Playwright's API and by running the executable directly — was refused by the OS with `"An Application Control policy has blocked this file"`. No MCP browser-automation tool is available in this session as an alternative.

This is the exact condition Phase 16's own instructions (§69) define as **BLOCKED**: *"the complete golden path cannot meaningfully execute because of a fundamental blocker... E2E environment fundamentally broken."* Zero of the 30 golden-path steps were executed through a real browser. Per the phase's explicit "no cheating" rule (§65) and "a test that did not run is not a pass" rule, none of those 30 steps can be marked PASS.

Two further, independent blockers were also confirmed and would have prevented the golden path from completing even if a browser could be launched: **no real AI provider credentials** (`GEMINI_API_KEY`/`OPENAI_API_KEY`) are configured anywhere in this environment, and **no real Razorpay test-mode credentials** are configured. Per §49/§50, fabricating a stub AI provider or a fake payment success was explicitly out of bounds — those steps would have been reported BLOCKED even independent of the browser issue.

What this phase **did** produce: a complete, real, unexecuted Playwright E2E spec covering all 30 steps (`tests/e2e/mvp-golden-path.spec.ts`) — ready to run against a real browser in an environment without this restriction — plus confirmation that every non-browser-dependent quality gate (lint, typecheck, both application builds, and the full unit/integration suite from Phase 15) still passes.

## 2. Source-of-Truth Documents

Checked per the required list. Missing (consistent with every prior phase): `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/AI_ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SECURITY.md`, `docs/MVP_SCOPE.md`, `docs/TEST_PLAN.md`, `docs/PROMPT_SYSTEM.md`. Found and read: `docs/PHASE_10_CREDITS_PAYMENT_INTEGRITY_REPORT.md` through `docs/PHASE_15_TESTING_REPORT.md`.

## 3. Environment

| Item | Value |
|---|---|
| Frontend URL (local dev) | `http://localhost:3000` (Next.js `next dev`) — confirmed serving real HTML (39KB+) for `/` and `/signup`, not a blank shell; no compile errors in the dev server log |
| Test framework | Playwright (`@playwright/test` ^1.63.0) — newly added this phase; none existed before (confirmed in Phase 15's audit) |
| Browser | Chromium (downloaded via `npx playwright install chromium`) — **cannot be launched, see §4** |
| Firebase emulators | Not started for this phase's E2E attempt (blocked before reaching that step — no point starting the Functions/Storage emulator stack with no browser to drive against it). Firestore/Auth/Storage emulators were exercised extensively and independently in Phase 15. |
| AI provider | None configured — `GEMINI_API_KEY`/`OPENAI_API_KEY` unset (confirmed via `.env.example` vs. absence of any `.env.local`) |
| Payment test mode | None configured — no Razorpay key/secret present anywhere in this environment |

No credentials of any kind are exposed in this report.

## 4. The Blocker (Investigated, Confirmed, Not Worked Around)

1. Installed `@playwright/test` (`npm install -D @playwright/test --legacy-peer-deps` — the `--legacy-peer-deps` flag was required due to a pre-existing, unrelated peer-dependency conflict between `firebase@^10.12.5` and `@firebase/rules-unit-testing@2.0.7`'s `firebase@^9` peer requirement; not something this phase introduced).
2. Ran `npx playwright install chromium` — succeeded, browser binary downloaded to `~/AppData/Local/ms-playwright/`.
3. Attempted `chromium.launch({ headless: true })` via Node directly (both through the Bash tool and through PowerShell, to rule out a shell-specific spawn issue): failed both times with `spawn UNKNOWN`.
4. Ran the downloaded `chrome-headless-shell.exe` directly from PowerShell to isolate the cause: **`Program 'chrome-headless-shell.exe' failed to run: An Application Control policy has blocked this file`** — an explicit, administrator-level Windows security policy (WDAC/AppLocker-class), not a Playwright bug, not a missing dependency, and not something a lower-privilege workaround should attempt to bypass.
5. Checked for an alternative: no MCP browser-automation or "computer use" tool is available in this session (confirmed via tool search).

This is a hard stop for real browser-driven E2E in this specific environment. It is not evidence of anything wrong with the Mitra application itself.

## 5. Golden Path Matrix

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Open Mitra | **NOT EXECUTED** | Dev server confirmed serving real HTML via `curl` (not via browser) — see §3; not a substitute for actual browser rendering |
| 2 | Signup | NOT EXECUTED | — |
| 3 | Onboarding | NOT EXECUTED | — |
| 4 | Create business | NOT EXECUTED | — |
| 5 | Add product | NOT EXECUTED | — |
| 6 | Upload photo | NOT EXECUTED | — |
| 7 | Create Campaign | NOT EXECUTED | — |
| 8 | Select product | NOT EXECUTED | — |
| 9 | Objective | NOT EXECUTED | — |
| 10 | Offer | NOT EXECUTED | — |
| 11 | Audience | NOT EXECUTED | — |
| 12 | Language | NOT EXECUTED | — |
| 13 | Style | NOT EXECUTED | — |
| 14 | Review | NOT EXECUTED | — |
| 15 | Generate | NOT EXECUTED | Would additionally be BLOCKED on missing AI credentials even with a working browser |
| 16 | Pipeline | NOT EXECUTED | Same |
| 17 | Truth Check | NOT EXECUTED | Same |
| 18 | Open campaign | NOT EXECUTED | — |
| 19 | Inspect copy | NOT EXECUTED | — |
| 20 | Inspect creative | NOT EXECUTED | — |
| 21 | Download | NOT EXECUTED | — |
| 22 | WhatsApp | NOT EXECUTED | — |
| 23 | Consume free credits | NOT EXECUTED | — |
| 24 | Purchase credits | NOT EXECUTED | Would additionally be BLOCKED on missing Razorpay test credentials |
| 25 | Verify credits | NOT EXECUTED | — |
| 26 | Generate again | NOT EXECUTED | — |
| 27 | Logout | NOT EXECUTED | — |
| 28 | Login | NOT EXECUTED | — |
| 29 | Campaign persistence | NOT EXECUTED | — |
| 30 | Credit persistence | NOT EXECUTED | — |

**0 / 30 steps executed.**

## 6. Final State Verification

Not applicable — no fresh account was created (per §46/§65, no user/business/product/campaign/asset/payment records were fabricated or manually inserted to simulate a completed run).

## 7. Financial Reconciliation

Not applicable — no campaign generation or payment occurred. See `docs/PHASE_15_TESTING_REPORT.md` §12 for the financial-integrity evidence that does exist (backend-level, emulator-driven, not this phase's browser-driven E2E requirement — explicitly not treated as a substitute here, only cited where §37 permits doing so for payment-webhook idempotency specifically).

## 8. Data Reconciliation

Not applicable — no data was created.

## 9. What Was Actually Delivered This Phase

- **`tests/e2e/mvp-golden-path.spec.ts`** — a complete, real Playwright spec covering all 30 golden-path steps, using resilient role/label-based locators grounded in the actual frontend code read this phase (`src/features/auth/components/SignupForm.tsx`'s Email/Password/Confirm Password fields; the confirmed route list `src/app/{signup,onboarding,products,products/new,campaigns,campaigns/new,billing,usage}/page.tsx`). It performs real UI actions (fills real forms, clicks real buttons, uploads a real file, waits for real terminal campaign state via the rendered page rather than a fixed sleep, asserts on the real download event and the real WhatsApp popup URL) rather than mocking any of the behavior under test. Steps that depend on AI/payment credentials are written to attempt the real action and report an explicit, diagnosable "blocked" annotation rather than faking success if those credentials are absent. **This file has not been run and must not be read as passing.**
- **`playwright.config.ts`** — project configuration (baseURL, trace/screenshot/video capture on failure, single worker for a sequential customer-journey test).
- **`tests/e2e/fixtures/test-product.jpg`** — a minimal, deterministic, valid test image fixture for the upload step.
- **`package.json`**: added `"test:e2e": "playwright test"` script.

This satisfies §58's "create the E2E test file" instruction as prepared, correct infrastructure — not as a substitute for the verdict the phase actually requires (a passing run).

## 10. Commands Executed

```
npm install -D @playwright/test --legacy-peer-deps   # installed (pre-existing unrelated peer conflict, see §4)
npx playwright install chromium                       # browser binary downloaded successfully
chromium.launch({headless:true})                      # FAILED: spawn UNKNOWN
chrome-headless-shell.exe --version (direct)           # FAILED: Application Control policy blocked this file
npx playwright test --list                             # confirms the spec parses/loads correctly (1 test found) — NOT a run
npm run lint            PASS
npm run typecheck        PASS
npm run build             PASS (next build, 17/17 pages)
npm run functions:build    PASS
npx jest --silent          PASS (13 suites, 160 passed, 7 legitimately skipped — same suite validated in Phase 15)
```

## 11. AI Provider Strategy (Why No Stub Was Substituted)

No test/stub AI provider exists in the codebase (confirmed via grep across `functions/src/services/ai/`), and per §49's explicit instruction — *"Do not replace the entire pipeline with mock generateCampaign() → success. That would invalidate the test"* — none was fabricated for this phase either. The correct fix (introducing a genuine deterministic test-provider mode behind the existing provider abstraction) is itself a real architectural change with its own review surface, not something to improvise unreviewed inside an E2E test file. It is called out here as a concrete recommendation for whoever unblocks this phase next (see §14).

## 12. Payment Strategy (Why No Fake Success Was Substituted)

No Razorpay test-mode credentials exist in this environment. Per §50 — *"If the payment provider cannot be automated in the current environment: do not fake payment success. Instead: PARTIALLY VERIFIED/BLOCKED for the affected payment portion"* — the purchase-credits step is written in the spec to attempt the real UI action and report blocked rather than being scripted to a fabricated success.

## 13. Remaining Blockers

1. **This environment's Application Control policy prevents launching any browser binary at all.** This is the primary, overriding blocker — nothing past step 1 of the golden path can be attempted here regardless of credentials.
2. **No AI provider credentials** (`GEMINI_API_KEY`/`OPENAI_API_KEY`) — would block steps 15-17 and 26 even with a working browser.
3. **No Razorpay test-mode credentials** — would block steps 24-25 and the duplicate-webhook check in §37 even with a working browser (§37 explicitly permits substituting the Phase 15 integration-level webhook-idempotency test for this specific sub-check, which does exist and passes — see `docs/PHASE_15_TESTING_REPORT.md`).

## 14. Recommendation to Unblock

- Run this suite (`npm run test:e2e`, after `firebase emulators:start` and `NEXT_PUBLIC_USE_EMULATORS=true npm run dev`) from an environment without this Application Control restriction — a standard CI runner (GitHub Actions, etc.) or a developer machine without enterprise WDAC/AppLocker policies applied to downloaded binaries.
- Provision a real (but non-production, cost-conscious) `GEMINI_API_KEY` or `OPENAI_API_KEY` on the Functions emulator process for that run, so the actual pipeline can be exercised end-to-end as the phase requires.
- Provision Razorpay TEST-mode keys for that run to exercise the purchase flow.
- Once run, replace this report's matrix and verdict with the actual results — do not treat this report's infrastructure as sufficient on its own.

## 15. Final Verdict

**PHASE 16 BLOCKED**

Per §69: the complete golden path cannot meaningfully execute in this environment because of a fundamental blocker (no browser can be launched at all — a hard OS-level security policy, not an application defect). This is not a judgment about Mitra's readiness; it is an honest statement that this specific environment cannot produce the evidence this phase requires. The MVP's actual readiness on the golden path remains **unproven** until this suite is run somewhere that can launch a browser, with real (test-mode) AI and payment credentials.
