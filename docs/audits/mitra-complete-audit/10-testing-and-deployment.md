# 10 — Testing & Deployment (Pass 1)

## Commands run (this audit)
| Command | cwd | Exit | Result |
|---|---|---|---|
| `npx tsc --noEmit` | root | 0 | clean |
| `npm --prefix functions run typecheck` | root | 0 | clean |
| `npx jest --silent` | `functions/` | 0 | Suites: 210 passed / 45 skipped / 0 failed (255). Tests: 2344 passed / 286 skipped / 0 failed (2630). 75.8 s |

Environmental notes: jest printed "Force exiting… open handles" → some tests leak async handles. Skipped suites are live-provider or emulator tests; **not** evidence of passing.

Not run: root `jest`, `eslint`, `next build`, Playwright (`tests/` e2e), Firebase emulator rules tests, `*.live.test.ts`, reel-renderer smoke tests.

## Baseline vs CLAUDE.md
CLAUDE.md: 38/687/127. Observed: 210/2344/286. Update CLAUDE.md baseline before the next phase, or phase comparisons are meaningless.

## Coverage map by capability (existence of tests, not quality)
| Capability | Tests found | Gap |
|---|---|---|
| Paddle webhook / checkout / pricing parity | yes | live delivery untested |
| Credit reserve/refund/concurrency | yes (`usageControl.concurrency`) | — |
| Tenant isolation (rules) | referenced emulator tests | not run here |
| Campaign pipeline failure recovery, Truth Check gating, offer contract | yes | AI quality only via live tests (skipped) |
| Creative Brain state machine / opportunity / e2e validation | yes (`creativeBrain.e2eValidation`) | files untracked in git |
| Image aspect ratio / composition / SVG→raster | `compositor.test.ts`, `image.test.ts` | no visual regression, no real-provider test |
| Reel render → playable MP4 | `videoRenderer.test.ts`, renderer `testEndToEnd.ts` | not run; prod URL unverified |
| Frontend journeys | Playwright config + `tests/` | not run |
| Accessibility | none found | missing |

## Minimum pre-launch regression suite (proposed)
1. Emulator rules suite incl. tenant + privilege tests. 2. Paddle sandbox replay/out-of-order/invalid signature. 3. One live-provider campaign per vertical (restaurant, salon, real-estate) asserting valid Truth Check + non-mock image. 4. Renderer MP4 probe (`ffprobe` codec/size). 5. Playwright: signup→onboarding→campaign→download.

## Deployment dependency checklist (all UNVERIFIED in production)
- [ ] Functions secrets: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, Gemini/image keys
- [ ] 11 × `PADDLE_PRICE_ID_*` set for live + matching `NEXT_PUBLIC_*` in `apphosting.yaml`
- [ ] Paddle notification destination → deployed `paddleWebhook` URL, all 11 listed events subscribed
- [ ] `REEL_RENDERER_URL` set and IAM for OIDC (otherwise reels fail by design; check the failure path refunds)
- [ ] App Check keys / reCAPTCHA in prod
- [ ] Firestore indexes (`firestore.indexes.json`) deployed
- [ ] Which host serves the frontend (App Hosting vs Vercel) and domain brain-wise.com
- [ ] Alerts, log access, Firestore backups (none evidenced in repo)
