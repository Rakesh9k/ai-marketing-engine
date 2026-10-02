import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SocialAccountsSection } from './SocialAccountsSection';
import { metaService } from '../services/metaService';

jest.mock('../services/metaService', () => ({
  metaService: {
    listSocialConnections: jest.fn(),
    initiateMetaOAuth: jest.fn(),
    getPendingMetaPages: jest.fn(),
    selectMetaPage: jest.fn(),
    disconnectMetaConnection: jest.fn(),
  },
}));

describe('SocialAccountsSection', () => {
  const mockMetaService = metaService as jest.Mocked<typeof metaService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders not connected card when connections list is empty', async () => {
    mockMetaService.listSocialConnections.mockResolvedValueOnce({ connections: [] });

    render(<SocialAccountsSection />);

    await waitFor(() => {
      expect(screen.getByText('Meta (Facebook & Instagram)')).toBeInTheDocument();
    });

    expect(screen.getByText('No account connected yet.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Connect Facebook & Instagram/i })
    ).toBeInTheDocument();
  });

  it('renders connected account card when connection exists', async () => {
    mockMetaService.listSocialConnections.mockResolvedValueOnce({
      connections: [
        {
          connectionId: 'conn-100',
          userId: 'user-1',
          provider: 'meta',
          status: 'active',
          facebookPage: { id: 'page-100', name: 'Gourmet Bistro' },
          instagram: { id: 'ig-100', username: 'gourmetbistro' },
          permissions: ['pages_show_list'],
          tokenReference: 'metaCredentials/conn-100',
          connectedAt: '2026-09-28T21:00:00.000Z',
          updatedAt: '2026-09-28T21:00:00.000Z',
          metadata: { metaApiVersion: 'v21.0' },
        },
      ],
    });

    render(<SocialAccountsSection />);

    await waitFor(() => {
      expect(screen.getByText('Gourmet Bistro')).toBeInTheDocument();
    });

    expect(screen.getByText('@gourmetbistro')).toBeInTheDocument();
    expect(screen.getByText('Page ID: page-100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument();
  });

  it('handles candidate page selection modal when initialStateId is provided', async () => {
    mockMetaService.listSocialConnections.mockResolvedValueOnce({ connections: [] });
    mockMetaService.getPendingMetaPages.mockResolvedValueOnce({
      pages: [
        {
          pageId: 'page-200',
          pageName: 'The Pizza Place',
          instagramAccount: {
            id: 'ig-200',
            username: 'pizzaplace',
          },
        },
      ],
      expiresAt: '2026-09-28T22:00:00.000Z',
    });
    mockMetaService.selectMetaPage.mockResolvedValueOnce({
      connection: {
        connectionId: 'conn-200',
        userId: 'user-1',
        provider: 'meta',
        status: 'active',
        facebookPage: { id: 'page-200', name: 'The Pizza Place' },
        instagram: { id: 'ig-200', username: 'pizzaplace' },
        permissions: ['pages_show_list'],
        tokenReference: 'metaCredentials/conn-200',
        connectedAt: '2026-09-28T21:00:00.000Z',
        updatedAt: '2026-09-28T21:00:00.000Z',
        metadata: { metaApiVersion: 'v21.0' },
      },
    });

    render(<SocialAccountsSection initialStateId="state-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Select Facebook Page to Connect')).toBeInTheDocument();
    });

    expect(screen.getByText('The Pizza Place')).toBeInTheDocument();
    expect(screen.getByText(/✓ Linked Instagram: @pizzaplace/i)).toBeInTheDocument();

    const selectBtn = screen.getByRole('button', { name: /Select Page/i });
    fireEvent.click(selectBtn);

    await waitFor(() => {
      expect(mockMetaService.selectMetaPage).toHaveBeenCalledWith(
        'state-abc',
        'page-200',
        undefined
      );
    });
  });

  it('triggers disconnect workflow when Disconnect is clicked and confirmed', async () => {
    mockMetaService.listSocialConnections.mockResolvedValue({
      connections: [
        {
          connectionId: 'conn-300',
          userId: 'user-1',
          provider: 'meta',
          status: 'active',
          facebookPage: { id: 'page-300', name: 'Salon Elegance' },
          instagram: { id: 'ig-300', username: 'salonelegance' },
          permissions: ['pages_show_list'],
          tokenReference: 'metaCredentials/conn-300',
          connectedAt: '2026-09-28T21:00:00.000Z',
          updatedAt: '2026-09-28T21:00:00.000Z',
          metadata: { metaApiVersion: 'v21.0' },
        },
      ],
    });
    mockMetaService.disconnectMetaConnection.mockResolvedValueOnce({ success: true });

    render(<SocialAccountsSection />);

    await waitFor(() => {
      expect(screen.getByText('Salon Elegance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Disconnect/i }));

    await waitFor(() => {
      expect(screen.getByText('Disconnect Meta Account?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Disconnect Account/i }));

    await waitFor(() => {
      expect(mockMetaService.disconnectMetaConnection).toHaveBeenCalledWith('conn-300');
    });
  });
});
