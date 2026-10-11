'use client';

import React from 'react';
import type { Agency } from '@/types';

interface AgencySettingsProps {
  agency: Agency;
}

export const AgencySettings: React.FC<AgencySettingsProps> = ({ agency }) => {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Agency Settings & Team</h2>
        <p className="text-sm text-slate-400">
          Manage your agency profile, team member roles, and security access controls.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-base font-bold text-white">Agency Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Agency Name</label>
            <input
              type="text"
              readOnly
              value={agency.name}
              className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Subscription Plan
            </label>
            <input
              type="text"
              readOnly
              value="Agency Workspace (Pro Tier)"
              className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-emerald-400"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Team Members & Access Roles</h3>
          <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500">
            + Invite Team Member
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {agency.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold text-white">{member.name}</p>
                <p className="text-xs text-slate-400">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
