import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { createLogger } from '../utils/logging';

const db = admin.firestore();
const authzLogger = createLogger({ function: 'verifyBusinessAccess' });

export async function verifyAuth<T>(
  request: CallableRequest<T>
): Promise<{ userId: string; token: admin.auth.DecodedIdToken }> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  return {
    userId: request.auth.uid,
    token: request.auth.token,
  };
}

export async function verifyBusinessAccess(userId: string, businessId: string): Promise<void> {
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists) {
    authzLogger.warn('Business access denied: business not found', { userId, businessId });
    throw new HttpsError('not-found', 'Business not found');
  }
  const businessData = businessDoc.data() as { userId: string; agencyId?: string } | undefined;
  if (businessData?.userId !== userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() as { role?: string; agencyId?: string } | undefined;
    if (userData?.role !== 'agency_member' || userData?.agencyId !== businessData?.agencyId) {
      // Phase 11 hardened this exact check against role/agencyId
      // self-escalation. Logging every denial (never the two agencyIds
      // being compared, only that they mismatched) gives operators a way
      // to see a spike of these and recognize a probing attempt, not just
      // legitimate accidental cross-business access.
      authzLogger.warn('Business access denied: insufficient permissions', {
        userId,
        businessId,
      });
      throw new HttpsError('permission-denied', 'Access denied to business');
    }
  }
}

export async function verifyAuthAndBusinessAccess<T extends Record<string, any>>(
  request: CallableRequest<T>,
  businessIdField = 'businessId' as keyof T
): Promise<{ userId: string; businessId: string }> {
  const { userId, token } = await verifyAuth(request);
  const businessId = request.data[businessIdField] as string;
  if (!businessId) {
    throw new HttpsError('invalid-argument', 'businessId is required');
  }
  await verifyBusinessAccess(userId, businessId);
  return { userId, businessId };
}

export function requireRole(request: CallableRequest, allowedRoles: string[]): void {
  const role = request.auth?.token['role'];
  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }
}

export async function setCustomClaims(uid: string, claims: Record<string, any>): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, claims);
}

export async function getUserRole(uid: string): Promise<string | null> {
  const user = await admin.auth().getUser(uid);
  return user.customClaims?.['role'] || 'user';
}
