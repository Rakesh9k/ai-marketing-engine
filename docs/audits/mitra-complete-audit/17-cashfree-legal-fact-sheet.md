# 17 — Cashfree / fixed-term prepaid access: fact sheet and change checklist for your legal adviser

**Purpose:** give an India-qualified adviser the *facts of the integration* and the exact places in the product that state something about payments. **This is not legal wording and nothing here has been published.** Items marked **[CONFIRM]** are not known to engineering and must come from you or the Cashfree agreement. Companion to `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` (which already lists entity name, GSTIN, governing law, refund policy, credit expiry and retention as open).

## A. What the product does (verified in code and tests, 2026-10-11)
| Topic | Fact | Evidence |
|---|---|---|
| Who takes the payment | A Cashfree Payments order is created by our server for the exact INR price from our price table; the customer pays on Cashfree's hosted page (redirect checkout); we receive a signed webhook | `createCashfreeCheckout`, `cashfreeWebhook`, `initCashfree.ts` |
| What we store about payment | Order id, Cashfree payment id, amount (credits/plan), status, timestamps, user id. **We do not receive or store card/bank details** (Cashfree's page collects them) | `transactions/*`, `cashfree_grants/*` |
| Products | Plans: Starter, Business, Pro, Agency (Free needs no payment). Credit packs: 500 / 1,200 / 3,000 credits (₹499 / ₹999 / ₹1,999) | `functions/src/config/pricing.ts` |
| Plan term | **Monthly = 30 days. Yearly = 365 days**, from payment confirmation. **Prepaid. No automatic renewal or charge** (no mandate/standing instruction exists) | `services/prepaidTerm.ts` |
| Renewal | Customer buys again. Same plan + same billing period while live **adds the new term after the current end date**. A different plan/period while a term is live is refused until it ends. No proration | `decidePurchase`, tests |
| Expiry | Access ends at the paid-through date, enforced by the server where credits are spent (not only by a daily job). Afterwards the customer is on Free (140 credits/month, 1 campaign/month). Unused plan credits do not carry over; **top-up pack credits are kept for the calendar month they were bought in** (they live on that month's usage record) | `reconcileLapsedPlan`, `expireEndedSubscriptions` |
| Credits | Monthly allowance per plan while the term is live (yearly = a fresh monthly allowance each calendar month). Campaign = 100 credits. Credits have no cash value | `pricing.ts` |
| Refunds / chargebacks | **Not automated.** A refund or dispute event from Cashfree is recorded for manual review; **it does not change access or credits automatically** | `cashfree_refunds` |
| Failed / abandoned payment | Nothing is granted unless the signed webhook confirms status SUCCESS, INR and the exact price; a short payment is flagged and grants nothing | `cashfreeWebhook` |
| Paid order that can't be applied | If a live term on another plan/provider exists when a paid order arrives, it is flagged `needsManualReview` (customer paid, not served) | `cashfree_grants` |
| Customer-visible dates | Billing page shows "Access until <date>", a Renew button, and (after the webhook) "Payment confirmed… active until <date>" | `src/app/billing/page.tsx` |

## B. Facts engineering cannot supply **[CONFIRM]**
1. **Seller identity**: exact legal entity name, registered address, CIN/LLPIN/PAN/GSTIN, contact/grievance officer (already open in the founder decisions log).
2. **Cashfree arrangement**: merchant account holder, settlement account, whether Cashfree acts only as a payment aggregator/gateway (we believe so), settlement timing, fees, **who issues the invoice/receipt to the customer** and GST treatment (price shown is assumed GST-inclusive/exclusive? **unknown**; the price table has no tax line).
3. **Refund policy**: eligibility window, full/partial, effect on access and on credits already spent, who processes it (we would, via Cashfree), expected timelines, chargeback handling.
4. **Credit policy**: expiry of unused monthly credits (current behaviour: monthly allowance resets; top-ups last the calendar month) — confirm this is the intended promise.
5. **Failed-payment and dispute process** and support SLA.
6. **Data**: retention periods for transaction records (tax/accounting law), Cashfree as a data processor (what is shared: name, email, phone — we pass `customer_details`; **when the user has no phone on file the code sends a placeholder number (9999999999) because Cashfree requires one**; confirm that is acceptable or collect a real number), cross-border transfer position.
7. **Auto-renewal in future**: if offered later it needs its own consent flow, mandates and notices; out of scope for launch.

## C. Where the product currently says something about payment (to be reviewed/changed)
**Changed by engineering to match the decided model (product guidance, not legal text):** pricing page (term price, "one-time payment, does not renew automatically", FAQ, "Cashfree Payments"), billing page, Help FAQ, Support item.
**NOT changed — needs adviser-approved wording (tracked as `it.todo` in `src/app/billingCopy.test.tsx`):**
| Page | What it says today | Problem under the new model |
|---|---|---|
| `src/app/terms/page.tsx` (≈ lines 110–145) | "Our order process is conducted by our online reseller Paddle.com … Merchant of Record … Paddle provides customer service and handles returns … Paddle issues the invoice"; "Paid plans renew automatically …"; "You can cancel your subscription … Cancelling stops future renewal" | Wrong seller/processor; wrong renewal; cancellation concept no longer applies |
| `src/app/refund/page.tsx` | "Paddle.com is the Merchant of Record … handles returns and refund processing … Applicable law and Paddle's terms take precedence"; "Subscription renewals: generally not refundable" | Refunds would be handled by BrainWise via Cashfree; "renewals" no longer exist |
| `src/app/cancellation/page.tsx` | "Paid Mitra plans renew automatically … choose Cancel subscription … stops the next renewal" | Nothing recurs; the Cancel button was removed; page needs to describe expiry/renewal |
| `src/app/privacy/page.tsx` (≈ lines 106, 148) | Paddle listed as Merchant of Record / recipient of payment data | Cashfree is the processor; list and purposes change |
| Checkout/receipt wording | The Cashfree page is Cashfree's; our confirmation email/receipt does not exist yet | Decide who sends invoices (see B2) |
| `src/app/welcome/page.tsx` comment | Paddle success URL (code comment only) | None for customers |

## D. Change checklist (suggested order)
- [ ] Confirm B1–B6 from the Cashfree agreement/account and your accountant.
- [ ] Decide refund/dispute rules (B3) and credit policy (B4); engineering will implement exactly that (today: manual review only).
- [ ] Adviser drafts/approves Terms, Refund, Cancellation, Privacy; update checkout disclosure and invoices consistently.
- [ ] Engineering updates the pages verbatim, re-points the `it.todo` markers to real assertions, and re-verifies the pricing/billing pages against the approved text.
- [ ] Publish legal pages **before** (or together with) switching production billing to Cashfree. Do not leave Paddle/Merchant-of-Record wording live after cutover.

## E. Suggested product disclosures (facts only, for the adviser to word)
At checkout: plan, term (30/365 days), total payable in ₹ (and tax treatment), "one-time payment, does not renew automatically", the access end date, and where to renew. In the confirmation: result of payment and the access end date (implemented). In the dashboard: plan, end date, Renew (implemented).
