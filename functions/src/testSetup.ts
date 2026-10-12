/**
 * Several services (usageControl.ts, firestore.ts) call admin.firestore()
 * at module load time, which throws "The default Firebase app does not
 * exist" unless an app is initialized first. This has nothing to do with
 * AI generation itself — it's just what importing any module that
 * transitively touches those services requires in a test process. No real
 * network calls are made in these unit tests; this only prevents the
 * import-time crash.
 */
// getEnvConfig() (config/env.ts) requires NODE_ENV to be one of
// 'development'|'staging'|'production'; Jest sets NODE_ENV=test
// automatically, which fails that validation and falls back to a fixed
// config object that omits GEMINI_API_KEY/OPENAI_API_KEY entirely
// (regardless of what's in process.env) — set before any other import so
// getEnvConfig sees a valid value the first time it's called.
// @types/node types NODE_ENV as readonly; this is a legitimate, narrow
// exception to reassign it in a test bootstrap file only.
(process.env as { NODE_ENV: string }).NODE_ENV = 'development';
process.env['FIREBASE_PROJECT_ID'] ||= 'demo-test-project';

import * as admin from 'firebase-admin';
import { generateKeyPairSync } from 'crypto';

if (admin.apps.length === 0) {
  // Signed-URL support for emulator-backed Storage tests (e.g.
  // confirmReelClipUpload.test.ts's same-business success case): V4 URL
  // signing (bucket.file(...).getSignedUrl()) is computed locally from a
  // service-account private key and never touches the network, but the
  // Admin SDK refuses to attempt it at all without *some* credential
  // ("Could not load the default credentials"). This process has no real
  // GCP service account available, so a throwaway keypair is generated
  // here purely to satisfy that local signing step — the resulting URL is
  // never validated against real GCS, only against the Storage emulator,
  // which (like the rest of this test bootstrap) does no signature
  // verification. Not used for Firestore/Auth, which are reached via the
  // *_EMULATOR_HOST env vars and ignore credentials entirely.
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const fakeServiceAccount = {
    projectId: 'demo-test-project',
    clientEmail: 'test-signer@demo-test-project.iam.gserviceaccount.com',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
  };
  // storageBucket: confirmUpload.ts/confirmReelClipUpload.ts call
  // admin.storage().bucket() with no arguments, which (unlike the client
  // SDK) the Admin SDK refuses to default from projectId alone — it throws
  // "Bucket name not specified or invalid" unless an app-level
  // storageBucket is configured. Only exercised by emulator-backed tests
  // that actually upload/read a real Storage object; harmless for every
  // other test, which never calls admin.storage().
  admin.initializeApp({
    credential: admin.credential.cert(fakeServiceAccount),
    projectId: 'demo-test-project',
    storageBucket: 'demo-test-project.appspot.com',
  });
  // Mirror functions/src/index.ts's Phase 12 fix — the real app enables
  // this globally, so tests must too, or they'd exercise different
  // (stricter) Firestore write behavior than production actually has.
  admin.firestore().settings({ ignoreUndefinedProperties: true });
}

// image.ts/text.ts/vision.ts construct their provider SDK clients as
// module-level singletons (export const geminiImageProvider = new
// GeminiImageProvider(); etc). Provider construction must not require
// credentials at import time, which would crash any test file that
// transitively imports functions/src/services/ai/index.ts or pipeline.ts
// even when the test never makes a real API call. These are obviously fake
// values — no real provider call succeeds with them — set only so module
// import doesn't crash in a test process with no credentials configured.
process.env['GEMINI_API_KEY'] ||= 'test-fake-gemini-key-for-unit-tests-only';

// Unit/integration tests must NEVER spend real money. The line above keeps a real key when one is present in the
// shell or .env.local, which let tests that do not mock the provider (creativeOpportunity.integration) make real,
// billed Gemini calls on every full run. Unless a live harness is explicitly opted into (LIVE_GEMINI=1, which also
// requires LIVE_BUDGET_INR and the spend meter), the key is replaced by an obviously fake one.
if (process.env['LIVE_GEMINI'] !== '1') {
  process.env['GEMINI_API_KEY'] = 'test-fake-gemini-key-for-unit-tests-only';
}
