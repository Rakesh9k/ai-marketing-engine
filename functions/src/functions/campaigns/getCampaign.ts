import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getCampaignDoc, getBusinessDoc, getProductDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { isVerificationStale } from '../../services/ai/truthCheck';
import type { Campaign } from '../../types';

const getCampaignSchema = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
});

export const getCampaign = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getCampaignSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getCampaign', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const campaign = await getCampaignDoc(data.campaignId);

      if (!campaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }

      if (campaign.businessId !== data.businessId) {
        throw new HttpsError('permission-denied', 'Campaign does not belong to this business');
      }

      // Staleness is computed on read, never mutates the stored campaign —
      // the original Truth Check result is a historical record and stays
      // exactly as it was. This only tells the caller whether the source
      // facts it was checked against still match today's Business/Product
      // data (see isVerificationStale / Phase 6 Truth Check report).
      let isVerificationStaleFlag = false;
      const storedFingerprint = campaign.metadata?.truthCheckResult?.sourceFingerprint;
      const storedVerticalFingerprint = campaign.metadata?.truthCheckResult?.verticalFingerprint;
      if (storedFingerprint || storedVerticalFingerprint) {
        const [currentBusiness, currentProduct] = await Promise.all([
          getBusinessDoc(campaign.businessId),
          campaign.productId ? getProductDoc(campaign.productId) : Promise.resolve(null),
        ]);
        if (currentBusiness) {
          isVerificationStaleFlag = isVerificationStale(
            storedFingerprint,
            {
              businessPhone: currentBusiness.contact.phone,
              businessWhatsApp: currentBusiness.contact.whatsapp,
              businessLocationText: `${currentBusiness.location.locality || ''} ${currentBusiness.location.city} ${currentBusiness.location.state}`,
              productPrice: currentProduct?.price ?? campaign.newProduct?.price,
            },
            storedVerticalFingerprint,
            {
              deliveryRadiusKm: currentBusiness.businessBrain?.businessRules?.deliveryRadiusKm,
              minimumOrder: currentBusiness.businessBrain?.businessRules?.minimumOrder,
              verticalProfileSnapshot: currentBusiness.businessBrain?.verticalProfile
                ? JSON.stringify(currentBusiness.businessBrain.verticalProfile)
                : undefined,
            }
          );
        }
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        isVerificationStale: isVerificationStaleFlag,
      });
      return { campaign, isVerificationStale: isVerificationStaleFlag };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
