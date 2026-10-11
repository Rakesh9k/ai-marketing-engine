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
import { beginAuthFlow } from '@/features/auth/authFlowState';

interface SignupFormProps {
  _onSuccess?: () => void;
}

export function SignupForm({ _onSuccess }: SignupFormProps) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    // Hold PublicOnlyRoute's redirect until consent is recorded; the new account is already
    // 'authenticated' the moment it exists, which would otherwise navigate away mid-request.
    const releaseFlow = beginAuthFlow();
    try {
      await signupWithEmailPassword(email, password);
      // Record consent server-side
      try {
        await callFunction<{ accepted: true }, { success: boolean }>({
          functionName: 'recordConsentAcceptance',
          data: { accepted: true },
        });
      } catch (consentError) {
        console.error('Failed to record consent acceptance', consentError);
      }
      setShowVerificationNotice(true);
    } catch (error) {
      setGeneralError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
      releaseFlow();
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
      <div className="space-y-5 py-2 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="mb-1 text-xl font-bold text-emerald-950">Verification email sent!</h3>
          <p className="mb-4 text-sm leading-relaxed text-emerald-800">
            We&apos;ve sent a verification email to{' '}
            <strong className="text-emerald-950">{email}</strong>. Please check your inbox and click
            the link to verify your account.
          </p>
          <p className="mb-5 text-xs text-emerald-700">
            Didn&apos;t receive it? Check your spam folder or click below to resend.
          </p>
          <div className="mx-auto flex max-w-xs flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleResendVerification}
              disabled={isLoading}
              className="rounded-xl bg-[#E84D1A] font-semibold text-white hover:bg-[#d04113]"
            >
              Resend verification email
            </Button>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setShowVerificationNotice(false)}
              className="text-[#5C5C66]"
            >
              Back to signup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
      {generalError && (
        <div
          className="bg-error-50 border-error-200 text-error-600 animate-shake-sm rounded-xl border p-3.5 text-sm font-medium"
          role="alert"
        >
          {generalError}
        </div>
      )}

      {/* Full Name Input (Reference Image) */}
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your name"
        disabled={isLoading}
      />

      {/* Email Input */}
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          validateField('email', e.target.value);
        }}
        onBlur={() => validateField('email', email)}
        error={errors.email}
        placeholder="you@company.com"
        disabled={isLoading}
        required
      />

      {/* Phone Number Input with +91 Prefix Selector */}
      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1E]">Phone number</label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={isLoading}
            className="border-border-medium bg-surface focus:ring-brand-500 rounded-md border px-2.5 py-2.5 text-sm font-medium text-[#1A1A1E] focus:ring-2 focus:outline-none"
          >
            <option value="+91">🇮🇳 +91</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+971">🇦🇪 +971</option>
          </select>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Your phone number"
            disabled={isLoading}
            className="border-border-medium bg-surface placeholder:text-text-tertiary focus:ring-brand-500 w-full rounded-md border px-4 py-2.5 text-base text-[#1A1A1E] focus:border-transparent focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="relative">
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              validateField('password', e.target.value);
            }}
            onBlur={() => validateField('password', password)}
            error={errors.password}
            placeholder="Create a strong password"
            disabled={isLoading}
            required
            helperText="At least 8 characters with uppercase, lowercase, and number"
          />
          <button
            type="button"
            className="absolute top-[38px] right-3 text-[#757580] hover:text-[#1A1A1E] focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Confirm Password Input */}
      <Input
        label="Confirm Password"
        type={showPassword ? 'text' : 'password'}
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

      {/* Terms & Privacy Checkbox */}
      <div>
        <label className="flex cursor-pointer items-start gap-2.5 text-xs sm:text-sm">
          <input
            type="checkbox"
            className="focus:ring-brand-500 mt-0.5 h-4 w-4 rounded border-[#D1CBD8] text-[#E84D1A]"
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
          <span className="text-[#5C5C66]">
            I agree to the{' '}
            <StyledLink
              href="/terms"
              variant="primary"
              size="sm"
              className="font-semibold text-[#E84D1A]"
            >
              Terms of Service
            </StyledLink>{' '}
            and{' '}
            <StyledLink
              href="/privacy"
              variant="primary"
              size="sm"
              className="font-semibold text-[#E84D1A]"
            >
              Privacy Policy
            </StyledLink>
            .
          </span>
        </label>
        {termsError && (
          <p id="terms-error" className="text-error-600 mt-1 text-xs font-medium" role="alert">
            {termsError}
          </p>
        )}
      </div>

      {/* Primary CTA */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
        className="rounded-xl bg-[#E84D1A] py-3 font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-[#d04113] active:bg-[#b8380e]"
      >
        {isLoading ? 'Creating your account...' : 'Create Account →'}
      </Button>

      {/* SSO Separator */}
      <div className="flex items-center gap-3 pt-1" role="separator">
        <div className="h-px flex-1 border-t border-[#EAE5DC]" />
        <span className="text-xs font-medium tracking-wider text-[#757580] uppercase">
          or continue with
        </span>
        <div className="h-px flex-1 border-t border-[#EAE5DC]" />
      </div>

      {/* SSO Buttons Grid */}
      <div className="grid grid-cols-1 gap-3">
        {/* Navigation after Google sign-in is decided by the page's PublicOnlyRoute (new vs
            returning, business or not), not hard-coded here. */}
        <GoogleSignInButton onSuccess={() => undefined} disabled={!termsAccepted} />
      </div>

      {/* Switcher Text */}
      <p className="pt-1 text-center text-sm text-[#5C5C66]">
        Already have an account?{' '}
        <StyledLink
          href="/login"
          variant="primary"
          size="sm"
          className="font-semibold text-[#E84D1A]"
        >
          Log in
        </StyledLink>
      </p>
    </form>
  );
}
