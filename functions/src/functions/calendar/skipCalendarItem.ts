import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import type { MarketingCalendarItem } from '../../types';

const skipCalendarItemSchema = z.object({
  itemId: z.string().min(1),
});

export const skipCalendarItem = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(skipCalendarItemSchema, async (data, context) => {
    const userId = context.userId;
    const db = admin.firestore();

    const itemRef = db.collection('marketingCalendarItems').doc(data.itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      throw new HttpsError('not-found', 'Calendar item not found');
    }

    const currentData = itemDoc.data() as MarketingCalendarItem;
    if (currentData.userId !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized calendar item access');
    }

    await itemRef.update({
      status: 'skipped',
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await itemRef.get();
    return { item: updatedDoc.data() as MarketingCalendarItem };
  })
);
