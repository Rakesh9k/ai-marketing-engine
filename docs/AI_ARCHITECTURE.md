# Mitra AI Architecture (Phase 0 — Provider Abstraction)

This document is the authoritative source for AI-provider architecture and status.
It supersedes §16/§17 of `docs/ARCHITECTURE_AI_CONTEXT.md` for provider-status claims
specifically (that document is otherwise still accurate; those two sections predate
the Gemini image migration and this Phase 0 abstraction pass).

> **Phase 1 correction**: §2's "CONFIGURED" column below reflects Phase 0's
> code-capability review only. Phase 1 (`docs/AI_PROVIDER_STATUS.md`) found Gemini
> has **no production credential path at all** (no Secret Manager secret, no
> `secrets: [...]` binding on any function) and that the API key available locally
> is billing-blocked (HTTP 402, prepay credits depleted, confirmed by a real live
> call). Treat `docs/AI_PROVIDER_STATUS.md` as authoritative for runtime status;
> this document remains authoritative for architecture/interfaces/dependency
> direction, which Phase 1 did not change.

## 1. Dependency direction (enforced, unchanged by this phase)

```
Browser (Next.js, React)
   ↓  (Firebase Auth + App Check + httpsCallable — no other path)
Firebase Cloud Function (onCall, region asia-south1)
   ↓
Mitra service / business logic (functions/src/services/**, functions/src/functions/**)
   ↓
AI interface (functions/src/services/ai/interfaces/index.ts)
   ↓
Provider implementation (functions/src/services/ai/providers/**, or text.ts/vision.ts/image.ts)
   ↓
External AI API
```

**No third-party AI API call is ever made from `src/` (the frontend).** Confirmed by
repo-wide grep (this phase) and enforced going forward by
`tests/aiProviderBoundary.test.ts`, which fails the build if a Gemini/OpenAI/
ElevenLabs/Photoroom/Veo secret or SDK call ever appears in frontend source.

`src/features/ai/*` (TextAI/VisionAI/ImageAI/AIProvider type-only files) is a **dead,
vestigial mirror** of this document's interfaces with zero implementation and zero
call sites. It is not a pattern to extend — all real AI capability lives behind
Cloud Functions, per `functions/src/services/ai/`.

## 2. Provider mapping and status

| Capability                | Interface                                                          | Provider                                                                                                                    | Status                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text generation           | `TextAI` (`services/ai/interfaces`)                                | Gemini (`gemini-flash-latest`) — `GeminiTextProvider` (`services/ai/text.ts`)                                               | **IMPLEMENTED, CONFIGURED**                                                                                                                       |
| Vision analysis           | `VisionAI` / `ReelVisionAI`                                        | Gemini — `GeminiVisionProvider`/`GeminiReelVisionProvider` (`services/ai/vision.ts`)                                        | **IMPLEMENTED, CONFIGURED**                                                                                                                       |
| Image generation          | `ImageAI.generateImage`                                            | Gemini image (`gemini-2.5-flash-image`) — `GeminiImageProvider` (`services/ai/image.ts`)                                    | **IMPLEMENTED, CONFIGURED** — subject to a known Gemini image billing (`BILLING_REQUIRED`, HTTP 402) error path; see §3                           |
| Background removal        | `ImageAI.removeBackground`                                         | Photoroom — `PhotoroomProvider` (`services/ai/providers/photoroom/`)                                                        | **ARCHITECTED ONLY** — throws `AIProviderError` on call, no credentials exist                                                                     |
| AI video generation       | `VideoAI.generateVideo`                                            | Veo — `VeoProvider` (`services/ai/providers/veo/`)                                                                          | **ARCHITECTED ONLY** — throws, no credentials exist                                                                                               |
| Voice/audio generation    | `AudioAI.generateAudio`                                            | ElevenLabs — `ElevenLabsProvider` (`services/ai/providers/elevenlabs/`)                                                     | **ARCHITECTED ONLY** — throws, no credentials exist                                                                                               |
| Deterministic rendering   | `Renderer` (alias of `VideoRenderer`, `services/videoRenderer.ts`) | Mitra's own Cloud Run ffmpeg service — `CloudRunVideoRenderer` ("MitraRenderer"); `DevMockVideoRenderer` for local/emulator | **IMPLEMENTED, CONFIGURED** (pre-existing, not part of this phase — documented here for completeness)                                             |
| Future rendering fallback | `Renderer`                                                         | Creatomate                                                                                                                  | **NOT YET AVAILABLE** — no interface implementation exists; would be a second `Renderer` implementation selected by `getRenderer()` if ever built |

Do not read "interface exists" as "capability works" — see the Status column, not the
Interface column, for what's actually callable today.

## 3. Provider selection — `aiProviderFactory.ts`

`functions/src/services/ai/factory/aiProviderFactory.ts` is the single place that
selects a concrete provider for each capability: `getTextAI()`, `getVisionAI()`,
`getReelVisionAI()`, `getImageAI()`, `getVideoAI()`, `getAudioAI()`, `getRenderer()`.

Business logic and Cloud Functions call these functions, never `new
GoogleGenerativeAI(...)` or a vendor SDK, directly. `functions/src/services/ai/index.ts`
(`aiServices`, `generateText`, `generateStructuredText`, `analyzeProductImages`,
`generateImage`) builds on top of the factory and adds the shared timeout/retry/
logging wrapper every AI call already went through before this phase — that
behavior is unchanged.

Today every `get*AI()` call returns the same singleton instances that existed before
this phase (`geminiTextProvider`, `geminiVisionProvider`, `geminiImageProvider`,
`getVideoRenderer()`) — Phase 0 adds the indirection point without changing runtime
behavior for any already-working capability. Swapping `TextAI` from Gemini to another
provider later means changing `getTextAI()`'s one line, not touching
`pipeline.ts`, `generateCampaignStrategy.ts`, or any React component.

The Gemini image provider's known `BILLING_REQUIRED` (HTTP 402) failure — see
`docs/ARCHITECTURE_AI_CONTEXT.md` and prior phase reports — is unaffected by this
phase: `GeminiImageProvider.generateImage` still classifies it and returns a safe
`{ success: false, error: { code: 'BILLING_REQUIRED', ... } }`, never a fabricated
success. Fixing the underlying billing configuration is a deliberate, separate,
later phase — not part of this architecture pass.

## 4. New placeholder providers (architected, not implemented)

`VeoProvider`, `ElevenLabsProvider`, and `PhotoroomProvider` exist solely so the
architecture is provider-independent and ready for real implementation later. Each:

- implements the relevant interface (`VideoAI`, `AudioAI`, or the `removeBackground`
  half of `ImageAI`),
- always throws `AIProviderError` (`services/ai/providerErrors.ts`) with a clear
  "not configured" message,
- never returns a fabricated successful result.

No API keys were generated or requested for these. `functions/src/config/env.ts`
declares `VEO_API_KEY`, `ELEVENLABS_API_KEY`, `PHOTOROOM_API_KEY` as optional and
unset — activating a provider is future work: implement the real HTTP/SDK call,
set the corresponding Firebase Functions secret, and this document's Status column
changes from ARCHITECTED to IMPLEMENTED (once code lands) and then CONFIGURED (once
a real key is set and verified).

## 5. Security invariants (unchanged, re-verified this phase)

- Every AI provider key (`GEMINI_API_KEY`, and the three new optional keys above)
  is read only via `functions/src/config/env.ts` → `process.env` (Firebase Functions
  runtime/secrets) — never accepted as request input, never returned in any response,
  never written to Firestore.
- `tests/aiProviderBoundary.test.ts` greps every frontend source file for these key
  names and for direct-provider-call patterns (`GoogleGenerativeAI`,
  `generativelanguage.googleapis.com`, `aiplatform.googleapis.com`) — zero matches
  required, enforced as a real (not manual) test.
- `functions/src/services/ai/factory/aiProviderFactory.test.ts` proves each
  not-yet-configured provider throws rather than fakes success.
