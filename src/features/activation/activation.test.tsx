import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { buildUpgradePrompt, MANUAL_RENEWAL_NOTE } from './upgradeModel';
import { UpgradePrompt } from './UpgradePrompt';
import { deriveJourney } from './journey';
import { FirstCampaignGuide } from './FirstCampaignGuide';
import { CampaignNextSteps } from './CampaignNextSteps';
import { nextCampaignIdeas, summariseAssets } from './nextSteps';
import * as server from '../../../functions/src/config/planCatalogue';

describe('upgrade prompts come from the catalogue and appear only with a reason', () => {
  const cat = server.getActiveCatalogue();

  it('not enough credits: says what was tried, why, and offers the smallest plan and pack that cover it', () => {
    const m = buildUpgradePrompt({
      kind: 'not_enough_credits',
      action: 'generate this campaign',
      needed: 100,
      available: 40,
    });
    expect(m.tried).toBe('You were about to generate this campaign.');
    expect(m.why).toMatch(
      /uses 100 credits and you have 40, so you are 60 short\. Nothing was charged/
    );
    const starter = server.findOffer(cat, 'starter', 'monthly')!;
    const plan = m.options.find((o) => o.kind === 'plan')!;
    expect(plan.title).toBe('Starter for 30 days');
    expect(plan.price).toBe(`₹${starter.priceINR.toLocaleString('en-IN')}`);
    const pack = m.options.find((o) => o.kind === 'pack')!;
    expect(pack.title).toBe('500 credit top-up'); // smallest pack covering the 60 short
    expect(pack.price).toBe(`₹${server.findCreditPack(cat, 500)!.priceINR}`);
    expect(pack.term).toMatch(/calendar month/);
    expect(m.renewal).toBe(MANUAL_RENEWAL_NOTE);
    expect(m.renewal).toMatch(/does not renew automatically/);
  });

  it('a reel request names the cheapest plan that really includes reels', () => {
    const m = buildUpgradePrompt({ kind: 'plan_feature', feature: 'reels' });
    expect(m.options).toHaveLength(1);
    expect(m.options[0]!.title).toBe('Business for 30 days');
    expect(m.why).toMatch(/start with the Business plan/);
  });

  it('a brand kit request and a business-limit request pick the right plan', () => {
    expect(
      buildUpgradePrompt({ kind: 'plan_feature', feature: 'brand_kit' }).options[0]!.title
    ).toBe('Business for 30 days');
    expect(buildUpgradePrompt({ kind: 'more_businesses', needed: 2 }).options[0]!.title).toBe(
      'Pro for 30 days'
    );
  });

  it('renders accessibly with price, term, manual renewal and a link to pricing', () => {
    render(
      <UpgradePrompt
        context={{
          kind: 'not_enough_credits',
          action: 'generate this campaign',
          needed: 100,
          available: 40,
        }}
      />
    );
    const region = screen.getByRole('region', {
      name: /you were about to generate this campaign/i,
    });
    expect(within(region).getByText(/does not renew automatically/i)).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: /see plans and pay/i })).toHaveAttribute(
      'href',
      '/pricing'
    );
    expect(region.textContent).not.toMatch(/limited|hurry|miss out|only \d+ left|last chance/i);
  });
});

describe('the first-value journey', () => {
  it('a new owner with no business: step 1 is current and leads to onboarding', () => {
    const j = deriveJourney({ hasBusiness: false, campaignCount: 0, hasFinishedCampaign: false });
    expect(j.steps.map((s) => s.status)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(j.next).toEqual({ label: 'Set up your business', href: '/onboarding' });
  });

  it('with a business and no campaign, the one action is the first campaign', () => {
    const j = deriveJourney({ hasBusiness: true, campaignCount: 0, hasFinishedCampaign: false });
    expect(j.steps[0]!.status).toBe('done');
    expect(j.next).toEqual({ label: 'Create your first campaign', href: '/campaigns/new' });
  });

  it('after a finished campaign the next step is making another; after two it is complete', () => {
    const one = deriveJourney({ hasBusiness: true, campaignCount: 1, hasFinishedCampaign: true });
    expect(one.next).toEqual({ label: 'Create another campaign', href: '/campaigns/new' });
    const two = deriveJourney({ hasBusiness: true, campaignCount: 2, hasFinishedCampaign: true });
    expect(two.allDone).toBe(true);
    expect(two.next).toBeNull();
  });

  it('the dashboard guide states reviewing is free, marks the current step, and hides when done', () => {
    const { rerender, container } = render(
      <FirstCampaignGuide
        facts={{ hasBusiness: true, campaignCount: 0, hasFinishedCampaign: false }}
      />
    );
    expect(screen.getByText(/credits are used only when you press generate/i)).toBeInTheDocument();
    const current = screen
      .getByText(/create your first campaign/i, { selector: 'p' })
      .closest('li')!;
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('link', { name: /create your first campaign/i })).toHaveAttribute(
      'href',
      '/campaigns/new'
    );
    rerender(
      <FirstCampaignGuide
        facts={{ hasBusiness: true, campaignCount: 2, hasFinishedCampaign: true }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('after a campaign is created', () => {
  it('summarises only what the campaign really contains', () => {
    expect(summariseAssets([])).toBe('');
    expect(summariseAssets([{ type: 'poster' }])).toBe('1 poster');
    expect(
      summariseAssets([
        { type: 'poster' },
        { type: 'poster' },
        { type: 'caption' },
        { type: 'whatsapp' },
      ])
    ).toBe('2 posters, 1 caption and 1 WhatsApp message');
  });

  it('suggests next ideas that carry no invented numbers and exclude the one just used', () => {
    const ideas = nextCampaignIdeas('restaurant', 'weekend_offer');
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.map((i) => i.objective)).not.toContain('weekend_offer');
    for (const i of ideas) expect(i.headline).not.toMatch(/\d|₹|%/);
  });

  it('explains what was made, how to use it, that Mitra does not post, and the remaining credits', () => {
    render(
      <CampaignNextSteps
        assets={[{ type: 'poster' }, { type: 'caption' }]}
        category="restaurant"
        objective="weekend_offer"
        creditsRemaining={40}
      />
    );
    const panel = screen.getByTestId('campaign-next-steps');
    expect(panel).toHaveTextContent('Mitra created 1 poster and 1 caption');
    expect(panel).toHaveTextContent(/download the images and copy the captions/i);
    expect(panel).toHaveTextContent(/does not post or schedule for you yet/i);
    expect(screen.getByTestId('credits-left')).toHaveTextContent(
      'You have 40 credits left. A full campaign uses 100.'
    );
    expect(screen.getByRole('link', { name: /create another campaign/i })).toHaveAttribute(
      'href',
      '/campaigns/new'
    );
    expect(panel.textContent).not.toMatch(/upgrade|buy|plan/i); // no sales push on the value moment
  });

  it('says so honestly when the balance cannot be read', () => {
    render(<CampaignNextSteps assets={[]} creditsRemaining={null} />);
    expect(screen.getByTestId('credits-left')).toHaveTextContent(/balance is on the billing page/i);
  });
});

describe('what Mitra understood', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { describeUnderstanding } = require('./understanding');

  it('is built only from what the owner entered and can be corrected before any credits are used', () => {
    const text = describeUnderstanding({
      businessName: 'Spice Garden',
      offerHeadline: 'Weekend Special',
      localities: ['Kondapur', 'Gachibowli'],
      languageLabel: 'Hinglish',
      ctaLabel: 'Order on WhatsApp',
    });
    expect(text).toBe(
      'You want to promote “Weekend Special” for Spice Garden, for people in Kondapur, Gachibowli, written in Hinglish, with the action “Order on WhatsApp”. If anything is wrong, press Back and change it.'
    );
  });

  it('degrades gracefully when parts are missing', () => {
    expect(describeUnderstanding({ businessName: 'Spice Garden' })).toMatch(
      /promote “your offer” for Spice Garden./
    );
  });
});
