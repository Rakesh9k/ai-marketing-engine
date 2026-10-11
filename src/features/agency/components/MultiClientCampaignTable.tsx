'use client';

import React from 'react';
import type { Client } from '@/types';

interface MultiClientCampaignTableProps {
  clients: Client[];
}

export const MultiClientCampaignTable: React.FC<MultiClientCampaignTableProps> = ({ clients }) => {
  // Aggregate mock campaign records across clients
  const mockCampaigns = [
    {
      id: 'cmp_101',
      name: 'Weekend Biryani Combo Special',
      clientName: clients[0]?.name || 'Bawarchi Biryani',
      category: 'restaurant',
      status: 'ACTIVE',
      clicks: 480,
      inquiries: 64,
      ctr: '13.3%',
    },
    {
      id: 'cmp_102',
      name: 'Festive Family Dining Offer',
      clientName: clients[0]?.name || 'Bawarchi Biryani',
      category: 'restaurant',
      status: 'ACTIVE',
      clicks: 310,
      inquiries: 42,
      ctr: '13.5%',
    },
    {
      id: 'cmp_201',
      name: 'Bridal Glow Package Promotion',
      clientName: clients[1]?.name || 'Aura Luxury Salon',
      category: 'salon',
      status: 'ACTIVE',
      clicks: 290,
      inquiries: 38,
      ctr: '13.1%',
    },
    {
      id: 'cmp_301',
      name: '3BHK Open House Invitation',
      clientName: clients[2]?.name || 'Prestige Heights',
      category: 'real_estate',
      status: 'ACTIVE',
      clicks: 410,
      inquiries: 51,
      ctr: '12.4%',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Cross-Client Campaigns</h2>
        <p className="text-sm text-slate-400">
          Monitor campaign output and outcome metrics across all client accounts.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/80 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-4">Campaign Name</th>
              <th className="px-6 py-4">Client Business</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">WhatsApp Clicks</th>
              <th className="px-6 py-4">Inquiries</th>
              <th className="px-6 py-4">CTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {mockCampaigns.map((cmp) => (
              <tr key={cmp.id} className="transition hover:bg-slate-900/40">
                <td className="px-6 py-4 font-semibold text-white">{cmp.name}</td>
                <td className="px-6 py-4 text-slate-300">{cmp.clientName}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    {cmp.status}
                  </span>
                </td>
                <td className="px-6 py-4">{cmp.clicks}</td>
                <td className="px-6 py-4 font-bold text-amber-400">{cmp.inquiries}</td>
                <td className="px-6 py-4 font-medium text-emerald-400">{cmp.ctr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
