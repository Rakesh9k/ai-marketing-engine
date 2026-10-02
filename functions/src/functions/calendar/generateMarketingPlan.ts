import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { executeWithUsageControl } from '../../services/usageControl';
import { calendarPlanningService } from '../../services/calendar/calendarPlanningService';

const generatePlanSchema = z.object({
  businessId: z.string().min(1),
  goal: z.enum(['get_customers', 'promote_offers', 'build_awareness', 'promote_products']),
  frequency: z.enum(['three_per_week', 'five_per_week', 'daily']),
  specificProductId: z.string().optional(),
  startDate: z.string().optional(),
  timezone: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const generateMarketingPlan = onCall(
  { region: 'asia-south1' },
  validatedCallable(generatePlanSchema, async (data, context) => {
    const userId = context.userId;
    const db = admin.firestore();

    // Verify Business Ownership
    const businessDoc = await db.collection('businesses').doc(data.businessId).get();
    if (!businessDoc.exists) {
      throw new HttpsError('not-found', 'Business not found');
    }
    const businessData = businessDoc.data()!;
    if ((businessData as any).userId !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized business access');
    }

    // Verify Specific Product Ownership if provided
    if (data.specificProductId) {
      const productDoc = await db.collection('products').doc(data.specificProductId).get();
      if (!productDoc.exists || productDoc.data()?.['businessId'] !== data.businessId) {
        throw new HttpsError('permission-denied', 'Unauthorized product access');
      }
    }

    const operationId =
      data.idempotencyKey ||
      `plan_${data.businessId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const { result } = await executeWithUsageControl(
      userId,
      operationId,
      'calendar_planning',
      async () => {
        // Archive previous active plans for this business
        const existingPlansSnap = await db
          .collection('marketingPlans')
          .where('businessId', '==', data.businessId)
          .where('status', '==', 'active')
          .get();

        if (!existingPlansSnap.empty) {
          const batch = db.batch();
          existingPlansSnap.docs.forEach((doc) => {
            batch.update(doc.ref, { status: 'archived', updatedAt: new Date().toISOString() });
          });
          await batch.commit();
        }

        // Generate low-cost 30-day marketing plan via TextAI
        const { plan, items } = await calendarPlanningService.generatePlan(
          { businessId: data.businessId, ...businessData } as any,
          data,
          userId
        );

        // Save plan to Firestore
        await db.collection('marketingPlans').doc(plan.planId).set(plan);

        // Save calendar items to Firestore
        const itemsBatch = db.batch();
        items.forEach((item) => {
          const itemRef = db.collection('marketingCalendarItems').doc(item.itemId);
          itemsBatch.set(itemRef, item);
        });
        await itemsBatch.commit();

        return { plan, items };
      },
      { businessId: data.businessId, goal: data.goal, frequency: data.frequency }
    );

    return result;
  })
);
