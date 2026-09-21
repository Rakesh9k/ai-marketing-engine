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

import AnalyticsPage from './page';

/**
 * Phase 32 — proves the Analytics page actually renders what the backend
 * returns (no client-side invention of numbers), and that every state the
 * phase brief requires (loading, no-business empty state, no-activity
 * empty state, error, and a populated view) is reachable and shows the
 * right thing for that state specifically.
 */
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Test Biryani House',
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

function makeAnalyticsResult(overrides: Record<string, unknown> = {}) {
  return {
    businessId: 'biz_1',
    rangeDays: 30,
    rangeStart: new Date(Date.now() - 30 * 86400000).toISOString(),
    rangeEnd: new Date().toISOString(),
    totals: { campaignsStarted: 5, campaignsGenerated: 4, assetsDownloaded: 7, whatsappClicks: 12 },
    dailyActivity: [
      { date: '2026-01-01', campaignsGenerated: 4, assetsDownloaded: 7, whatsappClicks: 12 },
    ],
    eventsAggregated: 28,
    truncated: false,
    subscription: { planId: 'starter', status: 'active' },
    ...overrides,
  };
}

describe('AnalyticsPage (Phase 32)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
  });

  it('shows a loading spinner before the business list resolves', () => {
    getByUserIdMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<AnalyticsPage />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(callFunctionMock).not.toHaveBeenCalled();
  });

  it('shows a "no business" empty state when the user has no business set up', async () => {
    getByUserIdMock.mockResolvedValue([]);
    render(<AnalyticsPage />);
    await waitFor(() => expect(screen.getByText(/no business set up yet/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /create business/i })).toHaveAttribute(
      'href',
      '/onboarding'
    );
    // Must never call the analytics callable with no business selected.
    expect(callFunctionMock).not.toHaveBeenCalled();
  });

  it('renders real aggregate numbers from the backend response — never invents or recomputes them', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    callFunctionMock.mockResolvedValue(makeAnalyticsResult());

    render(<AnalyticsPage />);

    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument()); // campaignsGenerated
    expect(screen.getByText('7')).toBeInTheDocument(); // assetsDownloaded
    expect(screen.getByText('12')).toBeInTheDocument(); // whatsappClicks
    expect(screen.getByText(/of 5 started/i)).toBeInTheDocument(); // campaignsStarted, shown as context not its own tile
    expect(screen.getByText('Starter')).toBeInTheDocument(); // subscription.planId, capitalized for display only

    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'getAnalyticsDashboard',
      data: { businessId: 'biz_1', days: 30 },
    });
  });

  it('shows "No activity yet" — not zeroed-out stat cards — when eventsAggregated is 0', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    callFunctionMock.mockResolvedValue(
      makeAnalyticsResult({
        totals: {
          campaignsStarted: 0,
          campaignsGenerated: 0,
          assetsDownloaded: 0,
          whatsappClicks: 0,
        },
        dailyActivity: [],
        eventsAggregated: 0,
      })
    );

    render(<AnalyticsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no activity yet in this period/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('Campaigns Generated')).not.toBeInTheDocument();
  });

  it('shows an error state with a retry action when the callable rejects', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    callFunctionMock.mockRejectedValue(new Error('Access denied to business'));

    render(<AnalyticsPage />);

    await waitFor(() => expect(screen.getByText(/something got in the way/i)).toBeInTheDocument());
    expect(screen.getByText(/access denied to business/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('clicking "Try again" after an error re-requests analytics data', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    callFunctionMock.mockRejectedValueOnce(new Error('Access denied to business'));

    render(<AnalyticsPage />);
    await waitFor(() => expect(screen.getByText(/something got in the way/i)).toBeInTheDocument());

    callFunctionMock.mockResolvedValueOnce(makeAnalyticsResult());
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Campaigns Generated')).toBeInTheDocument();
  });

  it('switching the time range re-requests analytics with the new `days` value', async () => {
    const user = userEvent.setup();
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    callFunctionMock.mockResolvedValue(makeAnalyticsResult());

    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'getAnalyticsDashboard',
        data: { businessId: 'biz_1', days: 30 },
      })
    );

    await user.click(screen.getByRole('button', { name: '7 days' }));

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenLastCalledWith({
        functionName: 'getAnalyticsDashboard',
        data: { businessId: 'biz_1', days: 7 },
      })
    );
  });
});
