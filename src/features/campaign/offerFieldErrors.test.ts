import { computeOfferFieldErrors } from './offerFieldErrors';
import { buildCampaignInput } from './buildCampaignInput';
import { createInitialWizardState } from './types';
import type { CampaignWizardState } from './types';
import type { Business } from '@/types';
import { validateOffer } from '@/lib/validation/offerValidation';

const state = (
  over: Partial<CampaignWizardState['offer']> = {},
  duration: Partial<CampaignWizardState['duration']> = {}
): CampaignWizardState => {
  const base = createInitialWizardState();
  return {
    ...base,
    offer: {
      ...base.offer,
      headline: 'Weekend Special',
      type: 'percentage',
      price: '160',
      originalPrice: '200',
      ...over,
    },
    duration: { start: '2026-10-10', end: '2026-10-15', ...duration },
  };
};

describe('wizard offer field errors (shared server rules)', () => {
  it('a valid offer has no errors', () => {
    expect(computeOfferFieldErrors(state(), 200)).toEqual({});
  });

  it('keys the error to the offending field', () => {
    expect(
      computeOfferFieldErrors(state({ originalPrice: '150' }))['offer.originalPrice']?.[0]
    ).toMatch(/lower than the offer price/);
    expect(computeOfferFieldErrors(state({ price: '' }))['offer.price']).toBeDefined();
    expect(computeOfferFieldErrors(state({}, { end: '2026-10-05' }))['duration.end']?.[0]).toMatch(
      /campaign end date/
    );
    expect(computeOfferFieldErrors(state({}, { start: '' }))['duration.start']).toBeDefined();
  });

  it('percentage with equal prices, and a "was" price that contradicts the catalogue', () => {
    expect(computeOfferFieldErrors(state({ price: '200' }))['offer.originalPrice']?.[0]).toMatch(
      /no discount to state/
    );
    expect(computeOfferFieldErrors(state(), 250)['offer.originalPrice']?.[0]).toMatch(
      /catalogue \(₹250\)/
    );
    expect(computeOfferFieldErrors(state(), undefined)).toEqual({});
  });

  it('offer dates: validated on the same ISO values the payload carries', () => {
    const own = (start: string, end: string) =>
      state({ validity: { mode: 'custom', start, end } as never });
    expect(computeOfferFieldErrors(own('2026-10-12', '2026-10-14'), 200)).toEqual({});
    expect(
      computeOfferFieldErrors(own('2026-10-14', '2026-10-12'))['offer.validityEnd']?.[0]
    ).toMatch(/earlier than its start/);
    // over before the campaign starts on the 10th
    expect(
      computeOfferFieldErrors(own('2026-10-01', '2026-10-05'))['offer.validityEnd']?.[0]
    ).toMatch(/ends before the campaign starts/);
    // boundary: the offer ends on the campaign start DAY (end of that day) -> allowed
    expect(computeOfferFieldErrors(own('2026-10-08', '2026-10-10'), 200)).toEqual({});
    // custom dates left blank are reported on each field
    const blank = computeOfferFieldErrors(own('', ''));
    expect(blank['offer.validityStart']).toBeDefined();
    expect(blank['offer.validityEnd']).toBeDefined();
    // the whole-campaign mode is always consistent with the campaign dates
    expect(
      computeOfferFieldErrors(state({ validity: { mode: 'whole_campaign' } as never }), 200)
    ).toEqual({});
  });

  it('whatever the UI accepts, the server validator accepts too (no UI/server disagreement on a payload)', () => {
    const business = {
      businessId: 'b',
      location: { city: 'Hyderabad', state: 'Telangana' },
      businessBrain: {},
    } as unknown as Business;
    const s = {
      ...state({ validity: { mode: 'custom', start: '2026-10-12', end: '2026-10-14' } as never }),
      selectedProductId: 'p1',
      objective: 'weekend_offer',
      cta: 'order_whatsapp',
      primaryLanguage: 'en',
      regionalStyle: 'neutral',
      campaignStyle: 'urgent',
    } as unknown as CampaignWizardState;
    expect(computeOfferFieldErrors(s, 200)).toEqual({});
    const payload = buildCampaignInput(business, s, 'key')!;
    expect(
      validateOffer(
        {
          price: payload.offer.price,
          originalPrice: payload.offer.originalPrice,
          type: payload.offer.type,
          validityStart: (payload.offer as { validityStart?: string }).validityStart,
          validityEnd: (payload.offer as { validityEnd?: string }).validityEnd,
        },
        payload.duration
      )
    ).toEqual({});
  });
});
