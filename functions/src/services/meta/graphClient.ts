import { getEnvConfig } from '../../config/env';
import { createLogger } from '../../utils/logging';
import type {
  MetaOAuthTokenResponse,
  MetaRawPage,
  MetaRawInstagramAccount,
} from '../../types/meta';

const logger = createLogger({ function: 'metaGraphClient' });

export class MetaGraphError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
    readonly metaErrorDetails?: unknown
  ) {
    super(message);
    this.name = 'MetaGraphError';
  }
}

export class MetaGraphClient {
  private get appId(): string {
    return getEnvConfig().META_APP_ID || process.env['META_APP_ID'] || '';
  }

  private get appSecret(): string {
    return getEnvConfig().META_APP_SECRET || process.env['META_APP_SECRET'] || '';
  }

  private get apiVersion(): string {
    return getEnvConfig().META_GRAPH_API_VERSION || 'v20.0';
  }

  private get baseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Exchanges authorization code for short-lived user access token.
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaOAuthTokenResponse> {
    if (!this.appId || !this.appSecret) {
      throw new MetaGraphError(
        'META_NOT_CONFIGURED',
        'Meta App ID or App Secret is not configured'
      );
    }

    const url = new URL(`${this.baseUrl}/oauth/access_token`);
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('client_secret', this.appSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code', code);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        logger.error('Meta code exchange failed', null, {
          status: response.status,
          errorCode: data.error?.code,
          type: data.error?.type,
        });
        throw new MetaGraphError(
          'META_OAUTH_CODE_EXCHANGE_FAILED',
          data.error?.message || 'Failed to exchange authorization code for Meta token',
          response.status,
          data.error
        );
      }

      return data as MetaOAuthTokenResponse;
    } catch (err: any) {
      if (err instanceof MetaGraphError) throw err;
      throw new MetaGraphError(
        'META_OAUTH_CODE_EXCHANGE_FAILED',
        `Network or server error during Meta code exchange: ${err.message}`
      );
    }
  }

  /**
   * Exchanges short-lived user access token for a long-lived user token (~60 days).
   */
  async getLongLivedUserToken(shortLivedToken: string): Promise<MetaOAuthTokenResponse> {
    if (!this.appId || !this.appSecret) {
      throw new MetaGraphError(
        'META_NOT_CONFIGURED',
        'Meta App ID or App Secret is not configured'
      );
    }

    const url = new URL(`${this.baseUrl}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('client_secret', this.appSecret);
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        logger.error('Meta long-lived token exchange failed', null, {
          status: response.status,
          errorCode: data.error?.code,
        });
        throw new MetaGraphError(
          'META_TOKEN_EXCHANGE_FAILED',
          data.error?.message || 'Failed to exchange long-lived Meta token',
          response.status
        );
      }

      return data as MetaOAuthTokenResponse;
    } catch (err: any) {
      if (err instanceof MetaGraphError) throw err;
      throw new MetaGraphError(
        'META_TOKEN_EXCHANGE_FAILED',
        `Network error exchanging long-lived token: ${err.message}`
      );
    }
  }

  /**
   * Fetches Facebook Pages managed by the authenticated Meta user.
   */
  async getUserPages(userAccessToken: string): Promise<MetaRawPage[]> {
    const fields = 'id,name,username,picture{url},access_token,instagram_business_account';
    const url = `${this.baseUrl}/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(userAccessToken)}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        logger.error('Meta get user pages failed', null, {
          status: response.status,
          errorCode: data.error?.code,
        });
        throw new MetaGraphError(
          'META_PAGE_FETCH_FAILED',
          data.error?.message || 'Failed to retrieve Facebook Pages from Meta',
          response.status
        );
      }

      return (data.data || []) as MetaRawPage[];
    } catch (err: any) {
      if (err instanceof MetaGraphError) throw err;
      throw new MetaGraphError(
        'META_PAGE_FETCH_FAILED',
        `Network error fetching Meta pages: ${err.message}`
      );
    }
  }

  /**
   * Fetches details of the linked Instagram Business/Creator account.
   */
  async getInstagramAccount(
    instagramAccountId: string,
    accessToken: string
  ): Promise<MetaRawInstagramAccount | null> {
    const fields = 'id,username,name,profile_picture_url,account_type';
    const url = `${this.baseUrl}/${instagramAccountId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        logger.warn('Failed to fetch Instagram account details', {
          instagramAccountId,
          errorCode: data.error?.code,
        });
        return null;
      }

      return data as MetaRawInstagramAccount;
    } catch (err: any) {
      logger.warn('Network error fetching Instagram account details', {
        instagramAccountId,
        message: err.message,
      });
      return null;
    }
  }

  /**
   * Generic node fetch for Meta Graph API (e.g. GET /{node_id}?fields=...)
   */
  async fetchNode(
    nodeId: string,
    fields: string[],
    accessToken: string
  ): Promise<Record<string, any>> {
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(nodeId)}`);
    url.searchParams.set('fields', fields.join(','));
    url.searchParams.set('access_token', accessToken);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        throw new MetaGraphError(
          data.error?.type || 'META_GRAPH_ERROR',
          data.error?.message || `Failed to fetch Graph API node ${nodeId}`,
          response.status,
          data.error
        );
      }

      return data as Record<string, any>;
    } catch (err: any) {
      if (err instanceof MetaGraphError) throw err;
      throw new MetaGraphError(
        'META_GRAPH_ERROR',
        `Network error fetching node ${nodeId}: ${err.message}`
      );
    }
  }

  /**
   * Generic insights fetch for Meta Graph API (e.g. GET /{node_id}/insights?metric=...)
   */
  async fetchInsights(
    nodeId: string,
    metrics: string[],
    accessToken: string
  ): Promise<Record<string, any>> {
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(nodeId)}/insights`);
    url.searchParams.set('metric', metrics.join(','));
    url.searchParams.set('access_token', accessToken);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        throw new MetaGraphError(
          data.error?.type || 'META_GRAPH_ERROR',
          data.error?.message || `Failed to fetch Graph API insights for node ${nodeId}`,
          response.status,
          data.error
        );
      }

      return data as Record<string, any>;
    } catch (err: any) {
      if (err instanceof MetaGraphError) throw err;
      throw new MetaGraphError(
        'META_GRAPH_ERROR',
        `Network error fetching insights for ${nodeId}: ${err.message}`
      );
    }
  }
}

export const metaGraphClient = new MetaGraphClient();
