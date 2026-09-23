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

// Intrinsic dimensions of public/brand/mitra-logo-long.png — used only to
// give next/image the correct aspect ratio for a `public/` asset (which,
// unlike a statically-imported image, requires explicit width/height).
const NATIVE_WIDTH = 1774;
const NATIVE_HEIGHT = 887;

export type MitraLogoSize = keyof typeof HEIGHT_MAP;

interface MitraLogoProps {
  size?: MitraLogoSize;
  className?: string;
  ariaLabel?: string;
  /** Set when a wrapping element (e.g. a Link) already carries the accessible name. */
  decorative?: boolean;
}

export function MitraLogo({
  size = 'md',
  className,
  ariaLabel = 'Mitra — Your AI Marketing Partner',
  decorative = false,
}: MitraLogoProps) {
  const height = HEIGHT_MAP[size];
  const width = Math.round((height * NATIVE_WIDTH) / NATIVE_HEIGHT);

  return (
    <Image
      src="/brand/mitra-logo-long.png"
      alt={decorative ? '' : ariaLabel}
      width={width}
      height={height}
      className={`shrink-0 ${className || ''}`.trim()}
    />
  );
}
