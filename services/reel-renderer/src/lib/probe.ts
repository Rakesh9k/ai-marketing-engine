import { runFfprobe } from './exec';

export interface ProbeResult {
  durationMs: number;
  width: number;
  height: number;
}

/**
 * Reads container duration + the first video stream's dimensions via
 * ffprobe's JSON output (-print_format json), never by scraping human-
 * readable ffmpeg stderr text.
 */
export async function probeVideo(filePath: string): Promise<ProbeResult> {
  const { stdout } = await runFfprobe([
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  const data = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; width?: number; height?: number; duration?: string }>;
  };
  const videoStream = (data.streams || []).find((s) => s.codec_type === 'video');
  if (!videoStream) {
    throw new Error('No video stream found in file');
  }
  const durationSec = Number(data.format?.duration ?? videoStream.duration ?? 0);
  return {
    durationMs: Math.round(durationSec * 1000),
    width: videoStream.width || 0,
    height: videoStream.height || 0,
  };
}
