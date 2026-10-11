import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AgencyDashboardPage from './page';

// Mock the hook
jest.mock('@/features/agency/hooks/useAgencyContext', () => ({
  useAgencyContext: () => ({
    agency: {
      agencyId: 'agency_brainwise_premier',
      name: 'Brainwise Premier Marketing Agency',
      ownerUserId: 'user_agency_admin_1',
      vertical: 'restaurant',
      members: [],
      clientCount: 3,
      allocatedCredits: 12500,
      totalCredits: 25000,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-10-09T12:00:00Z',
    },
    clients: [
      {
        clientId: 'client_bawarchi_kondapur',
        agencyId: 'agency_brainwise_premier',
        businessId: 'biz_bawarchi_kondapur',
        name: 'Bawarchi Biryani (Kondapur Branch)',
        category: 'restaurant',
        status: 'ACTIVE',
        allocatedCredits: 5000,
        usedCredits: 3200,
        activeCampaignsCount: 4,
        totalInquiries: 142,
        createdAt: '2026-01-20T09:00:00Z',
        updatedAt: '2026-10-09T11:00:00Z',
      },
    ],
    activeClient: {
      clientId: 'client_bawarchi_kondapur',
      agencyId: 'agency_brainwise_premier',
      businessId: 'biz_bawarchi_kondapur',
      name: 'Bawarchi Biryani (Kondapur Branch)',
      category: 'restaurant',
      status: 'ACTIVE',
      allocatedCredits: 5000,
      usedCredits: 3200,
      activeCampaignsCount: 4,
      totalInquiries: 142,
      createdAt: '2026-01-20T09:00:00Z',
      updatedAt: '2026-10-09T11:00:00Z',
    },
    loading: false,
    error: null,
    switchClient: jest.fn(),
  }),
}));

describe('AgencyDashboardPage Component', () => {
  it('renders agency title and header correctly', () => {
    render(<AgencyDashboardPage />);
    expect(screen.getByText('Brainwise Premier Marketing Agency')).toBeInTheDocument();
    expect(screen.getByText('Agency Workspace')).toBeInTheDocument();
  });

  it('allows tab switching between overview, clients, campaigns, and settings', () => {
    render(<AgencyDashboardPage />);
    const clientsTab = screen.getByRole('button', { name: /clients/i });
    fireEvent.click(clientsTab);
    expect(screen.getByText('Client Directory')).toBeInTheDocument();

    const campaignsTab = screen.getByRole('button', { name: /campaigns/i });
    fireEvent.click(campaignsTab);
    expect(screen.getByText('Cross-Client Campaigns')).toBeInTheDocument();
  });
});
