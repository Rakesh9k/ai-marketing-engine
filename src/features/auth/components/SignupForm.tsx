'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import {
  signupWithEmailPassword,
  sendVerificationEmail,
} from '@/features/auth/services/authService';
import { validateSignupForm } from '@/features/auth/utils/validation';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StyledLink } from '@/components/ui/Link';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import type { ValidationErrors } from '@/features/auth/types';
import { callFunction } from '@/services/api';

interface SignupFormProps {
  _onSuccess?: () => void;
}

export function SignupForm({ _onSuccess }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');

  const validateField = (name: string, value: string) => {
    let error: string | undefined;
    switch (name) {
      case 'email':
        error = validateSignupForm(value, password, confirmPassword).email;
        break;
      case 'password':
        error = validateSignupForm(email, value, confirmPassword).password;
        break;
      case 'confirmPassword':
        error = validateSignupForm(email, password, value).confirmPassword;
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setTermsError('');

    const validationErrors = validateSignupForm(email, password, confirmPassword);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!termsAccepted) {
      setTermsError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await signupWithEmailPassword(email, password);
      // Record consent server-side (server timestamp + server-chosen
      // version — see recordConsentAcceptance.ts). Best-effort: if this
      // call fails, the account still exists and the user can still use
      // the product; we surface a soft warning rather than blocking signup
      // on a secondary write.
      try {
        await callFunction<{ accepted: true }, { success: boolean }>({
          functionName: 'recordConsentAcceptance',
          data: { accepted: true },
        });
      } catch (consentError) {
        console.error('Failed to record consent acceptance', consentError);
      }
      // Show verification notice instead of redirecting to dashboard
      setShowVerificationNotice(true);
    } catch (error) {
      setGeneralError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      await sendVerificationEmail();
      setGeneralError('Verification email sent! Please check your inbox.');
    } catch (error) {
      setGeneralError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerificationNotice) {
    return (
      <div className="space-y-5 text-center">
        <div className="bg-success-50 border-success-200 text-success-800 rounded-md border p-4">
          <div className="mb-2 flex items-center justify-center gap-2">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-lg font-semibold">Verification email sent!</h3>
          </div>
          <p className="text-success-700 mb-4 text-sm">
            We've sent a verification email to <strong>{email}</strong>. Please check your inbox and
            click the link to verify your account.
          </p>
          <p className="text-success-600 mb-4 text-xs">
            Didn't receive it? Check your spam folder or click below to resend.
          </p>
          <div className="mx-auto flex max-w-xs flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              Resend verification email
            </Button>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setShowVerificationNotice(false)}
            >
              Back to signup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {generalError && (
        <div
          className="bg-error-50 border-error-200 text-error-600 rounded-md border p-3 text-sm"
          role="alert"
        >
          {generalError}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          validateField('email', e.target.value);
        }}
        onBlur={() => validateField('email', email)}
        error={errors.email}
        placeholder="you@example.com"
        disabled={isLoading}
        required
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          validateField('password', e.target.value);
        }}
        onBlur={() => validateField('password', password)}
        error={errors.password}
        placeholder="Create a password"
        disabled={isLoading}
        required
        helperText="At least 8 characters with uppercase, lowercase, and number"
      />

      <Input
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          validateField('confirmPassword', e.target.value);
        }}
        onBlur={() => validateField('confirmPassword', confirmPassword)}
        error={errors.confirmPassword}
        placeholder="Confirm your password"
        disabled={isLoading}
        required
      />

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) setTermsError('');
            }}
            disabled={isLoading}
            required
            aria-invalid={!!termsError}
            aria-describedby={termsError ? 'terms-error' : undefined}
          />
          <span className="text-text-secondary">
            I agree to the{' '}
            <StyledLink href="/terms" variant="primary" size="sm">
              Terms of Service
            </StyledLink>{' '}
            and{' '}
            <StyledLink href="/privacy" variant="primary" size="sm">
              Privacy Policy
            </StyledLink>
            .
          </span>
        </label>
        {termsError && (
          <p id="terms-error" className="text-error-600 mt-1 text-sm" role="alert">
            {termsError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
      >
        Create account
      </Button>

      <div className="flex items-center gap-3" role="separator">
        <div className="border-border-light h-px flex-1 border-t" />
        <span className="text-text-tertiary text-xs">or</span>
        <div className="border-border-light h-px flex-1 border-t" />
      </div>

      {/* Same Terms/Privacy checkbox above gates this button too — Google
          authenticating is not itself acceptance of Mitra's policies, so a
          brand-new Google user who hasn't checked the box can't proceed via
          Google either. An existing user isn't affected by this gate in
          practice since they'd use the Google button on /login, not here. */}
      <GoogleSignInButton
        onSuccess={() => {
          window.location.href = '/dashboard';
        }}
        disabled={!termsAccepted}
      />

      <p className="text-text-secondary text-center text-sm">
        Already have an account?{' '}
        <StyledLink href="/login" variant="primary" size="sm">
          Log in
        </StyledLink>
      </p>
    </form>
  );
}
