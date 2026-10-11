import { runFfmpegBinary } from './exec';

const SAMPLE_SIZE = 64; // small grayscale frame keeps this cheap; heuristic only.
const FRAME_BYTES = SAMPLE_SIZE * SAMPLE_SIZE;

/**
 * Grabs a single frame at `timestampSec` as a SAMPLE_SIZE x SAMPLE_SIZE raw
 * 8-bit grayscale buffer. Using -ss before -i does fast (keyframe-seek)
 * seeking, which is good enough for a coarse brightness/motion heuristic —
 * this is explicitly documented in the spec as "reasonable approximations
 * are fine, this doesn't need to be research-grade."
 */
async function grabGrayFrame(filePath: string, timestampSec: number): Promise<Buffer> {
  const buf = await runFfmpegBinary([
    '-ss',
    Math.max(0, timestampSec).toFixed(3),
    '-i',
    filePath,
    '-frames:v',
    '1',
    '-vf',
    `scale=${SAMPLE_SIZE}:${SAMPLE_SIZE}:flags=fast_bilinear,format=gray`,
    '-f',
    'rawvideo',
    'pipe:1',
  ]);
  // Defensive: if ffmpeg produced a short/empty buffer (e.g. seek past EOF),
  // pad with mid-gray rather than throwing — this heuristic must never fail
  // the whole analyze-clip call.
  if (buf.length >= FRAME_BYTES) return buf.subarray(0, FRAME_BYTES);
  const padded = Buffer.alloc(FRAME_BYTES, 128);
  buf.copy(padded);
  return padded;
}

function averageByte(buf: Buffer): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i];
  return sum / buf.length;
}

function meanAbsDiff(a: Buffer, b: Buffer): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += Math.abs(a[i] - b[i]);
  return sum / len;
}

export interface HeuristicScores {
  brightnessScore: number;
  motionScore: number;
}

/**
 * Deterministic 0-1 brightness + motion heuristics used to help the AI
 * scoring stage upstream avoid picking near-black or near-static clips.
 * Samples 4 frames spread through the clip (avoiding the very first/last
 * few frames, which are disproportionately likely to be black/blurred
 * camera-start/stop artifacts).
 */
export async function computeHeuristics(
  filePath: string,
  durationMs: number
): Promise<HeuristicScores> {
  const durationSec = Math.max(durationMs / 1000, 0.5);
  const fractions = [0.15, 0.4, 0.65, 0.85];
  const timestamps = fractions.map((f) => f * durationSec);

  const frames: Buffer[] = [];
  for (const t of timestamps) {
    // Sequential (not Promise.all) to bound peak memory/CPU for long clips —
    // this runs inside a Cloud Run container with limited resources shared
    // across possibly-concurrent requests.
    frames.push(await grabGrayFrame(filePath, t));
  }

  const brightnesses = frames.map(averageByte);
  const brightnessScore = clamp01(average(brightnesses) / 255);

  const diffs: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    diffs.push(meanAbsDiff(frames[i - 1], frames[i]));
  }
  // Empirically, mean abs diff on 0-255 grayscale rarely exceeds ~60 even
  // for fast motion between widely-spaced sample frames; 80 is a soft
  // normalization ceiling picked to keep typical handheld footage in a
  // useful mid-range rather than pinned at 1.0.
  const motionScore = clamp01(average(diffs) / 80);

  return { brightnessScore, motionScore };
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
