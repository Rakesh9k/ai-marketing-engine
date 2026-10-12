import { onCall } from 'firebase-functions/v2/https';
import { requireAdmin } from '../../middleware/auth';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { collectBillingReview } from '../../services/billingReview';
import { createLogger } from '../../utils/logging';

const logger = createLogger({ function: 'getBillingReview' });

/** Admin-only (verified custom claim): the payments, refunds and disputes that need a person. Read-only. */
export const getBillingReview = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 5 },
  async (request) => {
    const { userId } = requireAdmin(request);
    const items = await collectBillingReview();
    // Every look at the billing-review queue is recorded: who, when, and how much was visible.
    logger.info('billing review accessed', { userId, itemCount: items.length });
    await admin
      .firestore()
      .collection('billing_audit')
      .add({
        provider: 'cashfree',
        kind: 'review_accessed',
        orderId: null,
        userId,
        refId: 'billing_review',
        details: { itemCount: items.length },
        at: FieldValue.serverTimestamp(),
      });
    return { items };
  }
);
