import type { NormalizedPerformanceEvidence } from "../../types/learningLoop";
import type { ID, ISODateTime } from "../../types/primitives";

export interface RawPerformanceInput {
  campaignId: ID;
  tenantId: ID;
  businessId: ID;
  creativeId?: ID;
  mechanismIds: ID[];
  platform: NormalizedPerformanceEvidence["platform"];
  format: NormalizedPerformanceEvidence["format"];
  objective: NormalizedPerformanceEvidence["objective"];
  industry: NormalizedPerformanceEvidence["industry"];
  location?: NormalizedPerformanceEvidence["location"];
  audienceContext?: NormalizedPerformanceEvidence["audienceContext"];
  offerContext?: NormalizedPerformanceEvidence["offerContext"];

  impressions?: number;
  reach?: number;
  engagements?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  spend?: number;
  revenue?: number;

  source: NormalizedPerformanceEvidence["source"];
  collectedAt?: ISODateTime;
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
}

/**
 * Normalizes platform-specific performance data into platform-neutral NormalizedPerformanceEvidence.
 * 
 * CRITICAL INVARIANT: undefined !== 0.
 * Missing metrics MUST remain undefined. Missing data represents UNKNOWN evidence.
 */
export function normalizePerformanceEvidence(input: RawPerformanceInput): NormalizedPerformanceEvidence {
  const now: ISODateTime = input.collectedAt || new Date().toISOString();
  const evidenceId: ID = `ev_norm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const { impressions, engagements, likes, comments, shares, saves, clicks, leads, conversions, spend, revenue } = input;

  // Compute total engagements if not explicitly provided
  let totalEngagements = engagements;
  if (totalEngagements === undefined) {
    const interactionSum = (likes || 0) + (comments || 0) + (shares || 0) + (saves || 0);
    if (likes !== undefined || comments !== undefined || shares !== undefined || saves !== undefined) {
      totalEngagements = interactionSum;
    }
  }

  // 1. engagementRate = engagements / impressions
  let engagementRate: number | undefined;
  if (totalEngagements !== undefined && impressions !== undefined && impressions > 0) {
    engagementRate = Number((totalEngagements / impressions).toFixed(6));
  }

  // 2. ctr = clicks / impressions
  let ctr: number | undefined;
  if (clicks !== undefined && impressions !== undefined && impressions > 0) {
    ctr = Number((clicks / impressions).toFixed(6));
  }

  // 3. conversionRate = conversions / clicks
  let conversionRate: number | undefined;
  if (conversions !== undefined && clicks !== undefined && clicks > 0) {
    conversionRate = Number((conversions / clicks).toFixed(6));
  }

  // 4. saveRate = saves / impressions
  let saveRate: number | undefined;
  if (saves !== undefined && impressions !== undefined && impressions > 0) {
    saveRate = Number((saves / impressions).toFixed(6));
  }

  // 5. shareRate = shares / impressions
  let shareRate: number | undefined;
  if (shares !== undefined && impressions !== undefined && impressions > 0) {
    shareRate = Number((shares / impressions).toFixed(6));
  }

  // 6. costPerLead = spend / leads
  let costPerLead: number | undefined;
  if (spend !== undefined && leads !== undefined && leads > 0) {
    costPerLead = Number((spend / leads).toFixed(2));
  }

  // 7. costPerConversion = spend / conversions
  let costPerConversion: number | undefined;
  if (spend !== undefined && conversions !== undefined && conversions > 0) {
    costPerConversion = Number((spend / conversions).toFixed(2));
  }

  // 8. revenuePerSpend = revenue / spend (ROAS)
  let revenuePerSpend: number | undefined;
  if (revenue !== undefined && spend !== undefined && spend > 0) {
    revenuePerSpend = Number((revenue / spend).toFixed(4));
  }

  return {
    evidenceId,
    campaignId: input.campaignId,
    tenantId: input.tenantId,
    businessId: input.businessId,
    creativeId: input.creativeId,
    mechanismIds: input.mechanismIds,
    platform: input.platform,
    format: input.format,
    objective: input.objective,
    industry: input.industry,
    location: input.location,
    audienceContext: input.audienceContext,
    offerContext: input.offerContext,

    impressions,
    reach: input.reach,
    engagements: totalEngagements,
    likes,
    comments,
    shares,
    saves,
    clicks,
    leads,
    conversions,
    spend,
    revenue,

    engagementRate,
    ctr,
    conversionRate,
    saveRate,
    shareRate,
    costPerLead,
    costPerConversion,
    revenuePerSpend,

    source: input.source,
    collectedAt: now,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
}
