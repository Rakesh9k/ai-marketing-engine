'use client';

import { useId, useMemo, useState } from 'react';
import { asList, asString, type FactValue, type Known } from '../engine/fields';
import {
  MAX_MULTI,
  optionsWithGuesses,
  resolve,
  type QuestionDefinition,
} from '../engine/questions';
import { OTHER_OPTION_ID } from '../engine/taxonomy';

interface QuestionFieldProps {
  question: QuestionDefinition;
  known: Known;
  value: FactValue;
  /** What Mitra found or guessed for this field. Offered, never applied on the owner's behalf. */
  suggestion?: FactValue;
  /** `commit` = this choice is a complete answer on its own (no Continue needed for a lone question). */
  onChange: (value: FactValue, meta?: { commit?: boolean }) => void;
  autoFocus?: boolean;
  /** Called when Enter is pressed in a text box. */
  onSubmit?: () => void;
  error?: string;
}

const SEARCH_THRESHOLD = 8;

/**
 * Radio-group keyboard behaviour for the single-choice options: arrows, Home and End move FOCUS
 * between the options (wrapping). They never choose: choosing commits the answer and advances the
 * conversation, so that stays an explicit Space/Enter/click.
 */
function moveFocusWithArrows(event: React.KeyboardEvent<HTMLDivElement>) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  const radios = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])')
  );
  if (radios.length === 0) return;
  const current = radios.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = radios.length - 1;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = current < 0 ? 0 : (current + 1) % radios.length;
  } else {
    next = current < 0 ? radios.length - 1 : (current - 1 + radios.length) % radios.length;
  }
  event.preventDefault();
  radios[next]?.focus();
}

const inputClass =
  'text-text-primary placeholder:text-text-tertiary bg-surface border-border-control focus:ring-brand-500 w-full rounded-2xl border px-4 py-3.5 text-lg transition-all focus:border-transparent focus:ring-2 focus:outline-none';

export function QuestionField({
  question,
  known,
  value,
  suggestion,
  onChange,
  autoFocus,
  onSubmit,
  error,
}: QuestionFieldProps) {
  const headingId = useId();
  const whyId = useId();
  const errorId = useId();
  const [query, setQuery] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [adding, setAdding] = useState('');

  const input = resolve(question.input, known);
  const prompt = resolve(question.prompt, known);
  const why = resolve(question.purpose, known);
  const options = useMemo(
    () => optionsWithGuesses(question, known, asList(suggestion)),
    [question, known, suggestion]
  );

  const text = asString(value) ?? '';
  const list = asList(value) ?? [];
  const isKnownOption = options.some((o) => o.id === text);
  const maxLength = question.maxLength ?? 80;

  // ── single choice ────────────────────────────────────────────────────────
  // A value that is not one of the presets is the owner's own words (e.g. restored after a refresh).
  const customActive = question.allowCustom && (customOpen || (text !== '' && !isKnownOption));
  const selectedId = customActive ? OTHER_OPTION_ID : isKnownOption ? text : undefined;
  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  // One tab stop for the whole group: the chosen option, else the first one on screen.
  const tabStopId = visible.some((o) => o.id === selectedId) ? selectedId : visible[0]?.id;

  // ── multi choice ─────────────────────────────────────────────────────────
  const has = (label: string) => list.some((x) => x.toLowerCase() === label.toLowerCase());
  const toggle = (label: string) => {
    if (has(label)) onChange(list.filter((x) => x.toLowerCase() !== label.toLowerCase()));
    else if (list.length < MAX_MULTI) onChange([...list, label]);
  };
  const addCustom = () => {
    const label = adding.trim().slice(0, 40);
    if (label && !has(label) && list.length < MAX_MULTI) onChange([...list, label]);
    setAdding('');
  };
  // Owner-typed entries that are not presets or guesses still need a chip to be un-picked.
  const optionLabels = new Set(options.map((o) => o.label.toLowerCase()));
  const ownWords = list.filter((x) => !optionLabels.has(x.toLowerCase()));

  const chipClass = (selected: boolean) =>
    `min-h-[48px] cursor-pointer rounded-full border px-4 py-2 text-left text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-brand-500 ${
      selected
        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-brand-500/20 ring-2'
        : 'border-border-light bg-surface text-text-primary hover:border-brand-500'
    }`;

  const describedBy = [whyId, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-3">
      <h2
        id={headingId}
        className="text-text-primary text-2xl leading-tight font-black tracking-tight sm:text-3xl"
      >
        {prompt}
      </h2>
      <p id={whyId} className="text-text-tertiary text-sm">
        <span className="font-semibold">Why I&apos;m asking:</span> {why}
      </p>

      {input === 'text' && (
        <input
          type="text"
          inputMode={question.inputMode}
          value={text}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit?.();
          }}
          placeholder={question.placeholder}
          autoFocus={autoFocus}
          autoComplete={question.autoComplete ?? 'off'}
          aria-labelledby={headingId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass}
        />
      )}

      {input === 'long' && (
        <textarea
          value={text}
          maxLength={maxLength}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          autoFocus={autoFocus}
          aria-labelledby={headingId}
          aria-describedby={describedBy}
          className={`${inputClass} resize-none text-base`}
        />
      )}

      {(input === 'text' || input === 'long') &&
        question.suggestionNote &&
        typeof suggestion === 'string' &&
        text === suggestion && (
          <p className="text-text-tertiary text-xs">{question.suggestionNote}</p>
        )}

      {input === 'choice' && (
        <>
          {options.length > SEARCH_THRESHOLD && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search options"
              className="text-text-primary bg-surface border-border-control focus:ring-brand-500 w-full rounded-xl border px-4 py-2.5 text-base focus:border-transparent focus:ring-2 focus:outline-none"
            />
          )}
          <div
            role="radiogroup"
            aria-labelledby={headingId}
            aria-describedby={describedBy}
            onKeyDown={moveFocusWithArrows}
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
          >
            {visible.map((option) => {
              const selected = selectedId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={option.id === tabStopId ? 0 : -1}
                  onClick={() => {
                    if (question.allowCustom && option.id === OTHER_OPTION_ID) {
                      setCustomOpen(true);
                      onChange('');
                      return;
                    }
                    setCustomOpen(false);
                    onChange(option.id, { commit: true });
                  }}
                  className={`min-h-[56px] cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-brand-500/20 ring-2'
                      : 'border-border-light bg-surface text-text-primary hover:border-brand-500'
                  } focus-visible:ring-brand-500`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  {option.hint && (
                    <span className="text-text-tertiary mt-0.5 block text-[11px] font-normal">
                      {option.hint}
                    </span>
                  )}
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="text-text-tertiary col-span-full text-sm">
                Nothing matches &ldquo;{query}&rdquo;. You can always pick &ldquo;Something
                else&rdquo;.
              </p>
            )}
          </div>

          {customActive && (
            <input
              type="text"
              value={isKnownOption ? '' : text}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit?.();
              }}
              placeholder={question.placeholder ?? 'In your own words'}
              maxLength={80}
              autoFocus
              aria-label="Tell me in your own words"
              className={`${inputClass} mt-1 text-base`}
            />
          )}
        </>
      )}

      {input === 'multi' && (
        <>
          <div
            role="group"
            aria-labelledby={headingId}
            aria-describedby={describedBy}
            className="flex flex-wrap gap-2"
          >
            {options.map((option) => {
              const selected = has(option.label);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(option.label)}
                  disabled={!selected && list.length >= MAX_MULTI}
                  className={`${chipClass(selected)} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {option.label}
                  {option.guess && (
                    <span className="text-brand-600 ml-2 text-[10px] font-semibold tracking-wide uppercase">
                      Mitra&apos;s guess
                    </span>
                  )}
                </button>
              );
            })}
            {ownWords.map((label) => (
              <button
                key={label}
                type="button"
                aria-pressed
                onClick={() => toggle(label)}
                className={chipClass(true)}
              >
                {label}
                <span className="ml-2" aria-hidden="true">
                  ×
                </span>
                <span className="sr-only">Remove</span>
              </button>
            ))}
          </div>

          {question.allowCustom && list.length < MAX_MULTI && (
            <div className="flex gap-2">
              <input
                type="text"
                value={adding}
                maxLength={40}
                onChange={(e) => setAdding(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder={question.placeholder ?? 'Add your own'}
                aria-label="Add your own"
                className="text-text-primary placeholder:text-text-tertiary bg-surface border-border-control focus:ring-brand-500 min-h-[48px] flex-1 rounded-xl border px-4 py-2.5 text-base focus:border-transparent focus:ring-2 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!adding.trim()}
                className="border-border-medium text-text-primary hover:border-brand-500 min-h-[48px] cursor-pointer rounded-xl border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}
          <p className="text-text-tertiary text-xs">
            Pick up to {MAX_MULTI}. {list.length > 0 ? `${list.length} chosen.` : ''}
          </p>
        </>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-error-600 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
