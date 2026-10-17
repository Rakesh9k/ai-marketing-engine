import { render, screen } from '@testing-library/react';
import { WelcomeCreditsCard } from '@/components/dashboard/WelcomeCreditsCard';
import { shouldClaimWelcomeCredits, welcomeCardState } from './welcomeCredits';

const free = (over: Record<string, unknown> = {}) =>
  ({ planId: 'free', creditsIncluded: 140, creditsUsed: 0, welcomeCredits: 140, ...over }) as never;

describe('welcome credits: what the dashboard shows', () => {
  describe('state', () => {
    it('a granted, unspent account can afford a full campaign', () => {
      expect(welcomeCardState(free())).toEqual({
        kind: 'ready',
        remaining: 140,
        campaignCost: 100,
        campaigns: 1,
      });
    });

    it('after a campaign the rest is described as a small balance, not an error', () => {
      expect(welcomeCardState(free({ creditsUsed: 100 }))).toEqual({
        kind: 'low',
        remaining: 40,
        campaignCost: 100,
      });
    });

    it('all spent is "used up", which is the only place a purchase is pushed', () => {
      expect(welcomeCardState(free({ creditsUsed: 140 }))).toEqual({ kind: 'used_up' });
      expect(welcomeCardState(free({ creditsUsed: 999 }))).toEqual({ kind: 'used_up' });
    });

    it('a brand-new account whose credits are not added yet is "setting up"', () => {
      expect(welcomeCardState(free({ creditsIncluded: 0, welcomeCredits: 0 }))).toEqual({
        kind: 'setting_up',
      });
    });

    it('says why credits are unavailable, from the server answer', () => {
      const none = free({ creditsIncluded: 0, welcomeCredits: 0 });
      expect(
        welcomeCardState(none, { status: 'not_eligible_yet', reasons: ['email_not_verified'] })
      ).toEqual({
        kind: 'unavailable',
        reason: 'email_not_verified',
      });
      expect(
        welcomeCardState(none, { status: 'denied', reasons: ['identity_already_claimed:email'] })
      ).toEqual({
        kind: 'unavailable',
        reason: 'identity_already_claimed',
      });
      expect(
        welcomeCardState(none, { status: 'not_eligible_yet', reasons: ['onboarding_incomplete'] })
      ).toEqual({
        kind: 'unavailable',
        reason: 'other',
      });
    });

    it('says nothing to paid users, to older accounts on the monthly allowance, or when there is no data', () => {
      expect(welcomeCardState(free({ planId: 'starter' }))).toEqual({ kind: 'hidden' });
      expect(welcomeCardState(free({ welcomeCredits: 0, creditsIncluded: 140 }))).toEqual({
        kind: 'hidden',
      }); // legacy monthly
      expect(welcomeCardState(null)).toEqual({ kind: 'hidden' });
      expect(
        welcomeCardState(free({ creditsIncluded: 0, welcomeCredits: 0 }), {
          status: 'not_applicable',
          reasons: ['legacy_account'],
        })
      ).toEqual({ kind: 'hidden' });
    });
  });

  describe('when the app asks the server for the credits', () => {
    it('only for a free account that has none and no grant yet', () => {
      expect(shouldClaimWelcomeCredits(free({ creditsIncluded: 0, welcomeCredits: 0 }))).toBe(true);
      expect(shouldClaimWelcomeCredits(free())).toBe(false); // already has them
      expect(shouldClaimWelcomeCredits(free({ welcomeCredits: 0, creditsIncluded: 140 }))).toBe(
        false
      ); // legacy
      expect(
        shouldClaimWelcomeCredits(free({ planId: 'pro', creditsIncluded: 0, welcomeCredits: 0 }))
      ).toBe(false);
      expect(shouldClaimWelcomeCredits(null)).toBe(false);
    });
  });

  describe('card', () => {
    it('first campaign: states the amount, that no card is needed and that they do not expire, and links to creating it', () => {
      render(<WelcomeCreditsCard state={welcomeCardState(free())} hasCampaigns={false} />);
      expect(screen.getByText('You have 140 free credits')).toBeInTheDocument();
      expect(screen.getByText(/no card is needed/i)).toBeInTheDocument();
      expect(screen.getByText(/do not expire/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create your first campaign/i })).toHaveAttribute(
        'href',
        '/campaigns/new'
      );
    });

    it('does not push a purchase before value: no pricing link while credits remain for a campaign', () => {
      render(<WelcomeCreditsCard state={welcomeCardState(free())} hasCampaigns={false} />);
      expect(screen.queryByRole('link', { name: /plan/i })).toBeNull();
    });

    it('low and used-up balances point to plans, and say what is kept', () => {
      const { unmount } = render(
        <WelcomeCreditsCard state={welcomeCardState(free({ creditsUsed: 100 }))} hasCampaigns />
      );
      expect(screen.getByText('You have 40 free credits left')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /see plans/i })).toHaveAttribute('href', '/pricing');
      unmount();
      render(
        <WelcomeCreditsCard state={welcomeCardState(free({ creditsUsed: 140 }))} hasCampaigns />
      );
      expect(screen.getByText('You have used your free credits')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /choose a plan/i })).toHaveAttribute(
        'href',
        '/pricing'
      );
    });

    it('never uses trial or countdown language', () => {
      for (const state of [
        welcomeCardState(free()),
        welcomeCardState(free({ creditsUsed: 100 })),
        welcomeCardState(free({ creditsUsed: 140 })),
        welcomeCardState(free({ creditsIncluded: 0, welcomeCredits: 0 })),
        welcomeCardState(free({ creditsIncluded: 0, welcomeCredits: 0 }), {
          status: 'not_eligible_yet',
          reasons: ['email_not_verified'],
        }),
      ]) {
        const { container, unmount } = render(
          <WelcomeCreditsCard state={state} hasCampaigns={false} />
        );
        expect(container.textContent).not.toMatch(
          /trial|days? left|expires? (in|on)|hurry|last chance|countdown/i
        );
        unmount();
      }
    });

    it('renders nothing when hidden', () => {
      const { container } = render(
        <WelcomeCreditsCard state={{ kind: 'hidden' }} hasCampaigns={false} />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('after a paid term ends (K1 accounting: free credits already spent are not shown as unspent)', () => {
    it('shows the genuinely unspent free credits (40), not the 140 the old accounting reported', () => {
      // Plan credits are fully accounted for (planCredits equals what was used against them); 40 free credits remain.
      const usage = {
        planId: 'free' as const,
        creditsIncluded: 240,
        creditsUsed: 200,
        welcomeCredits: 40,
      };
      expect(welcomeCardState(usage)).toEqual({ kind: 'low', remaining: 40, campaignCost: 100 });
    });

    it('with every free credit spent the card is hidden (the same quiet treatment as an older monthly-allowance account); plans stay one click away on the pricing and billing pages', () => {
      const usage = {
        planId: 'free' as const,
        creditsIncluded: 200,
        creditsUsed: 200,
        welcomeCredits: 0,
      };
      expect(welcomeCardState(usage)).toEqual({ kind: 'hidden' });
    });
  });
});
