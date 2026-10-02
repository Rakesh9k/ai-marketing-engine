# Legal pages — Paddle wording (DRAFT for founder / legal review)

**Status: DRAFT. Nothing here has been applied to the live pages.** `/terms`, `/privacy`, `/refund`
and `/cancellation` still describe PayU. This document proposes replacement wording so the pages are
accurate once Paddle is the live payment provider, and separates three kinds of statement:

- **VERIFIED** — true of the implementation today (tested against the Paddle sandbox).
- **FOUNDER DECISION** — a policy or legal-fact choice engineering must not make. Left as a marker.
- **VERIFY WITH PADDLE** — a statement about Paddle's own terms; confirm against Paddle's current
  published Buyer Terms / Privacy Notice before publishing. Do not copy Paddle's terms into Mitra's.

Paddle may review the public site before it enables live payments (checking that pricing, refund and
legal pages are present and accurate), so these pages are on the critical path to launch.

---

## 0. Founder decisions recorded (2026-10-02)

| ID | Status | Decision |
| -- | ------ | -------- |
| **D1** Refund policy | **DECIDED** | **7-day window.** First-time subscription purchases may be refunded within 7 days if none of the credits associated with that purchase have been used. Credit packs may be refunded within 7 days if none of those purchased credits have been used. Renewals are generally refundable only for billing errors, duplicate charges, or where applicable law or Paddle's applicable terms require. Refunds stay **manually reviewed and processed**. Applicable law and Paddle's terms take precedence. **Do not claim a Paddle refund automatically reverses Mitra credits** — it does not (a refund only logs an adjustment for manual review). Any future credit reversal must go through the credit ledger and must never produce inconsistent or negative balances; no automatic subtraction is to be built now. |
| **D2** Legal seller / entity | **PENDING USER BUSINESS DETAILS** | Nothing is to be guessed or published. See "Information still required" below. |
| **D3** Credit expiry | **DECIDED (Option 1, current MVP)** | Plan credits are valid only through the current calendar month; unused plan credits do not roll over. Credit-pack credits also do not roll over beyond the applicable current usage period under the existing implementation. A mid-month purchase receives the credits exactly as the existing entitlement/usage implementation grants them (no new calculation). Must be stated clearly in the Terms and the Help documentation. The credit engine is **not** changed. |
| **D4** PayU / Razorpay mentions | **PENDING VERIFICATION** | First verify whether any active customers/subscriptions still depend on PayU or Razorpay. If none: remove processor references from customer-facing copy, keep legacy backend code for rollback/history, do not delete legacy functions. If some exist: report what exists and preserve whatever is legally/operationally necessary. See "D4 check" below. |
| **D5** Payment/tax record retention | **DECIDED: generic wording, NO number** | Publish this wording and no specific period: "Billing, transaction, accounting, tax, and related business records may be retained for as long as required by applicable law and legitimate accounting/business purposes, subject to this Privacy Policy." Payment records are not promised to be deleted immediately on account deletion where retention is required. A specific number of years is **not** to be published unless the founder later confirms it against the entity's actual tax situation with a CA or lawyer. The retention table below is background only. |
| **D6** Auto-renewal & cancellation | **DECIDED (existing behaviour)** | Subscriptions renew automatically unless cancelled; the customer can cancel the next renewal; cancelling does not remove access immediately; paid access continues through the current billing period; cancellation prevents the next renewal. **No claim that in-place plan upgrades/downgrades exist.** No "change plans anytime" / "upgrade with one click". A real `/cancellation` page exists. |

### Already applied (non-legal pages — done 2026-10-02)

- **Pricing page:** removed "Can I change my plan or upgrade anytime? Yes, absolutely!" and "Change plans or cancel anytime with one click"; replaced with accurate renewal/cancellation/plan-change text; added "Do unused credits roll over?" (No) and "Renews automatically until you cancel" under each paid plan's button; pack copy says pack credits are valid for the calendar month; removed "✓ GST Invoices"; "Cancel anytime" → "Cancel anytime in Billing".
- **Help page:** removed "Your credits roll over every billing cycle" (now states the real expiry policy); replaced the outdated credit-cost examples with the real costs **derived from the credit configuration** (image 20, reel 80, campaign 140, regeneration 10); added a renewal/cancellation answer.
- **Support page:** "Upgrade your subscription plan" → "Subscribe to a plan or buy a credit pack".
- **`/cancellation`:** now a genuine Cancellation Policy page (previously a re-export of the refund page); added to the footer.
- A regression test (`src/app/billingCopy.test.tsx`) fails if the removed claims return.

### Not yet applied (waiting on D2 / D4 / D5)

The Terms, Privacy and Refund pages are **unchanged** and still say PayU/Razorpay and "founder decision required". They are not to be rewritten until D2 and D5 are supplied.

### Information still required — D2 (legal entity)

Please provide, exactly as they should appear publicly (or tell me which to withhold):

1. **Legal name** of the entity customers contract with, and the **trade name(s)** ("Mitra", "Brainwise") and how they relate.
2. **Entity type** (sole proprietorship / partnership / LLP / private limited / other).
3. **Registered address** (and a different operating/correspondence address if any).
4. **Registration identifiers you are willing to publish**: CIN or LLPIN (if applicable), GSTIN (if GST-registered), Udyam/other. (PAN need not be published.)
5. **GST status** (registered / not registered) and, with your CA, **what invoice Brainwise itself issues** to Indian business customers who ask for a GST invoice (Paddle is merchant of record; do not claim "GST invoices" until this is known).
6. **Grievance / privacy contact**: name (or designation) and email, as the DPDP/IT rules expect.
7. **Governing law and jurisdiction** (state and courts).
8. **Seller name as it should appear to customers on checkout and receipts** (the Paddle overlay currently shows "mitra : your AI marketing partner") and the support email/phone to print on receipts.
9. Whether the Terms should state **Paddle as the seller of record** for the sale and **Brainwise as the provider of the Service** (recommended; confirm wording with counsel).

### D5 — background only (no number is being published)

The period depends on the entity type (D2) and GST registration. Candidate requirements to confirm with your CA/counsel
(this is **not legal advice**, and none is published yet):

| Possible requirement | What it generally covers | Typical retention (confirm) |
| -------------------- | ------------------------ | --------------------------- |
| CGST Act, s.36 | GST accounts, invoices, records, if GST-registered | Until 72 months after the due date of the annual return for that year |
| Income-tax Act, s.44AA / Rule 6F | Books of account and supporting documents | Generally 6 years from the end of the relevant assessment year |
| Companies Act 2013, s.128 (companies) / LLP Act (LLPs) | Books of account | 8 years |
| DPDP Act 2023 | Personal data in general | Only as long as needed for the purpose, unless a law requires longer |

Questions to answer: (a) which of these apply to Brainwise; (b) the single period to publish for **billing, transaction,
accounting and tax records** (a "candidate" would be the longest applicable one, e.g. 8 years for a company/LLP — you
decide); (c) after account deletion, should the retained billing records stay in **identifiable** form (with the
user's email/ID) or be **anonymised** once the account is deleted? (today `requestAccountDeletion` removes the login and
archives businesses but keeps transaction documents). Note Paddle, as merchant of record, also keeps its own
transaction/tax records independently.

### D4 check — are there still PayU/Razorpay customers?

I could not read production data from this environment (no credentials). Run **either**:

**Option 1 — script (read-only, counts only):**
```
node scripts/audit-legacy-subscribers.mjs --project brainwise-ai-marketing-engine
```
needs Google credentials with Firestore read access (`gcloud auth application-default login`, or a service-account key in
`GOOGLE_APPLICATION_CREDENTIALS` that you revoke afterwards). It prints only counts by provider and whether any live paid
legacy subscription exists. It performs no writes.

**Option 2 — Firebase Console (no credentials to share):** Firestore → `subscriptions` → add filter
`status` **in** `active, trialing, past_due`, then look at the `provider` field of each result (`payu`, `razorpay`, or
missing = pre-PayU Razorpay record) and `planId` ≠ `free`, and check `currentPeriodEnd` is in the future. Repeat with
`transactions` filtered `provider == payu`. Tell me the counts (not the customers).

---

## 1. Verified product facts the pages can rely on

| Fact | Evidence |
| ---- | -------- |
| Plans: Free, Starter ₹999/mo · ₹9,990/yr, Business ₹1,699/mo · ₹16,990/yr, Pro ₹2,999/mo · ₹24,990/yr, Agency ₹4,999/mo · ₹49,990/yr. Prices are in INR and shown **inclusive of GST** at checkout. | `pricing.ts`; Paddle price preview for India (sandbox and live). |
| Paid plans **renew automatically** each month/year until cancelled. | Paddle subscriptions (`subscription_recurring` webhook path). *(Before: PayU purchases were one-time and lapsed after 30 days.)* |
| One-time credit packs exist: 500 / 1,200 / 3,000 credits at ₹499 / ₹999 / ₹1,999. | Purchasable today; webhook-verified. *(Terms currently say "not yet purchasable" — now wrong.)* |
| Credits are granted only after Paddle's signed webhook confirms payment; never from the browser. | `paddleWebhook`, replay-tested. |
| A plan's included credits are **per calendar month** (`usage` period), not per billing anniversary. Top-up credits belong to the calendar month they were bought in and **do not roll over**. | `usageControl.ts` / `getPeriodCreditAllowance`. **This is current behaviour, not a decided policy — see D3.** |
| Cancelling stops renewal; the customer **keeps the plan and already-granted credits until the end of the paid period**, then reverts to Free. Nothing is clawed back and nothing is refunded automatically. | `cancelPaddleSubscription`; verified against real Paddle sandbox. |
| No free trial exists. | catalog has no trial; none in code. |
| Mitra stores only plan/status/transaction records and Paddle customer/subscription/transaction IDs. Card, UPI and bank details are entered into Paddle's checkout and are **not** received or stored by Mitra. | `createPaddleCheckout`, Firestore schema. |
| Switching plans in place is **not** available; a subscriber must cancel and re-subscribe. | `createPaddleCheckout` blocks a second live subscription. |
| Razorpay/PayU code remains in the repo but is not deployed to new purchases. Subscriptions bought earlier through those providers may still exist. | `index.ts` exports; docs/PAYMENT_GATEWAY.md. |

---

## 2. `/terms` — proposed changes

### §1 "The Service" (currently ends: "…granted through paid subscription plans purchased via PayU.")

> …Generation and related actions consume credits, which are included with your plan each month or
> bought as one-time credit packs.

*(Removes the provider name from a sentence that doesn't need one.)*

### §7 "Credits, subscriptions, and payments" (replace both paragraphs)

> **Paid plans and payments.** Paid plans and credit packs are sold through our payment partner,
> **Paddle**, who acts as the *merchant of record*. *[VERIFY WITH PADDLE — confirm this description
> and whether Paddle or Brainwise is the seller named on invoices/receipts.]* Prices are shown in
> Indian rupees and include applicable taxes, including GST. Paddle processes your payment and
> issues your receipt; Mitra does not receive or store your card, UPI or bank details.
>
> **Automatic renewal.** Paid plans renew automatically at the end of each billing period (monthly
> or yearly, as you chose) and you are charged the then-current price for that period until you
> cancel. We do not offer a free trial.
>
> **Credits.** A plan includes a monthly allowance of credits. Credits are added after your payment
> is confirmed and are used as you generate content. Your plan's included credits apply to the
> calendar month. Credit packs are one-time purchases and add credits for the month in which you
> buy them. Unused plan credits do not roll over into the next calendar month, and credit-pack credits likewise
> do not roll over beyond the usage period they were bought in. *[DECIDED — D3 Option 1.]*
>
> **Cancelling.** You can cancel from the Billing page at any time. Cancelling stops future renewals;
> you keep your plan and the credits already added for the current period until that period ends,
> and your account then moves to the Free plan. See our [Cancellation Policy].
>
> **Changing plan.** To move to a different plan, cancel your current plan and subscribe to the new
> one once the current period has ended.
>
> **Refunds.** See our [Refund Policy]. *[DECIDED — D1: 7-day window, see §0; refunds are reviewed and
> processed manually; applicable law and Paddle's terms take precedence.]*
>
> **Billing questions.** support@brain-wise.com.

---

## 3. `/refund` — proposed changes

Currently §1 "Current state" says payments are processed through PayU/Razorpay and refunds are
manual and unpublished. Replace the provider sentence only; the "no finalized policy" honesty stays
until D1 is decided.

> Paid plans and credit packs are sold through Paddle, the merchant of record. *[VERIFY WITH PADDLE:
> how refunds are initiated and issued when Paddle is merchant of record — Paddle processes refunds
> against its own transactions, and its Buyer Terms may set a refund window that applies regardless
> of Mitra's policy. Mitra's policy must not contradict it.]* Subscriptions bought earlier through
> PayU or Razorpay may still exist; for those, contact support@brain-wise.com.

**D1 — DECIDED (7-day window).** Proposed Refund-page wording, to be applied once D2 is supplied:

> **Refunds.** You may request a refund within **7 days** of (a) your **first** purchase of a paid subscription plan, or
> (b) a **credit-pack** purchase, **if none of the credits associated with that purchase have been used.**
> Subscription **renewals** are generally refundable only for billing errors, duplicate charges, or where required by
> applicable law or Paddle's applicable terms. Refund requests are reviewed and processed manually by our team and,
> where Paddle issues the refund, subject to Paddle's processes. Applicable law and Paddle's applicable terms take
> precedence over this policy. Cancelling a subscription does not by itself refund a payment.

Engineering note (not customer-facing): a refund created in Paddle currently only raises an `adjustment` event that
Mitra **logs for manual review**; it does **not** reverse credits. Do not state otherwise. Any future reversal must use
the credit ledger and must never create an inconsistent or negative balance; none is to be built now.

---

## 4. `/privacy` — proposed changes

### Data table row "Subscription/payment status, transaction records"

> Firestore stores plan, status and transaction records, plus Paddle's customer, subscription and
> transaction identifiers. Card, UPI and bank details are collected by Paddle directly — Mitra does
> not receive or store them.

### Processor list (replace the PayU and Razorpay items)

> **Paddle** — our payment partner and merchant of record. Receives the details you enter at
> checkout (such as your name, email, billing country/postcode and payment details) and tells Mitra
> the payment and subscription status through a signed server-to-server notification.
> *[VERIFY WITH PADDLE — Paddle processes some of this data as an independent controller for its own
> purposes (e.g. tax, fraud, regulatory); link Paddle's current privacy notice here. Also confirm and
> state any transfer of data outside India (Paddle operates internationally).]*
>
> **PayU / Razorpay** — *[FOUNDER DECISION D4 — keep a historical line only if any customer
> subscription made through them still exists; otherwise remove. If kept: "Previous payment
> processors; no longer used for new purchases."]*

Also check the retention row (payment/billing records): tax and accounting law may require
retention; see decision D5.

---

## 5. `/cancellation` — there is no separate page

`src/app/cancellation/page.tsx` re-exports `/refund-policy`, which permanently redirects to `/refund`. So the
"Cancellation Policy" links in the Terms, Privacy and Refund pages all land on the **Refund** page, and the
cancellation behaviour is not described anywhere on its own. Either (a) write a short real Cancellation
Policy page from the verified facts in §1 (renewal stops; plan and already-added credits continue to the
end of the paid period; then Free; no automatic refund; to change plan, cancel and re-subscribe), or
(b) fold that wording into the Refund page and point the links there. Engineering recommends (a); it is a
small page and it answers the question customers actually ask before subscribing.

---

## 6. New / changed founder decisions (add to `LEGAL_FOUNDER_DECISIONS_REQUIRED.md`)

| ID | Decision | Why it matters now |
| -- | -------- | ------------------ |
| D1 | Refund policy (eligibility, window, full/partial, packs vs. plans) | Paddle as merchant of record has its own refund process/terms; the Mitra page must not contradict it. Also gates Paddle's site review. |
| D2 | Seller identity on invoices / who is "the merchant" in Mitra's Terms | The Terms must name who the customer contracts with; with Paddle this may be Paddle for the sale and Brainwise for the Service. Needs legal wording. |
| D3 | Credit expiry / roll-over (plan credits, pack credits, after cancellation) | The product resets monthly and packs don't roll over — customers buying ₹1,999 of credits will care. Must be stated and then, if changed, built. |
| D4 | Keep or remove PayU/Razorpay mentions | Depends on whether any such subscribers remain. |
| D5 | Retention of payment/tax records | Invoices/GST records are usually legally retained; the account-deletion text should say so. |
| D6 | Automatic-renewal and cancellation disclosure wording | Renewal is now automatic (it wasn't under PayU); consumer-protection norms expect clear disclosure at checkout and in the Terms. Consider also a visible note next to the Subscribe button. |

---

## 7. Suggested order

1. Founder/legal decide D1–D6 (D1, D2 and D3 matter most for Paddle's review).
2. Apply §2–§4 wording to the pages in one change, with the VERIFY WITH PADDLE items checked against
   Paddle's current documents.
3. Create or fold in the Cancellation wording (§5).
4. Only then submit the site for Paddle's live-payments review and approve the checkout domain.
