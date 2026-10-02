import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { refundReservation } from '../../services/usageControl';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

/**
 * M2 (Pass 2 fix plan) — financial-integrity reconciliation for stuck
 * credit reservations.
 *
 * A reservation (transactions/{operationId}, status:'pending') is created
 * BEFORE generation starts and only ever leaves 'pending' via
 * finalizeReservation (success) or refundReservation (failure) — both
 * called from executeWithUsageControl's try/catch (usageControl.ts). If
 * the process is killed between those two points — a Cloud Function hard
 * timeout (timeoutSeconds: 540 on generateCampaignStrategy/regenerateAsset),
 * an instance crash, OOM, or a deploy interrupting an in-flight invocation —
 * there is no platform-level `finally` that can run, so the reservation
 * (and the credits it holds) are stuck 'pending' forever with nothing to
 * ever resolve them. This is the one and only place that recovers them.
 *
 * Conservative by construction:
 *  - Only reservations older than STALE_THRESHOLD_MS are touched — chosen
 *    comfortably past every relevant function's hard timeout (540s / 9min),
 *    so a reservation this old cannot still be a legitimately in-flight
 *    generation; the function that would finalize/refund it is physically
 *    no longer running.
 *  - If the associated campaign (by metadata.idempotencyKey) has already
 *    reached a terminal status, this is skipped — the normal path already
 *    handled it (or is in the process of doing so) and touching it here
 *    would race with that.
 *  - refundReservation itself is the same idempotent, state-checked
 *    function the normal failure path uses (transaction-based; throws
 *    ALREADY_FINALIZED/ALREADY_REFUNDED rather than double-refunding), so
 *    a race between this job and a normal finalize/refund resolves safely
 *    either way — never a double refund, never refunding a completed charge.
 *  - Every reservation is scoped to its own userId (read from the
 *    transaction doc itself, never inferred or cross-referenced), so this
 *    can never touch another tenant's credits.
 */
const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes — see doc comment above
const TERMINAL_CAMPAIGN_STATUSES = ['verified', 'failed', 'generated'];

export const reconcileStaleReservations = onSchedule(
  { schedule: 'every 10 minutes', region: 'asia-south1', timeoutSeconds: 300 },
  async () => {
    const { logger, startTime } = logFunctionStart('reconcileStaleReservations', {});
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALE_THRESHOLD_MS);

    let reconciled = 0;
    let skippedTerminal = 0;
    let errors = 0;

    try {
      const staleSnap = await db
        .collection('transactions')
        .where('status', '==', 'pending')
        .where('createdAt', '<', cutoff)
        .get();

      for (const doc of staleSnap.docs) {
        const operationId = doc.id;
        const tx = doc.data();
        const userId = tx['userId'] as string | undefined;

        if (!userId) {
          // Malformed/legacy record — never guess an owner for a credit
          // operation. Logged, not silently skipped, so it's visible for
          // manual investigation.
          errors++;
          logger.error('Stale reservation has no userId; cannot safely reconcile', undefined, {
            operationId,
          });
          continue;
        }

        try {
          const campaignSnap = await db
            .collection('campaigns')
            .where('metadata.idempotencyKey', '==', operationId)
            .limit(1)
            .get();

          if (!campaignSnap.empty) {
            const campaignDoc = campaignSnap.docs[0]!;
            const status = campaignDoc.data()['status'] as string;
            if (TERMINAL_CAMPAIGN_STATUSES.includes(status)) {
              // Already resolved through the normal path — do not touch.
              skippedTerminal++;
              continue;
            }
          }

          await refundReservation(operationId, userId);

          if (!campaignSnap.empty) {
            await campaignSnap.docs[0]!.ref.update({
              status: 'failed',
              error: {
                code: 'GENERATION_TIMEOUT',
                message:
                  'Generation did not complete in time and was automatically reconciled. No charge was applied.',
              },
              updatedAt: new Date().toISOString(),
            });
          }

          reconciled++;
        } catch (error) {
          // ALREADY_FINALIZED/ALREADY_REFUNDED here means a concurrent
          // normal finalize/refund won the race — expected and safe, not
          // a real error, but still counted so the run's summary is honest
          // about what it actually did vs. what it found already resolved.
          const code = (error as { code?: string })?.code;
          if (code === 'ALREADY_FINALIZED' || code === 'ALREADY_REFUNDED') {
            skippedTerminal++;
          } else {
            errors++;
            logFunctionError(logger, startTime, error as Error, { operationId });
          }
        }
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        scanned: staleSnap.size,
        reconciled,
        skippedTerminal,
        errors,
      });
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw error;
    }
  }
);
