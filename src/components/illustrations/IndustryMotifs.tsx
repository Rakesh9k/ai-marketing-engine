'use client';

import React from 'react';

interface MotifProps {
  size?: number;
  className?: string;
}

/* ==========================================================================
   RESTAURANTS & CLOUD KITCHENS MOTIFS
   ========================================================================== */

export function BiryaniBowlIllustration({ size = 48, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Soft shadow */}
      <ellipse cx="24" cy="42" rx="18" ry="4" fill="#000" fillOpacity="0.08" />
      {/* Bowl body */}
      <path
        d="M8 22 C8 34 16 38 24 38 C32 38 40 34 40 22 Z"
        fill="#1F2126"
        stroke="#E84D1A"
        strokeWidth="2"
      />
      {/* Golden aromatic rice rim */}
      <path d="M7 22 Q24 16 41 22 Q24 24 7 22 Z" fill="#F5A623" />
      {/* Garnish details */}
      <circle cx="20" cy="20" r="2" fill="#E84D1A" />
      <circle cx="28" cy="19" r="1.5" fill="#4A90E2" />
      <path d="M22 17 Q25 14 28 17" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FoodPhotoCardIllustration({ size = 56, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4"
        y="6"
        width="48"
        height="44"
        rx="8"
        fill="#1A1C20"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1.5"
      />
      <rect x="8" y="10" width="40" height="24" rx="5" fill="#E84D1A" fillOpacity="0.15" />
      {/* Food dish graphic */}
      <circle cx="28" cy="22" r="8" fill="#E84D1A" />
      <circle cx="28" cy="22" r="5" fill="#FF8C00" />
      {/* Text placeholder lines */}
      <rect x="10" y="38" width="22" height="3" rx="1.5" fill="#FFFFFF" opacity="0.8" />
      <rect x="10" y="44" width="14" height="2.5" rx="1" fill="#E84D1A" />
    </svg>
  );
}

export function OfferBadgeIllustration({ size = 44, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="22" cy="22" r="18" fill="#E84D1A" />
      <circle
        cx="22"
        cy="22"
        r="15"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <text
        x="22"
        y="26"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        OFFER
      </text>
    </svg>
  );
}

/* ==========================================================================
   SALON & BEAUTY MOTIFS
   ========================================================================== */

export function HairStylingIllustration({ size = 48, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Scissors */}
      <circle cx="14" cy="36" r="5" fill="none" stroke="#E84D1A" strokeWidth="2" />
      <circle cx="34" cy="36" r="5" fill="none" stroke="#E84D1A" strokeWidth="2" />
      <line
        x1="17.5"
        y1="32.5"
        x2="32"
        y2="12"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="30.5"
        y1="32.5"
        x2="16"
        y2="12"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="22" r="2" fill="#E84D1A" />
    </svg>
  );
}

export function BeautyProductIllustration({ size = 48, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Serum bottle */}
      <rect
        x="16"
        y="18"
        width="16"
        height="24"
        rx="4"
        fill="#1A1C20"
        stroke="#E84D1A"
        strokeWidth="2"
      />
      <rect x="20" y="10" width="8" height="8" rx="2" fill="#E84D1A" />
      <rect x="22" y="6" width="4" height="4" rx="1" fill="#FFFFFF" opacity="0.9" />
      <rect x="20" y="24" width="8" height="10" rx="1" fill="#E84D1A" fillOpacity="0.2" />
    </svg>
  );
}

/* ==========================================================================
   REAL ESTATE MOTIFS
   ========================================================================== */

export function PropertyCardIllustration({ size = 52, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4"
        y="8"
        width="44"
        height="38"
        rx="6"
        fill="#1F2126"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      {/* Roof / House silhoutte */}
      <path
        d="M16 28 L26 18 L36 28 L34 38 L18 38 Z"
        fill="#E84D1A"
        fillOpacity="0.2"
        stroke="#E84D1A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="23" y="30" width="6" height="8" fill="#E84D1A" />
      <circle cx="40" cy="18" r="4" fill="#E84D1A" />
    </svg>
  );
}

export function PropertyKeyIllustration({ size = 44, className }: MotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="14" cy="14" r="8" fill="none" stroke="#E84D1A" strokeWidth="3" />
      <line
        x1="19.5"
        y1="19.5"
        x2="34"
        y2="34"
        stroke="#E84D1A"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="28"
        x2="32"
        y2="24"
        stroke="#E84D1A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="32"
        y1="32"
        x2="36"
        y2="28"
        stroke="#E84D1A"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
