'use client';

import { Mascot, type MascotProps } from '../mascot/Mascot';
import type { MascotState, MascotSize } from '../mascot/mascotStates';

export type MascotPose = MascotState;

export interface MitraMascotProps extends Omit<MascotProps, 'state'> {
  pose?: MascotPose | string;
  size?: MascotSize | number;
}

export function MitraMascot({
  pose = 'idle',
  size = 'md',
  className = '',
  alt = 'Mitra AI Assistant',
  ...rest
}: MitraMascotProps) {
  return <Mascot state={pose} size={size} className={className} alt={alt} {...rest} />;
}
