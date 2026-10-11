import { onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const exploreSchema = z.object({
  businessId: z.string().min(1),
  sessionId: z.string().min(1),
  confirmationId: z.string().min(1),
  revision: z.number().default(1),
  idempotencyKey: z.string().min(1),
  explorationContext: z
    .object({
      excludeDirectionIds: z.array(z.string()).optional(),
      excludeStrategyTypes: z.array(z.string()).optional(),
    })
    .optional(),
});

const service = new ConfirmationApplicationService();

export const exploreCreativeDirectionEndpoint = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(exploreSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    return await service.exploreDirection(data.businessId, data.sessionId, {
      confirmationId: data.confirmationId,
      revision: data.revision ?? 1,
      idempotencyKey: data.idempotencyKey,
      explorationContext: data.explorationContext,
    });
  })
);
