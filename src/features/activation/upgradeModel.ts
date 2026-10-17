import { getActiveCatalogue, type Catalogue } from '@/lib/config/planCatalogue.generated';
import { buildPlanViews, formatINR, type PlanView } from '@/features/pricing/pricingModel';

/**
 * An upgrade prompt is shown ONLY at a genuine limit: the owner tried to do something the current plan or credit
 * balance cannot complete. It says what they tried, why it cannot be done, what the relevant paid option adds, the
 * price and access term, and that renewal is manual. Everything is read from the plan catalogue, never typed here.
 */
export type UpgradeContext =
  | { kind: 'not_enough_credits'; action: string; needed: number; available: number }
  | { kind: 'plan_feature'; feature: 'reels' | 'brand_kit' }
  | { kind: 'more_businesses'; needed: number };

export interface UpgradeOption {
  id: string;
  kind: 'plan' | 'pack';
  title: string;
  price: string;
  term: string;
  adds: string;
}

export interface UpgradePromptModel {
  /** What the owner was trying to do. */
  tried: string;
  /** Why the current plan or balance cannot complete it. */
  why: string;
  options: UpgradeOption[];
  /** Always shown: every purchase is one-time. */
  renewal: string;
  /** Where to buy. Pricing is the page that shows everything and confirms the exact payment. */
  href: string;
}

export const MANUAL_RENEWAL_NOTE =
  'One-time payment for a fixed term. It does not renew automatically; you choose whether to buy again.';

function planOption(plan: PlanView, adds: string): UpgradeOption {
  return {
    id: `plan:${plan.planId}`,
    kind: 'plan',
    title: `${plan.name} for 30 days`,
    price: formatINR(plan.monthly.priceINR),
    term: '30 days from payment, paid once',
    adds,
  };
}

export function buildUpgradePrompt(
  context: UpgradeContext,
  catalogue: Catalogue = getActiveCatalogue()
): UpgradePromptModel {
  const plans = buildPlanViews(catalogue);
  const base = { renewal: MANUAL_RENEWAL_NOTE, href: '/pricing' };

  if (context.kind === 'not_enough_credits') {
    const shortfall = Math.max(0, context.needed - context.available);
    const options: UpgradeOption[] = [];
    const plan = plans.find((p) => p.creditsPerPeriod >= context.needed);
    if (plan) {
      options.push(
        planOption(
          plan,
          `${plan.creditsPerPeriod.toLocaleString('en-IN')} credits for your 30 days`
        )
      );
    }
    const pack = [...catalogue.creditPacks]
      .sort((a, b) => a.credits - b.credits)
      .find((p) => p.credits >= shortfall);
    if (pack) {
      options.push({
        id: `pack:${pack.credits}`,
        kind: 'pack',
        title: `${pack.credits.toLocaleString('en-IN')} credit top-up`,
        price: formatINR(pack.priceINR),
        term: 'one-time, valid for the calendar month you buy it in',
        adds: `${pack.credits.toLocaleString('en-IN')} more credits, alongside whatever you have`,
      });
    }
    return {
      ...base,
      tried: `You were about to ${context.action}.`,
      why: `That uses ${context.needed.toLocaleString('en-IN')} credits and you have ${context.available.toLocaleString('en-IN')}, so you are ${shortfall.toLocaleString('en-IN')} short. Nothing was charged.`,
      options,
    };
  }

  if (context.kind === 'plan_feature') {
    const plan = plans.find((p) => (context.feature === 'reels' ? p.reels : p.brandKit));
    const label = context.feature === 'reels' ? 'create a reel' : 'use your brand kit';
    return {
      ...base,
      tried: `You wanted to ${label}.`,
      why: `${context.feature === 'reels' ? 'Reels' : 'The brand kit'} ${plan ? `start with the ${plan.name} plan` : 'are not part of your current plan'}; your current plan does not include ${context.feature === 'reels' ? 'them' : 'it'}.`,
      options: plan
        ? [
            planOption(
              plan,
              context.feature === 'reels'
                ? 'Reels, with their credits'
                : 'Your brand kit on every campaign'
            ),
          ]
        : [],
    };
  }

  const plan = plans.find((p) => p.maxBusinesses >= context.needed);
  return {
    ...base,
    tried: 'You wanted to add another business.',
    why: `Your current plan covers fewer than ${context.needed} businesses.`,
    options: plan ? [planOption(plan, `Up to ${plan.maxBusinesses} business profiles`)] : [],
  };
}
