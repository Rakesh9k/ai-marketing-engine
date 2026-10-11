# Initial Baseline Audit — Roadmap to 10/10

**Date:** October 9, 2026  
**System:** Mitra by BrainWise (`ai-marketing-engine`)  
**Author:** Principal Architect & Senior Full-Stack Engineering Lead  

---

## Executive Overview

This baseline audit evaluates Mitra across its three primary architectural refinement areas:
1. **Performance Engine Data Source**: Moving from click tracking (`whatsappClicks`) and `inquiries: null` to provider-verified campaign outcome measurement.
2. **Dedicated Agency Dashboard UI**: Establishing a first-class agency experience (`/agency`) leveraging existing backend tenant-isolation logic (`verifyBusinessAccess`).
3. **Backend Cloud Functions Lint Remediation**: Eliminating 400 ESLint errors in `functions/` without altering runtime behavior or relaxing lint rules.

---

## 1. Performance Engine Audit

### 1.1 Current Architecture & Data Flow
Currently, campaign interaction tracking consists of a single server-authoritative aggregate:
* **Event Source:** UI interaction on `CampaignDetailContent.tsx` (`handleWhatsAppShare`) generates a client-side UUID `clickId` and invokes `recordWhatsAppClick`.
* **Backend Callable:** `functions/src/functions/analytics/recordWhatsAppClick.ts` validates caller business access via `verifyBusinessAccess`, checks campaign ownership, enforces idempotency via `withIdempotency("whatsapp_click_{campaignId}_{clickId}")`, logs an `analytics_events` entry, and increments `campaign_performance/{campaignId}.whatsappClicks`.
* **Read Endpoint:** `getCampaignPerformance.ts` retrieves the `campaign_performance` document and returns:
  ```json
  {
    "campaignId": "cmp_123",
    "whatsappClicks": 5,
    "inquiries": null,
    "inquiriesAvailable": false,
    "updatedAt": "2026-10-09T20:00:00.000Z"
  }
  ```

### 1.2 The `inquiries: null` Semantic
* `inquiries` is explicitly `null` and `inquiriesAvailable` is `false`.
* As documented in `docs/PERFORMANCE_DATA_READINESS.md`, a WhatsApp click proves a user opened a chat draft; it does not prove an inbound message was delivered, a conversation started, or a lead/booking occurred.
* Prior to Phase 34/36, no external webhook or message-ingestion pipeline existed.

### 1.3 Data Flow Diagram (Current vs. Target Webhook Integration)

```mermaid
flowchart TD
    subgraph Current Flow (Click Tracking)
        A[User Clicks WhatsApp CTA] --> B[recordWhatsAppClick Callable]
        B --> C[verifyBusinessAccess & Idempotency Check]
        C --> D[Increment campaign_performance.whatsappClicks]
        C --> E[Write analytics_events Document]
    end

    subgraph Proposed Inbound Webhook Pipeline
        F[WhatsApp Cloud API / Webhook Event] --> G[HTTP Webhook Endpoint /whatsappWebhook]
        G --> H[Verify Signature & Webhook Challenge]
        H --> I[Validate Payload & Extract Inbound Event]
        I --> J[Idempotent Processing via Event ID]
        J --> K[Resolve Business & Campaign Attribution]
        K --> L[Persist Inbound Inquiry / Conversation Record]
        L --> M[Update campaign_performance.inquiries]
    end
```

---

## 2. Agency Dashboard Audit

### 2.1 Backend Capability & Tenant Isolation
* **Authorization Helper:** `verifyBusinessAccess(userId, businessId)` in `functions/src/middleware/auth.ts`:
  * Verifies if `businessDoc.data().userId === userId`.
  * Alternatively checks if caller `userData.role === 'agency_member'` AND `userData.agencyId === businessData.agencyId`.
* **Existing Backend Scope:** Authz unit tests (`tests/phase27-authz.test.ts` & `tests/phase27-bulk-approval-auth-roles.test.ts`) pass 100% against Firestore emulators.

### 2.2 Current UI Gap
* **Current App Routes:** `src/app/` contains `/dashboard`, `/campaigns`, `/onboarding`, `/billing`, `/analytics`, `/business-profile`, `/calendar`, `/publishing`.
* **Missing Element:** There is no dedicated `/agency` route or agency workspace UI. Agency members using the current UI must manually select single business IDs.
* **Target Objective:** Build a dedicated `/agency` experience with Agency Overview, Client Directory, Client Workspace Context Switcher, Campaign Table, and Agency Settings.

---

## 3. Backend Lint Audit

### 3.1 Baseline Results
* **Command:** `npm --prefix functions run lint`
* **Status:** Failed (Exit Code 1)
* **Total Problems:** 400 errors, 0 warnings (160 fixable with `--fix`).

### 3.2 Error Rule Breakdown
| ESLint Rule | Error Count | Description | Primary Solution |
| :--- | :---: | :--- | :--- |
| `@typescript-eslint/no-unused-vars` | 240 | Unused imported schemas, variables, or arguments | Remove dead imports/variables or prefix intentional unused args with `_` |
| `@typescript-eslint/consistent-type-imports` | 160 | Imports used solely as types | Convert to `import type { ... }` |

### 3.3 Top Affected Files
1. `functions/src/services/creativeIntelligence/ontology/*` (Multiple type files)
2. `functions/src/services/creativeIntelligence/validation/*` (Validator & schema files)
3. `functions/src/services/creativeIntelligence/registry/*`
4. `functions/src/middleware/` & `functions/src/functions/`

---

## 4. Execution Plan & Priorities

Following the prioritized strategy for Mitra:
1. **Workstream C (Backend Lint Remediation)**: Low risk, immediate quality gate cleanup.
2. **Workstream B (Dedicated Agency Dashboard)**: Medium risk, high value for agency users using existing backend authz.
3. **Workstream A (Performance Engine: Real Inquiry Data)**: Highest dependency risk, provider-neutral webhook architecture and attribution framework.
