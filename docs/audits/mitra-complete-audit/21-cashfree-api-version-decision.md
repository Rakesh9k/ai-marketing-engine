# 21 — Cashfree API version: compatibility comparison and decision

Date: 2026-10-12. Sources: Cashfree's public API reference and release notes (read from cashfree.com/docs; no sandbox account, no live call).

## Decision
**Pin `2023-08-01`** in code (`CASHFREE_API_VERSION` in `services/cashfree.ts`). Do not move to `2026-01-01` for launch.

Why: every request shape, webhook fixture, test and document in this repository was written against `2023-08-01`; Cashfree's docs list no change we need; and an upgrade is a behaviour change that should not ride along with the production cutover. The pin is enforced: the `CASHFREE_API_VERSION` setting may restate it, but any other value makes the integration refuse to start (tested), so the version cannot drift silently through configuration. A test asserts every order, order-status and refund request sends `x-api-version: 2023-08-01`.

## What the comparison found
| Area | What we use | 2026-01-01 per Cashfree | Impact |
|---|---|---|---|
| Create Order | `order_id`, `order_amount`, `order_currency`, `customer_details` (incl. required 10-character `customer_phone`), `order_meta.return_url`, `order_tags` | "Removed field on Create Order": the BBPS fields (`bbps` object); two new optional `order_meta` fields. `customer_phone` rule is the same in both versions. | None for us (we send no BBPS data). No benefit needed. |
| Get Order / Refund create | `GET /orders/{id}`, `POST /orders/{id}/refunds` | No change found in what was read | Not verified field-by-field |
| Settlement endpoints | not used | breaking response changes | None |
| Subscription API | not used (prepaid orders only; Paddle/Cashfree subscriptions are not created) | request body restructured | None |
| Webhooks | `PAYMENT_*`, `REFUND_STATUS_WEBHOOK`, `DISPUTE_*`, signature = HMAC-SHA256 over timestamp + raw body | No webhook change surfaced in the release notes; **not confirmed** | Webhook version is a separate dashboard setting |

**Limits of this comparison:** Cashfree publishes no field-by-field migration guide that I could find. The "removed" and "new" field names come from release-note snippets, and the Create Order reference page and the release notes disagreed about `bbps`. Treat this as sufficient to justify *staying put*, not as proof that `2026-01-01` is a drop-in replacement. If a future version is wanted, repeat the comparison against the full changelog first.

## Actions still needed (yours, in the Cashfree dashboard) before the sandbox journey
1. Set the sandbox webhook version to the one that matches `2023-08-01`-era payloads, then confirm the delivered payload shapes (below).
2. Store sandbox credentials as server secrets only (`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`); never in source or the frontend bundle.
3. Register the sandbox webhook URL and check signature verification with a real delivery.

## Sandbox checklist (emulator tests do not count)
- [ ] Sandbox credentials stored as server-side secrets
- [x] API version chosen explicitly and pinned (`2023-08-01`, tested)
- [ ] Matching sandbox webhook registered; signature verification confirmed on a real delivery
- [ ] Checkout, payment failure, duplicate event, renewal and expiry journey passed
- [ ] Real sandbox refund payload replayed, including duplicate and out-of-order events; stored result compared with doc 20
- [ ] Real sandbox dispute payload replayed and reviewed
- [ ] First-purchase phone prompt and repeat-purchase flow verified

(Status: 1 of 7 done, in code; the other 6 need a real sandbox.)

## Billing-review access
`getBillingReview` requires the verified `role: admin` custom claim, and every call is logged and written to `billing_audit` (`review_accessed`, with the caller and the number of items). Before inviting paying customers: confirm who holds the admin claim (granted out-of-band by an operator with Admin SDK credentials) and that the list is as short as intended. A missing queue item is not proof of reconciliation; monitor webhook processing errors separately.
