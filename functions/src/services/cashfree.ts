import crypto from 'crypto';
import { getEnvConfig } from '../config/env';
import type { SubscriptionPlan } from '../config/pricing';
import { cashfreeCustomerPhone } from './customerPhone';
import type { CreateCheckoutInput, CreateCheckoutResult, BillingCycle } from './paymentProvider';

export type CashfreeEnvironment = 'sandbox' | 'production';

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  webhookSecret: string;
  environment: CashfreeEnvironment;
  apiVersion: string;
  baseUrl: string;
}

/**
 * The ONE Cashfree API version this integration was written and tested against (see
 * docs/audits/mitra-complete-audit/21-cashfree-api-version-decision.md). It is pinned in code: configuration may
 * restate it but can never silently change it. Moving to another version is a deliberate change that needs a new
 * compatibility check, a matching webhook version in the Cashfree dashboard, and updated tests.
 */
export const CASHFREE_API_VERSION = '2023-08-01';

export function getCashfreeConfig(): CashfreeConfig {
  const env = getEnvConfig();
  const appId = env.CASHFREE_APP_ID;
  const secretKey = env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    throw new Error(
      'Cashfree credentials not configured (CASHFREE_APP_ID or CASHFREE_SECRET_KEY missing)'
    );
  }

  if (env.CASHFREE_API_VERSION && env.CASHFREE_API_VERSION !== CASHFREE_API_VERSION) {
    throw new Error(
      `CASHFREE_API_VERSION=${env.CASHFREE_API_VERSION} does not match the pinned version ${CASHFREE_API_VERSION}; change the pin in code deliberately instead`
    );
  }

  const environment: CashfreeEnvironment =
    env.CASHFREE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  const baseUrl =
    environment === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

  return {
    appId,
    secretKey,
    webhookSecret: env.CASHFREE_WEBHOOK_SECRET || secretKey,
    environment,
    apiVersion: CASHFREE_API_VERSION,
    baseUrl,
  };
}

/**
 * Verifies a Cashfree webhook's HMAC-SHA256 signature over (x-webhook-timestamp + rawBody).
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secretKey?: string
): boolean {
  if (!signature || !timestamp || !rawBody) {
    return false;
  }

  const key = secretKey || getCashfreeConfig().webhookSecret;
  const signedPayload = timestamp + rawBody;
  const expectedSignature = crypto.createHmac('sha256', key).update(signedPayload).digest('base64');

  // timingSafeEqual throws a RangeError on unequal lengths, which the webhook handler would
  // turn into a 500 (and a provider retry). A wrong-length signature is simply invalid.
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(received, expected);
}

/**
 * Creates a Cashfree payment order via Cashfree PG API.
 */
export async function createCashfreeOrder(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const config = getCashfreeConfig();
  const orderId = `mitra_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const description =
    input.item.kind === 'subscription'
      ? `Mitra ${input.item.planId.toUpperCase()} Plan (${input.item.billingCycle})`
      : `Mitra ${input.item.credits.toLocaleString('en-IN')} Top-up Credits`;

  // Cashfree requires the customer's real 10-digit mobile number. Nothing is substituted: a missing or invalid
  // number is an error, never a placeholder (see services/customerPhone.ts).
  const phone = cashfreeCustomerPhone(input.userPhone);
  if (!phone) {
    throw new Error('A valid customer mobile number is required to create a Cashfree order');
  }

  // Return URL for browser redirect
  const appUrl = getEnvConfig().APP_URL || 'https://mitra-ai.web.app';
  const defaultReturnUrl = `${appUrl}/billing?cashfree_order_id={order_id}`;
  const returnUrl = input.returnUrl || defaultReturnUrl;

  const payload = {
    order_id: orderId,
    order_amount: input.item.priceINR,
    order_currency: 'INR',
    customer_details: {
      customer_id: input.userId,
      customer_email: input.userEmail,
      customer_phone: phone,
      customer_name: input.userName || 'Valued Customer',
    },
    order_meta: {
      return_url: returnUrl,
    },
    order_note: description,
    order_tags: {
      firebaseUid: input.userId,
      kind: input.item.kind,
      planId: input.item.kind === 'subscription' ? input.item.planId : '',
      billingCycle: input.item.kind === 'subscription' ? input.item.billingCycle : '',
      credits: input.item.kind === 'credit_pack' ? String(input.item.credits) : '',
    },
  };

  const response = await fetch(`${config.baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'x-client-id': config.appId,
      'x-client-secret': config.secretKey,
      'x-api-version': config.apiVersion,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cashfree order creation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    order_id: string;
    payment_session_id: string;
    order_status: string;
    payments?: { url?: string };
  };

  return {
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    environment: config.environment,
    amountINR: input.item.priceINR,
    currency: 'INR',
  };
}

/**
 * Fetches order details directly from Cashfree server-to-server for verification.
 */
export async function getCashfreeOrderStatus(orderId: string): Promise<{
  orderId: string;
  orderStatus: string;
  orderAmount: number;
  orderCurrency: string;
  paymentSessionId: string;
}> {
  const config = getCashfreeConfig();
  const response = await fetch(`${config.baseUrl}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'x-client-id': config.appId,
      'x-client-secret': config.secretKey,
      'x-api-version': config.apiVersion,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cashfree order status fetch failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    order_id: string;
    order_status: string;
    order_amount: number;
    order_currency: string;
    payment_session_id: string;
  };

  return {
    orderId: data.order_id,
    orderStatus: data.order_status,
    orderAmount: data.order_amount,
    orderCurrency: data.order_currency,
    paymentSessionId: data.payment_session_id,
  };
}

/**
 * Initiates a refund for a Cashfree order/payment.
 */
export async function refundCashfreePayment(
  orderId: string,
  amountINR: number,
  refundReason?: string
): Promise<{ refundId: string; status: string }> {
  const config = getCashfreeConfig();
  const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const payload = {
    refund_id: refundId,
    refund_amount: amountINR,
    refund_note: refundReason || 'Requested refund',
  };

  const response = await fetch(`${config.baseUrl}/orders/${orderId}/refunds`, {
    method: 'POST',
    headers: {
      'x-client-id': config.appId,
      'x-client-secret': config.secretKey,
      'x-api-version': config.apiVersion,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cashfree refund failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    refund_id: string;
    refund_status: string;
  };

  return {
    refundId: data.refund_id,
    status: data.refund_status,
  };
}

export function describeCashfreePurchase(
  kind: 'subscription' | 'credit_pack',
  planId?: SubscriptionPlan,
  cycle?: BillingCycle,
  credits?: number
): string {
  if (kind === 'subscription' && planId) {
    const name = planId.charAt(0).toUpperCase() + planId.slice(1);
    return `Mitra ${name} Plan (${cycle || 'monthly'}) — Cashfree Subscription`;
  }
  if (kind === 'credit_pack' && credits) {
    return `${credits.toLocaleString('en-IN')} credit top-up pack — Cashfree`;
  }
  return 'Mitra Payment — Cashfree';
}

/**
 * The browser return URL after payment must be one of our own origins (APP_URL, the production domains, or
 * localhost in development/emulator), so a crafted checkout request cannot bounce a payer to another site.
 */
export function isAllowedReturnUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.replace('{order_id}', 'x'));
  } catch {
    return false;
  }
  const env = getEnvConfig();
  const allowed = new Set<string>(['https://brain-wise.com', 'https://www.brain-wise.com']);
  if (env.APP_URL) {
    try {
      allowed.add(new URL(env.APP_URL).origin);
    } catch {
      /* ignore a malformed APP_URL */
    }
  }
  if (env.NODE_ENV !== 'production' || env.FUNCTIONS_EMULATOR) {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }
  return allowed.has(parsed.origin);
}
