'use client';

import React, { useState } from 'react';
import { useAgencyContext } from '@/features/agency/hooks/useAgencyContext';
import { ClientSwitcher } from '@/features/agency/components/ClientSwitcher';
import { AgencyOverview } from '@/features/agency/components/AgencyOverview';
import { ClientDirectory } from '@/features/agency/components/ClientDirectory';
import { MultiClientCampaignTable } from '@/features/agency/components/MultiClientCampaignTable';
import { AgencySettings } from '@/features/agency/components/AgencySettings';

type TabType = 'overview' | 'clients' | 'campaigns' | 'settings';

export default function AgencyDashboardPage() {
  const { agency, clients, activeClient, loading, error, switchClient } = useAgencyContext();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span>Loading Agency Workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-rose-400">
        <p>Error loading agency context. Please ensure you are logged into an Agency account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-slate-950 p-6 text-slate-100 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-800/80 pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold tracking-wider text-indigo-400 uppercase">
              Agency Workspace
            </span>
            <span className="text-xs text-slate-500">Tenant ID: {agency.agencyId}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">{agency.name}</h1>
        </div>

        <ClientSwitcher
          clients={clients}
          activeClient={activeClient}
          onSelectClient={switchClient}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-800/80 pb-3">
        {(['overview', 'clients', 'campaigns', 'settings'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <main>
        {activeTab === 'overview' && (
          <AgencyOverview
            agency={agency}
            clients={clients}
            activeClient={activeClient}
            onSelectClient={switchClient}
          />
        )}
        {activeTab === 'clients' && (
          <ClientDirectory clients={clients} onSelectClient={switchClient} />
        )}
        {activeTab === 'campaigns' && <MultiClientCampaignTable clients={clients} />}
        {activeTab === 'settings' && <AgencySettings agency={agency} />}
      </main>
    </div>
  );
}
