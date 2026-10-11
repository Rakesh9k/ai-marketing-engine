'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agency, Client } from '@/types';

// Mock/Initial state provider for agency management
export function useAgencyContext() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, _setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulated agency data fetch (backed by Firestore agencyId collection)
    const timer = setTimeout(() => {
      const mockAgency: Agency = {
        agencyId: 'agency_brainwise_premier',
        name: 'Brainwise Premier Marketing Agency',
        ownerUserId: 'user_agency_admin_1',
        vertical: 'restaurant',
        members: [
          {
            userId: 'user_agency_admin_1',
            email: 'admin@brainwise-agency.com',
            name: 'Vikram Sharma (Admin)',
            role: 'agency_admin',
            addedAt: '2026-01-15T10:00:00Z',
          },
          {
            userId: 'user_agency_staff_2',
            email: 'sarah@brainwise-agency.com',
            name: 'Sarah Jenkins (Account Lead)',
            role: 'agency_member',
            assignedClientIds: ['client_bawarchi_kondapur', 'client_aura_salon_gachibowli'],
            addedAt: '2026-02-01T14:30:00Z',
          },
        ],
        clientCount: 3,
        allocatedCredits: 12500,
        totalCredits: 25000,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-10-09T12:00:00Z',
      };

      const mockClients: Client[] = [
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
        {
          clientId: 'client_aura_salon_gachibowli',
          agencyId: 'agency_brainwise_premier',
          businessId: 'biz_aura_salon_gachibowli',
          name: 'Aura Luxury Salon & Spa (Gachibowli)',
          category: 'salon',
          status: 'ACTIVE',
          allocatedCredits: 4000,
          usedCredits: 2150,
          activeCampaignsCount: 2,
          totalInquiries: 89,
          createdAt: '2026-02-10T11:00:00Z',
          updatedAt: '2026-10-08T16:00:00Z',
        },
        {
          clientId: 'client_prestige_heights_hitech',
          agencyId: 'agency_brainwise_premier',
          businessId: 'biz_prestige_heights_hitech',
          name: 'Prestige Heights Luxury Apartments',
          category: 'real_estate',
          status: 'ACTIVE',
          allocatedCredits: 3500,
          usedCredits: 1800,
          activeCampaignsCount: 3,
          totalInquiries: 67,
          createdAt: '2026-03-01T15:00:00Z',
          updatedAt: '2026-10-09T10:30:00Z',
        },
      ];

      setAgency(mockAgency);
      setClients(mockClients);
      setActiveClient(mockClients[0] ?? null);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const switchClient = useCallback(
    (clientId: string) => {
      const target = clients.find((c) => c.clientId === clientId);
      if (target) {
        setActiveClient(target);
      }
    },
    [clients]
  );

  return {
    agency,
    clients,
    activeClient,
    loading,
    error,
    switchClient,
  };
}
