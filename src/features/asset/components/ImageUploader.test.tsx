import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const validateFileMock = jest.fn();
const uploadImageMock = jest.fn();
jest.mock('@/features/asset/services/assetService', () => ({
  validateFile: (...args: unknown[]) => validateFileMock(...args),
  uploadImage: (...args: unknown[]) => uploadImageMock(...args),
}));

const showToastMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

import { ImageUploader } from './ImageUploader';

/**
 * Phase 35 — Priority 4 (Product/Asset): upload validation, failure, and
 * success, tested through user-visible states (button labels, messages),
 * never the internal UploadState machine directly.
 */
function makeFile(name = 'photo.jpg', type = 'image/jpeg') {
  return new File(['fake-bytes'], name, { type });
}

if (!('createObjectURL' in URL)) {
  // jsdom doesn't implement this.
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:preview';
}
if (!('revokeObjectURL' in URL)) {
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
}

describe('ImageUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn().mockReturnValue('blob:preview');
    URL.revokeObjectURL = jest.fn();
    validateFileMock.mockReturnValue(null); // valid by default
  });

  it('validation: rejects a file that fails validation (e.g. exceeds the size limit) and never proceeds to upload', async () => {
    // A .jpg MIME type so the browser's own <input accept> filtering
    // (which @testing-library/user-event faithfully emulates) doesn't
    // strip the file before it ever reaches validateFile — the rejection
    // here is validateFile's own business-rule check (size), not a MIME
    // mismatch, which is what a real oversized-but-correctly-typed photo
    // upload looks like.
    validateFileMock.mockReturnValue('Image must be smaller than 10MB');
    const user = userEvent.setup();
    render(<ImageUploader userId="u1" businessId="biz_1" />);

    const input = screen.getByLabelText(/select image file/i);
    await user.upload(input, makeFile());

    expect(await screen.findByText(/smaller than 10mb/i)).toBeInTheDocument();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it('a valid file shows a preview and an "Upload Image" action, without uploading automatically', async () => {
    const user = userEvent.setup();
    render(<ImageUploader userId="u1" businessId="biz_1" />);

    const input = screen.getByLabelText(/select image file/i);
    await user.upload(input, makeFile());

    expect(await screen.findByRole('button', { name: /upload image/i })).toBeInTheDocument();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it('upload success: calls uploadImage and onUploadComplete, and shows a success message', async () => {
    uploadImageMock.mockResolvedValue({
      assetId: 'a1',
      name: 'photo.jpg',
      width: 800,
      height: 600,
    });
    const onUploadComplete = jest.fn();
    const user = userEvent.setup();
    render(<ImageUploader userId="u1" businessId="biz_1" onUploadComplete={onUploadComplete} />);

    await user.upload(screen.getByLabelText(/select image file/i), makeFile());
    await user.click(await screen.findByRole('button', { name: /upload image/i }));

    await waitFor(() =>
      expect(uploadImageMock).toHaveBeenCalledWith(expect.any(File), 'u1', 'biz_1', 'poster')
    );
    expect(await screen.findByText(/upload successful/i)).toBeInTheDocument();
    expect(onUploadComplete).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: 'a1', width: 800, height: 600 })
    );
  });

  it('upload failure: shows the real error message and offers Retry/Cancel, calling onUploadError', async () => {
    uploadImageMock.mockRejectedValue(new Error('Network error during upload'));
    const onUploadError = jest.fn();
    const user = userEvent.setup();
    render(<ImageUploader userId="u1" businessId="biz_1" onUploadError={onUploadError} />);

    await user.upload(screen.getByLabelText(/select image file/i), makeFile());
    await user.click(await screen.findByRole('button', { name: /upload image/i }));

    expect(await screen.findByText(/network error during upload/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(onUploadError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('retry re-attempts the upload with the same file', async () => {
    uploadImageMock
      .mockRejectedValueOnce(new Error('Network error during upload'))
      .mockResolvedValueOnce({ assetId: 'a1', name: 'photo.jpg', width: 800, height: 600 });
    const user = userEvent.setup();
    render(<ImageUploader userId="u1" businessId="biz_1" />);

    await user.upload(screen.getByLabelText(/select image file/i), makeFile());
    await user.click(await screen.findByRole('button', { name: /upload image/i }));
    await screen.findByRole('button', { name: /retry/i });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText(/upload successful/i)).toBeInTheDocument();
    expect(uploadImageMock).toHaveBeenCalledTimes(2);
  });

  it('asset persistence: the uploaded asset from the backend response (not a client-invented value) is what onUploadComplete receives', async () => {
    uploadImageMock.mockResolvedValue({
      assetId: 'real_asset_id_from_backend',
      name: 'photo.jpg',
      width: 1200,
      height: 900,
    });
    const onUploadComplete = jest.fn();
    const user = userEvent.setup();
    render(<ImageUploader userId="u1" businessId="biz_1" onUploadComplete={onUploadComplete} />);
    await user.upload(screen.getByLabelText(/select image file/i), makeFile());
    await user.click(await screen.findByRole('button', { name: /upload image/i }));

    await waitFor(() =>
      expect(onUploadComplete).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: 'real_asset_id_from_backend' })
      )
    );
  });
});
