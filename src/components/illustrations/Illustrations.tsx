/**
 * Small, reusable illustration objects — the "story" layer (see
 * MitraMascot's file comment for how this differs from the mascot and the
 * M mark). Kept deliberately simple/geometric so they read as one visual
 * language rather than mismatched stock icons: soft rounded shapes, a
 * single brand-orange accent, no gradients, no detail beyond what's needed
 * to read at a glance.
 *
 * Each one is decorative by default (aria-hidden) — they're always paired
 * with real text that carries the actual meaning, never the only carrier
 * of information (see accessibility rule in the design brief).
 */

interface IllustrationProps {
  size?: number;
  className?: string;
}

export function SparkIllustration({ size = 24, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
        fill="#E84D1A"
      />
    </svg>
  );
}

export function PosterIllustration({ size = 56, className }: IllustrationProps) {
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
        x="6"
        y="4"
        width="44"
        height="48"
        rx="6"
        fill="var(--color-bg-primary)"
        stroke="var(--color-border-medium)"
        strokeWidth="2"
      />
      <rect x="12" y="12" width="32" height="18" rx="3" fill="var(--color-brand-100)" />
      <rect x="12" y="34" width="24" height="4" rx="2" fill="var(--color-neutral-300)" />
      <rect x="12" y="42" width="16" height="4" rx="2" fill="var(--color-neutral-300)" />
    </svg>
  );
}

export function CameraIllustration({ size = 40, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4"
        y="12"
        width="32"
        height="22"
        rx="5"
        fill="var(--color-bg-primary)"
        stroke="var(--color-border-medium)"
        strokeWidth="2"
      />
      <rect x="14" y="7" width="12" height="7" rx="2" fill="var(--color-border-medium)" />
      <circle cx="20" cy="23" r="7" fill="none" stroke="#E84D1A" strokeWidth="2.5" />
      <circle cx="20" cy="23" r="2.5" fill="#E84D1A" />
    </svg>
  );
}

export function PhoneIllustration({ size = 32, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="40"
        rx="6"
        fill="var(--color-bg-primary)"
        stroke="var(--color-border-medium)"
        strokeWidth="2"
      />
      <rect x="7" y="9" width="18" height="20" rx="2" fill="var(--color-brand-100)" />
      <circle cx="16" cy="35" r="2" fill="var(--color-border-medium)" />
    </svg>
  );
}

export function LocationPinIllustration({ size = 28, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M14 2 C6.8 2 2 7.4 2 13.5 C2 22 14 30 14 30 C14 30 26 22 26 13.5 C26 7.4 21.2 2 14 2 Z"
        fill="#E84D1A"
      />
      <circle cx="14" cy="13.5" r="5" fill="var(--color-bg-primary)" />
    </svg>
  );
}

export function ChartIllustration({ size = 40, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line x1="2" y1="30" x2="38" y2="30" stroke="var(--color-border-medium)" strokeWidth="2" />
      <rect x="7" y="18" width="6" height="12" rx="1.5" fill="var(--color-neutral-300)" />
      <rect x="17" y="10" width="6" height="20" rx="1.5" fill="var(--color-brand-100)" />
      <rect x="27" y="2" width="6" height="28" rx="1.5" fill="#E84D1A" />
    </svg>
  );
}

export function PencilIllustration({ size = 32, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line
        x1="6"
        y1="26"
        x2="22"
        y2="10"
        stroke="var(--color-neutral-400)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line x1="20" y1="12" x2="26" y2="6" stroke="#E84D1A" strokeWidth="4" strokeLinecap="round" />
      <path d="M4 28 L6 26 L8 28 Z" fill="#22242A" />
    </svg>
  );
}

export function WrenchIllustration({ size = 28, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M18 4 A6 6 0 1 0 22 14 L26 18 L22 22 L18 18 A6 6 0 1 0 18 4 Z"
        fill="none"
        stroke="var(--color-neutral-400)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="10" r="2" fill="#E84D1A" />
    </svg>
  );
}

export function NodesIllustration({ size = 36, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line x1="8" y1="28" x2="18" y2="10" stroke="#E84D1A" strokeWidth="1.6" opacity="0.7" />
      <line x1="28" y1="28" x2="18" y2="10" stroke="#E84D1A" strokeWidth="1.6" opacity="0.7" />
      <line x1="8" y1="28" x2="28" y2="28" stroke="#E84D1A" strokeWidth="1.6" opacity="0.7" />
      <circle cx="18" cy="10" r="4" fill="#E84D1A" />
      <circle
        cx="8"
        cy="28"
        r="4"
        fill="var(--color-brand-100)"
        stroke="#E84D1A"
        strokeWidth="1.6"
      />
      <circle
        cx="28"
        cy="28"
        r="4"
        fill="var(--color-brand-100)"
        stroke="#E84D1A"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function MagnifyingGlassIllustration({ size = 28, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="var(--color-neutral-400)"
        strokeWidth="2.5"
      />
      <line
        x1="18.5"
        y1="18.5"
        x2="25"
        y2="25"
        stroke="#E84D1A"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
