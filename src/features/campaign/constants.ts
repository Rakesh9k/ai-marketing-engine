import type {
  BusinessCategory,
  CampaignObjective,
  OfferType,
  CTAType,
  LanguageCode,
  RegionalStyle,
  CampaignStyle,
} from '@/types';

/**
 * No /docs directory exists in this repo (no MVP_SCOPE.md etc. to check against),
 * so these lists are derived from two sources:
 *  1. The actual backend Zod enums in
 *     functions/src/functions/campaigns/generateCampaignStrategy.ts (authoritative
 *     upper bound — the wizard must never send a value outside these).
 *  2. The MVP scope described for this task (Hyderabad restaurants/cloud kitchens;
 *     English/Telugu/Telugu+English; Hyderabadi regional style) which further
 *     restricts what's exposed in the UI for language and regional style, since a
 *     backend enum being technically valid doesn't mean it belongs in this MVP.
 * See docs/PHASE_4_CAMPAIGN_CREATION_REPORT.md for the full discrepancy notes.
 */

export const OBJECTIVES: ReadonlyArray<{
  value: CampaignObjective;
  label: string;
  description: string;
}> = [
  {
    value: 'weekend_offer',
    label: 'Weekend Offer',
    description: 'Promote a special offer for the weekend.',
  },
  {
    value: 'new_dish',
    label: 'New Dish',
    description: 'Get attention for a new item on your menu.',
  },
  {
    value: 'festival',
    label: 'Festival',
    description: 'Create marketing around a festival or occasion.',
  },
  { value: 'discount', label: 'Discount', description: 'Promote a specific discount.' },
  {
    value: 'brand_awareness',
    label: 'Brand Awareness',
    description: 'Get more people familiar with your restaurant.',
  },
  {
    value: 'service_promotion',
    label: 'Service Promotion',
    description: 'Promote a specific service you offer.',
  },
  {
    value: 'package_promotion',
    label: 'Package Promotion',
    description: 'Promote a bundled service package.',
  },
  {
    value: 'appointment_promotion',
    label: 'Book Appointments',
    description: 'Encourage customers to book an appointment.',
  },
  {
    value: 'new_service',
    label: 'New Service',
    description: 'Get attention for a new service you now offer.',
  },
  {
    value: 'property_promotion',
    label: 'Property Promotion',
    description: 'Promote a specific property or listing.',
  },
  {
    value: 'new_listing',
    label: 'New Listing',
    description: 'Get attention for a newly listed property.',
  },
  {
    value: 'open_house',
    label: 'Open House',
    description: 'Invite people to visit a property in person.',
  },
  {
    value: 'project_promotion',
    label: 'Project Promotion',
    description: 'Promote an entire project or development.',
  },
];

/**
 * Phase 30 — which of the objectives/CTAs/offer types above are actually
 * appropriate for a given business vertical. Mirrors
 * functions/src/config/verticals.ts's VerticalConfig.allowedObjectives/
 * allowedCTAs/allowedOfferTypes (the backend re-validates against that same
 * config server-side — this only controls what the wizard *shows*, it is
 * not itself the source of truth). Restaurant's list intentionally matches
 * the original OBJECTIVES/CTA_OPTIONS/OFFER_TYPES order exactly, so
 * restaurant behavior is unchanged.
 */
export const VERTICAL_OBJECTIVES: Record<BusinessCategory, CampaignObjective[]> = {
  restaurant: ['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness'],
  salon: ['service_promotion', 'package_promotion', 'appointment_promotion', 'new_service'],
  real_estate: ['property_promotion', 'new_listing', 'open_house', 'project_promotion'],
};

export const OFFER_TYPES: ReadonlyArray<{ value: OfferType; label: string }> = [
  { value: 'percentage', label: 'Percentage discount' },
  { value: 'fixed', label: 'Fixed amount off' },
  { value: 'bogo', label: 'Buy One Get One' },
  { value: 'combo', label: 'Combo deal' },
  { value: 'free_delivery', label: 'Free delivery' },
  { value: 'loyalty', label: 'Loyalty reward' },
];

export const CTA_OPTIONS: ReadonlyArray<{ value: CTAType; label: string; description: string }> = [
  {
    value: 'order_whatsapp',
    label: 'Order on WhatsApp',
    description: 'Customers will be directed to WhatsApp to order.',
  },
  {
    value: 'book_table',
    label: 'Book a Table',
    description: 'Customers will be prompted to reserve a table.',
  },
  {
    value: 'view_menu',
    label: 'View Menu',
    description: 'Customers will be directed to view your menu.',
  },
  {
    value: 'call_now',
    label: 'Call Now',
    description: 'Customers will be prompted to call your business directly.',
  },
  {
    value: 'get_directions',
    label: 'Get Directions',
    description: 'Customers will be directed to your location.',
  },
  {
    value: 'book_appointment',
    label: 'Book Appointment',
    description: 'Customers will be prompted to book an appointment.',
  },
];

/** See VERTICAL_OBJECTIVES above — same mirroring rationale. */
export const VERTICAL_CTAS: Record<BusinessCategory, CTAType[]> = {
  restaurant: ['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions'],
  salon: ['book_appointment', 'call_now', 'get_directions'],
  real_estate: ['call_now', 'get_directions'],
};

/** See VERTICAL_OBJECTIVES above — same mirroring rationale. */
export const VERTICAL_OFFER_TYPES: Record<BusinessCategory, OfferType[]> = {
  restaurant: ['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty'],
  salon: ['percentage', 'fixed', 'combo', 'loyalty'],
  real_estate: ['fixed', 'percentage'],
};

// Restricted to MVP scope (English / Telugu / Telugu+English). Backend also accepts
// 'hi' and 'hi_en' but those are out of scope for the Hyderabad restaurant MVP.
export const LANGUAGES: ReadonlyArray<{ value: LanguageCode; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'Telugu' },
  { value: 'te_en', label: 'Telugu + English' },
];

// Restricted to MVP scope (Hyderabad, Telangana). Backend also accepts mumbai/
// bangalore/delhi/chennai/kolkata but those are out of scope for this MVP.
export const REGIONAL_STYLES: ReadonlyArray<{ value: RegionalStyle; label: string }> = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'hyderabadi', label: 'Hyderabadi' },
];

export const CAMPAIGN_STYLES: ReadonlyArray<{
  value: CampaignStyle;
  label: string;
  description: string;
}> = [
  { value: 'funny', label: 'Funny', description: 'Light, playful and attention-grabbing.' },
  {
    value: 'quirky',
    label: 'Quirky',
    description: 'Unusual and memorable, with a bit of personality.',
  },
  { value: 'emotional', label: 'Emotional', description: 'Connects through feeling and warmth.' },
  { value: 'urgent', label: 'Urgent', description: 'Creates a stronger reason to act now.' },
  { value: 'fomo', label: 'FOMO', description: 'Highlights what customers might miss.' },
  {
    value: 'storytelling',
    label: 'Storytelling',
    description: 'Builds a small story around the food or occasion.',
  },
  { value: 'educational', label: 'Educational', description: 'Informs customers while promoting.' },
  { value: 'sarcastic', label: 'Sarcastic', description: 'Witty and dry humor.' },
  { value: 'youthful', label: 'Youthful', description: 'Fresh, energetic, and trend-aware.' },
  {
    value: 'dark_comedy',
    label: 'Dark Comedy',
    description: 'Bold, edgy humor with a darker twist.',
  },
];

export const OCCASIONS: ReadonlyArray<{
  value: 'weekend' | 'festival' | 'weekday_lunch' | 'family';
  label: string;
}> = [
  { value: 'weekend', label: 'Weekend' },
  { value: 'festival', label: 'Festival' },
  { value: 'weekday_lunch', label: 'Weekday Lunch' },
  { value: 'family', label: 'Family' },
];

export const TOTAL_STEPS = 8;

/**
 * Mirrors functions/src/config/pricing.ts PRICING.campaignBaseCredits (100) +
 * 2 * PRICING.imageGenerationCredits (20) = 140, which is exactly what
 * getGenerationCost('campaign_generation') in functions/src/services/usageControl.ts
 * returns and what executeWithUsageControl actually reserves server-side.
 * The backend is authoritative for the real reservation regardless of this value —
 * this constant only drives the UI's upfront estimate, so keep it in sync manually
 * if PRICING changes (no shared package/endpoint exposes it to the frontend today;
 * see the Known Limitations section of the Phase 4 report).
 */
export const ESTIMATED_CAMPAIGN_GENERATION_CREDITS = 140;
