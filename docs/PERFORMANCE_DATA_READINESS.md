# Performance Data Readiness

This document tracks, per metric, whether Mitra has a real, observable, server-authoritative
source for it — and is the single place that decides whether the Performance Engine
(`docs/PERFORMANCE_ENGINE.md`) is allowed to use a metric for anything beyond display.

It did not exist before Phase 34 (confirmed by audit — referenced in earlier phase reports as
"to be created," never written). It is created here as part of implementing the first real metric.

## Status table

| Metric | Real source? | Write path | Status |
|---|---|---|---|
| `whatsappClicks` (per campaign) | **Yes.** The button that opens WhatsApp fires the event; nothing is inferred. | `recordWhatsAppClick` Cloud Function → `campaign_performance/{campaignId}` (authenticated, authorized, campaign-association-checked, idempotent). See `functions/src/functions/analytics/recordWhatsAppClick.ts`. | **AVAILABLE** |
| `whatsappClicks` (per business, all campaigns) | Yes, same source. | `getAnalyticsDashboard` (Phase 32) counts the same `analytics_events` documents. | **AVAILABLE** |
| `inquiries` | **No.** No webhook, no WhatsApp Business API reply/read-receipt integration, no connected form, no channel that reports "a customer inquired." | None. `campaign_performance.inquiries` is always `null`; `getCampaignPerformance` always returns `inquiriesAvailable: false`. | **NOT AVAILABLE** |
| `appointmentRequests` / `appointmentConfirmed` / `appointmentCompleted` (`BusinessBrain.campaignHistory[].performance`) | No. Same reasoning as inquiries — no booking-channel integration exists. | None. | **NOT AVAILABLE** |
| Asset downloads, campaign generation, campaign started | Yes (pre-existing, Phase 21/32) — but these are **not** inquiries and this phase does not relabel them as such. | `trackAnalyticsEvent` → `analytics_events`, aggregated by `getAnalyticsDashboard`. | **AVAILABLE** (as what they actually are, not as a substitute for inquiries) |

## Why inquiries stays unavailable

An "inquiry" is a customer action distinct from clicking a WhatsApp link — it is the customer
actually reaching out (a message sent, a call made, a form submitted) after that click. Mitra can
observe that a business owner's campaign *opened* a WhatsApp chat draft; it cannot observe whether
the customer's WhatsApp message was ever sent, or what happened next, because there is no
integration with WhatsApp Business API's message/read-receipt events, no reply webhook, and no
lead-capture form anywhere in this codebase.

Populating `inquiries` from any of the following would be fabrication, and Phase 34 explicitly does
none of them:
- Counting `whatsapp_clicked` events as inquiries (a click is not a conversation).
- Counting `asset_downloaded` events as inquiries (a download is not customer contact).
- Counting `campaign_generated`/`campaign_started` events as inquiries (generating a campaign
  involves no customer at all).

## Overall readiness verdict

**DATA NOT YET SUFFICIENT** — for any performance-based learning, ranking, or optimization use.

One metric (`whatsappClicks`) is now real, per-campaign, and trustworthy. That is not the same as
having a complete performance picture: a system that only sees clicks and never sees outcomes
(inquiries, bookings, sales) cannot responsibly learn "what makes a campaign perform well" — it can
only learn "what makes a campaign get clicked," which is a different and much weaker signal. Until
a real inquiry/outcome source is integrated, this status does not change, and no engine should treat
a schema existing (`campaign_performance`, `CampaignPerformance`) as evidence that the underlying
data is sufficient — the schema existing and the data being trustworthy are different questions,
answered separately in this document.

This file should be updated (not silently left stale) the moment a real inquiry/outcome source is
integrated, or if a new metric is added.
