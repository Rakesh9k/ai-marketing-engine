import type { ReactNode } from 'react';
import { MitraMascot, type MitraMascotPose, type MitraMascotSize } from './MitraMascot';

/**
 * An open, composed mascot moment — not `<Card><Mascot /></Card>` (see the
 * design brief's "mascot container rule"). The mascot sits in whitespace
 * alongside a short line of copy and optional small illustration objects
 * passed as `decoration`, rather than being boxed.
 *
 * Use this only where the mascot's presence is earning its place: a
 * beginning, a guidance moment, an empty state, or a completion — not as
 * decoration. If you're reaching for this component because a screen
 * "feels empty," that's the wrong reason (see design brief §38/§48).
 *
 * Which pose belongs on which screen is centralized in
 * mascotPlacement.ts — check there before picking one ad hoc, and add a
 * new entry there (not just inline here) if this is a genuinely new moment.
 */
interface MascotSceneProps {
  pose?: MitraMascotPose;
  size?: MitraMascotSize;
  /** Short line only — Mitra speaks in phrases, not paragraphs. */
  message: string;
  /** Optional smaller supporting line under the message. */
  supporting?: string;
  /** Small illustration objects placed around the mascot (see illustrations/). */
  decoration?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  children?: ReactNode;
}

export function MascotScene({
  pose = 'idle',
  size = 'lg',
  message,
  supporting,
  decoration,
  align = 'left',
  className,
  children,
}: MascotSceneProps) {
  return (
    <div
      className={`animate-scene-enter flex gap-5 ${align === 'center' ? 'flex-col items-center text-center' : 'items-start'} ${className || ''}`.trim()}
    >
      <div className="relative shrink-0">
        <MitraMascot pose={pose} size={size} animated decorative />
        {decoration && (
          <div className="pointer-events-none absolute -top-2 -right-2" aria-hidden="true">
            {decoration}
          </div>
        )}
      </div>
      <div className={align === 'center' ? '' : 'pt-2'}>
        <p className="text-text-primary text-lg font-semibold">{message}</p>
        {supporting && <p className="text-text-secondary mt-1 text-sm">{supporting}</p>}
        {children}
      </div>
    </div>
  );
}
