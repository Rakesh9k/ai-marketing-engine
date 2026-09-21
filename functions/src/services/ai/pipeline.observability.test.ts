/**
 * Phase 14 — proves the AI generation pipeline emits structured,
 * context-rich logs (not the bare console.log/console.error this phase
 * replaced) by running the REAL GenerationPipeline.execute() and spying on
 * the underlying functions.logger calls it goes through via
 * utils/logging.ts's createLogger/logFunctionStage.
 */
const generateStructuredTextMock = jest.fn().mockResolvedValue({});
const analyzeProductImagesMock = jest.fn();
const generateImageMock = jest.fn().mockResolvedValue({
  success: true,
  imageUrl: 'https://provider.example.com/temp-hero.png',
  provider: 'openai',
  model: 'dall-e-3',
});

jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: (...args: unknown[]) => analyzeProductImagesMock(...args),
  generateImage: (...args: unknown[]) => generateImageMock(...args),
}));

const fetchAsBufferMock = jest
  .fn()
  .mockResolvedValue({ buffer: Buffer.from('fake-bytes'), contentType: 'image/png' });
const uploadGeneratedAssetMock = jest
  .fn()
  .mockImplementation(async (businessId: string, campaignId: string, type: string) => ({
    url: `https://storage.example.com/${businessId}/${campaignId}/${type}-${Math.random()}`,
    storagePath: `businesses/${businessId}/campaigns/${campaignId}/generated/${type}.png`,
  }));

jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: (...args: unknown[]) => fetchAsBufferMock(...args),
  uploadGeneratedAsset: (...args: unknown[]) => uploadGeneratedAssetMock(...args),
}));

import * as functions from 'firebase-functions';
import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

function makeInput(): GenerationPipelineInput {
  return {
    businessId: 'biz_obs_1',
    campaignId: 'camp_obs_1',
    businessName: 'Test Biryani House',
    businessCategory: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '9876543210',
    businessPhone: '9876543210',
    businessBrain: {},
    brandProfile: {},
    objective: 'weekend_offer',
    productId: 'prod_1',
    productName: 'Paneer Biryani',
    offerHeadline: 'Weekend Special',
    offerPrice: 299,
    offerOriginalPrice: 332,
    offerType: 'percentage',
    offerValidityStart: '2026-03-10T00:00:00.000Z',
    offerValidityEnd: '2026-03-15T00:00:00.000Z',
    duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {},
    campaignStyle: 'funny',
  } as GenerationPipelineInput;
}

describe('GenerationPipeline observability (Phase 14)', () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    infoSpy = jest.spyOn(functions.logger, 'info').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(functions.logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits a stage.* log for every pipeline stage, each carrying businessId and campaignId', async () => {
    const pipeline = new GenerationPipeline();
    await pipeline.execute(makeInput());

    const stageLogCalls = infoSpy.mock.calls.filter(([message]) =>
      String(message).startsWith('stage.')
    );
    // All 12 documented pipeline stages must be represented.
    const stageNames = stageLogCalls.map(([message]) => message);
    expect(stageNames).toEqual(
      expect.arrayContaining([
        'stage.business_understanding',
        'stage.product_understanding',
        'stage.campaign_strategy',
        'stage.localization_strategy',
        'stage.copy_generation',
        'stage.creative_direction',
        'stage.image_generation',
        'stage.truth_validation',
        'stage.quality_validation',
        'stage.safety_validation',
        'stage.truth_check',
        'stage.campaign_assembly',
      ])
    );

    for (const [, context] of stageLogCalls) {
      expect(context).toMatchObject({ businessId: 'biz_obs_1', campaignId: 'camp_obs_1' });
    }
  });

  it('on a mid-pipeline exception, logs "Pipeline failed" with the exact stage that was running plus businessId/campaignId — never a bare, uncorrelated error', async () => {
    // Stage 1 (business_understanding) and stage 2 (product_understanding,
    // since `productId` selects the "existing product" branch with no
    // vision call) each make exactly one generateStructuredText call before
    // stage 3 (campaign_strategy) makes its own — so the 3rd call is where
    // this forces the failure.
    generateStructuredTextMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('AI provider timed out'));

    const pipeline = new GenerationPipeline();
    await expect(pipeline.execute(makeInput())).rejects.toThrow('AI provider timed out');

    const failureCall = errorSpy.mock.calls.find(([message]) => message === 'Pipeline failed');
    expect(failureCall).toBeDefined();
    const [, context] = failureCall!;
    expect(context).toMatchObject({
      businessId: 'biz_obs_1',
      campaignId: 'camp_obs_1',
      stage: 'campaign_strategy',
    });
    expect(context.error.message).toMatch(/AI provider timed out/);
  });
});
