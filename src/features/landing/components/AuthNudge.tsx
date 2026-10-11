'use client';

import { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/ui/MitraMascot';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';

interface AuthNudgeProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The signup/login nudge for an anonymous visitor who tries something meaningful (e.g. "Try
 * Mitra"). It explains what an account buys them instead of the generic "Sign up to continue".
 *
 * Navigation after a successful Google sign-in is deliberately NOT done here: the landing page
 * decides (new -> onboarding, existing -> dashboard) once auth settles, and waits while a new
 * Google user is still accepting the Terms inside GoogleSignInButton.
 */
export function AuthNudge({ open, onClose }: AuthNudgeProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the dialog itself so screen readers announce it; keyboard users Tab into the actions.
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-surface relative w-full max-w-md rounded-t-3xl p-6 shadow-2xl outline-none sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-text-tertiary hover:text-text-primary absolute top-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="flex justify-center">
          <MitraMascot pose="waving" size="md" alt="" />
        </div>

        <h2 id={titleId} className="text-text-primary mt-3 text-center text-2xl font-black">
          Let&apos;s make this yours.
        </h2>
        <p id={descId} className="text-text-secondary mt-2 text-center text-sm leading-relaxed">
          Create your free Mitra account and I&apos;ll remember your business, your brand and the
          way you like to communicate.
        </p>

        <div className="mt-6 space-y-3">
          <GoogleSignInButton onSuccess={() => undefined} />
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => router.push('/signup')}
          >
            Continue with email
          </Button>
        </div>

        <p className="text-text-tertiary mt-5 text-center text-xs">
          Already have an account?{' '}
          <a href="/login" className="text-brand-600 font-semibold hover:underline">
            Log in
          </a>
        </p>
      </motion.div>
    </div>
  );
}
