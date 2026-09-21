import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

export interface IdempotencyOptions {
  ttlSeconds?: number;
}

export async function checkIdempotency(
  idempotencyKey: string,
  options: IdempotencyOptions = {}
): Promise<{ exists: boolean; data?: any }> {
  const ref = db.collection('idempotency_keys').doc(idempotencyKey);
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data();
    if (data?.['status'] === 'completed') {
      return { exists: true, data: data['result'] };
    }
    if (data?.['status'] === 'processing') {
      throw new HttpsError('aborted', 'Request already in progress');
    }
  }
  return { exists: false };
}

export async function setIdempotencyProcessing(
  idempotencyKey: string,
  options: IdempotencyOptions = {}
): Promise<void> {
  const ref = db.collection('idempotency_keys').doc(idempotencyKey);
  await ref.set({
    status: 'processing',
    createdAt: FieldValue.serverTimestamp(),
    ttl: options.ttlSeconds || 3600,
  });
}

export async function setIdempotencyCompleted(
  idempotencyKey: string,
  result: any,
  options: IdempotencyOptions = {}
): Promise<void> {
  const ref = db.collection('idempotency_keys').doc(idempotencyKey);
  await ref.set({
    status: 'completed',
    result,
    completedAt: FieldValue.serverTimestamp(),
    ttl: options.ttlSeconds || 3600,
  });
}

export async function setIdempotencyFailed(
  idempotencyKey: string,
  error: Error,
  options: IdempotencyOptions = {}
): Promise<void> {
  const ref = db.collection('idempotency_keys').doc(idempotencyKey);
  await ref.set({
    status: 'failed',
    error: error.message,
    failedAt: FieldValue.serverTimestamp(),
    ttl: options.ttlSeconds || 3600,
  });
}

export async function withIdempotency<T>(
  idempotencyKey: string,
  fn: () => Promise<T>,
  options: IdempotencyOptions = {}
): Promise<T> {
  const existing = await checkIdempotency(idempotencyKey, options);
  if (existing.exists) {
    return existing.data;
  }

  await setIdempotencyProcessing(idempotencyKey, options);
  try {
    const result = await fn();
    await setIdempotencyCompleted(idempotencyKey, result, options);
    return result;
  } catch (error) {
    await setIdempotencyFailed(idempotencyKey, error as Error, options);
    throw error;
  }
}
