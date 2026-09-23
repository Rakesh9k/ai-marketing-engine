import Image from 'next/image';

/**
 * The official Mitra short logo — the standalone orange "M" brand mark,
 * rendered from the exact supplied artwork (public/brand/mitra-logo-short.png)
 * rather than a redrawn SVG approximation. Use this wherever a static,
 * non-animated compact brand mark is needed.
 *
 * MitraMark (the hand-drawn SVG) is kept only for its animated
 * thinking/loading/success states, which a raster image can't express — see
 * MitraMark.tsx. Everywhere else that used to render MitraMark as a plain
 * static mark should use this component instead.
 */

const HEIGHT_MAP = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

// Intrinsic dimensions of public/brand/mitra-logo-short.png — used only to
// give next/image the correct aspect ratio for a `public/` asset (which,
// unlike a statically-imported image, requires explicit width/height).
const NATIVE_WIDTH = 1402;
const NATIVE_HEIGHT = 1122;

export type MitraShortLogoSize = keyof typeof HEIGHT_MAP;

interface MitraShortLogoProps {
  size?: MitraShortLogoSize;
  className?: string;
  /** Purely decorative next to visible "Mitra" text, or inside a link that already has an accessible name. */
  decorative?: boolean;
  ariaLabel?: string;
}

export function MitraShortLogo({
  size = 'md',
  className,
  decorative = false,
  ariaLabel = 'Mitra',
}: MitraShortLogoProps) {
  const height = HEIGHT_MAP[size];
  const width = Math.round((height * NATIVE_WIDTH) / NATIVE_HEIGHT);

  return (
    <Image
      src="/brand/mitra-logo-short.png"
      alt={decorative ? '' : ariaLabel}
      width={width}
      height={height}
      className={`shrink-0 ${className || ''}`.trim()}
    />
  );
}
