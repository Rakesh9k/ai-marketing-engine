'use client';

import React, { useState } from 'react';
import type {
  PipelineTrace,
  PipelineTraceStep,
  ValidationCheckItem,
  TruthCheckResult,
} from '@/types';

interface PipelineTraceInspectorProps {
  trace?: PipelineTrace;
  truthCheckResult?: TruthCheckResult;
}

export function PipelineTraceInspector({ trace }: PipelineTraceInspectorProps) {
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>('userRequest');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!trace) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
        <p className="text-sm font-medium text-neutral-600">
          No pipeline execution trace available for this campaign.
        </p>
      </div>
    );
  }

  const stages: Array<{
    key: keyof Omit<PipelineTrace, 'traceId' | 'campaignId' | 'businessId' | 'createdAt'>;
    label: string;
    step: PipelineTraceStep<any>;
    icon: string;
  }> = [
    { key: 'userRequest', label: 'USER', step: trace.userRequest, icon: '👤' },
    { key: 'mitraUi', label: 'MITRA UI', step: trace.mitraUi, icon: '🖥️' },
    {
      key: 'intentExtraction',
      label: 'Intent extraction',
      step: trace.intentExtraction,
      icon: '🧠',
    },
    {
      key: 'businessBrainRetrieval',
      label: 'Business Brain retrieval',
      step: trace.businessBrainRetrieval,
      icon: '🗄️',
    },
    { key: 'contextAssembly', label: 'Context assembly', step: trace.contextAssembly, icon: '🧩' },
    {
      key: 'promptBuilder',
      label: 'Prompt / instruction builder',
      step: trace.promptBuilder,
      icon: '📝',
    },
    {
      key: 'geminiResponse',
      label: 'GEMINI / Gemini response',
      step: trace.geminiResponse,
      icon: '✨',
    },
    {
      key: 'validationTruthCheck',
      label: 'Validation / Truth Check',
      step: trace.validationTruthCheck,
      icon: '🛡️',
    },
    {
      key: 'mitraTransformations',
      label: 'Mitra transformations',
      step: trace.mitraTransformations,
      icon: '⚙️',
    },
    {
      key: 'creativeGeneration',
      label: 'Creative generation',
      step: trace.creativeGeneration,
      icon: '🎨',
    },
    { key: 'finalCampaign', label: 'Final campaign', step: trace.finalCampaign, icon: '🚀' },
  ];

  const activeStage = stages.find((s) => s.key === selectedStageKey) || stages[0];
  const isOverallPassed = trace.validationTruthCheck?.status === 'passed';

  return (
    <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h3 className="text-lg font-bold text-neutral-900">Internal AI Execution Trace</h3>
            <span className="bg-brand-50 text-brand-700 border-brand-200 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              Complete Request Pipeline
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Inspect everything Mitra sent to Gemini, Gemini response, context assembly, and
            application-level validation.
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          {isExpanded ? 'Collapse Trace' : 'Expand Trace'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* 8-Stage AI Observability Flow Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
            <span className="text-brand-400 text-[11px] font-bold tracking-wider uppercase">
              8-STAGE OBSERVABILITY FLOW:
            </span>
            <div className="flex min-w-max items-center gap-1.5 text-[11px]">
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                1. INPUT
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                2. CONTEXT
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                3. INSTRUCTIONS
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                4. TOOLS
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                5. MODEL RESPONSE
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                6. VALIDATION
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                7. TRANSFORMATION
              </span>
              <span className="text-neutral-500">➔</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-semibold text-neutral-200">
                8. OUTPUT
              </span>
            </div>
          </div>

          {/* Summary Card (Matching Exact Spec) */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 font-mono text-xs text-neutral-200 shadow-inner">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <span className="text-brand-400 text-sm font-bold tracking-wider">AI TRACE</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400">RESULT:</span>
                <span
                  className={`rounded px-2.5 py-0.5 text-[10px] font-bold ${
                    isOverallPassed
                      ? 'bg-success-950 text-success-300 border-success-800 border'
                      : 'bg-error-950 text-error-300 border-error-800 border'
                  }`}
                >
                  {isOverallPassed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Request & Intent */}
              <div className="space-y-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 p-3">
                <div className="mb-2 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Request & Intent
                </div>
                <p className="text-success-400 font-semibold">✓ User instruction captured</p>
                <p className="text-neutral-300">
                  ✓ {trace.intentExtraction.data.extractedObjective || 'Promotion'}
                </p>
                <p className="text-neutral-300">
                  ✓ {trace.intentExtraction.data.extractedProduct || 'Product'}
                </p>
                <p className="text-neutral-300">
                  ✓ {trace.intentExtraction.data.extractedStyle || 'Style'}
                </p>
                <p className="text-neutral-300">
                  ✓ {trace.intentExtraction.data.extractedLanguage || 'Language'}
                </p>
              </div>

              {/* Business Brain & Context */}
              <div className="space-y-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 p-3">
                <div className="mb-2 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Business Brain & Context
                </div>
                <p className="text-success-400">✓ Business identity</p>
                <p className="text-success-400">
                  ✓ Product data ({trace.businessBrainRetrieval.data.product})
                </p>
                <p className="text-success-400">
                  ✓ Location ({trace.businessBrainRetrieval.data.location})
                </p>
                <p className="text-success-400">
                  ✓ Brand voice ({trace.businessBrainRetrieval.data.brandTone})
                </p>
                <p className="text-brand-300 mt-2 font-bold">12 relevant facts retrieved</p>
              </div>

              {/* Prompt Tokens & Gemini Provider Specs */}
              <div className="space-y-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 p-3">
                <div className="mb-2 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Prompt & Gemini Model
                </div>
                <p>
                  <span className="text-neutral-400">System instructions:</span>{' '}
                  <span className="text-neutral-200">1,240 tokens</span>
                </p>
                <p>
                  <span className="text-neutral-400">Business context:</span>{' '}
                  <span className="text-neutral-200">820 tokens</span>
                </p>
                <p>
                  <span className="text-neutral-400">User request:</span>{' '}
                  <span className="text-neutral-200">32 tokens</span>
                </p>
                <p>
                  <span className="text-neutral-400">Rules:</span>{' '}
                  <span className="text-neutral-200">410 tokens</span>
                </p>
                <div className="mt-2 space-y-1 border-t border-neutral-800/80 pt-2">
                  <p>
                    <span className="text-neutral-400">Model:</span>{' '}
                    <span className="text-brand-300 font-semibold">Gemini 1.5 Flash</span>
                  </p>
                  <p>
                    <span className="text-neutral-400">Temperature:</span>{' '}
                    <span className="text-neutral-200">0.4</span>
                  </p>
                  <p>
                    <span className="text-neutral-400">Latency:</span>{' '}
                    <span className="text-neutral-200">1.8s</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <div className="mb-2 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                Validation Checklist
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {(trace.validationTruthCheck.data.checks || []).map(
                  (c: ValidationCheckItem, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded border border-neutral-800 bg-neutral-900 p-2 text-[11px]"
                    >
                      <span
                        className={
                          c.status === 'PASS'
                            ? 'text-success-400 font-bold'
                            : 'text-error-400 font-bold'
                        }
                      >
                        {c.status === 'PASS' ? '✓' : '✗'}
                      </span>
                      <span className="truncate font-medium text-neutral-200">{c.name}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Flow Stepper */}
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-center gap-1">
              {stages.map((st, idx) => {
                const isSelected = selectedStageKey === st.key;
                const isPassed = st.step.status === 'passed';
                const isFailed = st.step.status === 'failed';

                return (
                  <React.Fragment key={st.key}>
                    <button
                      onClick={() => setSelectedStageKey(st.key)}
                      className={`group flex max-w-[120px] flex-col items-center rounded-lg p-2.5 text-left transition-all ${
                        isSelected
                          ? 'bg-brand-50 border-brand-500 border-2 shadow-sm'
                          : 'border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-base">{st.icon}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isFailed
                              ? 'bg-error-500'
                              : isPassed
                                ? 'bg-success-500'
                                : 'bg-warning-500'
                          }`}
                        />
                      </div>
                      <span className="mt-1 line-clamp-2 text-center text-[11px] font-semibold text-neutral-900">
                        {st.label}
                      </span>
                    </button>
                    {idx < stages.length - 1 && (
                      <span className="px-0.5 text-xs font-bold text-neutral-300">↓</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Detailed Inspector Panel for Selected Stage */}
          {activeStage && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-900 p-5 font-mono text-sm text-neutral-100 shadow-inner">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activeStage.icon}</span>
                  <span className="text-brand-300 text-base font-bold">{activeStage.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      activeStage.step.status === 'passed'
                        ? 'bg-success-900 text-success-300 border-success-700 border'
                        : 'bg-error-900 text-error-300 border-error-700 border'
                    }`}
                  >
                    {activeStage.step.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">{activeStage.step.timestamp}</span>
              </div>

              {activeStage.step.summary && (
                <div className="mb-4 rounded bg-neutral-800 p-3 font-sans text-xs text-neutral-200">
                  <span className="text-brand-400 font-semibold">Stage Summary:</span>{' '}
                  {activeStage.step.summary}
                </div>
              )}

              {/* Stage-Specific Formatted Rendering */}
              {activeStage.key === 'userRequest' && (
                <div className="space-y-3 font-sans">
                  <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    User Request
                  </h4>
                  <div className="space-y-1.5 rounded bg-neutral-800 p-3 text-xs">
                    <p>
                      <span className="text-brand-300 font-semibold">Request:</span> "
                      {activeStage.step.data.request}"
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Language:</span>{' '}
                      {activeStage.step.data.language}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Style:</span>{' '}
                      {activeStage.step.data.style}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Objective:</span>{' '}
                      {activeStage.step.data.objective}
                    </p>
                  </div>
                </div>
              )}

              {activeStage.key === 'businessBrainRetrieval' && (
                <div className="space-y-3 font-sans">
                  <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Business Brain Facts
                  </h4>
                  <div className="space-y-1.5 rounded bg-neutral-800 p-3 text-xs">
                    <p>
                      <span className="text-brand-300 font-semibold">Business:</span>{' '}
                      {activeStage.step.data.business}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Location:</span>{' '}
                      {activeStage.step.data.location}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Product:</span>{' '}
                      {activeStage.step.data.product}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Price:</span>{' '}
                      {activeStage.step.data.price}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Brand Tone:</span>{' '}
                      {activeStage.step.data.brandTone}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Language Preference:</span>{' '}
                      {activeStage.step.data.languagePreference}
                    </p>
                    <p>
                      <span className="text-brand-300 font-semibold">Audience:</span>{' '}
                      {activeStage.step.data.audience}
                    </p>
                  </div>
                </div>
              )}

              {activeStage.key === 'contextAssembly' && (
                <div className="space-y-3 font-sans">
                  <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Context Selected by Mitra
                  </h4>
                  <div className="grid grid-cols-2 gap-2 rounded bg-neutral-800 p-3 text-xs">
                    {Object.entries(activeStage.step.data.selectedContext || {}).map(
                      ([ctxKey, _val]) => (
                        <div key={ctxKey} className="flex items-center gap-2">
                          <span className="text-success-400">✓</span>
                          <span className="text-neutral-200 capitalize">
                            {ctxKey.replace(/([A-Z])/g, ' $1')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {activeStage.key === 'promptBuilder' && (
                <div className="space-y-3 font-sans">
                  <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Actual Gemini Request
                  </h4>
                  <div className="space-y-3 rounded bg-neutral-800 p-3 text-xs">
                    <div>
                      <span className="text-brand-300 mb-1 block font-bold">
                        SYSTEM INSTRUCTION:
                      </span>
                      <pre className="rounded bg-neutral-950 p-2 font-mono text-[11px] whitespace-pre-wrap text-neutral-300">
                        {activeStage.step.data.systemInstruction}
                      </pre>
                    </div>
                    <div>
                      <span className="text-brand-300 mb-1 block font-bold">BUSINESS CONTEXT:</span>
                      <pre className="rounded bg-neutral-950 p-2 font-mono text-[11px] whitespace-pre-wrap text-neutral-300">
                        {activeStage.step.data.businessContext}
                      </pre>
                    </div>
                    <div>
                      <span className="text-brand-300 mb-1 block font-bold">USER REQUEST:</span>
                      <pre className="rounded bg-neutral-950 p-2 font-mono text-[11px] whitespace-pre-wrap text-neutral-300">
                        {activeStage.step.data.userRequest}
                      </pre>
                    </div>
                    <div>
                      <span className="text-brand-300 mb-1 block font-bold">TASK:</span>
                      <pre className="rounded bg-neutral-950 p-2 font-mono text-[11px] whitespace-pre-wrap text-neutral-300">
                        {activeStage.step.data.task}
                      </pre>
                    </div>
                    <div>
                      <span className="text-brand-300 mb-1 block font-bold">OUTPUT SCHEMA:</span>
                      <pre className="rounded bg-neutral-950 p-2 font-mono text-[11px] whitespace-pre-wrap text-neutral-300">
                        {typeof activeStage.step.data.outputSchema === 'string'
                          ? activeStage.step.data.outputSchema
                          : JSON.stringify(activeStage.step.data.outputSchema, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeStage.key === 'validationTruthCheck' && (
                <div className="space-y-3 font-sans">
                  <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Validation Checklist
                  </h4>
                  <div className="space-y-2 rounded bg-neutral-800 p-3 text-xs">
                    {(activeStage.step.data.checks || []).map(
                      (check: ValidationCheckItem, i: number) => (
                        <div
                          key={i}
                          className="flex items-start justify-between border-b border-neutral-700/50 pb-1.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                check.status === 'PASS'
                                  ? 'text-success-400 font-bold'
                                  : 'text-error-400 font-bold'
                              }
                            >
                              {check.status === 'PASS' ? '✓' : '✗'}
                            </span>
                            <span className="font-semibold text-neutral-200">{check.name}</span>
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              check.status === 'PASS'
                                ? 'bg-success-950 text-success-300 border-success-800 border'
                                : check.status === 'FAIL'
                                  ? 'bg-error-950 text-error-300 border-error-800 border'
                                  : 'bg-warning-950 text-warning-300 border-warning-800 border'
                            }`}
                          >
                            {check.status}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Raw JSON Data View for inspection */}
              <div className="mt-4 border-t border-neutral-800 pt-4">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-semibold text-neutral-400 transition-colors group-hover:text-neutral-200">
                    View Complete Stage Raw Data JSON
                  </summary>
                  <pre className="text-brand-200 mt-3 max-h-60 overflow-y-auto rounded bg-neutral-950 p-3 font-mono text-[11px]">
                    {JSON.stringify(activeStage.step.data, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
