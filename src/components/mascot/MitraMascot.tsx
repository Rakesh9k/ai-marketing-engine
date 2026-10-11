'use client';

import { Mascot, type MascotProps } from './Mascot';
import { MASCOT_STATES, MASCOT_SIZE_MAP, type MascotState, type MascotSize } from './mascotStates';

export type MitraMascotPose = MascotState;
export type MitraMascotSize = MascotSize;

export const SIZE_MAP = MASCOT_SIZE_MAP;

export const MASCOT_POSE_ASSET = Object.fromEntries(
  Object.entries(MASCOT_STATES).map(([key, meta]) => [
    key,
    { src: meta.src, width: meta.width, height: meta.height },
  ])
) as Record<MitraMascotPose, { src: string; width: number; height: number }>;

export interface MitraMascotProps extends Omit<MascotProps, 'state'> {
  pose?: MitraMascotPose | string;
  size?: MitraMascotSize | number;
  ariaLabel?: string;
}

export function MitraMascot({
  pose = 'idle',
  size = 'md',
  className,
  animated = true,
  decorative = true,
  ariaLabel,
  alt,
  shadow = true,
  glow = false,
  ...rest
}: MitraMascotProps) {
  return (
    <Mascot
      state={pose}
      size={size}
      className={className}
      animated={animated}
      decorative={decorative}
      alt={ariaLabel || alt}
      shadow={shadow}
      glow={glow}
      {...rest}
    />
  );
}

export { Mascot };
