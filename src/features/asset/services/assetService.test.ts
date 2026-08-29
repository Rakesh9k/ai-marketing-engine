import { validateFile, compressImage } from '@/features/asset/services/assetValidation';

// Mock URL.createObjectURL and URL.revokeObjectURL for JSDOM
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Image constructor for JSDOM
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  src = '';

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.Image = MockImage as any;

describe('Asset Service', () => {
  describe('validateFile', () => {
    it('should reject null or empty file', () => {
      expect(validateFile(null as any)).toBe('Please select an image.');
      // File with empty content has size 0
      const emptyFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });
      expect(validateFile(emptyFile)).toBe('Please select an image.');
    });

    it('should reject unsupported MIME types', () => {
      const gifFile = new File(['content'], 'test.gif', { type: 'image/gif' });
      expect(validateFile(gifFile)).toBe('Supported formats: JPEG, PNG, WebP');

      const bmpFile = new File(['content'], 'test.bmp', { type: 'image/bmp' });
      expect(validateFile(bmpFile)).toBe('Supported formats: JPEG, PNG, WebP');

      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      expect(validateFile(pdfFile)).toBe('Supported formats: JPEG, PNG, WebP');
    });

    it('should accept supported MIME types', () => {
      const jpegFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFile(jpegFile)).toBeNull();

      const pngFile = new File(['content'], 'test.png', { type: 'image/png' });
      expect(validateFile(pngFile)).toBeNull();

      const webpFile = new File(['content'], 'test.webp', { type: 'image/webp' });
      expect(validateFile(webpFile)).toBeNull();
    });

    it('should reject files larger than 10MB', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      expect(validateFile(largeFile)).toContain('Image size must be less than 10MB');
    });

    it('should accept files up to 10MB', () => {
      const validFile = new File(['x'.repeat(5 * 1024 * 1024)], 'valid.jpg', {
        type: 'image/jpeg',
      });
      expect(validateFile(validFile)).toBeNull();
    });
  });

  describe('compressImage', () => {
    it('should return original file if under size limit', async () => {
      const smallFile = new File(['small content'], 'small.jpg', { type: 'image/jpeg' });
      const result = await compressImage(smallFile, { maxSizeMB: 2 });
      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeLessThanOrEqual(smallFile.size);
    });

    // Canvas-based compression requires a real browser environment
    // Skipping in JSDOM test environment
    it.skip('should compress large files in browser', async () => {
      // Create a larger file (simulated)
      const largeContent = 'x'.repeat(3 * 1024 * 1024); // 3MB
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = await compressImage(largeFile, { maxSizeMB: 2 });
      expect(result).toBeInstanceOf(Blob);
    });
  });
});
