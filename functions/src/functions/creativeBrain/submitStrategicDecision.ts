import { onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { verifyBusinessAccess } from "../../middleware/auth";
import { validatedCallable } from "../../middleware/validation";
import { ConfirmationApplicationService } from "../../services/ai/creativeBrain/application/confirmationApplicationService";

const decisionSchema = z.object({
  businessId: z.string().min(1),
  sessionId: z.string().min(1),
  confirmationId: z.string().min(1),
  revision: z.number().default(1),
  decision: z.enum(["CONFIRM", "CHANGE", "EXPLORE"]),
  idempotencyKey: z.string().min(1),
  selectedAlternativeId: z.string().optional(),
  userNotes: z.string().optional(),
});

const service = new ConfirmationApplicationService();

export const submitStrategicDecisionEndpoint = onCall(
  { region: "asia-south1", enforceAppCheck: true },
  validatedCallable(decisionSchema, async (data, context) => {
    await verifyBusinessAccess(context.userId, data.businessId);

    return await service.processDecision(data.businessId, data.sessionId, {
      confirmationId: data.confirmationId,
      revision: data.revision ?? 1,
      decision: data.decision,
      idempotencyKey: data.idempotencyKey,
      selectedAlternativeId: data.selectedAlternativeId,
      userNotes: data.userNotes,
    });
  })
);
