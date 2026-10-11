'use client';

import { useRef, useState, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';

interface MagneticOptions {
  strength?: number; // Maximum offset in pixels (default: 6)
  disabled?: boolean;
}

export function useMagnetic({ strength = 6, disabled = false }: MagneticOptions = {}) {
  const ref = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || reduceMotion || !ref.current) return;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;

      // Calculate magnetic displacement capped to max strength
      const moveX = (distanceX / (width / 2)) * strength;
      const moveY = (distanceY / (height / 2)) * strength;

      setPosition({
        x: Math.max(-strength, Math.min(strength, moveX)),
        y: Math.max(-strength, Math.min(strength, moveY)),
      });
    },
    [disabled, reduceMotion, strength]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return {
    ref,
    position,
    handleMouseMove,
    handleMouseLeave,
  };
}
