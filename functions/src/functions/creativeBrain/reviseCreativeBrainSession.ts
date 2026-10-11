import { onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const revisionSchema = z.object({
  businessId: z.string().min(1),
  sessionId: z.string().min(1),
  revision: z.number().default(1),
  idempotencyKey: z.string().min(1),
  type: z.enum([
    "AUDIENCE",
    "SITUATION",
    "OBJECTIVE",
    "PRODUCT",
    "OFFER",
    "DIRECTION",
    "ADDITIONAL_INFORMATION",
  ]),
  changes: z.array(
    z.object({
      field: z.string(),
      previousValue: z.unknown().optional(),
      requestedValue: z.unknown(),
    })
  ),
});

const service = new ConfirmationApplicationService();

export const reviseCreativeBrainSessionEndpoint = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(revisionSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    return await service.reviseSession(data.businessId, data.sessionId, {
      revision: data.revision ?? 1,
      idempotencyKey: data.idempotencyKey,
      type: data.type,
      changes: data.changes as any,
    });
  })
);
