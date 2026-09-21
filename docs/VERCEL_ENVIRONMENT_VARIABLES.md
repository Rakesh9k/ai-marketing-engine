# Vercel Environment Variables

Source of truth: `grep` of `src/` and `next.config.ts` for `process.env` (VERIFIED). The Next.js app reads exactly the 11 variables below. All are `NEXT_PUBLIC_*`, so all are browser-visible and inlined **at build time** (changing one in Vercel requires a redeploy).

No secret values appear in this document. Values for the Firebase web config come from `firebase apps:sdkconfig WEB 1:691254604957:web:caf76181c86efb6a7b5074` (project `brainwise-ai-marketing-engine`); the bundled config was compared against it and matches (projectId, appId, storageBucket, authDomain, messagingSenderId, apiKey).

| Variable | Public | Required | Production | Preview | Purpose |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes (web key, not a secret) | Yes | Set | Set | Firebase web API key for project `brainwise-ai-marketing-engine` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Yes | `brainwise-ai-marketing-engine.firebaseapp.com` | same | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Yes | `brainwise-ai-marketing-engine` | same | Firebase project |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Yes | `brainwise-ai-marketing-engine.firebasestorage.app` | same | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Yes | `691254604957` | same | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Yes | `1:691254604957:web:caf76181c86efb6a7b5074` | same | Firebase web app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Yes | Optional | Set if using Analytics | same | Google Analytics |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Yes (site key, not a secret) | **Yes** | Set — reCAPTCHA Enterprise key | same key | App Check provider. Without it App Check does not initialize and **every callable fails** (fail-closed, logged loudly). The key's allowed domains must include the serving origin |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes (publishable id) | Yes for `/billing` checkout | `rzp_test_…` until launch, then `rzp_live_…` | `rzp_test_…` | Opens Razorpay Checkout; verification/secret stay in Functions |
| `NEXT_PUBLIC_USE_EMULATORS` | Yes | No | **DO NOT SET** (or `false`) | **DO NOT SET** (or `false`) | When `'true'`: connects Auth/Firestore/Storage/Functions to `localhost` emulators and enables the App Check debug token. Local dev only (`.env.local`) |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | Yes (visible in bundle) | No | **DO NOT SET** | **DO NOT SET** | Dev-only, and only read when `USE_EMULATORS === 'true'` |

## Listed in `.env.example` but NOT read by the code (VERIFIED)

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENABLE_SALON_VERTICAL`, `NEXT_PUBLIC_ENABLE_REAL_ESTATE_VERTICAL`, `NEXT_PUBLIC_ENABLE_WHATSAPP_API`, `NEXT_PUBLIC_ENABLE_AGENCY_WORKSPACE`. Setting them in Vercel is harmless but has no effect today. (The canonical URL is hardcoded in `src/app/layout.tsx` as `metadataBase` = `https://brain-wise.com`.)

## Must NEVER be in Vercel (stay in Firebase Functions secrets)

Razorpay key secret and webhook secret; Gemini / OpenAI / NVIDIA API keys; Firebase Admin / service-account credentials (`FIREBASE_ADMIN_*`); any private key. The Next app has no code path that reads them.

## Environment separation

| Environment | `NEXT_PUBLIC_USE_EMULATORS` | Firebase target | App Check |
|---|---|---|---|
| Local dev (`.env.local`, git-ignored) | `true` | emulators for Auth/Firestore/Storage/Functions; real App Check exchange via registered debug token | debug token |
| Vercel Production / Preview | unset | real project `brainwise-ai-marketing-engine` | reCAPTCHA Enterprise, no debug token |

Precedence note: Next loads process env > `.env.production.local` > `.env.local` > `.env`. Vercel builds from Git and does not have `.env.local` (git-ignored, verified untracked), so it only sees dashboard variables.

## Preview-specific caveat

Preview deployments get a unique `*.vercel.app` origin. For Auth and App Check to work there, that hostname must be added to (a) Firebase Console → Authentication → Settings → Authorized domains and (b) the reCAPTCHA Enterprise key's allowed domains. Otherwise expect Auth `auth/unauthorized-domain` errors or App Check `UNAUTHENTICATED` from callables — a configuration issue, not a code defect.
