/**
 * The opportunity `confidence` has ONE representation: a whole number from 0 to 100.
 *
 * Why this exists: the prompt never said which scale to use, the live model answered 0.9, the code required >= 50,
 * so every real run was rejected as "too low" and the campaign silently used the generic fallback. The contract is
 * now stated in the prompt, enforced by the schema, and never guessed at: a fraction, a string, a missing or an
 * out-of-range value is a contract violation (the schema rejects it and the repair step asks the model again).
 * The bar is 50 on that scale.
 */
const generateStructuredTextMock = jest.fn();
jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
}));

import { creativeBrainService } from './creativeBrainService';
import { buildOpportunityFormationPrompt } from './prompts/creativeBrainPrompts';
import { CreativeOpportunitySchema, type CreativeBrainInput } from './creativeBrain.types';

const opportunity = (confidence: unknown, statement = 'Make the signature offer the easy choice') => ({
  opportunityId: 'opp-1',
  vertical: 'restaurant',
  problem: 'p',
  tension: 't',
  motivation: 'm',
  audienceInsight: 'a',
  opportunityStatement: statement,
  desiredBusinessOutcome: 'o',
  desiredAudienceResponse: 'r',
  supportingSignals: [],
  constraints: { maxTextDensity: 'medium', toneBoundary: 'warm', factualLimits: [] },
  ...(confidence === undefined ? {} : { confidence }),
  rationale: 'because',
});

const input = {
  businessBrain: { identity: { name: 'Bandra Bites', location: { city: 'Mumbai' } }, audience: {} },
  vertical: 'restaurant',
  intent: {
    objective: 'brand_awareness',
    offer: { headline: 'Paneer Biryani', price: 250 },
    audience: { localities: ['Bandra'] },
    localization: { audienceDescription: '' },
    cta: 'order_whatsapp',
  },
  conflictConstraints: { directives: [] },
} as unknown as CreativeBrainInput;

describe('the contract: confidence is an integer from 0 to 100', () => {
  it.each([0, 1, 20, 49, 50, 72, 95, 100])('%p is valid', (value) => {
    expect(CreativeOpportunitySchema.safeParse(opportunity(value)).success).toBe(true);
  });

  it.each([
    ['a fraction (the live model answered 0.9)', 0.9],
    ['a fraction at the boundary', 0.5],
    ['a decimal on the 0-100 scale', 72.5],
    ['a string', '90'],
    ['a percentage string', '90%'],
    ['above the range', 101],
    ['below the range', -1],
    ['not a number', Number.NaN],
    ['null', null],
    ['missing', undefined],
  ])('%s is rejected, never reinterpreted', (_label, value) => {
    expect(CreativeOpportunitySchema.safeParse(opportunity(value)).success).toBe(false);
  });
});

describe('what the Creative Brain does with a contract-valid confidence', () => {
  // The model's self-reported confidence is contract-checked (above) but is not the acceptance gate: the
  // OpportunityEngine's factuality and quality gate is. A good opportunity is accepted at any valid confidence.
  it.each([0, 49, 50, 100])('a good opportunity with confidence %p is accepted as the model\'s own', async (value) => {
    generateStructuredTextMock.mockResolvedValueOnce(opportunity(value));
    const result = await creativeBrainService.discoverOpportunity(input);
    expect(result.opportunityStatement).toBe('Make the signature offer the easy choice');
  });
});

describe('the prompt states the same contract', () => {
  it('names the scale (an integer from 0 to 100)', () => {
    const prompt = buildOpportunityFormationPrompt(input);
    expect(prompt).toMatch(/"confidence" is an integer from 0 to 100/);
  });
});


describe('the concept id is Mitra bookkeeping, not a model obligation', () => {
  const concept = (id?: string) => ({
    ...(id ? { conceptId: id } : {}),
    title: 't', angle: 'a', coreIdea: 'c', hookDirection: 'h', emotionalDriver: 'warm',
    audienceFraming: 'f', message: 'm', offerFraming: 'o', ctaDirection: 'd',
    visualPremise: { emphasis: 'product-led', composition: 'hero-product', mood: 'warm and calm', compositionHints: [] },
    differentiation: 'x', expectedResponse: 'r', templateId: 't',
  });

  it('a concept the model left without an id is given one, and the others keep theirs', async () => {
    generateStructuredTextMock.mockResolvedValueOnce({ concepts: [concept('c1'), concept('c2'), concept()] });
    const out = await creativeBrainService.generateConceptCandidates(
      opportunity(80) as never,
      { ...input, memory: {} } as never,
      3
    );
    expect(out.map((c) => c.conceptId)).toEqual(['c1', 'c2', 'concept-3']);
  });
});
