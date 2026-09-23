import { TemplateAdaptationPlanner } from './templateAdaptation';
import { generateStructuredText } from './index';
import type { TemplateAdaptationInput, AdaptedCreativePlan } from './templateAdaptation';
import type { SelectedCreativeContext } from './creativeContextSelector';
import type { CreativeTemplate } from '../../types';

jest.mock('./index', () => ({
  generateStructuredText: jest.fn(),
}));

describe('TemplateAdaptationPlanner', () => {
  let planner: TemplateAdaptationPlanner;
  const mockGenerate = generateStructuredText as jest.MockedFunction<typeof generateStructuredText>;

  beforeEach(() => {
    planner = new TemplateAdaptationPlanner();
    mockGenerate.mockClear();
  });

  const baseTemplate = {
    id: 'test-template',
    type: 'post',
    name: 'Test Template',
    description: 'A test template',
    objectives: ['awareness', 'conversion'],
    verticals: ['restaurant'],
    structure: { type: 'post', grammar: [] },
    visualGrammar: { emphasis: 'product' as any, composition: 'centered' as any },
    adaptationRules: [],
    constraints: {},
    createdAt: '',
    updatedAt: '',
    source: 'system' as any,
    status: 'published' as any
  } as unknown as CreativeTemplate;

  const baseContext = {
    task: 'creative_copy',
    template: {
      id: 'test-template',
      type: 'post',
      name: 'Test',
      objective: 'conversion',
      structure: { type: 'post', grammar: [] },
      visualGrammar: { emphasis: 'product' as any, composition: 'centered' as any },
      constraints: {}
    },
    context: {
      product: { name: 'Biryani', category: 'Food' },
    },
    missingRequired: [],
  } as unknown as SelectedCreativeContext;

  const baseInput: TemplateAdaptationInput = {
    template: baseTemplate,
    selectedContext: baseContext,
    objective: 'conversion',
  };

  const validPlan: AdaptedCreativePlan = {
    hook: 'Strong hook',
    messaging: ['Message 1'],
    visualDirection: 'Visuals',
    composition: 'Composition',
    productTreatment: 'Hero',
    brandTreatment: 'Premium',
    cta: 'Order Now',
  };

  describe('TEST: AI INTEGRATION & VALIDATION', () => {
    it('returns a structured plan when AI succeeds', async () => {
      mockGenerate.mockResolvedValueOnce(validPlan);
      
      const plan = await planner.adapt(baseInput);
      expect(plan).toEqual(validPlan);
      
      // Ensure we call the provider wrapper, not Gemini directly
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('fails deterministically if AI throws (no fallback/fake plan)', async () => {
      mockGenerate.mockRejectedValueOnce(new Error('AI Failed'));
      
      await expect(planner.adapt(baseInput)).rejects.toThrow('AI Failed');
    });

    it('fails validation if Reel plan is missing reelSequence', async () => {
      mockGenerate.mockResolvedValueOnce(validPlan);
      const reelInput = { ...baseInput, template: { ...baseTemplate, type: 'reel' as const } };
      
      await expect(planner.adapt(reelInput)).rejects.toThrow('Reel templates require a reelSequence');
    });

    it('fails validation if template grammar requires CTA but plan has none', async () => {
      const ctaTemplate = {
        ...baseTemplate,
        structure: { type: 'post', grammar: [{ id: '1', role: 'cta', purpose: 'cta', required: true }] }
      } as unknown as CreativeTemplate;
      const planWithoutCta = { ...validPlan, cta: undefined };
      mockGenerate.mockResolvedValueOnce(planWithoutCta);
      
      await expect(planner.adapt({ ...baseInput, template: ctaTemplate })).rejects.toThrow('requires a CTA');
    });
  });

  describe('TEST: PROMPT CONSTRUCTION & CONTEXT INTEGRATION', () => {
    it('integrates template, objective, and selected context into the prompt', async () => {
      mockGenerate.mockResolvedValueOnce(validPlan);
      
      await planner.adapt(baseInput);
      
      const prompt = mockGenerate.mock.calls[0][0];
      expect(prompt).toContain('Name: Test Template');
      expect(prompt).toContain('Objective: conversion');
      expect(prompt).toContain('Biryani');
      expect(prompt).toContain('SELECTED BUSINESS CONTEXT (Only this context is permitted)');
    });

    it('changes prompt when objective changes (SAME TEMPLATE, DIFFERENT OBJECTIVE)', async () => {
      mockGenerate.mockResolvedValue(validPlan);
      
      await planner.adapt({ ...baseInput, objective: 'awareness' });
      const prompt1 = mockGenerate.mock.calls[0][0];
      
      await planner.adapt({ ...baseInput, objective: 'conversion' });
      const prompt2 = mockGenerate.mock.calls[1][0];
      
      expect(prompt1).toContain('Objective: awareness');
      expect(prompt2).toContain('Objective: conversion');
      expect(prompt1).not.toEqual(prompt2);
    });

    it('changes prompt when product changes (TEST: PRODUCT CHANGES PLAN)', async () => {
      mockGenerate.mockResolvedValue(validPlan);
      
      await planner.adapt(baseInput);
      const prompt1 = mockGenerate.mock.calls[0][0];
      
      const newContext = { ...baseContext, context: { product: { name: 'Burger', category: 'Food' } } };
      await planner.adapt({ ...baseInput, selectedContext: newContext });
      const prompt2 = mockGenerate.mock.calls[1][0];
      
      expect(prompt1).toContain('Biryani');
      expect(prompt2).toContain('Burger');
    });
    
    it('changes prompt when brand changes (TEST: BRAND CHANGES PLAN)', async () => {
      mockGenerate.mockResolvedValue(validPlan);
      
      const brandContext = { ...baseContext, context: { brand: { tone: 'playful' as any } } };
      await planner.adapt({ ...baseInput, selectedContext: brandContext });
      const prompt1 = mockGenerate.mock.calls[0][0];
      
      const brandContext2 = { ...baseContext, context: { brand: { tone: 'professional' as any } } };
      await planner.adapt({ ...baseInput, selectedContext: brandContext2 });
      const prompt2 = mockGenerate.mock.calls[1][0];
      
      expect(prompt1).toContain('playful');
      expect(prompt2).toContain('professional');
    });

    it('changes prompt when localization changes (TEST: LOCALIZATION CHANGES PLAN)', async () => {
      mockGenerate.mockResolvedValue(validPlan);
      
      const localContext = { ...baseContext, context: { localization: { primaryLanguage: 'te' as any } } };
      await planner.adapt({ ...baseInput, selectedContext: localContext });
      
      const prompt = mockGenerate.mock.calls[0][0];
      expect(prompt).toContain('te');
    });
  });
});
