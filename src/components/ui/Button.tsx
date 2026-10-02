'use client';

import type { ButtonHTMLAttributes } from 'react';
import { forwardRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const reduceMotion = useReducedMotion();
    const isDisabled = disabled || loading;
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!reduceMotion && !isDisabled) {
        const rect = e.currentTarget.getBoundingClientRect();
        const id = Date.now() + Math.random();
        setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
        window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 600);
      }
      onClick?.(e);
    };

    const baseStyles =
      'relative overflow-hidden border-trace inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer disabled:cursor-not-allowed';

    const variantStyles = {
      primary:
        'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-500 shadow-xs hover:shadow-sm',
      secondary:
        'bg-bg-tertiary text-text-primary hover:bg-border-light active:bg-border-medium focus-visible:ring-brand-500 border border-border-light',
      outline:
        'bg-transparent text-text-primary hover:bg-bg-secondary active:bg-bg-tertiary focus-visible:ring-brand-500 border border-border-medium',
      ghost:
        'bg-transparent text-text-secondary hover:bg-bg-secondary active:bg-bg-tertiary focus-visible:ring-brand-500',
      danger:
        'bg-error-50 text-error-600 hover:bg-error-100 active:bg-error-100 focus-visible:ring-error-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2 text-sm min-h-[44px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
      xl: 'px-8 py-4 text-lg min-h-[56px]',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <motion.button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        disabled={isDisabled}
        onClick={handleClick}
        whileHover={isDisabled || reduceMotion ? undefined : { scale: 1.02 }}
        whileTap={isDisabled || reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden="true"
            className="btn-ripple pointer-events-none absolute rounded-full bg-white/40"
            style={{ left: r.x, top: r.y }}
          />
        ))}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
