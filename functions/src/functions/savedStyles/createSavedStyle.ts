import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { createSavedStyleDoc } from '../../services/firestore';
import { savedStyleInputSchema, toSavedStyleCard } from '../../services/savedStyle';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { SavedStyle } from '../../types';

const schema = z.object({ businessId: z.string().min(1) }).merge(savedStyleInputSchema);

export const createSavedStyle = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(schema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createSavedStyle', {
      userId: context.userId,
      businessId: data.businessId,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const now = new Date().toISOString();
      const style: SavedStyle = {
        styleId: uuidv7(),
        businessId: data.businessId,
        userId: context.userId,
        name: data.name,
        description: data.description,
        tone: data.tone,
        visualDensity: data.visualDensity,
        productProminence: data.productProminence,
        textDensity: data.textDensity,
        colorMode: data.colorMode,
        humor: data.humor,
        ctaStyle: data.ctaStyle,
        language: data.language,
        active: true,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      await createSavedStyleDoc(style);

      const { trackCreativeEvent } = await import('../../services/analyticsService.js');
      await trackCreativeEvent({
        eventType: 'creative_style_saved',
        userId: context.userId,
        businessId: data.businessId,
        styleId: style.styleId,
        styleVersion: style.version,
      });

      logFunctionComplete(logger, startTime, { success: true, styleId: style.styleId });
      return { style: toSavedStyleCard(style) };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);

