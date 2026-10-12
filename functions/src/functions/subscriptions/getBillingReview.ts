import { onCall } from 'firebase-functions/v2/https';
import { requireAdmin } from '../../middleware/auth';
import { collectBillingReview } from '../../services/billingReview';

/** Admin-only (verified custom claim): the payments, refunds and disputes that need a person. Read-only. */
export const getBillingReview = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 5 },
  async (request) => {
    requireAdmin(request);
    return { items: await collectBillingReview() };
  }
);
