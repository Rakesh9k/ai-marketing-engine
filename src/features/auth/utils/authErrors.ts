export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password':
    'Password must be at least 8 characters with uppercase, lowercase, and number.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found':
    'No account found with this email. Please check your email or create an account.',
  'auth/wrong-password': 'The email or password is incorrect.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed':
    "We couldn't connect. Please check your internet connection and try again.",
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
  'auth/requires-recent-login': 'Please log in again to complete this action.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code && AUTH_ERROR_MESSAGES[firebaseError.code]) {
      return AUTH_ERROR_MESSAGES[firebaseError.code]!;
    }
    return firebaseError.message || 'An unexpected error occurred. Please try again.';
  }
  return 'An unexpected error occurred. Please try again.';
}

export function isAuthError(error: unknown): error is { code: string; message: string } {
  return error instanceof Error && 'code' in error;
}
