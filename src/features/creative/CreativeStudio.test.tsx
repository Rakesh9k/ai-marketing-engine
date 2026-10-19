import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreativeStudioDashboard } from './components/CreativeStudioDashboard';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio';
import { PosterGeneratorStudio } from './components/PosterGeneratorStudio';
import { ReelGeneratorStudio } from './components/ReelGeneratorStudio';
import { VideoGeneratorStudio } from './components/VideoGeneratorStudio';
import { TemplateExplorer } from './components/TemplateExplorer';
import { CreativeDetailStudio } from './components/CreativeDetailStudio';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

const getByUserIdMock = jest.fn();
const listByBusinessMock = jest.fn();
const getSubscriptionByUserIdMock = jest.fn();
const getCurrentPeriodMock = jest.fn();

jest.mock('@/services/database', () => ({
  businessService: { getByUserId: (...a: unknown[]) => getByUserIdMock(...a) },
  productService: { listByBusiness: (...a: unknown[]) => listByBusinessMock(...a) },
  campaignAssetService: { listByBusiness: (...a: unknown[]) => listByBusinessMock(...a) },
  subscriptionService: { getByUserId: (...a: unknown[]) => getSubscriptionByUserIdMock(...a) },
  usageService: { getCurrentPeriod: (...a: unknown[]) => getCurrentPeriodMock(...a) },
}));

describe('Creative Studio Modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getByUserIdMock.mockResolvedValue([
      {
        businessId: 'biz_1',
        name: 'Kondapur Biryani House',
        location: { city: 'Hyderabad', state: 'Telangana' },
      },
    ]);
    listByBusinessMock.mockResolvedValue([]);
    getSubscriptionByUserIdMock.mockResolvedValue(null);
    getCurrentPeriodMock.mockResolvedValue(null);
  });

  it('renders CreativeStudioDashboard with hero title, quick create options, and dynamic 140 credits display', async () => {
    getCurrentPeriodMock.mockResolvedValue({ creditsIncluded: 140, creditsUsed: 0 });
    render(<CreativeStudioDashboard userId="user_1" />);
    expect(await screen.findByText(/Turn Your Ideas into/i)).toBeInTheDocument();
    expect(screen.getByText(/Image Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Poster Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/140 \/ 140 Credits/i)).toBeInTheDocument();
  });

  it('renders ImageGeneratorStudio with prompt input and format selector', async () => {
    render(<ImageGeneratorStudio userId="user_1" />);
    expect(await screen.findByText(/Image Generator Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/1. Creative Brief & Intent/i)).toBeInTheDocument();
  });

  it('renders PosterGeneratorStudio with editable copy fields', () => {
    render(<PosterGeneratorStudio userId="user_1" />);
    expect(screen.getByText(/Poster Generator Studio/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Weekend Biryani Feast/i)).toBeInTheDocument();
  });

  it('renders ReelGeneratorStudio with AI Director storyboard timeline', () => {
    render(<ReelGeneratorStudio userId="user_1" />);
    expect(screen.getByText(/Reel Director Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/01 HOOK/i)).toBeInTheDocument();
  });

  it('renders VideoGeneratorStudio with duration selector', () => {
    render(<VideoGeneratorStudio userId="user_1" />);
    expect(screen.getByText(/Video Showcase Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Promotional Video Settings/i)).toBeInTheDocument();
  });

  it('renders TemplateExplorer with filter categories', () => {
    render(<TemplateExplorer userId="user_1" />);
    expect(screen.getByText(/Creative Templates Library/i)).toBeInTheDocument();
  });

  it('renders CreativeDetailStudio with copy tabs and approval button', () => {
    render(<CreativeDetailStudio userId="user_1" creativeId="cr_1" />);
    expect(screen.getByText(/Approve Creative/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Approve Creative/i));
    expect(screen.getByText(/✓ Creative Approved/i)).toBeInTheDocument();
  });
});
