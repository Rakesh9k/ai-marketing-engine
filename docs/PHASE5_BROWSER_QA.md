# Phase 5 — real-browser QA (2026-10-03)

## Environment actually tested
- Browser: Microsoft Edge (Chromium 154) driven by Playwright, desktop 1280px and mobile 375 / 390 / 414px (`isMobile`, 2x DPR). Safari/WebKit and a physical phone were NOT available.
- App: the production build (`next start`, NODE_ENV=production) of the working tree, served on localhost. The deployed frontend could not be used: the `mitra-web` Cloud Run URL returns 403 and `www.brain-wise.com` still serves an older build with no `/pricing`.
- Backend: Firebase **emulators** (Auth, Firestore, Storage, Functions) for the project id `brainwise-ai-marketing-engine`, with the REAL Gemini key (real copy + real image generation) and a throwaway fake service-account key so the emulator could sign upload URLs. Signed-URL PUTs were routed by the test into the Storage emulator because the emulator does not implement V4 signed uploads.
- Payments: real **Paddle sandbox** checkout opened from the app and a test-card payment completed (Paddle redirected to /welcome). Paddle cannot reach a local webhook, so webhook → credits was not exercised end to end here.
- Not exercised in the browser: the reel (Cloud Run renderer needs a service identity; verified separately in Phase 4), production Firebase/App Check, a controlled live payment, Safari.

## Defects found and fixed
See the Phase 5 report; the launch-blocking ones were: new users could not save their first product (stale ID token without `businessIds` + `undefined` Firestore fields); the template list never loaded (wizard objective ≠ backend enum); generation failed on the first real Gemini call (no schema sent to the model, `min(10)` facts, 30 s timeout); a Truth Check discard charged 140 credits; credit packs were invisible to the client-side credit check; SVG-only image downloads; fake "10K+ Happy Businesses", dead "See How Mitra Works", fake WhatsApp sign-in buttons and several "automation" claims; dark-mode white cards on the campaign page; overlapping logo on /pricing.

## Known environment artefacts (not product bugs)
- Red "Running in emulator mode" banner (Firebase SDK, emulator only).
- `next/image` 400 for `127.0.0.1:9199` images (emulator host is not allow-listed; production storage hosts are).
- Free plan (100 credits) cannot afford one campaign (140 credits) — a pricing/product decision, now explained in the UI.
