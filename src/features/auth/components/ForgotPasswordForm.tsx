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
      <div className="space-y-5 text-center">
        <div
          className="bg-success-50 border-success-200 text-success-700 rounded-md border p-4"
          role="status"
        >
          <svg
            className="text-success-500 mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="mt-3 text-lg font-medium">Check your email</h3>
          <p className="mt-1 text-sm">
            If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset
            link shortly.
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
        >
          Back to login
        </Button>

        <p className="text-text-tertiary text-sm">
          <StyledLink href="/login" variant="primary" size="sm">
            Return to login
          </StyledLink>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h2 className="text-h3 text-text-primary font-bold">Forgot your password?</h2>
        <p className="text-body text-text-secondary">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

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
          validateField(e.target.value);
        }}
        onBlur={() => validateField(email)}
        error={errors.email}
        placeholder="you@example.com"
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
      >
        Send reset link
      </Button>

      <p className="text-text-secondary text-center text-sm">
        <StyledLink href="/login" variant="primary" size="sm">
          Back to login
        </StyledLink>
      </p>
    </form>
  );
}
