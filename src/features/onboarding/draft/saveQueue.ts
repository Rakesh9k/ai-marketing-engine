import type { DraftFieldPath, FactValue } from '../engine/fields';

/** What the owner has changed since the last successful save. */
export interface Patch {
  updates: Partial<Record<DraftFieldPath, FactValue>>;
  skip: DraftFieldPath[];
  welcomed?: boolean;
  /** The review screen is on screen right now (the server verifies the draft is reviewable). */
  reviewShown?: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'error';

export interface PatchStore {
  load: () => Patch | null;
  save: (patch: Patch | null) => void;
}

export const emptyPatch = (): Patch => ({ updates: {}, skip: [] });

export const isEmptyPatch = (p: Patch): boolean =>
  Object.keys(p.updates).length === 0 && p.skip.length === 0 && !p.welcomed && !p.reviewShown;

/** Later wins. An answer cancels a pending skip of the same field, and a skip cancels an answer. */
export function mergePatches(older: Patch, newer: Patch): Patch {
  const updates = { ...older.updates, ...newer.updates };
  const skip = new Set<DraftFieldPath>([...older.skip, ...newer.skip]);
  for (const path of Object.keys(newer.updates) as DraftFieldPath[]) skip.delete(path);
  for (const path of newer.skip) delete updates[path];
  for (const path of Object.keys(updates) as DraftFieldPath[]) skip.delete(path);
  // "The review is showing" is only true of the latest screen: an edit made after it means the
  // owner has gone back to a question, so the older claim must not ride along with it.
  const newerEdits = Object.keys(newer.updates).length > 0 || newer.skip.length > 0;
  const reviewShown = newer.reviewShown || (!newerEdits && older.reviewShown);
  return {
    updates,
    skip: [...skip].sort(),
    ...(older.welcomed || newer.welcomed ? { welcomed: true } : {}),
    ...(reviewShown ? { reviewShown: true } : {}),
  };
}

/**
 * Saves answers one write at a time, coalescing whatever piles up while a save is in flight.
 *
 * - One backend write per answered question (not per keystroke), and several quick answers
 *   collapse into one call: enough durability without hammering the backend.
 * - A failed save is never dropped: it stays pending (and mirrored to `store`, so it also
 *   survives a refresh) and is retried on the next enqueue/retry/`online` event.
 */
export class SaveQueue {
  private pending: Patch;
  private inFlight = false;
  private status: SaveStatus = 'idle';

  constructor(
    private readonly send: (patch: Patch) => Promise<void>,
    private readonly onStatus: (status: SaveStatus) => void = () => undefined,
    private readonly store?: PatchStore
  ) {
    this.pending = store?.load() ?? emptyPatch();
  }

  get hasPending(): boolean {
    return !isEmptyPatch(this.pending);
  }

  get isBusy(): boolean {
    return this.inFlight || this.hasPending;
  }

  get peek(): Patch {
    return this.pending;
  }

  enqueue(patch: Partial<Patch>): Promise<void> {
    this.pending = mergePatches(this.pending, { ...emptyPatch(), ...patch });
    this.store?.save(this.hasPending ? this.pending : null);
    return this.flush();
  }

  async flush(): Promise<void> {
    if (this.inFlight || !this.hasPending) return;
    this.inFlight = true;
    this.setStatus('saving');

    const taking = this.pending;
    this.pending = emptyPatch();
    try {
      await this.send(taking);
      this.store?.save(this.hasPending ? this.pending : null);
      this.inFlight = false;
      if (this.hasPending) {
        await this.flush(); // more arrived while we were saving
      } else {
        this.setStatus('idle');
      }
    } catch {
      // Put it back *under* anything newer so the latest answer still wins.
      this.pending = mergePatches(taking, this.pending);
      this.store?.save(this.pending);
      this.inFlight = false;
      this.setStatus('error');
    }
  }

  private setStatus(next: SaveStatus) {
    if (this.status === next) return;
    this.status = next;
    this.onStatus(next);
  }
}
