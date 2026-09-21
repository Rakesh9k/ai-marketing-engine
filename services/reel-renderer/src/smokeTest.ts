/**
 * Local smoke test — NOT part of the deployed service, NOT a unit test
 * suite. Exercises the actual ffmpeg pipeline (segment build, title cards,
 * xfade concatenation, logo overlay, music mix + export, thumbnail
 * extraction) directly against local files, bypassing Firebase Storage and
 * the HTTP layer entirely. Run via `npm run smoke-test` after `npm run
 * build`. Requires ffmpeg/ffprobe to be resolvable (via ffmpeg-static /
 * ffprobe-static, already a dependency) and a usable drawtext font at
 * FONT_PATH (override via env var — the default only exists inside the
 * Linux container built by the Dockerfile).
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { runFfmpeg } from './lib/exec';
import { probeVideo } from './lib/probe';
import { extractThumbnail } from './lib/thumbnail';
import { computeHeuristics } from './lib/heuristics';
import { buildSegmentClip } from './render/segmentBuilder';
import { buildTextCardClip } from './render/textCard';
import { concatWithTransitions } from './render/concat';
import { overlayLogo } from './render/logoOverlay';
import { mixMusicAndExport } from './render/audioMix';

async function main() {
  const dir = path.join(os.tmpdir(), `reel-smoke-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  console.log('Working dir:', dir);

  try {
    // 1. Synthesize two tiny test clips (one landscape, one portrait) plus
    // a synthetic music track and a tiny logo image, all with ffmpeg's
    // lavfi test sources — no external assets needed.
    const clip1 = path.join(dir, 'clip1.mp4'); // landscape source
    const clip2 = path.join(dir, 'clip2.mp4'); // portrait source
    const music = path.join(dir, 'music.mp3');
    const logo = path.join(dir, 'logo.png');

    console.log('Generating synthetic test inputs...');
    await runFfmpeg([
      '-f', 'lavfi', '-i', 'testsrc=duration=4:size=640x480:rate=15',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip1,
    ]);
    await runFfmpeg([
      '-f', 'lavfi', '-i', 'testsrc2=duration=3:size=480x854:rate=15',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip2,
    ]);
    await runFfmpeg([
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
      '-c:a', 'libmp3lame', music,
    ]);
    await runFfmpeg([
      '-f', 'lavfi', '-i', 'color=c=red:s=200x200:d=1',
      '-frames:v', '1', logo,
    ]);

    // 2. Sanity-check analyze-clip's building blocks against clip1.
    console.log('Probing clip1...');
    const probe1 = await probeVideo(clip1);
    console.log('  ->', probe1);

    const thumb1 = path.join(dir, 'clip1_thumb.jpg');
    await extractThumbnail(clip1, thumb1, probe1.durationMs);
    const thumbStat = await fs.stat(thumb1);
    console.log('  thumbnail bytes:', thumbStat.size);

    console.log('Computing heuristics for clip1...');
    const heuristics = await computeHeuristics(clip1, probe1.durationMs);
    console.log('  ->', heuristics);

    // 3. Build the render pipeline's pieces against both clips, exercising
    // the landscape-source center-crop path (clip1) and the already-
    // portrait path (clip2).
    console.log('Building hook title card...');
    const hookPath = path.join(dir, 'hook.mp4');
    await buildTextCardClip({
      text: 'Fresh Samosas Daily!',
      durationMs: 1500,
      outputPath: hookPath,
      workDir: dir,
      primaryColor: '#d1495b',
    });

    console.log('Building segment 1 (landscape source, with caption)...');
    const seg1Path = path.join(dir, 'seg1.mp4');
    await buildSegmentClip({
      inputPath: clip1,
      startMs: 200,
      endMs: 2000,
      text: 'Made fresh every morning',
      outputPath: seg1Path,
      workDir: dir,
    });

    console.log('Building segment 2 (portrait source, no caption)...');
    const seg2Path = path.join(dir, 'seg2.mp4');
    await buildSegmentClip({
      inputPath: clip2,
      startMs: 0,
      endMs: 1800,
      outputPath: seg2Path,
      workDir: dir,
    });

    console.log('Building ending title card (with CTA lines)...');
    const endingPath = path.join(dir, 'ending.mp4');
    await buildTextCardClip({
      text: 'Visit Us Today',
      durationMs: 1500,
      outputPath: endingPath,
      workDir: dir,
      primaryColor: '#d1495b',
      extraLines: ['Call now: 98765 43210', 'WhatsApp: 98765 43210', 'MG Road, Bengaluru'],
    });

    console.log('Concatenating with mixed transitions (fade, hard_cut, dissolve, fade)...');
    const concatenatedPath = path.join(dir, 'concatenated.mp4');
    await concatWithTransitions(
      [
        { path: hookPath, transitionIn: 'fade' },
        { path: seg1Path, transitionIn: 'hard_cut' },
        { path: seg2Path, transitionIn: 'dissolve' },
        { path: endingPath, transitionIn: 'fade' },
      ],
      concatenatedPath
    );
    const concatenatedProbe = await probeVideo(concatenatedPath);
    console.log('  -> concatenated probe:', concatenatedProbe);
    if (concatenatedProbe.width !== 1080 || concatenatedProbe.height !== 1920) {
      throw new Error('Concatenated output is not 1080x1920 as expected');
    }

    console.log('Overlaying logo watermark...');
    const withLogoPath = path.join(dir, 'with-logo.mp4');
    await overlayLogo({ videoPath: concatenatedPath, logoPath: logo, outputPath: withLogoPath });

    console.log('Mixing music and exporting final MP4...');
    const finalPath = path.join(dir, 'final.mp4');
    await mixMusicAndExport({
      silentVideoPath: withLogoPath,
      musicPath: music,
      outputPath: finalPath,
      durationSec: concatenatedProbe.durationMs / 1000,
    });

    const finalProbe = await probeVideo(finalPath);
    const finalStat = await fs.stat(finalPath);
    console.log('Final video probe:', finalProbe);
    console.log('Final video size (bytes):', finalStat.size);

    if (finalProbe.width !== 1080 || finalProbe.height !== 1920) {
      throw new Error('Final output is not 1080x1920 as expected');
    }

    console.log('Extracting final thumbnail...');
    const finalThumb = path.join(dir, 'final_thumb.jpg');
    await extractThumbnail(finalPath, finalThumb, finalProbe.durationMs, { timestampMs: 500 });
    const finalThumbStat = await fs.stat(finalThumb);
    console.log('Final thumbnail bytes:', finalThumbStat.size);

    console.log('\nSMOKE TEST PASSED. Output files left in:', dir);
    console.log('  Inspect', finalPath, 'and', finalThumb, 'manually if desired.');
  } catch (err) {
    console.error('\nSMOKE TEST FAILED:', err);
    console.error('Working dir left for inspection:', dir);
    process.exitCode = 1;
  }
}

main();
