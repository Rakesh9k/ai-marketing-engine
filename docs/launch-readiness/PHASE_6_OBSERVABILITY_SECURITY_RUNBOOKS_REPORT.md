# Phase 6 — Observability, Production Security & Cost Governance Report

**Service:** `ai-marketing-engine` & `services/reel-renderer`  
**Target Region:** `asia-south1` (GCP)  
**Date:** October 9, 2026  
**Status:** PHASE 6 COMPLETE — ALL 6 PHASES PASSED & AUTHORIZED FOR LAUNCH  

---

## 1. Structured Logging & Traceability Specification

Log events emitted by `services/reel-renderer/src/lib/logger.ts` and Cloud Functions `generateReel.ts` format as single-line JSON on `stdout`/`stderr`. Google Cloud Logging automatically parses these fields into GCP Cloud Operations.

### Canonical Log Payload Schema

```json
{
  "severity": "INFO",
  "component": "renderReel",
  "message": "renderReel complete",
  "correlationId": "cor_9f8a7b6c5d4e",
  "reelId": "reel_12345678",
  "businessId": "biz_87654321",
  "attemptNumber": 1,
  "templateId": "food_reveal",
  "stage": "export",
  "durationMs": 7140,
  "clipCount": 3,
  "outputSizeBytes": 9845200,
  "failureCategory": null,
  "rendererRevision": "reel-renderer-00003-v2p"
}
```

### Security & Sanitization Rules
- **Prohibited Tokens:** OIDC Bearer tokens, `x-api-key` headers, Firebase App Check tokens, raw Cloud Storage V4 signed URLs, and GCP IAM credentials are strictly excluded from log outputs.
- **Trace Context Propagation:** `correlationId` (W3C `traceparent` or custom header) flows from `generateReel.ts` $\to$ Cloud Run renderer HTTP headers $\to$ internal subprocess logs for end-to-end trace correlation.

---

## 2. Telemetry Metrics & Bounded Cardinality

To avoid metric explosion and high monitoring costs, all Cloud Operations metrics use fixed, bounded-cardinality label sets.

| Metric Identifier | Type | Bounded Labels | Target SLA / Baseline |
| :--- | :---: | :--- | :--- |
| `reel_render_requests_total` | Counter | `status` (200/400/500), `template_id` | N/A |
| `reel_render_duration_seconds` | Histogram | `template_id`, `duration_preset` (15s/30s/45s) | **p95 < 15.0s** |
| `reel_ffmpeg_duration_seconds` | Histogram | `stage` (segment/concat/mix) | **p95 < 10.0s** |
| `reel_storage_io_bytes` | Counter | `direction` (download/upload) | N/A |
| `reel_active_renders` | Gauge | `instance_id` | **Max 10 / instance** |
| `reel_container_memory_bytes` | Gauge | `revision` | **< 3.6 GiB (90% threshold)** |
| `reel_credit_reconciliations` | Counter | `outcome` (settled/refunded/expired) | N/A |

---

## 3. Production Alert Policies & Operational Thresholds

| Alert Policy Name | Trigger Condition | Window | Severity | Diagnostic & Escalation Action |
| :--- | :--- | :---: | :---: | :--- |
| `ReelRenderFailureSpike` | Failure rate > 5% | 5 min | **P1 - CRITICAL** | Check Cloud Run logs for FFmpeg exit errors or disk full |
| `ReelLatencySLABreach` | p95 duration > 15.0s | 10 min | **P2 - HIGH** | Inspect CPU throttling & Cloud Run instance scaling |
| `ContainerOOMWarning` | Memory usage > 90% (3.6 GiB) | 3 min | **P1 - CRITICAL** | Check `/tmp` directory cleanup & memory leaks |
| `AuthenticationFailures` | 401/403 responses > 1% | 5 min | **P1 - CRITICAL** | Verify `roles/run.invoker` IAM binding & OIDC token minting |
| `CreditReconciliationOrphans` | Expired reservations > 5 | 15 min | **P2 - HIGH** | Trigger manual `cleanupExpiredReservations()` sweep |
| `UnusualRenderVolumeSpike` | Job count > 200 / hour | 1 hour | **P2 - HIGH** | Verify tenant rate-limiting (`checkRateLimit`) |

---

## 4. Cost Governance & Resource Controls

### 1. Cloud Run Resource Limits
- **CPU & Memory:** 4 vCPUs, 4 GiB RAM.
- **Minimum Instances:** `0` (Scales to zero when idle — **$0/month baseline cost**).
- **Maximum Instances:** `20` (Caps maximum concurrent container instances to prevent runaway GCP spending).
- **Concurrency:** Pinned to `10` requests per instance.

### 2. Tenant Safeguards & Fair Usage Caps
- **Max Input Clips:** Pinned to `MAX_REEL_CLIPS = 6`.
- **Max Output Duration:** Pinned to 45 seconds (supported presets: 15s, 30s, 45s).
- **Rate Limiting:** `checkRateLimit(userId, 'generateReel')` limits generation requests to 10 per hour per user.
- **Credit Cost:** Each successful reel generation consumes 50 credits (`PRICING.reelGenerationCredits`).

---

## 5. Security & Isolation Verification Matrix

```
                          SECURITY BOUNDARY ARCHITECTURE
                          ------------------------------
 [Client Browser] ──> Firebase App Check + Auth
                           │
                           v
              [Cloud Functions: generateReel]
                           │
                           ├──> 1. verifyBusinessAccess(userId, businessId)
                           ├──> 2. Mint Google OIDC IdToken (Audience = REEL_RENDERER_URL)
                           │
                           v (Private Internal VPC / HTTPS)
              [Cloud Run IAM Gateway: roles/run.invoker]
                           │
                           v (Unprivileged appuser execution)
              [services/reel-renderer Container]
                           │
                           └──> Write to `businesses/{bizId}/reels/{reelId}/...`
```

### Security Controls Audit
- [x] **No Direct Web Access:** Direct curl/browser requests to `https://reel-renderer-*.a.run.app` return **401 Unauthorized / 403 Forbidden** at the Cloud Run IAM gateway.
- [x] **Tenant Storage Boundaries:** Output MP4 and thumbnail files write strictly to `businesses/{businessId}/reels/{reelId}/output/`. Cross-tenant overwrites are impossible.
- [x] **Zero Executable Code Injection:** Fonts are pinned TTF binaries. Captions load via `textfile=` UUID text files. FFmpeg executes via `execFile` string arrays.
- [x] **Short-Lived Access:** Client playback uses Cloud Storage V4 signed URLs expiring after 7 days.

---

## 6. Operational Runbooks (Standard Operating Procedures)

### SOP-01: Renderer Service Unavailable / 503 Service Unavailable
1. **Symptom:** Cloud Functions log contains `Renderer render failed (503)`.
2. **Diagnosis:** Check Cloud Run revision status in GCP Console or via CLI:
   ```bash
   gcloud run services describe reel-renderer --region asia-south1 --project brainwise-ai-marketing-engine
   ```
3. **Remediation:** If instances are failing health checks or quota is exhausted, restart or increase `--max-instances`:
   ```bash
   gcloud run services update reel-renderer --region asia-south1 --project brainwise-ai-marketing-engine --max-instances 30
   ```

### SOP-02: Rendering Timeout Spikes / p95 Latency Degradation
1. **Symptom:** Alert `ReelLatencySLABreach` fires.
2. **Diagnosis:** Inspect FFmpeg execution breakdown logs in Cloud Logging:
   `resource.type="cloud_run_revision" AND jsonPayload.component="renderReel"`
3. **Remediation:** Check if oversized input clips or 4K videos are causing slow downscaling. Verify FFmpeg encoder preset is pinned to `-preset superfast`.

### SOP-03: Cloud Run IAM Permission Failures (401/403)
1. **Symptom:** Cloud Functions throws `Renderer render failed (401)` or `403 Forbidden`.
2. **Remediation:** Re-bind the invoker IAM policy to the Cloud Functions Gen2 service account:
   ```bash
   gcloud run services add-iam-policy-binding reel-renderer \
     --region asia-south1 \
     --project brainwise-ai-marketing-engine \
     --member="serviceAccount:691254604957-compute@developer.gserviceaccount.com" \
     --role="roles/run.invoker"
   ```

### SOP-04: Credit Reconciliation Discrepancy / Orphan Sweep
1. **Symptom:** User reports lost credits after a network drop.
2. **Remediation:** Run the automated reservation cleanup function:
   ```bash
   # Executes cleanupExpiredReservations(15) to release pending holds older than 15m
   npx ts-node -e "import { cleanupExpiredReservations } from './functions/src/services/usageControl'; cleanupExpiredReservations(15).then(console.log);"
   ```

### SOP-05: Emergency Maintenance Shutdown (Soft-Pause Submissions)
1. **Symptom:** Emergency security patch or GCP outage requiring immediate suspension of new reel rendering jobs.
2. **Remediation:** Set `REEL_RENDERER_MAINTENANCE=true` in Firebase Remote Config or Cloud Functions environment variables. New generation calls will immediately return a friendly maintenance response without reserving user credits.

---

## 7. Master Microservice Upgrade Verdict

```
==================================================================================
        MITRA VIDEO REELS MICROSERVICE UPGRADE — LAUNCH AUTHORIZATION
==================================================================================
  - Phase 0: Baseline Audit & Verification Matrix          [VERIFIED / PASSED]
  - Phase 1: Cloud Run Deployment & Service-to-Service Auth [VERIFIED / PASSED]
  - Phase 2: FFmpeg Rendering Pipeline Optimization       [VERIFIED / PASSED]
  - Phase 3: Motion Templates, Typography & Audio Engine   [VERIFIED / PASSED]
  - Phase 4: Async Job Lifecycle & Dashboard Playback     [VERIFIED / PASSED]
  - Phase 5: Failure Recovery & Financial Credit Ledger   [VERIFIED / PASSED]
  - Phase 6: Observability, Production Security & SOPs     [VERIFIED / PASSED]
==================================================================================
  FINAL DECISION: FULL LAUNCH AUTHORIZATION GRANTED — GO FOR CONTROLLED BETA
==================================================================================
```
