import { MitraMark } from '@/components/ui/MitraMark';

/**
 * The full Mitra brand lockup: the M mark, the "Mitra" wordmark and the
 * "Your AI Marketing Partner" tagline. Reserved for primary brand moments
 * (login, signup, landing, footer) — everywhere else, use MitraMark.
 */

const SIZE_STYLES = {
  sm: { mark: 'lg', word: 'text-xl', tagline: 'text-xs', gap: 'gap-2' },
  md: { mark: 'xl', word: 'text-2xl', tagline: 'text-sm', gap: 'gap-2.5' },
  lg: { mark: '2xl', word: 'text-3xl', tagline: 'text-base', gap: 'gap-3' },
} as const;

export type MitraLogoSize = keyof typeof SIZE_STYLES;

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
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`flex flex-col items-center ${className || ''}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : ariaLabel}
    >
      <div className={`flex items-center ${styles.gap}`}>
        <MitraMark size={styles.mark} decorative />
        <span className={`text-text-primary font-bold tracking-tight ${styles.word}`}>Mitra</span>
      </div>
      <p className={`text-brand-500 mt-1 font-semibold ${styles.tagline}`}>
        Your AI Marketing Partner
      </p>
    </div>
  );
}
