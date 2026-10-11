import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase/client';
import type { ScheduledPost, CreateScheduleInput, RescheduleInput } from '@/types';

function getFunctionsInstance() {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions not initialized');
  }
  return functions;
}

export async function createSchedule(input: CreateScheduleInput): Promise<ScheduledPost> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<
    { data: CreateScheduleInput },
    { success: boolean; post: ScheduledPost }
  >(functions, 'createSchedule');
  const res = await callable({ data: input } as any);
  return res.data.post;
}

export async function cancelSchedule(scheduledPostId: string): Promise<ScheduledPost> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<
    { scheduledPostId: string },
    { success: boolean; post: ScheduledPost }
  >(functions, 'cancelSchedule');
  const res = await callable({ scheduledPostId });
  return res.data.post;
}

export async function reschedulePost(input: RescheduleInput): Promise<ScheduledPost> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<RescheduleInput, { success: boolean; post: ScheduledPost }>(
    functions,
    'reschedulePost'
  );
  const res = await callable(input);
  return res.data.post;
}

export async function retrySchedule(scheduledPostId: string): Promise<ScheduledPost> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<
    { scheduledPostId: string },
    { success: boolean; post: ScheduledPost }
  >(functions, 'retrySchedule');
  const res = await callable({ scheduledPostId });
  return res.data.post;
}

export async function listCampaignScheduledPosts(campaignId: string): Promise<ScheduledPost[]> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<
    { campaignId: string },
    { success: boolean; posts: ScheduledPost[] }
  >(functions, 'listCampaignScheduledPosts');
  const res = await callable({ campaignId });
  return res.data.posts;
}

export interface MultiPlatformScheduleInput {
  campaignId: string;
  platforms: Array<{
    platform: 'instagram' | 'facebook';
    socialConnectionId: string;
    contentType: 'post' | 'reel';
  }>;
  scheduledAt: string;
  timezone: string;
  captionOverride?: string;
}

export async function createMultiPlatformSchedule(
  input: MultiPlatformScheduleInput
): Promise<ScheduledPost[]> {
  const results: ScheduledPost[] = [];
  for (const item of input.platforms) {
    const post = await createSchedule({
      campaignId: input.campaignId,
      socialConnectionId: item.socialConnectionId,
      platform: item.platform,
      contentType: item.contentType,
      scheduledAt: input.scheduledAt,
      timezone: input.timezone,
      captionOverride: input.captionOverride,
    });
    results.push(post);
  }
  return results;
}
