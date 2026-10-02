import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createLogger } from '../utils/logging';

const db = admin.firestore();
const rateLimitLogger = createLogger({ function: 'checkRateLimit' });

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

/**
 * Single source of truth for per-action rate-limit policy. The key MUST
 * match the `action` string passed to checkRateLimit() at the call site
 * exactly — checkRateLimit looks itself up by that string. Previously every
 * call site passed only (userId, action) and never a config, so every
 * action silently fell through to DEFAULT_CONFIG (100 req/60s) regardless
 * of the policy defined here — this map existed but had zero consumers.
 * Fixed by having checkRateLimit resolve the config from this map itself
 * (see below) instead of requiring each of the ~10 call sites to remember
 * to pass it. Keep this in sync when adding a new checkRateLimit() call;
 * an action with no entry here still works but silently gets the generic
 * 100/60s default, same as before.
 *
 * Policy rationale:
 * - generateCampaignStrategy / regenerateAsset / generateReel: real AI
 *   provider cost per call. 10-20/hour comfortably covers legitimate
 *   iteration (a user regenerating a handful of variants) while bounding
 *   worst-case cost from a compromised/scripted account.
 * - createReelProject: cheap metadata writes, no AI/credit cost, but still
 *   the start of a workflow — generous but bounded. (createCampaign was
 *   removed in P0-2 — see index.ts — this entry went with it.)
 * - getUploadUrl / confirmUpload: sized for a normal multi-product-photo
 *   session; each upload needs one call to each, so limits match.
 * - getReelClipUploadUrl / confirmReelClipUpload: sized for MAX_REEL_CLIPS
 *   (10, see config/reels.ts) clips across a couple of reels per hour with
 *   room for retries; each clip needs one call to each, so limits match.
 * - createSubscription: real money movement, very low legitimate
 *   frequency (a user creates a subscription rarely) — tightest policy.
 * - verifyPayment: security-sensitive (signature/idempotency boundary) but
 *   a legitimate flow may need 1-2 calls (initial + a client-side retry);
 *   no pre-existing documented policy for this action, value below is a
 *   recommendation sized on that basis, not an imported requirement.
 */
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  generateCampaignStrategy: { maxRequests: 10, windowSeconds: 3600 },
  regenerateAsset: { maxRequests: 20, windowSeconds: 3600 },
  generateReel: { maxRequests: 10, windowSeconds: 3600 },
  createReelProject: { maxRequests: 30, windowSeconds: 3600 },
  getUploadUrl: { maxRequests: 30, windowSeconds: 3600 },
  confirmUpload: { maxRequests: 30, windowSeconds: 3600 },
  getReelClipUploadUrl: { maxRequests: 60, windowSeconds: 3600 },
  confirmReelClipUpload: { maxRequests: 60, windowSeconds: 3600 },
  createSubscription: { maxRequests: 5, windowSeconds: 3600 },
  verifyPayment: { maxRequests: 10, windowSeconds: 3600 },
  // cancelSubscription / requestAccountDeletion: real account-state and
  // money-adjacent actions, very low legitimate frequency — tight policy,
  // consistent with createSubscription above.
  cancelSubscription: { maxRequests: 5, windowSeconds: 3600 },
  requestAccountDeletion: { maxRequests: 3, windowSeconds: 3600 },
  // createPayUPayment: same rationale as createSubscription — real money
  // movement, tight policy.
  createPayUPayment: { maxRequests: 5, windowSeconds: 3600 },
  // Paddle checkout/cancel: same rationale — real money movement. Checkout is
  // slightly looser than PayU's because a user may open several packs/plans
  // while comparing; each call only creates an unpaid Paddle transaction.
  createPaddleCheckout: { maxRequests: 10, windowSeconds: 3600 },
  cancelPaddleSubscription: { maxRequests: 5, windowSeconds: 3600 },
  recordConsentAcceptance: { maxRequests: 10, windowSeconds: 3600 },
  // analyzeReferenceStyle: real AI provider cost per call (Phase 8 Credits
  // & Usage Enforcement Audit) — same order of magnitude as a single
  // getUploadUrl/confirmUpload step in the same style-upload flow.
  analyzeReferenceStyle: { maxRequests: 30, windowSeconds: 3600 },
};

export async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig = rateLimitConfigs[action] ?? DEFAULT_CONFIG
): Promise<void> {
  const keyPrefix = config.keyPrefix ?? 'ratelimit';
  const key = `${keyPrefix}_${action}_${userId}`;
  const now = Date.now();

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
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));
      // Rejections were previously silent server-side (client only saw the
      // thrown HttpsError) — a spike would be invisible in Cloud Logging.
      // Deliberately omits `count`/`resetTime` (internal limiter state).
      rateLimitLogger.warn('rate_limit_rejected', { userId, action, retryAfterSeconds });
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${action}. Try again later.`,
        { retryAfterSeconds }
      );
    }

    tx.set(ref, {
      count: count + 1,
      resetTime,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
