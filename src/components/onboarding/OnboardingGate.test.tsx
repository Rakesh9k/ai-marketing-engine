import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const replaceMock = jest.fn();
let pathname = '/onboarding';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathname,
}));
jest.mock('@/features/auth/services/authService', () => ({
  getCurrentUser: () => ({ uid: 'u1' }),
}));
const resolveMock = jest.fn();
jest.mock('@/features/auth/utils/postAuthRouting', () => ({
  VERIFY_EMAIL_PATH: '/verify-email',
  resolvePostAuthDestination: (...a: unknown[]) => resolveMock(...a),
}));
jest.mock('@/components/ui/MitraMark', () => ({ MitraMark: () => <span /> }));

import { OnboardingGate } from './OnboardingGate';

const FLAG = 'NEXT_PUBLIC_ONBOARDING_V2';

describe('OnboardingGate', () => {
  const original = process.env[FLAG];
  beforeEach(() => {
    jest.clearAllMocks();
    pathname = '/onboarding';
    resolveMock.mockResolvedValue('/onboarding');
    delete process.env[FLAG];
  });
  afterEach(() => {
    if (original === undefined) delete process.env[FLAG];
    else process.env[FLAG] = original;
  });

  const renderGate = () =>
    render(
      <OnboardingGate>
        <div>wizard</div>
      </OnboardingGate>
    );

  it('shows the original wizard at /onboarding while the flag is off', async () => {
    renderGate();
    expect(await screen.findByText('wizard')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('forwards /onboarding to the conversation once the flag is on, so every old link lands there', async () => {
    process.env[FLAG] = 'true';
    renderGate();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/onboarding/v2'));
    expect(screen.queryByText('wizard')).not.toBeInTheDocument();
  });

  it('does not bounce the conversation itself', async () => {
    process.env[FLAG] = 'true';
    pathname = '/onboarding/v2';
    renderGate();
    expect(await screen.findByText('wizard')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('keeps the conversation unreachable while the flag is off, even by direct URL (the flag is the one switch)', async () => {
    pathname = '/onboarding/v2';
    renderGate();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/onboarding'));
    expect(screen.queryByText('wizard')).not.toBeInTheDocument();
  });

  it('still sends an unverified email owner to verify first, flag or not', async () => {
    process.env[FLAG] = 'true';
    resolveMock.mockResolvedValue('/verify-email');
    renderGate();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/verify-email'));
    expect(screen.queryByText('wizard')).not.toBeInTheDocument();
  });
});
