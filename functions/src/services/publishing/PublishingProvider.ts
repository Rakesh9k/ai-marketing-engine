import type { SocialConnection, EncryptedCredentialDoc } from '../../types/meta';
import type { PublishPlatform, PublishContentType } from '../../types/publishing';

export interface PublishProviderInput {
  platform: PublishPlatform;
  contentType: PublishContentType;
  socialConnection: SocialConnection;
  credentials: EncryptedCredentialDoc;
  mediaUrl: string;
  caption: string;
}

export interface PublishProviderOutput {
  externalPostId: string;
  externalContainerId?: string;
}

export interface PublishStatusCheckInput {
  socialConnection: SocialConnection;
  credentials: EncryptedCredentialDoc;
  externalContainerId: string;
}

export interface PublishStatusCheckOutput {
  statusCode: 'FINISHED' | 'IN_PROGRESS' | 'ERROR';
  errorMessage?: string;
}

export interface PublishingProvider {
  publishPost(input: PublishProviderInput): Promise<PublishProviderOutput>;
  publishReel(input: PublishProviderInput): Promise<PublishProviderOutput>;
  getPublishStatus?(input: PublishStatusCheckInput): Promise<PublishStatusCheckOutput>;
}
