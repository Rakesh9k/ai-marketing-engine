import type { PublishingProvider } from './PublishingProvider';
import { MetaPublishingProvider } from './providers/MetaPublishingProvider';
import type { PublishPlatform } from '../../types/publishing';

export interface ProviderFactoryInput {
  platform: PublishPlatform;
}

export class PublishingProviderFactory {
  private metaProvider: MetaPublishingProvider;

  constructor() {
    this.metaProvider = new MetaPublishingProvider();
  }

  getProvider(input: ProviderFactoryInput): PublishingProvider {
    switch (input.platform) {
      case 'instagram':
      case 'facebook':
        return this.metaProvider;
      default:
        throw new Error(`Unsupported publishing platform: ${input.platform}`);
    }
  }
}

export const publishingProviderFactory = new PublishingProviderFactory();
