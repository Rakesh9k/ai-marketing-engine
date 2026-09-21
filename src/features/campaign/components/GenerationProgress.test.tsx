import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const getCampaignMock = jest.fn();
jest.mock('@/services/database', () => ({
  campaignService: { get: (...args: unknown[]) => getCampaignMock(...args) },
}));

import { GenerationProgress } from './GenerationProgress';
import type { Campaign } from '@/types';

/**
 * Phase 35 — Priority 5 (Campaign): generation loading/progress and its
 * terminal states (success, Truth Check failure, generic failure), driven
 * entirely by real polled backend status — never a fake progress bar.
 */
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

describe('GenerationProgress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the real backend-reported stage as the loading message, never a fabricated percentage', async () => {
    getCampaignMock.mockResolvedValue(makeCampaign({ status: 'generating_creatives' }));
    render(<GenerationProgress campaignId="camp_1" onSettled={jest.fn()} />);

    expect(await screen.findByText(/creating campaign creatives/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('calls onSettled exactly once when the campaign reaches a terminal "verified" status', async () => {
    getCampaignMock.mockResolvedValue(makeCampaign({ status: 'verified' }));
    const onSettled = jest.fn();
    render(<GenerationProgress campaignId="camp_1" onSettled={onSettled} />);

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'verified' }));
  });

  it('Truth Check: a "failed" status is still reported to onSettled with its real error code, not swallowed', async () => {
    getCampaignMock.mockResolvedValue(
      makeCampaign({
        status: 'failed',
        error: {
          code: 'TRUTH_CHECK_FAILED',
          message: 'Price mismatch',
          stage: 'validation',
          retryable: false,
        },
      })
    );
    const onSettled = jest.fn();
    render(<GenerationProgress campaignId="camp_1" onSettled={onSettled} />);

    await waitFor(() =>
      expect(onSettled).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.objectContaining({ code: 'TRUTH_CHECK_FAILED' }),
        })
      )
    );
  });

  it('a poll error shows a soft retry message but never calls onSettled or stops polling', async () => {
    getCampaignMock.mockRejectedValue(new Error('network blip'));
    const onSettled = jest.fn();
    render(<GenerationProgress campaignId="camp_1" onSettled={onSettled} />);

    expect(await screen.findByText(/retrying/i)).toBeInTheDocument();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('is announced to assistive technology as a live status region', () => {
    getCampaignMock.mockReturnValue(new Promise(() => {}));
    render(<GenerationProgress campaignId="camp_1" onSettled={jest.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
