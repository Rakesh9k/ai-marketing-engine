import { callFunction } from '@/services/api';
import type { GeneratePlanInput, MarketingPlan, MarketingCalendarItem } from '@/types';

export interface UpdateCalendarItemInput {
  itemId: string;
  topic?: string;
  hook?: string;
  callToAction?: string;
  suggestedTime?: string;
  scheduledDate?: string;
  status?: 'planned' | 'content_created' | 'scheduled' | 'published' | 'skipped';
}

export const calendarService = {
  async generateMarketingPlan(
    input: GeneratePlanInput
  ): Promise<{ plan: MarketingPlan; items: MarketingCalendarItem[] }> {
    return callFunction<GeneratePlanInput, { plan: MarketingPlan; items: MarketingCalendarItem[] }>(
      {
        functionName: 'generateMarketingPlan',
        data: input,
      }
    );
  },

  async getMarketingPlan(
    businessId: string
  ): Promise<{ plan: MarketingPlan | null; items: MarketingCalendarItem[] }> {
    return callFunction<
      { businessId: string },
      { plan: MarketingPlan | null; items: MarketingCalendarItem[] }
    >({
      functionName: 'getMarketingPlan',
      data: { businessId },
    });
  },

  async updateCalendarItem(
    input: UpdateCalendarItemInput
  ): Promise<{ item: MarketingCalendarItem }> {
    return callFunction<UpdateCalendarItemInput, { item: MarketingCalendarItem }>({
      functionName: 'updateCalendarItem',
      data: input,
    });
  },

  async skipCalendarItem(itemId: string): Promise<{ item: MarketingCalendarItem }> {
    return callFunction<{ itemId: string }, { item: MarketingCalendarItem }>({
      functionName: 'skipCalendarItem',
      data: { itemId },
    });
  },

  async createCampaignFromCalendarItem(calendarItemId: string): Promise<{
    campaignId: string;
    campaign: import('@/types').Campaign;
    alreadyExisted?: boolean;
  }> {
    return callFunction<
      { calendarItemId: string },
      { campaignId: string; campaign: import('@/types').Campaign; alreadyExisted?: boolean }
    >({
      functionName: 'createCampaignFromCalendarItem',
      data: { calendarItemId },
    });
  },
};
