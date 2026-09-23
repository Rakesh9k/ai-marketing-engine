/**
 * PayU Hosted Checkout is a full-page form-POST redirect, not an in-page
 * JS widget (unlike Razorpay's Checkout.js) — the browser navigates away
 * to PayU's own page, then PayU POSTs the result back to Mitra's
 * surl/furl. No script loading is needed; this just builds and submits a
 * real HTML form with the exact fields the backend (createPayUPayment)
 * computed, including the server-generated hash. The salt itself is never
 * present here — only the backend ever sees it.
 */
export interface PayUCheckoutParams {
  action: string;
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1: string;
  udf2: string;
  hash: string;
}

export function submitPayUCheckout(params: PayUCheckoutParams): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = params.action;
  form.style.display = 'none';

  const fields: Record<string, string> = {
    key: params.key,
    txnid: params.txnid,
    amount: params.amount,
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
    phone: params.phone,
    surl: params.surl,
    furl: params.furl,
    udf1: params.udf1,
    udf2: params.udf2,
    hash: params.hash,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
