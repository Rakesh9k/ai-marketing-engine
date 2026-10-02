'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';

interface AutoRotateOptions {
  count: number;
  intervalMs?: number;
  /** Rotation only runs while this element is on screen. */
  containerRef: RefObject<Element | null>;
}

/**
 * Cycles an index on a timer, but only while the container is visible, the
 * tab is foregrounded, and the user hasn't taken over. Calling `select`
 * (a manual choice) permanently stops auto-rotation. Reduced motion never
 * auto-rotates. Touch devices have no hover, so this is what keeps rotating
 * sections alive on mobile without burning battery off-screen.
 */
export function useAutoRotate({ count, intervalMs = 5000, containerRef }: AutoRotateOptions) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [tabActive, setTabActive] = useState(true);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const onVisibility = () => setTabActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const running = !reduceMotion && !stopped && visible && tabActive && count > 1;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [running, count, intervalMs]);

  const select = useCallback((i: number) => {
    setStopped(true);
    setIndex(i);
  }, []);

  return { index, select, running };
}
