# Production Readiness Feature Matrix

**Date:** 2026-09-22. Required Truth Table per the audit brief — Capability × Claimed / UI / API / Backend / External service / Credits / Subscription / Final output / Publish API / Production proof / Verdict.

Classification labels used: REAL/PRODUCTION-READY, REAL/PARTIALLY CONNECTED, REAL/NOT PRODUCTION VERIFIED, PLACEHOLDER, MOCK, UI-ONLY, BACKEND-ONLY, BROKEN, BLOCKED, NOT IMPLEMENTED, NOT IN MVP.

| Capability | Claimed by product? | UI | API | Backend | External service | Credits | Subscription | Final output | Publish API | Production proof | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Signup / Auth | Yes | Yes | Yes | Yes | Firebase Auth | N/A | N/A | N/A | N/A | Live on `www.brain-wise.com`, server-side auth confirmed | REAL/PRODUCTION-READY |
| Business Brain (create/update) | Yes | Yes | Yes | Yes | Firestore | N/A | N/A | Stored profile | N/A | Authz-verified this pass | REAL/PRODUCTION-READY |
| Asset upload | Yes | Yes | Yes | Yes | Cloud Storage, signed URLs | N/A | N/A | Stored file | N/A | Path-injection-safe, ownership-verified this pass | REAL/PRODUCTION-READY |
| Product creation | Yes | Yes | Yes | Yes (via campaign flow) | Firestore | N/A | N/A | Product doc | N/A | Not independently re-traced this pass | REAL/NOT PRODUCTION VERIFIED (inferred solid; not directly re-checked) |
| Campaign strategy generation | Yes | Yes | Yes | Yes | Gemini (text) | Yes, atomic | N/A | Strategy + copy | N/A | Reserve/execute/finalize/refund all traced this pass | REAL/PRODUCTION-READY |
| Copy generation (headlines, ad copy, captions) | Yes | Yes | Yes | Yes | Gemini | Bundled with campaign gen | N/A | Text | N/A | Traced this pass | REAL/PRODUCTION-READY |
| Localization | Yes | Yes | Yes | Yes | Gemini | Bundled | N/A | Localized copy | N/A | Business Brain flow traced; regional style confirmed injected into prompts | REAL/PRODUCTION-READY |
| Image generation | Yes | Yes | Yes | Yes | OpenAI DALL-E 3 (sole provider) | Yes | N/A | 1 hero image per campaign (SVG-composited) | N/A | Server-side, key not exposed, timeout+rate-limit present, no retry (intentional) | REAL/PARTIALLY CONNECTED (single point of failure — no working fallback) |
| Instagram Post (poster) | Yes | Yes | Yes | Yes | OpenAI + SVG compositor | Yes | N/A | SVG, not rasterized | N/A (download only) | Traced this pass | REAL/PRODUCTION-READY for creation/packaging/export; **publishing NOT IMPLEMENTED** |
| Instagram Story | Yes | Yes | Yes | Yes | Same as poster | Yes | N/A | SVG frames | N/A | Traced this pass | Same pattern as Post |
| Instagram Reel (campaign-pipeline asset) | Implied by marketing copy ("create Instagram Reels") | Yes | Yes | Yes | Reuses hero image; text storyboard only | Yes | N/A | Storyboard/script, **not video** | N/A | Traced this pass | **PLACEHOLDER — not a video** |
| "Create a Reel" (dedicated video feature) | Yes | Yes | Yes | Yes | FFmpeg via Cloud Run `reel-renderer` | Yes, atomic | N/A | Real MP4, 1080×1920 | N/A (download only) | Code traced; **live prod wiring of `REEL_RENDERER_URL` unverified** | REAL/NOT PRODUCTION VERIFIED (conditionally PLACEHOLDER if misconfigured — silent mock fallback found) |
| Instagram Carousel | Not confirmed in reviewed product docs | No | No | No | N/A | N/A | N/A | N/A | N/A | N/A | NOT IMPLEMENTED |
| Direct Instagram Publishing | Not explicitly promised in code/UI (no "Connect Instagram" flow exists) | No | No | No | No Meta Graph API anywhere in repo | N/A | N/A | N/A | N/A | Repo-wide search: zero integration code | **NOT IMPLEMENTED — confirm marketing copy doesn't overclaim** |
| WhatsApp CTA | Yes | Yes | Yes (message text authored by AI) | Client-side `wa.me` link only | None (not WhatsApp Business API) | N/A | N/A | Deep link with prefilled text | N/A | Traced this pass; by-design per Phase 9 | REAL/PRODUCTION-READY (as a share link, not an API integration) |
| Truth Check (verification logic) | Yes | Badge shown | Yes | Yes, deterministic regex/keyword-based | N/A | N/A | N/A | PASS/FAIL/REVIEW_REQUIRED status | N/A | Traced this pass, thorough | REAL/PRODUCTION-READY |
| Truth Check gating — regeneration | Implied | Yes | Yes | Yes | N/A | N/A | N/A | N/A | Traced this pass — fail-closed confirmed | REAL/PRODUCTION-READY |
| Truth Check gating — initial generation | Implied | Cosmetic badge only | N/A | **Does not block asset persistence/download** | N/A | N/A | N/A | Full asset persisted regardless of FAIL | Traced this pass | **BROKEN — CRITICAL** |
| Regeneration | Yes | Yes | Yes | Yes | Gemini + OpenAI | Yes, atomic, idempotent | N/A | New asset version | N/A | Traced this pass | REAL/PRODUCTION-READY |
| Download | Yes | Yes | N/A (client-fetch of signed URL) | N/A | Cloud Storage | N/A | N/A | Browser-downloaded file | N/A | Confirmed pattern in prior phase docs, not independently re-tested live this pass | REAL/PRODUCTION-READY (code-level) |
| Credits system | Yes | Yes | Yes | Yes | N/A | Self-referential | N/A | N/A | Atomicity/idempotency traced this pass for 3 of 4 credit-touching callables | REAL/PRODUCTION-READY, except `createCampaign` (see below) |
| `createCampaign` (orphaned legacy callable) | No (not in current UI) | No current caller | Yes, live | Yes, deployed | N/A | **Reserves, never finalizes/refunds** | N/A | Draft campaign doc only | N/A | Traced this pass | **BROKEN — CRITICAL, live credit-loss bug** |
| Subscriptions / Plans | Yes | Yes | Yes | Yes | Razorpay | N/A | Credits granted correctly on payment | N/A | N/A | Webhook idempotency proven under concurrency this pass | REAL/PRODUCTION-READY (webhook mechanics); see below for entitlement gap |
| Plan-tier feature enforcement | Implied by pricing page (business limits, watermark, Brand Kit access) | Displayed | No server check found | No server check found | N/A | Credits-only | **No tier check exists** | N/A | Repo-wide grep: zero `planId` checks in Brand Kit/business-limit code | **NOT IMPLEMENTED — CRITICAL entitlement bypass** |
| Razorpay checkout | Yes | Yes, real Checkout wired (new since Phase 10) | Yes | Yes | Razorpay | N/A | N/A | N/A | N/A | **Deployed key is a placeholder string** | **BLOCKED-CREDENTIALS / BROKEN in production** |
| Webhook processing | Yes | N/A | Yes | Yes, real HMAC + idempotent | Razorpay | Grants credits exactly-once | Updates plan | N/A | Concurrency-tested (real emulator, not mocked) | REAL/PRODUCTION-READY |
| Refund/chargeback | Implied (standard payment expectation) | No | No handler | No handler | Razorpay events unhandled | No clawback | No status change | N/A | Confirmed unhandled in webhook switch | **NOT IMPLEMENTED** |
| Cancellation → downgrade | Implied | Status shown | Partial (status flip only) | No plan/credit reset | Razorpay | Not reset | Not reset | N/A | Confirmed gap this pass | **NOT IMPLEMENTED** |
| Analytics events | Yes | N/A | Not re-audited this pass | Not re-audited this pass | N/A | N/A | N/A | N/A | Not re-verified this pass | REAL/NOT PRODUCTION VERIFIED (see `docs/OBSERVABILITY_AUDIT_REPORT.md` for prior findings, not re-confirmed here) |
| Production domain (`brain-wise.com` apex) | Yes (canonical, used in support email) | N/A | N/A | N/A | DNS/TLS | N/A | N/A | N/A | N/A | **TLS handshake fails, live-tested this session** | **BLOCKED** |
| Production domain (`www.brain-wise.com`) | Implicit | N/A | N/A | N/A | Firebase App Hosting | N/A | N/A | N/A | N/A | **HTTP 200, real build served, live-tested this session** | **REAL/PRODUCTION-READY (newly verified)** |
| CI/CD frontend auto-deploy | Implied by having CI | N/A | N/A | No frontend deploy job exists | GitHub Actions | N/A | N/A | N/A | N/A | Confirmed absent this pass | **NOT IMPLEMENTED** |
| CI/CD backend auto-deploy | Yes | N/A | N/A | Trigger + gate fixed in YAML | GitHub Actions | N/A | N/A | N/A | N/A | Config correct; live run status unverified (no `gh` access) | REAL/NOT PRODUCTION VERIFIED |

## Notes on "Claimed by product?"

This pass did not re-read every marketing/landing page copy line against this matrix (that would require the full §37 "Product Claim vs Actual Implementation" pass, not done this session). The one specific overclaim risk identified: marketing language like "create Instagram Reels" should be checked against the fact that the campaign-pipeline "reel" asset is a storyboard, not a video — the *separate* "Create a Reel" feature is the one that actually produces video. If landing/onboarding copy doesn't clearly point users to the dedicated Reel feature for actual video output, that's a claim-vs-reality gap worth a founder review.
