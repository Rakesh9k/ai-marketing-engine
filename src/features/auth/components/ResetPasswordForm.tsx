'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { confirmPasswordReset as firebaseConfirmPasswordReset } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { validateSignupForm } from '@/features/auth/utils/validation';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StyledLink } from '@/components/ui/Link';
import type { ValidationErrors } from '@/features/auth/types';

interface ResetPasswordFormProps {
  oobCode?: string | null;
  onSuccess?: () => void;
}

export function ResetPasswordForm({ oobCode, onSuccess }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateField = (name: string, value: string) => {
    let error: string | undefined;
    if (name === 'password') {
      error = validateSignupForm('test@example.com', value, confirmPassword).password;
    } else if (name === 'confirmPassword') {
      error = validateSignupForm('test@example.com', password, value).confirmPassword;
    }
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    const validationErrors = validateSignupForm('test@example.com', password, confirmPassword);
    if (validationErrors.password || validationErrors.confirmPassword) {
      setErrors({
        password: validationErrors.password,
        confirmPassword: validationErrors.confirmPassword,
      });
      return;
    }

    setIsLoading(true);
    try {
      if (oobCode) {
        const auth = getFirebaseAuth();
        if (auth) {
          await firebaseConfirmPasswordReset(auth, oobCode, password);
        }
      }
      setIsSuccess(true);
      onSuccess?.();
    } catch (error) {
      setGeneralError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-5 text-center py-2">
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-6 shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-emerald-950">Password updated!</h3>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            Your password has been reset successfully. You can now log in with your new credentials.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => (window.location.href = '/login')}
          className="bg-[#E84D1A] hover:bg-[#d04113] text-white font-semibold rounded-xl"
        >
          Log in now →
        </Button>
      </div>
    );
  }

  // Password requirements check indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5 mb-2">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1E]">Set New Password</h2>
        <p className="text-sm text-[#5C5C66]">
          Create a password that&apos;s secure and easy to remember.
        </p>
      </div>

      {generalError && (
        <div
          className="bg-error-50 border-error-200 text-error-600 rounded-xl border p-3.5 text-sm font-medium animate-shake-sm"
          role="alert"
        >
          {generalError}
        </div>
      )}

      {/* New Password Input */}
      <div className="relative">
        <div className="relative">
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              validateField('password', e.target.value);
            }}
            onBlur={() => validateField('password', password)}
            error={errors.password}
            placeholder="At least 8 characters"
            disabled={isLoading}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-[38px] text-[#757580] hover:text-[#1A1A1E] focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Confirm Password Input */}
      <Input
        label="Confirm password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          validateField('confirmPassword', e.target.value);
        }}
        onBlur={() => validateField('confirmPassword', confirmPassword)}
        error={errors.confirmPassword}
        placeholder="Re-enter your password"
        disabled={isLoading}
        required
      />

      {/* Strength Indicator Checklist */}
      <div className="rounded-xl bg-[#FDFBF8] p-3 border border-[#F0EBE1] space-y-1.5 text-xs text-[#5C5C66]">
        <div className={`flex items-center gap-2 font-medium ${hasMinLength ? 'text-emerald-600' : ''}`}>
          <span>{hasMinLength ? '✓' : '○'}</span>
          <span>At least 8 characters</span>
        </div>
        <div className={`flex items-center gap-2 font-medium ${hasNumber ? 'text-emerald-600' : ''}`}>
          <span>{hasNumber ? '✓' : '○'}</span>
          <span>Include a number</span>
        </div>
        <div className={`flex items-center gap-2 font-medium ${hasSymbol ? 'text-emerald-600' : ''}`}>
          <span>{hasSymbol ? '✓' : '○'}</span>
          <span>Include a symbol</span>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
        className="bg-[#E84D1A] hover:bg-[#d04113] active:bg-[#b8380e] shadow-md shadow-orange-500/20 font-semibold text-white rounded-xl py-3"
      >
        {isLoading ? 'Resetting password...' : 'Reset Password →'}
      </Button>

      <p className="text-[#5C5C66] text-center text-sm pt-2">
        <StyledLink href="/login" variant="primary" size="sm" className="font-semibold text-[#E84D1A]">
          Back to login
        </StyledLink>
      </p>
    </form>
  );
}
