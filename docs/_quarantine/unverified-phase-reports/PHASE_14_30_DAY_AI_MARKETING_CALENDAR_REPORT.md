# Phase 14 Implementation Report: 30-Day AI Marketing Calendar V1

## Executive Summary

Phase 14 introduces **Mitra Phase 14 — 30-Day AI Marketing Calendar V1**, a low-cost AI marketing planner that produces a structured 30-day content strategy before any expensive creative or media generation takes place.

Key Strategic Invariants:

1. **Low-Cost Text Planning**: Initial 30-day plan creation uses an inexpensive text planning AI call (`TextAI` / Gemini structured text generation).
2. **Zero Automatic Media Generation**: Initial plan creation does NOT trigger image generation, video generation, Veo, Creatomate, ElevenLabs, Photoroom, or media rendering.
3. **Selective Creative Generation**: Users consume creative/media credits only when explicitly choosing to click **🚀 Create Content** on specific planned items.
4. **Decoupled Architecture**:
   - `MarketingPlan` & `MarketingCalendarItem` = Planning layer.
   - `Campaign` = Content creation layer.
   - `ScheduledPost` (Phase 11) = Scheduling engine.
   - `PublishJob` (Phase 10) = Publishing engine.
   - Phase 13 Publishing Dashboard = Execution & operations view.

---

## 1. Files Changed / Created

### Backend & Cloud Functions

- `functions/src/types/calendar.ts`: Core domain type definitions (`MarketingPlan`, `MarketingCalendarItem`, `MarketingGoal`, `PostingFrequency`, `CalendarItemStatus`, `GeneratePlanInput`).
- `functions/src/config/pricing.ts`: Defined `PRICING.calendarPlanningCredits = 10`.
- `functions/src/services/usageControl.ts`: Added `'calendar_planning'` case in `getGenerationCost`.
- `functions/src/services/calendar/calendarPlanningService.ts`: Low-cost AI marketing strategist service, prompt construction, structured output validation, product reference verification, strict offer truthfulness, timezone validation, and chronological item sorting.
- `functions/src/functions/calendar/generateMarketingPlan.ts`: Cloud Function for plan creation wrapped with `executeWithUsageControl` (atomic credit reservation, idempotency, AI call, credit deduction/refund, and business/product ownership checks).
- `functions/src/functions/calendar/getMarketingPlan.ts`: Cloud Function for fetching active plan and calendar items.
- `functions/src/functions/calendar/skipCalendarItem.ts`: Cloud Function for marking item status as `'skipped'`.
- `functions/src/functions/calendar/updateCalendarItem.ts`: Cloud Function for updating topic, hook, CTA, suggested time, scheduled date, or status.
- `functions/src/index.ts`: Exported all four calendar Cloud Functions.

### Frontend

- `src/app/calendar/page.tsx`: 30-Day AI Marketing Calendar page route.
- `src/features/calendar/services/calendarService.ts`: Client service for calling calendar Cloud Functions via `callFunction`.
- `src/features/calendar/components/PlanWizardModal.tsx`: Step 1 (Goal), Step 2 (Posting Frequency), Step 3 (Optional Product Focus) wizard modal.
- `src/features/calendar/components/MarketingCalendarView.tsx`: Active plan summary header, stats, chronological timeline view, item actions (Create Content, Edit, Skip, Regenerate).
- `src/features/calendar/components/EditCalendarItemModal.tsx`: Lightweight modal for editing item strategy fields prior to creative generation.
- `src/components/layout/Sidebar.tsx`: Navigation link to `/calendar`.

### Security & Database

- `firestore.rules`: Security rules for `marketingPlans` and `marketingCalendarItems` (read allowed for owner, write blocked for client SDK).
- `firestore.indexes.json`: Composite index definitions for `marketingPlans` and `marketingCalendarItems`.

### Tests

- `functions/src/services/calendar/calendarPlanningService.test.ts`: Backend service unit tests.
- `src/app/calendar/page.test.tsx`: Page integration tests.
- `src/features/calendar/components/PlanWizardModal.test.tsx`: Wizard component tests.
- `src/features/calendar/components/MarketingCalendarView.test.tsx`: Calendar view component tests.

---

## 2. Data Model

### `MarketingPlan`

```ts
export interface MarketingPlan {
  planId: string;
  userId: string;
  businessId: string;
  goal: MarketingGoal;
  frequency: PostingFrequency;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'active' | 'archived';
  totalItems: number;
  createdCount: number;
  metadata?: {
    promptVersion?: string;
    aiModel?: string;
    businessBrainVersion?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### `MarketingCalendarItem`

```ts
export interface MarketingCalendarItem {
  itemId: string;
  planId: string;
  userId: string;
  businessId: string;
  scheduledDate: string;
  suggestedTime: string;
  timezone: string;
  contentType: PublishContentType; // 'post' | 'reel'
  strategy: string;
  topic: string;
  hook: string;
  offerHeadline?: string | null;
  productId?: string | null;
  productName?: string | null;
  callToAction: string;
  status: CalendarItemStatus; // 'planned' | 'content_created' | 'scheduled' | 'published' | 'skipped'
  campaignId?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. AI Architecture & Prompt System

- **Provider**: Standard `TextAI` interface via `getTextAI()` factory abstraction (`functions/src/services/ai/factory/aiProviderFactory.ts`).
- **Model**: `gemini-flash-latest` configured for structured JSON output (`generateStructured`).
- **Structured Output Validation**: Validated via Zod schema (`MarketingPlanAISchema`).
- **Factuality Rules**:
  1. Product references are verified against `availableProducts`. If invalid or missing, set to `null`.
  2. If no active offers exist in Business Brain, `offerHeadline` is strictly enforced to `null` (never invented).
  3. AI is prohibited from inventing local festivals or event dates based on model memory.

---

## 4. Credit Economics & Cost Control

- **Planning Cost**: 10 credits (`PRICING.calendarPlanningCredits = 10`).
- **Atomic Transaction & Idempotency**: Handled by `executeWithUsageControl(userId, operationId, 'calendar_planning', ...)`:
  - Idempotency key per wizard submit prevents duplicate charges on double-click or re-render.
  - Credit reservation and deduction happens atomically in Firestore transactions.
  - Automatic credit refund if AI generation or schema validation fails.

---

## 5. Production Acceptance Verification

- [x] User can click "Create my 30-day plan"
- [x] Goal selection works (`get_customers`, `promote_offers`, `build_awareness`, `promote_products`)
- [x] Posting frequency selection works (`three_per_week` ~13 items, `five_per_week` ~21 items, `daily` 30 items)
- [x] Optional product selection works
- [x] 30-day date range and business timezone respected
- [x] Business Brain context (Name, Category, Location, Tone, Localization, Catalog, Offers) used
- [x] AI planning uses existing `TextAI` provider abstraction
- [x] AI returns Zod-validated structured JSON output
- [x] Calendar items persisted in Firestore
- [x] User can review, edit, and skip calendar items
- [x] Plan regeneration archives existing plan safely without silent deletion
- [x] Zero images/videos generated during initial calendar generation
- [x] Calendar generation has 10 credits price handled via `executeWithUsageControl`
- [x] Create Content links calendar item to existing campaign wizard prefill
- [x] Calendar item does not automatically create `ScheduledPost` or `PublishJob`
- [x] Server-side security checks enforce business & product ownership
- [x] All unit, integration, boundary, security, typecheck, lint, and build checks PASS.
