import {
  getActiveCatalogue,
  type BillingTerm,
  type Catalogue,
  type OfferDef,
  type OperationType,
  type PlanDef,
  type PlanId,
} from '@/lib/config/planCatalogue.generated';

/**
 * Everything the pricing page shows about plans, prices, terms and credits is computed here from the
 * server-approved catalogue (a generated copy of functions/src/config/planCatalogue.ts). Nothing is typed by hand,
 * so the page cannot drift from what checkout will charge. The server still re-derives every order itself.
 */

export type PaidPlanId = Exclude<PlanId, 'free'>;
export const PAID_PLAN_ORDER: readonly PaidPlanId[] = ['starter', 'business', 'pro', 'agency'];

export const formatINR = (amount: number): string => `₹${amount.toLocaleString('en-IN')}`;

export const formatPercent = (value: number): string => `${Math.round(value * 10) / 10}%`;

export const OPERATION_LABELS: Record<OperationType, string> = {
  campaign_generation: 'Create a campaign (posts, captions, stories and ideas)',
  regeneration: 'Regenerate one item',
  image_generation: 'Generate one image',
  reel_generation: 'Generate one reel',
  style_analysis: 'Analyse your brand style from your own content',
  calendar_planning: 'Plan a content calendar',
};

export interface TermView {
  cycle: BillingTerm;
  offerId: string;
  priceINR: number;
  termDays: number;
  periods: number;
  creditsPerPeriod: number;
  /** Credits over the whole term, released one period at a time (never all at once). */
  totalCredits: number;
}

export interface AnnualComparison {
  /** What twelve separate 30-day purchases at the current monthly price cost. */
  twelveMonthlyINR: number;
  yearlyINR: number;
  savingINR: number;
  /** 0..100, one decimal. */
  savingPercent: number;
  /** Twelve 30-day purchases cover 360 days; the yearly term is 365. Disclosed next to the saving. */
  monthlyCoverageDays: number;
  yearlyDays: number;
}

export interface PlanView {
  planId: PaidPlanId;
  name: string;
  maxBusinesses: number;
  brandKit: boolean;
  reels: boolean;
  creditsPerPeriod: number;
  monthly: TermView;
  yearly: TermView;
  annual: AnnualComparison;
}

function termView(offer: OfferDef): TermView {
  return {
    cycle: offer.cycle,
    offerId: offer.offerId,
    priceINR: offer.priceINR,
    termDays: offer.termDays,
    periods: offer.periods,
    creditsPerPeriod: offer.creditsPerPeriod,
    totalCredits: offer.creditsPerPeriod * offer.periods,
  };
}

/** Annual price against twelve monthly purchases at the actual current monthly price. */
export function computeAnnualComparison(monthly: OfferDef, yearly: OfferDef): AnnualComparison {
  const twelveMonthlyINR = monthly.priceINR * 12;
  const savingINR = twelveMonthlyINR - yearly.priceINR;
  const savingPercent =
    twelveMonthlyINR > 0 ? Math.round((savingINR / twelveMonthlyINR) * 1000) / 10 : 0;
  return {
    twelveMonthlyINR,
    yearlyINR: yearly.priceINR,
    savingINR,
    savingPercent,
    monthlyCoverageDays: monthly.termDays * 12,
    yearlyDays: yearly.termDays,
  };
}

export function buildPlanViews(catalogue: Catalogue = getActiveCatalogue()): PlanView[] {
  const views: PlanView[] = [];
  for (const planId of PAID_PLAN_ORDER) {
    const def: PlanDef = catalogue.plans[planId];
    if (!def.sellable) continue;
    const monthly = catalogue.offers.find((o) => o.planId === planId && o.cycle === 'monthly');
    const yearly = catalogue.offers.find((o) => o.planId === planId && o.cycle === 'yearly');
    if (!monthly || !yearly) continue;
    views.push({
      planId,
      name: def.name,
      maxBusinesses: def.maxBusinesses,
      brandKit: def.features.brandKit,
      reels: def.features.reels,
      creditsPerPeriod: monthly.creditsPerPeriod,
      monthly: termView(monthly),
      yearly: termView(yearly),
      annual: computeAnnualComparison(monthly, yearly),
    });
  }
  return views;
}

export interface FreeView {
  welcomeCredits: number;
  /** Welcome credits last until used. False would mean they expire. */
  neverExpire: boolean;
  maxBusinesses: number;
  brandKit: boolean;
  reels: boolean;
}

export function buildFreeView(catalogue: Catalogue = getActiveCatalogue()): FreeView {
  return {
    welcomeCredits: catalogue.free.credits,
    neverExpire: catalogue.free.expiresAfterDays === undefined,
    maxBusinesses: catalogue.plans.free.maxBusinesses,
    brandKit: catalogue.plans.free.features.brandKit,
    reels: catalogue.plans.free.features.reels,
  };
}

export interface OperationCostRow {
  operation: OperationType;
  label: string;
  credits: number;
}

export function buildOperationCosts(
  catalogue: Catalogue = getActiveCatalogue()
): OperationCostRow[] {
  return (Object.keys(OPERATION_LABELS) as OperationType[]).map((operation) => ({
    operation,
    label: OPERATION_LABELS[operation],
    credits: catalogue.operationCredits[operation],
  }));
}

/** One sentence on how a term's credits arrive. Used on the card, the comparison and the checkout summary. */
export function describeAllocation(term: TermView): string {
  const n = term.creditsPerPeriod.toLocaleString('en-IN');
  if (term.periods === 1) return `${n} credits for your ${term.termDays} days`;
  const total = term.totalCredits.toLocaleString('en-IN');
  return `${n} credits at the start of each of ${term.periods} monthly periods (${total} in total, never all at once)`;
}

export interface CreditExample {
  id: string;
  title: string;
  lines: { label: string; count: number; credits: number }[];
  totalCredits: number;
}

/**
 * Illustrative mixes priced from the catalogue's operation costs. They are examples of how credits are spent,
 * not promises of an outcome: no plan is ever described as "includes N campaigns".
 */
export function buildCreditExamples(catalogue: Catalogue = getActiveCatalogue()): CreditExample[] {
  const c = catalogue.operationCredits;
  const mix = (id: string, title: string, parts: [string, number, number][]): CreditExample => {
    const lines = parts.map(([label, count, each]) => ({ label, count, credits: count * each }));
    return { id, title, lines, totalCredits: lines.reduce((sum, l) => sum + l.credits, 0) };
  };
  return [
    mix('one-campaign', 'One campaign, kept as generated', [
      ['campaign', 1, c.campaign_generation],
    ]),
    mix('campaign-and-edits', 'One campaign, three regenerations and two images', [
      ['campaign', 1, c.campaign_generation],
      ['regenerations', 3, c.regeneration],
      ['images', 2, c.image_generation],
    ]),
    mix('with-reel', 'One campaign and one reel (plans that include reels)', [
      ['campaign', 1, c.campaign_generation],
      ['reel', 1, c.reel_generation],
    ]),
  ];
}

export interface PlanFitInput {
  campaignsPerMonth: number;
  businesses: number;
  needsReels: boolean;
}

export type PlanFit =
  | { kind: 'plan'; view: PlanView; campaignCredits: number; leftoverCredits: number }
  | { kind: 'beyond'; reason: 'credits' | 'businesses'; largest: PlanView };

/**
 * The smallest plan whose per-period credits cover the campaigns asked for, whose business limit fits, and which
 * includes reels when they are wanted. Only campaign creation is counted; the leftover is what remains for
 * regenerations and images.
 */
export function suggestPlan(
  input: PlanFitInput,
  catalogue: Catalogue = getActiveCatalogue()
): PlanFit | null {
  const views = buildPlanViews(catalogue);
  if (!views.length) return null;
  const campaigns = Math.max(0, Math.floor(input.campaignsPerMonth));
  const businesses = Math.max(1, Math.floor(input.businesses));
  const needed = campaigns * catalogue.operationCredits.campaign_generation;
  const largest = views[views.length - 1]!;
  const fitsBusinesses = views.filter((v) => v.maxBusinesses >= businesses);
  if (!fitsBusinesses.length) return { kind: 'beyond', reason: 'businesses', largest };
  const eligible = fitsBusinesses.filter((v) => !input.needsReels || v.reels);
  const match = eligible.find((v) => v.creditsPerPeriod >= needed);
  if (!match) return { kind: 'beyond', reason: 'credits', largest };
  return {
    kind: 'plan',
    view: match,
    campaignCredits: needed,
    leftoverCredits: match.creditsPerPeriod - needed,
  };
}

/** Everything the confirmation dialog states before the customer is sent to pay. */
export interface CheckoutSummary {
  planId: PaidPlanId;
  planName: string;
  cycle: BillingTerm;
  priceINR: number;
  termDays: number;
  allocation: string;
  totalCredits: number;
  periods: number;
  creditsPerPeriod: number;
}

export function buildCheckoutSummary(
  planId: string,
  cycle: BillingTerm,
  catalogue: Catalogue = getActiveCatalogue()
): CheckoutSummary | null {
  const view = buildPlanViews(catalogue).find((v) => v.planId === planId);
  if (!view) return null;
  const term = cycle === 'yearly' ? view.yearly : view.monthly;
  return {
    planId: view.planId,
    planName: view.name,
    cycle,
    priceINR: term.priceINR,
    termDays: term.termDays,
    allocation: describeAllocation(term),
    totalCredits: term.totalCredits,
    periods: term.periods,
    creditsPerPeriod: term.creditsPerPeriod,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Estimated last day of access if payment is confirmed at `from`. Exact 24-hour days, as the server counts. */
export const estimateAccessEnd = (termDays: number, from: Date = new Date()): Date =>
  new Date(from.getTime() + termDays * DAY_MS);
