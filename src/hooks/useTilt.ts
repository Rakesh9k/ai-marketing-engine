'use client';

import { useRef, useState, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';

interface TiltOptions {
  maxTilt?: number; // Max degrees rotation (default: 3)
  scale?: number;
  disabled?: boolean;
}

export function useTilt({ maxTilt = 3, scale = 1.02, disabled = false }: TiltOptions = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const reduceMotion = useReducedMotion();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || reduceMotion || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt degrees
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setTiltStyle({ rotateX, rotateY, scale });
    },
    [disabled, maxTilt, reduceMotion, scale]
  );

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({ rotateX: 0, rotateY: 0, scale: 1 });
  }, []);

  return {
    ref,
    tiltStyle,
    handleMouseMove,
    handleMouseLeave,
  };
}
