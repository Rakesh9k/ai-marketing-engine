/**
 * The Mitra "M" brand mark — a bold rounded M with a separate solid dot above
 * its center. This is the single source of truth for the icon; every place
 * that needs the Mitra product mark should render this component rather than
 * re-declaring the SVG.
 *
 * The `state` prop turns the dot into the brand's small vocabulary of
 * animated states (see AGENTS brief: "M + dot pulsing = thinking",
 * "M + orbit = loading", "M + expanding circle = success"). Omit it for the
 * plain static mark used in logos, navigation and favicons.
 */

const SIZE_MAP = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

export type MitraMarkSize = keyof typeof SIZE_MAP;
export type MitraMarkState = 'thinking' | 'loading' | 'success';

interface MitraMarkProps {
  size?: MitraMarkSize;
  className?: string;
  /** Purely decorative next to visible "Mitra" text — hides it from screen readers. */
  decorative?: boolean;
  ariaLabel?: string;
  /** Animates the dot to signal Mitra is thinking, working, or just finished. */
  state?: MitraMarkState;
}

export function MitraMark({
  size = 'md',
  className,
  decorative = false,
  ariaLabel = 'Mitra',
  state,
}: MitraMarkProps) {
  const dimension = SIZE_MAP[size];
  const label = state === 'thinking' || state === 'loading' ? `${ariaLabel} is working` : ariaLabel;

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 200 190"
      className={`text-brand-500 shrink-0 ${className || ''}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label}
    >
      <path
        d="M32,156 L32,56 L100,118 L168,56 L168,156"
        fill="none"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {state === 'success' && (
        <circle
          cx="100"
          cy="105"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="animate-mitra-ring"
        />
      )}
      {state === 'loading' ? (
        <g className="animate-mitra-orbit">
          <circle cx="100" cy="18" r="14" fill="currentColor" />
        </g>
      ) : (
        <circle
          cx="100"
          cy="18"
          r="14"
          fill="currentColor"
          className={state === 'thinking' ? 'animate-mitra-pulse' : undefined}
        />
      )}
    </svg>
  );
}
