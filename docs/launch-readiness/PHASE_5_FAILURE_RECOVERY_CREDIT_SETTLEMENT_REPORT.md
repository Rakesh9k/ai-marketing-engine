# Phase 5 — Failure Recovery, Resource Cleanup & Exactly-Once Credit Settlement Report

**Service:** `ai-marketing-engine` & `services/reel-renderer`  
**Date:** October 9, 2026  
**Status:** PHASE 5 COMPLETE — GO FOR FINAL LAUNCH AUTHORIZATION  

---

## 1. Credit Lifecycle & Financial Ledger Architecture

Mitra enforces an integer-unit, single-ledger credit accounting model backed by atomic Firestore transactions (`functions/src/services/usageControl.ts`).

```
                              CREDIT TRANSACTION LIFECYCLE
                              ----------------------------
  [User Action] ──> checkGenerationEligibility (Fast-fail pre-check)
                           │
                           v
              reserveCreditsForOperation (Atomic Firestore Transaction)
                           │
             ┌─────────────┴─────────────┐
             │ Status: 'pending'         │ (Credits deducted from available balance)
             │ Amount: -50 (Integer)     │
             └─────────────┬─────────────┘
                           │
             ┌─────────────┴─────────────┐
             │   Execute Generation      │
             └─────────────┬─────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        v (Success)                           v (Failure / Exception)
  finalizeReservation                  refundReservation
  - Transaction Status: 'completed'    - Transaction Status: 'refunded'
  - Balance Settled                    - Refund Doc: 'refund_{opId}'
                                       - creditsUsed Decremented
```

### Authoritative Ledger Documents
- **`usage/{userId}_{periodStart}`:** Records period credit limits (`planId`), `creditsUsed`, `bonusCredits`, and timestamp boundaries (`currentPeriodStart()`).
- **`transactions/{operationId}`:** Transaction record with status `'pending'`, `'completed'`, `'refunded'`, or `'expired'`.

---

## 2. Compliance with the 10 Financial Invariants

| # | Financial Invariant | Implementation & Verification Evidence |
| :-: | :--- | :--- |
| **1** | **Single Reservation Per Operation** | `reserveCreditsForOperation()` enforces single reservation via atomic `transactions/{operationId}` check. |
| **2** | **No Double-Refunds** | `refundReservation()` checks `status === 'refunded'` and returns early with `alreadyRefunded: true`. |
| **3** | **No Late Refund of Completed Jobs** | `refundReservation()` throws `ALREADY_FINALIZED` if transaction status is `'completed'`. |
| **4** | **No Duplicate Charges on Retries** | Duplicate calls with identical `idempotencyKey` return `isIdempotentReplay: true` (0 new charges). |
| **5** | **No Blind Refund on Failed Retries** | `executeWithUsageControl()` catches `DUPLICATE_REQUEST_IN_PROGRESS` and skips refunding active holds. |
| **6** | **Strict Tenant Ownership** | `refundReservation()` validates `transaction.userId === userId` or throws `UNAUTHORIZED`. |
| **7** | **Durable Audit Trail** | Every reservation, completion, and refund writes immutable `transactions` records with server timestamps. |
| **8** | **Eventually Consistent Settlement** | `cleanupExpiredReservations()` periodically sweeps pending holds older than 15 minutes. |
| **9** | **Crash Recovery** | Server crashes during render are caught by function wrappers or cleaned up via expiration sweep. |
| **10** | **Integer Arithmetic Only** | All credit costs (`PRICING.reelGenerationCredits = 50`) are positive integers. Floating-point units prohibited. |

---

## 3. Temporary File & Subprocess Resource Cleanup

### Container Scratch Directory Lifecycle (`services/reel-renderer/src/lib/tempDir.ts`)

```typescript
export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await createTempDir(prefix); // Creates /tmp/reel-{prefix}-{uuid}
  try {
    return await fn(dir);
  } finally {
    await removeTempDir(dir); // Safe fs.rm(dir, { recursive: true, force: true })
  }
}
```

- **Path Isolation:** Every render job creates a unique directory (`os.tmpdir()/reel-render-<uuid>`). Concurrent jobs never collide.
- **`try ... finally` Guarantee:** Temp folders are purged regardless of render success, FFmpeg crash, or timeout.
- **Subprocess Isolation:** FFmpeg process execution (`runFfmpeg`) runs via Node `execFile` with explicit execution timeouts and unprivileged container permissions (`appuser`).

---

## 4. Safe Media Processing & Input Hardening

1. **Clip Quantity Ceiling:** Enforces `MAX_REEL_CLIPS = 6` to bound memory and CPU usage.
2. **FFprobe Pre-validation:** Inspects input video dimensions, duration, and stream codecs (`probeVideo()`) before filtergraph construction.
3. **Command Hardening:** Subprocess calls pass arguments as explicit string arrays (`execFile`). **Zero shell string interpolation or `eval()` syntax.**
4. **Controlled Storage Referencing:** Media files are accessed exclusively through authenticated GCS storage paths (`businesses/{bizId}/assets/...`), preventing SSRF or unauthorized arbitrary URL fetching.

---

## 5. Reconciliation & Operational Repair

Operational maintenance is supported via `cleanupExpiredReservations(maxAgeMinutes=15)`:
- Queries `transactions` where `type == 'reservation'` and `status == 'pending'`.
- Releases orphaned reservations older than 15 minutes by decrementing `usage.creditsUsed`.
- Updates transaction status to `'expired'`.
- Preserves full audit logs for accounting reconciliation.

---

## 6. Fault-Injection Test Matrix

| Test Scenario | Injection Method | Expected Behavior | Actual Result |
| :--- | :--- | :--- | :---: |
| **1. Failure Pre-Reservation** | Pass invalid `businessId` | Function fails before transaction. 0 credits reserved. | **PASS** |
| **2. FFmpeg Execution Crash** | Inject invalid crop syntax | Render throws error, `refundReservation` executes atomically. | **PASS** |
| **3. Duplicate Request In-Flight** | Call twice with same `idempotencyKey` | 2nd call throws `DUPLICATE_REQUEST_IN_PROGRESS`, 0 extra charge. | **PASS** |
| **4. Duplicate Refund Attempt** | Call `refundReservation` twice | 1st call refunds, 2nd returns `{ alreadyRefunded: true }`. | **PASS** |
| **5. Late Failure After Completion** | Attempt refund on completed job | Throws `ALREADY_FINALIZED`. Credits remain settled. | **PASS** |
| **6. Cross-Tenant Refund Attempt** | Pass User B ID for User A job | Throws `UNAUTHORIZED`. Refund aborted. | **PASS** |
| **7. Storage Upload Failure** | Simulate GCS 503 error | `assertStoredObject` throws exception, credits refunded. | **PASS** |
| **8. Container Disk Cleanup** | Abort job mid-render | `withTempDir` `finally` block purges `/tmp` directory. | **PASS** |

---

## 7. Phase 5 Exit Decision

All financial invariants, idempotent settlement rules, temp dir resource cleanup, input media hardening, and fault-recovery tests have been verified.

**Phase 5 Status:** **COMPLETE (GO FOR FINAL LAUNCH AUTHORIZATION)**
