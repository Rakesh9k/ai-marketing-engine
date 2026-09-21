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
  return expectedSignature === signature;
}

export function getRazorpayPlanId(plan: SubscriptionPlan): string {
  const planMap: Record<SubscriptionPlan, string> = {
    free: '',
    starter: config.RAZORPAY_STARTER_PLAN_ID || 'plan_starter',
    business: config.RAZORPAY_BUSINESS_PLAN_ID || 'plan_business',
    agency: config.RAZORPAY_AGENCY_PLAN_ID || 'plan_agency',
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
