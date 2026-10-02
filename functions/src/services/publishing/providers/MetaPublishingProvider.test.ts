import { MetaPublishingProvider, MetaPublishingError } from './MetaPublishingProvider';
import { decryptToken } from '../../meta/crypto';
import type { SocialConnection, EncryptedCredentialDoc } from '../../../types/meta';

jest.mock('../../meta/crypto', () => ({
  decryptToken: jest.fn(),
}));

describe('MetaPublishingProvider', () => {
  const provider = new MetaPublishingProvider();
  const mockDecryptToken = decryptToken as jest.MockedFunction<typeof decryptToken>;

  const mockConnection: SocialConnection = {
    connectionId: 'conn-1',
    userId: 'user-1',
    provider: 'meta',
    status: 'active',
    facebookPage: { id: 'fb-page-123', name: 'My Bakery' },
    instagram: { id: 'ig-account-456', username: 'mybakery' },
    permissions: ['pages_show_list'],
    tokenReference: 'metaCredentials/conn-1',
    connectedAt: '2026-09-28T20:00:00.000Z',
    updatedAt: '2026-09-28T20:00:00.000Z',
    metadata: { metaApiVersion: 'v20.0' },
  };

  const mockCredentials: EncryptedCredentialDoc = {
    connectionId: 'conn-1',
    userId: 'user-1',
    userAccessToken: { encryptedData: 'enc-u', iv: 'iv', authTag: 'tag' },
    pageAccessToken: { encryptedData: 'enc-p', iv: 'iv', authTag: 'tag' },
    createdAt: '2026-09-28T20:00:00.000Z',
    updatedAt: '2026-09-28T20:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDecryptToken.mockReturnValue('mock_decrypted_token');
    global.fetch = jest.fn();
  });

  describe('publishPost', () => {
    it('publishes Instagram image post successfully', async () => {
      const mockFetch = global.fetch as jest.Mock;
      // Container creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'container-789' }),
      });
      // Publish response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'ig-post-999' }),
      });

      const res = await provider.publishPost({
        platform: 'instagram',
        contentType: 'post',
        socialConnection: mockConnection,
        credentials: mockCredentials,
        mediaUrl: 'https://storage.googleapis.com/bucket/poster.png',
        caption: 'Fresh pastries today!',
      });

      expect(res.externalPostId).toBe('ig-post-999');
      expect(res.externalContainerId).toBe('container-789');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('publishes Facebook Page photo post successfully', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'fb-photo-111', post_id: 'fb-post-222' }),
      });

      const res = await provider.publishPost({
        platform: 'facebook',
        contentType: 'post',
        socialConnection: mockConnection,
        credentials: mockCredentials,
        mediaUrl: 'https://storage.googleapis.com/bucket/poster.png',
        caption: 'Visit our store!',
      });

      expect(res.externalPostId).toBe('fb-post-222');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('normalizes Meta Graph API error when connection is revoked (190)', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 190, message: 'Invalid OAuth 2.0 Access Token' },
        }),
      });

      try {
        await provider.publishPost({
          platform: 'instagram',
          contentType: 'post',
          socialConnection: mockConnection,
          credentials: mockCredentials,
          mediaUrl: 'https://storage.googleapis.com/bucket/poster.png',
          caption: 'Test caption',
        });
        fail('Expected to throw MetaPublishingError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(MetaPublishingError);
        expect(err.code).toBe('CONNECTION_REVOKED');
        expect(err.retryable).toBe(false);
      }
    });
  });

  describe('publishReel', () => {
    it('publishes Instagram Reel after status becomes FINISHED', async () => {
      const mockFetch = global.fetch as jest.Mock;
      // Container creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'reel-container-1' }),
      });
      // Status check -> FINISHED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status_code: 'FINISHED' }),
      });
      // Publish container
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'reel-published-100' }),
      });

      const res = await provider.publishReel({
        platform: 'instagram',
        contentType: 'reel',
        socialConnection: mockConnection,
        credentials: mockCredentials,
        mediaUrl: 'https://storage.googleapis.com/bucket/reel.mp4',
        caption: 'Behind the scenes reel',
      });

      expect(res.externalPostId).toBe('reel-published-100');
    });
  });
});
