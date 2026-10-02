# Phase 17 — Meta Performance Data V1 Implementation Report

## Executive Summary

Phase 17 brings **real Meta performance data** back into Mitra for published Facebook and Instagram content without creating a separate analytics system, parallel time-series engine, or fabricated engagement scoring. It extends existing Phase 9 (Meta Connection), Phase 10 (PublishingProvider & `externalPostId`), Phase 11 (Scheduling Engine), Phase 13 (Publishing Dashboard), and Phase 16 (Analytics Event Logging) architecture.

---

## Key Achievements & Implementation Summary

### 1. Data Models & Metric Normalization

- **Files**: `functions/src/types/meta.ts`, `functions/src/types/index.ts`, `src/types/index.ts`
- **Normalized Types**:
  - `PostPerformanceRecord`: Stores platform performance metrics for individual published posts (`campaignId`, `publishJobId`, `platform`, `externalPostId`, `scheduledPostId`, `calendarItemId`, `metrics`, `status`, `lastSyncedAt`, `error`).
  - `MetaMetrics`: Standardized metric structure containing `reach`, `impressions`, `likes`, `comments`, `shares`, `videoViews`, `clicks`.
  - `MetaPerformanceStatus`: `'pending' | 'available' | 'partial' | 'unavailable' | 'error'`.
- **Metric Rules**:
  - Unsupported metrics are explicitly set to `null` (never fabricated as `0`).
  - `0` is used only when Meta Graph API explicitly returns a count of `0`.

### 2. Provider Layer & Failure Isolation

- **File**: `functions/src/services/publishing/providers/MetaPerformanceProvider.ts`
- **Functionality**:
  - Fetches insights and field node data from Meta Graph API for Instagram image/carousel posts, Instagram Reels, Facebook posts, and Facebook videos/reels using active Page or Instagram access tokens.
  - Isolates Meta API failures: Graph API errors (token expiration, revoked permissions, missing posts) update individual `PostPerformanceRecord` status to `'error'` or `'unavailable'` without interrupting core publishing operations or setting `PublishJob` status to failed.

### 3. Firestore Persistence & Backend Sync Service

- **Files**: `functions/src/services/firestore.ts`, `functions/src/services/publishing/performanceSyncService.ts`
- **Functionality**:
  - Documents stored under `post_performance/${publishJobId}`.
  - `syncPublishJobPerformance`: Synchronizes metrics for a specific published job.
  - `syncCampaignPerformance`: Fetches all published jobs for a given campaign, verifies user ownership (`context.userId`), and synchronizes performance records.

### 4. Controlled Manual Sync Cloud Function

- **File**: `functions/src/functions/analytics/syncCampaignPerformance.ts`
- **Functionality**:
  - Authenticated Callable Cloud Function `syncCampaignPerformance` allowing users to trigger standard on-demand metrics refresh for a campaign.
  - Enforces strict user authorization against `campaigns/${campaignId}`.
- **Extended Analytics Query**:
  - Updated `functions/src/functions/analytics/getCampaignPerformance.ts` to include array of `postsPerformance` alongside existing campaign metrics.

### 5. UI Integration & Performance Cards

- **File**: `src/components/campaign/CampaignDetailContent.tsx`
- **Functionality**:
  - Surface Published Posts performance cards on the Campaign Detail page (`/campaigns/[id]`).
  - Displays platform badge (Facebook / Instagram), post status, reach, impressions, likes, comments, shares, clicks, and video views.
  - Includes a "Refresh Performance" button calling `syncCampaignPerformance`.

---

## Verification & Quality Assurance

1. **TypeScript Compilation**: `npx tsc --noEmit` clean with 0 errors across frontend and backend.
2. **ESLint & Prettier**: `npm run lint` clean with 0 errors / 0 warnings.
3. **Backend Unit Tests**: `npm --prefix functions test` passed 60/60 test suites (947 unit tests).
4. **Frontend Unit Tests**: `npm run test` passed 43/43 test suites (564 unit tests).
5. **Next.js Production Build**: Next.js production build verified clean.
