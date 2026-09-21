import { runFfmpeg } from '../lib/exec';

const MUSIC_VOLUME = 0.22; // background only — always secondary to the visual story, per product brief
const FADE_IN_SEC = 0.5;
const FADE_OUT_SEC = 1.0;

/**
 * Final export step: mixes the (silent) fully-assembled video with a
 * background music bed looped/trimmed to the video's exact duration, at a
 * fixed low volume with a short fade-in/out, and encodes the final H.264
 * MP4 at a bitrate ceiling tuned for a "few MB per 15-45s" Reels-friendly
 * file size. This is the only place audio is added — see renderReel.ts for
 * why original clip audio is intentionally dropped for this MVP.
 */
export async function mixMusicAndExport(params: {
  silentVideoPath: string;
  musicPath: string;
  outputPath: string;
  durationSec: number;
}): Promise<void> {
  const { silentVideoPath, musicPath, outputPath, durationSec } = params;
  const fadeOutStart = Math.max(0, durationSec - FADE_OUT_SEC);

  await runFfmpeg([
    '-i',
    silentVideoPath,
    // Loop the music indefinitely; we trim it to the exact final duration
    // below via -t / atrim, so a track shorter than the reel still covers
    // the whole thing instead of leaving trailing silence.
    '-stream_loop',
    '-1',
    '-i',
    musicPath,
    '-filter_complex',
    `[1:a]atrim=0:${durationSec.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `volume=${MUSIC_VOLUME},` +
      `afade=t=in:st=0:d=${FADE_IN_SEC},` +
      `afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${FADE_OUT_SEC},` +
      `loudnorm=I=-16:TP=-1.5:LRA=11[aout]`,
    '-map',
    '0:v',
    '-map',
    '[aout]',
    '-t',
    durationSec.toFixed(3),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-maxrate',
    '4M',
    '-bufsize',
    '8M',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
}
