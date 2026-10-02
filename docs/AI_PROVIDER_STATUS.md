# Mitra AI Provider Status — Phase 1

Live-verified provider status, as of this phase. Supersedes any "CONFIGURED" claim
in `docs/AI_ARCHITECTURE.md` §2 that was based on code capability rather than a
real runtime/credential check — see the correction there. **No secret value
appears anywhere in this document.**

## 1. MVP requirement determination

Determined from actual call sites in `functions/src/functions/**` and
`functions/src/services/ai/**` (not from the architecture diagram) — grepped for
`getTextAI()`/`getVisionAI()`/`getReelVisionAI()`/`getImageAI()`/`getVideoAI()`/
`getAudioAI()`/`removeBackground(`/`generateVideo(`/`generateVoice(` across the
whole backend.

| Workflow                                | Capability               | Provider                   | MVP required? | Evidence                                                                           |
| --------------------------------------- | ------------------------ | -------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| Campaign generation (13-stage pipeline) | TextAI                   | Gemini                     | **YES**       | `pipeline.ts` stages 1,3,4,5,6 via `aiServices.text`                               |
| Business/image understanding            | VisionAI                 | Gemini                     | **YES**       | `pipeline.ts` stage 2 via `aiServices.vision`                                      |
| Reference-style analysis                | VisionAI                 | Gemini                     | **YES**       | `functions/savedStyles/analyzeReferenceStyle.ts` → `getVisionAI()`                 |
| Reel clip scene classification          | ReelVisionAI             | Gemini                     | **YES**       | `services/ai/reelPipeline.ts` → `aiServices.reelVision`                            |
| Creative (hero) image generation        | ImageAI.generateImage    | Gemini Image               | **YES**       | `pipeline.ts` stage 7, exactly 1 call/campaign                                     |
| Background removal                      | ImageAI.removeBackground | Photoroom                  | **NO**        | Zero call sites found outside `services/ai/providers/photoroom/` and its own test  |
| AI video generation                     | VideoAI                  | Veo                        | **NO**        | Zero call sites found outside `services/ai/providers/veo/` and its own test        |
| Voice/audio generation                  | AudioAI                  | ElevenLabs                 | **NO**        | Zero call sites found outside `services/ai/providers/elevenlabs/` and its own test |
| Reel final rendering (ffmpeg)           | Renderer                 | Mitra Renderer (Cloud Run) | **YES**       | `generateReel` → `getVideoRenderer()`; deterministic, not an AI call               |

Photoroom/Veo/ElevenLabs remain architected-only per Phase 0 by design — nothing in
Phase 1 changes that, because nothing in the current product actually calls them.

## 2. Critical finding: Gemini has no production credential path

Checked directly against the real Firebase project (`brainwise-ai-marketing-engine`,
confirmed via `firebase projects:list` under the authenticated account) — metadata
only, no secret value ever read into this document or printed to any log:

- `firebase functions:secrets:describe GEMINI_API_KEY` → **404, secret does not
  exist** in Secret Manager for this project. Same result for
  `PHOTOROOM_API_KEY`, `ELEVENLABS_API_KEY`, `VEO_API_KEY`.
- No Cloud Function anywhere in `functions/src/functions/**` declares a
  `secrets: [...]` option on its `onCall(...)` definition — the mechanism Cloud
  Functions Gen2 requires to inject a Secret Manager value into `process.env` at
  all. Grepped the whole backend; zero matches.
- No `functions/.env` or `functions/.env.<project-id>` file exists — the other
  mechanism Firebase Functions supports for shipping a plain (non-secret) env var
  to a **deployed** function. Only `functions/.env.local` exists, which the
  Firebase emulator loads locally and which is never deployed (confirmed
  gitignored: `.env.local` is in `.gitignore`; confirmed not tracked by git via
  `git ls-files`).

**Conclusion: even before considering billing, the currently-deployed production
Cloud Functions have no way to receive `GEMINI_API_KEY` at runtime.** A deployed
`generateCampaignStrategy` call today would fail at the Gemini SDK/REST call with
a missing-credential error, not reach the previously-documented 402. This is a
genuine deployment-configuration gap, not a Phase 0/Phase 1 code defect — the
provider code itself (`GeminiTextProvider`/`GeminiVisionProvider`/
`GeminiImageProvider`) is correct and unchanged.

This is flagged as a **blocker requiring an explicit decision** (§ Blockers below)
rather than fixed silently, because adding `secrets: [...]` to every AI-calling
`onCall` definition touches Cloud Function deployment configuration across
multiple files — outside "AI provider configuration" scope per this phase's
guardrails, and because creating the actual Secret Manager secret is an
infrastructure/billing action for you to authorize, not one to take
autonomously.

## 3. Live provider test — Gemini Text

With your explicit approval, one minimal, real request was sent to the Gemini API
using the key present in `functions/.env.local` (local-emulator-only key, read
directly from the file, never logged, never committed).

```text
Provider: Gemini (Text)
Endpoint/workflow: generateContent, model gemini-flash-latest (same model/endpoint
  GeminiTextProvider uses)
Test: single-turn prompt "Return exactly: MITRA_TEXT_PROVIDER_OK", temperature 0,
  maxOutputTokens 20
Result: FAIL
HTTP status: 402
Error code: RESOURCE_EXHAUSTED
Error message (from Google, key redacted — verbatim safe portion): "Your
  prepayment credits are depleted. Please go to AI Studio at
  https://ai.studio/projects to manage your project and billing."
Latency: 730ms (request did reach Google's servers and was authenticated —
  key format/length was accepted, i.e. NOT an invalid-API-key error)
Cost-sensitive operation: yes, but this specific call was rejected before any
  generation occurred, so no tokens were billed
```

**Diagnosis, using the required category list:**

| Category           | Result                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| AUTHENTICATION     | PASS — the key itself was accepted, request was authenticated                                        |
| BILLING            | **FAIL — this is the root cause**                                                                    |
| QUOTA              | Related but more specific: this is a _prepay credit exhaustion_, not a per-minute/per-day rate quota |
| MODEL              | PASS — `gemini-flash-latest` was accepted, not a model-availability error                            |
| API ENABLEMENT     | PASS — the API itself responded, not a 403/disabled-API error                                        |
| REGION             | Not implicated — Generative Language API is global, not region-scoped like Vertex AI                 |
| SDK/REQUEST FORMAT | PASS — request was well-formed; the 402 came from Google's billing layer, not a 400                  |

**This confirms and sharpens the previously-known "Gemini Image HTTP 402
BILLING_REQUIRED" issue**: it is not specific to the image endpoint. The same
API key's associated Google AI Studio project has its prepay credits fully
depleted, so **every** Gemini capability (text, vision, image) reading this key
would return the same 402 today. Vision and Image were not separately
live-tested — same key, same AI Studio project, same billing pool, so a second
and third live call would reproduce the identical, already-diagnosed failure at
additional cost for zero new information (cost-control rule §24/§32).

**What is needed to resolve this**: add real prepay credit or move the
associated Google AI Studio project onto a linked, billed Google Cloud project,
via https://ai.studio/projects (Google's own account/billing action — nothing
in the Mitra codebase can work around this, and per Phase 1 rule §9 nothing
should try to).

## 4. Provider status matrix

| Provider       | Interface | Implementation     | Credential (local)                   | Credential (production)                                                               | Live test                                                    | E2E test                       | MVP status                                            |
| -------------- | --------- | ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------- |
| Gemini Text    | PASS      | PASS               | PRESENT (`.env.local`, valid format) | **ABSENT** (no secret, no binding)                                                    | **FAIL — 402 billing**                                       | Not run (blocked by live test) | REQUIRED, BLOCKED                                     |
| Gemini Vision  | PASS      | PASS               | PRESENT (`.env.local`)               | **ABSENT**                                                                            | Not independently tested (same key/account as Text — see §3) | Not run                        | REQUIRED, BLOCKED                                     |
| Gemini Image   | PASS      | PASS               | PRESENT (`.env.local`)               | **ABSENT**                                                                            | Not independently tested (same key/account — see §3)         | Not run                        | REQUIRED, BLOCKED                                     |
| Photoroom      | PASS      | PASS (placeholder) | ABSENT                               | ABSENT                                                                                | N/A — not required                                           | N/A                            | NOT REQUIRED FOR MVP                                  |
| ElevenLabs     | PASS      | PASS (placeholder) | ABSENT                               | ABSENT                                                                                | N/A — not required                                           | N/A                            | NOT REQUIRED FOR MVP                                  |
| Veo            | PASS      | PASS (placeholder) | ABSENT                               | ABSENT                                                                                | N/A — not required                                           | N/A                            | NOT REQUIRED FOR MVP                                  |
| Mitra Renderer | PASS      | PASS               | N/A (Cloud Run service, no API key)  | Depends on `REEL_RENDERER_URL` (out of AI-provider scope; not re-verified this phase) | Not run this phase                                           | Not run this phase             | REQUIRED, pre-existing (unaffected by Gemini billing) |
| Creatomate     | FUTURE    | FUTURE             | N/A                                  | N/A                                                                                   | N/A                                                          | N/A                            | FUTURE — untouched, per instruction                   |

## 5. Cost / billing findings

```text
Gemini (Text/Vision/Image):
Free/paid requirement: Requires billing/prepay credit on the linked Google AI
  Studio project — confirmed not currently available for this key.
Observed billing behavior: HTTP 402 RESOURCE_EXHAUSTED, "prepayment credits are
  depleted" — rejected before generation, so the failed live test itself
  incurred no token cost.
Potential cost per real campaign generation: pricing requires verification from
  Google's current official Gemini API pricing documentation
  (https://ai.google.dev/gemini-api/docs/pricing) — not invented here.

Photoroom / ElevenLabs / Veo:
Not applicable this phase — not required for MVP, no credentials obtained, no
calls made, no cost incurred.
```

## 6. Model configuration (unchanged, verified in place)

Gemini model names remain provider-internal configuration, not embedded in
business logic or the frontend — unchanged by Phase 1:

- Text: `gemini-flash-latest`, hard-coded in `GeminiTextProvider` (`text.ts`)
- Vision: `gemini-flash-latest`, hard-coded in `GeminiVisionProvider` (`vision.ts`)
- Image: `process.env['GEMINI_IMAGE_MODEL']` with fallback `gemini-2.5-flash-image`
  (`image.ts`) — already configurable via env, most flexible of the three

Per Phase 1 rule §33, left as-is: making Text/Vision's model configurable via env
would be a real improvement but is not required to verify or configure the
current providers, and is not something Phase 1's testing exposed as broken.
