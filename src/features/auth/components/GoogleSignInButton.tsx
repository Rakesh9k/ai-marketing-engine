'use client';

import { useState } from 'react';
import { getAdditionalUserInfo } from 'firebase/auth';
import { signInWithGoogle, logout } from '@/features/auth/services/authService';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { callFunction } from '@/services/api';
import { Button } from '@/components/ui/Button';

interface GoogleSignInButtonProps {
  /** Called once the caller is fully ready to proceed (existing user, or a
   * new user who has just explicitly accepted Terms/Privacy). */
  onSuccess: () => void;
  /** Gate the button itself, e.g. from the signup page's own Terms/Privacy
   * checkbox — mirrors the same requirement the email/password signup path
   * already enforces before its "Create account" button is enabled. */
  disabled?: boolean;
}

/**
 * Shared "Continue with Google" control for both the login and signup
 * pages — one implementation, so new-user detection and consent handling
 * can't drift between the two entry points.
 *
 * Mitra account initialization (users/{uid}, subscription, usage, welcome
 * credits, custom claims) already happens for ANY new Firebase Auth user
 * via the existing onUserCreatedHandler Auth trigger
 * (functions/src/functions/auth/onUserCreated.ts) — that trigger fires on
 * Auth-level user creation regardless of provider, so Google sign-in reuses
 * it automatically with no code change there, and there is no duplicate-
 * initialization risk on retry (it is an Auth-level, not client-triggered,
 * event that fires at most once per Firebase user).
 *
 * What Google authentication does NOT establish on its own is Terms/
 * Privacy acceptance — a Google sign-in is not evidence the user has seen
 * or agreed to Mitra's policies. For a brand-new Google user (detected via
 * getAdditionalUserInfo(credential).isNewUser, Firebase's own signal, not a
 * heuristic), this component blocks on an explicit consent step before
 * calling onSuccess, using the same recordConsentAcceptance Cloud Function
 * the email/password signup path already uses — no separate consent logic.
 * A returning Google user (isNewUser === false) skips this entirely, same
 * as email/password login never re-prompts for consent.
 */
export function GoogleSignInButton({ onSuccess, disabled }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    setError('');
    setIsLoading(true);
    try {
      const credential = await signInWithGoogle();
      const additionalInfo = getAdditionalUserInfo(credential);
      if (additionalInfo?.isNewUser) {
        setNeedsConsent(true);
        setIsLoading(false);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleConfirmConsent = async () => {
    if (!consentChecked) return;
    setConfirming(true);
    setError('');
    try {
      await callFunction<{ accepted: true }, { success: boolean }>({
        functionName: 'recordConsentAcceptance',
        data: { accepted: true },
      });
      onSuccess();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setConfirming(false);
    }
  };

  const handleCancelConsent = async () => {
    // The Firebase Auth user was already created by the Google popup — that
    // can't be undone client-side — but we sign them back out rather than
    // leave the app showing an authenticated session that never recorded
    // consent. They can sign in with Google again later to retry.
    setNeedsConsent(false);
    setConsentChecked(false);
    setError('');
    try {
      await logout();
    } catch {
      // Best-effort — nothing actionable if this itself fails.
    }
  };

  if (needsConsent) {
    return (
      <div className="border-border-light bg-surface space-y-3 rounded-md border p-4">
        <p className="text-body text-text-secondary text-sm">
          Before continuing with your Google account, please review and accept our policies.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            disabled={confirming}
          />
          <span className="text-text-secondary">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {error && (
          <div
            className="bg-error-50 border-error-200 text-error-600 rounded-md border p-2 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!consentChecked || confirming}
            loading={confirming}
            onClick={() => void handleConfirmConsent()}
          >
            Agree &amp; continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={confirming}
            onClick={() => void handleCancelConsent()}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          className="bg-error-50 border-error-200 text-error-600 mb-3 rounded-md border p-3 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading || disabled}
        onClick={() => void handleClick()}
      >
        <GoogleIcon />
        Continue with Google
      </Button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}
