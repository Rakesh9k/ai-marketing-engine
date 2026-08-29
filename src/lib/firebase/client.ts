import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';

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

function initializeFirebase(): {
  app: FirebaseApp | undefined;
  auth: Auth | undefined;
  db: Firestore | undefined;
  storage: FirebaseStorage | undefined;
  functions: Functions | undefined;
} {
  if (typeof window === 'undefined') {
    return {
      app: undefined,
      auth: undefined,
      db: undefined,
      storage: undefined,
      functions: undefined,
    };
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  if (app) {
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

  return { app, auth, db, storage, functions };
}

const firebaseInstances = initializeFirebase();

export const firebaseApp = firebaseInstances.app;
export const firebaseAuth = firebaseInstances.auth;
export const firebaseDb = firebaseInstances.db;
export const firebaseStorage = firebaseInstances.storage;
export const firebaseFunctions = firebaseInstances.functions;

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
