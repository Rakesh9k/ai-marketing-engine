import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { createReelProjectDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { REEL_GOALS, REEL_STYLES } from '../../config/reels';
import type { ReelProject } from '../../types';

const createReelProjectSchema = z.object({
  businessId: z.string().min(1),
  goal: z.enum(REEL_GOALS as [string, ...string[]]),
  style: z.enum(REEL_STYLES as [string, ...string[]]),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(45)]),
  offer: z.string().max(200).optional(),
  cta: z.string().max(60).optional(),
  additionalMessage: z.string().max(200).optional(),
});

/**
 * Creates the draft ReelProject document a "Create a Reel" session is
 * organized around. Returns a reelId BEFORE any clip is uploaded so the
 * frontend can use it to build the clip upload storage path
 * (businesses/{businessId}/reels/{reelId}/input/...) — mirroring how
 * generateCampaignStrategy owns campaignId end-to-end, except here upload
 * must happen first, so project creation is a separate, cheap, no-credit
 * step (see AGENTS.md section 21: "Never deduct credits merely because the
 * user opened the Reel page").
 */
export const createReelProject = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(createReelProjectSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createReelProject', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'reelClipUpload');

      const reelId = uuidv7();
      const now = new Date().toISOString();
      const reel: ReelProject = {
        reelId,
        businessId: data.businessId,
        userId: context.userId,
        status: 'draft',
        goal: data.goal as ReelProject['goal'],
        style: data.style as ReelProject['style'],
        durationSeconds: data.durationSeconds as ReelProject['durationSeconds'],
        inputClipIds: [],
        offer: data.offer,
        cta: data.cta,
        additionalMessage: data.additionalMessage,
        createdAt: now,
        updatedAt: now,
      };

      await createReelProjectDoc(reel);

      logFunctionComplete(logger, startTime, { success: true, reelId });
      return { reelId, reel };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
