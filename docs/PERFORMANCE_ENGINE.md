# Performance Engine

This document did not exist before Phase 34 (confirmed by audit — earlier phase reports refer to
it as a file "to be created," never written). It describes the current, real state of performance
data in Mitra, and the conceptual engine that would eventually consume it — the engine itself is
**not implemented**; nothing in this codebase currently reads performance data to change campaign
generation, ranking, or recommendations.

## What exists today

A single, server-authoritative aggregate per campaign, `campaign_performance/{campaignId}`:

```
campaignId
businessId
whatsappClicks   — real, event-sourced, idempotent
inquiries        — always null (no real source — see docs/PERFORMANCE_DATA_READINESS.md)
updatedAt
lastEventAt
```

Written only by `recordWhatsAppClick` (authenticated, authorized via `verifyBusinessAccess`,
campaign-association-checked, idempotent per click). Read only by `getCampaignPerformance` and
displayed on the campaign detail page. This is the entire "engine" today — a truthful read/write
path for one real metric. There is no scoring, ranking, learning, or recommendation logic anywhere
in this codebase that consumes it.

## What a real Performance Engine would need before it could learn anything

1. **Outcome data, not just engagement data.** `whatsappClicks` measures interest; it does not
   measure whether the campaign actually worked (a sale, a booking, a completed inquiry). A system
   that optimizes for clicks alone will learn to produce clickbait, not results — this is exactly
   why `inquiries` (or an equivalent real outcome signal) must be integrated before any
   optimization loop is built, not treated as a nice-to-have.
2. **Enough volume per campaign to distinguish signal from noise.** A handful of clicks on one
   campaign is not a basis for concluding it "performed better" than another.
3. **A defined comparison baseline.** Comparing campaigns fairly requires knowing what's actually
   comparable (same vertical, same offer type, similar audience size) — none of that normalization
   exists yet.

## Current readiness gate

Per `docs/PERFORMANCE_DATA_READINESS.md`: **DATA NOT YET SUFFICIENT.**

This status is not tied to whether a schema/collection exists (`campaign_performance` now does)
— it is tied to whether the data behind that schema is trustworthy and complete enough to learn
from. It is not. Any future engine work must check `PERFORMANCE_DATA_READINESS.md` before treating
this status as anything other than **DATA NOT YET SUFFICIENT**, and must not flip it just because
new fields were added to a type or a new collection was created.
