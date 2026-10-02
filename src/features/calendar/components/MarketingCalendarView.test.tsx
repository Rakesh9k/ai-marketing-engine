import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { MarketingCalendarItem } from '@/types';
import { MarketingCalendarView } from './MarketingCalendarView';
import { calendarService } from '../services/calendarService';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../services/calendarService', () => ({
  calendarService: {
    skipCalendarItem: jest.fn(),
    updateCalendarItem: jest.fn(),
    createCampaignFromCalendarItem: jest.fn(),
  },
}));

describe('MarketingCalendarView', () => {
  const mockPlan = {
    planId: 'plan-123',
    userId: 'user-123',
    businessId: 'biz-123',
    goal: 'get_customers' as const,
    frequency: 'three_per_week' as const,
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    timezone: 'Asia/Kolkata',
    status: 'active' as const,
    totalItems: 2,
    createdCount: 0,
    createdAt: '2026-09-28T10:00:00.000Z',
    updatedAt: '2026-09-28T10:00:00.000Z',
  };

  const mockItems = [
    {
      itemId: 'cal-1',
      planId: 'plan-123',
      userId: 'user-123',
      businessId: 'biz-123',
      scheduledDate: '2026-10-01',
      suggestedTime: '19:30',
      timezone: 'Asia/Kolkata',
      contentType: 'post' as const,
      strategy: 'Product spotlight',
      topic: 'Biryani Special',
      hook: 'Best biryani in town',
      callToAction: 'Order today',
      productName: 'Chicken Biryani',
      status: 'planned' as const,
      createdAt: '2026-09-28T10:00:00.000Z',
      updatedAt: '2026-09-28T10:00:00.000Z',
    },
    {
      itemId: 'cal-2',
      planId: 'plan-123',
      userId: 'user-123',
      businessId: 'biz-123',
      scheduledDate: '2026-10-03',
      suggestedTime: '19:00',
      timezone: 'Asia/Kolkata',
      contentType: 'reel' as const,
      strategy: 'Behind the scenes',
      topic: 'Kitchen Secrets',
      hook: 'How our biryani is made',
      callToAction: 'Watch video',
      status: 'planned' as const,
      createdAt: '2026-09-28T10:00:00.000Z',
      updatedAt: '2026-09-28T10:00:00.000Z',
    },
  ];

  const defaultProps = {
    plan: mockPlan,
    items: mockItems,
    onOpenWizard: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when plan is null', () => {
    render(
      <MarketingCalendarView
        plan={null}
        items={[]}
        onOpenWizard={defaultProps.onOpenWizard}
        onRefresh={defaultProps.onRefresh}
      />
    );

    expect(screen.getByText('Your marketing calendar is empty')).toBeInTheDocument();
    const createPlanBtn = screen.getByRole('button', { name: /Create my 30-day plan/i });
    fireEvent.click(createPlanBtn);
    expect(defaultProps.onOpenWizard).toHaveBeenCalled();
  });

  it('renders active plan details and timeline items', () => {
    render(<MarketingCalendarView {...defaultProps} />);

    expect(screen.getByText('Get more customers')).toBeInTheDocument();
    expect(screen.getByText('1 Oct – 30 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Biryani Special')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Secrets')).toBeInTheDocument();
    expect(screen.getByText(/Best biryani in town/i)).toBeInTheDocument();

    const createContentButtons = screen.getAllByRole('button', { name: /🚀 Create Content/i });
    expect(createContentButtons.length).toBe(2);
  });

  it('triggers campaign creation when 🚀 Create Content is clicked', async () => {
    (calendarService.createCampaignFromCalendarItem as jest.Mock).mockResolvedValue({
      campaignId: 'camp-gen-123',
    });

    render(<MarketingCalendarView {...defaultProps} />);

    const createContentButtons = screen.getAllByRole('button', { name: /🚀 Create Content/i });
    fireEvent.click(createContentButtons[0]!);

    await waitFor(() => {
      expect(calendarService.createCampaignFromCalendarItem).toHaveBeenCalledWith('cal-1');
      expect(mockPush).toHaveBeenCalledWith('/campaigns/camp-gen-123?created=1');
    });
  });

  it('renders Open Campaign button when item has campaignId and status is content_created', () => {
    const createdItems: MarketingCalendarItem[] = [
      {
        ...mockItems[0]!,
        status: 'content_created' as const,
        campaignId: 'camp-existing-456',
      },
    ];

    render(<MarketingCalendarView {...defaultProps} items={createdItems} />);

    expect(screen.getByText('✓ Content Created')).toBeInTheDocument();
    const openCampaignLink = screen.getByRole('link', { name: 'Open Campaign' });
    expect(openCampaignLink).toHaveAttribute('href', '/campaigns/camp-existing-456');
  });

  it('handles item skipping', async () => {
    (calendarService.skipCalendarItem as jest.Mock).mockResolvedValue({
      item: { ...mockItems[0], status: 'skipped' },
    });

    render(<MarketingCalendarView {...defaultProps} />);

    const skipButtons = screen.getAllByRole('button', { name: 'Skip' });
    fireEvent.click(skipButtons[0]!);

    await waitFor(() => {
      expect(calendarService.skipCalendarItem).toHaveBeenCalledWith('cal-1');
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });
});
