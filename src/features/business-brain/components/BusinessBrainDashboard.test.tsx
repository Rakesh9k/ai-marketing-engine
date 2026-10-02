import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business, BrandKit, Product } from '@/types';
import { BusinessBrainDashboard } from './BusinessBrainDashboard';

const getByUserIdMock = jest.fn();
const getBrandKitMock = jest.fn();
const listProductsMock = jest.fn();
const getBusinessBrainContextMock = jest.fn();

jest.mock('@/services/database', () => ({
  businessService: {
    getByUserId: (...args: unknown[]) => getByUserIdMock(...args),
  },
  brandKitService: {
    get: (...args: unknown[]) => getBrandKitMock(...args),
  },
  productService: {
    listByBusiness: (...args: unknown[]) => listProductsMock(...args),
  },
}));

jest.mock('../services/businessBrainService', () => ({
  getBusinessBrainContext: (...args: unknown[]) => getBusinessBrainContextMock(...args),
}));

jest.mock('@/services/api', () => ({
  callFunction: jest.fn().mockResolvedValue({ success: true }),
}));

function makeBusiness(): Business {
  return {
    businessId: 'biz_123',
    userId: 'user_123',
    name: 'Hyderabad Biryani House',
    category: 'restaurant',
    description: 'Authentic Hyderabadi Biryani',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Madhapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    businessBrain: {
      identity: {
        name: 'Hyderabad Biryani House',
        category: 'restaurant',
        description: 'Authentic Hyderabadi Biryani',
        location: { city: 'Hyderabad', state: 'Telangana' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      products: [],
      brand: {
        tone: 'friendly',
        personality: 'Authentic',
        visualPreferences: 'Vibrant',
        colors: { primary: '#E84D1A', secondary: '#1F2126', accent: '#FFD700' },
        fonts: { heading: 'Montserrat', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'Biryani lovers',
        ageRange: { min: 18, max: 60 },
        localities: ['Madhapur'],
        preferences: 'Spicy',
      },
      localization: {
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'light',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 10,
        minimumOrder: 250,
        offerValidityRules: 'Weekend 15% OFF',
        pricingRules: 'Inclusive of GST',
        operatingMode: 'dine-in',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

describe('BusinessBrainDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    getBrandKitMock.mockResolvedValue({
      businessId: 'biz_123',
      brandName: 'Hyderabad Biryani House',
      tone: 'friendly',
      colors: { primary: '#E84D1A', secondary: '#1F2126', accent: '#FFD700' },
    });
    listProductsMock.mockResolvedValue([
      {
        productId: 'prod_1',
        businessId: 'biz_123',
        name: 'Special Chicken Biryani',
        price: 349,
        currency: 'INR',
        category: 'Main Course',
        status: 'active',
      },
    ]);
    getBusinessBrainContextMock.mockResolvedValue({
      business: { businessId: 'biz_123', businessName: 'Hyderabad Biryani House' },
    });
  });

  it('renders the Business Brain hero banner and mascot headline', async () => {
    render(<BusinessBrainDashboard userId="user_123" />);

    await waitFor(() => {
      expect(screen.getByText("Your Business. Mitra's Understanding.")).toBeInTheDocument();
    });

    expect(screen.getByText(/Teach Mitra how your business operates/i)).toBeInTheDocument();
    expect(screen.getByText('All Sections')).toBeInTheDocument();
  });

  it('allows switching between section tabs', async () => {
    render(<BusinessBrainDashboard userId="user_123" />);

    await waitFor(() => {
      expect(screen.getByText("Your Business. Mitra's Understanding.")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const brandTab = screen.getByRole('button', { name: /Brand Profile/i });
    await user.click(brandTab);

    expect(await screen.findByText('Brand Profile & Design Identity')).toBeInTheDocument();
  });
});
