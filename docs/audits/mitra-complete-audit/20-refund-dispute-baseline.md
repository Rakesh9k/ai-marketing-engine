# 20 — Refund and dispute handling: engineering baseline

Status: implemented and tested locally (emulators). **Not deployed. Not legally approved.** The customer-facing refund policy still needs the legal adviser; nothing here is a promise to customers. Payload shapes were read from Cashfree's webhook documentation on 2026-10-12 and are **not yet confirmed against real sandbox deliveries** (step 4 of the sandbox journey must replay one of each).

## Rules as implemented

| Situation | Handling | Where |
|---|---|---|
| Payment fails | No access or credits granted | `cashfreeWebhook.ts` (unchanged) |
| Duplicate payment webhook | Applied once (`cashfree_grants` ledger) | unchanged |
| Customer requests a refund | `requestRefund` records ONE request per order (idempotent), owner-only; **changes nothing else** | `requestRefund.ts`, `refund_requests/{orderId}` |
| Refund succeeded (Cashfree `REFUND_STATUS_WEBHOOK`, `refund_status = SUCCESS`) | Adjustment applied **exactly once**, only for a **full** refund (below) | `services/cashfreeRefunds.ts` |
| Partial refund | Recorded and flagged `needsManualReview`; nothing changed. When later refunds bring the total to the full amount, the adjustment is applied once | same |
| Refund PENDING / CANCELLED / other | Recorded only; a late non-success delivery can never undo a SUCCESS | same |
| Dispute / chargeback (`DISPUTE_CREATED/UPDATED/CLOSED`) | Order marked `disputed`, user `billingReview.open`, dispute stored in `cashfree_disputes`. **No credits or access changed, nothing deleted**, even when the dispute is lost (it is surfaced as `lost_dispute`) | same |
| Paid but access could not be applied | Stays in `cashfree_grants` with `needsManualReview` and is listed until a refund (or a person) resolves it | `billingReview.ts` |
| Term expires | Unchanged: paid benefits stop at the end date; a new purchase is allowed | `expireSubscriptions.ts` |

### The adjustment for a full refund
* **Credit pack:** the pack's credits that are still **unspent** are removed (`min(pack, allowance − used)`, never below zero, never more than the pack). Credits already used for generated campaigns are **never** clawed back; the audit entry records how many were kept because they were spent.
* **Subscription:** the days that order bought (30 monthly / 365 yearly) are taken off the paid-through date. If nothing paid remains, the term ends now (`status: refunded`) and the account's usage plan drops to Free (used credits and top-up credits are kept). Refunding one of several stacked renewals only shortens by that order's days.
* Each reversal is guarded by the refund record (`counted`) and the order's grant (`reversedAt`), so repeated deliveries, or a second refund id for the same order, cannot reverse twice.

## Audit and reconciliation
* `billing_audit/{deterministic id}`: append-only entries for refund status changes, applied/needs-review adjustments, disputes (one per distinct status+time) and refund requests. Repeated events do not duplicate entries. Server-only (no client rules).
* `cashfree_refunds`, `cashfree_disputes`, `refund_requests`, `cashfree_grants`: the ledgers. `getBillingReview` (admin custom claim only, read-only) lists every item that needs a person: unapplied payments, refunds needing review, open/lost disputes, open refund requests.

## What this deliberately does NOT do
* It does not issue refunds. A person issues them in the Cashfree dashboard after checking the policy; the webhook then applies the adjustment.
* It does not decide anything about a campaign already generated: spent credits stay spent. Whether to refund money for a consumed campaign is a policy decision for the legal adviser and you.
* It does not touch Paddle (inert).

## Open items before real payments
1. Legal review of the refund / cancellation / dispute wording; the rules above are a baseline.
2. Replay a real sandbox refund and dispute delivery to confirm field names (`data.refund.order_id`, `data.dispute`, `data.order_details`) and the full list of `refund_status` values (the docs show only `SUCCESS` explicitly).
3. Decide who monitors `getBillingReview`, and how fast disputes must be answered (Cashfree gives a `respond_by` deadline, stored as `respondBy`).
4. Chargeback fees and Cashfree refund charges are not modelled.
