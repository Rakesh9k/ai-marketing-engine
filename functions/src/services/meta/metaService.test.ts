import { MetaService, MetaServiceError } from './metaService';
import * as firestore from '../firestore';
import { metaGraphClient } from './graphClient';
import { decryptToken } from './crypto';

jest.mock('../analyticsService', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('MetaService', () => {
  let service: MetaService;

  beforeEach(() => {
    service = new MetaService();
    process.env['META_APP_ID'] = 'test-app-id';
    process.env['META_APP_SECRET'] = 'test-app-secret';
    process.env['META_REDIRECT_URI'] = 'https://test.app/api/meta/callback';
    process.env['META_TOKEN_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-long!';
  });

  afterEach(() => {
    delete process.env['META_APP_ID'];
    delete process.env['META_APP_SECRET'];
    delete process.env['META_REDIRECT_URI'];
    delete process.env['META_TOKEN_ENCRYPTION_KEY'];
    jest.restoreAllMocks();
  });

  describe('createAuthorizationUrl', () => {
    it('creates a secure OAuth authorization URL and stores OAuth state', async () => {
      const createDocSpy = jest
        .spyOn(firestore, 'createOAuthStateDoc')
        .mockResolvedValue(undefined);

      const res = await service.createAuthorizationUrl('user-1', 'biz-1', '/settings/social');

      expect(res.authUrl).toContain('https://www.facebook.com/v20.0/dialog/oauth');
      expect(res.authUrl).toContain('client_id=test-app-id');
      expect(res.authUrl).toContain(`state=${res.state}`);
      expect(res.authUrl).toContain('scope=pages_show_list');

      expect(createDocSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          stateId: res.state,
          userId: 'user-1',
          businessId: 'biz-1',
          redirectPath: '/settings/social',
        })
      );
    });

    it('throws MetaServiceError if META_APP_ID is not configured', async () => {
      delete process.env['META_APP_ID'];
      await expect(service.createAuthorizationUrl('user-1')).rejects.toThrow(MetaServiceError);
    });
  });

  describe('handleOAuthCallback', () => {
    it('validates state and creates pending page selection session', async () => {
      const stateId = 'valid-state-id';
      const mockStateDoc = {
        stateId,
        userId: 'user-1',
        businessId: 'biz-1',
        stateHash: require('crypto').createHash('sha256').update(stateId).digest('hex'),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };

      jest.spyOn(firestore, 'getOAuthStateDoc').mockResolvedValue(mockStateDoc as any);
      jest.spyOn(firestore, 'consumeOAuthStateDoc').mockResolvedValue(undefined);
      jest.spyOn(firestore, 'createPendingPageSelectionSession').mockResolvedValue(undefined);

      jest.spyOn(metaGraphClient, 'exchangeCodeForToken').mockResolvedValue({
        access_token: 'short-token',
        token_type: 'bearer',
      });
      jest.spyOn(metaGraphClient, 'getLongLivedUserToken').mockResolvedValue({
        access_token: 'long-user-token',
        token_type: 'bearer',
      });
      jest.spyOn(metaGraphClient, 'getUserPages').mockResolvedValue([
        {
          id: 'page-1',
          name: 'Hyderabad Biryani',
          access_token: 'page-token-1',
          instagram_business_account: { id: 'ig-1' },
        },
      ]);
      jest.spyOn(metaGraphClient, 'getInstagramAccount').mockResolvedValue({
        id: 'ig-1',
        username: 'hydbiryani',
        name: 'Hyderabad Biryani',
        account_type: 'BUSINESS',
      });

      const res = await service.handleOAuthCallback('valid-code', stateId);

      expect(res.stateId).toBe(stateId);
      expect(res.userId).toBe('user-1');
      expect(res.pagesCount).toBe(1);
    });

    it('rejects expired state', async () => {
      const stateId = 'expired-state-id';
      const mockStateDoc = {
        stateId,
        userId: 'user-1',
        stateHash: require('crypto').createHash('sha256').update(stateId).digest('hex'),
        createdAt: new Date(Date.now() - 700000).toISOString(),
        expiresAt: new Date(Date.now() - 100000).toISOString(), // expired
      };

      jest.spyOn(firestore, 'getOAuthStateDoc').mockResolvedValue(mockStateDoc as any);

      await expect(service.handleOAuthCallback('code', stateId)).rejects.toThrow(/expired/i);
    });

    it('rejects already consumed state', async () => {
      const stateId = 'reused-state-id';
      const mockStateDoc = {
        stateId,
        userId: 'user-1',
        stateHash: require('crypto').createHash('sha256').update(stateId).digest('hex'),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        consumedAt: new Date().toISOString(), // reused
      };

      jest.spyOn(firestore, 'getOAuthStateDoc').mockResolvedValue(mockStateDoc as any);

      await expect(service.handleOAuthCallback('code', stateId)).rejects.toThrow(
        /already been used/i
      );
    });
  });

  describe('finalizePageSelection', () => {
    it('encrypts access tokens and persists SocialConnection', async () => {
      const stateId = 'session-state-1';
      const mockSession = {
        stateId,
        userId: 'user-1',
        businessId: 'biz-1',
        pages: [
          {
            pageId: 'page-101',
            pageName: 'Hyderabad Biryani House',
            instagramAccount: {
              id: 'ig-101',
              username: 'hydbiryani',
              accountType: 'BUSINESS',
            },
          },
        ],
        userAccessToken: 'raw-user-token-secret',
        pageAccessTokens: { 'page-101': 'raw-page-token-secret' },
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };

      jest.spyOn(firestore, 'getPendingPageSelectionSession').mockResolvedValue(mockSession as any);

      let savedCredentialDoc: any = null;
      jest.spyOn(firestore, 'createEncryptedCredentialDoc').mockImplementation(async (doc) => {
        savedCredentialDoc = doc;
      });

      let savedSocialConnection: any = null;
      jest.spyOn(firestore, 'createSocialConnectionDoc').mockImplementation(async (conn) => {
        savedSocialConnection = conn;
      });
      jest.spyOn(firestore, 'deletePendingPageSelectionSession').mockResolvedValue(undefined);

      const conn = await service.finalizePageSelection('user-1', stateId, 'page-101');

      expect(conn.connectionId).toBe('meta_page-101');
      expect(conn.facebookPage.name).toBe('Hyderabad Biryani House');
      expect(conn.instagram.username).toBe('hydbiryani');
      expect(conn.status).toBe('active');

      // Tokens MUST be encrypted and stored in server-only collection
      expect(savedCredentialDoc).not.toBeNull();
      expect(savedCredentialDoc.userAccessToken.encryptedData).toBeDefined();

      // Verify server decryption recovers raw tokens
      const decryptedUser = decryptToken(savedCredentialDoc.userAccessToken);
      const decryptedPage = decryptToken(savedCredentialDoc.pageAccessToken);
      expect(decryptedUser).toBe('raw-user-token-secret');
      expect(decryptedPage).toBe('raw-page-token-secret');

      // Public SocialConnection doc MUST NOT contain raw tokens!
      expect((savedSocialConnection as any).userAccessToken).toBeUndefined();
      expect((savedSocialConnection as any).pageAccessToken).toBeUndefined();
      expect((savedSocialConnection as any).accessToken).toBeUndefined();
    });

    it('rejects page selection if user is not authorized for session', async () => {
      const stateId = 'session-state-2';
      const mockSession = {
        stateId,
        userId: 'user-A',
        pages: [{ pageId: 'page-101', pageName: 'Page' }],
        userAccessToken: 'u-token',
        pageAccessTokens: { 'page-101': 'p-token' },
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };

      jest.spyOn(firestore, 'getPendingPageSelectionSession').mockResolvedValue(mockSession as any);

      await expect(service.finalizePageSelection('user-B', stateId, 'page-101')).rejects.toThrow(
        /not authorized/i
      );
    });
  });

  describe('disconnectConnection', () => {
    it('deletes credentials and marks status disconnected', async () => {
      const mockConn = {
        connectionId: 'meta_page-101',
        userId: 'user-1',
        status: 'active',
      };

      jest.spyOn(firestore, 'getSocialConnectionDoc').mockResolvedValue(mockConn as any);
      const deleteCredSpy = jest
        .spyOn(firestore, 'deleteEncryptedCredentialDoc')
        .mockResolvedValue(undefined);
      const updateConnSpy = jest
        .spyOn(firestore, 'updateSocialConnectionDoc')
        .mockResolvedValue(undefined);

      await service.disconnectConnection('user-1', 'meta_page-101');

      expect(deleteCredSpy).toHaveBeenCalledWith('meta_page-101');
      expect(updateConnSpy).toHaveBeenCalledWith('user-1', 'meta_page-101', {
        status: 'disconnected',
      });
    });

    it('prevents user B from disconnecting user A connection', async () => {
      const mockConn = {
        connectionId: 'meta_page-101',
        userId: 'user-A',
        status: 'active',
      };

      jest.spyOn(firestore, 'getSocialConnectionDoc').mockResolvedValue(mockConn as any);

      await expect(service.disconnectConnection('user-B', 'meta_page-101')).rejects.toThrow(
        /not authorized/i
      );
    });
  });
});
