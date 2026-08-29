/**
 * Generates a UUID v4 string.
 */
export const generateId = (): string => {
  const bytes = new Uint8Array(16);
  // crypto.getRandomValues may return void in some environments
  const randomValues = crypto.getRandomValues(bytes);
  const values = randomValues ?? bytes;
  // Set version (4) at byte 6 (index 6, bits 4-7)
  const v6 = values[6];
  const v8 = values[8];
  if (v6 === undefined || v8 === undefined) {
    throw new Error('Failed to generate random bytes for UUID');
  }
  values[6] = (v6 & 0x0f) | 0x40;
  values[8] = (v8 & 0x3f) | 0x80;

  const hex = Array.from(values, (b: number) => b.toString(16).padStart(2, '0')).join('');

  // Insert hyphens at positions 8, 13, 18, 23 (0-indexed in the 32-char hex string)
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20, 32)
  );
};

/**
 * Validates an uploaded file for type and size.
 * Returns an error message if validation fails, or null if valid.
 */
export function validateFile(file: File): string | null {
  // Allowed MIME types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!file || file.size === 0) {
    return 'Please select an image.';
  }

  if (!allowedTypes.includes(file.type)) {
    return 'Supported formats: JPEG, PNG, WebP';
  }

  // Check file size - 10MB limit
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return `Image size must be less than 10MB. Selected file: ${formatFileSize(file.size)}`;
  }

  return null;
}

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
 * Compresses an image file using browser-native canvas API.
 * Only compresses if the file is larger than 2MB or dimensions exceed 2048px.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file as a blob
 */
export const compressImage = async (
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; maxSizeMB?: number } = {}
): Promise<Blob> => {
  const { maxWidth = 2048, maxHeight = 2048, quality = 0.85, maxSizeMB = 2 } = options;

  // Skip compression if file is already small enough
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file.slice(0, file.size, file.type);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Create canvas and draw compressed image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // If still too large, reduce quality further
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
              canvas.toBlob((blob2) => resolve(blob2 || blob), file.type, quality * 0.8);
            } else {
              resolve(blob);
            }
          } else {
            reject(new Error('Compression failed'));
          }
        },
        file.type,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
};
