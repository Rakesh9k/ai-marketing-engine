'use client';

import React from 'react';

interface AssetIconProps {
  className?: string;
}

export const PosterIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
    <path d="M9 9h6M9 15h4" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const HeadlineIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h10" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const AdCopyIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
    <rect x="4" y="2" width="16" height="4" rx="1" />
  </svg>
);

export const CaptionIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h10" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="18" r="2" strokeWidth="2" />
  </svg>
);

export const StoryIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="8" height="14" rx="1" strokeWidth="2" />
    <rect x="14" y="2" width="8" height="14" rx="1" strokeWidth="2" />
    <rect x="2" y="18" width="20" height="4" rx="1" strokeWidth="2" />
  </svg>
);

export const ReelIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="2" />
    <polygon points="10,10 16,12 10,14" fill="currentColor" />
  </svg>
);

export const WhatsAppIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.472.099-.174.05-.372-.025-.521-.075-.148-.669-1.612-.916-2.207-.247-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 2.096 3.2l-1.214 1.917c-.297.471-.993 1.164-1.29 1.287-.298.1-.617.149-1.002.049-.373-.099-2.39-.669-2.466-.693a1.037 1.037 0 0 1-.05-.644c0-.182-.008-.356-.01-.53-.008-.172-.01-.344-.01-.516 0-.198.04-.355.1-.5.098-.148.224-.347.324-.497.099-.148.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.247-.596-.487-.5-.669-.51-.182-.008-.373-.01-.57-.01-.182 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 2.096 3.2l-1.214 1.927c-.297.471-.993 1.165-1.29 1.29-.298.1-.617.149-1.002.049-.373-.1-.239-.693-2.466-.693a1.037 1.037 0 0 1-.05-.644z" />
  </svg>
);

export const CtaIcon: React.FC<AssetIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M13 2L3 14l9 9 9-9-9-9z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AssetIcons = {
  poster: PosterIcon,
  headline: HeadlineIcon,
  ad_copy: AdCopyIcon,
  caption: CaptionIcon,
  story: StoryIcon,
  reel: ReelIcon,
  whatsapp: WhatsAppIcon,
  cta: CtaIcon,
} as const;

export type AssetIconKey = keyof typeof AssetIcons;
