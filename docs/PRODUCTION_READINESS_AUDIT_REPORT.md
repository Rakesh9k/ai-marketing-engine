# Mitra / BrainWise — Production Readiness Audit Report

**Date:** 2026-09-22
**Method:** Forensic re-verification of current code against ~50 existing phase audit reports in `docs/`. Six parallel research passes traced credits/billing, subscriptions/Razorpay, AI providers/Truth Check, content capabilities, security/tenant isolation, and deployment/domain from current source, with file:line evidence, not from prior report claims alone. Drift between old reports and current code is called out explicitly where found.

---

## PRODUCTION READINESS VERDICT: **NOT READY**

The application layer (auth, authorization, Firestore/Storage rules, rate limiting, AI generation pipeline, Truth Check logic, FFmpeg reel rendering) is substantially real and well-engineered — this is not a demo. But three independent, unrelated defects each individually block real paying customers today: **Razorpay cannot process a payment in production** (placeholder key), **plan-tier entitlement does not exist** (any user can invoke any tier's operations given credits), and **Truth Check does not gate the primary generation path** (a campaign whose content fails verification is still fully downloadable). A fourth, `createCampaign`, silently burns customer credits with no refund path. None of these require new architecture — they are fixes, not builds — but shipping today would mean customers can't pay, aren't tier-restricted, may download unverified/wrong content, and can lose credits to a dead code path.

---

## EXECUTIVE SUMMARY

| Area                                                    | Status                                                                                                                                         | Blocking?                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Authentication                                          | REAL/PRODUCTION-READY                                                                                                                          | No                                                                           |
| Authorization / tenant isolation                        | REAL/PRODUCTION-READY (2 minor agency-access gaps, fail-closed)                                                                                | No                                                                           |
| Business Brain → generation                             | REAL, with dead fields (website/Instagram/vertical catalogs reach Truth Check but never the prompt)                                            | No, but a UX/accuracy gap                                                    |
| Campaign strategy / copy / localization                 | REAL/PRODUCTION-READY                                                                                                                          | No                                                                           |
| Image generation                                        | PARTIALLY CONNECTED — single provider (OpenAI DALL-E 3), no working fallback despite config implying one                                       | No, but single point of failure                                              |
| Video/Reel generation (campaign pipeline "reel")        | PLACEHOLDER — text storyboard + reused still image, not video                                                                                  | No (separate real feature exists)                                            |
| "Create a Reel" (dedicated feature)                     | REAL ffmpeg pipeline, **but silently degrades to a fake placeholder file if `REEL_RENDERER_URL` is unset in prod (unverifiable from repo)**    | **Yes, conditionally**                                                       |
| Instagram Post (creation/packaging/export)              | IMPLEMENTED (SVG-based, not rasterized PNG/JPEG)                                                                                               | No                                                                           |
| Instagram Story                                         | IMPLEMENTED (SVG frames)                                                                                                                       | No                                                                           |
| Instagram Carousel                                      | NOT IMPLEMENTED (does not exist in any form)                                                                                                   | No (not in MVP)                                                              |
| Instagram/Meta Publishing                               | NOT IMPLEMENTED (no Graph API/OAuth anywhere)                                                                                                  | No — correctly not claimed as done; confirm marketing copy doesn't overclaim |
| WhatsApp                                                | `wa.me` deep link only, by design — not an API integration                                                                                     | No                                                                           |
| Truth Check (logic)                                     | REAL/PRODUCTION-READY, deterministic and thorough                                                                                              | —                                                                            |
| Truth Check (enforcement, regeneration)                 | REAL/PRODUCTION-READY — fail-closed                                                                                                            | No                                                                           |
| **Truth Check (enforcement, initial generation)**       | **BROKEN — FAIL status does not block asset persistence, download, or display**                                                                | **Yes**                                                                      |
| Download                                                | REAL (client-fetch of signed Storage URL)                                                                                                      | No                                                                           |
| Credits: campaign strategy / regeneration / reel gen    | REAL/PRODUCTION-READY (atomic reserve/finalize/refund, idempotent)                                                                             | No                                                                           |
| **Credits: `createCampaign` legacy callable**           | **BROKEN — live, deployed, reserves credits, never finalizes or refunds**                                                                      | **Yes**                                                                      |
| Subscriptions: webhook signature + idempotency          | REAL, verified under concurrency                                                                                                               | No                                                                           |
| Subscriptions: checkout UI wiring                       | REAL (new since Phase 10 — closes a previously-documented gap)                                                                                 | No                                                                           |
| **Subscriptions: production Razorpay key**              | **PLACEHOLDER (`rzp_test_placeholder_no_real_credentials`) — checkout non-functional in deployed prod config**                                 | **Yes**                                                                      |
| **Subscriptions: plan-tier enforcement**                | **NOT IMPLEMENTED — credits-only gating; any authenticated user can invoke any tier's operations given sufficient credits**                    | **Yes**                                                                      |
| Subscriptions: refund/chargeback handling               | NOT IMPLEMENTED                                                                                                                                | Yes (financial risk, not launch-blocking for MVP if manually monitored)      |
| Subscriptions: cancellation → downgrade                 | NOT IMPLEMENTED (status flips, plan/credits never reset)                                                                                       | Yes (revenue leakage)                                                        |
| AI providers — server-side only, no client key exposure | REAL/PRODUCTION-READY                                                                                                                          | No                                                                           |
| Rate limiting                                           | REAL, applied to all sampled expensive callables; fails safe but not fast on Firestore outage                                                  | No                                                                           |
| Firestore / Storage rules                               | REAL, tenant isolation enforced at rules layer + app layer                                                                                     | No                                                                           |
| Observability                                           | Not re-audited this pass; see `docs/OBSERVABILITY_AUDIT_REPORT.md`                                                                             | —                                                                            |
| **Production domain (`brain-wise.com` apex)**           | **BLOCKED — TLS handshake fails; only `www.brain-wise.com` is live**                                                                           | **Yes**                                                                      |
| Production domain (`www.brain-wise.com`)                | **NEWLY VERIFIED LIVE** — serves real production build (HTTP 200, correct security headers, App Hosting fingerprint)                           | —                                                                            |
| CI/CD (frontend auto-deploy)                            | NOT CONFIGURED — nothing in CI deploys the frontend; current live build was deployed manually/out-of-band                                      | Yes (operational risk)                                                       |
| CI/CD (backend/Functions auto-deploy)                   | PARTIALLY CONFIGURED — trigger + fail-open gate fixed in YAML; actual GitHub Actions run status NOT VERIFIED this session (no `gh`/API access) | No, assuming prior manual verification holds                                 |
| Vercel vs Firebase App Hosting                          | REAL, UNRESOLVED CONFLICT — both configs live and committed; App Hosting appears to be what's actually serving traffic                         | Medium (config hygiene / confusion risk)                                     |

---

## WHAT IS PRODUCTION-VERIFIED

- Authentication (server-side, all callables) and App Check enforcement.
- Authorization / tenant isolation on sampled sensitive callables (upload confirm, campaign generation, business brain update, reel generation) — no IDOR found.
- Firestore and Storage security rules enforcing per-business/agency isolation; `users/{userId}` role/business-list self-escalation is fixed and confirmed still fixed.
- Rate limiting wired to all sampled expensive callables with real per-action limits.
- Campaign strategy, regeneration, and reel-generation credit reservation → AI execution → finalize/refund, all atomic and idempotent under concurrency (confirmed via existing concurrency test evidence).
- Razorpay webhook signature verification (real HMAC) and webhook idempotency (proven exactly-once under concurrent delivery via a real Firestore-emulator test, not mocks).
- AI calls are 100% server-side; no AI provider key reachable from client code.
- `www.brain-wise.com` now serves the real production Next.js build via Firebase App Hosting (this is new since the last domain audit).

## WHAT IS IMPLEMENTED BUT NOT PRODUCTION-VERIFIED

- The "Create a Reel" FFmpeg pipeline's actual production activation — code is real, but whether `REEL_RENDERER_URL` is configured against a live, deployed Cloud Run renderer in production could not be confirmed from the repo. If unset, it silently substitutes a fake file.
- GitHub Actions backend-deploy job's actual pass/fail status on the live repo (config is correct; execution not observed this session).
- Server-side Razorpay secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, plan IDs) — plumbing exists but no deployed value could be confirmed or denied from the repo (likely in a gitignored `functions/.env.<project-id>` file, not inspectable).

## WHAT IS PARTIALLY CONNECTED

- Image generation: real, server-side, credit-gated — but single-provider (OpenAI) with a config-implied Gemini fallback that doesn't exist in code. One outage takes down all image generation.
- Business Brain: real data flows into generation prompts, but some fields (business website/Instagram links, vertical service/property catalogs) are consumed only by Truth Check, never given to the AI — meaning content can be flagged REVIEW_REQUIRED for details the model was never asked to include.
- CI/CD: backend deploy trigger and gate are correctly configured; frontend has no auto-deploy path in either Vercel or GitHub Actions terms — the currently-live build was deployed by hand.

## WHAT IS NOT IMPLEMENTED

- Instagram/Facebook/Meta Graph API publishing (any platform) — no OAuth, no token storage, no publish calls anywhere. Content generation terminates at download or a WhatsApp share link, never an authenticated publish.
- Carousel (any form — single or multi-slide) — does not exist.
- WhatsApp Business API (server-side send) — only a client `wa.me` deep link exists.
- Plan-tier feature enforcement (Free/Starter/Business/Agency) — only a shared credit budget is enforced; advertised limits ("1 business", "no watermark", "Brand Kit access", campaign counts) are display-only and unenforced server-side.
- Refund/chargeback webhook handling (`refund.created`, `refund.processed`, `payment.dispute.*`) — falls through to an unhandled-event log line; credits are never clawed back.
- Subscription cancellation → automatic downgrade to Free plan/credits at period end.

## WHAT IS BROKEN

1. **`createCampaign` Cloud Function** (`functions/src/functions/campaigns/createCampaign.ts`) — live, deployed, reachable by any authenticated client. Reserves credits via the legacy `reserveCredits()` path, does no AI work, and never calls `confirmCredits`/`refundCredits` (both are dead code, zero call sites elsewhere in the repo). Every invocation permanently burns the caller's own credits. Not exercised by the current shipped frontend (which only calls `generateCampaignStrategy`), but directly invocable by any client holding a valid auth/App Check token.
2. **Truth Check enforcement on initial generation.** `pipeline.ts`'s `assembleCampaignPack()` marks every asset `status: 'completed'` regardless of Truth Check result; `generateCampaignStrategy.ts` persists them as-is; the campaign detail UI shows a cosmetic "Failed" badge but never disables the download button based on `truthCheckStatus`. A campaign that internally fails verification (wrong price, prohibited claim, invented discount) is still fully downloadable. (Regeneration, by contrast, is correctly fail-closed.)
3. **Production Razorpay checkout key.** `apphosting.yaml` deploys `NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_placeholder_no_real_credentials"` — a literal placeholder string, not even a real test key. Checkout will open and fail against Razorpay in the live deployed app.
4. **Canonical domain `brain-wise.com` (apex).** TLS handshake fails; only `www.brain-wise.com` serves traffic. No redirect exists either direction. The documented canonical domain and the support email domain (`support@brain-wise.com`) point at a URL that currently does not resolve over HTTPS.
5. **"Create a Reel" silent mock fallback.** If `REEL_RENDERER_URL` is unset, `getVideoRenderer()` silently writes a plain-text buffer labeled `contentType: 'video/mp4'` to Storage instead of erroring — a customer could receive and pay credits for a fake, unplayable "video" with no error surfaced.

## WHAT IS BLOCKED

- Full end-to-end payment verification — blocked on confirming/obtaining real Razorpay production credentials (server secrets unverifiable from repo; the one observable value is a placeholder).
- Confirming the `REEL_RENDERER_URL` Cloud Run deployment is live and correctly wired — blocked on production environment access this session didn't have.
- Confirming current GitHub Actions run status (green/red) — blocked on `gh` CLI being broken in this environment; no other CI log access available.

## WHAT REQUIRES FOUNDER DECISION

- Whether plan-tier feature gating (business count limits, watermarking, Brand Kit access restriction) should be built now, or whether credits-only gating is an acceptable MVP monetization model going forward.
- Whether to decommission Vercel config entirely now that Firebase App Hosting is confirmed live-serving traffic, or keep both during a transition.
- Whether Instagram/Meta publishing is roadmap (in which case OAuth/token-storage architecture needs a design pass) or intentionally out of MVP (in which case marketing copy should be checked for overclaiming "create Instagram Reels/posts" language that could imply auto-publishing).
- Refund/chargeback handling policy and whether it's needed before real customer payments start, or can be handled manually while volume is low.

## WHAT REQUIRES EXTERNAL CREDENTIALS

- Real Razorpay production key ID + secret + webhook secret + plan IDs.
- Confirmation of whatever `REEL_RENDERER_URL` value (if any) is configured in the live Cloud Functions environment.
- DNS/App Hosting console access to complete the apex `brain-wise.com` custom domain mapping (currently only `www` is verified).

## WHAT IS OUT OF MVP

- Instagram/Facebook/Meta direct publishing — correctly not built speculatively; content generation, packaging, and export are complete for Post/Story, and a real video pipeline exists for Reels.
- Carousel — no evidence this was ever promised in the reviewed product docs; treat as out of scope unless product docs say otherwise.
- WhatsApp Business API automated sending — the `wa.me` link approach appears to be an intentional, cheaper MVP choice per Phase 9 documentation, not an oversight.

---

## TOP 10 PRODUCTION BLOCKERS (priority order)

1. **P0 — Razorpay production key is a placeholder.** No real customer can pay. Fix: obtain and deploy real Razorpay production key ID/secret/webhook secret to `apphosting.yaml`/Functions secrets.
2. **P0 — Truth Check does not gate initial generation.** Customers can receive and act on unverified/wrong content with only a cosmetic warning. Fix: block `status: 'completed'` on FAIL/REVIEW_REQUIRED for the initial path the same way regeneration already does, and disable download in the UI when `truthCheckStatus !== 'PASS'`.
3. **P0 — `createCampaign` burns credits with no refund/finalize path.** Fix: remove the dead export from `functions/src/index.ts`, or migrate it onto `executeWithUsageControl`.
4. **P0 — `brain-wise.com` apex domain TLS is broken.** Customers typing the canonical domain (and the support email domain) get a connection failure. Fix: complete the App Hosting custom-domain mapping for the apex, or add a `www` redirect and update all canonical references.
5. **P1 — No plan-tier enforcement.** Business/Agency-scoped operations (Brand Kit, multi-business) are invocable by any user with credits, regardless of actual plan. Fix: add explicit `planId` checks to tier-gated callables, or intentionally document credits-only as the model.
6. **P1 — `REEL_RENDERER_URL` silent mock fallback risk.** Confirm production configuration; if misconfigured, customers silently receive fake "video" files. Fix: fail loudly (throw) instead of silently substituting a mock renderer when not explicitly in a dev/test environment.
7. **P1 — No frontend CI/CD auto-deploy.** Current live build was deployed manually; future changes risk not reaching production without someone remembering to redeploy by hand. Fix: wire a real frontend deploy job (App Hosting via GitHub connection, or Vercel Git integration) and remove whichever config is not actually in use.
8. **P1 — No refund/chargeback webhook handling.** A disputed/refunded payment leaves granted credits in place forever. Fix: add `refund.created`/`payment.dispute.*` cases with a credit clawback.
9. **P2 — No cancellation-driven downgrade.** Canceled subscriptions never reset `usage.planId`/credits at period end — revenue leakage. Fix: scheduled sweep or webhook-driven downgrade at `current_period_end`.
10. **P2 — Vercel/App Hosting dual config unresolved.** Confusion and drift risk (e.g. stale env var docs already found drifting from actual `process.env` usage). Fix: pick one, decommission the other, update `docs/VERCEL_ENVIRONMENT_VARIABLES.md` accordingly.

---

## Supporting documents

- `docs/PRODUCTION_READINESS_FEATURE_MATRIX.md`
- `docs/PRODUCTION_API_INTEGRATION_MATRIX.md`
- `docs/PRODUCTION_CONTENT_CAPABILITY_MATRIX.md`
- `docs/PRODUCTION_BILLING_CREDIT_AUDIT.md`

## Scope note

This audit consolidated and re-verified prior phase reports rather than re-deriving every one of the 60 sections of the original audit brief from a blank slate (founder-approved scoping decision, 2026-09-22). Areas not re-traced this pass: performance/N+1 query audit, full documentation cross-check against every doc listed in the brief, analytics event-emission-correctness audit, and database integrity/orphan-document audit — see the existing `docs/PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md`, `docs/OBSERVABILITY_AUDIT_REPORT.md`, and `docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md` for those, which were not re-verified in this pass and should be treated as prior-session claims, not re-confirmed here.
