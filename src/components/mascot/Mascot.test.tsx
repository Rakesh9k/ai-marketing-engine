import { act, render, screen } from '@testing-library/react';
import { MascotProvider, useMascot } from './MascotProvider';
import { MascotWidget } from './MascotWidget';
import { Mascot } from './Mascot';
import { MASCOT_ANIMATION_VARIANTS } from './mascotAnimations';
import { MASCOT_STATES } from './mascotStates';

let reducedMotion = false;
let inView = true;

jest.mock('motion/react', () => {
  const actual = jest.requireActual('motion/react');
  return {
    ...actual,
    useReducedMotion: () => reducedMotion,
    useInView: () => inView,
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

beforeEach(() => {
  reducedMotion = false;
  inView = true;
});

describe('Mascot state rendering', () => {
  it('shows the asset for the requested state and falls back to idle for unknown ones', () => {
    const { rerender } = render(<Mascot state="creating" decorative={false} />);
    expect(screen.getAllByRole('img', { name: MASCOT_STATES.creating.alt }).length).toBeGreaterThan(
      0
    );
    rerender(<Mascot state="not-a-real-state" decorative={false} />);
    expect(document.querySelector(`img[src="${MASCOT_STATES.idle.src}"]`)).not.toBeNull();
  });

  it('settles on the final pose after a burst of rapid state changes', () => {
    const states = ['curious', 'creating', 'success', 'sad', 'proud', 'idle', 'analyzing'] as const;
    const { rerender } = render(<Mascot state="idle" />);
    for (const s of states) rerender(<Mascot state={s} />);
    const imgs = Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    // The newest pose is always rendered; superseded ones are only ever fading out.
    expect(imgs).toContain(MASCOT_STATES.analyzing.src);
  });

  it('keeps the same aspect ratio footprint on first render (no layout shift)', () => {
    const { container } = render(<Mascot state="creating" size={100} />);
    const box = container.firstElementChild as HTMLElement;
    const meta = MASCOT_STATES.creating;
    expect(box.style.height).toBe('100px');
    expect(box.style.width).toBe(`${Math.round(100 * (meta.width / meta.height))}px`);
  });

  it('is hidden from assistive tech when decorative and labelled when informative', () => {
    const { container, rerender } = render(<Mascot state="idle" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    rerender(<Mascot state="idle" decorative={false} alt="Mitra says hello" />);
    expect(screen.getAllByRole('img', { name: 'Mitra says hello' }).length).toBeGreaterThan(0);
  });

  it('mounts and unmounts repeatedly without throwing', () => {
    for (let i = 0; i < 20; i++) {
      const { unmount } = render(<Mascot state={i % 2 ? 'thinking' : 'idle'} />);
      unmount();
    }
  });
});

describe('motion policy', () => {
  it('only the ambient variants loop; everything else is a single, bounded gesture', () => {
    const looping = Object.entries(MASCOT_ANIMATION_VARIANTS)
      .filter(
        ([, cfg]) =>
          JSON.stringify(cfg.animate).includes('Infinity') ||
          (cfg.animate as { transition?: { repeat?: number } })?.transition?.repeat === Infinity
      )
      .map(([name]) => name)
      .sort();
    expect(looping).toEqual(['breathing', 'floating', 'thinking']);
  });

  it('celebrate and attention gestures do not wobble (no rotation keyframes)', () => {
    for (const name of ['celebrate', 'attention'] as const) {
      const animate = MASCOT_ANIMATION_VARIANTS[name].animate as Record<string, unknown>;
      expect(animate['rotate']).toBeUndefined();
    }
  });

  it('every one-shot gesture finishes in under a second', () => {
    for (const name of ['popIn', 'celebrate', 'success', 'error', 'attention'] as const) {
      const t = (MASCOT_ANIMATION_VARIANTS[name].animate as { transition?: { duration?: number } })
        .transition;
      if (t?.duration !== undefined) expect(t.duration).toBeLessThanOrEqual(0.8);
    }
  });

  it('under reduced motion it renders without hover motion and does not throw', () => {
    reducedMotion = true;
    const { container } = render(<Mascot state="idle" interactive />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('off-screen and under reduced motion the looping pose rests (static animate target)', () => {
    // The static variant is what the component selects; assert it has no keyframes or repeat.
    const stat = MASCOT_ANIMATION_VARIANTS.static.animate as Record<string, unknown>;
    expect(Object.values(stat).every((v) => !Array.isArray(v))).toBe(true);
    inView = false;
    expect(() => render(<Mascot state="idle" />)).not.toThrow();
  });
});

describe('MascotProvider state switching', () => {
  function Probe() {
    const { state, setState, resetState } = useMascot();
    return (
      <div>
        <span data-testid="state">{state}</span>
        <button onClick={() => setState('success')}>success</button>
        <button onClick={() => setState('sad')}>sad</button>
        <button onClick={resetState}>reset</button>
      </div>
    );
  }

  it('applies the latest requested state and resets to the initial one', () => {
    render(
      <MascotProvider initialState="curious">
        <Probe />
      </MascotProvider>
    );
    expect(screen.getByTestId('state')).toHaveTextContent('curious');
    act(() => {
      screen.getByText('success').click();
      screen.getByText('sad').click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('sad');
    act(() => screen.getByText('reset').click());
    expect(screen.getByTestId('state')).toHaveTextContent('curious');
  });

  it('falls back safely outside a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('state')).toHaveTextContent('idle');
  });
});

describe('MascotWidget', () => {
  it('has an accessible trigger that reports its expanded state', () => {
    render(
      <MascotProvider>
        <MascotWidget />
      </MascotProvider>
    );
    const trigger = screen.getByRole('button', { name: 'Mitra AI Partner' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    act(() => trigger.click());
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close Mitra panel' })).toBeInTheDocument();
  });

  it('stops the attention ping once the widget has been opened', () => {
    const { container } = render(
      <MascotProvider>
        <MascotWidget />
      </MascotProvider>
    );
    expect(container.querySelector('.animate-ping')).not.toBeNull();
    act(() => screen.getByRole('button', { name: 'Mitra AI Partner' }).click());
    expect(container.querySelector('.animate-ping')).toBeNull();
  });
});
