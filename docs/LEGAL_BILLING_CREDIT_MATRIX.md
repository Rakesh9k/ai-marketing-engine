# Legal Billing / Credit Matrix

Generated 2026-09-22 as part of the legal/compliance remediation pass. Traces every transition in
the billing/credit lifecycle to its code location, database document, server authority, failure
behavior, idempotency, and — the point of this document — which parts are a settled *technical*
behavior versus which parts still depend on an undecided *legal/policy* choice (see
`docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md`).

| Transition | Code location | Database doc | Server-authoritative? | Failure behavior | Idempotent? | Legal/policy dependency |
|---|---|---|---|---|---|---|
| Plan selection → Razorpay order/subscription creation | `functions/src/functions/subscriptions/createSubscription.ts` | `subscriptions/{subscriptionId}` (`status: 'incomplete'`) | Yes — plan price/credits from `functions/src/config/pricing.ts`, never client-supplied | Throws `HttpsError`; no partial subscription doc left in a billable state | Rate-limited (5/hr); not separately idempotency-keyed beyond Razorpay's own customer/subscription creation | None — pure technical flow |
| Payment → client-side verification | `functions/src/functions/subscriptions/verifyPayment.ts` | Updates `subscriptions/{id}.status` only | Yes — re-fetches payment status from Razorpay server-side before trusting it (does not trust the client's "success" callback) | Rejects if Razorpay reports the payment as not captured; subscription status left unchanged | Yes — re-verifying an already-captured payment is a no-op | None |
| Payment → credit grant (authoritative) | `functions/src/functions/webhooks/razorpayWebhook.ts` (`handlePaymentCaptured` / `handleSubscriptionCharged`) | `subscriptions/{id}`, `usage/{usageId}`, `transactions/{id}` | Yes — HMAC signature verified against the raw webhook body; this is the *only* path that actually grants credits | Signature/body failures return 400 before any write; a processing exception is caught per-event | Yes — proven under concurrent duplicate delivery via `processed_webhook_events/{eventId}` claim transaction (real Firestore-emulator test, not mocked) | None — this is the settled source of truth for "did the customer pay" |
| Subscription cancellation (self-service, added this pass) | `functions/src/functions/subscriptions/cancelSubscription.ts` | `subscriptions/{id}.cancelAtPeriodEnd` | Yes — resolves the caller's own subscription via their own user doc, never a client-supplied subscription ID | Rejects Free-plan cancel, missing-subscription, and double-cancel (returns `alreadyCanceled: true` instead of erroring) | Yes — second call is a no-op, verified by test | **Yes**: what happens to unused credits after the period ends is not decided (see founder-decisions doc); this function does not touch credits at all, only the renewal flag |
| Subscription cancellation → authoritative status flip | `functions/src/functions/webhooks/razorpayWebhook.ts` (`handleSubscriptionCancelled`) | `subscriptions/{id}.status`, `.canceledAt` | Yes — driven by Razorpay's own webhook event, not the cancel callable | N/A (webhook-driven) | Idempotent (same claim-transaction mechanism as payment webhooks) | None |
| Credit reservation for AI generation | `functions/src/services/usageControl.ts` (`reserveCreditsForOperation`) | `transactions/{operationId}`, `usage/{usageId}.creditsUsed` | Yes — cost from server-side `getGenerationCost()`, never client-supplied | Throws before any AI call if insufficient credits | Yes — idempotency check performed inside the same Firestore transaction as the reservation write (fixed a previously-real double-reservation bug under concurrency) | None — settled technical behavior |
| AI generation failure → credit refund | `functions/src/services/usageControl.ts` (`refundReservation`, called from `executeWithUsageControl`'s catch) | `transactions/{operationId}`, `usage/{usageId}.creditsUsed` | Yes | Refund is unconditional on any thrown error from the AI pipeline | Yes | None — this is a technical "we didn't deliver, give the credits back" behavior, not a monetary refund; see `/refund` page §3 for the distinction stated to customers |
| Refund of an actual payment (money back to the customer) | **Not implemented** — no Razorpay refund API call anywhere in the codebase | N/A | N/A | N/A | N/A | **Yes — fully founder-decision-gated.** No eligibility rule, time window, or partial/full policy exists. `/refund` page states this honestly. |
| Chargeback / dispute handling | **Not implemented** — `razorpayWebhook.ts`'s event switch has no case for `refund.created`, `refund.processed`, or `payment.dispute.*`; these fall through to an unhandled-event log line | N/A | N/A | Silently logged, no credit clawback | N/A | **Yes** — a disputed/refunded payment currently leaves granted credits in place indefinitely; whether/how to claw back credits is undecided |
| Account deletion → billing records | `functions/src/functions/auth/requestAccountDeletion.ts` | Deletes the Auth user; archives `businesses/*`; does **not** touch `transactions/*` | Yes | N/A | Yes (deleting an already-deleted user throws a clear Auth error, not a silent double-charge) | **Yes** — retaining transaction records after deletion is stated in `/privacy` §6 as being for legal/tax/fraud-prevention purposes, but no specific retention period has been set |

## Summary of what is settled vs. what needs a decision

**Settled, technical, unconditional (no legal dependency):** order/payment creation, webhook
signature verification and idempotent credit granting, credit reservation/refund around AI
generation failures, self-service cancellation's effect on future renewal.

**Legal/policy-gated (see `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` for the decision itself):**
monetary refunds, chargeback/dispute credit clawback, what happens to unused credits after
cancellation or Free-plan reversion, and the retention period for transaction records after account
deletion.
