import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerifyEmailContent } from './VerifyEmailContent';

const sendVerificationEmailMock = jest.fn();
const isEmailVerifiedMock = jest.fn();
const getCurrentUserMock = jest.fn();

jest.mock('@/features/auth/services/authService', () => ({
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmailMock(...args),
  isEmailVerified: (...args: unknown[]) => isEmailVerifiedMock(...args),
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

describe('VerifyEmailContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUserMock.mockReturnValue({
      email: 'owner@example.com',
      reload: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('renders check your email title and email address', () => {
    render(<VerifyEmailContent />);
    expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/owner@example.com/i)).toBeInTheDocument();
  });

  it('calls resend verification email service on resend click', async () => {
    sendVerificationEmailMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<VerifyEmailContent />);

    await user.click(screen.getByRole('button', { name: /resend email/i }));

    await waitFor(() => expect(sendVerificationEmailMock).toHaveBeenCalled());
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });

  it("checks email verification status when clicking I've Verified", async () => {
    isEmailVerifiedMock.mockReturnValue(true);
    const onVerified = jest.fn();
    const user = userEvent.setup();
    render(<VerifyEmailContent onVerified={onVerified} />);

    await user.click(screen.getByRole('button', { name: /i've verified/i }));

    await waitFor(() => expect(isEmailVerifiedMock).toHaveBeenCalled());
    expect(onVerified).toHaveBeenCalled();
  });
});
