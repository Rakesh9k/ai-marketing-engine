'use client';

import React from 'react';
import type { Client } from '@/types';

interface ClientSwitcherProps {
  clients: Client[];
  activeClient: Client | null;
  onSelectClient: (clientId: string) => void;
}

export const ClientSwitcher: React.FC<ClientSwitcherProps> = ({
  clients,
  activeClient,
  onSelectClient,
}) => {
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-slate-100">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Active Workspace:
        </span>
      </div>

      <select
        value={activeClient?.clientId || ''}
        onChange={(e) => onSelectClient(e.target.value)}
        className="cursor-pointer bg-transparent pr-4 text-sm font-medium text-white focus:outline-none"
        aria-label="Select Client Workspace"
      >
        {clients.map((client) => (
          <option
            key={client.clientId}
            value={client.clientId}
            className="bg-slate-900 text-slate-100"
          >
            {client.name} ({client.category.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
};
