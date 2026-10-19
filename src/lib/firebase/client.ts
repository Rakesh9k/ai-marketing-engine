import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
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
    try {
      appCheck = initializeFirebaseAppCheck(app);
    } catch (err) {
      console.warn('[Firebase] AppCheck initialization skipped:', err);
    }

    try {
      auth = getAuth(app);
    } catch (err) {
      console.warn('[Firebase] Auth initialization skipped:', err);
    }

    // Firestore initialization deferred to getFirebaseDb() lazy getter.
    // See getFirebaseDb() JSDoc for why module-evaluation init is fragile.
    db = undefined;

    try {
      storage = getStorage(app);
    } catch (err) {
      console.warn('[Firebase] Storage initialization skipped:', err);
    }

    try {
      functions = getFunctions(app, 'asia-south1');
    } catch (err) {
      console.warn('[Firebase] Functions initialization skipped:', err);
    }

    if (process.env['NEXT_PUBLIC_USE_EMULATORS'] === 'true') {
      if (auth) {
        try {
          connectAuthEmulator(auth, 'http://localhost:9099');
        } catch {}
      }
      if (db) {
        try {
          connectFirestoreEmulator(db, 'localhost', 8080);
        } catch {}
      }
      if (storage) {
        try {
          connectStorageEmulator(storage, 'localhost', 9199);
        } catch {}
      }
      if (functions) {
        try {
          connectFunctionsEmulator(functions, 'localhost', 5001);
        } catch {}
      }
    } else if (
      typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      // Phase 11 Prod/Dev Separation Audit: this project has a single
      // Firebase project shared by local dev and production (see the
      // Phase 2 audit — no separate dev project exists), so the ONLY thing
      // that stops a local `next dev` session from reading/writing REAL
      // production Firestore/Storage/Auth data is this one env var being
      // 'true'. If it's ever unset or misspelled in a developer's own
      // .env.local while real (non-placeholder) Firebase config is still
      // present, this silently falls through to the real backend with no
      // other signal that anything is wrong. This is deliberately a loud
      // warning, not a thrown error: pointing localhost at the real
      // backend is a legitimate, documented workflow for verifying App
      // Check/reCAPTCHA against production (see
      // docs/PHASE_20B_APP_CHECK_AUTH_LOCAL_FIX_REPORT.md) — this must not
      // block that, only make an accidental version of it impossible to miss.
      // eslint-disable-next-line no-console
      console.warn(
        '[Mitra] Running on localhost but NEXT_PUBLIC_USE_EMULATORS is not "true" — ' +
          'this session is connected to the REAL Firebase backend, not local emulators. ' +
          'If this is unintentional, set NEXT_PUBLIC_USE_EMULATORS=true in .env.local.'
      );
    }
  }

  return { app, auth, db, storage, functions, appCheck };
}

const firebaseInstances = initializeFirebase();

export const firebaseApp = firebaseInstances.app;
export const firebaseAuth = firebaseInstances.auth;
export let firebaseDb: Firestore | undefined = firebaseInstances.db;
export const firebaseStorage = firebaseInstances.storage;
export const firebaseFunctions = firebaseInstances.functions;
export const firebaseAppCheck = firebaseInstances.appCheck;

export function getFirebaseApp(): FirebaseApp | undefined {
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | undefined {
  return firebaseAuth;
}

/**
 * Firestore, created lazily with a retry.
 *
 * Creating it only once, at module evaluation, was fragile: under some bundle evaluation
 * orders (observed with the Turbopack dev server) `getFirestore()` runs before Firestore's
 * service registration has executed and throws "Service firestore is not available". That
 * error was only console.warn'ed, so `firebaseDb` stayed undefined for the whole session and
 * every Firestore read in the app (billing, usage, subscriptions, ...) silently returned
 * nothing — a paying customer saw the Free plan. The registration has always completed by the
 * time a component actually needs the database, so resolve it on demand instead.
 */
export function getFirebaseDb(): Firestore | undefined {
  if (firebaseDb) return firebaseDb;
  if (typeof window === 'undefined' || !firebaseApp) return undefined;

  try {
    let instance: Firestore;
    try {
      instance = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch (initErr: unknown) {
      // Only fall back to getFirestore if initializeFirestore failed because it was ALREADY initialized
      const msg = initErr instanceof Error ? initErr.message : String(initErr);
      if (msg.includes('already been called') || msg.includes('already exists')) {
        instance = getFirestore(firebaseApp);
      } else {
        throw initErr;
      }
    }
    if (process.env['NEXT_PUBLIC_USE_EMULATORS'] === 'true') {
      try {
        connectFirestoreEmulator(instance, 'localhost', 8080);
      } catch {
        // Already connected (or already started): safe to ignore.
      }
    }
    firebaseDb = instance;
    return instance;
  } catch (err) {
    console.error('[Firebase] Firestore is not available yet:', err);
    return undefined;
  }
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
