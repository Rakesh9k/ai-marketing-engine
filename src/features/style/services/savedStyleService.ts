import { callFunction } from '@/services/api';
import type {
  SavedStyle,
  SavedStyleColorMode,
  SavedStyleCtaStyle,
  SavedStyleHumor,
  SavedStyleLanguage,
  SavedStyleProductProminence,
  SavedStyleTextDensity,
  SavedStyleTone,
  SavedStyleVisualDensity,
} from '@/types';

export type SavedStyleInput = Omit<
  SavedStyle,
  'styleId' | 'businessId' | 'active' | 'version' | 'createdAt' | 'updatedAt'
>;

export async function listSavedStyles(businessId: string): Promise<SavedStyle[]> {
  const response = await callFunction<{ businessId: string }, { styles: SavedStyle[] }>({
    functionName: 'listSavedStyles',
    data: { businessId },
  });
  return response.styles;
}

export async function createSavedStyle(
  businessId: string,
  input: SavedStyleInput
): Promise<SavedStyle> {
  const response = await callFunction<
    { businessId: string } & SavedStyleInput,
    { style: SavedStyle }
  >({
    functionName: 'createSavedStyle',
    data: { businessId, ...input },
  });
  return response.style;
}

export async function updateSavedStyle(
  businessId: string,
  styleId: string,
  input: SavedStyleInput
): Promise<SavedStyle> {
  const response = await callFunction<
    { businessId: string; styleId: string } & SavedStyleInput,
    { style: SavedStyle }
  >({
    functionName: 'updateSavedStyle',
    data: { businessId, styleId, ...input },
  });
  return response.style;
}

export async function deactivateSavedStyle(
  businessId: string,
  styleId: string
): Promise<SavedStyle> {
  const response = await callFunction<
    { businessId: string; styleId: string },
    { style: SavedStyle }
  >({
    functionName: 'deactivateSavedStyle',
    data: { businessId, styleId },
  });
  return response.style;
}

export const SAVED_STYLE_DEFAULTS: SavedStyleInput = {
  name: '',
  tone: 'warm' as SavedStyleTone,
  visualDensity: 'medium' as SavedStyleVisualDensity,
  productProminence: 'balanced' as SavedStyleProductProminence,
  textDensity: 'concise' as SavedStyleTextDensity,
  colorMode: 'brand' as SavedStyleColorMode,
  humor: 'none' as SavedStyleHumor,
  ctaStyle: 'direct' as SavedStyleCtaStyle,
  language: 'business-default' as SavedStyleLanguage,
};
