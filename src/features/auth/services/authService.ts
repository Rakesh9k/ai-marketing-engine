import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
  type Auth,
  type UserCredential,
  type ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

function getAuthInstance(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Ensure this runs in browser environment.');
  }
  return auth;
}

export async function signupWithEmailPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getAuthInstance();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Send email verification automatically
  if (credential.user) {
    await sendEmailVerification(credential.user);
  }
  return credential;
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getAuthInstance();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getAuthInstance();
  return sendPasswordResetEmail(auth, email);
}

export async function logout(): Promise<void> {
  const auth = getAuthInstance();
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  const auth = getAuthInstance();
  return auth.currentUser;
}

/**
 * Send email verification to the current user
 */
export async function sendVerificationEmail(): Promise<void> {
  const auth = getAuthInstance();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  await sendEmailVerification(user);
}

/**
 * Check if current user's email is verified
 */
export function isEmailVerified(): boolean {
  const auth = getAuthInstance();
  const user = auth.currentUser;
  return user?.emailVerified ?? false;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getAuthInstance();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return signInWithPopup(auth, provider);
}

/**
 * Sign in with Phone OTP
 * Requires a RecaptchaVerifier to be set up first
 */
export async function signInWithPhone(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = getAuthInstance();
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

/**
 * Create a RecaptchaVerifier for Phone OTP
 */
export function createRecaptchaVerifier(
  containerId: string,
  options?: { size?: 'normal' | 'compact'; callback?: () => void; 'expired-callback'?: () => void }
): RecaptchaVerifier {
  const auth = getAuthInstance();
  return new RecaptchaVerifier(auth, containerId, options);
}
