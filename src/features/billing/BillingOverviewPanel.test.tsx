import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

import { BillingOverviewPanel, type BillingOverviewData } from './BillingOverviewPanel';

const overview = (over: Partial<BillingOverviewData> = {}): BillingOverviewData => ({
  access: {
    status: 'active',
    planId: 'pro',
    planName: 'Pro',
    cycle: 'yearly',
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2027-10-01T10:00:00.000Z',
  },
  credits: {
    available: 2100,
    welcomeRemaining: 40,
    expiredTotal: 120,
    nextAllocation: { at: '2026-10-31T10:00:00.000Z', credits: 2500 },
  },
  expiredHistory: [{ at: '2026-10-05T10:00:00.000Z', credits: 120 }],
  lastPayment: {
    orderId: 'order_abcdef123456',
    kind: 'plan',
    label: 'Pro (365 days)',
    amountINR: 24990,
    state: 'fulfilled',
    paidAt: '2026-10-01T10:00:00.000Z',
  },
  purchases: [
    {
      orderId: 'order_abcdef123456',
      kind: 'plan',
      label: 'Pro (365 days)',
      amountINR: 24990,
      state: 'fulfilled',
      paidAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  reminders: { enabled: true },
  receipts: {
    supported: false,
    note: 'Your payment partner (Cashfree) sends the payment confirmation.',
  },
  ...over,
});

describe('BillingOverviewPanel', () => {
  beforeEach(() => {
    callFunctionMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows the server-reported plan, exact term dates, balance, next allocation, expiry history and last payment', async () => {
    callFunctionMock.mockResolvedValue(overview());
    render(<BillingOverviewPanel />);
    const panel = await screen.findByTestId('billing-overview');
    expect(callFunctionMock).toHaveBeenCalledWith({ functionName: 'getBillingOverview', data: {} });
    const text = panel.textContent ?? '';
    expect(text).toContain('Pro (365-day term)');
    expect(text).toContain('Active until 1 Oct 2027, 3:30 pm IST');
    expect(text).toContain('Term started 1 Oct 2026');
    expect(text).toContain('2,100');
    expect(text).toContain('Includes 40 free starter credits, which do not expire.');
    expect(text).toContain('Next: 2,500 credits on 31 Oct 2026');
    expect(text).toContain('120 plan credits expired unused on 5 Oct 2026');
    expect(text).toContain('₹24,990, Pro (365 days)');
    expect(text).toContain('Manual. Nothing renews automatically');
    expect(within(panel).getByRole('link', { name: /renew or buy a term/i })).toHaveAttribute(
      'href',
      '#subscription-plans'
    );
  });

  it('lists purchases in an accessible table with a reference, and says receipts come from the payment partner', async () => {
    callFunctionMock.mockResolvedValue(overview());
    render(<BillingOverviewPanel />);
    const table = await screen.findByRole('table', { name: /your purchases/i });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(table).getByText('abcdef123456'.slice(-10))).toBeInTheDocument();
    expect(within(table).getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText(/sends the payment confirmation/i)).toBeInTheDocument();
  });

  it('an ended term is stated as ended and on Free, and an empty history is stated plainly', async () => {
    callFunctionMock.mockResolvedValue(
      overview({
        access: {
          status: 'ended',
          planId: 'free',
          planName: 'Free',
          cycle: null,
          startsAt: '2026-09-01T10:00:00.000Z',
          endsAt: '2026-10-01T10:00:00.000Z',
        },
        credits: { available: 0, welcomeRemaining: 0, expiredTotal: 0, nextAllocation: null },
        expiredHistory: [],
        lastPayment: null,
        purchases: [],
      })
    );
    render(<BillingOverviewPanel />);
    const panel = await screen.findByTestId('billing-overview');
    expect(panel.textContent).toContain(
      'Ended on 1 Oct 2026, 3:30 pm IST. You are on the Free plan.'
    );
    expect(panel.textContent).toContain('No payments yet.');
    expect(panel.textContent).toContain('Nothing purchased yet.');
    expect(panel.textContent).not.toMatch(/Expired credits/);
  });

  it('when the server cannot be reached it says so and shows no balance; retry works', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(overview());
    render(<BillingOverviewPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not load your billing summary/i
    );
    expect(screen.queryByText('2,100')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('billing-overview')).toBeInTheDocument();
  });

  it('an incomplete answer is treated as a failure, never shown as a guess', async () => {
    callFunctionMock.mockResolvedValue({ orderId: 'x' });
    render(<BillingOverviewPanel />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('turning reminders off calls the server with that one flag and reflects the saved state; a failure reverts and says so', async () => {
    callFunctionMock.mockResolvedValueOnce(overview());
    render(<BillingOverviewPanel />);
    const box = await screen.findByRole('checkbox', { name: /email me before my access ends/i });
    expect(box).toBeChecked();

    callFunctionMock.mockResolvedValueOnce({ renewalReminders: false });
    await userEvent.click(box);
    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'setEmailPreferences',
        data: { renewalReminders: false },
      })
    );
    await waitFor(() => expect(box).not.toBeChecked());

    callFunctionMock.mockRejectedValueOnce(new Error('nope'));
    await userEvent.click(box);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(box).not.toBeChecked();
  });
});
