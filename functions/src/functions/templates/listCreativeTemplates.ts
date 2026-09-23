import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { validatedCallable } from '../../middleware/validation';
import { creativeTemplateRegistry } from '../../services/creativeTemplateRegistry';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { CreativeTemplateType, CreativeObjective, BusinessCategory } from '../../types';

/**
 * Phase 7 — the one integration point that exposes the Phase 6
 * CreativeTemplateRegistry to the frontend. Global, read-only,
 * non-tenant-scoped: templates are application configuration, not
 * business data, so this callable requires only an authenticated caller
 * (no verifyBusinessAccess/businessId — there is nothing business-specific
 * to authorize against).
 *
 * Returns a thin presentation projection (id/name/description/type/
 * objectives/compatibleVerticals), never the full CreativeTemplate —
 * the internal creative grammar (structure, visualGrammar,
 * adaptationRules, constraints) is deliberately not sent to the client;
 * the UI has no legitimate use for it and it isn't customer-facing
 * information.
 */

export interface CreativeTemplateCardModel {
  id: string;
  name: string;
  description: string;
  type: CreativeTemplateType;
  objectives: CreativeObjective[];
  compatibleVerticals: BusinessCategory[];
}

const listCreativeTemplatesSchema = z.object({
  type: z.enum(['post', 'reel']).optional(),
  objective: z
    .enum(['awareness', 'engagement', 'conversion', 'launch', 'promotion', 'retention'])
    .optional(),
  vertical: z.enum(['restaurant', 'salon', 'real_estate']).optional(),
});

export const listCreativeTemplates = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(listCreativeTemplatesSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listCreativeTemplates', {
      userId: context.userId,
      type: data.type,
      objective: data.objective,
      vertical: data.vertical,
    });

    try {
      const templates = creativeTemplateRegistry.listCreativeTemplates({
        type: data.type,
        objective: data.objective,
        vertical: data.vertical,
      });

      const cardModels: CreativeTemplateCardModel[] = templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        objectives: template.objectives,
        compatibleVerticals: template.compatibleVerticals,
      }));

      logFunctionComplete(logger, startTime, { success: true, count: cardModels.length });
      return { templates: cardModels };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
