'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/ui/MitraMascot';
import { MitraMark } from '@/components/ui/MitraMark';
import { progress, selectNext } from '../engine/engine';
import {
  asString,
  type DraftFieldPath,
  type FactValue,
  type Known,
  type Suggestions,
} from '../engine/fields';
import { QUESTIONS, resolve, type QuestionDefinition } from '../engine/questions';
import { useOnboardingDraft, type OnboardingDraftApi } from '../draft/useOnboardingDraft';
import { CompletionScreen } from './CompletionScreen';
import { ProgressPath } from './ProgressPath';
import { QuestionField } from './QuestionField';
import { ReviewScreen } from './ReviewScreen';

type Values = Partial<Record<DraftFieldPath, FactValue>>;

const filled = (v: FactValue | undefined): boolean =>
  Array.isArray(v) ? v.length > 0 : (v ?? '').trim().length > 0;

const trimmed = (v: FactValue): FactValue =>
  Array.isArray(v) ? v.map((x) => x.trim()).filter(Boolean) : v.trim();

function SaveIndicator({ draft }: { draft: OnboardingDraftApi }) {
  return (
    <p className="text-text-tertiary h-5 text-xs" aria-live="polite">
      {draft.saveStatus === 'saving' && 'Saving…'}
      {draft.saveStatus === 'idle' && Object.keys(draft.known).length > 0 && 'Saved'}
      {draft.saveStatus === 'error' && (
        <>
          Couldn&apos;t save just now. Your answers are kept on this device.{' '}
          <button
            type="button"
            onClick={draft.retrySave}
            className="text-brand-600 font-semibold underline"
          >
            Try again
          </button>
        </>
      )}
    </p>
  );
}

/** One screen of one or two questions. Owns the in-progress values until the owner continues. */
function QuestionScreen({
  questions,
  known,
  suggestions,
  greeting,
  onCommit,
}: {
  questions: QuestionDefinition[];
  known: Known;
  suggestions: Suggestions;
  greeting?: string;
  onCommit: (values: Values, skipped: DraftFieldPath[]) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(
      questions.map((q) => {
        const kind = resolve(q.input, known);
        const confirmed = known[q.field];
        if (confirmed !== undefined) return [q.field, confirmed];
        // Something Mitra read from the owner's own sign-in (their Google name) is pre-filled for a
        // single tap to confirm. Guesses for choices are offered as chips instead, never pre-picked.
        const hint = suggestions[q.field];
        if ((kind === 'text' || kind === 'long') && typeof hint === 'string')
          return [q.field, hint];
        return [q.field, kind === 'multi' ? [] : ''];
      })
    )
  );

  const errorFor = (q: QuestionDefinition): string | undefined => {
    const v = values[q.field];
    return typeof v === 'string' && v.trim() && q.validate ? q.validate(v) : undefined;
  };

  const canContinue = questions.every(
    (q) => (q.importance !== 'required' || filled(values[q.field])) && !errorFor(q)
  );
  const allSkippable = questions.every((q) => q.importance !== 'required');
  const lone = questions.length === 1;

  const commit = (next: Values = values) => {
    const answered: Values = {};
    const skipped: DraftFieldPath[] = [];
    for (const q of questions) {
      const v = next[q.field];
      if (v !== undefined && filled(v)) answered[q.field] = trimmed(v);
      else if (q.importance !== 'required') skipped.push(q.field);
    }
    onCommit(answered, skipped);
  };

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-8"
    >
      {greeting && <p className="text-brand-600 text-lg font-bold">{greeting}</p>}

      {questions.map((q, i) => (
        <QuestionField
          key={q.id}
          question={q}
          known={known}
          value={values[q.field] ?? ''}
          suggestion={suggestions[q.field]}
          autoFocus={i === 0}
          error={errorFor(q)}
          onSubmit={() => canContinue && commit()}
          onChange={(value, meta) => {
            const next = { ...values, [q.field]: value };
            setValues(next);
            // A lone single-choice is a complete answer on its own: no extra "Continue" click.
            if (lone && meta?.commit && filled(value)) commit(next);
          }}
        />
      ))}

      <div className="bg-bg-primary/90 sticky bottom-0 -mx-4 flex items-center gap-3 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">
        <Button
          type="button"
          size="lg"
          disabled={!canContinue}
          onClick={() => commit()}
          className="bg-brand-500 hover:bg-brand-600 min-h-[48px] flex-1 rounded-2xl px-8 font-bold text-white sm:flex-none"
        >
          Continue
        </Button>
        {(allSkippable || questions.some((q) => q.importance !== 'required')) && (
          <button
            type="button"
            onClick={() =>
              onCommit(
                {},
                questions.filter((q) => q.importance !== 'required').map((q) => q.field)
              )
            }
            className="text-text-tertiary hover:text-text-primary min-h-[44px] px-2 text-sm font-semibold underline"
          >
            Skip for now
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Welcome({ onBegin }: { onBegin: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center space-y-6 text-center"
    >
      <MitraMascot
        pose="waving"
        size="xl"
        alt="Mitra waving hello"
        animated={!reduceMotion}
        priority
      />
      <div className="space-y-3">
        <h1 className="text-text-primary text-4xl font-black tracking-tight sm:text-5xl">
          Hey, I&apos;m Mitra.
        </h1>
        <p className="text-text-secondary mx-auto max-w-md text-lg leading-relaxed">
          I&apos;ll help turn what you know about your business into marketing that feels like you.
        </p>
        <p className="text-text-tertiary mx-auto max-w-md text-base">
          We&apos;ll keep this simple. I&apos;ll ask a few things, and I&apos;ll learn the rest as
          we work together.
        </p>
      </div>
      <Button
        type="button"
        size="xl"
        onClick={onBegin}
        autoFocus
        className="bg-brand-500 hover:bg-brand-600 min-h-[52px] rounded-full px-10 font-bold text-white"
      >
        Let&apos;s begin
      </Button>
    </motion.div>
  );
}

export function ConversationShell({ uid }: { uid: string | null }) {
  const draft = useOnboardingDraft(uid);
  const [editing, setEditing] = useState<DraftFieldPath | null>(null);
  const [welcomeBackShown, setWelcomeBackShown] = useState(false);

  const state = useMemo(
    () => ({ known: draft.known, skipped: draft.skipped, suggestions: draft.suggestions }),
    [draft.known, draft.skipped, draft.suggestions]
  );

  const screen: QuestionDefinition[] = useMemo(() => {
    if (editing) {
      const q = QUESTIONS.find((x) => x.field === editing);
      return q ? [q] : [];
    }
    return selectNext(state);
  }, [editing, state]);

  if (draft.loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <MitraMark size="lg" state="loading" decorative />
      </div>
    );
  }

  if (draft.loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <MitraMascot pose="concerned" size="lg" alt="" />
        <p className="text-text-primary text-lg font-bold">
          I couldn&apos;t load where we left off.
        </p>
        <p className="text-text-tertiary text-sm">
          Nothing is lost. Check your connection and try again.
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const name = asString(draft.known['owner.name']);

  if (draft.serverStatus === 'completed') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-6 sm:py-10">
        <CompletionScreen name={name} />
      </main>
    );
  }

  const showWelcomeBack = draft.resumed && draft.welcomed && !welcomeBackShown && !editing;
  const firstBusinessQuestion = screen[0]?.field === 'identity.industry';
  const greeting = showWelcomeBack
    ? name
      ? `Welcome back, ${name}. We were getting to know your business.`
      : 'Welcome back. We were getting to know your business.'
    : name && firstBusinessQuestion
      ? `Nice to meet you, ${name}. Now let's get to know the business.`
      : undefined;

  const commit = (values: Values, skipped: DraftFieldPath[]) => {
    if (Object.keys(values).length > 0) draft.answer(values);
    if (skipped.length > 0) draft.skip(skipped);
    setEditing(null);
    setWelcomeBackShown(true);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:py-10">
      <header className="mb-8 space-y-3">
        <ProgressPath value={draft.welcomed ? progress(state) : 0} />
        <SaveIndicator draft={draft} />
        {draft.staleNotice && (
          <p
            role="status"
            className="border-border-light bg-surface text-text-secondary flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs"
          >
            <span>
              This conversation was also updated somewhere else, so I&apos;ve refreshed it to the
              latest.
            </span>
            <button
              type="button"
              onClick={draft.dismissStaleNotice}
              className="text-brand-600 shrink-0 font-semibold underline"
            >
              Got it
            </button>
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center">
        {!draft.welcomed ? (
          <Welcome onBegin={draft.markWelcomed} />
        ) : screen.length > 0 ? (
          <>
            {/* The questions are h2s; the welcome and review screens carry their own h1. */}
            <h1 className="sr-only">Tell Mitra about your business</h1>
            <QuestionScreen
              // A fresh screen (new questions, or a different value to edit) starts with fresh state.
              key={screen.map((q) => q.id).join('+') + (editing ?? '')}
              questions={screen}
              known={draft.known}
              suggestions={draft.suggestions}
              greeting={greeting}
              onCommit={commit}
            />
          </>
        ) : (
          <ReviewScreen
            known={draft.known}
            skipped={draft.skipped}
            suggestions={draft.suggestions}
            canConfirm={draft.serverStatus === 'ready_for_review' && draft.saveStatus === 'idle'}
            onShown={draft.markReviewShown}
            onChange={setEditing}
            onAccept={(field, value) => draft.answer({ [field]: value })}
            onConfirm={draft.confirm}
          />
        )}
      </div>
    </main>
  );
}
