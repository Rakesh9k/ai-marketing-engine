import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
  keyPrefix: 'ratelimit',
};

export async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  const key = `${config.keyPrefix}_${action}_${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  const ref = db.collection('rate_limits').doc(key);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let count = 0;
    let resetTime = now + config.windowSeconds * 1000;

    if (snap.exists) {
      const data = snap.data()!;
      if (data['resetTime'] > now) {
        count = data['count'];
        resetTime = data['resetTime'];
      }
    }

    if (count >= config.maxRequests) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${action}. Try again later.`
      );
    }

    tx.set(ref, {
      count: count + 1,
      resetTime,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export const rateLimitConfigs = {
  generateCampaign: { maxRequests: 10, windowSeconds: 3600 },
  regenerateAsset: { maxRequests: 20, windowSeconds: 3600 },
  createCampaign: { maxRequests: 50, windowSeconds: 3600 },
  upload: { maxRequests: 30, windowSeconds: 3600 },
  createRazorpayOrder: { maxRequests: 5, windowSeconds: 3600 },
  reelClipUpload: { maxRequests: 60, windowSeconds: 3600 },
  generateReel: { maxRequests: 10, windowSeconds: 3600 },
} as const;
