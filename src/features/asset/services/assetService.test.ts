import { validateFile, compressImage } from '@/features/asset/services/assetValidation';
import { uploadImage } from '@/features/asset/services/assetService';
import { httpsCallable } from 'firebase/functions';

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseFunctions: jest.fn(() => ({})),
  getFirebaseDb: jest.fn(() => ({})),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

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

  describe('uploadImage', () => {
    const originalFetch = global.fetch;
    const originalImage = global.Image;

    beforeEach(() => {
      jest.clearAllMocks();
      global.Image = MockImage as any;
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
      global.Image = originalImage;
    });

    function mockCallables(confirmUploadMock: jest.Mock, getUploadUrlMock?: jest.Mock) {
      const uploadUrlMock =
        getUploadUrlMock ??
        jest.fn().mockResolvedValue({
          data: {
            uploadUrl: 'https://storage.example/signed-put-url',
            storagePath: 'businesses/biz1/products/asset1/photo.jpg',
            assetId: 'asset1',
            expiresAt: '',
          },
        });
      (httpsCallable as jest.Mock).mockImplementation((_functions, name: string) => {
        if (name === 'getUploadUrl') return uploadUrlMock;
        if (name === 'confirmUpload') return confirmUploadMock;
        throw new Error(`unexpected callable requested in test: ${name}`);
      });
      return uploadUrlMock;
    }

    it('sends the real, positive image dimensions to confirmUpload (not the 0/0 placeholder)', async () => {
      const confirmUploadMock = jest.fn().mockResolvedValue({
        data: { assetId: 'asset1', asset: {}, downloadURL: 'https://storage.example/photo.jpg' },
      });
      mockCallables(confirmUploadMock);

      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const asset = await uploadImage(file, 'user1', 'biz1', 'product');

      expect(confirmUploadMock).toHaveBeenCalledTimes(1);
      const call = confirmUploadMock.mock.calls[0][0];
      expect(call.metadata.width).toBeGreaterThan(0);
      expect(call.metadata.height).toBeGreaterThan(0);
      expect(call.metadata.width).toBe(100);
      expect(call.metadata.height).toBe(100);
      expect(asset.width).toBe(100);
      expect(asset.height).toBe(100);
    });

    it('falls back to a positive default (1024x1024) when the image reports zero natural dimensions', async () => {
      class ZeroDimImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 0;
        height = 0;
        src = '';
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }
      global.Image = ZeroDimImage as any;

      const confirmUploadMock = jest.fn().mockResolvedValue({
        data: { assetId: 'asset2', asset: {}, downloadURL: 'https://storage.example/zero-dim.jpg' },
      });
      mockCallables(confirmUploadMock);

      const file = new File(['content'], 'zero-dim.jpg', { type: 'image/jpeg' });
      const asset = await uploadImage(file, 'user1', 'biz1', 'product');

      const call = confirmUploadMock.mock.calls[0][0];
      expect(call.metadata.width).toBe(1024);
      expect(call.metadata.height).toBe(1024);
      expect(asset.width).toBe(1024);
      expect(asset.height).toBe(1024);
    });
  });
});
