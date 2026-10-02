import { callFunction } from '@/services/api';
import type { PublishInput, PublishJob, PublishResult } from '@/types';

export const publishingService = {
  async createPublishJob(input: PublishInput): Promise<{ job: PublishJob }> {
    return callFunction<PublishInput, { job: PublishJob }>({
      functionName: 'createPublishJob',
      data: input,
    });
  },

  async cancelPublishJob(jobId: string): Promise<{ job: PublishJob }> {
    return callFunction<{ jobId: string }, { job: PublishJob }>({
      functionName: 'cancelPublishJob',
      data: { jobId },
    });
  },

  async retryPublishJob(jobId: string): Promise<PublishResult> {
    return callFunction<{ jobId: string }, PublishResult>({
      functionName: 'retryPublishJob',
      data: { jobId },
    });
  },

  async listCampaignPublishJobs(campaignId: string): Promise<{ jobs: PublishJob[] }> {
    return callFunction<{ campaignId: string }, { jobs: PublishJob[] }>({
      functionName: 'listCampaignPublishJobs',
      data: { campaignId },
    });
  },
};
