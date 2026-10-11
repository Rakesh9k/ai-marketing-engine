'use client';

import React, { useState } from 'react';
import type { Client } from '@/types';

interface ClientDirectoryProps {
  clients: Client[];
  onSelectClient: (clientId: string) => void;
}

export const ClientDirectory: React.FC<ClientDirectoryProps> = ({ clients, onSelectClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Client Directory</h2>
          <p className="text-sm text-slate-400">
            Manage onboarding, credentials, and settings across your agency client accounts.
          </p>
        </div>

        <div className="flex w-full gap-3 md:w-auto">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none md:w-64"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Vertical Category</option>
            <option value="restaurant">Restaurant</option>
            <option value="salon">Salon</option>
            <option value="real_estate">Real Estate</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/80 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Allocated Credits</th>
              <th className="px-6 py-4">Inquiries</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredClients.map((client) => (
              <tr key={client.clientId} className="transition hover:bg-slate-900/40">
                <td className="px-6 py-4 font-semibold text-white">{client.name}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                  {client.category}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    {client.status}
                  </span>
                </td>
                <td className="px-6 py-4">{client.allocatedCredits.toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-amber-400">{client.totalInquiries}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onSelectClient(client.clientId)}
                    className="rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-600"
                  >
                    Switch Context
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
