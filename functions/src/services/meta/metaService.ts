import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getEnvConfig } from '../../config/env';
import { createLogger } from '../../utils/logging';
import { trackEvent } from '../analyticsService';
import {
  createOAuthStateDoc,
  getOAuthStateDoc,
  consumeOAuthStateDoc,
  createPendingPageSelectionSession,
  getPendingPageSelectionSession,
  deletePendingPageSelectionSession,
  createEncryptedCredentialDoc,
  deleteEncryptedCredentialDoc,
  createSocialConnectionDoc,
  updateSocialConnectionDoc,
  getSocialConnectionDoc,
  listSocialConnectionsByUser,
} from '../firestore';
import { encryptToken } from './crypto';
import { metaGraphClient, MetaGraphError } from './graphClient';
import type {
  SocialConnection,
  PendingMetaPage,
  PendingPageSelectionSession,
} from '../../types/meta';

const logger = createLogger({ function: 'metaService' });

export class MetaServiceError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'MetaServiceError';
  }
}

function hashState(state: string): string {
  return crypto.createHash('sha256').update(state).digest('hex');
}

export class MetaService {
  private get appId(): string {
    return getEnvConfig().META_APP_ID || process.env['META_APP_ID'] || '';
  }

  private get redirectUri(): string {
    return (
      getEnvConfig().META_REDIRECT_URI ||
      process.env['META_REDIRECT_URI'] ||
      'http://localhost:5001/demo-project/asia-south1/metaCallback'
    );
  }

  private get apiVersion(): string {
    return getEnvConfig().META_GRAPH_API_VERSION || 'v20.0';
  }

  /**
   * Generates a cryptographically secure OAuth authorization URL & state.
   */
  async createAuthorizationUrl(
    userId: string,
    businessId?: string,
    redirectPath?: string
  ): Promise<{ authUrl: string; state: string }> {
    if (!this.appId) {
      throw new MetaServiceError(
        'META_NOT_CONFIGURED',
        'Meta App ID is not configured on the server'
      );
    }

    const state = uuidv4();
    const stateHash = hashState(state);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 mins

    await createOAuthStateDoc({
      stateId: state,
      userId,
      businessId,
      stateHash,
      createdAt: now.toISOString(),
      expiresAt,
      redirectPath,
    });

    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
    ].join(',');

    const authUrl = new URL(`https://www.facebook.com/${this.apiVersion}/dialog/oauth`);
    authUrl.searchParams.set('client_id', this.appId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');

    logger.info('Created Meta OAuth state & authorization URL', { userId, stateId: state });
    return { authUrl: authUrl.toString(), state };
  }

  /**
   * Processes the OAuth callback from Meta, validating state & retrieving Page candidates.
   */
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{ stateId: string; userId: string; businessId?: string; pagesCount: number }> {
    if (!state || !code) {
      throw new MetaServiceError('INVALID_CALLBACK_PARAMS', 'Missing state or authorization code');
    }

    const stateDoc = await getOAuthStateDoc(state);
    if (!stateDoc) {
      throw new MetaServiceError('META_OAUTH_STATE_INVALID', 'OAuth state not found or invalid');
    }

    if (stateDoc.consumedAt) {
      throw new MetaServiceError('META_OAUTH_STATE_REUSED', 'OAuth state has already been used');
    }

    if (new Date(stateDoc.expiresAt).getTime() < Date.now()) {
      throw new MetaServiceError('META_OAUTH_STATE_EXPIRED', 'OAuth state has expired');
    }

    const expectedHash = hashState(state);
    if (stateDoc.stateHash !== expectedHash) {
      throw new MetaServiceError('META_OAUTH_STATE_INVALID', 'OAuth state hash mismatch');
    }

    await consumeOAuthStateDoc(state);

    // 1. Exchange code for short-lived token
    const shortLived = await metaGraphClient.exchangeCodeForToken(code, this.redirectUri);

    // 2. Exchange for long-lived user token
    const longLived = await metaGraphClient.getLongLivedUserToken(shortLived.access_token);
    const userAccessToken = longLived.access_token;

    // 3. Fetch user's Facebook Pages
    const rawPages = await metaGraphClient.getUserPages(userAccessToken);

    if (rawPages.length === 0) {
      throw new MetaServiceError(
        'META_NO_PAGES_FOUND',
        'No Facebook Pages found for this Meta account'
      );
    }

    const pageAccessTokens: Record<string, string> = {};
    const pendingPages: PendingMetaPage[] = [];

    for (const rawPage of rawPages) {
      pageAccessTokens[rawPage.id] = rawPage.access_token;

      let igData: PendingMetaPage['instagramAccount'] = undefined;
      if (rawPage.instagram_business_account?.id) {
        const rawIg = await metaGraphClient.getInstagramAccount(
          rawPage.instagram_business_account.id,
          rawPage.access_token
        );
        if (rawIg) {
          igData = {
            id: rawIg.id,
            username: rawIg.username,
            accountType: rawIg.account_type,
            name: rawIg.name,
            profilePictureUrl: rawIg.profile_picture_url,
          };
        }
      }

      pendingPages.push({
        pageId: rawPage.id,
        pageName: rawPage.name,
        pageUsername: rawPage.username,
        pictureUrl: rawPage.picture?.data?.url,
        instagramAccount: igData,
      });
    }

    const sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    const session: PendingPageSelectionSession = {
      stateId: state,
      userId: stateDoc.userId,
      businessId: stateDoc.businessId,
      pages: pendingPages,
      userAccessToken,
      pageAccessTokens,
      expiresAt: sessionExpiresAt,
    };

    await createPendingPageSelectionSession(session);

    logger.info('Meta OAuth callback completed, pending page selection session created', {
      userId: stateDoc.userId,
      pagesCount: pendingPages.length,
    });

    return {
      stateId: state,
      userId: stateDoc.userId,
      businessId: stateDoc.businessId,
      pagesCount: pendingPages.length,
    };
  }

  /**
   * Retrieves candidate Facebook Pages for selection by the authenticated user.
   */
  async getPendingPagesSession(userId: string, stateId: string): Promise<PendingMetaPage[]> {
    const session = await getPendingPageSelectionSession(stateId);
    if (!session) {
      throw new MetaServiceError(
        'PENDING_SESSION_NOT_FOUND',
        'Pending page selection session expired or invalid'
      );
    }

    if (session.userId !== userId) {
      throw new MetaServiceError(
        'UNAUTHORIZED_SESSION_ACCESS',
        'You are not authorized to access this session'
      );
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new MetaServiceError('PENDING_SESSION_EXPIRED', 'Page selection session expired');
    }

    return session.pages;
  }

  /**
   * Finalizes Page & Instagram selection, encrypts tokens, and stores connection.
   */
  async finalizePageSelection(
    userId: string,
    stateId: string,
    selectedPageId: string
  ): Promise<SocialConnection> {
    const session = await getPendingPageSelectionSession(stateId);
    if (!session) {
      throw new MetaServiceError(
        'PENDING_SESSION_NOT_FOUND',
        'Pending page selection session expired or invalid'
      );
    }

    if (session.userId !== userId) {
      throw new MetaServiceError(
        'UNAUTHORIZED_SESSION_ACCESS',
        'You are not authorized to modify this session'
      );
    }

    const selectedPage = session.pages.find((p) => p.pageId === selectedPageId);
    if (!selectedPage) {
      throw new MetaServiceError(
        'INVALID_PAGE_SELECTION',
        `Selected Facebook Page ${selectedPageId} is not part of this session`
      );
    }

    const pageAccessToken = session.pageAccessTokens[selectedPageId];
    if (!pageAccessToken) {
      throw new MetaServiceError(
        'MISSING_PAGE_ACCESS_TOKEN',
        'Access token for the selected page is missing'
      );
    }

    // Encrypt sensitive tokens server-side before storing
    const encryptedUserToken = encryptToken(session.userAccessToken);
    const encryptedPageToken = encryptToken(pageAccessToken);

    const connectionId = `meta_${selectedPageId}`;
    const now = new Date().toISOString();

    // Store encrypted credentials in server-only collection
    await createEncryptedCredentialDoc({
      connectionId,
      userId,
      userAccessToken: encryptedUserToken,
      pageAccessToken: encryptedPageToken,
      createdAt: now,
      updatedAt: now,
    });

    const connection: SocialConnection = {
      connectionId,
      userId,
      businessId: session.businessId,
      provider: 'meta',
      status: 'active',
      facebookPage: {
        id: selectedPage.pageId,
        name: selectedPage.pageName,
        username: selectedPage.pageUsername,
        pictureUrl: selectedPage.pictureUrl,
      },
      instagram: selectedPage.instagramAccount
        ? {
            id: selectedPage.instagramAccount.id,
            username: selectedPage.instagramAccount.username,
            accountType: selectedPage.instagramAccount.accountType,
            name: selectedPage.instagramAccount.name,
            profilePictureUrl: selectedPage.instagramAccount.profilePictureUrl,
          }
        : {},
      permissions: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish',
      ],
      tokenReference: connectionId,
      connectedAt: now,
      updatedAt: now,
      lastValidatedAt: now,
      metadata: {
        metaApiVersion: this.apiVersion,
      },
    };

    await createSocialConnectionDoc(connection);
    await deletePendingPageSelectionSession(stateId);

    await trackEvent('meta_connection_completed', userId, session.businessId, connectionId);

    logger.info('Meta connection successfully established and persisted', {
      userId,
      connectionId,
      pageId: selectedPage.pageId,
      hasInstagram: Boolean(selectedPage.instagramAccount?.id),
    });

    return connection;
  }

  /**
   * Lists active and historical social connections for a user.
   */
  async listConnections(userId: string): Promise<SocialConnection[]> {
    return listSocialConnectionsByUser(userId);
  }

  /**
   * Disconnects a Meta account connection.
   */
  async disconnectConnection(userId: string, connectionId: string): Promise<void> {
    const connection = await getSocialConnectionDoc(userId, connectionId);
    if (!connection) {
      throw new MetaServiceError('CONNECTION_NOT_FOUND', 'Social connection not found');
    }

    if (connection.userId !== userId) {
      throw new MetaServiceError(
        'UNAUTHORIZED_DISCONNECT',
        'You are not authorized to disconnect this account'
      );
    }

    // Delete encrypted credentials
    await deleteEncryptedCredentialDoc(connectionId);

    // Update public connection status to disconnected
    await updateSocialConnectionDoc(userId, connectionId, {
      status: 'disconnected',
    });

    await trackEvent('meta_connection_disconnected', userId, connection.businessId, connectionId);

    logger.info('Meta connection disconnected', { userId, connectionId });
  }
}

export const metaService = new MetaService();
