'use client';

import type { AnchorHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import Link from 'next/link';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: 'primary' | 'secondary' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
}

export const StyledLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const variantStyles = {
      primary: 'text-brand-600 hover:text-brand-700 font-medium',
      secondary: 'text-neutral-600 hover:text-neutral-700 font-medium',
      subtle: 'text-text-tertiary hover:text-text-secondary',
    };

    const sizeStyles = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    return (
      <Link
        ref={ref}
        href={href}
        className={`${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

StyledLink.displayName = 'StyledLink';
