import type { LanguageCode } from './index';

export type HookType =
  | 'price'
  | 'problem_solution'
  | 'question'
  | 'curiosity'
  | 'urgency'
  | 'local_identity'
  | 'product_first'
  | 'offer_first'
  | 'story'
  | 'social_proof'
  | 'unknown';

export interface PerformanceAttributes {
  hookType?: HookType;
  contentType?: 'post' | 'reel' | 'story';
  language?: LanguageCode;
  tone?: string;
  offerType?: string;
  creativeFormat?: string;
  postingHour?: number;
  dayOfWeek?: number;
  platform?: 'facebook' | 'instagram';
}

export interface PerformanceObservationMetrics {
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  videoViews?: number | null;
  clicks?: number | null;
}

export interface PerformanceObservationFeedback {
  liked?: boolean;
  disliked?: boolean;
  regenerated?: boolean;
}

export interface PerformanceObservation {
  observationId: string;
  campaignId: string;
  businessId: string;
  userId: string;
  publishJobId?: string;
  platform: 'facebook' | 'instagram';
  externalPostId?: string;

  attributes: PerformanceAttributes;
  metrics: PerformanceObservationMetrics;
  feedback?: PerformanceObservationFeedback;

  observedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type RecommendationEvidenceLevel = 'insufficient_data' | 'low' | 'moderate' | 'high';

export interface PerformanceRecommendationItem {
  recommendedContentType?: 'post' | 'reel' | 'story';
  recommendedLanguage?: LanguageCode;
  recommendedTone?: string;
  recommendedHookType?: HookType;
  recommendedOfferType?: string;
  recommendedPostingWindow?: {
    startHour: number;
    endHour: number;
  };
  reason: string;
  confidence: RecommendationEvidenceLevel;
  evidenceCount: number;
}

export interface PerformanceRecommendationResult {
  businessId: string;
  hasEnoughEvidence: boolean;
  evidenceLevel: RecommendationEvidenceLevel;
  sampleSize: number;
  recommendations: PerformanceRecommendationItem[];
  summaryMessage: string;
  generatedAt: string;
  dataVersion: number;
}

export interface GenerationRecommendationContext {
  hasRecommendations: boolean;
  evidenceLevel: RecommendationEvidenceLevel;
  sampleSize: number;
  guidancePrompt?: string;
  recommendedAttributes?: {
    contentType?: string;
    language?: string;
    tone?: string;
    hookType?: string;
    offerType?: string;
    postingWindow?: { startHour: number; endHour: number };
  };
  reasons?: string[];
}
