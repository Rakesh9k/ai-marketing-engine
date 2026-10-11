import { isDefaultBrainAgeRange } from '../../config/brainDefaults';

/**
 * What a generation model is allowed to see of a Business Brain.
 *
 * The Brain is dumped whole into the prompts, so anything stored in it can surface in a public ad. These
 * parts of it must never reach the model:
 *
 * - `owner` — a person's name and role. It is there for Mitra to address the owner, not to be printed
 *   on their posters. A live benchmark showed the model writing "Asha gari ethnic wear collection"
 *   into an ad, publishing the owner's first name without anyone choosing that.
 * - `knowledge` — provenance bookkeeping (which fact came from where). Meaningless to the model; it
 *   only adds noise and tokens.
 * - `lastSyncedAt` and an empty `campaignHistory` — bookkeeping with nothing to say.
 * - Placeholders Mitra stores so a new Brain is structurally complete, which nobody chose, so reading
 *   them as business facts would turn a default into a fact:
 *     - anything the provenance map records as SYSTEM_DEFAULT (language, style, tone, colours, fonts, age range);
 *     - `audience.ageRange` when it is the 18-65 placeholder on an older Brain with no provenance map (a range the
 *       owner set passes through);
 *     - `businessRules.operatingMode` on a Brain created by the conversational onboarding unless its
 *       provenance records where the mode came from (that onboarding never asks, so a bare "dine-in" is
 *       Mitra's default, not the owner's statement). Older Brains carry no provenance and are left as stored.
 *
 * Everything else (identity, offerings, audience, positioning, brand, rules, vertical profile) passes
 * through unchanged. Applied once at the pipeline's entry, so every stage, every caller and the stored
 * trace see the same filtered Brain.
 */
export function brainForGeneration<T>(brain: T): T {
  if (!brain || typeof brain !== 'object') return brain;
  const {
    owner: _owner,
    knowledge,
    lastSyncedAt: _lastSyncedAt,
    ...rest
  } = brain as Record<string, unknown>;

  const history = rest['campaignHistory'];
  if (Array.isArray(history) && history.length === 0) delete rest['campaignHistory'];

  const audience = rest['audience'];
  if (
    audience &&
    typeof audience === 'object' &&
    isDefaultBrainAgeRange((audience as { ageRange?: unknown }).ageRange)
  ) {
    const { ageRange: _placeholder, ...audienceRest } = audience as Record<string, unknown>;
    rest['audience'] = audienceRest;
  }

  // Anything the provenance map records as a SYSTEM_DEFAULT is Mitra's own placeholder, not a business fact.
  const recorded = (knowledge as { facts?: Record<string, { source?: string }> } | undefined)?.facts ?? {};
  for (const [path, fact] of Object.entries(recorded)) {
    if (fact?.source === 'SYSTEM_DEFAULT') omitPath(rest, path.split('.'));
  }

  const rules = rest['businessRules'];
  const facts = (knowledge as { facts?: Record<string, unknown> } | undefined)?.facts;
  if (rules && typeof rules === 'object' && knowledge && !facts?.['businessRules.operatingMode']) {
    const { operatingMode: _default, ...rulesRest } = rules as Record<string, unknown>;
    rest['businessRules'] = rulesRest;
  }

  return rest as T;
}

/** Remove a nested key, copying objects on the way so the caller's Brain is never mutated. */
function omitPath(root: Record<string, unknown>, path: string[]): void {
  const [head, ...tail] = path;
  if (head === undefined) return;
  if (tail.length === 0) {
    delete root[head];
    return;
  }
  const child = root[head];
  if (child && typeof child === 'object' && !Array.isArray(child)) {
    const copy = { ...(child as Record<string, unknown>) };
    omitPath(copy, tail);
    root[head] = copy;
  }
}
