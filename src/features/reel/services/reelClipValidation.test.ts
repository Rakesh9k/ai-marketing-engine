import {
  REEL_MAX_CLIPS,
  validateClipCount,
  validateClipFile,
} from '@/features/reel/services/reelClipValidation';

describe('reelClipValidation', () => {
  describe('validateClipFile', () => {
    it('should reject null or empty file', () => {
      expect(validateClipFile(null as any)).toBe('Please select a video clip.');
      const emptyFile = new File([''], 'empty.mp4', { type: 'video/mp4' });
      expect(validateClipFile(emptyFile)).toBe('Please select a video clip.');
    });

    it('should reject unsupported MIME types', () => {
      const aviFile = new File(['content'], 'test.avi', { type: 'video/x-msvideo' });
      expect(validateClipFile(aviFile)).toBe('Supported formats: MP4, MOV, WebM, MKV');

      const imageFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateClipFile(imageFile)).toBe('Supported formats: MP4, MOV, WebM, MKV');
    });

    it('should accept supported video MIME types', () => {
      expect(validateClipFile(new File(['content'], 'a.mp4', { type: 'video/mp4' }))).toBeNull();
      expect(
        validateClipFile(new File(['content'], 'a.mov', { type: 'video/quicktime' }))
      ).toBeNull();
      expect(validateClipFile(new File(['content'], 'a.webm', { type: 'video/webm' }))).toBeNull();
      expect(
        validateClipFile(new File(['content'], 'a.mkv', { type: 'video/x-matroska' }))
      ).toBeNull();
    });

    it('should reject clips larger than 200MB', () => {
      const largeFile = new File([new ArrayBuffer(201 * 1024 * 1024)], 'large.mp4', {
        type: 'video/mp4',
      });
      expect(validateClipFile(largeFile)).toContain('Clip size must be less than 200MB');
    });

    it('should accept clips up to 200MB', () => {
      const validFile = new File(['x'.repeat(5 * 1024 * 1024)], 'valid.mp4', {
        type: 'video/mp4',
      });
      expect(validateClipFile(validFile)).toBeNull();
    });
  });

  describe('validateClipCount', () => {
    it('should allow uploads within the max clip limit', () => {
      expect(validateClipCount(0, 3)).toBeNull();
      expect(validateClipCount(5, 5)).toBeNull();
      expect(validateClipCount(0, REEL_MAX_CLIPS)).toBeNull();
    });

    it('should reject uploads that would exceed the max clip limit', () => {
      expect(validateClipCount(8, 5)).toContain('You can add 2 more clip');
    });

    it('should report zero remaining when already at the max', () => {
      expect(validateClipCount(REEL_MAX_CLIPS, 1)).toContain(`maximum of ${REEL_MAX_CLIPS} clips`);
    });
  });
});
