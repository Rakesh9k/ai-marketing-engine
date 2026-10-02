import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import type { MarketingPlan, MarketingCalendarItem } from '../../types';

const getPlanSchema = z.object({
  businessId: z.string().min(1),
});

export const getMarketingPlan = onCall(
  { region: 'asia-south1' },
  validatedCallable(getPlanSchema, async (data, context) => {
    const userId = context.userId;
    const db = admin.firestore();

    // Verify business access
    const businessDoc = await db.collection('businesses').doc(data.businessId).get();
    if (!businessDoc.exists || (businessDoc.data() as any).userId !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized business access');
    }

    // Fetch Active Plan
    const planSnap = await db
      .collection('marketingPlans')
      .where('businessId', '==', data.businessId)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (planSnap.empty) {
      return { plan: null, items: [] };
    }

    const planDoc = planSnap.docs[0]!;
    const plan = planDoc.data() as MarketingPlan;

    // Fetch Items for this Plan
    const itemsSnap = await db
      .collection('marketingCalendarItems')
      .where('planId', '==', plan.planId)
      .where('userId', '==', userId)
      .get();

    const items = itemsSnap.docs
      .map((d) => d.data() as MarketingCalendarItem)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return { plan, items };
  })
);
