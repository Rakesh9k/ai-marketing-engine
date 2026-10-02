export type BetaVertical = 'restaurant' | 'cloud_kitchen';

export type BetaStatus =
  | 'onboarding'
  | 'active_campaign_1'
  | 'published_1'
  | 'active_campaign_2'
  | 'completed'
  | 'blocked';

export type WorkflowStage =
  | 'signup'
  | 'onboarding'
  | 'business_brain'
  | 'calendar'
  | 'campaign_generation'
  | 'review'
  | 'meta_connection'
  | 'scheduling'
  | 'publishing'
  | 'performance'
  | 'billing';

export type FrictionIssueType =
  | 'BUG'
  | 'UX_FRICTION'
  | 'CONFUSION'
  | 'CONTENT_QUALITY'
  | 'FACTUAL_ERROR'
  | 'PERFORMANCE'
  | 'PAYMENT'
  | 'PUBLISHING'
  | 'ONBOARDING'
  | 'FEATURE_REQUEST';

export type FrictionSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type ResolutionStatus = 'open' | 'mitigated' | 'resolved' | 'deferred' | 'rejected';

export interface BetaBusinessProfile {
  betaId: string;
  businessId: string;
  businessName: string;
  vertical: BetaVertical;
  location: {
    city: string;
    state: string;
    locality?: string;
  };
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    preferredChannel: 'whatsapp' | 'email';
  };
  socialPresence: {
    instagramConnected: boolean;
    facebookConnected: boolean;
    instagramHandle?: string;
  };
  onboardingCompleted: boolean;
  campaignsCount: number;
  publishedCount: number;
  secondCampaignCompleted: boolean;
  betaStartDate: string;
  betaStatus: BetaStatus;
  notes?: string;
}

export interface BetaFrictionLog {
  logId: string;
  businessId: string;
  businessName: string;
  date: string;
  workflowStage: WorkflowStage;
  issueType: FrictionIssueType;
  severity: FrictionSeverity;
  userQuote: string;
  founderIntervention: boolean;
  description: string;
  resolutionStatus: ResolutionStatus;
}

export interface BetaCohortSummary {
  totalBusinesses: number;
  activatedCount: number;
  publishedCount: number;
  returningSecondCampaignCount: number;
  totalCampaignsGenerated: number;
  totalCampaignsPublished: number;
  p0Blockers: number;
  p1Blockers: number;
}
