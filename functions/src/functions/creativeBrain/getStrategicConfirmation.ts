import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const getConfirmationSchema = z.object({
  businessId: z.string().min(1),
  sessionId: z.string().min(1),
});

const service = new ConfirmationApplicationService();

export const getStrategicConfirmationEndpoint = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(getConfirmationSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    try {
      return await service.getConfirmation(data.businessId, data.sessionId);
    } catch (err: any) {
      throw new HttpsError("not-found", err.message);
    }
  })
);
