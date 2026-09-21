/**
 * Client-side validation for raw video clips uploaded to a Reel project.
 * Mirrors the backend's contentType and size checks so users get instant,
 * friendly feedback before we ever call `getReelClipUploadUrl`.
 */

export const REEL_CLIP_CONTENT_TYPE_PATTERN = /^video\/(mp4|quicktime|webm|x-matroska)$/;

export const REEL_CLIP_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-matroska,video/*';

export const REEL_MAX_CLIP_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

export const REEL_MIN_CLIPS = 3;

export const REEL_MAX_CLIPS = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Validates a single raw clip file. Returns an error message if invalid, or
 * null if the file is acceptable to upload.
 */
export function validateClipFile(file: File): string | null {
  if (!file || file.size === 0) {
    return 'Please select a video clip.';
  }

  if (!REEL_CLIP_CONTENT_TYPE_PATTERN.test(file.type)) {
    return 'Supported formats: MP4, MOV, WebM, MKV';
  }

  if (file.size > REEL_MAX_CLIP_SIZE_BYTES) {
    return `Clip size must be less than 200MB. Selected file: ${formatFileSize(file.size)}`;
  }

  return null;
}

/**
 * Validates that a proposed batch of clips would not exceed REEL_MAX_CLIPS
 * given the number of clips already added.
 */
export function validateClipCount(existingCount: number, incomingCount: number): string | null {
  if (existingCount + incomingCount > REEL_MAX_CLIPS) {
    const remaining = Math.max(REEL_MAX_CLIPS - existingCount, 0);
    return remaining === 0
      ? `You've reached the maximum of ${REEL_MAX_CLIPS} clips.`
      : `You can add ${remaining} more clip${remaining === 1 ? '' : 's'} (max ${REEL_MAX_CLIPS}).`;
  }
  return null;
}

/**
 * Reads a File's video duration in seconds using an off-screen <video>
 * element. Resolves with null if the duration cannot be determined.
 */
export function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
  });
}

/**
 * Generates a thumbnail data URL for a video file by seeking to a frame and
 * drawing it to an off-screen canvas. Resolves with null if generation fails
 * (callers should fall back to a generic video icon).
 */
export function generateClipThumbnail(file: File, seekToSeconds = 0.5): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      const seekTime = Math.min(seekToSeconds, Math.max(video.duration - 0.1, 0));
      video.currentTime = Number.isFinite(seekTime) ? seekTime : 0;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 180;
        canvas.height = video.videoHeight || 320;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}
