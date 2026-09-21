'use client';

import React from 'react';
import type { TruthCheckItem } from '@/types';

interface DetailedChecksProps {
  checks: TruthCheckItem[];
}

export function DetailedChecks({ checks }: DetailedChecksProps) {
  return (
    <div className="mt-4 space-y-3">
      <h4 className="font-medium text-neutral-900">Detailed Checks</h4>
      <div className="space-y-2">
        {checks.map((check: TruthCheckItem, index: number) => (
          <div key={index} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900 capitalize">{check.category}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      check.status === 'PASS'
                        ? 'bg-success-100 text-success-700'
                        : check.status === 'FAIL'
                          ? 'bg-error-100 text-error-700'
                          : 'bg-warning-100 text-warning-700'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                {check.reason && <p className="mt-1 text-sm text-neutral-600">{check.reason}</p>}
                {check.generatedValue &&
                  check.generatedValue !== 'NOT_FOUND' &&
                  check.generatedValue !== 'NONE' && (
                    <p className="mt-1 text-sm text-neutral-500">
                      <span className="font-medium">Generated:</span>{' '}
                      {String(check.generatedValue).slice(0, 200)}
                    </p>
                  )}
                {check.expectedValue &&
                  check.expectedValue !== 'NOT_PROVIDED' &&
                  check.expectedValue !== 'NONE' && (
                    <p className="mt-1 text-sm text-neutral-500">
                      <span className="font-medium">Expected:</span>{' '}
                      {String(check.expectedValue).slice(0, 200)}
                    </p>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
