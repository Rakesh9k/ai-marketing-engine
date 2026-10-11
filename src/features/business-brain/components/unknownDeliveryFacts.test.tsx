import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business } from '@/types';

/**
 * Unknown is not zero and not a reasonable default. The Business Brain screens showed "10 km" when no
 * delivery radius was stored, and the editors opened at 10 km / ₹0 and SAVED those numbers on any save, even
 * with nothing changed. They became facts Mitra could state ("we deliver within 10 km") that the owner never
 * said. An unknown value is shown as not set and is never sent.
 */
const callFunctionMock = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

const getByUserIdMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: { getByUserId: (...a: unknown[]) => getByUserIdMock(...a) },
  brandKitService: { get: jest.fn().mockResolvedValue(null) },
  productService: { listByBusiness: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../services/businessBrainService', () => ({
  getBusinessBrainContext: jest.fn().mockResolvedValue({ business: {} }),
}));

import { LocationsSection } from './LocationsSection';
import { OffersSection } from './OffersSection';
import { RulesSection } from './RulesSection';
import { BusinessBrainDashboard } from './BusinessBrainDashboard';

const business = (businessRules?: Record<string, unknown>): Business =>
  ({
    businessId: 'b1',
    userId: 'u1',
    name: 'Glow Studio',
    category: 'salon',
    location: { city: 'Pune', state: 'Maharashtra' },
    contact: { phone: '9822012345', whatsapp: '9822012345' },
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    businessBrain: businessRules
      ? {
          identity: {
            name: 'Glow Studio',
            category: 'salon',
            description: '',
            location: { city: 'Pune', state: 'Maharashtra' },
            contact: {},
          },
          products: [],
          brand: {
            tone: 'friendly',
            personality: '',
            visualPreferences: '',
            colors: {},
            fonts: {},
          },
          audience: {
            targetCustomer: '',
            ageRange: { min: 18, max: 65 },
            localities: [],
            preferences: '',
          },
          localization: {
            primaryLanguage: 'en',
            secondaryLanguage: 'en',
            regionalStyle: 'neutral',
            slangIntensity: 'light',
            languageMixing: 'minimal',
          },
          businessRules: {
            openingHours: {},
            offerValidityRules: '',
            pricingRules: '',
            ...businessRules,
          },
          campaignHistory: [],
          lastSyncedAt: new Date().toISOString(),
        }
      : {},
  }) as unknown as Business;

/** What updateBusinessBrain was asked to store, across all calls. */
const sentRules = () =>
  callFunctionMock.mock.calls
    .filter(([arg]) => (arg as { functionName: string }).functionName === 'updateBusinessBrain')
    .map(
      ([arg]) =>
        (arg as { data: { businessRules?: Record<string, unknown> } }).data.businessRules ?? {}
    );

beforeEach(() => callFunctionMock.mockClear());

describe('Locations editor: delivery radius', () => {
  it('opens empty when the owner never gave one, and saving sends no radius', async () => {
    const user = userEvent.setup();
    render(<LocationsSection business={business()} onSaved={jest.fn()} onCancel={jest.fn()} />);
    const radius = screen.getByLabelText(/Delivery \/ Service Radius/i) as HTMLInputElement;
    expect(radius.value).toBe('');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalled());
    for (const rules of sentRules()) expect(rules).not.toHaveProperty('deliveryRadiusKm');
  });

  it('shows and saves a radius the owner gave', async () => {
    const user = userEvent.setup();
    render(
      <LocationsSection
        business={business({ deliveryRadiusKm: 7 })}
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect((screen.getByLabelText(/Delivery \/ Service Radius/i) as HTMLInputElement).value).toBe(
      '7'
    );
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(sentRules().some((r) => r['deliveryRadiusKm'] === 7)).toBe(true));
  });

  it('a radius typed by the owner is sent', async () => {
    const user = userEvent.setup();
    render(<LocationsSection business={business()} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText(/Delivery \/ Service Radius/i), '4');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(sentRules().some((r) => r['deliveryRadiusKm'] === 4)).toBe(true));
  });
});

describe('Offers editor: minimum order', () => {
  it('opens empty when unknown, and saving sends no minimum order', async () => {
    const user = userEvent.setup();
    render(<OffersSection business={business()} onSaved={jest.fn()} onCancel={jest.fn()} />);
    expect((screen.getByLabelText(/Minimum Order Amount/i) as HTMLInputElement).value).toBe('');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalled());
    for (const rules of sentRules()) expect(rules).not.toHaveProperty('minimumOrder');
  });

  it('shows and saves a minimum the owner gave', async () => {
    const user = userEvent.setup();
    render(
      <OffersSection
        business={business({ minimumOrder: 250 })}
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect((screen.getByLabelText(/Minimum Order Amount/i) as HTMLInputElement).value).toBe('250');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(sentRules().some((r) => r['minimumOrder'] === 250)).toBe(true));
  });
});

describe('Rules editor', () => {
  it('with no stored rules, saving invents no radius, minimum order or operating mode', async () => {
    const user = userEvent.setup();
    render(<RulesSection business={business()} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalled());
    for (const rules of sentRules()) {
      expect(rules).not.toHaveProperty('deliveryRadiusKm');
      expect(rules).not.toHaveProperty('minimumOrder');
      expect(rules).not.toHaveProperty('operatingMode');
    }
  });

  it('stored rules are sent back unchanged', async () => {
    const user = userEvent.setup();
    render(
      <RulesSection
        business={business({ deliveryRadiusKm: 6, minimumOrder: 300, operatingMode: 'delivery' })}
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(
        sentRules().some(
          (r) =>
            r['deliveryRadiusKm'] === 6 &&
            r['minimumOrder'] === 300 &&
            r['operatingMode'] === 'delivery'
        )
      ).toBe(true)
    );
  });
});

describe('Business Brain dashboard', () => {
  it('says "Not set" for a delivery radius nobody gave, never a made-up number', async () => {
    getByUserIdMock.mockResolvedValue([business({})]);
    render(<BusinessBrainDashboard userId="u1" />);
    await screen.findByText("Your Business. Mitra's Understanding.");
    expect(screen.getByText(/Delivery Radius:/i).textContent).toMatch(/Not set/);
    expect(screen.getByText(/Delivery Radius:/i).textContent).not.toMatch(/\d+ km/);
  });

  it('shows the radius the owner gave', async () => {
    getByUserIdMock.mockResolvedValue([business({ deliveryRadiusKm: 7 })]);
    render(<BusinessBrainDashboard userId="u1" />);
    await screen.findByText("Your Business. Mitra's Understanding.");
    expect(screen.getByText(/Delivery Radius:/i).textContent).toMatch(/7 km/);
  });
});
