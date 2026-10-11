import { spawn } from 'child_process';
import { FFMPEG_PATH, FFPROBE_PATH } from './ffmpegPath';

/**
 * Runs ffmpeg/ffprobe by spawning with an argument array — NEVER by building
 * a shell command string. Every value in `args` (storage paths, clip ids,
 * user-supplied text for drawtext, etc.) ultimately traces back to
 * user-controlled Firestore data, even though it already passed validation
 * upstream. spawn() with argv avoids any shell so there is no injection
 * surface, regardless of what characters end up in those strings.
 */
function run(
  bin: string,
  args: string[],
  label: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => reject(new Error(`${label} failed to start: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${label} exited with code ${code}: ${stderr.slice(-4000)}`));
      }
    });
  });
}

export function runFfmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  // -y: always overwrite temp outputs (they are single-use, freshly named).
  // -hide_banner / -loglevel: keep logs small; full stderr is still captured
  // for error messages via `run` above.
  return run(FFMPEG_PATH, ['-y', '-hide_banner', '-loglevel', 'error', ...args], 'ffmpeg');
}

export function runFfprobe(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return run(FFPROBE_PATH, args, 'ffprobe');
}

/**
 * Same as runFfmpeg but captures stdout as a raw Buffer instead of a string
 * — used when piping raw decoded frame data out of ffmpeg (e.g. for the
 * brightness/motion heuristics), where decoding as UTF-8 text would corrupt
 * the binary pixel data.
 */
export function runFfmpegBinary(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
      windowsHide: true,
    });
    const chunks: Buffer[] = [];
    let stderr = '';
    child.stdout?.on('data', (d) => chunks.push(d));
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => reject(new Error(`ffmpeg failed to start: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-4000)}`));
      }
    });
  });
}
