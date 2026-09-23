import { onRequest } from 'firebase-functions/v2/https';
import { getEnvConfig } from '../../config/env';
import { getPayUConfig, verifyPayUResponse } from '../../services/payu';
import { createLogger, logFunctionStart, logFunctionComplete } from '../../utils/logging';

const callbackLogger = createLogger({ function: 'payuCallback' });

/**
 * Browser-redirect handler for PayU Hosted Checkout's surl/furl. PayU POSTs
 * the payment result here after the customer completes (or abandons)
 * checkout on PayU's own page.
 *
 * CRITICAL: per the task this was built from — "a successful redirect
 * means the customer returned from PayU, NOT that payment is definitely
 * valid" — this handler verifies the response hash only for cosmetic
 * legibility (so the billing page can show an accurate "processing" vs
 * "failed" state immediately) and NEVER grants credits. Credit granting is
 * exclusively payuWebhook.ts's job (server-to-server, configured
 * separately in the PayU merchant dashboard, not reachable by the
 * customer's browser).
 */
export const payuCallback = onRequest({ region: 'asia-south1' }, (req, res) => {
  const { logger, startTime } = logFunctionStart('payuCallback', { method: req.method });

  const envConfig = getEnvConfig();
  const redirectBase = envConfig.APP_URL || 'https://www.brain-wise.com';

  try {
    if (req.method !== 'POST') {
      res.redirect(302, `${redirectBase}/billing?payu=invalid_method`);
      return;
    }

    const body = req.body as Record<string, unknown>;
    const txnid = typeof body['txnid'] === 'string' ? body['txnid'] : '';
    const status = typeof body['status'] === 'string' ? body['status'] : '';

    if (!txnid) {
      logger.warn('payuCallback missing txnid', {});
      res.redirect(302, `${redirectBase}/billing?payu=missing_txnid`);
      return;
    }

    let hashValid = false;
    try {
      const payuConfig = getPayUConfig();
      hashValid = verifyPayUResponse(
        {
          key: String(body['key'] ?? ''),
          txnid,
          amount: String(body['amount'] ?? ''),
          productinfo: String(body['productinfo'] ?? ''),
          firstname: String(body['firstname'] ?? ''),
          email: String(body['email'] ?? ''),
          status,
          udf1: typeof body['udf1'] === 'string' ? body['udf1'] : undefined,
          udf2: typeof body['udf2'] === 'string' ? body['udf2'] : undefined,
          hash: String(body['hash'] ?? ''),
        },
        payuConfig.salt
      );
    } catch (configError) {
      logger.error('payuCallback: PayU not configured', configError as Error);
    }

    // Never logs the hash, salt, or full payload — only correlation-safe
    // fields (txnid, status, whether the hash checked out).
    logFunctionComplete(logger, startTime, { success: true, txnid, status, hashValid });

    // Cosmetic only: reflects what the browser saw, gated on hash validity
    // so a tampered redirect can't even cosmetically claim success. The
    // billing page must treat this as "pending confirmation," not final
    // truth — it should refresh from Firestore (updated by payuWebhook)
    // rather than trusting this query param alone.
    const cosmeticStatus = hashValid ? status : 'unverified';
    res.redirect(
      302,
      `${redirectBase}/billing?payu=${encodeURIComponent(cosmeticStatus)}&txnid=${encodeURIComponent(txnid)}`
    );
  } catch (error) {
    callbackLogger.error('payuCallback failed', error as Error);
    res.redirect(302, `${redirectBase}/billing?payu=error`);
  }
});
