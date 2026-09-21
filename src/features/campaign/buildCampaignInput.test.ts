import { buildCampaignInput, toIsoDateTime } from './buildCampaignInput';
import { createInitialWizardState } from './types';
import type { Business } from '@/types';

/**
 * Phase 35 — Priority 5 (Campaign): the wizard's pure strategy-building
 * logic, unit-tested directly against real business/state shapes — no
 * rendering needed, and this is exactly the function the wizard calls
 * before invoking generateCampaignStrategy.
 */
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Kondapur Biryani House',
    category: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {
      audience: { targetCustomer: 'Families', localities: ['Kondapur'] },
      brand: { tone: 'friendly' },
      localization: { slangIntensity: 'moderate' },
    } as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Business;
}

function validState() {
  const state = createInitialWizardState();
  state.objective = 'weekend_offer';
  state.selectedProductId = 'prod_1';
  state.offer = {
    headline: 'Weekend Special',
    description: '',
    price: '299',
    originalPrice: '',
    type: 'percentage',
    terms: '',
  };
  state.duration = { start: '2026-03-10', end: '2026-03-15' };
  state.audience = { localities: ['Kondapur'], ageMin: '18', ageMax: '60', occasion: '' };
  state.cta = 'order_whatsapp';
  state.primaryLanguage = 'en';
  state.regionalStyle = 'hyderabadi';
  state.campaignStyle = 'funny';
  return state;
}

describe('buildCampaignInput', () => {
  it('returns null (never a half-built payload) when a required field is missing', () => {
    const state = validState();
    state.selectedProductId = null;
    expect(buildCampaignInput(makeBusiness(), state, 'idem_1')).toBeNull();
  });

  it('returns null when the offer type is missing', () => {
    const state = validState();
    state.offer.type = null;
    expect(buildCampaignInput(makeBusiness(), state, 'idem_1')).toBeNull();
  });

  it('builds the exact payload shape the backend schema expects, with real numeric coercion', () => {
    const input = buildCampaignInput(makeBusiness(), validState(), 'idem_1');
    expect(input).not.toBeNull();
    expect(input).toMatchObject({
      businessId: 'biz_1',
      objective: 'weekend_offer',
      productId: 'prod_1',
      offer: {
        headline: 'Weekend Special',
        price: 299,
        type: 'percentage',
      },
      cta: 'order_whatsapp',
      idempotencyKey: 'idem_1',
    });
    expect(typeof input!.offer.price).toBe('number');
  });

  it('derives secondaryLanguage/languageMixing correctly for a mixed-language selection', () => {
    const state = validState();
    state.primaryLanguage = 'te_en';
    const input = buildCampaignInput(makeBusiness(), state, 'idem_1');
    expect(input!.localization.secondaryLanguage).toBe('te');
    expect(input!.localization.languageMixing).toBe('natural');
  });

  it('defaults languageMixing to "minimal" for a single, non-mixed language', () => {
    const input = buildCampaignInput(makeBusiness(), validState(), 'idem_1');
    expect(input!.localization.languageMixing).toBe('minimal');
  });

  it('pulls brand tone and audience description from Business Brain, not invented defaults, when present', () => {
    const input = buildCampaignInput(makeBusiness(), validState(), 'idem_1');
    expect(input!.localization.brandTone).toBe('friendly');
    expect(input!.localization.audienceDescription).toBe('Families');
  });

  it('falls back to a locality-based audience description only when Business Brain has none', () => {
    const business = makeBusiness({
      businessBrain: { audience: {}, brand: {}, localization: {} } as Business['businessBrain'],
    });
    const input = buildCampaignInput(business, validState(), 'idem_1');
    expect(input!.localization.audienceDescription).toBe('Local customers in Kondapur');
    expect(input!.localization.brandTone).toBe('friendly'); // safe UI default, not invented per-business data
  });

  it('never trusts a client-supplied idempotency key from anywhere but the explicit parameter', () => {
    const input1 = buildCampaignInput(makeBusiness(), validState(), 'key-one');
    const input2 = buildCampaignInput(makeBusiness(), validState(), 'key-two');
    expect(input1!.idempotencyKey).toBe('key-one');
    expect(input2!.idempotencyKey).toBe('key-two');
  });
});

describe('toIsoDateTime', () => {
  it('formats a start-of-day boundary', () => {
    expect(toIsoDateTime('2026-03-10')).toBe('2026-03-10T00:00:00.000Z');
  });

  it('formats an end-of-day boundary when requested', () => {
    expect(toIsoDateTime('2026-03-15', true)).toBe('2026-03-15T23:59:59.000Z');
  });
});
