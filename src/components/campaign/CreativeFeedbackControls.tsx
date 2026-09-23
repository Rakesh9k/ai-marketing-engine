import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/services/api';
import type { CreativeFeedbackReason } from '@/types';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface CreativeFeedbackControlsProps {
  businessId: string;
  creativeId: string;
  campaignId?: string;
  templateId?: string;
  templateVersion?: number;
  styleId?: string;
  styleVersion?: number;
  creativeType: 'post' | 'reel';
}

export function CreativeFeedbackControls({
  businessId,
  creativeId,
  campaignId,
  templateId,
  templateVersion,
  styleId,
  styleVersion,
  creativeType,
}: CreativeFeedbackControlsProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<
    'initial' | 'negative-reasons' | 'submitting' | 'submitted' | 'error'
  >('initial');
  const [selectedReason, setSelectedReason] = useState<CreativeFeedbackReason | null>(null);
  const [customReason, setCustomReason] = useState('');

  const submitFeedback = async (
    sentiment: 'positive' | 'negative',
    reason?: CreativeFeedbackReason,
    text?: string
  ) => {
    if (!user) return;
    setPhase('submitting');
    try {
      await callFunction({
        functionName: 'submitCreativeFeedback',
        data: {
          businessId,
          creativeId,
          campaignId,
          templateId,
          templateVersion,
          styleId,
          styleVersion,
          creativeType,
          sentiment,
          reasons: reason ? [reason] : undefined,
          customReason: text || undefined,
        },
      });
      setPhase('submitted');
    } catch (err) {
      console.error('Failed to submit feedback', err);
      setPhase('error');
    }
  };

  if (phase === 'submitted') {
    return (
      <div className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
        Thank you! Your feedback has been recorded.
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mt-6">
        <p className="mb-2 text-sm text-red-600">Couldn't save your feedback. Try again.</p>
        <Button variant="outline" size="sm" onClick={() => setPhase('initial')}>
          Retry
        </Button>
      </div>
    );
  }

  if (phase === 'negative-reasons' || phase === 'submitting') {
    const isSubmitting = phase === 'submitting';
    return (
      <div className="mt-6 border-t pt-4 text-left">
        <p className="mb-3 text-sm font-medium text-neutral-900">What should change?</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              'more_premium',
              'more_local',
              'less_text',
              'more_humorous',
              'more_product_focused',
              'different',
            ] as const
          ).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              disabled={isSubmitting}
              className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                selectedReason === r
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {r === 'more_premium' && 'More premium'}
              {r === 'more_local' && 'More local'}
              {r === 'less_text' && 'Less text'}
              {r === 'more_humorous' && 'More humorous'}
              {r === 'more_product_focused' && 'More product-focused'}
              {r === 'different' && 'Different'}
            </button>
          ))}
        </div>
        {selectedReason === 'different' && (
          <textarea
            className="focus:border-brand-500 focus:ring-brand-500 mb-3 w-full rounded-md border border-neutral-300 p-2 shadow-sm sm:text-sm"
            placeholder="Tell us what you'd change..."
            rows={2}
            maxLength={500}
            value={customReason}
            disabled={isSubmitting}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!selectedReason || isSubmitting}
            onClick={() => submitFeedback('negative', selectedReason || undefined, customReason)}
          >
            Submit Feedback
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => setPhase('initial')}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t pt-4 text-left">
      <p className="mb-3 text-sm font-medium text-neutral-900">How does this feel?</p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => submitFeedback('positive')}
          className="flex-1 justify-center sm:flex-none"
        >
          👍 Use this style
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPhase('negative-reasons')}
          className="flex-1 justify-center sm:flex-none"
        >
          👎 Not my style
        </Button>
      </div>
    </div>
  );
}
