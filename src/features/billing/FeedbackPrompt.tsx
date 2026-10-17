'use client';

import { useState } from 'react';
import { callFunction } from '@/services/api';

export type FeedbackContext = 'checkout_abandoned' | 'not_renewing';

const OPTIONS: Record<FeedbackContext, { question: string; reasons: [string, string][] }> = {
  checkout_abandoned: {
    question: 'What got in the way? (optional, one tap)',
    reasons: [
      ['too_expensive', 'It costs more than I expected'],
      ['unsure_which_plan', 'I was not sure which plan to choose'],
      ['payment_problem', 'Something went wrong with the payment'],
      ['just_looking', 'I was just looking'],
      ['needed_gst_invoice', 'I need a GST invoice'],
      ['other', 'Something else'],
    ],
  },
  not_renewing: {
    question: 'If you are not renewing, what is the main reason? (optional, one tap)',
    reasons: [
      ['not_needed_now', 'I do not need it right now'],
      ['too_expensive', 'It costs too much'],
      ['didnt_get_value', 'I did not get enough value'],
      ['missing_feature', 'A feature I need is missing'],
      ['switched_tool', 'I switched to another tool'],
      ['business_closed', 'My business changed or closed'],
      ['other', 'Something else'],
    ],
  },
};

/**
 * A single optional question at the two moments the answer is knowable. One tap sends one answer, once; there is
 * no free text here, no obligation, and nothing in the product depends on it. The answers are used only as
 * counts, beside the response rate.
 */
export function FeedbackPrompt({
  context,
  orderId,
}: {
  context: FeedbackContext;
  /** Required for checkout_abandoned: the unpaid order the question is about. */
  orderId?: string;
}) {
  const [state, setState] = useState<'asking' | 'sending' | 'thanks' | 'failed' | 'dismissed'>(
    'asking'
  );
  const cfg = OPTIONS[context];
  if (state === 'dismissed') return null;
  if (state === 'thanks') {
    return (
      <p role="status" className="mt-3 text-sm text-neutral-600">
        Thank you. That helps.
      </p>
    );
  }

  async function choose(reason: string) {
    setState('sending');
    try {
      await callFunction<
        { context: FeedbackContext; reason: string; orderId?: string },
        { recorded: boolean }
      >({
        functionName: 'submitCommercialFeedback',
        data: { context, reason, ...(orderId ? { orderId } : {}) },
      });
      setState('thanks');
    } catch (err) {
      console.error('Could not send feedback:', err);
      setState('failed');
    }
  }

  return (
    <fieldset className="mt-3" disabled={state === 'sending'}>
      <legend className="text-sm font-medium text-neutral-800">{cfg.question}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {cfg.reasons.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => void choose(id)}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-800 hover:border-neutral-500 focus-visible:ring-2 focus-visible:ring-[#E84D1A] focus-visible:outline-none disabled:opacity-60"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setState('dismissed')}
          className="px-2 py-1 text-xs text-neutral-500 underline"
        >
          No thanks
        </button>
      </div>
      {state === 'failed' && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          We could not send that. You can ignore this question.
        </p>
      )}
    </fieldset>
  );
}
