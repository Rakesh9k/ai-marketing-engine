import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business, Product } from '@/types';
import { ProductCatalogDashboard } from './ProductCatalogDashboard';

const getByUserIdMock = jest.fn();
const listProductsMock = jest.fn();

jest.mock('@/services/database', () => ({
  businessService: {
    getByUserId: (...args: unknown[]) => getByUserIdMock(...args),
  },
  productService: {
    listByBusiness: (...args: unknown[]) => listProductsMock(...args),
  },
}));

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
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

function makeProduct(): Product {
  return {
    productId: 'prod_123',
    businessId: 'biz_123',
    name: 'Chicken Biryani',
    description: 'Authentic Hyderabadi chicken biryani with aromatic spices.',
    price: 299,
    originalPrice: 399,
    currency: 'INR',
    category: 'Biryani & Rice',
    tags: ['Bestseller', 'Popular'],
    variants: [],
    images: [{ url: 'https://images.unsplash.com/photo-biryani.jpg', storagePath: '', isPrimary: true }],
    attributes: { veg: false },
    status: 'active',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('ProductCatalogDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    listProductsMock.mockResolvedValue([makeProduct()]);
  });

  it('renders the Product Catalog header and product list', async () => {
    render(<ProductCatalogDashboard userId="user_123" />);

    await waitFor(() => {
      expect(screen.getByText(/Your Menu, Your Story/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Chicken Biryani')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/₹299/i)[0]).toBeInTheDocument();
  });

  it('filters products based on search input', async () => {
    render(<ProductCatalogDashboard userId="user_123" />);

    await waitFor(() => {
      expect(screen.getAllByText('Chicken Biryani')[0]).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText(/Search products, categories, or tags/i);
    await user.type(searchInput, 'NonExistentProduct');

    expect(screen.getByText('No products found')).toBeInTheDocument();
  });
});
