#!/usr/bin/env node
/**
 * Synthesizes the in-house reel music library declared in functions/src/config/reels.ts
 * (REEL_MUSIC_LIBRARY) with ffmpeg only: sine/noise sources, no samples, no third-party
 * material ("Mitra Original" licence). Output: <outDir>/<id>.mp3, 45 s, 44.1 kHz stereo.
 *
 *   node scripts/generate-reel-music.mjs [outDir]            # default: ./tmp/reel-music
 *   FFMPEG=/path/to/ffmpeg node scripts/generate-reel-music.mjs
 *
 * Upload once per environment (see AGENTS.md "MUSIC"):
 *   gcloud storage cp <outDir>/*.mp3 gs://<bucket>/shared/reel-music/
 * The renderer loops/trims tracks, so exact length is not critical.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const outDir = path.resolve(process.argv[2] ?? 'tmp/reel-music');
mkdirSync(outDir, { recursive: true });

const ffmpeg =
  process.env.FFMPEG ??
  (() => {
    try {
      return require(path.resolve('services/reel-renderer/node_modules/ffmpeg-static'));
    } catch {
      return 'ffmpeg';
    }
  })();

const source = readFileSync('functions/src/config/reels.ts', 'utf8');
const tracks = [
  ...source.matchAll(
    /id: '(\w+)',\s*name: '[^']+',\s*category: '(\w+)',[\s\S]*?durationSeconds: (\d+),\s*bpm: (\d+)/g
  ),
].map((m) => ({ id: m[1], category: m[2], seconds: Number(m[3]), bpm: Number(m[4]) }));
if (tracks.length !== 7) throw new Error(`expected 7 tracks in reels.ts, found ${tracks.length}`);

// Per-category voicing: root note (Hz), chord ratios, which rhythmic layers are on.
const VOICING = {
  energetic: { root: 196.0, chord: [1, 1.25, 1.5], kick: 0.7, hat: 0.1, bass: 0.35, pad: 0.12 },
  premium: { root: 174.61, chord: [1, 1.2, 1.5], kick: 0, hat: 0, bass: 0.18, pad: 0.22 },
  fun: { root: 220.0, chord: [1, 1.25, 1.5], kick: 0.45, hat: 0.08, bass: 0.3, pad: 0.14 },
  food: { root: 261.63, chord: [1, 1.25, 1.5], kick: 0, hat: 0.07, bass: 0.22, pad: 0.18 },
  cinematic: { root: 130.81, chord: [1, 1.2, 1.5], kick: 0.35, hat: 0, bass: 0.3, pad: 0.26 },
  minimal: { root: 196.0, chord: [1, 1.5, 2], kick: 0, hat: 0.04, bass: 0.1, pad: 0.12 },
  offer: { root: 233.08, chord: [1, 1.25, 1.5], kick: 0.7, hat: 0.12, bass: 0.38, pad: 0.12 },
};

for (const t of tracks) {
  const v = VOICING[t.category];
  if (!v) throw new Error(`no voicing for category ${t.category}`);
  const beat = (60 / t.bpm).toFixed(5);
  const d = t.seconds;
  const inputs = [];
  const chains = [];
  const mixed = [];
  let i = 0;
  const add = (src, filt, gain) => {
    inputs.push('-f', 'lavfi', '-i', src);
    chains.push(`[${i}:a]${filt},volume=${gain}[m${i}]`);
    mixed.push(`[m${i}]`);
    i++;
  };
  // Chord pad: three sines with a slow tremolo.
  v.chord.forEach((r) =>
    add(`sine=f=${(v.root * r).toFixed(2)}:d=${d}`, `tremolo=f=0.25:d=0.4`, v.pad / 3)
  );
  // Pulsing bass on eighth notes.
  if (v.bass > 0) {
    add(
      `sine=f=${(v.root / 2).toFixed(2)}:d=${d}`,
      `tremolo=f=${(t.bpm / 60) * 2}:d=0.85`,
      v.bass
    );
  }
  // Kick: pitch-dropping thump once per beat.
  if (v.kick > 0) {
    add(
      `aevalsrc='exp(-9*mod(t,${beat}))*sin(2*PI*(52+90*exp(-28*mod(t,${beat})))*mod(t,${beat}))':d=${d}:s=44100`,
      'anull',
      v.kick
    );
  }
  // Hi-hat: short filtered noise burst on every off-beat eighth.
  if (v.hat > 0) {
    const half = (60 / t.bpm / 2).toFixed(5);
    add(
      `anoisesrc=color=white:d=${d}:r=44100`,
      `highpass=f=7000,volume='if(lt(mod(t+${half},${beat}),0.035),1,0)':eval=frame`,
      v.hat
    );
  }
  const filter =
    chains.join(';') +
    `;${mixed.join('')}amix=inputs=${mixed.length}:normalize=0,` +
    `aformat=sample_fmts=fltp:channel_layouts=stereo,loudnorm=I=-18:TP=-2:LRA=7,` +
    `afade=t=in:st=0:d=1,afade=t=out:st=${d - 2}:d=2[out]`;
  const out = path.join(outDir, `${t.id}.mp3`);
  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-v',
      'error',
      ...inputs,
      '-filter_complex',
      filter,
      '-map',
      '[out]',
      '-ar',
      '44100',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      '-t',
      String(d),
      out,
    ],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${t.id}: ${r.stderr}`);
  console.log(`generated ${out}`);
}
