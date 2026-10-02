import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from './ResetPasswordForm';

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn().mockReturnValue({}),
}));

const confirmPasswordResetMock = jest.fn();
jest.mock('firebase/auth', () => ({
  confirmPasswordReset: (...args: unknown[]) => confirmPasswordResetMock(...args),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects weak password before submitting', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm oobCode="code123" />);

    await user.type(screen.getByLabelText(/new password/i), 'weakpass');
    await user.type(screen.getByLabelText(/confirm password/i), 'weakpass');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/uppercase letter/i)).toBeInTheDocument();
    expect(confirmPasswordResetMock).not.toHaveBeenCalled();
  });

  it('submits valid new password and displays success message', async () => {
    confirmPasswordResetMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordForm oobCode="code123" />);

    await user.type(screen.getByLabelText(/new password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(confirmPasswordResetMock).toHaveBeenCalledWith(expect.anything(), 'code123', 'Password123!');
    });
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });
});
