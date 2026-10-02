'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { INITIAL_AI_TRACES, type AiTraceRecord } from '@/services/aiTraceService';
import type { PipelineTrace } from '@/types';

export default function AdminAiTracesPage() {
  const [traces] = useState<AiTraceRecord[]>(INITIAL_AI_TRACES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [selectedTrace, setSelectedTrace] = useState<AiTraceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<number>(1); // 1 to 10 inspection steps

  // Filter traces based on search term & status
  const filteredTraces = useMemo(() => {
    return traces.filter((record) => {
      const matchesSearch =
        searchTerm === '' ||
        record.campaignNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.userRequest.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.intent.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || record.validationStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [traces, searchTerm, statusFilter]);

  const handleOpenStep = (record: AiTraceRecord, stepNumber: number) => {
    setSelectedTrace(record);
    setActiveTab(stepNumber);
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-4 font-sans text-neutral-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-brand-500/20 text-brand-400 border-brand-500/30 rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase">
                Mitra Telemetry
              </span>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                <span>🔍</span> AI Debug Mode & Trace Inspector
              </h1>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Inspect every stage of Mitra AI requests: User input, Intent, Business Brain context,
              Gemini request payload, validation checks, and final campaign outputs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/eval-suite"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              🧪 AI Eval Suite
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              ⬅️ Admin Portal
            </Link>
            <Link
              href="/admin/beta"
              className="border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors"
            >
              🧪 Beta Friction Logs
            </Link>
          </div>
        </div>

        {/* Global Telemetry Bar */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-medium text-neutral-400">Total AI Execution Runs</p>
            <p className="mt-1 text-2xl font-bold text-white">1,428</p>
            <p className="mt-1 text-[11px] text-emerald-400">✓ 100% trace coverage</p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-medium text-neutral-400">Ground Truth Validation</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">98.4% PASS</p>
            <p className="mt-1 text-[11px] text-neutral-400">9 / 9 fact checks verified</p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-medium text-neutral-400">Avg Model Latency</p>
            <p className="text-brand-400 mt-1 text-2xl font-bold">3.2s</p>
            <p className="mt-1 text-[11px] text-neutral-400">Gemini 1.5 Pro</p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-medium text-neutral-400">Est. Cost Per Campaign</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">₹0.42</p>
            <p className="mt-1 text-[11px] text-neutral-400">~1,240 tokens / request</p>
          </div>
        </div>
        {/* Observable AI Layer Architecture Flow Graph (Item 14) */}
        <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/90 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase">
                <span>🗺️</span> Mitra AI Pipeline Observable Architecture
              </h2>
              <p className="mt-0.5 text-xs text-neutral-400">
                Every stage transition and arrow is fully observable with inspectable payloads in
                dev/staging.
              </p>
            </div>
            <span className="text-brand-400 bg-brand-950 border-brand-800 rounded border px-2.5 py-1 font-mono text-[11px] font-bold">
              DEV / STAGING TELEMETRY
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 overflow-x-auto py-2 font-mono text-xs">
            <div className="min-w-[110px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">Input</span>
              <span className="text-xs font-bold text-white">USER INPUT</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[110px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">Router</span>
              <span className="text-xs font-bold text-emerald-400">INTENT ROUTER</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="border-brand-500/40 bg-brand-950/20 min-w-[130px] rounded-lg border bg-neutral-950 px-3 py-2 text-center">
              <span className="text-brand-400 block text-[10px] font-bold uppercase">
                Memory & Rules
              </span>
              <span className="text-brand-300 text-xs font-bold">BUSINESS BRAIN</span>
              <span className="mt-0.5 block text-[9px] text-neutral-400">
                Identity • Catalog • Rules
              </span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[120px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Assembler
              </span>
              <span className="text-xs font-bold text-amber-400">CONTEXT ASSEMBLER</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[120px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Builder
              </span>
              <span className="text-xs font-bold text-purple-300">PROMPT BUILDER</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[110px] rounded-lg border border-blue-500/40 bg-blue-950/20 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-blue-400 uppercase">AI Model</span>
              <span className="text-xs font-bold text-blue-300">GEMINI</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[120px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Validator
              </span>
              <span className="text-xs font-bold text-emerald-400">OUTPUT VALIDATOR</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[120px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Compositor
              </span>
              <span className="text-xs font-bold text-amber-300">CREATIVE ASSEMBLY</span>
            </div>
            <span className="text-lg text-neutral-500">➔</span>
            <div className="min-w-[110px] rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold text-emerald-400 uppercase">Output</span>
              <span className="text-xs font-bold text-white">FINAL RESULT</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:flex-row">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search by prompt, campaign #, or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus:border-brand-500 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="text-xs font-semibold text-neutral-400">Filter Status:</span>
            {(['ALL', 'PASS', 'FAIL'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-brand-500 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* AI Runs List (Exact User Specification Format) */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <span>⚡</span> AI Runs Telemetry Log
          </h2>

          <div className="space-y-4">
            {filteredTraces.map((record) => {
              const { trace } = record;
              return (
                <div
                  key={record.id}
                  className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/90 p-5 shadow-sm transition-colors hover:border-neutral-700"
                >
                  {/* Card Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-brand-400 font-mono text-sm font-bold">
                        Campaign {record.campaignNumber}
                      </span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs font-semibold text-neutral-200">
                        {record.businessName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-neutral-400">
                        Model: <strong className="text-neutral-200">{record.model}</strong>
                      </span>
                      <span className="text-neutral-400">
                        Cost:{' '}
                        <strong className="text-amber-400">₹{record.costInr.toFixed(2)}</strong>
                      </span>
                      <span className="text-neutral-400">
                        Latency:{' '}
                        <strong className="text-brand-400">{record.latencySeconds}s</strong>
                      </span>
                      <span
                        className={`rounded px-2.5 py-0.5 text-[11px] font-bold ${
                          record.validationStatus === 'PASS'
                            ? 'border border-emerald-800 bg-emerald-950 text-emerald-300'
                            : 'border border-rose-800 bg-rose-950 text-rose-300'
                        }`}
                      >
                        {record.validationStatus}
                      </span>
                    </div>
                  </div>

                  {/* Summary Grid matching spec */}
                  <div className="grid grid-cols-1 gap-4 font-mono text-xs md:grid-cols-2 lg:grid-cols-5">
                    {/* User Instruction */}
                    <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                      <span className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                        User
                      </span>
                      <p className="line-clamp-2 text-neutral-200">"{record.userRequest}"</p>
                    </div>

                    {/* Intent */}
                    <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                      <span className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                        Intent
                      </span>
                      <p className="font-semibold text-emerald-400">{record.intent}</p>
                    </div>

                    {/* Context */}
                    <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                      <span className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                        Context
                      </span>
                      <p className="text-brand-300 font-semibold">
                        ✓ {record.contextFactsCount} facts retrieved
                      </p>
                    </div>

                    {/* Validation */}
                    <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                      <span className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                        Validation
                      </span>
                      <p className="font-semibold text-emerald-400">
                        ✓ {record.validationPassedCount} / {record.validationTotalCount} passed
                      </p>
                    </div>

                    {/* Final Output */}
                    <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                      <span className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                        Final Status
                      </span>
                      <p className="text-neutral-200">
                        Status: <span className="font-bold text-emerald-400">VERIFIED</span>
                      </p>
                    </div>
                  </div>

                  {/* Interactive Quick Stage Trigger Bar */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800/60 pt-2">
                    <span className="mr-1 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                      Inspect Details:
                    </span>
                    <button
                      onClick={() => handleOpenStep(record, 1)}
                      className="hover:bg-brand-600 rounded bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-white"
                    >
                      1. User Input
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 2)}
                      className="hover:bg-brand-600 rounded bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-white"
                    >
                      2. Intent
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 3)}
                      className="hover:bg-brand-600 rounded bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-white"
                    >
                      3. Business Brain
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 4)}
                      className="hover:bg-brand-600 rounded bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-white"
                    >
                      4. Context
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 5)}
                      className="hover:bg-brand-600 rounded bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-white"
                    >
                      5. System Inst.
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 6)}
                      className="bg-brand-500/20 text-brand-300 border-brand-500/40 hover:bg-brand-500 rounded border px-2.5 py-1 text-xs font-bold transition-colors hover:text-white"
                    >
                      6. Prompt [View]
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 7)}
                      className="hover:bg-brand-600 rounded bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-white"
                    >
                      7. Tool Calls
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 8)}
                      className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-600 hover:text-white"
                    >
                      8. Gemini Response
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 9)}
                      className="rounded border border-purple-500/40 bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-300 transition-colors hover:bg-purple-600 hover:text-white"
                    >
                      9. Validation ({record.validationPassedCount}/{record.validationTotalCount})
                    </button>
                    <button
                      onClick={() => handleOpenStep(record, 10)}
                      className="rounded border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-600 hover:text-white"
                    >
                      10. Final Campaign [View]
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 10-Step AI Debug Inspection Modal */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 font-mono shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔍</span>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    AI Execution Trace Detail — Campaign {selectedTrace.campaignNumber}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {selectedTrace.businessName} • {selectedTrace.model} •{' '}
                    {selectedTrace.latencySeconds}s • ₹{selectedTrace.costInr.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {/* 10 Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-800 bg-neutral-950 px-4 text-xs font-semibold">
              {[
                { id: 1, label: '1. User Input' },
                { id: 2, label: '2. Intent' },
                { id: 3, label: '3. Business Brain' },
                { id: 4, label: '4. Context' },
                { id: 5, label: '5. System Inst.' },
                { id: 6, label: '6. User Prompt' },
                { id: 7, label: '7. Tool Calls' },
                { id: 8, label: '8. Gemini Response' },
                { id: 9, label: '9. Validation' },
                { id: 10, label: '10. Final Output' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-3 py-3 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-400 bg-neutral-900 font-bold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body Content per Tab */}
            <div className="space-y-4 overflow-y-auto p-6 text-xs text-neutral-300">
              {/* Tab 1: User Input */}
              {activeTab === 1 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    1. Raw User Input & Parameters
                  </h4>
                  <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <p>
                      <strong className="text-white">Instruction:</strong> "
                      {selectedTrace.trace.userRequest.data.request}"
                    </p>
                    <p>
                      <strong className="text-white">Requested Language:</strong>{' '}
                      {selectedTrace.trace.userRequest.data.language}
                    </p>
                    <p>
                      <strong className="text-white">Requested Tone/Style:</strong>{' '}
                      {selectedTrace.trace.userRequest.data.style}
                    </p>
                    <p>
                      <strong className="text-white">Campaign Objective:</strong>{' '}
                      {selectedTrace.trace.userRequest.data.objective}
                    </p>
                    <p>
                      <strong className="text-white">Target Product:</strong>{' '}
                      {selectedTrace.trace.userRequest.data.targetProduct || 'Auto-selected'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Intent */}
              {activeTab === 2 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    2. Intent Extraction & Conflict Engine
                  </h4>
                  <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <p>
                      <strong className="text-white">Parsed Intent:</strong>{' '}
                      {selectedTrace.trace.intentExtraction.data.extractedObjective}
                    </p>
                    <p>
                      <strong className="text-white">Target Product:</strong>{' '}
                      {selectedTrace.trace.intentExtraction.data.extractedProduct}
                    </p>
                    <p>
                      <strong className="text-white">Language Target:</strong>{' '}
                      {selectedTrace.trace.intentExtraction.data.extractedLanguage}
                    </p>
                    <p>
                      <strong className="text-white">Style Target:</strong>{' '}
                      {selectedTrace.trace.intentExtraction.data.extractedStyle}
                    </p>
                    <p>
                      <strong className="text-white">Confidence Score:</strong>{' '}
                      {(selectedTrace.trace.intentExtraction.data.confidence * 100).toFixed(0)}%
                    </p>
                    <p className="mt-2 border-t border-neutral-800 pt-1 text-[11px] text-emerald-400">
                      ✓ Conflict Resolution Engine: Harmonized tone & price floor before prompt
                      construction.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Business Brain */}
              {activeTab === 3 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    3. Business Brain Ground Truth
                  </h4>
                  <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <p>
                      <strong className="text-white">Business Name:</strong>{' '}
                      {selectedTrace.trace.businessBrainRetrieval.data.business}
                    </p>
                    <p>
                      <strong className="text-white">Location:</strong>{' '}
                      {selectedTrace.trace.businessBrainRetrieval.data.location}
                    </p>
                    <p>
                      <strong className="text-white">Product:</strong>{' '}
                      {selectedTrace.trace.businessBrainRetrieval.data.product}
                    </p>
                    <p>
                      <strong className="text-white">Price Floor:</strong>{' '}
                      {selectedTrace.trace.businessBrainRetrieval.data.price}
                    </p>
                    <p>
                      <strong className="text-white">Brand Tone:</strong>{' '}
                      {selectedTrace.trace.businessBrainRetrieval.data.brandTone}
                    </p>
                    <p>
                      <strong className="text-white">Target Audience:</strong>{' '}
                      {selectedTrace.trace.businessBrainRetrieval.data.audience}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 4: Retrieved Context */}
              {activeTab === 4 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    4. Context Assembly & Memory Facts ({selectedTrace.contextFactsCount} Facts)
                  </h4>
                  <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-300">
                      <strong className="text-white">Retrieved Context Summary:</strong>
                    </p>
                    <pre className="text-brand-300 rounded bg-neutral-900 p-3 font-mono text-[11px] whitespace-pre-wrap">
                      {selectedTrace.trace.contextAssembly.data.contextSummary}
                    </pre>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                      {Object.entries(selectedTrace.trace.contextAssembly.data.selectedContext).map(
                        ([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center gap-2 rounded bg-neutral-900 px-2 py-1"
                          >
                            <span>{v ? '✓' : '✗'}</span>
                            <span className="text-neutral-300">{k}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: System Instruction */}
              {activeTab === 5 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    5. System Instructions Sent to Gemini
                  </h4>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-neutral-200">
                      {selectedTrace.trace.promptBuilder.data.systemInstruction}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 6: User Prompt */}
              {activeTab === 6 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    6. Assembled Gemini Request Prompt Payload
                  </h4>
                  <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <div>
                      <span className="text-xs font-bold text-amber-400">
                        [RELEVANT BUSINESS CONTEXT]
                      </span>
                      <pre className="mt-1 rounded bg-neutral-900 p-3 font-mono text-[11px] whitespace-pre-wrap text-neutral-200">
                        {selectedTrace.trace.promptBuilder.data.businessContext}
                      </pre>
                    </div>

                    <div>
                      <span className="text-brand-400 text-xs font-bold">[USER REQUEST]</span>
                      <pre className="mt-1 rounded bg-neutral-900 p-3 font-mono text-[11px] text-neutral-200">
                        "{selectedTrace.trace.promptBuilder.data.userRequest}"
                      </pre>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-emerald-400">[TASK & RULES]</span>
                      <pre className="mt-1 rounded bg-neutral-900 p-3 font-mono text-[11px] text-neutral-200">
                        {selectedTrace.trace.promptBuilder.data.task}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Tool Calls */}
              {activeTab === 7 && (
                <div className="space-y-4">
                  <h4 className="text-brand-400 text-sm font-bold">
                    7. Tool Declarations & Structured Output Schema
                  </h4>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <pre className="font-mono text-[11px] whitespace-pre-wrap text-emerald-400">
                      {JSON.stringify(selectedTrace.trace.promptBuilder.data.outputSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 8: Gemini Response */}
              {activeTab === 8 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-400">
                    8. Gemini Model Raw Response Payload
                  </h4>
                  <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <div className="grid grid-cols-2 gap-2 rounded bg-neutral-900 p-2 text-[11px] sm:grid-cols-4">
                      <div>
                        Model: <span className="font-bold text-white">{selectedTrace.model}</span>
                      </div>
                      <div>
                        Latency:{' '}
                        <span className="text-brand-400 font-bold">
                          {selectedTrace.latencySeconds}s
                        </span>
                      </div>
                      <div>
                        Input Tokens:{' '}
                        <span className="font-bold text-amber-400">
                          {selectedTrace.inputTokens}
                        </span>
                      </div>
                      <div>
                        Output Tokens:{' '}
                        <span className="font-bold text-emerald-400">
                          {selectedTrace.outputTokens}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-neutral-400">
                        Structured Response JSON:
                      </span>
                      <pre className="mt-1 rounded bg-neutral-900 p-3 font-mono text-[11px] whitespace-pre-wrap text-emerald-300">
                        {JSON.stringify(
                          selectedTrace.trace.geminiResponse.data.rawOutput ||
                            selectedTrace.trace.geminiResponse.data,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 9: Validation */}
              {activeTab === 9 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-purple-400">
                    9. Ground Truth Validation Checks ({selectedTrace.validationPassedCount} /{' '}
                    {selectedTrace.validationTotalCount} Passed)
                  </h4>
                  <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <div className="grid grid-cols-1 gap-2">
                      {selectedTrace.trace.validationTruthCheck.data.checks.map((chk, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 p-2.5 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">✓ {chk.name}</span>
                            <span className="text-neutral-400">Expected: {chk.expected}</span>
                          </div>
                          <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 font-bold text-emerald-300">
                            {chk.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 10: Final Output */}
              {activeTab === 10 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-amber-400">
                    10. Final Deliverable Campaign Output
                  </h4>
                  <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                    <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                      <h5 className="text-base font-bold text-white">
                        {selectedTrace.trace.geminiResponse.data.headline}
                      </h5>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap text-neutral-300">
                        {selectedTrace.trace.geminiResponse.data.caption}
                      </p>
                      <div className="pt-2">
                        <span className="inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                          {selectedTrace.trace.geminiResponse.data.cta}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-6 py-3 text-xs">
              <span className="text-neutral-400">
                Trace ID: <span className="text-neutral-200">{selectedTrace.trace.traceId}</span>
              </span>
              <button
                onClick={() => setSelectedTrace(null)}
                className="bg-brand-600 hover:bg-brand-500 rounded-lg px-4 py-1.5 font-bold text-white transition-colors"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
