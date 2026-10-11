import {
  validateOffer,
  validateAgainstCatalog,
  type FieldErrors,
} from '@/lib/validation/offerValidation';
import { toIsoDateTime } from './buildCampaignInput';
import type { CampaignWizardState } from './types';

/**
 * Field-level errors for the wizard's "Offer" step, keyed like the callable's request
 * ("offer.price", "offer.originalPrice", "offer.validityStart", "offer.validityEnd", "duration.start",
 * "duration.end"). The rules are the SERVER'S (lib/validation/offerValidation.ts is a synced copy of the
 * backend validator, pinned by tests/offerValidationParity.test.ts); this only adds the wizard's own
 * "required" checks. The callable revalidates at submission regardless of what this returns.
 *
 * It validates the same ISO values buildCampaignInput will send, so the UI cannot pass something the server
 * would reject because of how a date was converted.
 */
export function computeOfferFieldErrors(
  state: CampaignWizardState,
  catalogPrice?: number
): FieldErrors {
  const errors: FieldErrors = {};
  const add = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  const price = Number(state.offer.price);
  const priceMissing = !state.offer.price || Number.isNaN(price);
  if (priceMissing) add('offer.price', 'Please enter the offer price.');

  const originalPrice = state.offer.originalPrice ? Number(state.offer.originalPrice) : undefined;
  if (originalPrice !== undefined && Number.isNaN(originalPrice)) {
    add('offer.originalPrice', 'Please enter a valid original price.');
  }

  const { start, end } = state.duration;
  if (!start) add('duration.start', 'Please select the campaign start date.');
  if (!end) add('duration.end', 'Please select the campaign end date.');

  // Offer dates: derived exactly as buildCampaignInput derives them.
  const validity = state.offer.validity;
  let validityStart: string | undefined;
  let validityEnd: string | undefined;
  if (validity?.mode === 'whole_campaign' && start && end) {
    validityStart = toIsoDateTime(start);
    validityEnd = toIsoDateTime(end, true);
  } else if (validity?.mode === 'custom') {
    if (!validity.start) {
      add(
        'offer.validityStart',
        'Please enter the offer start date, or choose "No specific offer dates".'
      );
    }
    if (!validity.end) {
      add(
        'offer.validityEnd',
        'Please enter the offer end date, or choose "No specific offer dates".'
      );
    }
    if (validity.start) validityStart = toIsoDateTime(validity.start);
    if (validity.end) validityEnd = toIsoDateTime(validity.end, true);
  }

  // The shared business rules (identical to the callable's).
  if (!priceMissing && !(originalPrice !== undefined && Number.isNaN(originalPrice))) {
    const shared = validateOffer(
      {
        price,
        originalPrice,
        type: state.offer.type ?? '',
        validityStart,
        validityEnd,
      },
      {
        start: start ? toIsoDateTime(start) : '',
        end: end ? toIsoDateTime(end, true) : '',
      }
    );
    for (const [field, messages] of Object.entries(shared)) {
      for (const m of messages) add(field, m);
    }
    if (Object.keys(shared).length === 0) {
      const catalog = validateAgainstCatalog(
        { type: state.offer.type ?? '', originalPrice, price },
        catalogPrice
      );
      for (const [field, messages] of Object.entries(catalog)) {
        for (const m of messages) add(field, m);
      }
    }
  }

  // Wizard-specific product rule (kept from before): these offer types are described by a was/now pair.
  if (
    (state.offer.type === 'percentage' || state.offer.type === 'fixed') &&
    originalPrice === undefined &&
    !errors['offer.originalPrice']
  ) {
    add('offer.originalPrice', 'Please enter the original price to calculate the discount.');
  } else if (
    state.offer.type === 'fixed' &&
    originalPrice !== undefined &&
    !priceMissing &&
    originalPrice === price &&
    !errors['offer.originalPrice']
  ) {
    add('offer.originalPrice', 'Original price must be higher than the discounted price.');
  }

  return errors;
}
