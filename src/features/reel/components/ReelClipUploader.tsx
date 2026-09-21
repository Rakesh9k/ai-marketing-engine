'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import {
  REEL_CLIP_ACCEPT,
  REEL_MAX_CLIPS,
  REEL_MIN_CLIPS,
  generateClipThumbnail,
  getVideoDuration,
  validateClipCount,
  validateClipFile,
} from '@/features/reel/services/reelClipValidation';
import { uploadReelClip, type UploadedReelClip } from '@/features/reel/services/reelService';

export interface ClipEntry {
  localId: string;
  file: File;
  thumbnail: string | null;
  durationSeconds: number | null;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error: string | null;
  uploaded: UploadedReelClip | null;
}

export type ClipsUpdater = ClipEntry[] | ((prev: ClipEntry[]) => ClipEntry[]);

interface ReelClipUploaderProps {
  businessId: string;
  reelId: string;
  clips: ClipEntry[];
  onClipsChange: (update: ClipsUpdater) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

let localIdCounter = 0;
function nextLocalId(): string {
  localIdCounter += 1;
  return `clip-${Date.now()}-${localIdCounter}`;
}

export function ReelClipUploader({
  businessId,
  reelId,
  clips,
  onClipsChange,
  disabled = false,
}: ReelClipUploaderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [countError, setCountError] = useState<string | null>(null);

  const uploadedCount = clips.filter((c) => c.status === 'uploaded').length;
  const atMax = clips.length >= REEL_MAX_CLIPS;
  const belowMin = uploadedCount < REEL_MIN_CLIPS;

  const startUpload = useCallback(
    (entry: ClipEntry) => {
      onClipsChange(
        clips.map((c) => (c.localId === entry.localId ? { ...c, status: 'uploading' } : c))
      );

      uploadReelClip(entry.file, businessId, reelId, (percent) => {
        onClipsChange((prevClips: ClipEntry[]) =>
          prevClips.map((c) => (c.localId === entry.localId ? { ...c, progress: percent } : c))
        );
      })
        .then((uploaded) => {
          onClipsChange((prevClips: ClipEntry[]) =>
            prevClips.map((c) =>
              c.localId === entry.localId
                ? { ...c, status: 'uploaded', progress: 100, uploaded }
                : c
            )
          );
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Upload failed';
          onClipsChange((prevClips: ClipEntry[]) =>
            prevClips.map((c) =>
              c.localId === entry.localId ? { ...c, status: 'error', error: message } : c
            )
          );
          showToast(`${entry.file.name}: ${message}`, 'error');
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClipsChange used both as setter and updater function
    [businessId, reelId, clips, onClipsChange, showToast]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const countErr = validateClipCount(clips.length, files.length);
      if (countErr) {
        setCountError(countErr);
        showToast(countErr, 'error');
        return;
      }
      setCountError(null);

      const newEntries: ClipEntry[] = [];
      for (const file of files) {
        const validationError = validateClipFile(file);
        const localId = nextLocalId();

        if (validationError) {
          newEntries.push({
            localId,
            file,
            thumbnail: null,
            durationSeconds: null,
            progress: 0,
            status: 'error',
            error: validationError,
            uploaded: null,
          });
          showToast(`${file.name}: ${validationError}`, 'error');
          continue;
        }

        const [thumbnail, durationSeconds] = await Promise.all([
          generateClipThumbnail(file).catch(() => null),
          getVideoDuration(file).catch(() => null),
        ]);

        newEntries.push({
          localId,
          file,
          thumbnail,
          durationSeconds,
          progress: 0,
          status: 'pending',
          error: null,
          uploaded: null,
        });
      }

      const updatedClips = [...clips, ...newEntries];
      onClipsChange(updatedClips);

      newEntries.filter((e) => e.status === 'pending').forEach((entry) => startUpload(entry));
    },
    [clips, onClipsChange, showToast, startUpload]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        void handleFiles(e.target.files);
      }
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleRemove = useCallback(
    (localId: string) => {
      onClipsChange(clips.filter((c) => c.localId !== localId));
    },
    [clips, onClipsChange]
  );

  const handleRetry = useCallback(
    (localId: string) => {
      const entry = clips.find((c) => c.localId === localId);
      if (!entry) return;
      const validationError = validateClipFile(entry.file);
      if (validationError) {
        showToast(validationError, 'error');
        return;
      }
      startUpload({ ...entry, status: 'pending', error: null });
    },
    [clips, showToast, startUpload]
  );

  const canAddMore = !disabled && !atMax;

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          canAddMore
            ? 'hover:border-brand-500 hover:bg-brand-50 cursor-pointer border-neutral-300'
            : 'cursor-not-allowed border-neutral-200 bg-neutral-50'
        }`}
        onDragOver={canAddMore ? handleDragOver : undefined}
        onDrop={canAddMore ? handleDrop : undefined}
        onClick={() => canAddMore && fileInputRef.current?.click()}
        role="button"
        tabIndex={canAddMore ? 0 : -1}
        onKeyDown={(e) => {
          if (canAddMore && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={REEL_CLIP_ACCEPT}
          multiple
          onChange={handleFileInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={!canAddMore}
          aria-label="Select video clips"
        />
        <svg
          className="mx-auto h-12 w-12 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-3 text-neutral-600">
          {atMax
            ? `Maximum of ${REEL_MAX_CLIPS} clips reached`
            : 'Click or drag & drop your raw clips here'}
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          MP4, MOV, WebM, MKV · Max 200MB per clip · {REEL_MIN_CLIPS}-{REEL_MAX_CLIPS} clips
        </p>
      </div>

      {countError && (
        <p className="text-error-600 text-sm" role="alert">
          {countError}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">
          {clips.length} / {REEL_MAX_CLIPS} clips added
        </span>
        <span className={belowMin ? 'text-warning-600' : 'text-success-600'}>
          {uploadedCount} uploaded {belowMin ? `(need at least ${REEL_MIN_CLIPS})` : ''}
        </span>
      </div>

      {clips.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {clips.map((clip) => (
            <li
              key={clip.localId}
              className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <div className="relative aspect-[9/16] w-full bg-neutral-100">
                {clip.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail
                  <img
                    src={clip.thumbnail}
                    alt={clip.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-400">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(clip.localId)}
                  disabled={disabled || clip.status === 'uploading'}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 disabled:opacity-50"
                  aria-label={`Remove ${clip.file.name}`}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {clip.status === 'uploading' && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-200"
                        style={{ width: `${clip.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {clip.status === 'uploaded' && (
                  <span className="bg-success-600 absolute top-1 left-1 rounded-full p-0.5 text-white">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-neutral-700">{clip.file.name}</p>
                <p className="text-xs text-neutral-400">
                  {formatFileSize(clip.file.size)}
                  {clip.durationSeconds !== null
                    ? ` · ${formatDuration(clip.durationSeconds)}`
                    : ''}
                </p>
                {clip.status === 'error' && (
                  <div className="mt-1 space-y-1">
                    <p className="text-error-600 text-xs">{clip.error}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-1 py-0.5 text-xs"
                      onClick={() => handleRetry(clip.localId)}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
