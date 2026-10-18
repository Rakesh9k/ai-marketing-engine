/**
 * THE plan catalogue: the one place that says what Mitra sells, for how much, for how long, how many credits each
 * purchase carries, what each plan may do, and what each credit-consuming operation costs.
 *
 * Rules this file exists to enforce
 *  - Versioned and IMMUTABLE. A version is never edited after it has sold anything: add a new version instead.
 *    Every order and every paid subscription records the version it was bought under (services/orderSnapshot.ts), so
 *    a later catalogue never changes what an existing customer bought.
 *  - Exactly one version is ACTIVE for NEW purchases (ACTIVE_CATALOGUE_VERSION). Changing it is a code change that
 *    goes through review and the validation below, not a console toggle.
 *  - A DRAFT version can be written, tested and discussed but can never be activated, and it may only describe
 *    mechanisms the runtime really supports (RUNTIME_SUPPORT). This is how an unapproved or unbuilt commercial
 *    model is prevented from going live by accident.
 *  - Nothing here is read from the browser. The browser may display a mirror (src/lib/config/pricing.ts), which
 *    is checked against this file by tests; the server never trusts it.
 *
 * Version 1 = the catalogue that was live before this file existed. Its numbers are the legacy `PRICING` values
 * (config/pricing.ts now derives them from here). Version 2 = the Phase 1 proposal, a DRAFT awaiting product-owner
 * approval (docs/engineering/PHASE_1_PRICING_ECONOMICS_REPORT.md).
 */

export type PlanId = 'free' | 'starter' | 'business' | 'pro' | 'agency';
export type BillingTerm = 'monthly' | 'yearly';
export type CatalogueStatus = 'active' | 'draft' | 'retired';
export type OperationType =
  | 'campaign_generation'
  | 'regeneration'
  | 'image_generation'
  | 'reel_generation'
  | 'style_analysis'
  | 'calendar_planning';

/** Server-enforced capabilities. A plan either has one or it does not. */
export type FeatureKey =
  | 'watermark'
  | 'brandKit'
  | 'multiBusiness'
  | 'premiumTemplates'
  | 'agencyWorkspace'
  | 'priorityProcessing'
  | 'reels';

export interface PlanLimits {
  campaignsPerMonth: number;
  reelsPerMonth: number;
  creativesPerMonth: number;
  storiesPerMonth: number;
}

export interface PlanDef {
  planId: PlanId;
  name: string;
  /** Strictly increasing; used only for "at least this plan" comparisons. */
  rank: number;
  /** False = existing customers keep it, but no new purchase of it is possible. */
  sellable: boolean;
  maxBusinesses: number;
  limits: PlanLimits;
  features: Record<FeatureKey, boolean>;
}

export interface OfferDef {
  offerId: string;
  planId: Exclude<PlanId, 'free'>;
  cycle: BillingTerm;
  priceINR: number;
  currency: 'INR';
  /** Prepaid access length in days, from payment confirmation. Never renews automatically. */
  termDays: number;
  /** Plan credits made available in EACH allocation period. */
  creditsPerPeriod: number;
  /** Number of allocation periods in the term (yearly = 12 monthly allocations; credits are never granted up front). */
  periods: number;
}

export interface CreditPackDef {
  packId: string;
  credits: number;
  priceINR: number;
}

/**
 * What a user on Free receives.
 *  - 'monthly_free': a fresh allowance each calendar month (the original behaviour).
 *  - 'one_time': a single welcome grant, per verified identity, claimed once through the server
 *    (services/welcomeGrant.ts). It does NOT expire unless `expiresAfterDays` is set, and an expiring grant needs
 *    credit lots (see RUNTIME_SUPPORT). There is no trial period and no recurring free allowance.
 */
export interface FreeGrantDef {
  mode: 'monthly_free' | 'one_time';
  /** monthly_free: the monthly allowance. one_time: the size of the single welcome grant. */
  credits: number;
  /** one_time only. Absent = the welcome credits last until they are used. */
  expiresAfterDays?: number;
  /**
   * one_time only: accounts that existed BEFORE this catalogue became active keep the monthly allowance they were
   * promised (they are never silently reduced). New accounts do not get it.
   */
  legacyMonthlyCredits?: number;
}

/** Runtime mechanisms a catalogue may rely on. A catalogue that needs one that is not built cannot be activated. */
export type RuntimeCapability = 'creditLots' | 'oneTimeWelcomeGrant' | 'anniversaryAllocation';

export interface Catalogue {
  version: number;
  label: string;
  status: CatalogueStatus;
  /** ISO date this version became/becomes the one used for new purchases (informational for drafts). */
  effectiveFrom: string;
  plans: Record<PlanId, PlanDef>;
  offers: OfferDef[];
  creditPacks: CreditPackDef[];
  operationCredits: Record<OperationType, number>;
  free: FreeGrantDef;
  requiresRuntime: RuntimeCapability[];
  notes: string[];
}

/** What the running code can actually do. Flip a flag only when the mechanism is built AND tested. */
export const RUNTIME_SUPPORT: Record<RuntimeCapability, boolean> = {
  creditLots: false,
  oneTimeWelcomeGrant: true, // services/welcomeGrant.ts: idempotent, server-controlled, non-expiring
  anniversaryAllocation: false,
};

const ALL_PLAN_IDS: readonly PlanId[] = ['free', 'starter', 'business', 'pro', 'agency'];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

const noFeatures: Record<FeatureKey, boolean> = {
  watermark: false,
  brandKit: false,
  multiBusiness: false,
  premiumTemplates: false,
  agencyWorkspace: false,
  priorityProcessing: false,
  reels: false,
};

// ---------------------------------------------------------------------------------------------------------------
// Version 1: the legacy catalogue. These numbers MUST equal what was sold before this file existed; tests pin them.
// ---------------------------------------------------------------------------------------------------------------
const V1: Catalogue = {
  version: 1,
  label: '2026-10 legacy',
  status: 'active',
  effectiveFrom: '2026-01-01',
  plans: {
    free: {
      planId: 'free',
      name: 'Free',
      rank: 0,
      sellable: false,
      maxBusinesses: 1,
      limits: { campaignsPerMonth: 1, reelsPerMonth: 0, creativesPerMonth: 5, storiesPerMonth: 3 },
      features: { ...noFeatures, watermark: true },
    },
    starter: {
      planId: 'starter',
      name: 'Starter',
      rank: 1,
      sellable: true,
      maxBusinesses: 1,
      limits: { campaignsPerMonth: 5, reelsPerMonth: 3, creativesPerMonth: 15, storiesPerMonth: 9 },
      // `reels` is false although the sold tier lists 3 reels: generateReel has always required the Business plan.
      // The mismatch is recorded in `notes`; resolving it is a product decision (Phase 2, question 2).
      features: { ...noFeatures },
    },
    business: {
      planId: 'business',
      name: 'Business',
      rank: 2,
      sellable: true,
      maxBusinesses: 1,
      limits: {
        campaignsPerMonth: 12,
        reelsPerMonth: 10,
        creativesPerMonth: 30,
        storiesPerMonth: 30,
      },
      features: { ...noFeatures, brandKit: true, premiumTemplates: true, reels: true },
    },
    pro: {
      planId: 'pro',
      name: 'Pro',
      rank: 3,
      sellable: true,
      maxBusinesses: 3,
      limits: {
        campaignsPerMonth: 25,
        reelsPerMonth: 20,
        creativesPerMonth: 60,
        storiesPerMonth: 60,
      },
      features: {
        ...noFeatures,
        brandKit: true,
        multiBusiness: true,
        premiumTemplates: true,
        priorityProcessing: true,
        reels: true,
      },
    },
    agency: {
      planId: 'agency',
      name: 'Agency',
      rank: 4,
      sellable: true,
      maxBusinesses: 10,
      limits: {
        campaignsPerMonth: 50,
        reelsPerMonth: 40,
        creativesPerMonth: 120,
        storiesPerMonth: 120,
      },
      features: {
        ...noFeatures,
        brandKit: true,
        multiBusiness: true,
        premiumTemplates: true,
        agencyWorkspace: true,
        priorityProcessing: true,
        reels: true,
      },
    },
  },
  offers: [
    {
      offerId: 'starter_monthly',
      planId: 'starter',
      cycle: 'monthly',
      priceINR: 999,
      currency: 'INR',
      termDays: 30,
      creditsPerPeriod: 500,
      periods: 1,
    },
    {
      offerId: 'starter_yearly',
      planId: 'starter',
      cycle: 'yearly',
      priceINR: 9990,
      currency: 'INR',
      termDays: 365,
      creditsPerPeriod: 500,
      periods: 12,
    },
    {
      offerId: 'business_monthly',
      planId: 'business',
      cycle: 'monthly',
      priceINR: 1699,
      currency: 'INR',
      termDays: 30,
      creditsPerPeriod: 1200,
      periods: 1,
    },
    {
      offerId: 'business_yearly',
      planId: 'business',
      cycle: 'yearly',
      priceINR: 16990,
      currency: 'INR',
      termDays: 365,
      creditsPerPeriod: 1200,
      periods: 12,
    },
    {
      offerId: 'pro_monthly',
      planId: 'pro',
      cycle: 'monthly',
      priceINR: 2999,
      currency: 'INR',
      termDays: 30,
      creditsPerPeriod: 2500,
      periods: 1,
    },
    {
      offerId: 'pro_yearly',
      planId: 'pro',
      cycle: 'yearly',
      priceINR: 24990,
      currency: 'INR',
      termDays: 365,
      creditsPerPeriod: 2500,
      periods: 12,
    },
    {
      offerId: 'agency_monthly',
      planId: 'agency',
      cycle: 'monthly',
      priceINR: 4999,
      currency: 'INR',
      termDays: 30,
      creditsPerPeriod: 6000,
      periods: 1,
    },
    {
      offerId: 'agency_yearly',
      planId: 'agency',
      cycle: 'yearly',
      priceINR: 49990,
      currency: 'INR',
      termDays: 365,
      creditsPerPeriod: 6000,
      periods: 12,
    },
  ],
  creditPacks: [
    { packId: 'pack_500', credits: 500, priceINR: 499 },
    { packId: 'pack_1200', credits: 1200, priceINR: 999 },
    { packId: 'pack_3000', credits: 3000, priceINR: 1999 },
  ],
  operationCredits: {
    campaign_generation: 100,
    regeneration: 10,
    image_generation: 20,
    reel_generation: 80,
    style_analysis: 15,
    calendar_planning: 10,
  },
  free: { mode: 'monthly_free', credits: 140 },
  requiresRuntime: [],
  notes: [
    'Reproduces the catalogue live before versioning existed.',
    'Starter lists 3 reels/month but features.reels is false: generateReel requires the Business plan (Phase 0 D2).',
    'Yearly offers grant creditsPerPeriod in each calendar-month usage period; B4 (calendar month vs 30-day term) is unchanged.',
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Version 2: Phase 1 proposal. DRAFT: not approved, not activatable (needs credit lots + a one-time welcome grant).
// ---------------------------------------------------------------------------------------------------------------
const V2: Catalogue = {
  version: 2,
  label: '2026-10 proposal (Phase 1, unapproved)',
  status: 'draft',
  effectiveFrom: '2026-11-01',
  plans: {
    free: {
      ...V1.plans.free,
      limits: { campaignsPerMonth: 1, reelsPerMonth: 0, creativesPerMonth: 5, storiesPerMonth: 3 },
    },
    starter: {
      ...V1.plans.starter,
      limits: { campaignsPerMonth: 5, reelsPerMonth: 0, creativesPerMonth: 15, storiesPerMonth: 9 },
      features: { ...noFeatures },
    },
    // Existing Business and Agency customers keep what they bought; they are simply no longer sold.
    business: { ...V1.plans.business, sellable: false },
    pro: {
      ...V1.plans.pro,
      limits: {
        campaignsPerMonth: 20,
        reelsPerMonth: 20,
        creativesPerMonth: 60,
        storiesPerMonth: 60,
      },
    },
    agency: { ...V1.plans.agency, sellable: false },
  },
  offers: [
    {
      offerId: 'starter_monthly',
      planId: 'starter',
      cycle: 'monthly',
      priceINR: 1499,
      currency: 'INR',
      termDays: 30,
      creditsPerPeriod: 500,
      periods: 1,
    },
    {
      offerId: 'pro_monthly',
      planId: 'pro',
      cycle: 'monthly',
      priceINR: 2999,
      currency: 'INR',
      termDays: 30,
      creditsPerPeriod: 2000,
      periods: 1,
    },
    {
      offerId: 'pro_yearly',
      planId: 'pro',
      cycle: 'yearly',
      priceINR: 24990,
      currency: 'INR',
      termDays: 365,
      creditsPerPeriod: 2000,
      periods: 12,
    },
  ],
  // Top-ups: Phase 1 found the current packs cheaper per credit than every plan; redesign or removal is an owner
  // decision, so none are offered in this draft.
  creditPacks: [],
  operationCredits: {
    campaign_generation: 100,
    regeneration: 30,
    image_generation: 20,
    reel_generation: 80,
    style_analysis: 15,
    calendar_planning: 10,
  },
  free: { mode: 'one_time', credits: 140, expiresAfterDays: 30, legacyMonthlyCredits: 140 },
  requiresRuntime: ['creditLots', 'oneTimeWelcomeGrant'],
  notes: [
    'Phase 1 hypotheses, NOT approved. Do not activate before the product owner approves and the lot ledger exists.',
    'Starter reels are off pending the Phase 2 decision (honour the "3 reels" copy or remove it).',
    'Pro Annual grants 2,000 credits in each of 12 monthly allocations (24,000 total), never 24,000 up front.',
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Version 3: v1's plans, prices and costs unchanged, with ONE-TIME welcome credits instead of a monthly free
// allowance, and no trial. Active from this version on; accounts created earlier keep their monthly allowance.
// ---------------------------------------------------------------------------------------------------------------
const V3: Catalogue = {
  ...V1,
  version: 3,
  label: '2026-10 one-time welcome credits',
  status: 'active',
  effectiveFrom: '2026-10-13',
  free: { mode: 'one_time', credits: 140, legacyMonthlyCredits: 140 },
  requiresRuntime: ['oneTimeWelcomeGrant'],
  notes: [
    'Identical to version 1 for every plan, price, pack and operation cost.',
    'Free: 140 welcome credits ONCE per verified identity, after email verification and business setup; they do not expire and there is no trial.',
    'Accounts created before this version keep their monthly 140 (legacyMonthlyCredits): nothing is taken away.',
  ],
};

/** Every version ever defined, oldest first. A version is never removed or edited once it has sold anything. */
const CATALOGUES: readonly Catalogue[] = deepFreeze([V1, V2, V3]);

/** The version used for NEW purchases and for Free users. A code change, reviewed and tested, flips this. */
export const ACTIVE_CATALOGUE_VERSION = 3;

export class CatalogueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogueError';
  }
}

export function getCatalogue(version: number): Catalogue | undefined {
  return CATALOGUES.find((c) => c.version === version);
}

export function listCatalogues(): readonly Catalogue[] {
  return CATALOGUES;
}

export function getActiveCatalogue(): Catalogue {
  const c = getCatalogue(ACTIVE_CATALOGUE_VERSION);
  if (!c || c.status !== 'active') {
    throw new CatalogueError(
      `Active catalogue version ${ACTIVE_CATALOGUE_VERSION} is not an active catalogue`
    );
  }
  return c;
}

/** The plan as defined in a given version (falls back to the legacy version for an unknown version number). */
export function getPlanDef(planId: string, version?: number): PlanDef | undefined {
  const c = (version !== undefined ? getCatalogue(version) : undefined) ?? getCatalogue(1)!;
  return (c.plans as Record<string, PlanDef | undefined>)[planId];
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (ALL_PLAN_IDS as readonly string[]).includes(value);
}

/** The offer for (plan, cycle) in a catalogue, only if it is sellable. Unknown plan or cycle returns undefined. */
export function findOffer(
  catalogue: Catalogue,
  planId: unknown,
  cycle: unknown
): OfferDef | undefined {
  if (!isPlanId(planId) || (cycle !== 'monthly' && cycle !== 'yearly')) return undefined;
  const plan = catalogue.plans[planId];
  if (!plan?.sellable) return undefined;
  return catalogue.offers.find((o) => o.planId === planId && o.cycle === cycle);
}

export function findCreditPack(catalogue: Catalogue, credits: unknown): CreditPackDef | undefined {
  return catalogue.creditPacks.find((p) => p.credits === credits);
}

/** Credits per allocation period for a plan under a version (Free = the free grant). */
export function getCreditsPerPeriod(planId: string, version?: number): number {
  const c = (version !== undefined ? getCatalogue(version) : undefined) ?? getCatalogue(1)!;
  if (planId === 'free') return c.free.mode === 'one_time' ? 0 : c.free.credits;
  const offers = c.offers.filter((o) => o.planId === planId);
  return offers[0]?.creditsPerPeriod ?? c.free.credits;
}

/** The recurring monthly Free allowance for an account on the given policy (0 for the one-time model). */
export type FreeCreditsPolicy = 'one_time' | 'legacy_monthly';
export function getRecurringFreeCredits(catalogue: Catalogue, policy: FreeCreditsPolicy): number {
  if (policy === 'one_time') return 0;
  return catalogue.free.mode === 'monthly_free'
    ? catalogue.free.credits
    : (catalogue.free.legacyMonthlyCredits ?? 0);
}

/** Validates a catalogue's internal consistency. Returns a list of problems (empty = valid). */
export function validateCatalogue(c: Catalogue, opts: { forActivation?: boolean } = {}): string[] {
  const errors: string[] = [];
  const isPosInt = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0;

  if (!isPosInt(c.version)) errors.push('version must be a positive integer');

  const ranks = new Set<number>();
  for (const id of ALL_PLAN_IDS) {
    const p = c.plans[id];
    if (!p) {
      errors.push(`plan "${id}" is missing`);
      continue;
    }
    if (p.planId !== id) errors.push(`plan "${id}" has mismatching planId "${p.planId}"`);
    if (ranks.has(p.rank)) errors.push(`plan "${id}" has a duplicate rank ${p.rank}`);
    ranks.add(p.rank);
    if (!isPosInt(p.maxBusinesses))
      errors.push(`plan "${id}" maxBusinesses must be a positive integer`);
    for (const [k, v] of Object.entries(p.limits)) {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0)
        errors.push(`plan "${id}" limit ${k} must be a non-negative integer`);
    }
  }
  if (c.plans.free && (c.plans.free.rank !== 0 || c.plans.free.sellable))
    errors.push('free must have rank 0 and cannot be sold');

  const offerIds = new Set<string>();
  const planCycle = new Set<string>();
  for (const o of c.offers) {
    if (offerIds.has(o.offerId)) errors.push(`duplicate offerId "${o.offerId}"`);
    offerIds.add(o.offerId);
    if (!isPlanId(o.planId) || (o.planId as string) === 'free') {
      errors.push(
        `offer "${o.offerId}" references unknown or unsellable plan "${String(o.planId)}"`
      );
      continue;
    }
    if (!c.plans[o.planId]?.sellable)
      errors.push(
        `offer "${o.offerId}" is for plan "${o.planId}", which is not sellable in this version`
      );
    const key = `${o.planId}:${o.cycle}`;
    if (planCycle.has(key)) errors.push(`more than one offer for ${key}`);
    planCycle.add(key);
    if (o.currency !== 'INR') errors.push(`offer "${o.offerId}" currency must be INR`);
    if (!isPosInt(o.priceINR))
      errors.push(`offer "${o.offerId}" priceINR must be a positive integer`);
    if (!isPosInt(o.creditsPerPeriod))
      errors.push(`offer "${o.offerId}" creditsPerPeriod must be a positive integer`);
    const expectedDays = o.cycle === 'monthly' ? 30 : o.cycle === 'yearly' ? 365 : -1;
    if (o.termDays !== expectedDays)
      errors.push(`offer "${o.offerId}" termDays must be ${expectedDays} for a ${o.cycle} term`);
    const expectedPeriods = o.cycle === 'monthly' ? 1 : o.cycle === 'yearly' ? 12 : -1;
    if (o.periods !== expectedPeriods)
      errors.push(`offer "${o.offerId}" periods must be ${expectedPeriods} for a ${o.cycle} term`);
  }

  const packIds = new Set<string>();
  const packCredits = new Set<number>();
  for (const p of c.creditPacks) {
    if (packIds.has(p.packId)) errors.push(`duplicate packId "${p.packId}"`);
    packIds.add(p.packId);
    if (packCredits.has(p.credits)) errors.push(`duplicate pack size ${p.credits}`);
    packCredits.add(p.credits);
    if (!isPosInt(p.credits) || !isPosInt(p.priceINR))
      errors.push(`pack "${p.packId}" credits and priceINR must be positive integers`);
  }

  for (const [op, credits] of Object.entries(c.operationCredits)) {
    if (!isPosInt(credits)) errors.push(`operation ${op} credits must be a positive integer`);
  }
  if (!isPosInt(c.free.credits)) errors.push('free.credits must be a positive integer');
  if (c.free.mode === 'one_time') {
    if (c.free.expiresAfterDays !== undefined && !isPosInt(c.free.expiresAfterDays))
      errors.push('expiresAfterDays, when set, must be a positive integer');
    if (!isPosInt(c.free.legacyMonthlyCredits))
      errors.push(
        'a one_time free grant needs legacyMonthlyCredits for accounts that already existed'
      );
  }

  if (opts.forActivation) {
    if (c.status !== 'active')
      errors.push(`status is "${c.status}", only an active catalogue can be activated`);
    for (const need of c.requiresRuntime) {
      if (!RUNTIME_SUPPORT[need])
        errors.push(`needs runtime capability "${need}", which is not built`);
    }
    if (c.free.mode === 'one_time' && !RUNTIME_SUPPORT.oneTimeWelcomeGrant)
      errors.push('uses a one_time welcome grant, which the runtime does not support yet');
    if (
      c.free.mode === 'one_time' &&
      c.free.expiresAfterDays !== undefined &&
      !RUNTIME_SUPPORT.creditLots
    )
      errors.push('an expiring welcome grant needs creditLots, which is not built');
  }
  return errors;
}

/** Credits an operation costs under a catalogue (throws for an unknown operation). */
export function getOperationCredits(
  op: string,
  catalogue: Catalogue = getActiveCatalogue()
): number {
  const credits = (catalogue.operationCredits as Record<string, number | undefined>)[op];
  if (credits === undefined) throw new CatalogueError(`Unknown operation type: ${op}`);
  return credits;
}
