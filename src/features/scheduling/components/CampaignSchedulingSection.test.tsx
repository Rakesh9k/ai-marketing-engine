import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CampaignSchedulingSection } from './CampaignSchedulingSection';
import * as schedulingService from '../services/schedulingService';

jest.mock('../services/schedulingService');

describe('CampaignSchedulingSection', () => {
  const mockCampaign = {
    campaignId: 'camp-100',
    businessId: 'biz-1',
    status: 'generated',
    offer: { headline: 'Special Offer' },
  } as any;

  const mockConnections = [
    {
      connectionId: 'conn-ig',
      userId: 'user-1',
      provider: 'meta',
      status: 'active',
      instagram: { id: 'ig-123', username: 'testuser' },
    },
    {
      connectionId: 'conn-fb',
      userId: 'user-1',
      provider: 'meta',
      status: 'active',
      facebookPage: { id: 'fb-123', name: 'Test Page' },
    },
  ] as any[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders destination options and schedule controls for an eligible campaign', () => {
    render(
      <CampaignSchedulingSection
        campaign={mockCampaign}
        connections={mockConnections}
        scheduledPosts={[]}
        publishJobs={[]}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getByText(/Publish & Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/📸 Instagram/i)).toBeInTheDocument();
    expect(screen.getByText(/📘 Facebook/i)).toBeInTheDocument();
  });

  it('submits multi-platform schedule when user clicks Schedule Post', async () => {
    const mockCreateMulti = schedulingService.createMultiPlatformSchedule as jest.MockedFunction<
      typeof schedulingService.createMultiPlatformSchedule
    >;
    mockCreateMulti.mockResolvedValueOnce([{ scheduledPostId: 'sch-1' }] as any);

    const onRefreshMock = jest.fn();

    render(
      <CampaignSchedulingSection
        campaign={mockCampaign}
        connections={mockConnections}
        scheduledPosts={[]}
        publishJobs={[]}
        onRefresh={onRefreshMock}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Schedule Post/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMulti).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'camp-100',
        })
      );
      expect(onRefreshMock).toHaveBeenCalled();
    });
  });
});
