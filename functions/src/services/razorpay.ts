import Razorpay from 'razorpay';
import { getEnvConfig } from '../config/env';
import type { SubscriptionPlan } from '../config/pricing';
import { PRICING } from '../config/pricing';

const config = getEnvConfig();

export function getRazorpayClient(): Razorpay {
  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: config.RAZORPAY_KEY_ID,
    key_secret: config.RAZORPAY_KEY_SECRET,
  });
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
  // Plain === leaks timing information proportional to how many leading
  // bytes of an attacker-supplied signature happen to match the real one —
  // a real (if low-severity, given HMAC-SHA256's keyspace) side channel on
  // a payment-webhook auth boundary. crypto.timingSafeEqual requires equal-
  // length buffers or it throws, so the length check must happen first;
  // that leaks only the expected signature's fixed, publicly-known length
  // (hex-encoded SHA-256 is always 64 chars), not any of its content.
  const expected = Buffer.from(expectedSignature, 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

export function getRazorpayPlanId(plan: SubscriptionPlan): string {
  const planMap: Record<SubscriptionPlan, string> = {
    free: '',
    starter: config.RAZORPAY_STARTER_PLAN_ID || 'plan_starter',
    business: config.RAZORPAY_BUSINESS_PLAN_ID || 'plan_business',
    agency: config.RAZORPAY_AGENCY_PLAN_ID || 'plan_agency',
    pro: '', // Razorpay never sold a Pro plan (added to SubscriptionPlan later); no plan ID, like 'free'.
  };
  return planMap[plan];
}

export function getPlanCredits(plan: SubscriptionPlan): number {
  return PRICING.subscriptionTiers[plan].monthlyCredits;
}

export function getPlanPrice(plan: SubscriptionPlan): number {
  return PRICING.subscriptionTiers[plan].priceINR;
}

export interface CreateSubscriptionInput {
  userId: string;
  planId: SubscriptionPlan;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  razorpaySubscriptionId: string;
  razorpayCustomerId: string;
  shortUrl: string;
}

export async function createRazorpaySubscription(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  const client = getRazorpayClient();
  const planId = getRazorpayPlanId(input.planId);

  if (!planId) {
    throw new Error(`No Razorpay plan ID for plan: ${input.planId}`);
  }

  // Create customer
  const customer = await client.customers.create({
    email: input.customerEmail,
    name: input.customerName,
    contact: input.customerPhone,
    fail_existing: 0,
  });

  // Create subscription - use type assertion for the request body
  const subscription = await client.subscriptions.create({
    plan_id: planId,
    customer_id: customer.id,
    total_count: 12,
    quantity: 1,
    start_at: Math.floor(Date.now() / 1000),
    addons: [],
    notes: {
      userId: input.userId,
      planId: input.planId,
    },
  } as any);

  return {
    subscriptionId: subscription.id,
    razorpaySubscriptionId: subscription.id,
    razorpayCustomerId: customer.id,
    shortUrl: subscription.short_url || '',
  };
}

export interface CreatePaymentInput {
  userId: string;
  planId: SubscriptionPlan;
  amount: number; // in paise
  currency: 'INR';
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CreatePaymentResult {
  orderId: string;
  amount: number;
  currency: 'INR';
}

export async function createRazorpayOrder(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const client = getRazorpayClient();

  const order = await client.orders.create({
    amount: input.amount,
    currency: input.currency,
    receipt: `order_${input.userId}_${Date.now()}`,
    notes: {
      userId: input.userId,
      planId: input.planId,
    },
  } as any);

  return {
    orderId: order.id,
    amount: typeof order.amount === 'number' ? order.amount : parseInt(order.amount as string, 10),
    currency: order.currency as 'INR',
  };
}

export function calculateCreditsToGrant(plan: SubscriptionPlan): number {
  return PRICING.subscriptionTiers[plan].monthlyCredits;
}

/**
 * Cancels a Razorpay subscription. `cancelAtCycleEnd: true` (the default)
 * stops future renewal/billing but leaves the current, already-paid period
 * active — this is the technical implementation of "cancel" and makes no
 * refund/proration claim (no refund policy has been decided; see
 * docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md). The subscription's Firestore
 * status/canceledAt fields are updated when Razorpay's own
 * `subscription.cancelled` webhook event fires (immediately for a
 * non-cycle-end cancel, or at period end for a cycle-end cancel).
 */
export async function cancelRazorpaySubscription(
  razorpaySubscriptionId: string,
  cancelAtCycleEnd = true
): Promise<void> {
  const client = getRazorpayClient();
  await client.subscriptions.cancel(razorpaySubscriptionId, cancelAtCycleEnd);
}
