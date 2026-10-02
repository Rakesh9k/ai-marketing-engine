import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublishingModal } from './PublishingModal';
import { publishingService } from '../services/publishingService';

jest.mock('../services/publishingService', () => ({
  publishingService: {
    createPublishJob: jest.fn(),
  },
}));

describe('PublishingModal', () => {
  const mockPublishingService = publishingService as jest.Mocked<typeof publishingService>;

  const mockConnections: any[] = [
    {
      connectionId: 'conn-1',
      status: 'active',
      facebookPage: { id: 'p-1', name: 'My Bakery' },
      instagram: { id: 'ig-1', username: 'mybakery' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal controls and submits publish request', async () => {
    mockPublishingService.createPublishJob.mockResolvedValueOnce({
      job: { jobId: 'pub-100', status: 'processing' } as any,
    });

    const handleJobCreated = jest.fn();
    const handleClose = jest.fn();

    render(
      <PublishingModal
        isOpen={true}
        onClose={handleClose}
        campaignId="camp-123"
        connections={mockConnections}
        onJobCreated={handleJobCreated}
      />
    );

    expect(screen.getByText('Publish Campaign')).toBeInTheDocument();
    expect(screen.getByText(/My Bakery/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Publish Now/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPublishingService.createPublishJob).toHaveBeenCalledWith({
        campaignId: 'camp-123',
        socialConnectionId: 'conn-1',
        platform: 'instagram',
        contentType: 'post',
        scheduledAt: null,
        captionOverride: undefined,
      });
    });

    expect(handleJobCreated).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });
});
