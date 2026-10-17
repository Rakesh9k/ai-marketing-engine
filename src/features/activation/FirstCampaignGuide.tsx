'use client';

import Link from 'next/link';
import { deriveJourney, type JourneyFacts } from './journey';

/**
 * A short, calm checklist on the dashboard for owners who have not yet reached their second campaign. It reflects
 * saved facts only and has one primary action. It disappears once every step is done.
 */
export function FirstCampaignGuide({ facts }: { facts: JourneyFacts }) {
  const journey = deriveJourney(facts);
  if (journey.allDone) return null;
  return (
    <section
      aria-labelledby="journey-title"
      data-testid="first-campaign-guide"
      className="rounded-2xl border border-[#F0EBE1] bg-white p-5 shadow-2xs"
    >
      <h3 id="journey-title" className="text-base font-bold text-[#1A1A1E]">
        Your first campaign, step by step
      </h3>
      <p className="mt-1 text-sm text-[#5C5C66]">
        Looking and reviewing are free. Credits are used only when you press Generate.
      </p>
      <ol className="mt-4 space-y-3">
        {journey.steps.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.status === 'current' ? 'step' : undefined}
            className="flex gap-3"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                s.status === 'done'
                  ? 'bg-success-50 text-success-600'
                  : s.status === 'current'
                    ? 'bg-brand-600 text-white'
                    : 'bg-bg-secondary text-text-tertiary'
              }`}
            >
              {s.status === 'done' ? '✓' : i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-[#1A1A1E]">
                {s.title}
                <span className="sr-only">
                  {s.status === 'done' ? ' (done)' : s.status === 'current' ? ' (next)' : ''}
                </span>
              </p>
              <p className="text-xs text-[#5C5C66]">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {journey.next && (
        <Link
          href={journey.next.href}
          className="mt-4 inline-flex rounded-xl bg-[#E84D1A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {journey.next.label}
        </Link>
      )}
    </section>
  );
}
