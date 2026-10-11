# Mitra AI Marketing Engine — Controlled Cohort Rollout Plan

**Phase D Strategy:** Controlled Beta Launch (10–25 Local Businesses)  
**Target Window:** Initial 14-Day Monitoring Period  
**Lead Support Contact:** Engineering & Product Operations Lead

---

## 1. Supported Business Categories & Launch Deliverables

### Supported Business Categories
1. **Restaurants & Food Services (`restaurant`)** — Diners, cafes, cloud kitchens, bakeries.
2. **Salons & Beauty Studios (`salon`)** — Hair salons, spas, nail studios, beauty parlors.
3. **Real Estate Agencies (`real_estate`)** — Property brokers, listing agents, residential project developments.
4. **General Retail & Local Services (`general`)** — Boutiques, appliance stores, clinics, fitness centers, coaching institutes.

### Included Deliverables
- **1:1 Square Poster** (1080×1080 px SVG & PNG)
- **4:5 Feed Poster** (1080×1350 px SVG & PNG)
- **9:16 Vertical Story** (1080×1920 px SVG & PNG)
- **Multi-channel Copy Deck** (WhatsApp Broadcast, Instagram Caption, Google Ad Copy)
- **Campaign Blueprint JSON Archive** (Zip Download)

### Excluded / Deferred Features
- **Cloud Run Video Reels**: Gated off until Cloud Run container service deployment is completed.
- **Social Auto-Publishing**: Excluded from initial MVP launch scope.
- **Calendar Scheduling Engine**: Excluded from initial MVP launch scope.

---

## 2. Beta Cohort Monitoring Metrics & Operational Thresholds

The following metrics will be tracked in Cloud Logging & Analytics during the 14-day beta cohort rollout:

| Metric | Target Operational Benchmark | Circuit-Breaker Pause Threshold |
| :--- | :---: | :---: |
| **Signup to Onboarding Completion** | > 85% | < 60% |
| **First Campaign Success Rate** | > 95% | < 85% |
| **Average Time to First Deliverable** | < 20.0s | > 35.0s |
| **Truth Check Pass Rate** | > 90% | < 75% |
| **Credit Allocation Discrepancy** | 0.0% | > 0.0% (Instant Pause) |
| **Cross-Tenant Authorization Errors**| 0.0% | > 0.0% (Instant Pause) |

---

## 3. Incident Response & Support Protocols

- **Support Desk**: Direct WhatsApp & In-App Chat support provided to all 10–25 beta cohort participants.
- **Refund Policy**: Any campaign generation failure automatically refunds reserved credits. If a customer is unsatisfied due to a system defect, top-up credits or monetary refunds will be issued within 24 hours.
- **Pause Criteria**: If any credit double-deduction or data isolation error occurs, onboarding will be paused immediately for remediation.
