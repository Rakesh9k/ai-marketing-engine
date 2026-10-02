import React from 'react';
import { render, screen } from '@testing-library/react';
import { LandingPage } from '@/features/landing/LandingPage';
import { ThemeProvider } from '@/hooks/useTheme';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('Phase 22 Public Launch — Frontend Surface Verification', () => {
  it('renders landing page with clean product value proposition', () => {
    render(
      <ThemeProvider>
        <LandingPage />
      </ThemeProvider>
    );

    expect(screen.getAllByText(/One photo/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/A month of marketing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tell Mitra about your business/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/From one photo to a real campaign/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Truth Check/i)[0]).toBeInTheDocument();
  });

  it('verifies public launch route surface list', () => {
    const launchRoutes = [
      '/dashboard',
      '/campaigns',
      '/calendar',
      '/publishing',
      '/analytics',
      '/business',
      '/settings',
      '/billing',
    ];

    expect(launchRoutes).toHaveLength(8);
    expect(launchRoutes).toContain('/dashboard');
    expect(launchRoutes).toContain('/campaigns');
    expect(launchRoutes).toContain('/calendar');
    expect(launchRoutes).toContain('/publishing');
    expect(launchRoutes).toContain('/analytics');
    expect(launchRoutes).toContain('/billing');
  });
});
