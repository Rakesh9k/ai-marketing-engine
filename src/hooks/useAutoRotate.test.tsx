import { act, renderHook } from '@testing-library/react';
import { useAutoRotate } from './useAutoRotate';

let reduced = false;
jest.mock('motion/react', () => ({ useReducedMotion: () => reduced }));

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let ioCallback: IOCallback = () => {};

beforeEach(() => {
  jest.useFakeTimers();
  reduced = false;
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor(cb: IOCallback) {
      ioCallback = cb;
    }
    observe() {}
    disconnect() {}
  };
});

afterEach(() => jest.useRealTimers());

const setup = () => {
  const el = document.createElement('div');
  return renderHook(() =>
    useAutoRotate({ count: 3, intervalMs: 1000, containerRef: { current: el } })
  );
};
const setVisible = (v: boolean) => act(() => ioCallback([{ isIntersecting: v }]));

describe('useAutoRotate', () => {
  it('does not rotate while the container is off screen', () => {
    const { result } = setup();
    act(() => void jest.advanceTimersByTime(5000));
    expect(result.current.index).toBe(0);
    expect(result.current.running).toBe(false);
  });

  it('rotates and wraps while visible', () => {
    const { result } = setup();
    setVisible(true);
    act(() => void jest.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
    act(() => void jest.advanceTimersByTime(2000));
    expect(result.current.index).toBe(0);
  });

  it('stops rotating for good after a manual selection', () => {
    const { result } = setup();
    setVisible(true);
    act(() => result.current.select(2));
    act(() => void jest.advanceTimersByTime(5000));
    expect(result.current.index).toBe(2);
    expect(result.current.running).toBe(false);
  });

  it('never rotates under reduced motion', () => {
    reduced = true;
    const { result } = setup();
    setVisible(true);
    act(() => void jest.advanceTimersByTime(5000));
    expect(result.current.index).toBe(0);
  });
});
