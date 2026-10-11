'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { describeError } from '@/lib/errors/classifyError';

export default function ContentWorkspacePage() {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<
    'caption' | 'headline' | 'offer' | 'whatsapp' | 'hashtags'
  >('caption');
  const [tone, setTone] = useState<
    'engaging' | 'promotional' | 'urgent' | 'hinglish' | 'professional'
  >('engaging');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const { showToast } = useToast();
  const { copyToClipboard } = useCopyToClipboard();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setGenerating(true);
    setOutput(null);

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, contentType, tone }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setOutput(data.text);
        showToast('AI Content generated successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (err: any) {
      console.error(err);
      const copy = describeError(err, 'generate this copy', { workKept: true });
      showToast(copy.kind === 'unknown' ? err.message || copy.message : copy.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-text-primary text-3xl font-bold tracking-tight">
          Instant AI Content &amp; Copy Studio
        </h1>
        <p className="text-text-secondary mt-2">
          Tell Mitra what you&apos;re promoting and instantly get high-converting AI captions,
          hashtags, headlines, offers, or WhatsApp messages.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <form
          onSubmit={handleGenerate}
          className="border-border-light bg-surface space-y-6 rounded-2xl border p-6 shadow-sm"
        >
          <div>
            <label className="text-text-primary mb-2 block text-sm font-medium">
              1. Select Content Format
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { id: 'caption', label: 'Social Caption' },
                { id: 'hashtags', label: 'Hashtag Strategy' },
                { id: 'headline', label: 'Ad Headline' },
                { id: 'offer', label: 'Offer / Discount' },
                { id: 'whatsapp', label: 'WhatsApp Message' },
              ].map((type) => (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => setContentType(type.id as typeof contentType)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    contentType === type.id
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-bg-primary text-text-secondary border-border-light hover:border-border-medium'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-text-primary mb-2 block text-sm font-medium">
              2. Tone of Voice
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'engaging', label: '🌟 Friendly & Engaging' },
                { id: 'promotional', label: '🚀 High-Conversion' },
                { id: 'urgent', label: '⏳ Discount & Urgency' },
                { id: 'hinglish', label: '🇮🇳 Hinglish / Local' },
                { id: 'professional', label: '💼 Professional' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTone(t.id as typeof tone)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
                    tone === t.id
                      ? 'bg-brand-100 text-brand-700 border-brand-300 font-semibold'
                      : 'bg-bg-primary text-text-secondary border-border-light hover:border-border-medium'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-text-primary mb-2 block text-sm font-medium">
              3. What are you selling or promoting?
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Special Hyderabadi Chicken Dum Biryani, 20% off weekend discount, New Spa Package..."
              className="border-border-medium bg-bg-primary text-text-primary focus:border-brand-500 w-full rounded-xl border p-3 text-sm focus:outline-none"
              required
            />
          </div>

          <Button type="submit" disabled={generating || !topic.trim()} className="w-full">
            {generating ? 'Mitra is Writing with AI...' : 'Generate Content with Mitra AI'}
          </Button>
        </form>

        <div className="border-border-light bg-surface flex min-h-[360px] flex-col justify-between rounded-2xl border p-6 shadow-sm">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-text-primary text-lg font-semibold">Generated AI Result</h2>
              {output && (
                <span className="text-brand-600 bg-brand-50 rounded-full px-2.5 py-1 text-xs font-medium">
                  Ready to copy
                </span>
              )}
            </div>

            {output ? (
              <div className="border-border-light bg-bg-primary text-text-primary max-h-[380px] overflow-y-auto rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {output}
              </div>
            ) : (
              <div className="border-border-light text-text-tertiary flex h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center">
                <span className="mb-2 text-3xl">✍️</span>
                <p className="text-sm font-medium">Your AI-generated content will appear here.</p>
                <p className="text-text-tertiary mt-1 text-xs">
                  Select a format, type details, and hit Generate!
                </p>
              </div>
            )}
          </div>

          {output && (
            <div className="border-border-light mt-6 flex gap-3 border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await copyToClipboard(output, 'instant-content');
                  showToast('Copied to clipboard!', 'success');
                }}
              >
                📋 Copy Content to Clipboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
