'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  uploadImage,
  validateFile,
  type Asset,
  type AssetType,
} from '@/features/asset/services/assetService';

interface ImageUploaderProps {
  userId: string;
  businessId: string;
  assetType?: AssetType;
  onUploadComplete?: (asset: Asset) => void;
  onUploadError?: (error: Error) => void;
  _maxFiles?: number;
  accept?: string;
}

interface UploadState {
  file: File | null;
  preview: string | null;
  progress: number;
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
  error: string | null;
  asset: Asset | null;
}

export function ImageUploader({
  userId,
  businessId,
  assetType = 'poster',
  onUploadComplete,
  onUploadError,
  _maxFiles = 1,
  accept = 'image/jpeg,image/png,image/webp',
}: ImageUploaderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStateRef = useRef<UploadState>({
    file: null,
    preview: null,
    progress: 0,
    status: 'idle',
    error: null,
    asset: null,
  });
  const [, setRenderTrigger] = useState(0);

  const forceUpdate = useCallback(() => {
    setRenderTrigger((n) => n + 1);
  }, []);

  const setUploadState = useCallback(
    (updater: UploadState | ((prev: UploadState) => UploadState)) => {
      const newState = typeof updater === 'function' ? updater(uploadStateRef.current) : updater;
      uploadStateRef.current = newState;
      forceUpdate();
    },
    [forceUpdate]
  );

  const uploadState = uploadStateRef.current;

  const resetState = useCallback(() => {
    if (uploadStateRef.current.preview) {
      URL.revokeObjectURL(uploadStateRef.current.preview);
    }
    uploadStateRef.current = {
      file: null,
      preview: null,
      progress: 0,
      status: 'idle',
      error: null,
      asset: null,
    };
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    forceUpdate();
  }, [forceUpdate]);

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setUploadState((prev) => ({ ...prev, error: validationError, status: 'error' }));
        showToast('error', validationError);
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      setUploadState((prev) => ({
        ...prev,
        file,
        preview,
        status: 'idle',
        error: null,
        asset: null,
      }));
    },
    [showToast, setUploadState]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = useCallback(async () => {
    const { file } = uploadStateRef.current;
    if (!file) {
      showToast('error', 'No file selected');
      return;
    }

    setUploadState((prev) => ({ ...prev, status: 'uploading', progress: 0, error: null }));

    try {
      // Upload with progress simulation (since we're using base64 upload)
      const asset = await uploadImage(file, userId, businessId, assetType);

      setUploadState((prev) => ({
        ...prev,
        status: 'success',
        progress: 100,
        asset,
      }));

      showToast('success', 'Image uploaded successfully');
      onUploadComplete?.(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
        progress: 0,
      }));
      showToast('error', message);
      onUploadError?.(error instanceof Error ? error : new Error(message));
    }
  }, [userId, businessId, assetType, showToast, onUploadComplete, onUploadError, setUploadState]);

  const handleRetry = useCallback(() => {
    const { file } = uploadStateRef.current;
    if (file) {
      setUploadState((prev) => ({ ...prev, status: 'idle', error: null }));
      void handleUpload();
    }
  }, [handleUpload, setUploadState]);

  const handleCancel = useCallback(() => {
    resetState();
  }, [resetState]);

  const handleRemove = useCallback(() => {
    resetState();
  }, [resetState]);

  const isUploading = uploadState.status === 'uploading';
  const isSuccess = uploadState.status === 'success';
  const isError = uploadState.status === 'error';
  const hasFile = !!uploadState.file;

  return (
    <div className="space-y-4">
      {/* Drop zone / File input */}
      <div
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          hasFile
            ? 'border-neutral-300 bg-white'
            : 'hover:border-brand-500 hover:bg-brand-50 border-neutral-300'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isUploading}
          aria-label="Select image file"
        />

        {hasFile && uploadState.preview ? (
          <div className="relative mx-auto max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element -- Object URL preview cannot use Next.js Image */}
            <img
              src={uploadState.preview}
              alt="Preview"
              className="max-h-48 w-auto rounded-md shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
              aria-label="Remove image"
            >
              <svg
                className="h-4 w-4"
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
          </div>
        ) : (
          <>
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-3 text-neutral-600">Click or drag & drop to upload</p>
            <p className="mt-1 text-sm text-neutral-400">JPEG, PNG, WebP · Max 10MB</p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Uploading...</span>
            <span className="text-brand-600 font-medium">{uploadState.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="bg-brand-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-error-50 border-error-200 text-error-600 space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Upload failed</p>
          <p className="text-sm">{uploadState.error}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={handleRetry} disabled={isUploading}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isUploading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {isSuccess && uploadState.asset && (
        <div className="bg-success-50 border-success-200 text-success-600 space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Upload successful</p>
          <p className="text-sm">
            {uploadState.asset.name} ({uploadState.asset.width}×{uploadState.asset.height})
          </p>
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            Upload another
          </Button>
        </div>
      )}

      {/* Actions */}
      {!hasFile && !isUploading && (
        <div className="flex justify-center gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Select Image
          </Button>
        </div>
      )}

      {hasFile && !isUploading && !isSuccess && (
        <div className="flex justify-center gap-2">
          <Button variant="primary" size="lg" onClick={handleUpload} disabled={isUploading}>
            Upload Image
          </Button>
          <Button variant="ghost" size="lg" onClick={handleRemove} disabled={isUploading}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
