import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business, Campaign } from '@/types';

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

const getByUserIdMock = jest.fn();
const getCurrentPeriodMock = jest.fn();
const listByBusinessMock = jest.fn();
const getSubscriptionByUserIdMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: { getByUserId: (...a: unknown[]) => getByUserIdMock(...a) },
  usageService: { getCurrentPeriod: (...a: unknown[]) => getCurrentPeriodMock(...a) },
  campaignService: { listByBusiness: (...a: unknown[]) => listByBusinessMock(...a) },
  subscriptionService: { getByUserId: (...a: unknown[]) => getSubscriptionByUserIdMock(...a) },
}));

import DashboardPage from './page';

/**
 * Phase 35 — Priority 3 (Business): dashboard loading/empty/error states,
 * business list rendering, and switching the selected business. Business
 * *creation* and *editing* are already covered by onboarding/page.test.tsx
 * and business-profile/page.test.tsx (Phase 33/35) — this file only covers
 * what's unique to the dashboard: read + selection, not mutation.
 */
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Kondapur Biryani House',
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

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaignId: 'camp_1',
    businessId: 'biz_1',
    userId: 'user_1',
    objective: 'weekend_offer',
    offer: {
      headline: 'Weekend Special',
      price: 299,
      type: 'percentage',
      validityStart: new Date().toISOString(),
      validityEnd: new Date().toISOString(),
    },
    duration: { start: new Date().toISOString(), end: new Date().toISOString() },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localization: {} as Campaign['localization'],
    status: 'completed',
    creditsReserved: 140,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as Campaign;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    getSubscriptionByUserIdMock.mockResolvedValue(null);
    getCurrentPeriodMock.mockResolvedValue(null);
    listByBusinessMock.mockResolvedValue({ campaigns: [] });
  });

  it('shows a loading spinner before business data resolves', () => {
    getByUserIdMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DashboardPage />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('empty state: shows "No business set up yet" and a link to onboarding when the user has no business', async () => {
    getByUserIdMock.mockResolvedValue([]);
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText(/no business set up yet/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /create business/i })).toHaveAttribute(
      'href',
      '/onboarding'
    );
  });

  it('error state: shows a friendly error message when loading dashboard data fails, never a raw stack trace', async () => {
    getByUserIdMock.mockRejectedValue(new Error('Firestore unavailable'));
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText(/something got in the way/i)).toBeInTheDocument());
    expect(screen.queryByText(/Firestore unavailable/i)).not.toBeInTheDocument();
  });

  it('renders the real business name and recent campaigns from the backend, not invented data', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    listByBusinessMock.mockResolvedValue({ campaigns: [makeCampaign()] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Kondapur Biryani House').length).toBeGreaterThan(0);
      expect(screen.getByText('Weekend Special')).toBeInTheDocument();
    });
  });

  it('shows "No campaigns yet" when the selected business has none, not an empty list silently', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    listByBusinessMock.mockResolvedValue({ campaigns: [] });

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText(/no campaigns yet/i)).toBeInTheDocument());
  });

  it('with a single business, shows a static badge, not a switcher dropdown', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Kondapur Biryani House').length).toBeGreaterThan(0)
    );
    expect(screen.queryByRole('combobox', { name: /select business/i })).not.toBeInTheDocument();
  });

  it('with multiple businesses, switching the selector reloads campaigns for the newly selected business', async () => {
    const bizA = makeBusiness({ businessId: 'biz_a', name: 'Business A' });
    const bizB = makeBusiness({ businessId: 'biz_b', name: 'Business B' });
    getByUserIdMock.mockResolvedValue([bizA, bizB]);
    listByBusinessMock.mockImplementation((businessId: string) =>
      Promise.resolve({
        campaigns: [
          makeCampaign({
            businessId,
            offer: { ...makeCampaign().offer, headline: `Headline for ${businessId}` },
          }),
        ],
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);

    // The dashboard's data-load effect re-fires once more right after it
    // first sets the selected business (selectedBusinessId is in its own
    // dependency array), so there's a brief second loading flash on
    // mount — re-querying fresh (rather than reusing an earlier node
    // reference) makes this test robust to that real, pre-existing timing
    // behavior instead of racing it.
    await waitFor(() => expect(screen.getByText('Headline for biz_a')).toBeInTheDocument());
    const selector = await screen.findByRole('combobox', { name: /select business/i });

    await user.selectOptions(selector, 'biz_b');

    await waitFor(() =>
      expect(listByBusinessMock).toHaveBeenCalledWith('biz_b', undefined, undefined, 5)
    );
    await waitFor(() => expect(screen.getByText('Headline for biz_b')).toBeInTheDocument());
  });

  it("authorization: business data is always fetched scoped to the signed-in user's uid, never a hardcoded or client-guessed id", async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Kondapur Biryani House').length).toBeGreaterThan(0)
    );
    expect(getByUserIdMock).toHaveBeenCalledWith('user_1');
  });
});
