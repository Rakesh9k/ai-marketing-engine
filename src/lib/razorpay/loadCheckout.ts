/**
 * Phase 19A — loads Razorpay's Checkout.js exactly once, on demand.
 *
 * Deliberately not loaded globally (e.g. from the root layout): per
 * Phase 17/19's "don't load unnecessary product infrastructure on pages
 * that don't need it" principle, only the billing page — the one place
 * that actually opens a Razorpay checkout — pulls this in, and only when
 * a purchase is actually attempted.
 */

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { email?: string; contact?: string; name?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<void> | null = null;

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay Checkout can only be loaded in the browser'));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Razorpay Checkout'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Razorpay Checkout'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
