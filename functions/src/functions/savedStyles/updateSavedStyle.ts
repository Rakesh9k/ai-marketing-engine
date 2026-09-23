import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { verifyBusinessAccess } from '../../middleware/auth';
import { getSavedStyleDoc, updateSavedStyleDoc } from '../../services/firestore';
import { savedStyleInputSchema, toSavedStyleCard } from '../../services/savedStyle';
import { validatedCallable } from '../../middleware/validation';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { HttpsError } from 'firebase-functions/v2/https';

const schema = z
  .object({ styleId: z.string().min(1), businessId: z.string().min(1) })
  .merge(savedStyleInputSchema);

export const updateSavedStyle = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(schema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateSavedStyle', {
      userId: context.userId,
      businessId: data.businessId,
      styleId: data.styleId,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const existing = await getSavedStyleDoc(data.styleId);
      if (!existing || existing.businessId !== data.businessId) {
        throw new HttpsError('not-found', 'Saved style not found');
      }
      if (existing.userId !== context.userId) {
        throw new HttpsError('permission-denied', 'Saved style does not belong to this user');
      }
      const updated = {
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
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      await updateSavedStyleDoc(data.styleId, updated);
      const style = { ...existing, ...updated };
      logFunctionComplete(logger, startTime, { success: true, version: style.version });
      return { style: toSavedStyleCard(style) };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
