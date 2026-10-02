import Image from 'next/image';

/**
 * The official Mitra long logo — the full brand lockup (M mark + "Mitra"
 * wordmark + "Your AI Marketing Partner" tagline), rendered from the exact
 * supplied artwork (public/brand/mitra-logo-long.png) as a single image
 * rather than composed from separate mark/text/tagline elements. Reserved
 * for primary brand moments with enough width (landing nav/footer, auth
 * pages) — everywhere else, use MitraShortLogo.
 */

const HEIGHT_MAP = {
  sm: 48,
  md: 64,
  lg: 80,
} as const;

// Intrinsic dimensions
const DIMENSIONS = {
  full: { width: 1330, height: 498, src: '/brand/mitra-logo-long.png' },
  wordmark: { width: 232, height: 63, src: '/brand/mitra-logo-wordmark.png' },
} as const;

export type MitraLogoSize = keyof typeof HEIGHT_MAP;
export type MitraLogoVariant = keyof typeof DIMENSIONS;

interface MitraLogoProps {
  size?: MitraLogoSize;
  variant?: MitraLogoVariant;
  className?: string;
  ariaLabel?: string;
  /** Set when a wrapping element (e.g. a Link) already carries the accessible name. */
  decorative?: boolean;
}

export function MitraLogo({
  size = 'md',
  variant = 'full',
  className,
  ariaLabel = 'Mitra — Your AI Marketing Partner',
  decorative = false,
}: MitraLogoProps) {
  const config = DIMENSIONS[variant];
  const height = HEIGHT_MAP[size];
  const width = Math.round((height * config.width) / config.height);

  return (
    <Image
      src={config.src}
      alt={decorative ? '' : ariaLabel}
      width={width}
      height={height}
      className={`shrink-0 ${className || ''}`.trim()}
    />
  );
}
