# 14 — Working-tree change inventory (345 tracked modifications) — 2026-10-11

Status: **summary inventory, NOT a line-by-line review.** Nothing here was committed, reverted or edited by the audit. Counts via `git diff --numstat` (line-ending differences are normalised by `.gitattributes`/autocrlf, so the numbers reflect real edits).

## By area
| Area | Files | + / − lines |
|---|---|---|
| `functions/src` (backend) | 121 | +2550 / −1057 |
| `src/features` | 86 | +2688 / −1704 |
| `src/app` | 52 | +783 / −966 |
| `src/components` | 38 | +912 / −1174 |
| `src/lib`, `src/hooks`, `src/types`, `src/services`, instrumentation | 16 | ~+450 / −110 |
| tests (`tests/*`, `functions/jest.config.js`) | 6 | ~+190 / −75 |
| Config/infra: `firestore.rules`, `apphosting.yaml`, `.github/workflows/ci-cd.yml`, `package.json`, `package-lock.json` (+3102), `tsconfig.json`, `.env.example`, `README.md`, `services/*` | ~10 | mixed |
| Deleted files | 9 | root scratch scripts (`_e2e19c*.mjs`, `_neg.mjs`, `_sweep.mjs`, `dump.sh`, `findblob.ps1`, `fsck.txt`) |

## Sensitive files that must be reviewed before any commit or deploy
| File | What the diff shows | Why it matters |
|---|---|---|
| `firestore.rules` (+32/−3) | forbids client `campaigns` create; `usage` get on a missing doc for own id; adds `onboarding_drafts`; reparenthesised a read rule | **HEAD is weaker (client could forge a verified campaign).** Fix exists only here. |
| `functions/src/config/pricing.ts` | `campaignBaseCredits 100→60`; free `100→140` (also reformatted) | **HEAD: campaign costs 140 > free 100.** Fix exists only here. |
| `apphosting.yaml` (+2/−2) | comments only (Razorpay→Paddle wording) | harmless |
| `functions/src/config/env.ts`, `modelRouting.ts` | modified | review: provider/model config |
| `.github/workflows/ci-cd.yml` (+6/−3), `package.json` (+5), `next.config.ts` | modified | review: CI gates, scripts, CSP |
| `src/app/pricing/*`, `src/app/terms/page.tsx`, `src/lib/config/pricing.ts` | customer-facing pricing copy edits | pricing label decision depends on these |

## Recommended handling
1. Review `firestore.rules` and `functions/src/config/pricing.ts` first and commit each as its own commit (both diffs are small and were read in this audit: they match their inline explanatory comments).
2. Group the rest by feature (billing UI, onboarding UI, Creative Brain wiring, lint/format churn) into separate reviewed commits; prettier reformatting should be isolated from behavioural edits.
3. Keep Pass 2C artefacts (`7ad115b`) separate — they are already committed on their own.
