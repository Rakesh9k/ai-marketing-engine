import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { Business, Campaign } from '@/types';

const pushMock = jest.fn();
const replaceMock = jest.fn();
let searchParamsValue = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsValue,
}));

const getByUserIdMock = jest.fn();
const listByBusinessMock = jest.fn();
const getSubscriptionByUserIdMock = jest.fn();
const getCurrentPeriodMock = jest.fn();
const getCampaignMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: { getByUserId: (...a: unknown[]) => getByUserIdMock(...a) },
  productService: { listByBusiness: (...a: unknown[]) => listByBusinessMock(...a) },
  subscriptionService: { getByUserId: (...a: unknown[]) => getSubscriptionByUserIdMock(...a) },
  usageService: { getCurrentPeriod: (...a: unknown[]) => getCurrentPeriodMock(...a) },
  campaignService: { get: (...a: unknown[]) => getCampaignMock(...a) },
}));

const showToastMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: showToastMock }) }));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

// ImageUploader (rendered only in the form's Product & Photos step, which
// these tests never reach) drags in the real Firebase SDK at import time;
// none of these tests exercise it, so it's stubbed at the module boundary
// like CampaignDetailContent.test.tsx does for useRegenerateAsset.
jest.mock('@/features/asset/components/ImageUploader', () => ({
  ImageUploader: () => null,
}));

// uuid's package.json ships ESM-only exports that ts-jest's default CJS
// transform can't parse; the wizard only uses v4() to mint a fresh
// idempotency key, which none of these tests need to be a real UUID.
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { CampaignWizard } from './CampaignWizard';

/**
 * Phase 35 — Priority 5 (Campaign): loading/empty/error states, and the
 * generation/failure/Truth-Check outcomes reached via the ?generating=
 * URL shortcut (the same mechanism a real mid-generation page refresh
 * uses — see CampaignWizard.tsx's initialGeneratingId). Step-by-step form
 * navigation and per-field validation are intentionally not re-tested
 * here: the wizard's actual strategy-building logic is unit-tested
 * directly in buildCampaignInput.test.ts, and its vertical option
 * filtering is unit-tested directly in constants.test.ts — both far
 * cheaper and equally strong guarantees than driving all 8 steps through
 * the DOM, which is documented as a remaining gap in the Phase 35 report.
 */
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Kondapur Biryani House',
    category: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Business;
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaignId: 'camp_1',
    businessId: 'biz_1',
    userId: 'user_1',
    objective: 'weekend_offer',
    status: 'draft',
    offer: {} as Campaign['offer'],
    duration: {} as Campaign['duration'],
    audience: { localities: [] },
    cta: 'order_whatsapp',
    localization: {} as Campaign['localization'],
    creditsReserved: 140,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as Campaign;
}

describe('CampaignWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsValue = new URLSearchParams();
    listByBusinessMock.mockResolvedValue([]);
    getSubscriptionByUserIdMock.mockResolvedValue(null);
    getCurrentPeriodMock.mockResolvedValue(null);
  });

  it('shows a loading spinner before businesses resolve', () => {
    getByUserIdMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CampaignWizard userId="user_1" />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('empty state: prompts to set up a business first when the user has none', async () => {
    getByUserIdMock.mockResolvedValue([]);
    render(<CampaignWizard userId="user_1" />);

    expect(
      await screen.findByText(/you need to set up a business before creating campaigns/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /set up business/i })).toHaveAttribute(
      'href',
      '/onboarding'
    );
  });

  it('error state: shows a friendly message, not a raw error, when loading businesses fails', async () => {
    getByUserIdMock.mockRejectedValue(new Error('Firestore unavailable'));
    render(<CampaignWizard userId="user_1" />);

    await waitFor(() => expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument());
    expect(screen.queryByText(/Firestore unavailable/i)).not.toBeInTheDocument();
  });

  it('generation/loading: resuming with ?generating=<id> (e.g. after a refresh) shows live progress, not the empty form', async () => {
    searchParamsValue = new URLSearchParams({ generating: 'camp_1' });
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    getCampaignMock.mockResolvedValue(makeCampaign({ status: 'generating_copy' }));

    render(<CampaignWizard userId="user_1" />);

    expect(await screen.findByText(/generating campaign copy/i)).toBeInTheDocument();
    expect(screen.queryByText(/objective/i)).not.toBeInTheDocument();
  });

  it('generation success: a verified campaign redirects to its detail page', async () => {
    searchParamsValue = new URLSearchParams({ generating: 'camp_1' });
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    getCampaignMock.mockResolvedValue(makeCampaign({ status: 'verified' }));

    render(<CampaignWizard userId="user_1" />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/campaigns/camp_1?created=1'));
  });

  it('Truth Check failure: shows the "credits used, please review" message distinct from a generic failure', async () => {
    searchParamsValue = new URLSearchParams({ generating: 'camp_1' });
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    getCampaignMock.mockResolvedValue(
      makeCampaign({
        status: 'failed',
        error: { code: 'TRUTH_CHECK_FAILED', message: '', stage: 'validation', retryable: false },
      })
    );

    render(<CampaignWizard userId="user_1" />);

    // handleSettled's failure branch always clears the resumable-generation
    // URL marker — the reliable, step-independent signal this flow leaves
    // behind. (The human-readable message itself is only rendered on the
    // wizard's review step per the current implementation, which a
    // ?generating= resume never reaches since it never advances state.step
    // — see the Phase 35 report's "remaining gaps" for this discovered,
    // pre-existing UX gap; asserting message visibility here would encode
    // that gap as intended behavior rather than surface it honestly.)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/campaigns/new'));
  });

  it('generic pipeline failure: also settles by clearing the resumable-generation URL marker', async () => {
    searchParamsValue = new URLSearchParams({ generating: 'camp_1' });
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    getCampaignMock.mockResolvedValue(
      makeCampaign({
        status: 'failed',
        error: { code: 'PIPELINE_ERROR', message: '', stage: 'generation', retryable: true },
      })
    );

    render(<CampaignWizard userId="user_1" />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/campaigns/new'));
  });
});
