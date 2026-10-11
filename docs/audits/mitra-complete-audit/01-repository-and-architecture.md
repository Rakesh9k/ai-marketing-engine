# 01 — Repository & Architecture (Pass 1)

## Stack
- Frontend: Next.js 16 (`next ^16.3.6`, App Router), React 18.3, Tailwind 4, GSAP/motion, Paddle.js, Sentry, Upstash ratelimit. `AGENTS.md` warns Next APIs differ from training data; read `node_modules/next/dist/docs/` before frontend changes.
- Backend: Firebase Cloud Functions Gen2 (`asia-south1`), `firebase-admin`, Zod, Gemini (text + vision), image provider via `services/ai/image.ts`, Paddle Node SDK.
- Renderer: separate Cloud Run service `services/reel-renderer/` (Express + ffmpeg-static, H.264 1080×1920), called with OIDC token via `CloudRunVideoRenderer` in `functions/src/services/videoRenderer.ts`.
- Hosting: Firebase App Hosting (`apphosting.yaml`); `vercel.json` also present (memory notes: frontend decisions on Vercel vs App Hosting — **ambiguous ownership, verify which is live**).
- Size: 684 tracked TS/TSX files (384 `src`, 276 `functions`), 180 test files.

## Deployable units
1. Next.js web app (root).
2. Cloud Functions bundle (`functions/`, ~80 callables/webhooks/schedulers).
3. Reel renderer (Cloud Run).
4. Firestore rules/indexes, Storage rules.

## Layer mapping (intended 7 layers → code)
| Layer | Location | Notes |
|---|---|---|
| 1 Business Brain | `functions/src/functions/business/*`, `onboarding/*`, `services/ai/brainForGeneration.ts`, `config/brainDefaults.ts` | Brain stored with business; `brainForGeneration` strips placeholders (unknown ≠ default) |
| 2 Creative Brain | `services/ai/creativeBrain/**` (470 files, **untracked**), `creativeBrainService.ts`, `functions/creativeBrain/*` | State machine, question engine, industry knowledge, opportunity engine |
| 3 Creative Intelligence | `services/creativeIntelligence/**` (ontology, patterns, psychology, validators) | Partly tracked; verify |
| 4 Strategy/Concepts | `services/ai/pipeline.ts`, `ConceptSelectorModal.tsx` | Concept UI uses `exploreCreativeDirectionEndpoint` only |
| 5 Execution | `pipeline.ts`, `services/ai/execution/*`, `image.ts`, `compositor.ts`, `reelPipeline.ts` | |
| 6 Validation | `truthCheck.ts`, `validation*.ts`, `offerContract.ts`, `verticalContract.ts` | Truth Check status is server-authoritative in rules |
| 7 Delivery/Monetization | `usageControl.ts`, `billing.ts`, `paddle.ts`, `entitlements.ts`, webhooks | |

Boundary observation: credits/payments live outside Creative Brain (good). `pipeline.ts` dynamically imports the adaptive state machine (`pipeline.ts:635`), so Brain is coupled to execution through one file — acceptable but `pipeline.ts` is the hidden hub; review size.

## Duplicate / legacy implementations
- Payment providers: Paddle (active), Cashfree (exported + deployed), PayU (retained, explicitly not exported), Razorpay (`services/razorpay.ts`, `razorpayWebhook.ts`, not exported in index). → candidates: *Probably unused* (PayU/Razorpay); *Required/uncertain* (Cashfree — confirm whether it serves a live INR flow).
- `modelRouting.ts`: only self-referenced → *Probably unused/dead config*.
- Root-level clutter: `patch.js`, `patch2.js`, `filelist.txt`, `firestore-debug.log`, `functions/nul`, `golden-path-manual.mjs`, many `*_AUDIT.md`. Deleted-but-unstaged: `_e2e19c*.mjs`, `dump.sh`, `fsck.txt`.
No file was deleted or changed in this audit; dead-code classification above is not "confirmed dead".

## Documentation accuracy
- `docs/PRODUCTION_API_INTEGRATION_MATRIX.md` (2026-09-22) is stale (Razorpay placeholder key, `createCampaign` orphan — removed per `index.ts` comments).
- `CLAUDE.md` test baseline stale (38/687/127 vs 210/2344/286).
- `docs/LAUNCH_SCOPE.md` matches `src/proxy.ts`/`index.ts` gating in structure (spot-checked), not exhaustively.

## Audit limitations
No browser, production, Firebase console, Paddle dashboard, or live AI access was used. Gitignored env files were not read. Production may differ from this branch.
