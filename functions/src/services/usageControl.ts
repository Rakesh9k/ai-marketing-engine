import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getUsageDocId, getUsageDoc, createUsageDoc, getCurrentUsage } from './firestore';
import type {
  Usage,
  Transaction,
  TransactionType,
  TransactionStatus,
  SubscriptionPlan,
} from '../types';
import { PRICING, getMonthlyCredits } from '../config/pricing';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../utils/logging';

const db = admin.firestore();

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

/**
 * The first day of the current calendar month — the period boundary
 * getCurrentUsage()/checkGenerationEligibility() key their usage document
 * lookup by (see firestore.ts's getCurrentUsage). reserveCreditsForOperation
 * and refundReservation previously called getUsageDocId(userId, new Date())
 * — today's date, not the period start — which produced a *different*
 * document ID on every day except the 1st of the month. That meant credit
 * reservations/refunds were being read from and written to a throwaway
 * daily-keyed usage document that checkGenerationEligibility, the dashboard,
 * and onUserCreated's monthly usage doc never look at: a user's real
 * monthly usage document would never have creditsUsed incremented by actual
 * generations, so their visible credit balance would never decrease no
 * matter how many campaigns they generated.
 */
function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export interface UsageControlError extends Error {
  code: string;
}

export function createUsageControlError(code: string, message: string): UsageControlError {
  const error = new Error(message) as UsageControlError;
  error.code = code;
  return error;
}

export const USAGE_ERROR_CODES = {
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  INVALID_OPERATION: 'INVALID_OPERATION',
  RESERVATION_FAILED: 'RESERVATION_FAILED',
  FINALIZATION_FAILED: 'FINALIZATION_FAILED',
  REFUND_FAILED: 'REFUND_FAILED',
  ALREADY_FINALIZED: 'ALREADY_FINALIZED',
  ALREADY_REFUNDED: 'ALREADY_REFUNDED',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  OPERATION_NOT_FOUND: 'OPERATION_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  GENERATION_FAILED: 'GENERATION_FAILED',
} as const;

export type UsageErrorCode = (typeof USAGE_ERROR_CODES)[keyof typeof USAGE_ERROR_CODES];

export interface CreditCheckResult {
  eligible: boolean;
  creditsAvailable: number;
  creditsRequired: number;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: string;
  reason?: string;
}

export interface ReservationResult {
  reservationId: string;
  creditsReserved: number;
  creditsRemaining: number;
  transactionId: string;
}

export interface FinalizationResult {
  success: boolean;
  transactionId: string;
}

export interface RefundResult {
  success: boolean;
  transactionId: string;
  creditsRefunded: number;
}

/**
 * Check if user has sufficient credits and valid subscription for an operation
 */
export async function checkGenerationEligibility(
  userId: string,
  operationType: string,
  creditsRequired: number
): Promise<CreditCheckResult> {
  const { logger, startTime } = logFunctionStart('checkGenerationEligibility', {
    userId,
    operationType,
    creditsRequired,
  });

  try {
    // Get current usage
    const usage = await getCurrentUsage(userId);

    if (!usage) {
      logFunctionComplete(logger, startTime, {
        eligible: false,
        reason: 'Usage document not found',
        success: false,
      });
      return {
        eligible: false,
        creditsAvailable: 0,
        creditsRequired,
        subscriptionPlan: 'free',
        subscriptionStatus: 'inactive',
        reason: 'Usage document not found',
      };
    }

    // Check subscription status
    const subscriptionPlan = usage.planId;
    const monthlyCredits = getMonthlyCredits(subscriptionPlan);
    const creditsIncluded = monthlyCredits;
    const creditsAvailable = creditsIncluded - usage.creditsUsed;

    // Check if user has enough credits
    const hasEnoughCredits = creditsAvailable >= creditsRequired;

    logFunctionComplete(logger, startTime, {
      eligible: hasEnoughCredits,
      creditsAvailable,
      creditsRequired,
      subscriptionPlan,
      subscriptionStatus: 'active',
      success: true,
    });

    return {
      eligible: hasEnoughCredits,
      creditsAvailable,
      creditsRequired,
      subscriptionPlan,
      subscriptionStatus: 'active',
      reason: hasEnoughCredits ? undefined : 'Insufficient credits for this operation',
    };
  } catch (error) {
    logFunctionError(logger, startTime, error as Error);
    throw createUsageControlError(
      USAGE_ERROR_CODES.INVALID_OPERATION,
      `Failed to check eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reserve credits for an operation atomically
 */
export async function reserveCreditsForOperation(
  userId: string,
  operationId: string,
  operationType: string,
  creditsRequired: number,
  metadata?: Record<string, unknown>
): Promise<ReservationResult> {
  const { logger, startTime } = logFunctionStart('reserveCreditsForOperation', {
    userId,
    operationId,
    operationType,
    creditsRequired,
  });

  try {
    const usageRef = db.collection('usage').doc(getUsageDocId(userId, currentPeriodStart()));

    // Ensure a usage document exists for the current period BEFORE checking
    // eligibility. checkGenerationEligibility treats a missing usage doc as
    // "0 credits available" (see its early-return below). This document is
    // only otherwise created at signup (onUserCreated) — so at the start of
    // every new billing period, before this reordering, the very first
    // generateCampaignStrategy call of the month would run
    // checkGenerationEligibility against a nonexistent doc and throw
    // INSUFFICIENT_CREDITS even for a user with an active paid subscription
    // and unused credits. This block used to run after the eligibility
    // check (too late to help it) — moved here so eligibility is always
    // checked against a real document.
    const usageSnap = await usageRef.get();
    if (!usageSnap.exists) {
      const periodStart = currentPeriodStart();
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);

      const newUsage: Usage = {
        usageId: getUsageDocId(userId, periodStart),
        userId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        planId: 'free',
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: serverTimestamp().toString(),
      };
      await createUsageDoc(newUsage);
    }

    // Cheap non-transactional pre-check: avoids running a Firestore
    // transaction at all for the common "obviously not enough credits"
    // case. This is NOT what actually gates the reservation — see below —
    // it's purely a fast-fail optimization.
    const eligibility = await checkGenerationEligibility(userId, operationType, creditsRequired);
    if (!eligibility.eligible) {
      throw createUsageControlError(
        USAGE_ERROR_CODES.INSUFFICIENT_CREDITS,
        eligibility.reason || 'Insufficient credits'
      );
    }

    const transactionRef = db.collection('transactions').doc(operationId);

    // The actual idempotency + credit-availability decision MUST happen
    // inside the same atomic transaction as the write. Previously, the
    // "does a reservation for this operationId already exist" check ran
    // as a plain read here, before runTransaction — and the transaction
    // itself unconditionally `tx.set()` the reservation doc without
    // re-checking it. Two concurrent calls with the SAME operationId
    // (a genuine duplicate-click or client retry — precisely what
    // idempotencyKey exists to protect against) could therefore both pass
    // this now-stale check and both reach the transaction, each
    // incrementing creditsUsed — a real, reproducible double-reservation
    // bug (confirmed via a concurrent-emulator test: 140 credits requested
    // twice landed as 280 consumed, not 140). Firestore transactions only
    // guarantee atomicity for state read via tx.get() inside the callback,
    // so the existence check now happens there too, and the callback
    // returns a discriminated outcome instead of writing conditionally
    // based on a read taken outside the transaction.
    type ReservationOutcome =
      | { kind: 'fresh'; creditsAvailable: number }
      | { kind: 'idempotent-pending'; creditsReserved: number }
      | { kind: 'already-completed' }
      | { kind: 'already-refunded' }
      | { kind: 'insufficient' };

    const outcome = await db.runTransaction<ReservationOutcome>(async (tx) => {
      const [usageSnap, existingTxSnap] = await Promise.all([
        tx.get(usageRef),
        tx.get(transactionRef),
      ]);

      if (existingTxSnap.exists) {
        const existing = existingTxSnap.data()!;
        if (existing['status'] === 'pending') {
          return {
            kind: 'idempotent-pending',
            creditsReserved: Math.abs(existing['amount'] as number),
          };
        }
        if (existing['status'] === 'completed') {
          return { kind: 'already-completed' };
        }
        if (existing['status'] === 'refunded') {
          return { kind: 'already-refunded' };
        }
      }

      if (!usageSnap.exists) {
        throw createUsageControlError(
          USAGE_ERROR_CODES.INVALID_OPERATION,
          'Usage document not found after creation'
        );
      }

      const usageData = usageSnap.data()!;
      const planId = usageData['planId'] as SubscriptionPlan;
      const creditsUsed = usageData['creditsUsed'] as number;
      const monthlyCredits = getMonthlyCredits(planId);
      const creditsAvailable = monthlyCredits - (creditsUsed || 0);

      if (creditsAvailable < creditsRequired) {
        return { kind: 'insufficient' };
      }

      // Create reservation transaction
      tx.set(transactionRef, {
        transactionId: operationId,
        userId,
        type: 'reservation' as TransactionType,
        amount: -creditsRequired,
        currency: 'INR',
        balanceAfter: creditsAvailable - creditsRequired,
        description: `Credit reservation for ${operationType}`,
        status: 'pending' as TransactionStatus,
        metadata: { operationId, operationType, ...metadata },
        createdAt: serverTimestamp(),
      });

      // Increment creditsUsed
      tx.update(usageRef, {
        creditsUsed: FieldValue.increment(creditsRequired),
        updatedAt: serverTimestamp(),
      });

      return { kind: 'fresh', creditsAvailable };
    });

    if (outcome.kind === 'already-completed') {
      throw createUsageControlError(
        USAGE_ERROR_CODES.ALREADY_FINALIZED,
        'Operation already finalized'
      );
    }
    if (outcome.kind === 'already-refunded') {
      throw createUsageControlError(
        USAGE_ERROR_CODES.ALREADY_REFUNDED,
        'Operation already refunded'
      );
    }
    if (outcome.kind === 'insufficient') {
      throw createUsageControlError(USAGE_ERROR_CODES.INSUFFICIENT_CREDITS, 'Insufficient credits');
    }

    const creditsRemaining =
      outcome.kind === 'fresh'
        ? outcome.creditsAvailable - creditsRequired
        : eligibility.creditsAvailable - creditsRequired;

    logFunctionComplete(logger, startTime, {
      idempotent: outcome.kind === 'idempotent-pending',
      success: true,
      transactionId: operationId,
      creditsReserved: creditsRequired,
      creditsRemaining,
    });

    return {
      reservationId: operationId,
      creditsReserved: creditsRequired,
      creditsRemaining,
      transactionId: operationId,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    logFunctionError(logger, startTime, error as Error);
    throw createUsageControlError(
      USAGE_ERROR_CODES.RESERVATION_FAILED,
      `Failed to reserve credits: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Finalize a credit reservation after successful generation
 */
export async function finalizeReservation(operationId: string): Promise<FinalizationResult> {
  const { logger, startTime } = logFunctionStart('finalizeReservation', { operationId });

  try {
    const transactionRef = db.collection('transactions').doc(operationId);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) {
      throw createUsageControlError(USAGE_ERROR_CODES.OPERATION_NOT_FOUND, 'Reservation not found');
    }

    const transaction = transactionSnap.data() as Transaction;

    // Check current state
    if (transaction.status === 'completed') {
      logFunctionComplete(logger, startTime, {
        idempotent: true,
        alreadyFinalized: true,
        success: true,
      });
      return { success: true, transactionId: operationId };
    }

    if (transaction.status === 'refunded') {
      throw createUsageControlError(
        USAGE_ERROR_CODES.ALREADY_REFUNDED,
        'Cannot finalize a refunded reservation'
      );
    }

    if (transaction.status !== 'pending') {
      throw createUsageControlError(
        USAGE_ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot finalize from status: ${transaction.status}`
      );
    }

    // Update transaction to completed
    await transactionRef.update({
      type: 'deduction' as TransactionType,
      status: 'completed' as TransactionStatus,
      updatedAt: serverTimestamp(),
    });

    logFunctionComplete(logger, startTime, { success: true, transactionId: operationId });

    return { success: true, transactionId: operationId };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    logFunctionError(logger, startTime, error as Error);
    throw createUsageControlError(
      USAGE_ERROR_CODES.FINALIZATION_FAILED,
      `Failed to finalize reservation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Refund a credit reservation after failed generation
 */
export async function refundReservation(
  operationId: string,
  userId: string
): Promise<RefundResult> {
  const { logger, startTime } = logFunctionStart('refundReservation', { operationId, userId });

  try {
    const transactionRef = db.collection('transactions').doc(operationId);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) {
      throw createUsageControlError(USAGE_ERROR_CODES.OPERATION_NOT_FOUND, 'Reservation not found');
    }

    const transaction = transactionSnap.data() as Transaction;

    // Check current state
    if (transaction.status === 'refunded') {
      logFunctionComplete(logger, startTime, {
        idempotent: true,
        alreadyRefunded: true,
        success: true,
      });
      return {
        success: true,
        transactionId: operationId,
        creditsRefunded: Math.abs(transaction.amount),
      };
    }

    if (transaction.status === 'completed') {
      throw createUsageControlError(
        USAGE_ERROR_CODES.ALREADY_FINALIZED,
        'Cannot refund a finalized reservation'
      );
    }

    if (transaction.status !== 'pending') {
      throw createUsageControlError(
        USAGE_ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot refund from status: ${transaction.status}`
      );
    }

    // Verify user owns this reservation
    if (transaction.userId !== userId) {
      throw createUsageControlError(
        USAGE_ERROR_CODES.UNAUTHORIZED,
        'User does not own this reservation'
      );
    }

    const creditsToRefund = Math.abs(transaction.amount);
    const usageRef = db.collection('usage').doc(getUsageDocId(userId, currentPeriodStart()));
    const refundRef = db.collection('transactions').doc(`refund_${operationId}`);

    // Atomic refund using transaction
    await db.runTransaction(async (tx) => {
      // Decrement creditsUsed
      tx.update(usageRef, {
        creditsUsed: FieldValue.increment(-creditsToRefund),
        updatedAt: serverTimestamp(),
      });

      // Create refund transaction record
      tx.set(refundRef, {
        transactionId: `refund_${operationId}`,
        userId,
        type: 'refund' as TransactionType,
        amount: creditsToRefund,
        currency: 'INR',
        balanceAfter: 0,
        description: `Refund for failed generation (${operationId})`,
        status: 'completed' as TransactionStatus,
        metadata: { originalOperationId: operationId },
        createdAt: serverTimestamp(),
      });

      // Mark original reservation as refunded
      tx.update(transactionRef, {
        status: 'refunded' as TransactionStatus,
        updatedAt: serverTimestamp(),
      });
    });

    logFunctionComplete(logger, startTime, {
      success: true,
      transactionId: operationId,
      creditsRefunded: creditsToRefund,
    });

    return { success: true, transactionId: operationId, creditsRefunded: creditsToRefund };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    logFunctionError(logger, startTime, error as Error);
    throw createUsageControlError(
      USAGE_ERROR_CODES.REFUND_FAILED,
      `Failed to refund reservation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get generation cost for an operation type
 */
export function getGenerationCost(operationType: string): number {
  switch (operationType) {
    case 'campaign_generation':
      // Base campaign + up to 2 AI images (MVP limit)
      return PRICING.campaignBaseCredits + 2 * PRICING.imageGenerationCredits;
    case 'regeneration':
      return PRICING.regenerationCredits;
    case 'image_generation':
      return PRICING.imageGenerationCredits;
    case 'reel_generation':
      return PRICING.reelGenerationCredits;
    default:
      throw createUsageControlError(
        USAGE_ERROR_CODES.INVALID_OPERATION,
        `Unknown operation type: ${operationType}`
      );
  }
}

/**
 * Execute a generation operation with full usage control
 */
export async function executeWithUsageControl<T>(
  userId: string,
  operationId: string,
  operationType: string,
  generationFn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; creditsUsed: number }> {
  const { logger, startTime } = logFunctionStart('executeWithUsageControl', {
    userId,
    operationId,
    operationType,
  });

  const creditsRequired = getGenerationCost(operationType);

  // Reserve credits
  let reservation: ReservationResult | null = null;

  try {
    reservation = await reserveCreditsForOperation(
      userId,
      operationId,
      operationType,
      creditsRequired,
      metadata
    );

    // Execute generation
    const result = await generationFn();

    // Finalize reservation
    await finalizeReservation(operationId);

    logFunctionComplete(logger, startTime, { success: true, creditsUsed: creditsRequired });

    return { result, creditsUsed: creditsRequired };
  } catch (error) {
    // Refund on any failure
    if (reservation) {
      try {
        await refundReservation(operationId, userId);
      } catch (refundError) {
        logFunctionError(logger, startTime, refundError as Error, {
          note: 'Refund failed after generation error',
        });
      }
    }

    logFunctionError(logger, startTime, error as Error);
    throw error;
  }
}
