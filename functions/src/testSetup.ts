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

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'demo-test-project' });
  // Mirror functions/src/index.ts's Phase 12 fix — the real app enables
  // this globally, so tests must too, or they'd exercise different
  // (stricter) Firestore write behavior than production actually has.
  admin.firestore().settings({ ignoreUndefinedProperties: true });
}

// image.ts/text.ts/vision.ts construct their provider SDK clients as
// module-level singletons (export const openAIImageProvider = new
// OpenAIImageProvider(); etc). The OpenAI SDK throws at construction time
// if OPENAI_API_KEY is an empty string, which crashes any test file that
// transitively imports functions/src/services/ai/index.ts or pipeline.ts
// even when the test never makes a real API call. These are obviously fake
// values — no real provider call succeeds with them — set only so module
// import doesn't crash in a test process with no credentials configured.
process.env['OPENAI_API_KEY'] ||= 'sk-test-fake-key-for-unit-tests-only';
process.env['GEMINI_API_KEY'] ||= 'test-fake-gemini-key-for-unit-tests-only';
