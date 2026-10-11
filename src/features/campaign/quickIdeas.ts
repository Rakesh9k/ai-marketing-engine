import type {
  BusinessCategory,
  CampaignObjective,
  CTAType,
  LanguageCode,
  RegionalStyle,
} from '@/types';
import type { CampaignWizardState } from './types';

/**
 * Quick ideas for the campaign wizard.
 *
 * An idea is a starting point, not a fact. It suggests an objective, an action and a headline, and nothing
 * else: price, discount, offer type, dates, description and product stay the owner's to enter. The earlier
 * presets filled all of those in with invented values ("Lunch Special 15% OFF", prices, "Free delivery within
 * 3km", the first product), so one click produced a campaign whose facts the owner never gave.
 *
 * Ideas are specific to the kind of business, and every objective and action is one that business can use
 * (see VERTICAL_OBJECTIVES / VERTICAL_CTAS in constants.ts).
 */
export interface QuickIdea {
  id: string;
  label: string;
  objective: CampaignObjective;
  /** A suggested headline the owner can edit. Never contains a number, price or discount. */
  headline: string;
  cta: CTAType;
}

const IDEAS: Record<BusinessCategory, QuickIdea[]> = {
  restaurant: [
    {
      id: 'restaurant-weekend',
      label: '🍛 Weekend special',
      objective: 'weekend_offer',
      headline: 'Weekend Special',
      cta: 'order_whatsapp',
    },
    {
      id: 'restaurant-new-dish',
      label: '🍽️ New dish',
      objective: 'new_dish',
      headline: 'New on Our Menu',
      cta: 'order_whatsapp',
    },
    {
      id: 'restaurant-festive',
      label: '🎉 Festive special',
      objective: 'festival',
      headline: 'Festive Special',
      cta: 'order_whatsapp',
    },
  ],
  salon: [
    {
      id: 'salon-new-service',
      label: '✨ New service',
      objective: 'new_service',
      headline: 'Now Available',
      cta: 'book_appointment',
    },
    {
      id: 'salon-appointment',
      label: '📅 Book an appointment',
      objective: 'appointment_promotion',
      headline: 'Book Your Appointment',
      cta: 'book_appointment',
    },
    {
      id: 'salon-package',
      label: '💄 Package spotlight',
      objective: 'package_promotion',
      headline: 'Package Spotlight',
      cta: 'book_appointment',
    },
  ],
  real_estate: [
    {
      id: 'real-estate-new-listing',
      label: '🏠 New listing',
      objective: 'new_listing',
      headline: 'New Listing',
      cta: 'call_now',
    },
    {
      id: 'real-estate-open-house',
      label: '🔑 Open house',
      objective: 'open_house',
      headline: 'Open House',
      cta: 'call_now',
    },
    {
      id: 'real-estate-featured',
      label: '🏢 Featured property',
      objective: 'property_promotion',
      headline: 'Featured Property',
      cta: 'call_now',
    },
  ],
  general: [
    {
      id: 'general-new-product',
      label: '🛍️ New product',
      objective: 'new_product',
      headline: 'New Arrival',
      cta: 'order_whatsapp',
    },
    {
      id: 'general-service',
      label: '🛎️ Service spotlight',
      objective: 'service_promotion',
      headline: 'Our Services',
      cta: 'call_now',
    },
    {
      id: 'general-festive',
      label: '🎉 Festive special',
      objective: 'festival',
      headline: 'Festive Special',
      cta: 'order_whatsapp',
    },
  ],
};

/** The ideas for a kind of business; an unknown or missing category is a general business. */
export function quickIdeasFor(category?: BusinessCategory | null): QuickIdea[] {
  return IDEAS[category ?? 'general'] ?? IDEAS.general;
}

/**
 * Starts a campaign from an idea. Sets the objective, the action (unless the owner already chose one) and a
 * headline suggestion (unless they already wrote one), fills the language and style only where the owner has
 * not chosen, and moves to choosing the product. It creates no price, discount, offer type, description,
 * dates, product or photo, and never overwrites anything the owner entered.
 */
export function applyQuickIdea(
  prev: CampaignWizardState,
  idea: QuickIdea,
  locale: { primaryLanguage: LanguageCode; regionalStyle: RegionalStyle }
): CampaignWizardState {
  return {
    ...prev,
    type: 'post',
    objective: idea.objective,
    cta: prev.cta ?? idea.cta,
    primaryLanguage: prev.primaryLanguage ?? locale.primaryLanguage,
    regionalStyle: prev.regionalStyle ?? locale.regionalStyle,
    offer: { ...prev.offer, headline: prev.offer.headline || idea.headline },
    step: 4,
  };
}
