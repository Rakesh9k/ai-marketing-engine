let adminApp: any = null;

/**
 * Initializes and returns the server-side Firebase Admin instance for Next.js API routes.
 */
export function getFirebaseAdmin(): any {
  if (adminApp) return adminApp;

  const { getApps, initializeApp } = require('firebase-admin/app');
  const apps = getApps();
  if (apps.length > 0 && apps[0]) {
    adminApp = apps[0];
    return adminApp;
  }

  const projectId =
    process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] || process.env['FIREBASE_PROJECT_ID'];

  if (
    process.env['NEXT_PUBLIC_USE_EMULATORS'] === 'true' ||
    process.env['FIREBASE_AUTH_EMULATOR_HOST']
  ) {
    if (!process.env['FIREBASE_AUTH_EMULATOR_HOST']) {
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';
    }
  }

  adminApp = initializeApp({
    projectId: projectId || 'demo-ai-marketing-engine',
  });
  return adminApp;
}

export function getAdminAuth(): any {
  const { getAuth } = require('firebase-admin/auth');
  return getAuth(getFirebaseAdmin());
}

export function getAdminFirestore(): any {
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(getFirebaseAdmin());
}
