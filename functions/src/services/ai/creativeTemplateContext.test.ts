import {
  buildCreativeTemplateContext,
  TemplateContextValidationError,
} from './creativeTemplateContext';
import type { BrandCreativeContext, CreativeObjective } from '../../types';

describe('buildCreativeTemplateContext', () => {
  const mockBrandCreativeContext: BrandCreativeContext = {
    logo: { primaryUrl: 'logo.png' },
    colors: { primary: '#000' },
  };

  const mockBusinessBrain: any = {
    identity: {
      name: 'Biryani Palace',
      category: 'restaurant',
      description: 'The best biryani in town',
      location: { city: 'Hyderabad', state: 'TS' },
      contact: {},
    },
    localization: {
      primaryLanguage: 'en',
      secondaryLanguage: 'te',
      languageMixing: 'Hinglish',
    },
  };

  beforeEach(() => {
    // Reset any mocks if necessary
  });

  describe('Fixture 1 - Product Hero', () => {
    it('builds context successfully for a valid post-product-hero', () => {
      const result = buildCreativeTemplateContext({
        templateId: 'post-product-hero',
        objective: 'conversion',
        businessBrain: mockBusinessBrain,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Chicken Biryani',
        productDescription: 'Spicy and delicious',
        audienceLocalities: ['Jubilee Hills'],
      });

      expect(result.template.id).toBe('post-product-hero');
      expect(result.template.type).toBe('post');
      expect(result.objective).toBe('conversion');
      expect(result.product.name).toBe('Chicken Biryani');
      expect(result.businessBrain.name).toBe('Biryani Palace');
      expect(result.offer).toBeUndefined();
      expect(result.localization?.primaryLanguage).toBe('en');
    });
  });

  describe('Fixture 2 - Offer', () => {
    it('builds context successfully for post-offer with offer details', () => {
      const result = buildCreativeTemplateContext({
        templateId: 'post-offer',
        objective: 'promotion',
        businessBrain: mockBusinessBrain,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Family Meal',
        offerHeadline: 'Weekend 20% Off',
        offerPrice: 400,
        offerType: 'percentage',
        offerValidityStart: '2023-01-01',
        offerValidityEnd: '2023-12-31',
      });

      expect(result.template.id).toBe('post-offer');
      expect(result.offer).toBeDefined();
      expect(result.offer?.headline).toBe('Weekend 20% Off');
    });

    it('fails if offer is missing for post-offer', () => {
      expect(() => {
        buildCreativeTemplateContext({
          templateId: 'post-offer',
          objective: 'promotion',
          businessBrain: mockBusinessBrain,
          brandCreativeContext: mockBrandCreativeContext,
          productName: 'Family Meal',
        });
      }).toThrow(TemplateContextValidationError);
    });
  });

  describe('Fixture 3 - Local Relatable (Localization Independence)', () => {
    it('keeps template generic but localizes context for Hyderabad', () => {
      const result = buildCreativeTemplateContext({
        templateId: 'post-local-relatable',
        objective: 'engagement',
        businessBrain: mockBusinessBrain,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Biryani',
      });

      expect(result.template.id).toBe('post-local-relatable');
      expect(result.template.name).not.toMatch(/Hyderabad/);
      expect(result.localization?.languageMixing).toBe('Hinglish');
      expect(result.businessBrain.location.city).toBe('Hyderabad');
    });

    it('works with a different localization', () => {
      const delhiBusiness: any = {
        ...mockBusinessBrain,
        identity: { ...mockBusinessBrain.identity, location: { city: 'Delhi', state: 'DL' } },
        localization: { primaryLanguage: 'hi' },
      };

      const result = buildCreativeTemplateContext({
        templateId: 'post-local-relatable',
        objective: 'engagement',
        businessBrain: delhiBusiness,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Chole Bhature',
      });

      expect(result.template.id).toBe('post-local-relatable');
      expect(result.businessBrain.location.city).toBe('Delhi');
      expect(result.localization?.primaryLanguage).toBe('hi');
    });
  });

  describe('Fixture 4 - Reel Product Reveal', () => {
    it('builds context successfully for a valid reel-product-reveal', () => {
      const result = buildCreativeTemplateContext({
        templateId: 'reel-product-reveal',
        objective: 'conversion',
        businessBrain: mockBusinessBrain,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Premium Biryani',
      });

      expect(result.template.id).toBe('reel-product-reveal');
      expect(result.template.type).toBe('reel');
      expect(result.objective).toBe('conversion');
      expect(result.product.name).toBe('Premium Biryani');
    });
  });

  describe('Template Independence', () => {
    it('uses the same template for different businesses', () => {
      const salonBusiness: any = {
        identity: {
          name: 'Glamour Salon',
          category: 'salon',
          description: 'Premium haircuts',
          location: { city: 'Mumbai', state: 'MH' },
          contact: {},
        },
      };

      const result = buildCreativeTemplateContext({
        templateId: 'post-product-hero',
        objective: 'conversion',
        businessBrain: salonBusiness,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Haircut',
      });

      expect(result.template.id).toBe('post-product-hero');
      expect(result.businessBrain.name).toBe('Glamour Salon');
      expect(result.product.name).toBe('Haircut');
    });
  });

  describe('Missing Data & Validation', () => {
    it('fails if product is missing for a template that requires it', () => {
      expect(() => {
        buildCreativeTemplateContext({
          templateId: 'post-product-hero',
          objective: 'conversion',
          businessBrain: mockBusinessBrain,
          brandCreativeContext: mockBrandCreativeContext,
          productName: '',
        });
      }).toThrow(/Product name is required/);
    });

    it('fails if objective is mismatched', () => {
      expect(() => {
        buildCreativeTemplateContext({
          templateId: 'post-product-hero',
          objective: 'retention' as CreativeObjective,
          businessBrain: mockBusinessBrain,
          brandCreativeContext: mockBrandCreativeContext,
          productName: 'Biryani',
        });
      }).toThrow(/Objective retention is not supported/);
    });

    it('fails on unknown template ID', () => {
      expect(() => {
        buildCreativeTemplateContext({
          templateId: 'fake-template-id',
          objective: 'conversion',
          businessBrain: mockBusinessBrain,
          brandCreativeContext: mockBrandCreativeContext,
          productName: 'Biryani',
        });
      }).toThrow(/Template not found/);
    });
  });

  describe('Provider Independence & No Raw Leakage', () => {
    it('does not contain raw database documents', () => {
      const rawBusinessBrainDoc: any = {
        ...mockBusinessBrain,
        _firestoreMetadata: 'hidden-secret',
        internalNotes: 'do not show to AI',
      };

      const result = buildCreativeTemplateContext({
        templateId: 'post-product-hero',
        objective: 'conversion',
        businessBrain: rawBusinessBrainDoc,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Biryani',
      });

      expect((result.businessBrain as any)._firestoreMetadata).toBeUndefined();
      expect((result.businessBrain as any).internalNotes).toBeUndefined();
    });

    it('does not contain AI provider details', () => {
      const result = buildCreativeTemplateContext({
        templateId: 'post-product-hero',
        objective: 'conversion',
        businessBrain: mockBusinessBrain,
        brandCreativeContext: mockBrandCreativeContext,
        productName: 'Biryani',
      });

      expect((result as any).gemini).toBeUndefined();
      expect((result as any).temperature).toBeUndefined();
    });
  });
});
