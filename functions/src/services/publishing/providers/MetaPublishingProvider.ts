import { getEnvConfig } from '../../../config/env';
import { decryptToken } from '../../meta/crypto';
import type {
  PublishingProvider,
  PublishProviderInput,
  PublishProviderOutput,
  PublishStatusCheckInput,
  PublishStatusCheckOutput,
} from '../PublishingProvider';
import type { PublishErrorCode } from '../../../types/publishing';
import { logFunctionError } from '../../../utils/logging';

export class MetaPublishingError extends Error {
  constructor(
    public readonly code: PublishErrorCode,
    message: string,
    public readonly rawError?: any,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'MetaPublishingError';
  }
}

export class MetaPublishingProvider implements PublishingProvider {
  private get graphVersion(): string {
    return getEnvConfig().META_GRAPH_API_VERSION || 'v20.0';
  }

  private getAccessToken(credentials: PublishProviderInput['credentials']): string {
    try {
      if (credentials.pageAccessToken?.encryptedData) {
        return decryptToken(credentials.pageAccessToken);
      }
      if (credentials.userAccessToken?.encryptedData) {
        return decryptToken(credentials.userAccessToken);
      }
    } catch (err) {
      throw new MetaPublishingError(
        'AUTH_REQUIRED',
        'Failed to decrypt Meta access token',
        err,
        false
      );
    }
    throw new MetaPublishingError(
      'AUTH_REQUIRED',
      'No valid token found in credentials',
      null,
      false
    );
  }

  private parseMetaError(errRes: any, httpStatus: number): MetaPublishingError {
    const errorObj = errRes?.error || errRes || {};
    const code = errorObj.code;
    const subcode = errorObj.error_subcode;
    const message = errorObj.message || `Meta Graph API error (${httpStatus})`;

    // Revoked or expired token
    if (code === 190 || subcode === 458 || subcode === 460 || subcode === 463 || subcode === 467) {
      return new MetaPublishingError(
        'CONNECTION_REVOKED',
        'Meta account connection expired or revoked',
        errorObj,
        false
      );
    }

    // Permission errors
    if (code === 10 || code === 200 || code === 298) {
      return new MetaPublishingError(
        'PERMISSION_DENIED',
        `Permission denied by Meta: ${message}`,
        errorObj,
        false
      );
    }

    // Rate limits
    if (code === 4 || code === 17 || code === 32 || code === 613) {
      return new MetaPublishingError(
        'RATE_LIMITED',
        'Meta Graph API rate limit reached',
        errorObj,
        true
      );
    }

    // Invalid media or unsupported content
    if (code === 100 || subcode === 2207001 || subcode === 2207009) {
      return new MetaPublishingError(
        'INVALID_MEDIA',
        `Invalid media format or parameters: ${message}`,
        errorObj,
        false
      );
    }

    // 5xx server errors
    if (httpStatus >= 500) {
      return new MetaPublishingError(
        'META_API_ERROR',
        `Meta API server error (${httpStatus})`,
        errorObj,
        true
      );
    }

    return new MetaPublishingError('META_API_ERROR', message, errorObj, false);
  }

  async publishPost(input: PublishProviderInput): Promise<PublishProviderOutput> {
    const token = this.getAccessToken(input.credentials);

    if (input.platform === 'instagram') {
      const instagramId = input.socialConnection.instagram?.id;
      if (!instagramId) {
        throw new MetaPublishingError(
          'UNSUPPORTED_CONTENT',
          'No Instagram Professional account linked to this connection',
          null,
          false
        );
      }

      // Step 1: Create media container
      const containerUrl = `https://graph.facebook.com/${this.graphVersion}/${instagramId}/media`;
      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          image_url: input.mediaUrl,
          caption: input.caption,
          access_token: token,
        }).toString(),
      });

      const containerJson = (await containerRes.json()) as any;
      if (!containerRes.ok || !containerJson.id) {
        throw this.parseMetaError(containerJson, containerRes.status);
      }

      const containerId = containerJson.id;

      // Step 2: Publish media container
      const publishUrl = `https://graph.facebook.com/${this.graphVersion}/${instagramId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: token,
        }).toString(),
      });

      const publishJson = (await publishRes.json()) as any;
      if (!publishRes.ok || !publishJson.id) {
        throw this.parseMetaError(publishJson, publishRes.status);
      }

      return {
        externalPostId: publishJson.id,
        externalContainerId: containerId,
      };
    } else {
      // Facebook Page Post
      const pageId = input.socialConnection.facebookPage?.id;
      if (!pageId) {
        throw new MetaPublishingError(
          'UNSUPPORTED_CONTENT',
          'No Facebook Page ID found',
          null,
          false
        );
      }

      const photoUrl = `https://graph.facebook.com/${this.graphVersion}/${pageId}/photos`;
      const photoRes = await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          url: input.mediaUrl,
          message: input.caption,
          access_token: token,
        }).toString(),
      });

      const photoJson = (await photoRes.json()) as any;
      if (!photoRes.ok || (!photoJson.id && !photoJson.post_id)) {
        throw this.parseMetaError(photoJson, photoRes.status);
      }

      return {
        externalPostId: photoJson.post_id || photoJson.id,
      };
    }
  }

  async publishReel(input: PublishProviderInput): Promise<PublishProviderOutput> {
    const token = this.getAccessToken(input.credentials);

    if (input.platform === 'instagram') {
      const instagramId = input.socialConnection.instagram?.id;
      if (!instagramId) {
        throw new MetaPublishingError(
          'UNSUPPORTED_CONTENT',
          'No Instagram Professional account linked to this connection',
          null,
          false
        );
      }

      // Step 1: Create Reel container
      const containerUrl = `https://graph.facebook.com/${this.graphVersion}/${instagramId}/media`;
      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          media_type: 'REELS',
          video_url: input.mediaUrl,
          caption: input.caption,
          access_token: token,
        }).toString(),
      });

      const containerJson = (await containerRes.json()) as any;
      if (!containerRes.ok || !containerJson.id) {
        throw this.parseMetaError(containerJson, containerRes.status);
      }

      const containerId = containerJson.id;

      // Step 2: Poll container status until FINISHED (up to 30s)
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 6) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const statusRes = await this.getPublishStatus({
          socialConnection: input.socialConnection,
          credentials: input.credentials,
          externalContainerId: containerId,
        });

        if (statusRes.statusCode === 'FINISHED') {
          isReady = true;
        } else if (statusRes.statusCode === 'ERROR') {
          throw new MetaPublishingError(
            'INVALID_MEDIA',
            statusRes.errorMessage || 'Instagram Reel processing failed on Meta servers',
            null,
            false
          );
        }
      }

      if (!isReady) {
        throw new MetaPublishingError(
          'PROCESSING_TIMEOUT',
          'Instagram Reel video container processing timed out',
          null,
          true
        );
      }

      // Step 3: Publish Reel container
      const publishUrl = `https://graph.facebook.com/${this.graphVersion}/${instagramId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: token,
        }).toString(),
      });

      const publishJson = (await publishRes.json()) as any;
      if (!publishRes.ok || !publishJson.id) {
        throw this.parseMetaError(publishJson, publishRes.status);
      }

      return {
        externalPostId: publishJson.id,
        externalContainerId: containerId,
      };
    } else {
      // Facebook Page Reel / Video
      const pageId = input.socialConnection.facebookPage?.id;
      if (!pageId) {
        throw new MetaPublishingError(
          'UNSUPPORTED_CONTENT',
          'No Facebook Page ID found',
          null,
          false
        );
      }

      const videoUrl = `https://graph.facebook.com/${this.graphVersion}/${pageId}/videos`;
      const videoRes = await fetch(videoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          file_url: input.mediaUrl,
          description: input.caption,
          access_token: token,
        }).toString(),
      });

      const videoJson = (await videoRes.json()) as any;
      if (!videoRes.ok || !videoJson.id) {
        throw this.parseMetaError(videoJson, videoRes.status);
      }

      return {
        externalPostId: videoJson.id,
      };
    }
  }

  async getPublishStatus(input: PublishStatusCheckInput): Promise<PublishStatusCheckOutput> {
    const token = this.getAccessToken(input.credentials);
    const statusUrl = `https://graph.facebook.com/${this.graphVersion}/${input.externalContainerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`;

    const res = await fetch(statusUrl);
    const json = (await res.json()) as any;

    if (!res.ok) {
      return {
        statusCode: 'ERROR',
        errorMessage: json?.error?.message || 'Failed to check status',
      };
    }

    const statusCode = json.status_code as string;
    if (statusCode === 'FINISHED') {
      return { statusCode: 'FINISHED' };
    }
    if (statusCode === 'ERROR') {
      return { statusCode: 'ERROR', errorMessage: json.status || 'Media processing error' };
    }
    return { statusCode: 'IN_PROGRESS' };
  }
}
