import { publishingProviderFactory } from './publishingProviderFactory';
import { MetaPublishingProvider } from './providers/MetaPublishingProvider';

describe('PublishingProviderFactory', () => {
  it('returns MetaPublishingProvider for instagram', () => {
    const provider = publishingProviderFactory.getProvider({ platform: 'instagram' });
    expect(provider).toBeInstanceOf(MetaPublishingProvider);
  });

  it('returns MetaPublishingProvider for facebook', () => {
    const provider = publishingProviderFactory.getProvider({ platform: 'facebook' });
    expect(provider).toBeInstanceOf(MetaPublishingProvider);
  });

  it('throws error for unsupported platform', () => {
    expect(() => publishingProviderFactory.getProvider({ platform: 'tiktok' as any })).toThrow(
      /unsupported publishing platform/i
    );
  });
});
