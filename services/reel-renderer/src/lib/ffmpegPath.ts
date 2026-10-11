/**
 * Resolves ffmpeg/ffprobe binary paths.
 *
 * We ship static binaries via ffmpeg-static / ffprobe-static npm packages
 * rather than relying on `apt-get install ffmpeg` in the Dockerfile. This
 * keeps the container image build deterministic across host architectures
 * and avoids depending on whatever ffmpeg version Debian's repos happen to
 * carry. If FFMPEG_PATH / FFPROBE_PATH env vars are set (e.g. to point at a
 * system binary installed via apt in a custom base image), those win.
 */
import ffmpegStatic from 'ffmpeg-static';
// ffprobe-static has no bundled types; its default export shape is
// `{ path: string }`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeStatic = require('ffprobe-static') as { path: string };

export const FFMPEG_PATH = process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string);
export const FFPROBE_PATH = process.env.FFPROBE_PATH || ffprobeStatic.path;

if (!FFMPEG_PATH) {
  throw new Error('ffmpeg binary could not be resolved (ffmpeg-static returned empty path)');
}
if (!FFPROBE_PATH) {
  throw new Error('ffprobe binary could not be resolved (ffprobe-static returned empty path)');
}
