'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { loginWithEmailPassword } from '@/features/auth/services/authService';
import { validateLoginForm } from '@/features/auth/utils/validation';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StyledLink } from '@/components/ui/Link';
import type { ValidationErrors } from '@/features/auth/types';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (name: string, value: string) => {
    let error: string | undefined;
    switch (name) {
      case 'email':
        error = validateLoginForm(value, password).email;
        break;
      case 'password':
        error = validateLoginForm(email, value).password;
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    const validationErrors = validateLoginForm(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmailPassword(email, password);
      onSuccess?.();
    } catch (error) {
      setGeneralError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="flex items-center justify-between">
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            validateField('password', e.target.value);
          }}
          onBlur={() => validateField('password', password)}
          error={errors.password}
          placeholder="Enter your password"
          disabled={isLoading}
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-neutral-300"
          />
          <span className="text-text-secondary text-sm">Remember me</span>
        </label>
        <StyledLink href="/forgot-password" variant="primary" size="sm" className="text-right">
          Forgot your password?
        </StyledLink>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
      >
        Log in
      </Button>

      <p className="text-text-secondary text-center text-sm">
        Don&apos;t have an account?{' '}
        <StyledLink href="/signup" variant="primary" size="sm">
          Create one
        </StyledLink>
      </p>
    </form>
  );
}
