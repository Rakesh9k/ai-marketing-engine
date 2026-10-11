import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import type { MarketingCalendarItem } from '../../types';

const updateCalendarItemSchema = z.object({
  itemId: z.string().min(1),
  topic: z.string().optional(),
  hook: z.string().optional(),
  callToAction: z.string().optional(),
  suggestedTime: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(['planned', 'content_created', 'scheduled', 'published', 'skipped']).optional(),
});

export const updateCalendarItem = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateCalendarItemSchema, async (data, context) => {
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

    const updates: Partial<MarketingCalendarItem> = {
      ...(data.topic && { topic: data.topic }),
      ...(data.hook && { hook: data.hook }),
      ...(data.callToAction && { callToAction: data.callToAction }),
      ...(data.suggestedTime && { suggestedTime: data.suggestedTime }),
      ...(data.scheduledDate && { scheduledDate: data.scheduledDate }),
      ...(data.status && { status: data.status }),
      updatedAt: new Date().toISOString(),
    };

    await itemRef.update(updates);
    const updatedDoc = await itemRef.get();
    return { item: updatedDoc.data() as MarketingCalendarItem };
  })
);
