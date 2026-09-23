import { parseSavedStyle, savedStyleInputSchema, toSavedStyleContext } from './savedStyle';
import type { SavedStyle } from '../types';

const input = {
  name: 'My Style',
  description: 'Playful local expression',
  tone: 'playful' as const,
  visualDensity: 'medium' as const,
  productProminence: 'high' as const,
  textDensity: 'minimal' as const,
  colorMode: 'brand' as const,
  humor: 'moderate' as const,
  ctaStyle: 'direct' as const,
  language: 'telugu-english' as const,
};

const style: SavedStyle = {
  ...input,
  styleId: 'style-1',
  businessId: 'business-1',
  userId: 'user-1',
  active: true,
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('SavedStyle domain', () => {
  it('accepts the representative My Style fixture', () => {
    expect(parseSavedStyle(style)).toEqual(style);
  });

  it('rejects invalid enum values and empty names', () => {
    expect(savedStyleInputSchema.safeParse({ ...input, name: '' }).success).toBe(false);
    expect(savedStyleInputSchema.safeParse({ ...input, tone: 'invented' }).success).toBe(false);
  });

  it('normalizes without exposing ownership or business facts', () => {
    const context = toSavedStyleContext(style);
    expect(context).toEqual({
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
    });
    expect(context).not.toHaveProperty('businessId');
    expect(context).not.toHaveProperty('templateId');
  });
});
