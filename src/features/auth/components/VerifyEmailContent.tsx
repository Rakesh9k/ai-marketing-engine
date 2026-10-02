'use client';

import { useState } from 'react';
import { sendVerificationEmail, isEmailVerified } from '@/features/auth/services/authService';
import { getCurrentUser } from '@/features/auth/services/authService';
import { getAuthErrorMessage } from '@/features/auth/utils/authErrors';
import { Button } from '@/components/ui/Button';
import { StyledLink } from '@/components/ui/Link';

interface VerifyEmailContentProps {
  onVerified?: () => void;
}

export function VerifyEmailContent({ onVerified }: VerifyEmailContentProps) {
  const user = getCurrentUser();
  const email = user?.email || 'your email';
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleResend = async () => {
    setStatusMessage('');
    setErrorMessage('');
    setIsLoading(true);
    try {
      await sendVerificationEmail();
      setStatusMessage('Verification email sent! Please check your inbox.');
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setStatusMessage('');
    setErrorMessage('');
    setIsLoading(true);
    try {
      if (user) {
        await user.reload();
      }
      if (isEmailVerified()) {
        setStatusMessage('Email verified successfully! Redirecting...');
        onVerified?.();
        setTimeout(() => {
          window.location.href = '/onboarding';
        }, 1200);
      } else {
        setErrorMessage('Email is not verified yet. Please click the link sent to your inbox.');
      }
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const openEmailApp = () => {
    window.open('mailto:', '_blank');
  };

  return (
    <div className="space-y-6 text-center py-2">
      {/* Visual Header Envelope Badge */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-100/70 text-[#E84D1A] shadow-inner">
        <svg className="h-10 w-10 stroke-current" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1E]">Check Your Email</h2>
        <p className="text-sm text-[#5C5C66] max-w-sm mx-auto leading-relaxed">
          We&apos;ve sent a verification link to{' '}
          <span className="font-semibold text-[#1A1A1E] break-all">{email}</span>.
        </p>
      </div>

      {statusMessage && (
        <div
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-sm font-medium"
          role="status"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          className="bg-error-50 border border-error-200 text-error-600 rounded-xl p-3.5 text-sm font-medium animate-shake-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          onClick={openEmailApp}
          className="bg-[#E84D1A] hover:bg-[#d04113] active:bg-[#b8380e] shadow-md shadow-orange-500/20 font-semibold text-white rounded-xl py-3"
        >
          Open Email App →
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            fullWidth
            onClick={() => void handleCheckVerification()}
            disabled={isLoading}
            className="rounded-xl border border-border-medium text-[#1A1A1E]"
          >
            {isLoading ? 'Checking...' : "I've Verified"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => void handleResend()}
            disabled={isLoading}
            className="rounded-xl text-[#5C5C66] hover:text-[#1A1A1E]"
          >
            Resend Email
          </Button>
        </div>
      </div>

      <div className="pt-3 border-t border-[#F0EBE1] flex flex-col sm:flex-row items-center justify-between text-xs text-[#757580] gap-2">
        <StyledLink href="/login" variant="primary" size="sm" className="text-[#5C5C66] hover:underline">
          ← Back to login
        </StyledLink>
        <StyledLink href="/contact" variant="primary" size="sm" className="text-[#E84D1A] hover:underline font-medium">
          Need help? Contact Support
        </StyledLink>
      </div>
    </div>
  );
}
