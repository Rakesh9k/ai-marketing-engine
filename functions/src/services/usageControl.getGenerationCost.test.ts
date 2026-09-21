import { getGenerationCost, USAGE_ERROR_CODES } from './usageControl';
import { PRICING } from '../config/pricing';

describe('getGenerationCost', () => {
  it('prices reel_generation from PRICING.reelGenerationCredits', () => {
    expect(getGenerationCost('reel_generation')).toBe(PRICING.reelGenerationCredits);
  });

  it('still prices campaign_generation and image_generation unchanged', () => {
    expect(getGenerationCost('campaign_generation')).toBe(
      PRICING.campaignBaseCredits + 2 * PRICING.imageGenerationCredits
    );
    expect(getGenerationCost('image_generation')).toBe(PRICING.imageGenerationCredits);
  });

  it('throws INVALID_OPERATION for an unknown operation type', () => {
    try {
      getGenerationCost('not_a_real_operation');
      fail('expected getGenerationCost to throw');
    } catch (error: any) {
      expect(error.code).toBe(USAGE_ERROR_CODES.INVALID_OPERATION);
    }
  });
});
