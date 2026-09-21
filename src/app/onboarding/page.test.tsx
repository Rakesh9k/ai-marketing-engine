import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business } from '@/types';

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

const getByUserIdMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: {
    getByUserId: (...args: unknown[]) => getByUserIdMock(...args),
  },
}));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

import OnboardingPage from './page';

/**
 * Phase 35 — Priority 2 (Onboarding). Tests the actual, real wizard
 * behavior — including that there is genuinely no in-progress-step
 * persistence across a refresh (confirmed by reading the source: state is
 * plain useState, no localStorage) — rather than asserting a persistence
 * guarantee the app doesn't make.
 */
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Existing Biz',
    category: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Business;
}

async function fillStep1(
  user: ReturnType<typeof userEvent.setup>,
  category: 'restaurant' | 'salon' | 'real_estate' = 'restaurant'
) {
  await user.type(screen.getByPlaceholderText(/biryani house/i), 'My Test Business');
  if (category !== 'restaurant') {
    await user.click(
      screen.getByRole('button', {
        name: new RegExp(category === 'real_estate' ? 'real estate' : category, 'i'),
      })
    );
  }
  await user.click(screen.getByRole('button', { name: /continue/i }));
}

async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/hyderabad/i), 'Hyderabad');
  await user.type(screen.getByPlaceholderText(/telangana/i), 'Telangana');
  await user.click(screen.getByRole('button', { name: /continue/i }));
}

async function fillStep3(user: ReturnType<typeof userEvent.setup>) {
  const phoneInputs = screen.getAllByPlaceholderText(/\+91 98765 43210/i);
  await user.type(phoneInputs[0]!, '9876543210');
  await user.type(phoneInputs[1]!, '9876543210');
  await user.click(screen.getByRole('button', { name: /continue/i }));
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    getByUserIdMock.mockResolvedValue([]);
  });

  it('step progression: Business Basics -> Location -> Contact & Operations, in order', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    expect(screen.getByText('Business Basics')).toBeInTheDocument();
    await fillStep1(user);

    expect(await screen.findByText('Location')).toBeInTheDocument();
    await fillStep2(user);

    expect(await screen.findByText('Contact & Operations')).toBeInTheDocument();
  });

  it('validation: an empty business name blocks progression and shows an error, without advancing the step', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/business name is required/i)).toBeInTheDocument();
    expect(screen.getByText('Business Basics')).toBeInTheDocument();
  });

  it('validation: an empty city/state on the Location step blocks progression', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await fillStep1(user);
    expect(await screen.findByText('Location')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/city is required/i)).toBeInTheDocument();
    expect(screen.getByText(/state is required/i)).toBeInTheDocument();
  });

  it('back navigation: going back from Location to Business Basics preserves the entered name', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await fillStep1(user);
    expect(await screen.findByText('Location')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(await screen.findByText('Business Basics')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/biryani house/i)).toHaveValue('My Test Business');
  });

  it('refresh: a fresh mount for a user who already completed onboarding skips straight to the completion screen, not step 1 (the only "persistence" this wizard has)', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness({ status: 'active', category: 'restaurant' })]);
    render(<OnboardingPage />);

    expect(await screen.findByText(/your business is set up/i)).toBeInTheDocument();
    expect(screen.queryByText('Business Basics')).not.toBeInTheDocument();
  });

  it('refresh: an in-progress wizard step is genuinely NOT preserved across a fresh mount (no localStorage) — remounting restarts at step 1', async () => {
    getByUserIdMock.mockResolvedValue([]); // no existing business yet
    const user = userEvent.setup();
    const { unmount } = render(<OnboardingPage />);
    await fillStep1(user);
    expect(await screen.findByText('Location')).toBeInTheDocument();

    unmount();
    render(<OnboardingPage />);

    expect(await screen.findByText('Business Basics')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/biryani house/i)).toHaveValue('');
  });

  it('completion: a full restaurant walkthrough calls createBusiness with the correct payload and shows the success screen', async () => {
    callFunctionMock.mockResolvedValue({ businessId: 'new_biz' });
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await fillStep1(user);
    await fillStep2(user);
    await fillStep3(user);
    expect(await screen.findByText('Marketing Preferences')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/review your business/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'createBusiness',
          data: expect.objectContaining({
            name: 'My Test Business',
            category: 'restaurant',
            location: expect.objectContaining({ city: 'Hyderabad', state: 'Telangana' }),
            contact: { phone: '9876543210', whatsapp: '9876543210' },
            operatingMode: 'dine-in',
          }),
        })
      )
    );
    expect(await screen.findByText(/your business is set up/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    );
  });

  it('invalid data / backend failure: a rejected createBusiness call shows the error and keeps the user on the review step (no fake success)', async () => {
    callFunctionMock.mockRejectedValue(new Error('That business name is already in use'));
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await fillStep1(user);
    await fillStep2(user);
    await fillStep3(user);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    expect(await screen.findByText(/already in use/i)).toBeInTheDocument();
    expect(screen.queryByText(/your business is set up/i)).not.toBeInTheDocument();
  });

  it('Priority 9 — vertical isolation: a salon business gets an extra Services & Packages step that a restaurant never sees', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await fillStep1(user, 'salon');
    await fillStep2(user);
    await fillStep3(user);

    expect(await screen.findByText(/services (&|and) packages/i)).toBeInTheDocument();
  });

  it('Priority 9 — vertical isolation: a restaurant never sees the salon services step or the real-estate properties step', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await fillStep1(user, 'restaurant');
    await fillStep2(user);
    await fillStep3(user);

    expect(screen.queryByText(/services (&|and) packages/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^properties$/i)).not.toBeInTheDocument();
    expect(await screen.findByText('Marketing Preferences')).toBeInTheDocument();
  });
});
