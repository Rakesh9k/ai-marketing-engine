import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
  measurementId: process.env['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'],
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;
let appCheck: AppCheck | undefined;

/**
 * Phase 20A: every one of the 24 Cloud Functions is deployed with
 * `enforceAppCheck: true` (confirmed by grep, not assumed), but this
 * client never initialized Firebase App Check at all — the App Check SDK
 * attaches its token to outgoing callable requests automatically once
 * `initializeAppCheck()` has run on this same `app` instance, so a
 * missing call here is a missing token, not a missing/invalid auth token.
 * A real-browser test against a live callable confirmed exactly this:
 * `auth: VALID`, `app: MISSING`, response `UNAUTHENTICATED` — and
 * temporarily setting `enforceAppCheck: false` on createBusiness.ts alone
 * let the same request through, isolating App Check (not auth) as the
 * blocking layer. That diagnostic override is reverted back to `true`
 * now that the actual fix (this function) exists — leaving one function
 * exempt from a security gate every other one enforces would just move
 * the hole rather than close it.
 *
 * initializeAppCheck() must run before any callable function is invoked,
 * which is why it happens here, in the same synchronous module-init path
 * that already sets up auth/firestore/storage/functions — not lazily on
 * first use, where a race against an early campaign/business/product call
 * could still send a token-less request.
 */
function initializeFirebaseAppCheck(firebaseApp: FirebaseApp): AppCheck | undefined {
  const siteKey = process.env['NEXT_PUBLIC_RECAPTCHA_SITE_KEY'];
  const useEmulators = process.env['NEXT_PUBLIC_USE_EMULATORS'] === 'true';

  // reCAPTCHA (Enterprise or v3) cannot validate against localhost/the
  // emulator suite's origin the way it validates a real registered domain.
  // Firebase's own documented mechanism for this — a debug token — makes
  // the App Check SDK skip the reCAPTCHA challenge entirely and mint a
  // token the Functions emulator (and, if registered in the Firebase
  // console, a real backend for CI) accepts instead. This must be set
  // before initializeAppCheck() runs.
  if (useEmulators) {
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env['NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN'] || true;
  }

  if (!siteKey) {
    // Every callable function will now be rejected with UNAUTHENTICATED
    // (the exact symptom this phase exists to fix) until a real reCAPTCHA
    // Enterprise site key is registered for this Firebase project and set
    // as NEXT_PUBLIC_RECAPTCHA_SITE_KEY. This is loud on purpose — a silent
    // no-op here would reproduce the original bug with no diagnostic
    // trail. Emulator/local dev still works via the debug token above.
    if (!useEmulators) {
      console.error(
        'Firebase App Check was not initialized: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. ' +
          'Every Cloud Function call will fail with UNAUTHENTICATED until a real reCAPTCHA ' +
          'Enterprise site key is configured for this Firebase project.'
      );
      return undefined;
    }
  }

  // Phase 20C: registered via Google's reCAPTCHA Enterprise console (the
  // key this project's registration flow actually produced), not classic
  // reCAPTCHA v3 — Firebase App Check supports both providers, and
  // ReCaptchaEnterpriseProvider is the one that matches an Enterprise key.
  // A v3-flavored key would silently fail verification against this
  // provider (and vice versa) since the two are different backend systems.
  return initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(
      siteKey || 'debug-placeholder-key-unused-with-debug-token'
    ),
    isTokenAutoRefreshEnabled: true,
  });
}

function initializeFirebase(): {
  app: FirebaseApp | undefined;
  auth: Auth | undefined;
  db: Firestore | undefined;
  storage: FirebaseStorage | undefined;
  functions: Functions | undefined;
  appCheck: AppCheck | undefined;
} {
  if (typeof window === 'undefined') {
    return {
      app: undefined,
      auth: undefined,
      db: undefined,
      storage: undefined,
      functions: undefined,
      appCheck: undefined,
    };
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  if (app) {
    // App Check first: it must be attached to this `app` instance before
    // getFunctions()'s callables are ever invoked, so that the SDK's
    // per-request App Check token attachment is active from the start.
    appCheck = initializeFirebaseAppCheck(app);

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'asia-south1');

    if (process.env['NEXT_PUBLIC_USE_EMULATORS'] === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  }

  return { app, auth, db, storage, functions, appCheck };
}

const firebaseInstances = initializeFirebase();

export const firebaseApp = firebaseInstances.app;
export const firebaseAuth = firebaseInstances.auth;
export const firebaseDb = firebaseInstances.db;
export const firebaseStorage = firebaseInstances.storage;
export const firebaseFunctions = firebaseInstances.functions;
export const firebaseAppCheck = firebaseInstances.appCheck;

export function getFirebaseApp(): FirebaseApp | undefined {
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | undefined {
  return firebaseAuth;
}

export function getFirebaseDb(): Firestore | undefined {
  return firebaseDb;
}

export function getFirebaseStorage(): FirebaseStorage | undefined {
  return firebaseStorage;
}

export function getFirebaseFunctions(): Functions | undefined {
  return firebaseFunctions;
}

export function getFirebaseAppCheck(): AppCheck | undefined {
  return firebaseAppCheck;
}
