import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business, BrandKit } from '@/types';

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

const getByUserIdMock = jest.fn();
const getBusinessMock = jest.fn();
const getBrandKitMock = jest.fn();
const listProductsMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: {
    getByUserId: (...args: unknown[]) => getByUserIdMock(...args),
    get: (...args: unknown[]) => getBusinessMock(...args),
  },
  brandKitService: {
    get: (...args: unknown[]) => getBrandKitMock(...args),
  },
  productService: {
    listByBusiness: (...args: unknown[]) => listProductsMock(...args),
  },
}));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

import BusinessProfilePage from './page';

/**
 * Phase 33 — proves the customer-facing Business Profile page reads real
 * Business Brain data (never invented labels), routes every save through
 * the authenticated/authorized/validated Cloud Functions (never a direct
 * Firestore write), and exposes only the fields the phase brief allows
 * (no credits/Truth Check/ownership/tenant/billing field appears anywhere
 * on this page).
 */
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Kondapur Biryani House',
    category: 'restaurant',
    description: 'Best biryani in town',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {
      identity: {
        name: 'Kondapur Biryani House',
        category: 'restaurant',
        description: 'Best biryani in town',
        location: { city: 'Hyderabad', state: 'Telangana' },
        contact: { phone: '9876543210', whatsapp: '9876543210' },
      },
      products: [],
      brand: {
        tone: 'friendly',
        personality: '',
        visualPreferences: '',
        colors: { primary: '#000', secondary: '#fff', accent: '#f00' },
        fonts: { heading: 'Poppins', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'Families',
        ageRange: { min: 18, max: 65 },
        localities: ['Kondapur'],
        preferences: '',
      },
      localization: {
        primaryLanguage: 'en',
        secondaryLanguage: 'en',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'moderate',
        languageMixing: 'minimal',
      },
      businessRules: {
        openingHours: {},
        deliveryRadiusKm: 5,
        minimumOrder: 200,
        offerValidityRules: '',
        pricingRules: '',
        operatingMode: 'delivery',
      },
      campaignHistory: [],
      lastSyncedAt: new Date().toISOString(),
    } as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Business;
}

function makeBrandKit(): BrandKit {
  return {
    businessId: 'biz_1',
    colors: { primary: '#E84D1A', background: '#FFF', text: '#000' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    tone: 'friendly',
    personality: 'Warm and welcoming',
    visualPreferences: 'Bright food photography',
    updatedAt: new Date().toISOString(),
  } as BrandKit;
}

describe('BusinessProfilePage (Phase 33)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    listProductsMock.mockResolvedValue([]);
    getBrandKitMock.mockResolvedValue(makeBrandKit());
  });

  it('shows a loading spinner before the business list resolves', () => {
    getByUserIdMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BusinessProfilePage />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows a "no business" empty state when the user has no business set up', async () => {
    getByUserIdMock.mockResolvedValue([]);
    render(<BusinessProfilePage />);
    await waitFor(() => expect(screen.getByText(/no business set up yet/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /create business/i })).toHaveAttribute(
      'href',
      '/onboarding'
    );
  });

  it('reads and displays real Business Brain fields — customer language, not internal field paths', async () => {
    const business = makeBusiness();
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);

    render(<BusinessProfilePage />);

    expect(await screen.findByText('Your Business Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Kondapur Biryani House')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Families')).toBeInTheDocument();
    // The internal model name never leaks into the UI.
    expect(screen.queryByText(/BusinessBrain/i)).not.toBeInTheDocument();
    // Security-critical fields never appear anywhere on the page.
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/truth check/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tenant/i)).not.toBeInTheDocument();
  });

  it('editing and saving the Business section calls updateBusiness with the new values (authenticated/authorized/validated write path)', async () => {
    const user = userEvent.setup();
    const business = makeBusiness();
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);
    callFunctionMock.mockResolvedValue({ business });

    render(<BusinessProfilePage />);
    const nameInput = await screen.findByDisplayValue('Kondapur Biryani House');

    await user.clear(nameInput);
    await user.type(nameInput, 'New Biryani Name');

    const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
    await user.click(saveButtons[0]!);

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'updateBusiness',
          data: expect.objectContaining({ businessId: 'biz_1', name: 'New Biryani Name' }),
        })
      )
    );
    // A staleness warning appears since contact/location-affecting fields
    // were part of this save's schema (even though only name changed here,
    // the Business section always warns — location/contact live in it too).
    expect(await screen.findByText(/campaigns generated with the old/i)).toBeInTheDocument();
  });

  it('cancel discards unsaved edits and never calls the Cloud Function', async () => {
    const user = userEvent.setup();
    const business = makeBusiness();
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);

    render(<BusinessProfilePage />);
    const nameInput = await screen.findByDisplayValue('Kondapur Biryani House');

    await user.clear(nameInput);
    await user.type(nameInput, 'Temporary Edit');
    expect(screen.getByDisplayValue('Temporary Edit')).toBeInTheDocument();

    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    await user.click(cancelButtons[0]!);

    expect(screen.getByDisplayValue('Kondapur Biryani House')).toBeInTheDocument();
    expect(callFunctionMock).not.toHaveBeenCalled();
  });

  it('category is read-only — no input lets a customer change it here', async () => {
    const business = makeBusiness();
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);

    render(<BusinessProfilePage />);
    const categoryInput = await screen.findByDisplayValue('restaurant');
    expect(categoryInput).toBeDisabled();
  });

  it('shows a surfaced error and lets the user retry when the initial load fails', async () => {
    getByUserIdMock.mockResolvedValue([makeBusiness()]);
    getBusinessMock.mockRejectedValue(new Error('network down'));

    render(<BusinessProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/something got in the way/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('salon business shows Products/Services with an inline service editor (no separate edit page exists for this)', async () => {
    const business = makeBusiness({
      category: 'salon',
      businessBrain: {
        ...makeBusiness().businessBrain,
        verticalProfile: {
          vertical: 'salon',
          services: [{ id: 's1', name: 'Haircut', category: 'hair', price: 300, active: true }],
          packages: [],
        },
      },
    });
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);

    render(<BusinessProfilePage />);

    expect(await screen.findByDisplayValue('Haircut')).toBeInTheDocument();
    // A restaurant-only "Manage products" link to /products must not appear.
    expect(screen.queryByRole('link', { name: /manage products/i })).not.toBeInTheDocument();
  });

  it('Priority 9 — real-estate business shows Products/Services with an inline property editor, isolated from salon/restaurant UI', async () => {
    const business = makeBusiness({
      category: 'real_estate',
      businessBrain: {
        ...makeBusiness().businessBrain,
        verticalProfile: {
          vertical: 'real_estate',
          properties: [
            {
              id: 'p1',
              title: 'Skyline Apartments',
              propertyType: 'apartment',
              price: 8500000,
              possessionStatus: 'ready_to_move',
              amenities: [],
              availability: 'available',
              active: true,
            },
          ],
        },
      },
    });
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);

    render(<BusinessProfilePage />);

    expect(await screen.findByDisplayValue('Skyline Apartments')).toBeInTheDocument();
    // Neither the restaurant nor the salon UI leaks into a real-estate business.
    expect(screen.queryByRole('link', { name: /manage products/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^services$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^packages$/i)).not.toBeInTheDocument();
  });

  it('restaurant business shows a read-only product summary linking to /products, not an inline editor', async () => {
    const business = makeBusiness();
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);
    listProductsMock.mockResolvedValue([
      { productId: 'p1', name: 'Paneer Biryani', price: 299 } as never,
    ]);

    render(<BusinessProfilePage />);

    expect(await screen.findByText('Paneer Biryani')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage products/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });

  it('Brand section links to /brand and never duplicates a brand-edit form (brand_kits is the real data source)', async () => {
    const business = makeBusiness();
    getByUserIdMock.mockResolvedValue([business]);
    getBusinessMock.mockResolvedValue(business);

    render(<BusinessProfilePage />);

    expect(await screen.findByText('Warm and welcoming')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit brand/i })).toHaveAttribute('href', '/brand');
  });
});
