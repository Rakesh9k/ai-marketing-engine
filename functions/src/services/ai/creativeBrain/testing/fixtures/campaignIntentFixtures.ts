/**
 * PHASE 10.40 — Campaign Intent Test Fixtures
 * Scenarios covering decision stages, campaign objectives, and offer configurations.
 */

export type DecisionStage = "AWARENESS" | "CONSIDERATION" | "INTENT" | "CONVERSION" | "RETENTION";

export interface TestCampaignIntent {
  intentId: string;
  campaignObjective: "AWARENESS" | "ACQUISITION" | "CONVERSION" | "RETENTION";
  decisionStage: DecisionStage;
  targetAudience: string;
  audienceSituation: string;
  offerDetails?: {
    hasOffer: boolean;
    offerTitle?: string;
    offerPrice?: number;
    hasStatedExpiry?: boolean;
    hasInventoryLimit?: boolean;
  };
}

export const FIXTURE_WEEKEND_FAMILY_INTENT: TestCampaignIntent = {
  intentId: "intent_weekend_family",
  campaignObjective: "ACQUISITION",
  decisionStage: "CONVERSION",
  targetAudience: "Young urban families with children",
  audienceSituation: "Weekend meal decision friction and ordering stress",
  offerDetails: {
    hasOffer: true,
    offerTitle: "₹799 All-Inclusive Family Feast Combo",
    offerPrice: 799,
    hasStatedExpiry: false,
    hasInventoryLimit: false,
  },
};

export const FIXTURE_SALON_AWARENESS_INTENT: TestCampaignIntent = {
  intentId: "intent_salon_awareness",
  campaignObjective: "AWARENESS",
  decisionStage: "AWARENESS",
  targetAudience: "Working women seeking skin glow solutions",
  audienceSituation: "Evaluating seasonal skin reset before upcoming events",
  offerDetails: {
    hasOffer: false,
  },
};

export const FIXTURE_REAL_ESTATE_CONVERSION_INTENT: TestCampaignIntent = {
  intentId: "intent_re_conversion",
  campaignObjective: "CONVERSION",
  decisionStage: "CONVERSION",
  targetAudience: "IT Professionals looking for 3BHK home upgrade",
  audienceSituation: "Tired of daily 1-hour commute in heavy traffic",
  offerDetails: {
    hasOffer: true,
    offerTitle: "Zero Down Payment & Staggered EMI Milestone Plan",
    hasStatedExpiry: false,
    hasInventoryLimit: true,
  },
};
