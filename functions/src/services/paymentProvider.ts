import type { SubscriptionPlan } from '../config/pricing';

export type BillingCycle = 'monthly' | 'yearly';
export type PaidPlan = Exclude<SubscriptionPlan, 'free'>;

export interface CreateCheckoutInput {
  userId: string;
  userEmail: string;
  userName?: string;
  userPhone?: string;
  item:
    | { kind: 'subscription'; planId: PaidPlan; billingCycle: BillingCycle; priceINR: number }
    | { kind: 'credit_pack'; credits: number; priceINR: number };
  returnUrl?: string;
}

export interface CreateCheckoutResult {
  orderId: string;
  paymentSessionId: string;
  environment: 'sandbox' | 'production';
  amountINR: number;
  currency: 'INR';
  checkoutUrl?: string;
}

export interface PaymentProvider {
  name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean }>;
  refundPayment(paymentId: string, amountINR: number, reason?: string): Promise<{ refundId: string; status: string }>;
}
