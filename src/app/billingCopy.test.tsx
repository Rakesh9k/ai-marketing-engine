/**
 * Customer-facing billing copy must match what is actually implemented (D1–D6 decisions,
 * 2026-10-02). Regression guards for claims that were false and have been corrected:
 *  - plan changes / upgrades "anytime" or "with one click" (in-place plan change is NOT built)
 *  - credits "rolling over" (plan credits are per calendar month; pack credits don't roll over)
 *  - "GST Invoices" (invoicing behaviour for Indian customers is unverified)
 *  - outdated credit-cost examples (must come from the credit config, not hard-coded)
 *  - /cancellation being a redirect to the refund page instead of a real page
 */
import * as fs from 'fs';
import { getActiveCatalogue } from '../../functions/src/config/planCatalogue';
import * as path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CAMPAIGN_GENERATION_COST, CREDIT_COSTS } from '@/lib/config/pricing';
import CancellationPage from './cancellation/page';
import HelpPage from './help/page';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

const CUSTOMER_COPY_FILES = [
  'src/app/pricing/PricingPageClient.tsx',
  'src/app/help/page.tsx',
  'src/app/support/page.tsx',
  'src/features/billing/components/CreditPackCards.tsx',
  'src/app/cancellation/page.tsx',
];

describe('customer-facing billing copy', () => {
  it.each([
    [
      /change (your )?plans?[^.]{0,40}(anytime|any time|one click)/i,
      'promises to change plans anytime',
    ],
    [/upgrade[^.]{0,40}(anytime|any time|one click|immediately)/i, 'promises upgrades'],
    [/yes, absolutely/i, 'the old "Yes, absolutely!" plan-change answer'],
    [/gst invoices?/i, 'a GST invoice claim'],
    [/roll over every/i, 'credits rolling over every cycle'],
    [
      /(?<!not )\bcredits (will )?roll over (to|into) the next/i,
      'credits rolling over into the next period',
    ],
    [/consumes? 1 credit|consumes? 2 credits|15-20 credits/i, 'the outdated credit-cost examples'],
    [/billed through payu|via payu|through razorpay/i, 'billing through PayU/Razorpay'],
  ])('no customer-facing page contains %s (%s)', (pattern) => {
    for (const file of CUSTOMER_COPY_FILES) {
      expect({ file, hit: pattern.test(read(file)) }).toEqual({ file, hit: false });
    }
  });

  it('credit costs shown to customers come from the credit config and match the backend', () => {
    expect(CAMPAIGN_GENERATION_COST).toBe(
      CREDIT_COSTS.BASE_CAMPAIGN + 2 * CREDIT_COSTS.IMAGE_GENERATION
    );
    // The backend's prices live in the plan catalogue (functions/src/config/planCatalogue.ts); read the real values
    // rather than scraping source text.
    const ops = getActiveCatalogue().operationCredits;
    expect(CREDIT_COSTS.BASE_CAMPAIGN).toBe(ops.campaign_generation - 2 * ops.image_generation);
    expect(CREDIT_COSTS.IMAGE_GENERATION).toBe(ops.image_generation);
    expect(CREDIT_COSTS.REEL_GENERATION).toBe(ops.reel_generation);
    expect(CREDIT_COSTS.REGENERATION).toBe(ops.regeneration);
    expect(CREDIT_COSTS.IMAGE_GENERATION).toBe(20);
    expect(CREDIT_COSTS.REEL_GENERATION).toBe(80);
    expect(CAMPAIGN_GENERATION_COST).toBe(100);
  });
});

describe('Help page', () => {
  it('shows the real credit costs and the real credit-expiry policy', async () => {
    render(<HelpPage />);

    await userEvent.click(screen.getByText(/how are credits consumed for different generations/i));
    expect(await screen.findByText(/poster image costs 20 credits/i)).toBeInTheDocument();
    expect(screen.getByText(/reel costs 80 credits/i)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`campaign costs ${CAMPAIGN_GENERATION_COST} credits`, 'i'))
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText(/what happens when i run out of credits/i));
    // Plan credits belong to the PAID PERIOD (30 days, or each monthly allocation of a yearly plan), not the calendar.
    const answer = await screen.findByText(/do not roll over into the next one/i);
    expect(answer).toBeInTheDocument();
    expect(answer.textContent).toMatch(/30-day plan's credits last for its 30 days/i);
    expect(answer.textContent).toMatch(
      /at the start of each monthly period of the year \(not all at once\)/i
    );
    expect(answer.textContent).toMatch(/free starter credits.*do not expire/i);
    expect(answer.textContent).not.toMatch(/valid only through the current calendar month/i);
    expect(screen.queryByText(/roll over every billing cycle/i)).not.toBeInTheDocument();
  });

  it('says plans are prepaid fixed terms that never renew automatically, with a Renew action and no trial', async () => {
    render(<HelpPage />);
    await userEvent.click(screen.getByText(/renew automatically, and how do i renew/i));
    expect(await screen.findByText(/no free trial/i)).toBeInTheDocument();
    expect(screen.getByText(/never renew automatically/i)).toBeInTheDocument();
    expect(
      screen.getByText(/30 days for monthly plans, 365 days for yearly plans/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/has a Renew button/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/renew automatically at the end of each billing period/i)
    ).not.toBeInTheDocument();
  });
});

describe('/cancellation', () => {
  it('is a real Plan Expiry Policy page describing the implemented prepaid behaviour', () => {
    const { container } = render(<CancellationPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /plan expiry policy/i })
    ).toBeInTheDocument();
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/paid Mitra plans are prepaid for a fixed term/i);
    expect(text).toMatch(/nothing renews by itself/i);
    expect(text).toMatch(/at the end of that term, your account moves to the Free plan/i);
    expect(text).toMatch(/buying the same plan and term again/i);
    expect(text).toMatch(/different plan or term can be purchased after your current access ends/i);
  });

  it('is no longer a re-export of the refund page', () => {
    const source = read('src/app/cancellation/page.tsx');
    expect(source).not.toMatch(/refund-policy|RefundPolicyPage/);
    expect(source).toMatch(/export default function CancellationPage/);
  });
});
