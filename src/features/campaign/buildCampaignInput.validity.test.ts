import { buildCampaignInput } from './buildCampaignInput';
import { createInitialWizardState } from './types';
import type { Business } from '@/types';

/**
 * Campaign duration is NOT offer validity.
 *
 *   duration  = how long Mitra runs the campaign (the owner's choice of when to post)
 *   validity  = the period in which the business's offer is actually valid (a promise made to customers)
 *
 * The wizard used to copy the first into the second, so every campaign claimed "valid 10 Oct to 15 Oct" for an
 * offer whose owner never gave dates, and the Truth Check then enforced those invented dates on the copy.
 * The two are linked only when the owner says so, and the link is recorded.
 */
const business = {
  businessId: 'biz_1',
  userId: 'user_1',
  name: 'Bandra Bites',
  category: 'restaurant',
  location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
  contact: { phone: '9876543210', whatsapp: '9876543210' },
  businessBrain: { audience: { localities: ['Bandra'] }, brand: {}, localization: {} },
} as unknown as Business;

function stateWith(validity?: {
  mode: 'none' | 'whole_campaign' | 'custom';
  start: string;
  end: string;
}) {
  const s = createInitialWizardState();
  s.objective = 'weekend_offer';
  s.selectedProductId = 'prod_1';
  s.offer = {
    headline: 'Paneer Biryani',
    description: '',
    price: '250',
    originalPrice: '',
    type: 'fixed',
    terms: '',
    ...(validity ? { validity } : {}),
  };
  s.duration = { start: '2026-10-10', end: '2026-10-15' };
  s.audience = { localities: ['Bandra'], ageMin: '18', ageMax: '60', occasion: '' };
  s.cta = 'order_whatsapp';
  s.primaryLanguage = 'hi_en';
  s.regionalStyle = 'mumbai';
  s.campaignStyle = 'funny';
  return s;
}

describe('campaign duration vs offer validity', () => {
  it('A. a campaign with dates and no offer dates: duration is known, offer validity is UNKNOWN', () => {
    const input = buildCampaignInput(business, stateWith(), 'key')!;
    expect(input.duration.start).toContain('2026-10-10');
    expect(input.duration.end).toContain('2026-10-15');
    expect(input.offer.validityStart).toBeUndefined();
    expect(input.offer.validityEnd).toBeUndefined();
    expect(input.offer.validitySource).toBeUndefined();
  });

  it('A. the initial wizard state means "no offer dates"', () => {
    expect(createInitialWizardState().offer.validity?.mode).toBe('none');
  });

  it('B. dates the owner gave for the offer are preserved, and are not the campaign dates', () => {
    const input = buildCampaignInput(
      business,
      stateWith({ mode: 'custom', start: '2026-10-12', end: '2026-10-13' }),
      'key'
    )!;
    expect(input.offer.validityStart).toContain('2026-10-12');
    expect(input.offer.validityEnd).toContain('2026-10-13');
    expect(input.offer.validitySource).toBe('owner_dates');
    // the campaign window is untouched by the offer window
    expect(input.duration.start).toContain('2026-10-10');
    expect(input.duration.end).toContain('2026-10-15');
  });

  it('C. "valid for the whole campaign", chosen explicitly, links the two and records that it was chosen', () => {
    const input = buildCampaignInput(
      business,
      stateWith({ mode: 'whole_campaign', start: '', end: '' }),
      'key'
    )!;
    expect(input.offer.validityStart).toBe(input.duration.start);
    expect(input.offer.validityEnd).toBe(input.duration.end);
    expect(input.offer.validitySource).toBe('whole_campaign');
  });

  it('custom dates that were never filled in are not made up from the campaign dates', () => {
    const input = buildCampaignInput(
      business,
      stateWith({ mode: 'custom', start: '', end: '' }),
      'key'
    )!;
    expect(input.offer.validityStart).toBeUndefined();
    expect(input.offer.validityEnd).toBeUndefined();
  });
});
