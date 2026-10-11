'use client';

import React from 'react';
import type { Agency, Client } from '@/types';

interface AgencyOverviewProps {
  agency: Agency;
  clients: Client[];
  activeClient: Client | null;
  onSelectClient: (clientId: string) => void;
}

export const AgencyOverview: React.FC<AgencyOverviewProps> = ({
  agency,
  clients,
  activeClient,
  onSelectClient,
}) => {
  const totalCampaigns = clients.reduce((acc, c) => acc + c.activeCampaignsCount, 0);
  const totalInquiries = clients.reduce((acc, c) => acc + c.totalInquiries, 0);

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            Managed Clients
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{agency.clientCount}</span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              Active Plan
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            Active Campaigns
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{totalCampaigns}</span>
            <span className="text-xs text-slate-400">Across {clients.length} Businesses</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            Attributed Inquiries
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-400">{totalInquiries}</span>
            <span className="text-xs text-emerald-400">+18% this month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            Agency Credit Ledger
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-indigo-400">
              {agency.allocatedCredits.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">/ {agency.totalCredits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Active Workspace Banner */}
      {activeClient && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 p-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold tracking-wider text-indigo-300 uppercase">
                Current Focus Client
              </span>
              <span className="text-xs text-slate-400">
                Category: {activeClient.category.toUpperCase()}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">{activeClient.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {activeClient.activeCampaignsCount} Active Campaigns • {activeClient.totalInquiries}{' '}
              Inquiries Received • {activeClient.usedCredits} Credits Used
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Open Client Workspace
            </button>
          </div>
        </div>
      )}

      {/* Client Quick Selector Cards */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Managed Client Businesses</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {clients.map((client) => {
            const isSelected = activeClient?.clientId === client.clientId;
            return (
              <div
                key={client.clientId}
                onClick={() => onSelectClient(client.clientId)}
                className={`cursor-pointer rounded-2xl border p-5 transition ${
                  isSelected
                    ? 'border-indigo-500 bg-slate-900 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    {client.category}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <h4 className="mt-2 text-base font-bold text-white">{client.name}</h4>
                <div className="mt-4 flex justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                  <span>{client.activeCampaignsCount} Campaigns</span>
                  <span>{client.totalInquiries} Inquiries</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
