import { onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const generateConfirmationSchema = z.object({
  businessId: z.string().min(1),
  sessionId: z.string().min(1),
  revision: z.number().default(1),
  idempotencyKey: z.string().min(1),
});

const service = new ConfirmationApplicationService();

export const generateStrategicConfirmationEndpoint = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(generateConfirmationSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    return await service.generateConfirmation(data.businessId, data.sessionId, {
      revision: data.revision ?? 1,
      idempotencyKey: data.idempotencyKey,
    });
  })
);
