import { onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const getOperationSchema = z.object({
  businessId: z.string().min(1),
  operationId: z.string().min(1),
});

const service = new ConfirmationApplicationService();

export const getCreativeBrainOperationEndpoint = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(getOperationSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    return await service.getOperationStatus(data.businessId, data.operationId);
  })
);
