import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const showToastMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: showToastMock }) }));

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }));

jest.mock('@/features/landing/components/LandingNav', () => ({ LandingNav: () => <nav /> }));
jest.mock('@/features/landing/components/LandingFooter', () => ({
  LandingFooter: () => <footer />,
}));
jest.mock('@/components/motion/Reveal', () => ({
  Reveal: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Firestore: the signed-in user's subscription lookup.
const getDocMock = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => ({ col, id }),
  getDoc: (ref: unknown) => getDocMock(ref),
}));
jest.mock('@/lib/firebase/client', () => ({ getFirebaseDb: () => ({}) }));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

const openCashfreeCheckoutMock = jest.fn();
jest.mock('@/lib/cashfree/initCashfree', () => ({
  openCashfreeCheckout: (...args: unknown[]) => openCashfreeCheckoutMock(...args),
}));

jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: jest.fn() }));

// The experiment hook is mocked so its own request never consumes a mocked checkout response.
let experimentVariant = 'control';
jest.mock('@/features/experiments/useExperiment', () => ({
  useExperiment: () => experimentVariant,
}));

import PricingPageClient from './PricingPageClient';

function setSubscription(
  sub: {
    planId: string;
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string;
  } | null
) {
  getDocMock.mockImplementation((ref: { col: string; id: string }) => {
    if (ref.col === 'users') {
      return Promise.resolve({
        exists: () => true,
        data: () => ({ subscriptionId: sub ? 'sub_1' : undefined }),
      });
    }
    return Promise.resolve(
      sub
        ? {
            exists: () => true,
            data: () => ({
              status: 'active',
              cancelAtPeriodEnd: false,
              currentPeriodEnd: new Date(Date.now() + 10 * 86_400_000).toISOString(),
              ...sub,
            }),
          }
        : { exists: () => false, data: () => undefined }
    );
  });
}

function cashfreeServerResponse(orderId = 'ord_123', paymentSessionId = 'session_123') {
  return {
    orderId,
    paymentSessionId,
    environment: 'sandbox',
    amountINR: 2999,
    currency: 'INR',
  };
}

describe('PricingPageClient — honest plan comparison', () => {
  beforeEach(() => {
    experimentVariant = 'control';
    jest.clearAllMocks();
    showToastMock.mockReset();
    callFunctionMock.mockReset();
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null });
    openCashfreeCheckoutMock.mockResolvedValue(undefined);
  });

  const signedInOnFree = () => {
    useAuthMock.mockReturnValue({
      status: 'authenticated',
      user: { uid: 'u1', email: 'owner@example.test' },
    });
    setSubscription({ planId: 'free' });
  };

  describe('content', () => {
    it('shows Free, Starter, Business and Pro cards and Agency as a separate row, with catalogue prices', async () => {
      render(<PricingPageClient />);
      for (const name of ['Free', 'Starter', 'Business', 'Pro']) {
        expect(await screen.findByRole('heading', { level: 3, name })).toBeInTheDocument();
      }
      expect(screen.getByRole('heading', { level: 3, name: /^Agency/ })).toBeInTheDocument();
      // Monthly (30 days) is the default view.
      for (const price of ['₹999', '₹1,699', '₹2,999']) {
        expect(screen.getAllByText(price).length).toBeGreaterThan(0);
      }
      expect(screen.getAllByText(/for 30 days, paid once\. no automatic renewal/i)).toHaveLength(3);
    });

    it('does NOT pre-select the annual option and labels no plan as most popular or recommended', async () => {
      const { container } = render(<PricingPageClient />);
      expect(screen.getByRole('radio', { name: /30 days/i })).toBeChecked();
      expect(screen.getByRole('radio', { name: /1 year/i })).not.toBeChecked();
      const text = container.textContent ?? '';
      expect(text).not.toMatch(/most popular|best value|recommended|limited time|only \d+ left/i);
    });

    it('never claims automatic renewal, unlimited use, or an unbuilt feature as included', async () => {
      const { container } = render(<PricingPageClient />);
      await screen.findByRole('heading', { level: 3, name: 'Starter' });
      const text = container.textContent ?? '';
      expect(text).not.toMatch(/renews automatically until you cancel/i);
      expect(text).not.toMatch(/cancel anytime/i);
      expect(text).not.toMatch(/unlimited/i);
      expect(text).not.toMatch(/priority (generation )?queue|vip|white-label|agency workspace/i);
      expect(text).toMatch(/nothing renews by itself/i);
      expect(text).toMatch(/Cashfree Payments/);
      // Unbuilt features are listed only as not available.
      const notYet = screen.getByRole('heading', { name: /not available yet/i }).parentElement!;
      expect(notYet.textContent).toMatch(/scheduling/i);
      expect(notYet.textContent).toMatch(/analytics/i);
      expect(notYet.textContent).toMatch(/whatsapp/i);
    });

    it('states reels and brand kit per plan exactly as the catalogue enforces them', async () => {
      render(<PricingPageClient />);
      const line = (plan: string, label: RegExp) =>
        within(screen.getByRole('heading', { level: 3, name: plan }).closest('li')!)
          .getAllByRole('listitem')
          .find((li) => label.test(li.textContent ?? ''))!.textContent ?? '';
      await screen.findByRole('heading', { level: 3, name: 'Starter' });
      expect(line('Starter', /^.?s?Reels/)).toMatch(/not included/i);
      expect(line('Starter', /Brand kit/)).toMatch(/not included/i);
      expect(line('Business', /Reels/)).not.toMatch(/not included/i);
      expect(line('Business', /Brand kit/)).not.toMatch(/not included/i);
      expect(line('Pro', /profiles/)).toMatch(/3 business profiles/);
    });

    it('explains credits with costs from the catalogue and an explicit no-promise disclaimer', async () => {
      render(<PricingPageClient />);
      const table = await screen.findByRole('table', { name: /credits each action costs/i });
      const campaign = within(table).getByRole('row', { name: /create a campaign/i });
      expect(within(campaign).getByText('100')).toBeInTheDocument();
      expect(within(table).getByRole('row', { name: /generate one reel/i })).toHaveTextContent(
        '80'
      );
      expect(screen.getByText(/not a promise of any number of campaigns/i)).toBeInTheDocument();
    });
  });

  describe('annual comparison', () => {
    it('shows the monthly-view saving against twelve monthly purchases at the real price, with the 360 vs 365 day note', async () => {
      render(<PricingPageClient />);
      const pro = (await screen.findByRole('heading', { level: 3, name: 'Pro' })).closest('li')!;
      expect(pro.textContent).toMatch(/₹24,990 instead of ₹35,988/);
      expect(pro.textContent).toMatch(/saving of ₹10,998 \(30\.6%\)/);
      expect(pro.textContent).toMatch(/cover 360 days; the year covers 365/);
    });

    it('selecting 1 year shows the full upfront amount, the credits schedule and the saving', async () => {
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('radio', { name: /1 year/i }));
      const starter = (await screen.findByRole('heading', { level: 3, name: 'Starter' })).closest(
        'li'
      )!;
      expect(within(starter).getByText('₹9,990')).toBeInTheDocument();
      expect(starter.textContent).toMatch(/for 365 days, paid once/);
      expect(starter.textContent).toMatch(
        /500 credits at the start of each of 12 monthly periods \(6,000 in total, never all at once\)/
      );
      expect(starter.textContent).toMatch(/you pay the full ₹9,990 today/i);
      expect(starter.textContent).toMatch(/save ₹1,998 \(16\.7%\)/);
    });
  });

  describe('which plan fits', () => {
    it('highlights nothing until the visitor answers, then marks the matching plan without hiding others', async () => {
      render(<PricingPageClient />);
      expect(screen.queryByText(/fits your answers/i)).not.toBeInTheDocument();
      const campaigns = screen.getByLabelText(/campaigns per month/i);
      await userEvent.clear(campaigns);
      await userEvent.type(campaigns, '8');
      expect(screen.getByText(/fits your answers/i)).toBeInTheDocument();
      expect(screen.getByTestId('fit-result').textContent).toMatch(
        /Business has enough credits for 8 campaigns/
      );
      for (const name of ['Starter', 'Business', 'Pro']) {
        expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      }
    });
  });

  describe('accessibility structure', () => {
    it('the comparison is a real table with column and row headers and text (not icon-only) values', async () => {
      render(<PricingPageClient />);
      const table = await screen.findByRole('table', { name: /comparison of free/i });
      expect(within(table).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(6);
      const reels = within(table).getByRole('row', { name: /^reels/i });
      expect(within(reels).getByRole('rowheader', { name: 'Reels' })).toBeInTheDocument();
      expect(reels.textContent).toMatch(/Not included/);
      expect(reels.textContent).toMatch(/Included/);
    });

    it('the term choice is a labelled radio group usable by keyboard', async () => {
      render(<PricingPageClient />);
      expect(
        screen.getByRole('group', { name: /choose how long to buy for/i })
      ).toBeInTheDocument();
      const monthly = screen.getByRole('radio', { name: /30 days/i });
      monthly.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('radio', { name: /1 year/i })).toBeChecked();
    });

    it('FAQ answers are native disclosure widgets', async () => {
      const { container } = render(<PricingPageClient />);
      await screen.findByRole('heading', { level: 3, name: 'Starter' });
      expect(container.querySelectorAll('details > summary').length).toBeGreaterThanOrEqual(8);
      expect(container.textContent).toMatch(
        /30 days for monthly plans|one-time payment for a fixed number of days/i
      );
    });
  });

  describe('signed out', () => {
    it('Buy sends the visitor to sign up with the plan and cycle, with no confirmation or payment', async () => {
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('button', { name: /buy 30 days of starter/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup?plan=starter&cycle=monthly');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(callFunctionMock).not.toHaveBeenCalled();
    });

    it('carries the chosen yearly cycle to sign up', async () => {
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('radio', { name: /1 year/i }));
      await userEvent.click(screen.getByRole('button', { name: /buy 365 days of pro/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup?plan=pro&cycle=yearly');
    });

    it('Free goes to sign up and never opens checkout', async () => {
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /start free/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup');
      expect(callFunctionMock).not.toHaveBeenCalled();
    });
  });

  describe('signed in on Free: confirmation before payment', () => {
    beforeEach(signedInOnFree);

    async function openConfirm(name: RegExp, cycleRadio?: RegExp) {
      render(<PricingPageClient />);
      if (cycleRadio) await userEvent.click(screen.getByRole('radio', { name: cycleRadio }));
      await userEvent.click(await screen.findByRole('button', { name }));
      return screen.findByRole('dialog', { name: /confirm your purchase/i });
    }

    it('Buy opens a confirmation first and creates NO order until the customer confirms', async () => {
      const dialog = await openConfirm(/buy 30 days of starter/i);
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('the monthly confirmation states amount, plan, duration, credits, expiry, manual renewal and no auto-renewal', async () => {
      const dialog = await openConfirm(/buy 30 days of pro/i);
      const text = dialog.textContent ?? '';
      expect(text).toMatch(/Pro, monthly/);
      expect(text).toMatch(/₹2,999\s*one time/);
      expect(text).toMatch(/30 days from payment confirmation, until about/);
      expect(text).toMatch(/2,500 credits for your 30 days/);
      expect(text).toMatch(/do not roll over/i);
      expect(text).toMatch(/No automatic renewal/);
      expect(text).toMatch(/returns to Free and you buy again/i);
    });

    it('the yearly confirmation states the full upfront amount and the monthly credit schedule', async () => {
      const dialog = await openConfirm(/buy 365 days of pro/i, /1 year/i);
      const text = dialog.textContent ?? '';
      expect(text).toMatch(/Pro, yearly/);
      expect(text).toMatch(/₹24,990\s*one time\. This is the full amount for the whole term/);
      expect(text).toMatch(/365 days from payment confirmation/);
      expect(text).toMatch(
        /2,500 credits at the start of each of 12 monthly periods \(30,000 in total, never all at once\)/
      );
      expect(text).toMatch(/No automatic renewal/);
    });

    it('confirming creates the order for exactly the shown plan and cycle and opens Cashfree', async () => {
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_sub_m'));
      await openConfirm(/buy 30 days of starter/i);
      await userEvent.click(screen.getByRole('button', { name: /pay ₹999 once/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createCashfreeCheckout',
          data: expect.objectContaining({ planId: 'starter', billingCycle: 'monthly' }),
        })
      );
      await waitFor(() =>
        expect(openCashfreeCheckoutMock).toHaveBeenCalledWith(
          expect.objectContaining({ paymentSessionId: 'session_123', environment: 'sandbox' })
        )
      );
    });

    it.each([
      ['business', 'Business', 16990],
      ['pro', 'Pro', 24990],
      ['agency', 'Agency', 49990],
    ])('yearly %s checks out for the yearly cycle', async (planId, label, price) => {
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_y'));
      await openConfirm(new RegExp(`buy 365 days of ${label}`, 'i'), /1 year/i);
      await userEvent.click(
        screen.getByRole('button', {
          name: new RegExp(`pay ₹${price.toLocaleString('en-IN')} once`, 'i'),
        })
      );
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createCashfreeCheckout',
          data: expect.objectContaining({ planId, billingCycle: 'yearly' }),
        })
      );
    });

    it('Go back closes the dialog without creating an order and returns focus to the Buy button', async () => {
      render(<PricingPageClient />);
      const buy = await screen.findByRole('button', { name: /buy 30 days of starter/i });
      await userEvent.click(buy);
      await screen.findByRole('dialog');
      await userEvent.click(screen.getByRole('button', { name: /go back/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(buy).toHaveFocus();
    });

    it('Escape closes the dialog; Tab stays inside it', async () => {
      await openConfirm(/buy 30 days of starter/i);
      const dialog = screen.getByRole('dialog');
      for (let i = 0; i < 6; i++) {
        await userEvent.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('loading state: the confirm button is busy while the order is created and cannot be double-clicked', async () => {
      let release: (value: unknown) => void = () => undefined;
      callFunctionMock.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
      await openConfirm(/buy 30 days of starter/i);
      await userEvent.click(screen.getByRole('button', { name: /pay ₹999 once/i }));
      const busy = await screen.findByRole('button', { name: /opening secure payment/i });
      expect(busy).toBeDisabled();
      release(cashfreeServerResponse());
      await waitFor(() => expect(openCashfreeCheckoutMock).toHaveBeenCalledTimes(1));
      expect(callFunctionMock).toHaveBeenCalledTimes(1);
    });

    it('error state: shows an alert, keeps the dialog open and allows a retry', async () => {
      callFunctionMock.mockRejectedValueOnce(new Error('Network down'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      await openConfirm(/buy 30 days of starter/i);
      await userEvent.click(screen.getByRole('button', { name: /pay ₹999 once/i }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/network down/i);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again, pay ₹999 once/i })).toBeEnabled();
      consoleError.mockRestore();
    });

    it('unavailable-payment state: says payments are not open, that nobody was charged, and offers no pay button', async () => {
      callFunctionMock.mockRejectedValueOnce(
        Object.assign(new Error('Payments are not available yet.'), {
          details: { code: 'PAYMENTS_NOT_APPROVED' },
        })
      );
      await openConfirm(/buy 30 days of starter/i);
      await userEvent.click(screen.getByRole('button', { name: /pay ₹999 once/i }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/payments are not open yet\. you have not been charged/i);
      expect(screen.queryByRole('button', { name: /pay ₹999 once/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
    });

    it('a missing phone number shows the phone prompt instead of an error', async () => {
      callFunctionMock.mockRejectedValueOnce(
        Object.assign(new Error('phone'), { details: { code: 'PHONE_REQUIRED' } })
      );
      await openConfirm(/buy 30 days of starter/i);
      await userEvent.click(screen.getByRole('button', { name: /pay ₹999 once/i }));
      expect(
        await screen.findByRole('dialog', { name: /your mobile number/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('Free tier is shown as the current plan and cannot open checkout', async () => {
      render(<PricingPageClient />);
      const free = await screen.findByRole('button', { name: /current plan/i });
      expect(free).toBeDisabled();
    });

    it('loading state: plan buttons are disabled while the current plan is being checked', async () => {
      getDocMock.mockImplementation(() => new Promise(() => undefined));
      render(<PricingPageClient />);
      const buttons = await screen.findAllByRole('button', { name: /checking your plan/i });
      expect(buttons.length).toBeGreaterThan(0);
      for (const b of buttons) expect(b).toBeDisabled();
    });

    it('when the current plan cannot be read, says so and still lets the visitor choose', async () => {
      getDocMock.mockRejectedValue(new Error('offline'));
      render(<PricingPageClient />);
      expect(await screen.findByText(/could not check your current plan/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buy 30 days of starter/i })).toBeEnabled();
    });

    it('credit packs: 500 / 1,200 / 3,000 check out by pack size', async () => {
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_pack_1200'));
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /buy 1200 credits/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createCashfreeCheckout',
          data: expect.objectContaining({ creditPack: 1200 }),
        })
      );
    });
  });

  describe('signed in with an active paid subscription', () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue({
        status: 'authenticated',
        user: { uid: 'u1', email: 'owner@example.test' },
      });
    });

    it('current plan is disabled; other plans route to Billing and never open a confirmation', async () => {
      setSubscription({ planId: 'business' });
      render(<PricingPageClient />);
      expect(await screen.findByRole('button', { name: /current plan/i })).toBeDisabled();
      const manage = await screen.findAllByRole('button', { name: /manage in billing/i });
      await userEvent.click(manage[0]!);
      expect(pushMock).toHaveBeenCalledWith('/billing');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(screen.getByText(/already have access to a paid plan/i)).toBeInTheDocument();
    });

    it('an ENDED term (record still says active) is treated as no subscription: any plan can be bought again', async () => {
      setSubscription({
        planId: 'business',
        currentPeriodEnd: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      });
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /buy 30 days of starter/i }));
      expect(
        await screen.findByRole('dialog', { name: /confirm your purchase/i })
      ).toBeInTheDocument();
    });
  });

  describe('annual-saving experiment variants change framing only', () => {
    const yearlyStarter = async () => {
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('radio', { name: /1 year/i }));
      return (await screen.findByRole('heading', { level: 3, name: 'Starter' })).closest('li')!;
    };

    it('control shows the amount and the percentage', async () => {
      const card = await yearlyStarter();
      expect(card.textContent).toMatch(/save ₹1,998 \(16\.7%\)/);
      expect(card.textContent).not.toMatch(/a month, paid once/);
    });

    it('amount_only drops the percentage but keeps every price and the upfront statement', async () => {
      experimentVariant = 'amount_only';
      const card = await yearlyStarter();
      expect(card.textContent).toMatch(/you save ₹1,998\./);
      expect(card.textContent).not.toMatch(/16\.7%/);
      expect(card.textContent).toMatch(/Twelve 30-day purchases at ₹999 would cost ₹11,988/);
      expect(card.textContent).toMatch(/You pay the full ₹9,990 today/);
    });

    it('effective_monthly adds the per-month equivalent and always says it is paid once, up front', async () => {
      experimentVariant = 'effective_monthly';
      const card = await yearlyStarter();
      expect(card.textContent).toMatch(/about ₹833 a month, paid once, up front/);
      expect(card.textContent).toMatch(/You pay the full ₹9,990 today/);
      expect(card.textContent).toMatch(/save ₹1,998 \(16\.7%\)/);
    });

    it('no variant changes a price on a card or the amount in the checkout confirmation', async () => {
      experimentVariant = 'effective_monthly';
      useAuthMock.mockReturnValue({
        status: 'authenticated',
        user: { uid: 'u1', email: 'o@example.test' },
      });
      setSubscription({ planId: 'free' });
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /buy 30 days of starter/i }));
      const dialog = await screen.findByRole('dialog', { name: /confirm your purchase/i });
      expect(dialog.textContent).toMatch(/₹999\s*one time/);
    });
  });
});
