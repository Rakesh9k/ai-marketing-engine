/**
 * FRONTEND COPY of functions/src/utils/offerValidation.ts. The callable is the authority and re-validates every
 * request; this copy only lets the wizard show the same rules next to the offending field before submitting.
 * The two files MUST behave identically: tests/offerValidationParity.test.ts runs one shared case table through
 * both and fails on any drift (the functions package deploys alone, so a single shared import is not possible).
 */
/**
 * Deterministic, pure validation of a campaign request's offer, run BEFORE any credit reservation or AI call
 * (see generateCampaignStrategy.ts). A contradictory offer must be rejected up front with a message the owner
 * can act on, not generated and then caught (if at all) by Truth Check.
 *
 * Returns field errors keyed like the request ("offer.originalPrice"); an empty object means valid.
 */
export interface OfferInput {
  price: number;
  originalPrice?: number;
  type: string;
  validityStart?: string;
  validityEnd?: string;
}

export interface CampaignWindow {
  start: string;
  end: string;
}

export type FieldErrors = Record<string, string[]>;

/** Largest amount accepted for any price field (₹100 crore): rejects obvious typos and overflow. */
export const MAX_PRICE_INR = 1_000_000_000;

const add = (errors: FieldErrors, field: string, message: string) => {
  (errors[field] ??= []).push(message);
};

const isMoney = (n: unknown): n is number =>
  typeof n === 'number' &&
  Number.isFinite(n) &&
  n > 0 &&
  n <= MAX_PRICE_INR &&
  Math.abs(Math.round(n * 100) / 100 - n) < 1e-9; // at most 2 decimals

const ts = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** The discount a percentage offer states, as a whole percent, or null when there is none to state. */
export function statedDiscountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function validateOffer(offer: OfferInput, campaign: CampaignWindow): FieldErrors {
  const errors: FieldErrors = {};

  // Currency / price fields.
  if (!isMoney(offer.price)) {
    add(
      errors,
      'offer.price',
      `The offer price must be a positive amount in rupees (at most 2 decimals, up to ${rupees(MAX_PRICE_INR)}).`
    );
  }
  if (offer.originalPrice !== undefined) {
    if (!isMoney(offer.originalPrice)) {
      add(
        errors,
        'offer.originalPrice',
        `The original price must be a positive amount in rupees (at most 2 decimals, up to ${rupees(MAX_PRICE_INR)}).`
      );
    } else if (isMoney(offer.price)) {
      if (offer.originalPrice < offer.price) {
        add(
          errors,
          'offer.originalPrice',
          `The original price (${rupees(offer.originalPrice)}) is lower than the offer price (${rupees(offer.price)}). A "was" price cannot be below the price now.`
        );
      } else if (offer.type === 'percentage') {
        // A percentage offer claims a discount, so it needs a real one.
        const percent = statedDiscountPercent(offer.price, offer.originalPrice);
        if (percent === null) {
          add(
            errors,
            'offer.originalPrice',
            `This is a percentage offer, but the original price (${rupees(offer.originalPrice)}) equals the offer price (${rupees(offer.price)}), so there is no discount to state.`
          );
        } else if (percent < 1) {
          add(
            errors,
            'offer.originalPrice',
            `The difference between ${rupees(offer.originalPrice)} and ${rupees(offer.price)} is under 1%, too small to advertise as a percentage discount.`
          );
        }
      }
    }
  }

  // Offer validity window.
  const vStart = ts(offer.validityStart);
  const vEnd = ts(offer.validityEnd);
  if (vStart !== undefined && vEnd !== undefined && vEnd < vStart) {
    add(
      errors,
      'offer.validityEnd',
      'The offer end date is earlier than its start date. Check the dates.'
    );
  }

  // Campaign window.
  const cStart = ts(campaign.start);
  const cEnd = ts(campaign.end);
  if (cStart !== undefined && cEnd !== undefined && cEnd < cStart) {
    add(
      errors,
      'duration.end',
      'The campaign end date is earlier than its start date. Check the dates.'
    );
  }

  // An offer that is already over before the campaign even starts cannot be promoted.
  if (vEnd !== undefined && cStart !== undefined && vEnd < cStart) {
    add(
      errors,
      'offer.validityEnd',
      'The offer ends before the campaign starts, so there is nothing valid to promote. Move the dates or choose a later end date.'
    );
  }

  return errors;
}

/**
 * Conflict between the campaign's "was" price and the product's price in the owner's catalogue (the Business
 * Brain's authoritative price). Applies only to a percentage offer that states an original price: that figure
 * is a factual claim about what the product normally costs.
 */
export function validateAgainstCatalog(
  offer: Pick<OfferInput, 'type' | 'originalPrice' | 'price'>,
  catalogPrice: number | undefined
): FieldErrors {
  const errors: FieldErrors = {};
  if (
    offer.type === 'percentage' &&
    offer.originalPrice !== undefined &&
    catalogPrice !== undefined &&
    catalogPrice > 0 &&
    Math.abs(offer.originalPrice - catalogPrice) > 0.005
  ) {
    add(
      errors,
      'offer.originalPrice',
      `The original price (${rupees(offer.originalPrice)}) does not match this product's price in your catalogue (${rupees(catalogPrice)}). Update the product price or the original price so the discount is true.`
    );
  }
  return errors;
}

export const firstMessage = (errors: FieldErrors): string =>
  Object.values(errors)[0]?.[0] ?? 'The offer details are inconsistent.';
