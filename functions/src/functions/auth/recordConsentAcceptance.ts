import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../../config/legal';

const db = admin.firestore();

const recordConsentAcceptanceSchema = z.object({
  accepted: z.literal(true),
});

/**
 * Records that the authenticated caller accepted the current Terms of
 * Service and Privacy Policy. Called by the signup form immediately after
 * account creation, once the caller has an ID token.
 *
 * The version recorded is always CURRENT_TERMS_VERSION /
 * CURRENT_PRIVACY_VERSION (server-side constants) — never a client-supplied
 * version string — so a client cannot claim to have accepted a document
 * version it was never shown. The timestamp is a Firestore server
 * timestamp, never a client-supplied Date, per the audit's explicit rule
 * against client-controlled acceptance timestamps.
 *
 * This callable only ever merges these four fields into users/{uid} — it
 * cannot touch role, businessIds, credits, or any other field, and
 * Firestore's own rules independently deny direct client writes to this
 * document regardless.
 *
 * Re-acceptance for existing users after a future policy change is not
 * implemented in this pass — see docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md.
 */
export const recordConsentAcceptance = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(recordConsentAcceptanceSchema, async (_data, context) => {
    const { logger, startTime } = logFunctionStart('recordConsentAcceptance', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'recordConsentAcceptance');

      await db.collection('users').doc(context.userId).set(
        {
          termsVersion: CURRENT_TERMS_VERSION,
          termsAcceptedAt: FieldValue.serverTimestamp(),
          privacyVersion: CURRENT_PRIVACY_VERSION,
          privacyAcceptedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logFunctionComplete(logger, startTime, { success: true });
      return {
        success: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
