# Reels in production — architecture, verification, runbook

Phase 4 audit, 2026-10-03.

## Pipeline

```
ReelWizard -> createReelProject / getReelClipUploadUrl / confirmReelClipUpload (user clips -> businesses/{biz}/reels/{id}/clips)
-> generateReel (callable, auth + App Check, usage reserve -> finalize | refund)
   analyse clips (Gemini) -> validated edit plan -> CloudRunVideoRenderer
-> Cloud Run `reel-renderer` (asia-south1): ffmpeg, downloads clips + music from Storage, renders,
   uploads businesses/{biz}/reels/{id}/output/reel.mp4 + thumbnail.jpg (Admin SDK)
-> generateReel verifies both objects exist and are non-trivial, then marks `completed`
-> ReelPreview: player + Download (downloadUrl = same file, Content-Disposition: attachment)
```

- Renderer selection (`functions/src/services/videoRenderer.ts`): `REEL_RENDERER_URL` set -> Cloud Run; unset -> mock ONLY in the emulator or under Jest; anywhere else it throws (reel fails and is refunded). Deployed `generateReel` has `REEL_RENDERER_URL` set (no mock in production).
- Authentication: Cloud Run is private. Callers need `roles/run.invoker`; functions call with an OIDC ID token (`GoogleAuth.getIdTokenClient`). Invokers today: the default compute SA (which `generateReel` runs as), `mitra-reel-renderer` SA, and one human account. `REEL_RENDERER_API_KEY` is optional defence in depth and is not configured; it is not required while IAM is enforced.
- Storage: `businesses/{businessId}/**` is read-only for members of that business and never client-writable (`storage.rules`); output is written only by the Admin SDK. `shared/reel-music/*` is readable when signed in, never client-writable.
- Stored signed URLs expire after 7 days, so `getReel` / `listReels` re-sign from `outputStoragePath` on every read.

## Music library

`REEL_MUSIC_LIBRARY` lists 7 in-house tracks. They are not user-supplied. Generate and upload once per environment:

```
node scripts/generate-reel-music.mjs tmp/reel-music
gcloud storage cp tmp/reel-music/*.mp3 gs://<bucket>/shared/reel-music/ --content-type=audio/mpeg
```

Before 2026-10-03 production held a single object, `energetic_01.mp3`, and it was a 15 s 523 Hz test tone written by
`services/reel-renderer/src/testEndToEnd.ts` (it uploaded its test tone to the real path on every run). The other six
styles/goals would have failed at render time. All 7 tracks are now uploaded (45 s, loudness-normalised). The test
script now writes its music under its throwaway prefix. The tracks are synthesized (chord pad, kick, hats) and are
functional rather than polished: have the founder listen and replace any track with a better in-house one at the same path.

## Verifying the live renderer

`node scripts/verify-reel-renderer.mjs` (needs `gcloud` auth with run.invoker and the renderer's node_modules): IAM refusal for
anonymous callers, malformed/missing-clip/missing-music failures leave no output object, two concurrent real renders for two
throwaway tenants -> MP4 probe (H.264 + AAC, 1080x1920), non-silent audio, separate objects. Cleans up after itself.

Note: Cloud Run's front end reserves `/healthz`, so it returns 404 from outside even though the container serves it for
its own probes. Use `/` + a render check (above) for external health; an alias route needs a renderer redeploy.

## Known gaps
- The deployed renderer image (revision reel-renderer-00005) was built from a working tree with UNCOMMITTED files
  (`services/reel-renderer/src/lib/**` was git-ignored by a too-broad `lib/` rule; Dockerfile now installs ffmpeg via apt).
  Commit those files or the next build from git will fail.
- Function changes in this phase (completion verification, URL refresh, renderer timeouts) are in the repo but NOT deployed.
- A real signed-in browser run (upload clips -> generate -> download -> refresh -> re-login) has not been performed.
