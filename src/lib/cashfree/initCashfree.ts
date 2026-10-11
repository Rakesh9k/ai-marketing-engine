'use client';

export type CashfreeMode = 'sandbox' | 'production';

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  environment?: CashfreeMode;
  returnUrl?: string;
  redirectTarget?: '_self' | '_blank' | '_top' | 'popup';
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: CashfreeMode }) => {
      checkout: (options: {
        paymentSessionId: string;
        returnUrl?: string;
        redirectTarget?: string;
      }) => Promise<{ error?: { message: string }; redirect?: boolean }>;
    };
  }
}

let loadPromise: Promise<void> | undefined;

function loadCashfreeScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cashfree JS SDK can only be loaded in the browser'));
  }
  if (window.Cashfree) {
    return Promise.resolve();
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = undefined;
      reject(new Error('Failed to load Cashfree JS SDK script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function openCashfreeCheckout(options: CashfreeCheckoutOptions): Promise<void> {
  await loadCashfreeScript();

  if (!window.Cashfree) {
    throw new Error('Cashfree SDK is unavailable after loading');
  }

  const mode: CashfreeMode =
    options.environment ||
    (process.env['NEXT_PUBLIC_CASHFREE_ENVIRONMENT'] === 'production' ? 'production' : 'sandbox');

  const cashfree = window.Cashfree({ mode });

  const result = await cashfree.checkout({
    paymentSessionId: options.paymentSessionId,
    redirectTarget: options.redirectTarget || '_self',
    ...(options.returnUrl ? { returnUrl: options.returnUrl } : {}),
  });

  if (result?.error) {
    throw new Error(result.error.message || 'Cashfree checkout failed');
  }
}
