import type { Business, LanguageCode, SlangIntensity } from '@/types';
import type { CampaignWizardState } from './types';
import { secondaryLanguageFor } from './localizationDefaults';

export function toIsoDateTime(yyyyMmDd: string, endOfDay = false): string {
  return endOfDay ? `${yyyyMmDd}T23:59:59.000Z` : `${yyyyMmDd}T00:00:00.000Z`;
}

/**
 * Pure mapping from wizard state -> the exact payload shape accepted by the
 * generateCampaignStrategySchema Zod schema in
 * functions/src/functions/campaigns/generateCampaignStrategy.ts. Kept as a
 * standalone function (rather than inline in the component) so it can be
 * unit-tested against the real backend schema without rendering React.
 *
 * Returns null when required fields are missing — callers must not submit in
 * that case.
 */
export function buildCampaignInput(
  business: Business,
  state: CampaignWizardState,
  idempotencyKey: string
) {
  if (!business || !state.selectedProductId || !state.offer.type || !state.cta) return null;
  if (!state.objective || !state.primaryLanguage || !state.regionalStyle || !state.campaignStyle)
    return null;

  const bb = business.businessBrain;
  const price = Number(state.offer.price);

  // Offer validity is the owner's statement about the OFFER, never derived from the campaign dates unless the owner
  // said "the whole campaign". Unknown stays absent.
  const validity = state.offer.validity;
  const offerValidity =
    validity?.mode === 'whole_campaign'
      ? {
          validityStart: toIsoDateTime(state.duration.start),
          validityEnd: toIsoDateTime(state.duration.end, true),
          validitySource: 'whole_campaign' as const,
        }
      : validity?.mode === 'custom' && validity.start && validity.end
        ? {
            validityStart: toIsoDateTime(validity.start),
            validityEnd: toIsoDateTime(validity.end, true),
            validitySource: 'owner_dates' as const,
          }
        : {};
  const originalPrice = state.offer.originalPrice ? Number(state.offer.originalPrice) : undefined;
  const primaryLanguage = state.primaryLanguage;
  const secondaryLanguage: LanguageCode = secondaryLanguageFor(primaryLanguage);
  const localityForContext =
    state.audience.localities[0] || business.location.locality || business.location.city;

  return {
    businessId: business.businessId,
    templateId: state.templateId || undefined,
    styleId: state.styleId || undefined,
    // Left undefined: a hardcoded 'conversion' here used to make
    // buildCreativeTemplateContext throw for any template whose objectives
    // don't include 'conversion' (festival, new-launch, etc — 10 of 30
    // templates), failing generation before the pipeline even starts. The
    // server derives the right creativeObjective from the selected
    // template and campaign objective instead (see generateCampaignStrategy.ts).
    objective: state.objective,
    productId: state.selectedProductId,
    offer: {
      headline: state.offer.headline.trim(),
      description: state.offer.description.trim() || undefined,
      price,
      originalPrice,
      type: state.offer.type,
      ...offerValidity,
      terms: state.offer.terms.trim() || undefined,
    },
    duration: {
      start: toIsoDateTime(state.duration.start),
      end: toIsoDateTime(state.duration.end, true),
    },
    audience: {
      localities: state.audience.localities,
      ageRange: { min: Number(state.audience.ageMin), max: Number(state.audience.ageMax) },
      occasion: state.audience.occasion || undefined,
    },
    cta: state.cta,
    localization: {
      country: 'India',
      state: business.location.state,
      city: business.location.city,
      locality: localityForContext,
      primaryLanguage,
      secondaryLanguage,
      languageMixing: primaryLanguage.includes('_') ? ('natural' as const) : ('minimal' as const),
      regionalStyle: state.regionalStyle,
      slangPreference: (bb?.localization?.slangIntensity as SlangIntensity) || 'light',
      audienceDescription:
        bb?.audience?.targetCustomer || `Local customers in ${localityForContext}`,
      brandTone: bb?.brand?.tone || 'friendly',
      campaignStyle: state.campaignStyle,
      contentFormat: 'poster' as const,
    },
    idempotencyKey,
  };
}
