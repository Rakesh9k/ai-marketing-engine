'use client';

import { initializePaddle, type CheckoutEventNames, type Paddle } from '@paddle/paddle-js';
import { getPaddleClientConfig } from './config';

/**
 * Lazy Paddle.js client.
 *
 * The environment and client token come ONLY from explicit configuration
 * (NEXT_PUBLIC_PADDLE_ENVIRONMENT / NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, validated in
 * ./config). Nothing defaults: a missing or inconsistent value throws
 * PaddleConfigError instead of quietly initialising against the wrong environment.
 * The server-side API key is never referenced here.
 */

let paddleInstance: Paddle | undefined;
let initPromise: Promise<Paddle> | undefined;
let activeCheckoutHandlers: { onClose?: () => void } = {};

async function ensurePaddle(): Promise<Paddle> {
  if (paddleInstance) return paddleInstance;
  if (typeof window === 'undefined') {
    throw new Error('Paddle.js can only be initialised in the browser');
  }

  if (!initPromise) {
    const { environment, token } = getPaddleClientConfig(); // throws if misconfigured
    initPromise = initializePaddle({
      environment,
      token,
      eventCallback: (event) => {
        if (event.name === ('checkout.closed' as CheckoutEventNames)) {
          activeCheckoutHandlers.onClose?.();
        }
      },
    }).then((instance) => {
      if (!instance) throw new Error('Paddle.js failed to initialise');
      paddleInstance = instance;
      return instance;
    });
    // Allow a retry after a transient load failure instead of caching the rejection.
    initPromise.catch(() => {
      initPromise = undefined;
    });
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// Price preview
// ---------------------------------------------------------------------------

/** price ID -> Paddle's presentation-ready formatted total (used verbatim). */
export type FormattedPrices = Record<string, string>;

/**
 * Asks Paddle for the localized price of each price ID.
 *
 * `countryCode` is optional: when absent the `address` parameter is OMITTED entirely and
 * Paddle detects the visitor's location from their IP. Callers must never pass a guessed
 * value (see sanitizeCountryCode).
 *
 * The returned strings are Paddle's `formattedTotals.total`, untouched: no arithmetic,
 * rounding, symbol handling or re-formatting happens here or anywhere downstream.
 */
export async function previewPrices(
  priceIds: string[],
  countryCode?: string
): Promise<FormattedPrices> {
  if (priceIds.length === 0) return {};
  const paddle = await ensurePaddle();

  const response = await paddle.PricePreview({
    items: priceIds.map((priceId) => ({ priceId, quantity: 1 })),
    ...(countryCode ? { address: { countryCode } } : {}),
  });

  const prices: FormattedPrices = {};
  for (const line of response.data.details.lineItems) {
    prices[line.price.id] = line.formattedTotals.total;
  }
  return prices;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface OpenCheckoutOptions {
  /**
   * Paddle transaction created server-side by `createPaddleCheckout`. It already contains the
   * exact price ID, the customer (so the email is pre-filled) and the Mitra user in
   * custom_data, so the webhook can attribute the payment.
   */
  transactionId: string;
  /** Where Paddle sends the customer after a successful payment. */
  successUrl: string;
  /** Called when the overlay closes (paid or not). */
  onClose?: () => void;
}

/**
 * Opens Paddle Checkout as a one-page overlay for an already-created transaction.
 * Entitlements are NOT granted here — only the signed Paddle webhook does that.
 */
export async function openPaddleCheckout(options: OpenCheckoutOptions): Promise<void> {
  const paddle = await ensurePaddle();
  activeCheckoutHandlers = { onClose: options.onClose };

  paddle.Checkout.open({
    transactionId: options.transactionId,
    settings: {
      displayMode: 'overlay',
      variant: 'one-page',
      theme: 'light',
      allowLogout: false,
      successUrl: options.successUrl,
    },
  });
}

/** Programmatically closes the overlay (error recovery). */
export async function closePaddleCheckout(): Promise<void> {
  const paddle = await ensurePaddle();
  paddle.Checkout.close();
}
