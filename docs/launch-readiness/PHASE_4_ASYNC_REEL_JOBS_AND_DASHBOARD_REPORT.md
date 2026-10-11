# Phase 4 — Asynchronous Reel Jobs, Progress & Dashboard Playback Report

**Service:** `ai-marketing-engine` & `services/reel-renderer`  
**Date:** October 9, 2026  
**Status:** PHASE 4 COMPLETE — GO FOR PHASE 5 LAUNCH AUTHORIZATION & BETAS  

---

## 1. Audit of Existing Job Lifecycle & Schema

A complete audit of the reel job lifecycle was conducted across Cloud Functions, Cloud Run, Cloud Storage, and Firestore (`reels/{reelId}`).

```
                                  JOB LIFECYCLE FLOW
                                  ------------------
 [User Action] ──> [Cloud Functions: generateReel]
                           │
                           ├──> 1. Auth & Plan Entitlement Verification
                           ├──> 2. Idempotency Check & Credit Reservation
                           │
                           ├──> 3. Stage 1: 'analyzing' (Clip Vision AI)
                           ├──> 4. Stage 2: 'planning'  (Edit Plan Gen)
                           │
                           ├──> 5. Stage 3: 'rendering' ──> [Cloud Run Renderer]
                           │                                      │
                           │                               (FFmpeg Pipeline)
                           │                                      │
                           ├──> 6. Stage 4: 'finalizing' <────────┘ (Upload MP4 + JPG)
                           │
                           ├──> 7. Storage Verification (assertStoredObject)
                           ├──> 8. Signed V4 URL Generation (7-Day Expiry)
                           │
                           └──> 9. Stage 5: 'completed' (Credit Settlement)
```

### Firestore Document Schema (`reels/{reelId}`)

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `reelId` | `string` | Unique document identifier (UUID / Auto-ID) |
| `businessId` | `string` | Tenant isolation key |
| `userId` | `string` | Owner user ID |
| `status` | `enum` | `'draft' \| 'queued' \| 'analyzing' \| 'planning' \| 'rendering' \| 'completed' \| 'failed'` |
| `inputClipIds` | `string[]` | Array of uploaded source clip asset IDs |
| `outputStoragePath` | `string` | GCS path (`businesses/{bizId}/reels/{reelId}/output/reel.mp4`) |
| `thumbnailStoragePath` | `string` | GCS path (`businesses/{bizId}/reels/{reelId}/output/thumbnail.jpg`) |
| `outputUrl` | `string` | Short-lived V4 signed read URL |
| `downloadUrl` | `string` | Short-lived V4 signed URL with `attachment; filename=...` disposition |
| `thumbnailUrl` | `string` | Short-lived V4 signed thumbnail image URL |
| `creditsUsed` | `number` | Deducted credits (settled upon completion) |
| `error` | `object` | `{ code, message, stage, retryable }` (sanitized customer copy) |

---

## 2. Canonical Job State Machine & Progress Mapping

State progression is strictly monotonic within a single job execution attempt. Stale workers or late responses cannot revert a higher or terminal state.

| State | Job Progress % | Description & Trigger |
| :--- | :---: | :--- |
| `queued` | 0% – 5% | Job submitted, awaiting usage control & authorization |
| `analyzing` | 5% – 25% | Clip Vision AI quality scoring & scene categorization |
| `planning` | 25% – 45% | Creative Brain template adaptation & script segmentation |
| `rendering` | 45% – 85% | Cloud Run FFmpeg segment encoding, transitions, text overlays & audio mix |
| `finalizing` | 85% – 95% | MP4/JPG export upload to GCS & `assertStoredObject` size validation |
| `completed` | 100% | Signed V4 read URLs populated, credits settled, analytics logged |
| `failed` | Terminal | Error caught, sanitized user copy written, credits refunded |

---

## 3. Orchestration & Idempotency Architecture

### 1. Dual-Service Architecture
- **Cloud Functions (`generateReel`):** Trusted orchestrator. Handles user authentication, plan entitlement check (`requirePlan`), rate limiting, credit reservation (`executeWithUsageControl`), AI plan generation, and storage assertion.
- **Cloud Run (`services/reel-renderer`):** Dedicated compute engine. Runs hardware-isolated FFmpeg renders within a unprivileged Node.js container (`appuser`).

### 2. Idempotency Contract
- Every generation request requires a UUID `idempotencyKey`.
- `executeWithUsageControl` checks active reservations prior to execution.
- If a job is already in progress (`'analyzing'`, `'planning'`, `'rendering'`, or `'completed'`), the function returns `{ alreadyInProgress: true }` without deducting duplicate credits.

---

## 4. Progress Persistence & Fencing

1. **Firestore Real-time Synchronization:** `watchReel(reelId)` uses `onSnapshot` to sync live status updates directly to `ReelGenerationProgress.tsx`.
2. **Fencing & Sanitization:**
   - Internal infrastructure errors (e.g., FFmpeg subprocess exit codes or Cloud Run network timeouts) are caught and sanitized via `customerFacingReelError()`.
   - Customers receive actionable advice (e.g., *"We could not finish rendering your reel. Please try again — you have not been charged for this attempt."*) without exposing system credentials.

---

## 5. Storage Durability & Dynamic URL Renewal

1. **Durable Object Assertion:**
   - Before setting status to `'completed'`, `assertStoredObject()` inspects Cloud Storage metadata:
     - MP4 file size must be $\ge 10,000 \text{ bytes}$ (`MIN_REEL_BYTES`).
     - JPG thumbnail size must be $\ge 1 \text{ byte}$.
2. **Fresh URL Regeneration (`withFreshReelUrls`):**
   - Cloud Storage V4 signed URLs expire after 7 days.
   - On every dashboard or detail page read, `withFreshReelUrls()` re-signs short-lived read URLs using the durable storage paths (`outputStoragePath` / `thumbnailStoragePath`), ensuring zero expired link failures for returning customers.

---

## 6. Dashboard & Playback User Experience

### Component Hierarchy & Capabilities
- **`ReelGenerationProgress.tsx`:**
  - Displays animated status indicators via `MitraMark` and `motion/react`.
  - Stages title and subtitle copy mapped via `REEL_STATUS_COPY`.
  - Offers background webhook email registration (`registerReelWebhook`) for jobs exceeding 30s.
  - Displays clear error callouts and retry buttons on failed attempts.
- **`ReelPreview.tsx`:**
  - HTML5 Video player rendered in 9:16 portrait aspect ratio (`aspect-[9/16]`).
  - Native poster image preview (`thumbnailUrl`).
  - 1-click **Download Reel** button linked to forced-download signed URL (`downloadUrl`).
  - Integrated `CreativeFeedbackControls` for user feedback logging.

---

## 7. Required End-to-End Test Matrix

| Test Scenario | Verification Procedure | Result |
| :--- | :--- | :---: |
| **Page Refresh During Render** | Refreshed browser tab while status was `'rendering'`. `watchReel` re-subscribed to Firestore and resumed live progress seamlessly. | **PASS** |
| **Duplicate Job Submission** | Triggered `generateReel` twice with identical `idempotencyKey`. Second call returned `{ alreadyInProgress: true }` with 0 additional credit charges. | **PASS** |
| **Missing Object Detection** | Simulated empty 0-byte MP4 upload. `assertStoredObject` threw an exception, status changed to `'failed'`, and credits were refunded. | **PASS** |
| **Expired Link Resumption** | Tested reel document created 10 days prior. `withFreshReelUrls()` re-generated valid V4 signed URLs upon read. | **PASS** |
| **Tenant Access Control** | Attempted to fetch reel from non-owner user ID. Firestore rules and `verifyBusinessAccess` blocked access with `permission-denied`. | **PASS** |

---

## 8. Phase 4 Exit Decision

All Phase 4 asynchronous job lifecycle, progress persistence, storage assertion, dynamic URL renewal, and dashboard player integration requirements have been verified.

**Phase 4 Status:** **COMPLETE (GO FOR PHASE 5 FINAL LAUNCH AUTHORIZATION)**
