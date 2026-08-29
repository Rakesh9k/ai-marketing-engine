import { validateFile, compressImage, generateId } from '@/features/asset/services/assetValidation';

describe('Asset Service - Extended Tests', () => {
  describe('validateFile', () => {
    it('should reject null or empty file', () => {
      expect(validateFile(null as any)).toBe('Please select an image.');
      expect(validateFile(new File([], 'empty.jpg') as any)).toBe('Please select an image.');
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

  describe('generateId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('compressImage', () => {
    it('should return original file if under size limit', async () => {
      const smallFile = new File(['small content'], 'small.jpg', { type: 'image/jpeg' });
      const result = await compressImage(smallFile, { maxSizeMB: 2 });
      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeLessThanOrEqual(smallFile.size);
    });

    it.skip('should compress large files in browser environment', async () => {
      const largeContent = 'x'.repeat(3 * 1024 * 1024);
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = await compressImage(largeFile, { maxSizeMB: 2 });
      expect(result).toBeInstanceOf(Blob);
    });
  });
});
