import * as crypto from 'crypto';
import { getEnvConfig } from '../config/env';

/**
 * PayU India service — hosted checkout (one-time transaction rail) plus a
 * best-effort, UNVERIFIED Standing Instruction (recurring/auto-renewal)
 * layer. Formulas below were sourced from PayU's current public
 * documentation (docs.payu.in, fetched during this implementation), not
 * invented from this file's own guesses:
 *   - Payment request hash: https://docs.payu.in/docs/generate-hash-payu-hosted
 *   - Response/webhook (reverse) hash: same page, "Payment Response Hash"
 *   - Verify Payment API: https://docs.payu.in/v2/reference/v2_verify_payment_api
 *     and the legacy postservice.php command API (sha512(key|command|var1|salt))
 *   - Recurring/SI: https://docs.payu.in/docs/introduction-recurring-payments-integration
 * None of this has been exercised against a real PayU test/production
 * account — this repository has zero PayU credentials configured (verified:
 * no PAYU_* value exists in functions/.env.local or any deployed secret).
 * See docs/PAYMENT_GATEWAY.md for exactly what is VERIFIED vs UNVERIFIED.
 */

export type PayUEnvironment = 'test' | 'production';

const CHECKOUT_URLS: Record<PayUEnvironment, string> = {
  test: 'https://test.payu.in/_payment',
  production: 'https://secure.payu.in/_payment',
};

// Legacy command-based API (verify_payment, cancel_refund_transaction, etc.)
const POSTSERVICE_URLS: Record<PayUEnvironment, string> = {
  test: 'https://test.payu.in/merchant/postservice.php?form=2',
  production: 'https://info.payu.in/merchant/postservice.php?form=2',
};

export interface PayUConfig {
  merchantKey: string;
  salt: string;
  environment: PayUEnvironment;
  checkoutUrl: string;
  postserviceUrl: string;
  siEnabled: boolean;
}

/**
 * Throws if PAYU_MERCHANT_KEY/PAYU_SALT are not configured — callers must
 * not silently proceed with an empty salt (that would make the hash
 * trivially forgeable). Never logs the returned salt; callers must not
 * either.
 */
export function getPayUConfig(): PayUConfig {
  const config = getEnvConfig();
  if (!config.PAYU_MERCHANT_KEY || !config.PAYU_SALT) {
    throw new Error('PayU credentials not configured (PAYU_MERCHANT_KEY / PAYU_SALT)');
  }
  const environment: PayUEnvironment = config.PAYU_ENVIRONMENT;
  return {
    merchantKey: config.PAYU_MERCHANT_KEY,
    salt: config.PAYU_SALT,
    environment,
    checkoutUrl: CHECKOUT_URLS[environment],
    postserviceUrl: POSTSERVICE_URLS[environment],
    siEnabled: config.PAYU_SI_ENABLED,
  };
}

export interface PaymentHashInput {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  salt: string;
}

/**
 * Payment request ("forward") hash — PayU's documented format is
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT),
 * i.e. exactly 5 UDF fields followed by 6 empty pipe-delimited positions
 * before SALT (15 pipes total between `email` and `SALT`). Unset UDF fields
 * are sent as empty strings, not omitted — omitting a field changes the
 * pipe count and breaks the hash.
 */
export function generatePaymentHash(input: PaymentHashInput): string {
  const fields = [
    input.key,
    input.txnid,
    input.amount,
    input.productinfo,
    input.firstname,
    input.email,
    input.udf1 ?? '',
    input.udf2 ?? '',
    input.udf3 ?? '',
    input.udf4 ?? '',
    input.udf5 ?? '',
    '', // udf6 (reserved, always empty for this integration)
    '', // udf7
    '', // udf8
    '', // udf9
    '', // udf10
    input.salt,
  ];
  return crypto.createHash('sha512').update(fields.join('|')).digest('hex');
}

export interface ResponseHashInput {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  salt: string;
}

/**
 * Response/webhook ("reverse") hash — PayU's documented format is
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key),
 * the exact reverse field order of the payment request hash, with `status`
 * inserted after SALT and the same 6-empty-position gap preserved. This is
 * a DIFFERENT formula from generatePaymentHash — do not reuse one for the
 * other (the task that produced this file explicitly warned about that
 * exact mistake, and PayU's own docs list them as separate operations).
 */
export function generateResponseHash(input: ResponseHashInput): string {
  const fields = [
    input.salt,
    input.status,
    '', // udf10
    '', // udf9
    '', // udf8
    '', // udf7
    '', // udf6
    input.udf5 ?? '',
    input.udf4 ?? '',
    input.udf3 ?? '',
    input.udf2 ?? '',
    input.udf1 ?? '',
    input.email,
    input.firstname,
    input.productinfo,
    input.amount,
    input.txnid,
    input.key,
  ];
  return crypto.createHash('sha512').update(fields.join('|')).digest('hex');
}

/**
 * Constant-time comparison of the PayU-supplied hash against the
 * server-computed expected hash. Length is checked first (required by
 * timingSafeEqual, and leaks only the expected hash's fixed public length —
 * hex-encoded SHA-512 is always 128 characters — never its content).
 * Returns false (never throws) for a missing, malformed, or wrong-length
 * hash, so callers can treat every failure mode uniformly as "verification
 * failed" rather than needing to catch a parsing exception separately.
 */
export function verifyHashConstantTime(expectedHex: string, receivedHex: unknown): boolean {
  if (typeof receivedHex !== 'string' || receivedHex.length === 0) {
    return false;
  }
  // Reject anything that isn't a plausible hex digest before touching
  // Buffer.from — a non-hex string silently produces a shorter buffer,
  // which would otherwise just fail the length check but is worth
  // rejecting explicitly for clarity.
  if (!/^[0-9a-f]+$/i.test(receivedHex)) {
    return false;
  }
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(receivedHex, 'hex');
  if (expected.length !== received.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, received);
}

export interface PayUResponseFields {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  mihpayid?: string;
}

/**
 * Verifies a PayU response/webhook payload's hash against the configured
 * salt. This is the single choke point both payuCallback.ts (browser
 * redirect) and payuWebhook.ts (server-to-server) must call before trusting
 * `status` for anything beyond cosmetic display.
 */
export function verifyPayUResponse(fields: PayUResponseFields, salt: string): boolean {
  const expected = generateResponseHash({
    key: fields.key,
    txnid: fields.txnid,
    amount: fields.amount,
    productinfo: fields.productinfo,
    firstname: fields.firstname,
    email: fields.email,
    status: fields.status,
    udf1: fields.udf1,
    udf2: fields.udf2,
    udf3: fields.udf3,
    udf4: fields.udf4,
    udf5: fields.udf5,
    salt,
  });
  return verifyHashConstantTime(expected, fields.hash);
}

export interface VerifyPaymentResult {
  txnid: string;
  status: string;
  amount: string;
  mihpayid: string;
  raw: Record<string, unknown>;
}

/**
 * Server-side reconciliation against PayU's own records (Phase 17 of the
 * task this was built from — "do not rely exclusively on the webhook or
 * browser redirect"). Uses the legacy postservice `verify_payment` command,
 * hashed as sha512(key|verify_payment|txnid|salt) per PayU's documented
 * command-API format.
 *
 * UNVERIFIED IN THIS ENVIRONMENT: no PayU test credentials exist here, so
 * this function's real network behavior against PayU's servers has not
 * been exercised — only its hash construction is unit-tested.
 */
export async function verifyPaymentWithPayU(txnid: string): Promise<VerifyPaymentResult> {
  const config = getPayUConfig();
  const hash = crypto
    .createHash('sha512')
    .update(`${config.merchantKey}|verify_payment|${txnid}|${config.salt}`)
    .digest('hex');

  const body = new URLSearchParams({
    key: config.merchantKey,
    command: 'verify_payment',
    var1: txnid,
    hash,
  });

  const response = await fetch(config.postserviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`PayU verify_payment request failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    status: number;
    transaction_details?: Record<string, { status?: string; amt?: string; mihpayid?: string }>;
  };

  const detail = json.transaction_details?.[txnid];
  if (!detail) {
    throw new Error('PayU verify_payment response did not include this transaction');
  }

  return {
    txnid,
    status: detail.status ?? 'unknown',
    amount: detail.amt ?? '0',
    mihpayid: detail.mihpayid ?? '',
    raw: json as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// Standing Instruction (recurring / auto-renewal) — UNVERIFIED, BLOCKED
// ---------------------------------------------------------------------------
//
// PayU's recurring-payments product is a materially different, separately-
// approved integration from a one-time hosted-checkout transaction: it
// requires the merchant account to have SI/recurring capability explicitly
// enabled by PayU, a mandate-registration ("Payment Consent Transaction")
// step with Additional Factor of Authentication, a pre_debit_SI
// notification API called ahead of each auto-charge, and a si_transaction
// API to actually collect the recurring charge. None of this can be
// exercised or verified in this environment (no PayU account access, no
// test credentials, no way to confirm SI is even enabled). The functions
// below implement the documented request/hash shape only, gated behind
// `siEnabled` from config, and must be treated as UNVERIFIED until tested
// against a real PayU account with SI capability confirmed. See
// docs/PAYMENT_GATEWAY.md's "Recurring billing" section.

export interface SIConsentRequestInput {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  billingCycle: 'MONTHLY';
  billingInterval: 1;
  /** ISO date the first (and each subsequent) charge should occur. */
  billingStartDate: string;
}

export interface SIConsentRequest {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  action: string;
  si: '1';
  billingCycle: string;
  billingInterval: number;
  billingAmount: string;
  billingCurrency: 'INR';
  billingStartDate: string;
  paymentStartDate: string;
  paymentEndDate: string;
  remarks: string;
}

/**
 * Builds the parameters for a Payment Consent Transaction (mandate
 * registration) — the first step of PayU SI. Throws if SI is not enabled
 * in config, since attempting this against a merchant account without SI
 * capability will simply fail at PayU's end with no useful diagnostic.
 */
export function buildSIConsentRequest(input: SIConsentRequestInput): SIConsentRequest {
  const config = getPayUConfig();
  if (!config.siEnabled) {
    throw new Error(
      'PayU Standing Instruction is not enabled (PAYU_SI_ENABLED=false or unset). ' +
        'This capability must be confirmed enabled on the PayU merchant account before use.'
    );
  }
  const hash = generatePaymentHash({
    key: config.merchantKey,
    txnid: input.txnid,
    amount: input.amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    salt: config.salt,
  });

  const startDate = new Date(input.billingStartDate);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 5); // PayU requires a bounded mandate window

  return {
    key: config.merchantKey,
    txnid: input.txnid,
    amount: input.amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    phone: input.phone,
    hash,
    action: config.checkoutUrl,
    si: '1',
    billingCycle: input.billingCycle,
    billingInterval: input.billingInterval,
    billingAmount: input.amount,
    billingCurrency: 'INR',
    billingStartDate: input.billingStartDate,
    paymentStartDate: input.billingStartDate,
    paymentEndDate: endDate.toISOString().slice(0, 10),
    remarks: input.productinfo,
  };
}

/**
 * Charges a previously-registered mandate for a renewal cycle via PayU's
 * si_transaction command. UNVERIFIED — see module header.
 */
export async function chargeSIRecurring(
  mandateTxnid: string,
  newTxnid: string,
  amount: string
): Promise<VerifyPaymentResult> {
  const config = getPayUConfig();
  if (!config.siEnabled) {
    throw new Error('PayU Standing Instruction is not enabled');
  }
  const hash = crypto
    .createHash('sha512')
    .update(`${config.merchantKey}|si_transaction|${mandateTxnid}|${config.salt}`)
    .digest('hex');

  const body = new URLSearchParams({
    key: config.merchantKey,
    command: 'si_transaction',
    var1: mandateTxnid,
    var2: newTxnid,
    var3: amount,
    hash,
  });

  const response = await fetch(config.postserviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`PayU si_transaction request failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return {
    txnid: newTxnid,
    status: String(json['status'] ?? 'unknown'),
    amount,
    mihpayid: String(json['mihpayid'] ?? ''),
    raw: json,
  };
}

/**
 * Cancels a registered SI mandate. UNVERIFIED — see module header.
 */
export async function cancelSIMandate(mandateTxnid: string): Promise<void> {
  const config = getPayUConfig();
  if (!config.siEnabled) {
    throw new Error('PayU Standing Instruction is not enabled');
  }
  const hash = crypto
    .createHash('sha512')
    .update(`${config.merchantKey}|cancel_si|${mandateTxnid}|${config.salt}`)
    .digest('hex');

  const body = new URLSearchParams({
    key: config.merchantKey,
    command: 'cancel_si',
    var1: mandateTxnid,
    hash,
  });

  const response = await fetch(config.postserviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`PayU cancel_si request failed: HTTP ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// Refund — UNVERIFIED, BLOCKED (see docs/PAYMENT_GATEWAY.md)
// ---------------------------------------------------------------------------

export async function refundPayment(mihpayid: string, amount: string, txnid: string): Promise<void> {
  const config = getPayUConfig();
  const hash = crypto
    .createHash('sha512')
    .update(`${config.merchantKey}|cancel_refund_transaction|${mihpayid}|${config.salt}`)
    .digest('hex');

  const body = new URLSearchParams({
    key: config.merchantKey,
    command: 'cancel_refund_transaction',
    var1: mihpayid,
    var2: txnid, // token/reference — kept for traceability, not resubmitted to PayU
    var3: amount,
    hash,
  });

  const response = await fetch(config.postserviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`PayU refund request failed: HTTP ${response.status}`);
  }
}
