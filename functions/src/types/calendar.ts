import type { PublishContentType } from './publishing';

export type MarketingGoal =
  'get_customers' | 'promote_offers' | 'build_awareness' | 'promote_products';

export type PostingFrequency = 'three_per_week' | 'five_per_week' | 'daily';

export type CalendarItemStatus =
  'planned' | 'content_created' | 'scheduled' | 'published' | 'skipped';

export interface MarketingPlan {
  planId: string;
  userId: string;
  businessId: string;
  goal: MarketingGoal;
  frequency: PostingFrequency;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'active' | 'archived';
  totalItems: number;
  createdCount: number;
  metadata?: {
    promptVersion?: string;
    aiModel?: string;
    businessBrainVersion?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCalendarItem {
  itemId: string;
  planId: string;
  userId: string;
  businessId: string;
  scheduledDate: string;
  suggestedTime: string;
  timezone: string;
  contentType: PublishContentType;
  strategy: string;
  topic: string;
  hook: string;
  offerHeadline?: string | null;
  productId?: string | null;
  productName?: string | null;
  callToAction: string;
  status: CalendarItemStatus;
  campaignId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePlanInput {
  businessId: string;
  goal: MarketingGoal;
  frequency: PostingFrequency;
  specificProductId?: string;
  startDate?: string;
  timezone?: string;
  idempotencyKey?: string;
}
