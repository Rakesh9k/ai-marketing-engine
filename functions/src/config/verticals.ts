import type { BusinessCategory, CampaignObjective, CTAType, OfferType } from '../types';

/**
 * Phase 29 (foundation) / Phase 30 (salon) / Phase 31 (real_estate) — all
 * three verticals are now fully implemented.
 *
 * This is the ONE place vertical-specific differences live. Everything else
 * — the AI pipeline, Truth Check, credits, analytics, campaign persistence —
 * stays a single shared implementation that reads from a VerticalConfig
 * instead of branching on `business.category` (or worse, hard-coding one
 * vertical's wording) inline. See docs/PHASE_29_MULTI_VERTICAL_FOUNDATION_REPORT.md
 * for the audit this replaces: a dead, never-called `promptRegistry.ts` used
 * to carry parallel vertical-aware prompt templates while the real pipeline
 * ran hard-coded restaurant-only strings. That file has been removed —
 * this module is its replacement, actually wired into the live path.
 *
 * `implemented: false` is load-bearing, not documentation. `assertVerticalImplemented`
 * (called from generateCampaignStrategy before any credit reservation) uses
 * it to refuse generation for a vertical whose prompts/Truth Check rules
 * haven't actually been built yet, rather than silently producing
 * restaurant-shaped content for that vertical. Flipping a vertical to
 * `implemented: true` is the go-live switch for that vertical — do it only
 * once its prompt context and Truth Check keyword table are genuinely
 * filled in, not just present. All three current BusinessCategory values
 * are `true` as of Phase 31 — a future new vertical should be added here
 * with `implemented: false` first, exactly as salon and real_estate
 * originally were.
 */

export interface VerticalTerminology {
  /** What a single sellable thing is called, e.g. "dish", "service", "listing". */
  itemNoun: string;
  itemNounPlural: string;
}

export interface VerticalPromptContext {
  /** Stage 1 (business understanding) — the `verticalContext` field description. */
  businessUnderstandingVerticalContext: string;
  /** Stage 2 (product understanding) persona opening line. */
  productAnalystPersona: string;
  /** Vision analysis (image understanding) persona opening line. */
  imageAnalystPersona: string;
  /** Stage 4 (campaign strategy) persona opening line. */
  campaignStrategistPersona: string;
  /** Stage 6 (copy generation) system-rules opening sentence(s). */
  copywriterSystemRules: string;
  /** Stage 7 (creative direction) system-rules opening sentence. */
  creativeDirectorSystemRules: string;
}

export interface TruthCheckClaimKeyword {
  keyword: string;
  category: string;
  factCategory: string;
}

export interface VerticalConfig {
  id: BusinessCategory;
  label: string;
  /**
   * Whether campaign generation may actually run for this vertical.
   * All three current verticals are `true` as of Phase 31.
   */
  implemented: boolean;
  allowedObjectives: CampaignObjective[];
  allowedCTAs: CTAType[];
  allowedOfferTypes: OfferType[];
  requiredBusinessFields: string[];
  optionalBusinessFields: string[];
  terminology: VerticalTerminology;
  promptContext: VerticalPromptContext;
  /**
   * Deterministic Truth Check's "unsupported operational claim" keyword
   * table (see truthCheck.ts's checkUnsupportedClaims) — e.g. a restaurant
   * campaign claiming "free delivery" must be backed by a business fact.
   * Intentionally empty for unimplemented verticals: an empty table is
   * honest (no claims are being checked yet), whereas guessing at a salon
   * or real-estate claim dictionary here would be exactly the kind of
   * partial, unverified vertical work Phase 29 defers.
   */
  truthCheckClaimKeywords: TruthCheckClaimKeyword[];
}

const RESTAURANT_CONFIG: VerticalConfig = {
  id: 'restaurant',
  label: 'Restaurant',
  implemented: true,
  allowedObjectives: ['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness'],
  allowedCTAs: ['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions'],
  allowedOfferTypes: ['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty'],
  requiredBusinessFields: ['name', 'location', 'contact.whatsapp'],
  optionalBusinessFields: ['description', 'businessBrain.businessRules.operatingMode'],
  terminology: { itemNoun: 'dish', itemNounPlural: 'dishes' },
  promptContext: {
    // Every string below is copied verbatim from the previously hard-coded
    // literals in pipeline.ts / vision.ts / truthCheck.ts — moved, not
    // reworded, so restaurant output is byte-for-byte unchanged (see the
    // regression tests in verticals.test.ts).
    businessUnderstandingVerticalContext:
      'Restaurant-specific context (menu structure, service modes, time-parts, occasions, offer types)',
    productAnalystPersona: 'a product analyst for restaurant marketing',
    imageAnalystPersona:
      'You are an expert food/product analyst for Indian restaurant marketing campaigns. Analyze the provided product images and return a detailed structured analysis.',
    campaignStrategistPersona:
      'You are a senior marketing strategist for Indian local restaurants. Create a campaign strategy that drives WhatsApp orders.',
    copywriterSystemRules:
      'You are a Hyderabadi marketing copywriter. Generate a complete campaign pack for a Hyderabad restaurant. Use the localization strategy to write NATURAL Telugu-English-Hinglish copy. Every piece must drive WhatsApp action. Preserve ALL business facts exactly.',
    creativeDirectorSystemRules:
      'You are a creative director for Instagram food marketing. Generate detailed, actionable image prompts for AI image generation. Each prompt must produce Instagram-ready vertical images (4:5 for posts, 9:16 for Stories/Reels). Include brand colors, logo placement, and offer text overlays.',
  },
  // Copied verbatim from truthCheck.ts's previously-inline `claimChecks` array.
  truthCheckClaimKeywords: [
    { keyword: 'free delivery', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'free home delivery', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'delivery available', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'home delivery', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'dine in', category: 'dine-in', factCategory: 'dine-in' },
    { keyword: 'dine-in', category: 'dine-in', factCategory: 'dine-in' },
    { keyword: 'takeaway', category: 'takeaway', factCategory: 'takeaway' },
    { keyword: 'take away', category: 'takeaway', factCategory: 'takeaway' },
    { keyword: 'open 24', category: 'hours', factCategory: 'hours' },
    { keyword: '24/7', category: 'hours', factCategory: 'hours' },
    { keyword: '24x7', category: 'hours', factCategory: 'hours' },
    { keyword: 'always open', category: 'hours', factCategory: 'hours' },
    { keyword: 'parking', category: 'parking', factCategory: 'parking' },
    { keyword: 'parking available', category: 'parking', factCategory: 'parking' },
    { keyword: 'valet', category: 'parking', factCategory: 'parking' },
    { keyword: 'wifi', category: 'wifi', factCategory: 'wifi' },
    { keyword: 'free wifi', category: 'wifi', factCategory: 'wifi' },
    { keyword: 'air conditioned', category: 'ac', factCategory: 'ac' },
    { keyword: 'outdoor seating', category: 'seating', factCategory: 'seating' },
    { keyword: 'indoor seating', category: 'seating', factCategory: 'seating' },
    { keyword: 'private dining', category: 'private', factCategory: 'private' },
    { keyword: 'catering', category: 'catering', factCategory: 'catering' },
    { keyword: 'party', category: 'events', factCategory: 'events' },
    { keyword: 'event', category: 'events', factCategory: 'events' },
  ],
};

const SALON_CONFIG: VerticalConfig = {
  id: 'salon',
  label: 'Salon',
  // Phase 30: fully implemented. Prompt context, Truth Check keywords, and
  // the wizard's objective/CTA lists (src/features/campaign/constants.ts)
  // were all filled in together — see docs/PHASE_30_SALON_MODE_REPORT.md.
  implemented: true,
  allowedObjectives: [
    'service_promotion',
    'package_promotion',
    'appointment_promotion',
    'new_service',
  ],
  allowedCTAs: ['book_appointment', 'call_now', 'get_directions'],
  allowedOfferTypes: ['percentage', 'fixed', 'combo', 'loyalty'],
  requiredBusinessFields: ['name', 'location', 'contact.whatsapp'],
  optionalBusinessFields: [
    'description',
    'businessBrain.verticalProfile.services',
    'businessBrain.verticalProfile.packages',
    'businessBrain.verticalProfile.appointmentSettings',
  ],
  terminology: { itemNoun: 'service', itemNounPlural: 'services' },
  promptContext: {
    businessUnderstandingVerticalContext:
      'Salon-specific context (service menu, packages, appointment workflow, beauty terminology)',
    productAnalystPersona: 'a product analyst for salon marketing',
    imageAnalystPersona:
      'You are an expert beauty/product analyst for salon marketing campaigns. Analyze the provided service images and return a detailed structured analysis.',
    campaignStrategistPersona:
      'You are a senior marketing strategist for local salons. Create a campaign strategy that drives service bookings.',
    copywriterSystemRules:
      'You are a marketing copywriter for a local salon. Generate a complete campaign pack that drives appointment bookings. Preserve ALL business facts exactly.',
    creativeDirectorSystemRules:
      'You are a creative director for salon/beauty marketing. Generate detailed, actionable image prompts for AI image generation.',
  },
  // Phase 30: unlike restaurant's table (moved verbatim from prior
  // hard-coded logic), these are new — modeled the same way, on the same
  // "unsupported unless backed by a business fact" mechanism in
  // checkUnsupportedClaims. Each covers a real Truth Check requirement from
  // the phase brief: appointment claims, package claims, and common
  // beauty-service overclaims.
  truthCheckClaimKeywords: [
    { keyword: 'walk-in', category: 'appointment', factCategory: 'appointment' },
    { keyword: 'walk in', category: 'appointment', factCategory: 'appointment' },
    { keyword: 'appointment only', category: 'appointment', factCategory: 'appointment' },
    { keyword: 'home service', category: 'appointment', factCategory: 'appointment' },
    { keyword: 'doorstep service', category: 'appointment', factCategory: 'appointment' },
    { keyword: 'free consultation', category: 'service', factCategory: 'service' },
    { keyword: 'free trial', category: 'service', factCategory: 'service' },
    { keyword: 'package deal', category: 'package', factCategory: 'package' },
    { keyword: 'combo package', category: 'package', factCategory: 'package' },
    { keyword: 'membership', category: 'package', factCategory: 'package' },
  ],
};

const REAL_ESTATE_CONFIG: VerticalConfig = {
  id: 'real_estate',
  label: 'Real Estate',
  // Phase 31: fully implemented. Prompt context (unchanged from Phase 29 —
  // it was already correctly written, just unused while implemented:false)
  // plus real Truth Check keywords and a dedicated property-fact check
  // (checkPropertyFactClaims in truthCheck.ts) — see
  // docs/PHASE_31_REAL_ESTATE_MODE_REPORT.md.
  implemented: true,
  allowedObjectives: ['property_promotion', 'new_listing', 'open_house', 'project_promotion'],
  allowedCTAs: ['call_now', 'get_directions'],
  allowedOfferTypes: ['fixed', 'percentage'],
  requiredBusinessFields: ['name', 'location', 'contact.whatsapp'],
  optionalBusinessFields: ['description', 'businessBrain.verticalProfile.properties'],
  terminology: { itemNoun: 'listing', itemNounPlural: 'listings' },
  promptContext: {
    businessUnderstandingVerticalContext:
      'Real-estate-specific context (property type, listing status, amenities, possession terms)',
    productAnalystPersona: 'a property analyst for real estate marketing',
    imageAnalystPersona:
      'You are an expert real estate visual analyst. Analyze the provided property images and return a detailed structured analysis.',
    campaignStrategistPersona:
      'You are a senior marketing strategist for local real estate. Create a campaign strategy that drives site-visit inquiries.',
    copywriterSystemRules:
      'You are a marketing copywriter for a local real estate business. Generate a complete campaign pack that drives inquiries. Preserve ALL business facts exactly. Clearly separate factual property details (area, bedrooms, price, possession status) from marketing language and opinion — never state an unverified fact as though it were confirmed.',
    creativeDirectorSystemRules:
      'You are a creative director for real estate marketing. Generate detailed, actionable image prompts for AI image generation.',
  },
  // Phase 31: modeled on the same "unsupported unless backed by a business
  // fact" mechanism as restaurant/salon. Covers financial/legal claims that
  // must never be invented for a property listing.
  truthCheckClaimKeywords: [
    { keyword: 'rera approved', category: 'legal', factCategory: 'legal' },
    { keyword: 'rera registered', category: 'legal', factCategory: 'legal' },
    { keyword: 'freehold', category: 'legal', factCategory: 'legal' },
    { keyword: 'leasehold', category: 'legal', factCategory: 'legal' },
    { keyword: 'gated community', category: 'amenity', factCategory: 'amenity' },
    { keyword: 'clear title', category: 'legal', factCategory: 'legal' },
    { keyword: 'bank loan approved', category: 'financial', factCategory: 'financial' },
    { keyword: 'home loan available', category: 'financial', factCategory: 'financial' },
    { keyword: 'vastu compliant', category: 'property', factCategory: 'property' },
    { keyword: 'corner plot', category: 'property', factCategory: 'property' },
  ],
};

export const VERTICAL_CONFIGS: Record<BusinessCategory, VerticalConfig> = {
  restaurant: RESTAURANT_CONFIG,
  salon: SALON_CONFIG,
  real_estate: REAL_ESTATE_CONFIG,
};

/**
 * Thrown by assertVerticalImplemented. Deliberately a plain Error with no
 * dependency on utils/errors.ts (AppError) or firebase-functions: this
 * module is imported by pipeline.ts/truthCheck.ts/vision.ts, which are
 * imported across the frontend/backend boundary by tests/truthCheck.test.ts
 * (a frontend-side test reaching into functions/src directly) — pulling in
 * firebase-functions there transitively drags in firebase-admin's App Check
 * stack (jose, an ESM-only package), which breaks under the frontend's CJS
 * Jest config. generateCampaignStrategy.ts (backend-only) maps this to an
 * HttpsError itself — see utils/errors.ts's mapErrorToHttpsError.
 */
export class UnsupportedVerticalError extends Error {
  readonly code = 'unsupported-vertical';
  readonly status = 400;
  constructor(public readonly vertical: string) {
    super(`The "${vertical}" vertical is not yet supported for campaign generation.`);
    this.name = 'UnsupportedVerticalError';
  }
}

/**
 * Returns the config for a known vertical. Falls back to the restaurant
 * config for anything unrecognized (an old/legacy Firestore document with
 * a missing or malformed `category`) rather than throwing — this is the
 * backward-compatibility guarantee Phase 29 requires: existing restaurant
 * documents (the only kind that predate this phase) must keep loading and
 * behaving exactly as before, and previously the only behavior for an
 * unrecognized category was to fall through to the restaurant branch of
 * whatever ad hoc ternary existed, which this preserves.
 */
export function getVerticalConfigOrDefault(category: string | undefined | null): VerticalConfig {
  if (category && Object.prototype.hasOwnProperty.call(VERTICAL_CONFIGS, category)) {
    return VERTICAL_CONFIGS[category as BusinessCategory];
  }
  return RESTAURANT_CONFIG;
}

/** Strict lookup for a known BusinessCategory — throws on an unknown value instead of defaulting. */
export function getVerticalConfig(category: BusinessCategory): VerticalConfig {
  const config = VERTICAL_CONFIGS[category];
  if (!config) {
    throw new Error(`Unknown business vertical: ${category}`);
  }
  return config;
}

export function isVerticalImplemented(category: BusinessCategory): boolean {
  return VERTICAL_CONFIGS[category]?.implemented === true;
}

/**
 * The generation-time gate. Call this after the business doc is fetched and
 * BEFORE any credit reservation — see generateCampaignStrategy.ts, which
 * fetches the business and calls this ahead of executeWithUsageControl
 * specifically so an unsupported vertical never reserves (or risks
 * charging) credits for a generation that was always going to be refused.
 */
export function assertVerticalImplemented(category: BusinessCategory): void {
  if (!isVerticalImplemented(category)) {
    throw new UnsupportedVerticalError(category);
  }
}
