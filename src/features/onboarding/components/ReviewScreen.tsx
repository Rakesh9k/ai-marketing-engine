'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/ui/MitraMascot';
import { labelFor, unconfirmed } from '../engine/engine';
import {
  asString,
  type DraftFieldPath,
  type FactValue,
  type Known,
  type Suggestions,
} from '../engine/fields';
import { formatPhoneForDisplay, normalizePhone } from '../engine/phone';
import { QUESTIONS } from '../engine/questions';
import type { ConfirmResult } from '../draft/draftService';

/** "What would you like to change?" — each opens only that part of the conversation. */
const CHANGE_CHOICES: Array<{ label: string; field: DraftFieldPath }> = [
  { label: 'My business name', field: 'identity.name' },
  { label: 'The kind of business', field: 'identity.industry' },
  { label: 'Where I am', field: 'identity.city' },
  { label: 'My WhatsApp number', field: 'contact.whatsapp' },
  { label: "What I'm known for", field: 'offering.signature' },
  { label: 'My customers', field: 'audience.primary' },
  { label: 'Why customers choose me', field: 'positioning.usp' },
];

interface ReviewScreenProps {
  known: Known;
  skipped: ReadonlySet<DraftFieldPath>;
  suggestions: Suggestions;
  /** The server has acknowledged this review and nothing is waiting to be saved. */
  canConfirm: boolean;
  /** Tell the server the review is on screen. */
  onShown: () => void;
  onChange: (field: DraftFieldPath) => void;
  /** The owner chose to keep one of Mitra's guesses: it becomes their answer. */
  onAccept: (field: DraftFieldPath, value: FactValue) => void;
  onConfirm: () => Promise<ConfirmResult>;
}

const asText = (v: FactValue) => (Array.isArray(v) ? v.join(', ') : v);

/**
 * The confirmation boundary. Everything the owner is about to be committed to is shown here in
 * plain words, and nothing is created until they say "Looks right". Mitra's unconfirmed guesses
 * are listed separately and are NOT part of the business unless the owner keeps them.
 */
export function ReviewScreen({
  known,
  skipped,
  suggestions,
  canConfirm,
  onShown,
  onChange,
  onAccept,
  onConfirm,
}: ReviewScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [dismissed, setDismissed] = useState<ReadonlySet<DraftFieldPath>>(new Set());

  // The server hears that the review is on screen, and again whenever the answers change while it
  // is (keeping a guess edits the draft, which sends it back to "in progress" until re-reviewed).
  useEffect(() => {
    onShown();
  }, [known, skipped, onShown]);

  const state = { known, skipped, suggestions };
  const name = asString(known['owner.name']);
  const rows = QUESTIONS.filter((q) => known[q.field] !== undefined);
  const guesses = unconfirmed(state).filter(
    (f) => !dismissed.has(f) && suggestions[f] !== undefined
  );

  const whatsapp = asString(known['contact.whatsapp']);
  const whatsappE164 = whatsapp ? normalizePhone(whatsapp) : null;

  const confirm = async () => {
    setError(null);
    setConfirming(true);
    const result = await onConfirm();
    // On success the shell swaps this screen for the completion screen; only failures stay here.
    if (!result.ok) {
      setError(result.message);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <MitraMascot pose="proud" size="lg" alt="" />
        <h1 className="text-text-primary text-3xl font-black tracking-tight">
          Here&apos;s what I&apos;ve understood so far{name ? `, ${name}` : ''}.
        </h1>
      </div>

      <ul className="border-border-light bg-surface divide-border-light divide-y rounded-2xl border">
        {rows.map((q) => {
          const isWhatsApp = q.field === 'contact.whatsapp';
          return (
            <li key={q.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-text-tertiary text-xs font-semibold tracking-wide uppercase">
                  {q.recapLabel}
                </p>
                <p className="text-text-primary text-base font-bold break-words">
                  {isWhatsApp && whatsappE164
                    ? formatPhoneForDisplay(whatsappE164)
                    : labelFor(q.field, state)}
                </p>
                {isWhatsApp && (
                  <p className="text-text-tertiary mt-0.5 text-xs">
                    I&apos;ll use this number for calls too. You can add a different one any time.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange(q.field)}
                aria-label={`Change ${q.recapLabel}`}
                className="text-brand-600 min-h-[44px] shrink-0 px-2 text-sm font-semibold hover:underline"
              >
                Change
              </button>
            </li>
          );
        })}
      </ul>

      {guesses.length > 0 && (
        <section
          aria-labelledby="guesses-heading"
          className="border-border-light bg-surface space-y-3 rounded-2xl border border-dashed p-4"
        >
          <div>
            <h2 id="guesses-heading" className="text-text-primary text-base font-bold">
              Mitra&apos;s guesses
            </h2>
            <p className="text-text-tertiary text-xs">
              I haven&apos;t saved these. They only count if you keep them.
            </p>
          </div>
          {guesses.map((field) => {
            const q = QUESTIONS.find((x) => x.field === field)!;
            const value = suggestions[field]!;
            return (
              <div key={field} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-text-tertiary text-xs font-semibold tracking-wide uppercase">
                    {q.recapLabel}
                  </p>
                  <p className="text-text-primary text-sm font-semibold break-words">
                    {asText(value)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onAccept(field, value)}
                    aria-label={`Keep my guess for ${q.recapLabel}`}
                    className="text-brand-600 min-h-[44px] px-2 text-sm font-semibold hover:underline"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed((prev) => new Set([...prev, field]))}
                    aria-label={`Drop my guess for ${q.recapLabel}`}
                    className="text-text-tertiary min-h-[44px] px-2 text-sm font-semibold hover:underline"
                  >
                    Drop
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="space-y-3">
        <p className="text-text-primary text-lg font-bold">
          Is this a good representation of your business?
        </p>

        {error && (
          <p role="alert" className="text-error-600 text-sm font-medium">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            disabled={!canConfirm || confirming}
            loading={confirming}
            onClick={() => void confirm()}
            className="bg-brand-500 hover:bg-brand-600 min-h-[48px] rounded-2xl px-8 font-bold text-white"
          >
            {confirming ? 'Setting things up…' : 'Looks right'}
          </Button>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            className="text-text-secondary hover:text-text-primary min-h-[44px] px-2 text-left text-sm font-semibold underline"
          >
            I&apos;d like to change something
          </button>
        </div>
        <p className="text-text-tertiary text-xs">
          Nothing is set up until you say &ldquo;Looks right&rdquo;.
        </p>

        {picking && (
          <div className="space-y-2">
            <p className="text-text-primary text-sm font-bold">What would you like to change?</p>
            <div className="flex flex-wrap gap-2">
              {CHANGE_CHOICES.filter((c) => known[c.field] !== undefined).map((c) => (
                <button
                  key={c.field}
                  type="button"
                  onClick={() => onChange(c.field)}
                  className="border-border-light bg-surface text-text-primary hover:border-brand-500 min-h-[44px] rounded-full border px-4 text-sm font-bold"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
