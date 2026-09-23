import { z } from 'zod';
import type { SavedStyle, SavedStyleContext } from '../types';

export const SAVED_STYLE_TONES = [
  'playful',
  'serious',
  'professional',
  'warm',
  'bold',
  'premium',
  'energetic',
] as const;
export const SAVED_STYLE_VISUAL_DENSITIES = ['minimal', 'low', 'medium', 'high'] as const;
export const SAVED_STYLE_PRODUCT_PROMINENCES = ['subtle', 'balanced', 'high', 'dominant'] as const;
export const SAVED_STYLE_TEXT_DENSITIES = ['minimal', 'concise', 'moderate', 'detailed'] as const;
export const SAVED_STYLE_COLOR_MODES = ['brand', 'neutral', 'monochrome', 'vibrant'] as const;
export const SAVED_STYLE_HUMOR_LEVELS = ['none', 'light', 'moderate', 'high'] as const;
export const SAVED_STYLE_CTA_STYLES = ['soft', 'direct', 'urgent', 'conversational'] as const;
export const SAVED_STYLE_LANGUAGES = [
  'business-default',
  'english',
  'hinglish',
  'telugu-english',
  'regional',
] as const;

export const savedStyleInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  tone: z.enum(SAVED_STYLE_TONES),
  visualDensity: z.enum(SAVED_STYLE_VISUAL_DENSITIES),
  productProminence: z.enum(SAVED_STYLE_PRODUCT_PROMINENCES),
  textDensity: z.enum(SAVED_STYLE_TEXT_DENSITIES),
  colorMode: z.enum(SAVED_STYLE_COLOR_MODES),
  humor: z.enum(SAVED_STYLE_HUMOR_LEVELS),
  ctaStyle: z.enum(SAVED_STYLE_CTA_STYLES),
  language: z.enum(SAVED_STYLE_LANGUAGES).optional(),
});

export const savedStyleSchema = savedStyleInputSchema.extend({
  styleId: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  active: z.boolean(),
  version: z.number().int().positive(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export function parseSavedStyle(input: unknown): SavedStyle {
  return savedStyleSchema.parse(input);
}

export function toSavedStyleContext(style: SavedStyle): SavedStyleContext {
  return {
    tone: style.tone,
    visualDensity: style.visualDensity,
    productProminence: style.productProminence,
    textDensity: style.textDensity,
    colorMode: style.colorMode,
    humor: style.humor,
    ctaStyle: style.ctaStyle,
    language: style.language,
    styleId: style.styleId,
    styleVersion: style.version,
  };
}

export function toSavedStyleCard(style: SavedStyle) {
  return {
    styleId: style.styleId,
    name: style.name,
    description: style.description,
    tone: style.tone,
    visualDensity: style.visualDensity,
    productProminence: style.productProminence,
    textDensity: style.textDensity,
    colorMode: style.colorMode,
    humor: style.humor,
    ctaStyle: style.ctaStyle,
    language: style.language,
    active: style.active,
    version: style.version,
  };
}

export type SavedStyleInput = z.infer<typeof savedStyleInputSchema>;
