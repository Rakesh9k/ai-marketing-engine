'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { sendPasswordReset } from '@/features/auth/services/authService';
import { validateForgotPasswordForm } from '@/features/auth/utils/validation';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StyledLink } from '@/components/ui/Link';
import type { ValidationErrors } from '@/features/auth/types';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const validateField = (value: string) => {
    const error = validateForgotPasswordForm(value).email;
    setErrors((prev) => ({ ...prev, email: error }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    const validationErrors = validateForgotPasswordForm(email);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setIsSent(true);
      onSuccess?.();
    } catch (error) {
      setGeneralError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-5 text-center py-2">
        <div
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-6 shadow-sm"
          role="status"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-emerald-950">Check your email</h3>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            If an account exists for <strong className="text-emerald-950">{email}</strong>, you&apos;ll receive a password reset link shortly.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => {
            setIsSent(false);
            setEmail('');
          }}
          className="rounded-xl border border-border-medium bg-[#FDFBF8] text-[#1A1A1E] font-medium hover:bg-bg-tertiary"
        >
          Back to login
        </Button>

        <p className="text-[#5C5C66] text-sm pt-1">
          <StyledLink href="/login" variant="primary" size="sm" className="font-semibold text-[#E84D1A]">
            Return to login
          </StyledLink>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5 mb-2">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1E]">Reset Your Password</h2>
        <p className="text-sm text-[#5C5C66]">
          Enter your email address and we&apos;ll send you a reset link.
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

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          validateField(e.target.value);
        }}
        onBlur={() => validateField(email)}
        error={errors.email}
        placeholder="you@company.com"
        disabled={isLoading}
        required
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
        className="bg-[#E84D1A] hover:bg-[#d04113] active:bg-[#b8380e] shadow-md shadow-orange-500/20 font-semibold text-white rounded-xl py-3"
      >
        {isLoading ? 'Sending reset link...' : 'Send Reset Link →'}
      </Button>

      <p className="text-[#5C5C66] text-center text-sm pt-2">
        <StyledLink href="/login" variant="primary" size="sm" className="font-semibold text-[#E84D1A]">
          Back to login
        </StyledLink>
      </p>
    </form>
  );
}
