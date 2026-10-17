'use client';

import Link from 'next/link';
import { buildUpgradePrompt, type UpgradeContext } from './upgradeModel';

/**
 * Shown inline at a genuine limit, never as a pop-up and never during onboarding. It is calm by design: what you
 * tried, why it cannot happen, what could change that, and the exact price and term. No guilt, no countdown.
 */
export function UpgradePrompt({ context }: { context: UpgradeContext }) {
  const model = buildUpgradePrompt(context);
  return (
    <section
      aria-labelledby="upgrade-prompt-title"
      data-testid="upgrade-prompt"
      className="border-border-medium bg-bg-secondary rounded-xl border p-4 text-sm"
    >
      <h3 id="upgrade-prompt-title" className="text-text-primary font-semibold">
        {model.tried}
      </h3>
      <p className="text-text-secondary mt-1">{model.why}</p>
      {model.options.length > 0 && (
        <ul className="mt-3 space-y-2">
          {model.options.map((o) => (
            <li key={o.id} className="border-border-light bg-bg-primary rounded-lg border p-3">
              <p className="text-text-primary font-medium">
                {o.title}: {o.price}
              </p>
              <p className="text-text-secondary text-xs">
                {o.adds}. {o.term}.
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-text-tertiary mt-3 text-xs">{model.renewal}</p>
      <Link href={model.href} className="text-brand-700 mt-2 inline-block font-medium underline">
        See plans and pay
      </Link>
    </section>
  );
}
