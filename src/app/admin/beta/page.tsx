'use client';

import { useState, useCallback } from 'react';
import { betaService, INITIAL_BETA_COHORT } from '@/services/betaService';
import type {
  BetaFrictionLog,
  FrictionSeverity,
  ResolutionStatus,
  WorkflowStage,
  FrictionIssueType,
} from '@/types/beta';

export default function BetaAdminPage() {
  const [summary, setSummary] = useState(betaService.getCohortSummary());
  const [frictionLogs, setFrictionLogs] = useState<BetaFrictionLog[]>(
    betaService.listFrictionLogs()
  );
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showAddLogModal, setShowAddLogModal] = useState(false);

  const [newLog, setNewLog] = useState<Omit<BetaFrictionLog, 'logId'>>({
    businessId: INITIAL_BETA_COHORT[0]!.businessId,
    businessName: INITIAL_BETA_COHORT[0]!.businessName,
    date: new Date().toISOString().split('T')[0]!,
    workflowStage: 'campaign_generation',
    issueType: 'CONFUSION',
    severity: 'P2',
    userQuote: '',
    founderIntervention: false,
    description: '',
    resolutionStatus: 'open',
  });

  const handleStatusChange = useCallback((logId: string, newStatus: ResolutionStatus) => {
    betaService.updateFrictionResolution(logId, newStatus);
    setFrictionLogs(betaService.listFrictionLogs());
    setSummary(betaService.getCohortSummary());
  }, []);

  const handleAddLog = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLog.description.trim()) return;

      const selectedBiz = INITIAL_BETA_COHORT.find((b) => b.businessId === newLog.businessId);

      const created: BetaFrictionLog = {
        logId: `flog_${Date.now()}`,
        ...newLog,
        businessName: selectedBiz?.businessName || newLog.businessName,
      };

      betaService.logFrictionIssue(created);
      setFrictionLogs(betaService.listFrictionLogs());
      setSummary(betaService.getCohortSummary());
      setShowAddLogModal(false);
      setNewLog({
        businessId: INITIAL_BETA_COHORT[0]!.businessId,
        businessName: INITIAL_BETA_COHORT[0]!.businessName,
        date: new Date().toISOString().split('T')[0]!,
        workflowStage: 'campaign_generation',
        issueType: 'CONFUSION',
        severity: 'P2',
        userQuote: '',
        founderIntervention: false,
        description: '',
        resolutionStatus: 'open',
      });
    },
    [newLog]
  );

  const filteredLogs = frictionLogs.filter((log) => {
    if (severityFilter === 'all') return true;
    return log.severity === severityFilter;
  });

  return (
    <div className="bg-bg-primary min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-brand-100 text-brand-800 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase">
                Phase 21 Beta
              </span>
              <h1 className="text-2xl font-bold text-neutral-900">
                Real Business Beta Command Center
              </h1>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Observing real restaurant & cloud kitchen owners using Mitra across campaign
              lifecycles
            </p>
          </div>
          <button
            onClick={() => setShowAddLogModal(true)}
            className="bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
          >
            + Log Beta Observation / Feedback
          </button>
        </div>

        {/* Cohort Metric Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Beta Cohort Size
            </p>
            <p className="mt-2 text-3xl font-black text-neutral-900">{summary.totalBusinesses}</p>
            <p className="mt-1 text-xs text-neutral-500">Restaurants & Cloud Kitchens</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Activated Businesses
            </p>
            <p className="text-brand-600 mt-2 text-3xl font-black">{summary.activatedCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Created $\ge$ 1 campaign</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Published Live Content
            </p>
            <p className="text-success-600 mt-2 text-3xl font-black">{summary.publishedCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Real IG/FB publications</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Second Campaign Repeat
            </p>
            <p className="text-brand-700 mt-2 text-3xl font-black">
              {summary.returningSecondCampaignCount}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {Math.round((summary.returningSecondCampaignCount / summary.totalBusinesses) * 100)}%
              retention signal
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Open Blockers (P0/P1)
            </p>
            <p
              className={`mt-2 text-3xl font-black ${summary.p0Blockers + summary.p1Blockers > 0 ? 'text-error-600' : 'text-neutral-900'}`}
            >
              {summary.p0Blockers + summary.p1Blockers}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Launch blocking issues</p>
          </div>
        </div>

        {/* User Journey Progression Funnel */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
          <h2 className="text-lg font-bold text-neutral-900">Beta User Journey Progression</h2>
          <p className="mb-6 text-sm text-neutral-500">
            Stage completion across the 8 cohort businesses
          </p>

          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                1. Onboarding
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">8 / 8</p>
              <span className="text-success-600 text-xs">100% Complete</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                2. Brain & Plan
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">8 / 8</p>
              <span className="text-success-600 text-xs">100% Complete</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                3. Campaign #1
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">8 / 8</p>
              <span className="text-success-600 text-xs">100% Complete</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                4. Meta Connected
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">7 / 8</p>
              <span className="text-xs text-neutral-600">87.5% Connected</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                5. Published #1
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">7 / 8</p>
              <span className="text-success-600 text-xs">87.5% Published</span>
            </div>
            <div className="bg-brand-50 border-brand-200 rounded-lg border p-3">
              <span className="text-brand-800 text-xs font-semibold uppercase">6. Campaign #2</span>
              <p className="text-brand-900 mt-1 text-2xl font-bold">6 / 8</p>
              <span className="text-brand-700 text-xs font-semibold">75% Repeat Rate</span>
            </div>
          </div>
        </div>

        {/* Cohort Businesses Table */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
          <h2 className="text-lg font-bold text-neutral-900">Beta Cohort Businesses</h2>
          <p className="mb-4 text-sm text-neutral-500">
            Real business profiles actively testing Mitra
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Vertical / Location</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-center">Socials</th>
                  <th className="px-4 py-3 text-center">Campaigns</th>
                  <th className="px-4 py-3 text-center">Published</th>
                  <th className="px-4 py-3 text-center">Repeat (Campaign #2)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {INITIAL_BETA_COHORT.map((biz) => (
                  <tr key={biz.betaId} className="transition-colors hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-semibold text-neutral-900">
                      {biz.businessName}
                      {biz.notes && (
                        <p className="mt-0.5 text-xs font-normal text-neutral-500">{biz.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 capitalize">
                      {biz.vertical.replace('_', ' ')}
                      <p className="text-xs text-neutral-400">
                        {biz.location.locality}, {biz.location.city}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {biz.primaryContact.name}
                      <p className="text-neutral-400">{biz.primaryContact.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {biz.socialPresence.instagramConnected ? (
                        <span className="bg-success-100 text-success-800 inline-block rounded-full px-2 py-0.5 text-xs">
                          IG Connected
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                          Pending IG
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-neutral-900">
                      {biz.campaignsCount}
                    </td>
                    <td className="text-success-600 px-4 py-3 text-center font-bold">
                      {biz.publishedCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {biz.secondCampaignCompleted ? (
                        <span className="bg-brand-100 text-brand-800 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium">
                          ✓ Completed #2
                        </span>
                      ) : (
                        <span className="bg-warning-100 text-warning-800 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          biz.betaStatus === 'completed'
                            ? 'bg-success-100 text-success-800'
                            : biz.betaStatus === 'active_campaign_2'
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {biz.betaStatus.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Beta Friction & Usability Log Table */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Beta Friction & Usability Log</h2>
              <p className="text-sm text-neutral-500">
                Categorized feedback, confusion points, and UX friction observed during beta
                sessions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="severity-filter" className="text-xs font-medium text-neutral-500">
                Filter Severity:
              </label>
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                <option value="all">All Severities</option>
                <option value="P0">P0 — Launch Blocker</option>
                <option value="P1">P1 — Workflow Blocker</option>
                <option value="P2">P2 — Significant Friction</option>
                <option value="P3">P3 — Minor Inconvenience</option>
                <option value="P4">P4 — Feature Request</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Stage & Category</th>
                  <th className="px-4 py-3">User Quote & Description</th>
                  <th className="px-4 py-3 text-center">Intervention</th>
                  <th className="px-4 py-3 text-center">Severity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLogs.map((log) => (
                  <tr key={log.logId} className="transition-colors hover:bg-neutral-50/50">
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-neutral-500">
                      {log.date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{log.businessName}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-neutral-700 capitalize">
                        {log.workflowStage.replace('_', ' ')}
                      </span>
                      <p className="text-neutral-400 capitalize">
                        {log.issueType.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800 italic">"{log.userQuote}"</p>
                      <p className="mt-1 text-xs text-neutral-500">{log.description}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.founderIntervention ? (
                        <span className="bg-warning-100 text-warning-800 inline-block rounded-full px-2 py-0.5 text-xs font-medium">
                          Founder Intervention
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                          Independent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          log.severity === 'P0' || log.severity === 'P1'
                            ? 'bg-error-100 text-error-800'
                            : log.severity === 'P2'
                              ? 'bg-warning-100 text-warning-800'
                              : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={log.resolutionStatus}
                        onChange={(e) =>
                          handleStatusChange(log.logId, e.target.value as ResolutionStatus)
                        }
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                          log.resolutionStatus === 'resolved'
                            ? 'border-success-300 bg-success-50 text-success-800'
                            : 'border-neutral-300 bg-white text-neutral-700'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="mitigated">Mitigated</option>
                        <option value="resolved">Resolved</option>
                        <option value="deferred">Deferred</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Observation Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900">Log Beta Observation / Feedback</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Record usability findings from real business owner sessions
            </p>

            <form onSubmit={handleAddLog} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Business</label>
                <select
                  value={newLog.businessId}
                  onChange={(e) => {
                    const biz = INITIAL_BETA_COHORT.find((b) => b.businessId === e.target.value);
                    setNewLog({
                      ...newLog,
                      businessId: e.target.value,
                      businessName: biz?.businessName || '',
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  {INITIAL_BETA_COHORT.map((b) => (
                    <option key={b.businessId} value={b.businessId}>
                      {b.businessName} ({b.location.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">
                    Workflow Stage
                  </label>
                  <select
                    value={newLog.workflowStage}
                    onChange={(e) =>
                      setNewLog({ ...newLog, workflowStage: e.target.value as WorkflowStage })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm capitalize"
                  >
                    {[
                      'signup',
                      'onboarding',
                      'business_brain',
                      'calendar',
                      'campaign_generation',
                      'review',
                      'meta_connection',
                      'scheduling',
                      'publishing',
                      'performance',
                      'billing',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">
                    Issue Category
                  </label>
                  <select
                    value={newLog.issueType}
                    onChange={(e) =>
                      setNewLog({ ...newLog, issueType: e.target.value as FrictionIssueType })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    {[
                      'BUG',
                      'UX_FRICTION',
                      'CONFUSION',
                      'CONTENT_QUALITY',
                      'FACTUAL_ERROR',
                      'PERFORMANCE',
                      'PAYMENT',
                      'PUBLISHING',
                      'ONBOARDING',
                      'FEATURE_REQUEST',
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Severity</label>
                  <select
                    value={newLog.severity}
                    onChange={(e) =>
                      setNewLog({ ...newLog, severity: e.target.value as FrictionSeverity })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    <option value="P0">P0 — Launch Blocker</option>
                    <option value="P1">P1 — Workflow Blocker</option>
                    <option value="P2">P2 — Significant Friction</option>
                    <option value="P3">P3 — Minor Inconvenience</option>
                    <option value="P4">P4 — Feature Request</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={newLog.founderIntervention}
                      onChange={(e) =>
                        setNewLog({ ...newLog, founderIntervention: e.target.checked })
                      }
                      className="text-brand-600 focus:ring-brand-500 rounded border-neutral-300"
                    />
                    Founder Intervention Required
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">User Quote</label>
                <input
                  type="text"
                  placeholder='e.g. "Did it publish to Instagram?"'
                  value={newLog.userQuote}
                  onChange={(e) => setNewLog({ ...newLog, userQuote: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the exact friction point and observed user behavior..."
                  value={newLog.description}
                  onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 text-sm font-medium text-white"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
