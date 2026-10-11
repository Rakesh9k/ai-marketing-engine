import { selectCreativeContext } from './creativeContextSelector';
import type { CreativeTemplateContext } from './creativeTemplateContext';
import { creativeTemplateRegistry } from '../creativeTemplateRegistry';
import type { CreativeTemplate, LanguageCode } from '../../types';

describe('CreativeContextSelector', () => {
  const mockProduct = { name: 'Biryani' };
  const mockOffer = {
    headline: '20% off',
    type: 'percentage',
    price: 400,
    validityStart: '2023',
    validityEnd: '2023',
  };
  const mockBrand = {
    logo: { primaryUrl: 'logo.png' },
    colors: { primary: '#000' },
    visualPreferences: 'modern style',
  };
  const mockAudience = { localities: ['Hyd'] };
  const mockLocalization = { primaryLanguage: 'en' as LanguageCode };
  const mockBusinessBrain = {
    name: 'Biryani Palace',
    category: 'restaurant' as const,
    description: 'Best biryani',
    location: { city: 'Hyd', state: 'TS' },
    contact: {},
  };

  function createMockTemplateContext(
    templateId: string,
    overrides: Partial<CreativeTemplateContext> = {}
  ): CreativeTemplateContext {
    const template = creativeTemplateRegistry.getCreativeTemplate(templateId) as CreativeTemplate;
    return {
      template,
      objective: 'conversion',
      businessBrain: mockBusinessBrain,
      product: mockProduct,
      offer: mockOffer,
      audience: mockAudience,
      brand: mockBrand as any,
      localization: mockLocalization,
      campaignConstraints: { requiredCta: 'Buy Now' },
      ...overrides,
    };
  }

  describe('TEST: PRODUCT HERO', () => {
    it('selects correct context for creative_copy', () => {
      const tctx = createMockTemplateContext('post-product-hero', { offer: undefined });
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      expect(result.context.product).toBeDefined();
      expect(result.context.brand).toBeDefined();
      expect(result.context.cta).toBeDefined();
      expect(result.context.offer).toBeUndefined();
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('TEST: LOCAL COMEDY', () => {
    it('selects correct context for creative_copy with post-local-relatable', () => {
      const tctx = createMockTemplateContext('post-local-relatable');
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      expect(result.context.localization).toBeDefined();
      expect(result.context.brand).toBeDefined();
      expect(result.context.product).toBeDefined();
      expect(result.context.audience).toBeDefined();
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('TEST: CINEMATIC REEL', () => {
    it('selects correct context for reel_shot_plan with reel-cinematic-product', () => {
      const tctx = createMockTemplateContext('reel-cinematic-product');
      const result = selectCreativeContext({ task: 'reel_shot_plan', templateContext: tctx });

      expect(result.context.brand).toBeDefined();
      expect(result.context.product).toBeDefined();
      expect(result.context.visualPreferences).toBeDefined();
      expect(result.context.shotConstraints).toBeDefined();
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('TEST: MISSING OPTIONAL CONTEXT', () => {
    it('succeeds without error for localization in Product Hero', () => {
      const tctx = createMockTemplateContext('post-product-hero', { localization: undefined });
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      expect(result.context.localization).toBeUndefined();
      expect(result.missingRequired).toHaveLength(0);
    });

    it('selects SavedStyleContext for creative copy without changing template grammar', () => {
      const tctx = createMockTemplateContext('post-product-hero', {
        savedStyle: {
          styleId: 'style-1',
          styleVersion: 1,
          tone: 'playful',
          visualDensity: 'medium',
          productProminence: 'high',
          textDensity: 'minimal',
          colorMode: 'brand',
          humor: 'moderate',
          ctaStyle: 'direct',
          language: 'telugu-english',
        },
      });
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      expect(result.context.savedStyle).toMatchObject({ styleId: 'style-1', tone: 'playful' });
      expect(result.template.id).toBe('post-product-hero');
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('TEST: MISSING REQUIRED CONTEXT', () => {
    it('fails deterministically by tracking missingRequired', () => {
      const tctx = createMockTemplateContext('post-offer', { offer: undefined });
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      expect(result.context.offer).toBeUndefined();
      expect(result.missingRequired).toContain('offer');
    });
  });

  describe('TEST: SAME TEMPLATE, DIFFERENT TASK', () => {
    it('differentiates context based on task', () => {
      const tctx = createMockTemplateContext('post-product-hero');

      const copyResult = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });
      const imageResult = selectCreativeContext({
        task: 'image_generation',
        templateContext: tctx,
      });

      expect(copyResult.context.cta).toBeDefined();
      expect(imageResult.context.cta).toBeUndefined();

      expect(imageResult.context.logo).toBeDefined();
      expect(imageResult.context.colors).toBeDefined();
    });
  });

  describe('TEST: SAME TASK, DIFFERENT TEMPLATE', () => {
    it('differentiates context based on template grammar', () => {
      const heroCtx = createMockTemplateContext('post-product-hero');
      const offerCtx = createMockTemplateContext('post-offer');

      const heroResult = selectCreativeContext({ task: 'creative_copy', templateContext: heroCtx });
      const _offerResult = selectCreativeContext({
        task: 'creative_copy',
        templateContext: offerCtx,
      });

      expect(heroResult.missingRequired).not.toContain('offer');
      expect(
        offerCtx.template.structure.grammar.find((g: any) => g.role === 'offer')?.required
      ).toBe(true);
    });
  });

  describe('TEST: NO RAW BUSINESS BRAIN', () => {
    it('does not return the full Business Brain', () => {
      const tctx = createMockTemplateContext('post-product-hero');
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      expect((result as any).businessBrain).toBeUndefined();
      expect((result.context as any).businessBrain).toBeUndefined();
    });
  });

  describe('TEST: PROVIDER INDEPENDENCE', () => {
    it('has no AI provider dependencies', () => {
      const tctx = createMockTemplateContext('post-product-hero');
      const result = selectCreativeContext({ task: 'creative_copy', templateContext: tctx });

      const json = JSON.stringify(result);
      expect(json).not.toMatch(/gemini/i);
      expect(json).not.toMatch(/openai/i);
    });
  });
});
