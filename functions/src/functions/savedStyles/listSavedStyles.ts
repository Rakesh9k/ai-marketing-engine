import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getSavedStylesByBusiness } from '../../services/firestore';
import { toSavedStyleCard } from '../../services/savedStyle';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const schema = z.object({ businessId: z.string().min(1) });

export const listSavedStyles = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(schema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listSavedStyles', {
      userId: context.userId,
      businessId: data.businessId,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const styles = await getSavedStylesByBusiness(data.businessId);
      const cards = styles.map(toSavedStyleCard);
      logFunctionComplete(logger, startTime, { success: true, count: cards.length });
      return { styles: cards };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
