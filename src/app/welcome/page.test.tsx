import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }));

const getByUserIdMock = jest.fn();
const getCurrentPeriodMock = jest.fn();
jest.mock('@/services/database', () => ({
  subscriptionService: { getByUserId: (...a: unknown[]) => getByUserIdMock(...a) },
  usageService: { getCurrentPeriod: (...a: unknown[]) => getCurrentPeriodMock(...a) },
}));

import WelcomePage from './page';

describe('WelcomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    useAuthMock.mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } });
    getCurrentPeriodMock.mockResolvedValue({ creditsIncluded: 500 });
  });
  afterEach(() => jest.restoreAllMocks());

  it('confirms an active paid plan with its credits', async () => {
    getByUserIdMock.mockResolvedValue({ planId: 'starter', status: 'active' });
    render(<WelcomePage />);
    expect(await screen.findByText(/you.re all set/i)).toBeInTheDocument();
    expect(screen.getByText(/Starter plan is active with 500 credits/i)).toBeInTheDocument();
  });

  it('while the webhook has not landed it says it is confirming — it does not claim Free', async () => {
    getByUserIdMock.mockResolvedValue({ planId: 'free', status: 'active' });
    render(<WelcomePage />);
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/confirming your payment/i);
    expect(screen.queryByText(/free/i)).not.toBeInTheDocument();
  });

  it('a Firestore read FAILURE shows an error state, never "all set" or a Free plan', async () => {
    getByUserIdMock.mockRejectedValue(new Error('Firestore not initialized'));
    render(<WelcomePage />);
    expect(await screen.findByText(/couldn.t check your plan/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/payment is safe/i);
    expect(screen.queryByText(/you.re all set/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/free/i)).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      '[billing] subscription read failed',
      expect.stringContaining('Firestore not initialized')
    );
  });

  it('Try again recovers once reads work', async () => {
    getByUserIdMock.mockRejectedValueOnce(new Error('offline'));
    getByUserIdMock.mockResolvedValue({ planId: 'business', status: 'active' });
    getCurrentPeriodMock.mockResolvedValue({ creditsIncluded: 1200 });
    render(<WelcomePage />);
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getByText(/Business plan is active/i)).toBeInTheDocument());
  });

  it('signed out: asks to sign in', () => {
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null });
    render(<WelcomePage />);
    expect(screen.getByText(/sign in to see your plan/i)).toBeInTheDocument();
  });
});
