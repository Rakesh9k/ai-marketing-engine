'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { loginWithEmailPassword } from '@/features/auth/services/authService';
import { validateLoginForm } from '@/features/auth/utils/validation';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StyledLink } from '@/components/ui/Link';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import type { ValidationErrors } from '@/features/auth/types';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          className="bg-error-50 border-error-200 text-error-600 rounded-xl border p-3.5 text-sm font-medium animate-shake-sm"
          role="alert"
        >
          {generalError}
        </div>
      )}

      {/* Email Input */}
      <div className="relative">
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
      </div>

      {/* Password Input */}
      <div className="relative">
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
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

      {/* Controls Row */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="text-[#E84D1A] focus:ring-brand-500 h-4 w-4 rounded border-[#D1CBD8]"
          />
          <span className="text-[#5C5C66]">Remember me</span>
        </label>
        <StyledLink href="/forgot-password" variant="primary" size="sm" className="font-medium text-[#E84D1A] hover:underline">
          Forgot your password?
        </StyledLink>
      </div>

      {/* Submit CTA */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
        className="mt-2 bg-[#E84D1A] hover:bg-[#d04113] active:bg-[#b8380e] shadow-md shadow-orange-500/20 font-semibold text-white rounded-xl py-3"
      >
        Log in
      </Button>

      {/* SSO Divider */}
      <div className="flex items-center gap-3 pt-2" role="separator">
        <div className="border-[#EAE5DC] h-px flex-1 border-t" />
        <span className="text-[#757580] text-xs uppercase tracking-wider font-medium">or continue with</span>
        <div className="border-[#EAE5DC] h-px flex-1 border-t" />
      </div>

      {/* SSO Buttons Grid (Google + WhatsApp) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GoogleSignInButton onSuccess={() => onSuccess?.()} />
        <button
          type="button"
          onClick={() => {
            alert('WhatsApp Login: Please sign in with Google or Email.');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border-medium bg-transparent px-4 py-2.5 text-sm font-medium text-[#1A1A1E] hover:bg-bg-secondary transition-colors"
        >
          <svg className="h-5 w-5 fill-emerald-500" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.15 4.2 4.293-1.125z" />
          </svg>
          WhatsApp
        </button>
      </div>

      {/* Switcher Text */}
      <p className="text-[#5C5C66] text-center text-sm pt-2">
        Don&apos;t have an account?{' '}
        <StyledLink href="/signup" variant="primary" size="sm" className="font-semibold text-[#E84D1A]">
          Create one
        </StyledLink>
      </p>
    </form>
  );
}
