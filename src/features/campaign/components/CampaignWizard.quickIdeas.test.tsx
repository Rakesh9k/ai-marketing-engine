import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Business } from '@/types';

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
 * Quick ideas follow the kind of business. The three pills used to be restaurant ideas ("Lunch Special 15% OFF",
 * "Weekend Biryani Combo") shown to everyone, and each one invented a price, a discount, dates and claims.
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

describe('CampaignWizard quick ideas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsValue = new URLSearchParams();
    listByBusinessMock.mockResolvedValue([]);
    getSubscriptionByUserIdMock.mockResolvedValue(null);
    getCurrentPeriodMock.mockResolvedValue(null);
  });

  it('a salon sees salon ideas and no restaurant ones', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness({ category: 'salon', name: 'Glow Studio' })]);
    render(<CampaignWizard userId="user_1" />);
    expect(await screen.findByRole('button', { name: /Package spotlight/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New service/i })).toBeInTheDocument();
    expect(screen.queryByText(/biryani|lunch|weekend special|d+% off/i)).not.toBeInTheDocument();
  });

  it('a restaurant sees restaurant ideas, and none of them carries a price or discount', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness({ category: 'restaurant' })]);
    render(<CampaignWizard userId="user_1" />);
    expect(await screen.findByRole('button', { name: /Weekend special/i })).toBeInTheDocument();
    expect(screen.queryByText(/d+% off|₹s?d|free delivery/i)).not.toBeInTheDocument();
  });

  it('a real-estate agent sees property ideas', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness({ category: 'real_estate' })]);
    render(<CampaignWizard userId="user_1" />);
    expect(await screen.findByRole('button', { name: /New listing/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dish|weekend special/i })).not.toBeInTheDocument();
  });
});
