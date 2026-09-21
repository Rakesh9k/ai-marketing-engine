import { runFfmpeg } from '../lib/exec';
import { probeVideo } from '../lib/probe';
import { PIX_FMT } from './constants';
import { TRANSITION_DURATIONS, XFADE_NAMES } from './constants';

export interface ConcatClip {
  path: string;
  /** Transition used going INTO this clip from the previous one. Ignored for the first clip. */
  transitionIn: string;
}

/**
 * Joins an ordered list of already-normalized (same resolution/fps/pix_fmt)
 * silent video clips into one, using ffmpeg's `xfade` filter chained
 * pairwise. We route every join (including "hard_cut") through xfade with a
 * very short duration rather than switching between the concat demuxer and
 * a filter graph depending on content — one code path is far more reliable
 * than two, which matters more here than shaving a few hundred ms off a
 * hard-cut transition (see AGENTS instructions: reliability over transition
 * variety for this MVP).
 */
export async function concatWithTransitions(clips: ConcatClip[], outputPath: string): Promise<void> {
  if (clips.length === 0) {
    throw new Error('concatWithTransitions requires at least one clip');
  }
  if (clips.length === 1) {
    // Nothing to transition between — just re-mux/copy it to the expected output path.
    await runFfmpeg(['-i', clips[0].path, '-c', 'copy', outputPath]);
    return;
  }

  const durationsSec = await Promise.all(clips.map(async (c) => (await probeVideo(c.path)).durationMs / 1000));

  const inputArgs: string[] = [];
  clips.forEach((c) => {
    inputArgs.push('-i', c.path);
  });

  const filterParts: string[] = [];
  let currentLabel = '[0:v]';
  let runningDuration = durationsSec[0];

  for (let i = 1; i < clips.length; i++) {
    const transitionName = XFADE_NAMES[clips[i].transitionIn] ?? 'fade';
    const requestedDuration = TRANSITION_DURATIONS[clips[i].transitionIn] ?? 0.3;
    // Never let the crossfade exceed a third of either adjacent clip's
    // length — a long crossfade on a very short segment would visibly eat
    // most of the clip and can even produce a negative xfade offset.
    const maxSafe = Math.min(runningDuration, durationsSec[i]) / 3;
    const overlap = Math.max(0.02, Math.min(requestedDuration, maxSafe));
    const offset = Math.max(0, runningDuration - overlap);
    const outLabel = `[v${i}]`;
    filterParts.push(
      `${currentLabel}[${i}:v]xfade=transition=${transitionName}:duration=${overlap.toFixed(3)}:offset=${offset.toFixed(3)}${outLabel}`
    );
    runningDuration = offset + overlap + (durationsSec[i] - overlap);
    currentLabel = outLabel;
  }

  const finalLabel = currentLabel.replace(/[[\]]/g, '');

  await runFfmpeg([
    ...inputArgs,
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    `[${finalLabel}]`,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '21',
    '-pix_fmt',
    PIX_FMT,
    outputPath,
  ]);
}
