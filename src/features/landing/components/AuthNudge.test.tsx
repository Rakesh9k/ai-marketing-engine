import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: () => <button type="button">Continue with Google</button>,
}));
jest.mock('@/components/ui/MitraMascot', () => ({ MitraMascot: () => <span /> }));

import { AuthNudge } from './AuthNudge';

describe('AuthNudge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing while closed', () => {
    render(<AuthNudge open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is an accessible, value-led dialog — not a generic "sign up to continue"', () => {
    render(<AuthNudge open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /let's make this yours/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/remember your business, your brand/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign up to continue/i)).not.toBeInTheDocument();
  });

  it('sends "Continue with email" to /signup', async () => {
    render(<AuthNudge open onClose={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    expect(pushMock).toHaveBeenCalledWith('/signup');
  });

  it('closes on Escape, on the close button, and on backdrop click', async () => {
    const onClose = jest.fn();
    const { container } = render(<AuthNudge open onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
    await userEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('restores scroll when it closes', () => {
    const { rerender } = render(<AuthNudge open onClose={jest.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<AuthNudge open={false} onClose={jest.fn()} />);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
