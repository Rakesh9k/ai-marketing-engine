import { NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';

export interface ServerPrincipal {
  uid: string;
  email?: string;
  role?: string;
  decodedToken: DecodedIdToken;
}

export type AuthResult =
  { success: true; principal: ServerPrincipal } | { success: false; response: NextResponse };

function jsonResponse(
  data: unknown,
  status = 200,
  initHeaders?: Record<string, string>
): NextResponse {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...initHeaders,
    },
  });
}

/**
 * Verifies the incoming HTTP request's Authorization header using Firebase Admin SDK.
 * Expects header format: Authorization: Bearer <ID_TOKEN>
 */
export async function verifyServerRequest(req: Request): Promise<AuthResult> {
  const getHeader = (key: string): string | null => {
    if (!req || !req.headers) return null;
    if (typeof (req.headers as any).get === 'function') {
      return (req.headers as any).get(key) || (req.headers as any).get(key.toLowerCase());
    }
    const h = req.headers as unknown as Record<string, string>;
    return h[key] || h[key.toLowerCase()] || null;
  };

  const authHeader = getHeader('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: jsonResponse(
        { error: 'Unauthorized: Missing or malformed Authorization header' },
        401
      ),
    };
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return {
      success: false,
      response: jsonResponse({ error: 'Unauthorized: Missing ID token' }, 401),
    };
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const principal: ServerPrincipal = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: (decodedToken['role'] as string) || 'user',
      decodedToken,
    };

    return { success: true, principal };
  } catch (_error: any) {
    return {
      success: false,
      response: jsonResponse(
        { error: 'Unauthorized: Invalid or expired authentication token' },
        401
      ),
    };
  }
}

/**
 * Server-side tenant authorization check.
 * Verifies that the authenticated user owns or belongs to the specified business/tenant.
 */
export async function verifyTenantAccess(
  uid: string,
  businessId: string
): Promise<{ authorized: boolean; reason?: string }> {
  if (!businessId || typeof businessId !== 'string') {
    return { authorized: false, reason: 'Invalid or missing businessId' };
  }

  try {
    const db = getAdminFirestore();
    const businessDoc = await db.collection('businesses').doc(businessId).get();

    if (!businessDoc.exists) {
      return { authorized: false, reason: 'Business not found' };
    }

    const businessData = businessDoc.data() as { userId?: string; agencyId?: string } | undefined;

    // Direct owner match
    if (businessData?.userId === uid) {
      return { authorized: true };
    }

    // Agency member match
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() as { role?: string; agencyId?: string } | undefined;

    if (
      userData?.role === 'agency_member' &&
      userData?.agencyId &&
      businessData?.agencyId &&
      userData.agencyId === businessData.agencyId
    ) {
      return { authorized: true };
    }

    // Admin role override
    if (userData?.role === 'admin') {
      return { authorized: true };
    }

    return { authorized: false, reason: 'User is not authorized for this business' };
  } catch (_error: any) {
    return { authorized: false, reason: 'Failed to verify business membership' };
  }
}
