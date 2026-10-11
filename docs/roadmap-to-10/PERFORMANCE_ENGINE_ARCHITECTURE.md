# Performance Engine & WhatsApp Outcome Ingestion Architecture — Mitra by Brainwise
**Workstream A — Real Campaign Outcome Measurement & Webhook Ingestion**

---

## 1. Context & Motivation

Historically, Mitra's Performance Engine tracked outgoing WhatsApp CTA clicks (`clicks`), but set `inquiries: null` because inbound messaging outcomes were unintegrated.

A click on a WhatsApp link indicates interest, but does NOT prove that a message was sent, a conversation started, or a qualified lead inquiry occurred.

**Workstream A** establishes a provider-neutral inbound event ingestion pipeline for WhatsApp Cloud API webhooks. It moves Mitra from click tracking to **verified outcome attribution**, converting `inquiries: null` into exact, verified outcome metrics.

---

## 2. Inbound Campaign Attribution Progression

```
[ CTA Click ] ---> [ WhatsApp App Opens with Prefilled Text ] ---> [ User Sends Message ]
                           (Contains [Ref: CMP-XXX])                  |
                                                                      v
                                                    [ WhatsApp Cloud API Webhook ]
                                                                      |
                                                                      v
                                                    [ HMAC Signature Validation ]
                                                                      |
                                                                      v
                                                    [ Idempotent Deduplication ]
                                                                      |
                                                                      v
                                                    [ Campaign Ref Match & Attribution ]
                                                                      |
                                                                      v
                                                  [ Atomic Increment of `inquiries` ]
```

---

## 3. Webhook Contract & Specifications

### 3.1 Webhook Verification (GET Challenge)
WhatsApp Cloud API verifies webhook endpoints via a GET request with query params:
- `hub.mode`: `"subscribe"`
- `hub.verify_token`: configured secret token
- `hub.challenge`: random challenge string to echo back

### 3.2 Inbound Payload Processing (POST)
Inbound `messages` contain:
- `from`: sender phone number
- `id`: unique message ID (used for idempotency)
- `text.body`: message text containing prefilled campaign reference (e.g. `Hi! I am interested in Bawarchi Biryani Combo [Ref: cmp_101]`)

---

## 4. Performance Metrics Schema Update (`campaign_performance`)

```typescript
export interface CampaignPerformanceRecord {
  campaignId: string;
  businessId: string;
  period: string; // YYYY-MM
  clicks: number;
  inquiries: number; // Replaces `inquiries: null` with verified inbound count
  qualifiedLeads: number;
  conversions: number;
  attributionBreakdown: {
    directPrefilledMatches: number;
    organicInbound: number;
  };
  updatedAt: string;
}
```
