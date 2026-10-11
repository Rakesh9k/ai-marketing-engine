# 12 — Prioritized Remediation Plan & Remaining Audit Passes (provisional)

Effort figures are rough engineer-day estimates with high uncertainty (±50%); they cover only items identified in Pass 1.

## P0 — before any paying customer
| # | Task | Why | Effort | Verify |
|---|---|---|---|---|
| P0-1 | Commit the Creative Brain/Intelligence stack and related untracked files in logical commits (no content change) | 470 untracked files = unrecoverable core IP, unreproducible deploys | 0.5 d | `git ls-files functions/src/services/ai/creativeBrain \| wc -l` > 0; clean `git status` |
| P0-2 | Prove paid lifecycle in production-equivalent Paddle (checkout → webhook → entitlement → cancel) | Only code-level evidence today | 1–2 d | Sandbox/live webhook logs + `paddle_grants` doc + usage doc |
| P0-3 | Resolve Free-tier credits vs campaign cost | First-campaign conversion | 0.5 d | New user completes a campaign without payment |
| P0-4 | Verify/disable renderer path in prod; ensure failure refunds | Reels may be mock/fail | 1 d | `ffprobe` of a prod-rendered MP4, or reels hidden |

## P1 — deliver advertised MVP reliably
- Run 12-scenario live campaign matrix (§Phase 5 of brief) and record outputs (3–4 d).
- Browser journeys A–C, H (3 d); Playwright automation of journey A.
- Enumerate every callable → authorization check, and execute emulator rules tests (2 d).
- Read Cashfree/other webhooks; remove or harden (1 d). Refund/`adjustment` policy alignment (1 d).
- Decide UI consumer for Creative Brain session API or declare it internal (1–3 d).
- Update CLAUDE.md baseline; refresh stale docs (0.5 d).

## P2
Prune dead config (`modelRouting.ts`), legacy providers, root clutter (after reference checks); accessibility pass; open-handle leaks in tests; observability alerts/backups; zero-decimal currency handling.

## P3
Publishing/scheduling/Meta, calendar, analytics dashboards, admin — correctly gated; do not build before launch.

## Remaining audit passes (needed to issue scores)
- **Pass 2:** browser journeys A–I with Chrome tools against local/emulators; callable-by-callable authz table.
- **Pass 3:** live-provider campaign matrix (needs approval + key handling), renderer MP4 probe, latency/cost measurement.
- **Pass 4:** score 30 dimensions; completion percentages.

## §4 Completion-percentage method (defined now, computed later)
Denominator = weighted MVP requirements (auth 10, onboarding/Business Brain 10, campaign generation 25, truth/quality 10, export/download 8, credits 10, payments/subscription 12, campaign history 5, security 10 = 100). Per-requirement credit: implemented 0–1; verified = only if demonstrated by an executed test/run this audit; end-to-end = journey A/E weighted steps passing; production readiness = verified production config items / total checklist. Partial = fractional by sub-step; unverified counts 0 in "verified". Until Pass 2–3, verified/E2E/production percentages are **not computed**.

## Decision needed from you
Pass 2 includes live-provider runs (cost) and browser testing against which environment (local emulators vs production with test data). Tell me which; I won't call live providers or production without that.
