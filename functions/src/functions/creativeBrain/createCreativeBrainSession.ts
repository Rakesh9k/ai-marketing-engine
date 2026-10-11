import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import * as admin from "firebase-admin";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const createSessionSchema = z.object({
  businessId: z.string().min(1),
  campaignId: z.string().optional(),
  objective: z.string().optional(),
  platform: z.string().optional(),
  format: z.string().optional(),
  campaignStage: z.string().optional(),
});

const service = new ConfirmationApplicationService();

export const createCreativeBrainSession = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(createSessionSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    const doc = await admin.firestore().collection("businesses").doc(data.businessId).get();
    if (!doc.exists) {
      throw new HttpsError("not-found", "Business not found.");
    }

    const businessDoc: any = doc.data() || {};
    const businessContext: any = {
      businessId: data.businessId,
      name: businessDoc.name || "Business Name",
      industry: businessDoc.industry || businessDoc.category || "RESTAURANT",
      products: [],
      services: [],
      capabilities: {
        booking: false,
        reservation: true,
        purchase: true,
        whatsapp: true,
        phone: true,
        physicalLocation: true,
        delivery: true,
        onlineOrdering: true,
      },
      contactCapabilities: {
        phone: { available: true, verified: true },
        whatsapp: { available: true, verified: true },
        website: { available: true, verified: true },
        bookingUrl: { available: false, verified: false },
        orderingUrl: { available: true, verified: true },
        reservationUrl: { available: true, verified: true },
      },
      verifiedFacts: [],
      restrictions: [],
      status: "ACTIVE",
    };

    return await service.createSession(data.businessId, businessContext, {
      businessId: data.businessId,
      campaignId: data.campaignId,
      objective: data.objective || "AWARENESS",
      platform: data.platform || "INSTAGRAM",
      format: data.format || "SINGLE_IMAGE",
      campaignStage: data.campaignStage || "ACQUISITION",
    });
  })
);
