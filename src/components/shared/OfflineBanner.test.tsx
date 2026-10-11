import { act, render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';
import { ToastProvider, useToast } from '@/hooks/useToast';

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing visible while online, inside a polite live region', () => {
    render(<OfflineBanner />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('announces the offline state in words, says what is affected and what is kept', () => {
    render(<OfflineBanner />);
    setOnline(false);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent(/you’re offline/i);
    expect(region).toHaveTextContent(/generating a campaign/i);
    expect(region).toHaveTextContent(/what you’ve typed on this page is kept/i);
  });

  it('does not rely on colour alone: an icon is present and hidden from assistive tech', () => {
    render(<OfflineBanner />);
    setOnline(false);
    const icon = screen.getByText('⚠');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('is not interactive, so it never traps keyboard focus', () => {
    render(<OfflineBanner />);
    setOnline(false);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('confirms the reconnection once, then disappears', () => {
    render(<OfflineBanner />);
    setOnline(false);
    setOnline(true);
    expect(screen.getByRole('status')).toHaveTextContent(/back online/i);
    act(() => {
      jest.advanceTimersByTime(4100);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('does not show "back online" if the page never went offline', () => {
    render(<OfflineBanner />);
    setOnline(true);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('ToastProvider (error feedback)', () => {
  function Fire({
    messages,
  }: {
    messages: Array<[string, 'error' | 'success' | 'warning' | 'info']>;
  }) {
    const { showToast } = useToast();
    return <button onClick={() => messages.forEach(([m, t]) => showToast(m, t))}>fire</button>;
  }

  it('does not stack identical toasts (no spam from a repeating failure)', () => {
    render(
      <ToastProvider>
        <Fire
          messages={[
            ['Network down', 'error'],
            ['Network down', 'error'],
            ['Network down', 'error'],
          ]}
        />
      </ToastProvider>
    );
    act(() => screen.getByText('fire').click());
    expect(screen.getAllByText(/Network down/)).toHaveLength(1);
  });

  it('keeps toasts that differ in text or type', () => {
    render(
      <ToastProvider>
        <Fire
          messages={[
            ['Saved', 'success'],
            ['Saved', 'error'],
            ['Other', 'error'],
          ]}
        />
      </ToastProvider>
    );
    act(() => screen.getByText('fire').click());
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('uses role=alert for errors and role=status otherwise, with a text label and a glyph', () => {
    render(
      <ToastProvider>
        <Fire
          messages={[
            ['Boom', 'error'],
            ['Careful', 'warning'],
          ]}
        />
      </ToastProvider>
    );
    act(() => screen.getByText('fire').click());
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error: Boom');
    expect(alert).toHaveTextContent('✕');
    expect(screen.getByRole('status')).toHaveTextContent('Warning: Careful');
  });

  it('can be dismissed with the keyboard-accessible button', () => {
    render(
      <ToastProvider>
        <Fire messages={[['Boom', 'error']]} />
      </ToastProvider>
    );
    act(() => screen.getByText('fire').click());
    act(() => screen.getByRole('button', { name: 'Dismiss' }).click());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
