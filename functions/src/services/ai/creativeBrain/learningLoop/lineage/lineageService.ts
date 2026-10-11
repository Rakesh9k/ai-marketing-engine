import type { CreativeLineage } from "../../types/learningLoop";
import type { ID, ISODateTime } from "../../types/primitives";

/**
 * Creates a CreativeLineage record to preserve full creative attribution for every campaign.
 * 
 * CRITICAL INVARIANT: The attribution chain (Campaign → Concept → Mechanisms → Audience → Objective → Offer)
 * must be recorded at generation time so post-publication performance can be traced back to creative mechanisms.
 */
export function createCreativeLineage(
  input: Omit<CreativeLineage, "lineageId" | "generatedAt">
): CreativeLineage {
  const now: ISODateTime = new Date().toISOString();
  const lineageId: ID = `lin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    lineageId,
    campaignId: input.campaignId,
    tenantId: input.tenantId,
    businessId: input.businessId,
    conceptId: input.conceptId,
    blueprintId: input.blueprintId,
    recipeId: input.recipeId,
    mechanismIds: input.mechanismIds,
    psychologicalPrincipleIds: input.psychologicalPrincipleIds,
    emotionalTerritory: input.emotionalTerritory,
    audienceId: input.audienceId,
    audienceContext: input.audienceContext,
    audienceSituationId: input.audienceSituationId,
    objective: input.objective,
    offerType: input.offerType,
    offerContext: input.offerContext,
    executionFormat: input.executionFormat,
    platform: input.platform,
    templateId: input.templateId,
    industry: input.industry,
    location: input.location,
    generatedAt: now,
  };
}
