import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '@/hooks/useToast';
import { ReelClipUploader, type ClipEntry } from '@/features/reel/components/ReelClipUploader';
import { REEL_MAX_CLIPS, REEL_MIN_CLIPS } from '@/features/reel/services/reelClipValidation';

jest.mock('@/features/reel/services/reelService', () => ({
  uploadReelClip: jest.fn(() => new Promise(() => {})),
}));

function makeUploadedClip(index: number): ClipEntry {
  return {
    localId: `existing-${index}`,
    file: new File(['content'], `clip-${index}.mp4`, { type: 'video/mp4' }),
    thumbnail: null,
    durationSeconds: 5,
    progress: 100,
    status: 'uploaded',
    error: null,
    uploaded: {
      clipId: `clip-${index}`,
      assetId: `asset-${index}`,
      storagePath: `path-${index}`,
      downloadURL: `https://example.com/${index}`,
      fileName: `clip-${index}.mp4`,
      size: 1024,
    },
  };
}

function renderUploader(clips: ClipEntry[], onClipsChange = jest.fn()) {
  render(
    <ToastProvider>
      <ReelClipUploader
        businessId="biz-1"
        reelId="reel-1"
        clips={clips}
        onClipsChange={onClipsChange}
      />
    </ToastProvider>
  );
  return onClipsChange;
}

describe('ReelClipUploader', () => {
  it('shows the min-clip requirement when below REEL_MIN_CLIPS', () => {
    renderUploader([]);
    expect(screen.getByText(`0 / ${REEL_MAX_CLIPS} clips added`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`need at least ${REEL_MIN_CLIPS}`))).toBeInTheDocument();
  });

  it('does not show the min-clip warning once enough clips are uploaded', () => {
    const clips = Array.from({ length: REEL_MIN_CLIPS }, (_, i) => makeUploadedClip(i));
    renderUploader(clips);
    expect(screen.queryByText(/need at least/)).not.toBeInTheDocument();
  });

  it('rejects adding more clips than the max limit and does not call onClipsChange', () => {
    const clips = Array.from({ length: REEL_MAX_CLIPS - 2 }, (_, i) => makeUploadedClip(i));
    const onClipsChange = renderUploader(clips);

    const input = screen.getByLabelText('Select video clips') as HTMLInputElement;
    const files = [
      new File(['a'], 'new1.mp4', { type: 'video/mp4' }),
      new File(['b'], 'new2.mp4', { type: 'video/mp4' }),
      new File(['c'], 'new3.mp4', { type: 'video/mp4' }),
    ];

    fireEvent.change(input, { target: { files } });

    expect(screen.getAllByText(/You can add 2 more clip/).length).toBeGreaterThan(0);
    expect(onClipsChange).not.toHaveBeenCalled();
  });

  it('disables the dropzone once the max clip count is reached', () => {
    const clips = Array.from({ length: REEL_MAX_CLIPS }, (_, i) => makeUploadedClip(i));
    renderUploader(clips);
    const input = screen.getByLabelText('Select video clips') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(screen.getByText(`Maximum of ${REEL_MAX_CLIPS} clips reached`)).toBeInTheDocument();
  });
});
