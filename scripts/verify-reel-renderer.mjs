#!/usr/bin/env node
/**
 * Production verification of the Cloud Run reel renderer, using only `gcloud` credentials
 * (the caller needs roles/run.invoker on the service) and the renderer's bundled ffmpeg.
 *
 *   node scripts/verify-reel-renderer.mjs [--keep]
 *
 * Checks: IAM (anonymous call is refused), /healthz, bad input fails safely, a missing clip
 * or missing music track fails with no output object, and two CONCURRENT real renders for two
 * different throwaway tenants produce valid, separate 1080x1920 H.264+AAC MP4s. Everything is
 * written under businesses/p4verify-* and deleted afterwards (unless --keep). It never writes
 * to shared/reel-music/ (the real music library).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PROJECT = process.env.GCP_PROJECT ?? 'brainwise-ai-marketing-engine';
const BUCKET = process.env.BUCKET ?? `${PROJECT}.firebasestorage.app`;
const URL_BASE = process.env.REEL_RENDERER_URL ?? 'https://reel-renderer-64pminaxoq-el.a.run.app';
const keep = process.argv.includes('--keep');
const FFMPEG = require(path.resolve('services/reel-renderer/node_modules/ffmpeg-static'));
const FFPROBE = require(path.resolve('services/reel-renderer/node_modules/ffprobe-static')).path;
const GCLOUD = process.env.GCLOUD ?? 'gcloud';
const SHELL = process.platform === 'win32';
const work = path.join(os.tmpdir(), `p4verify-${randomUUID()}`);
mkdirSync(work, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  - ' + detail : ''}`);
};

function run(cmd, args, useShell = false) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: useShell, maxBuffer: 1 << 28 });
  if (r.status !== 0) {
    throw new Error(`${path.basename(cmd)} ${args.slice(0, 3).join(' ')} failed: ${(r.stderr || '').slice(0, 300)}`);
  }
  return r.stdout;
}
const gcloud = (args) => run(GCLOUD, args, SHELL);

const token = gcloud(['auth', 'print-identity-token']).trim();
const gsUri = (p) => `gs://${BUCKET}/${p}`;
const upload = (local, remote, type) =>
  gcloud(['storage', 'cp', `"${local}"`, gsUri(remote), `--content-type=${type}`, `--project=${PROJECT}`]);
const download = (remote, local) => gcloud(['storage', 'cp', gsUri(remote), `"${local}"`, `--project=${PROJECT}`]);
const exists = (remote) =>
  spawnSync(GCLOUD, ['storage', 'ls', gsUri(remote), `--project=${PROJECT}`], { encoding: 'utf8', shell: SHELL }).status === 0;
const probe = (file) =>
  JSON.parse(run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]));

async function call(route, body, auth = true) {
  const t0 = Date.now();
  const res = await fetch(`${URL_BASE}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text, ms: Date.now() - t0 };
}

const MUSIC = (id, category) => ({
  id,
  name: id,
  category,
  mood: 'verify',
  durationSeconds: 45,
  license: 'Mitra Original',
  source: 'in-house',
  attributionRequired: false,
  recommendedVolume: 0.24,
  storagePath: `shared/reel-music/${id}.mp3`,
});

function tenant(prefix, label, style, musicId, category) {
  const base = `businesses/${prefix}`;
  return {
    prefix,
    label,
    input: {
      reelId: `reel-${prefix}`,
      businessId: prefix,
      durationSeconds: 15,
      style,
      plan: {
        templateId: 'food_reveal',
        hook: { text: `${label} HOOK`, durationMs: 1500 },
        segments: [
          { clipId: 'c1', startMs: 0, endMs: 2500, text: `${label} line one`, transitionIn: 'fade' },
          { clipId: 'c2', startMs: 200, endMs: 2700, text: `${label} line two`, transitionIn: 'hard_cut' },
          { clipId: 'c3', startMs: 100, endMs: 2600, text: `${label} line three`, transitionIn: 'zoom_punch' },
        ],
        offer: { text: `${label} OFFER Rs 299`, durationMs: 1500 },
        ending: {
          text: `Visit ${label}`,
          durationMs: 2000,
          cta: 'Order Now',
          whatsapp: '9876543210',
          location: 'Hyderabad',
        },
        musicTrackId: musicId,
        totalDurationMs: 15000,
      },
      clips: ['c1', 'c2', 'c3'].map((c) => ({ clipId: c, storagePath: `${base}/clips/${c}.mp4` })),
      music: MUSIC(musicId, category),
      brand: { businessName: label, primaryColor: '#e63946', locationText: 'Hyderabad, Telangana' },
      outputStoragePath: `${base}/output/reel.mp4`,
      thumbnailStoragePath: `${base}/output/thumbnail.jpg`,
    },
  };
}

function makeClips(prefix, sources) {
  sources.forEach((src, i) => {
    const f = path.join(work, `${prefix}-c${i + 1}.mp4`);
    run(FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `${src}=duration=4:size=720x1280:rate=30`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f]);
    upload(f, `businesses/${prefix}/clips/c${i + 1}.mp4`, 'video/mp4');
  });
}

const prefixes = [];
try {
  // 1. IAM: an anonymous caller must be refused by Cloud Run itself.
  const anon = await call('/render', {}, false);
  check('anonymous request is refused (Cloud Run IAM)', anon.status === 401 || anon.status === 403, `HTTP ${anon.status}`);

  // 2. Health.
  const h = await fetch(`${URL_BASE}/healthz`, { headers: { authorization: `Bearer ${token}` } });
  check('/healthz ok with an authorised identity', h.status === 200, `HTTP ${h.status}`);

  // 3. Malformed input fails safely.
  const bad = await call('/render', { reelId: 'x' });
  check('malformed render input is rejected (4xx, no success)', bad.status >= 400 && bad.status < 500, `HTTP ${bad.status} ${bad.text.slice(0, 120)}`);

  // 4. Missing source clip / missing music => failure and NO output object.
  const id8 = () => randomUUID().slice(0, 8);
  const A = tenant(`p4verify-a-${id8()}`, 'Alpha Biryani', 'fast_engaging', 'energetic_01', 'energetic');
  const B = tenant(`p4verify-b-${id8()}`, 'Beta Salon', 'premium', 'premium_01', 'premium');
  const N = tenant(`p4verify-n-${id8()}`, 'Negative', 'fast_engaging', 'energetic_01', 'energetic');
  prefixes.push(A.prefix, B.prefix, N.prefix);

  makeClips(N.prefix, ['testsrc']); // only c1 exists; c2 and c3 are missing
  const missingClip = await call('/render', N.input);
  check('missing source clip fails (no fake success)', missingClip.status >= 400, `HTTP ${missingClip.status}`);
  check('failed render leaves no output object in Storage', !exists(N.input.outputStoragePath));

  makeClips(A.prefix, ['testsrc', 'testsrc2', 'smptebars']);
  makeClips(B.prefix, ['testsrc2', 'smptebars', 'testsrc']);

  const noMusicInput = structuredClone(A.input);
  noMusicInput.music.storagePath = 'shared/reel-music/does_not_exist.mp3';
  noMusicInput.outputStoragePath = `businesses/${A.prefix}/output/nomusic.mp4`;
  const noMusic = await call('/render', noMusicInput);
  check('missing music track fails (no fake success)', noMusic.status >= 400, `HTTP ${noMusic.status}`);
  check('missing-music failure leaves no output object', !exists(noMusicInput.outputStoragePath));

  // 5. Two concurrent real renders for two different tenants.
  const [ra, rb] = await Promise.all([call('/render', A.input), call('/render', B.input)]);
  for (const [t, r] of [[A, ra], [B, rb]]) {
    check(`${t.label}: render returned 200`, r.status === 200, `HTTP ${r.status}, ${(r.ms / 1000).toFixed(1)}s ${r.status !== 200 ? r.text.slice(0, 160) : ''}`);
  }
  for (const [t, r] of [[A, ra], [B, rb]]) {
    if (r.status !== 200) continue;
    const mp4 = path.join(work, `${t.prefix}.mp4`);
    const jpg = path.join(work, `${t.prefix}.jpg`);
    download(t.input.outputStoragePath, mp4);
    download(t.input.thumbnailStoragePath, jpg);
    const p = probe(mp4);
    const v = p.streams.find((s) => s.codec_type === 'video');
    const a = p.streams.find((s) => s.codec_type === 'audio');
    const size = statSync(mp4).size;
    const dur = Number(p.format.duration);
    check(`${t.label}: MP4 container + H.264 video`, /mp4/.test(p.format.format_name) && v?.codec_name === 'h264', `${p.format.format_name}, ${v?.codec_name}`);
    check(`${t.label}: 1080x1920 vertical`, v?.width === 1080 && v?.height === 1920, `${v?.width}x${v?.height}`);
    check(`${t.label}: audio stream present (AAC)`, a?.codec_name === 'aac', a?.codec_name ?? 'none');
    check(`${t.label}: duration plausible`, dur > 8 && dur < 20, `${dur.toFixed(1)}s`);
    check(`${t.label}: size sane`, size > 100_000 && size < 60_000_000, `${(size / 1e6).toFixed(2)} MB`);
    check(`${t.label}: thumbnail is a real JPEG`, statSync(jpg).size > 1000);
    run(FFMPEG, ['-y', '-v', 'error', '-ss', '0.7', '-i', mp4, '-frames:v', '1', path.join(work, `${t.prefix}-hook.png`)]);
    run(FFMPEG, ['-y', '-v', 'error', '-ss', '3.2', '-i', mp4, '-frames:v', '1', path.join(work, `${t.prefix}-segment.png`)]);
    run(FFMPEG, ['-y', '-v', 'error', '-ss', String(Math.max(dur - 1, 1)), '-i', mp4, '-frames:v', '1', path.join(work, `${t.prefix}-end.png`)]);
    const vol = spawnSync(FFMPEG, ['-hide_banner', '-i', mp4, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/mean_volume: (-?[\d.]+) dB/);
    check(`${t.label}: audio is not silent`, !!vol && Number(vol[1]) > -60, vol ? `${vol[1]} dB mean` : 'n/a');
  }
  check(
    'tenant outputs are separate objects',
    A.input.outputStoragePath !== B.input.outputStoragePath && exists(A.input.outputStoragePath) && exists(B.input.outputStoragePath)
  );
  writeFileSync(path.join(work, 'summary.json'), JSON.stringify({ msA: ra.ms, msB: rb.ms, a: ra.json, b: rb.json }, null, 1));
  console.log(`\nartifacts (mp4 + frames): ${work}`);
} catch (e) {
  check('verification script ran to completion', false, String(e.message ?? e));
} finally {
  if (!keep) {
    for (const p of prefixes) {
      spawnSync(GCLOUD, ['storage', 'rm', '-r', gsUri(`businesses/${p}/`), `--project=${PROJECT}`, '--quiet'], { shell: SHELL, encoding: 'utf8' });
    }
    console.log('test objects removed from Storage');
  } else {
    console.log('--keep: test objects left under businesses/p4verify-* (remove them afterwards)');
  }
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
