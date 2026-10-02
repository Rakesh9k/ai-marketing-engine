import type { Campaign, PublishJob, ScheduledPost } from '../../types';
import type { PostPerformanceRecord } from '../../types/meta';
import type {
  HookType,
  PerformanceAttributes,
  PerformanceObservation,
  PerformanceObservationFeedback,
} from '../../types/recommendation';
import {
  getCampaignDoc,
  getPublishJobDoc,
  getScheduledPostDoc,
  setPerformanceObservationDoc,
  getPerformanceObservationDoc,
} from '../firestore';
import * as admin from 'firebase-admin';

/**
 * Controlled vocabulary keywords for deterministic hook classification.
 * Strictly maps structured campaign copy/strategy into canonical HookType.
 */
export function classifyHookType(hookText?: string | null): HookType {
  if (!hookText || typeof hookText !== 'string' || hookText.trim().length === 0) {
    return 'unknown';
  }

  const text = hookText.toLowerCase();

  if (
    text.includes('₹') ||
    text.includes('rs.') ||
    text.includes('price') ||
    text.includes('% off') ||
    text.includes('discount')
  ) {
    return 'price';
  }
  if (
    text.includes('tired of') ||
    text.includes('struggling') ||
    text.includes('solution') ||
    text.includes('stop') ||
    text.includes('fix')
  ) {
    return 'problem_solution';
  }
  if (
    text.includes('?') ||
    text.includes('looking for') ||
    text.includes('want to') ||
    text.includes('craving') ||
    text.includes('did you know')
  ) {
    return 'question';
  }
  if (
    text.includes('secret') ||
    text.includes('reveal') ||
    text.includes('discover') ||
    text.includes('hidden') ||
    text.includes('why')
  ) {
    return 'curiosity';
  }
  if (
    text.includes('limited time') ||
    text.includes('today only') ||
    text.includes('hurry') ||
    text.includes('expires') ||
    text.includes('urgent')
  ) {
    return 'urgency';
  }
  if (
    text.includes('hyderabad') ||
    text.includes('telugu') ||
    text.includes('local') ||
    text.includes('adda') ||
    text.includes('namma')
  ) {
    return 'local_identity';
  }
  if (
    text.includes('buy 1') ||
    text.includes('bogo') ||
    text.includes('combo') ||
    text.includes('flat') ||
    text.includes('offer')
  ) {
    return 'offer_first';
  }
  if (
    text.includes('rated') ||
    text.includes('review') ||
    text.includes('loved') ||
    text.includes('favorite') ||
    text.includes('customer')
  ) {
    return 'social_proof';
  }
  if (
    text.includes('story') ||
    text.includes('journey') ||
    text.includes('since') ||
    text.includes('tradition') ||
    text.includes('crafted')
  ) {
    return 'story';
  }
  if (
    text.includes('signature') ||
    text.includes('special') ||
    text.includes('fresh') ||
    text.includes('best selling')
  ) {
    return 'product_first';
  }

  return 'unknown';
}

export interface BuildObservationInput {
  publishJob: PublishJob;
  postPerformance: PostPerformanceRecord;
  campaign?: Campaign | null;
  scheduledPost?: ScheduledPost | null;
}

/**
 * Builds and saves a canonical PerformanceObservation for a published post.
 */
export async function buildAndSavePerformanceObservation(
  input: BuildObservationInput
): Promise<PerformanceObservation> {
  const { publishJob, postPerformance } = input;

  let campaign = input.campaign;
  if (!campaign && publishJob.campaignId) {
    campaign = await getCampaignDoc(publishJob.campaignId);
  }

  let scheduledPost = input.scheduledPost;
  const targetScheduledPostId = (publishJob as any).scheduledPostId;
  if (!scheduledPost && targetScheduledPostId) {
    scheduledPost = await getScheduledPostDoc(targetScheduledPostId);
  }

  const observationId = `obs_${publishJob.jobId}`;
  const existingObs = await getPerformanceObservationDoc(observationId);

  // Determine publication timestamp for posting hour / day of week
  const pubDateStr = publishJob.publishedAt || scheduledPost?.scheduledAt || publishJob.updatedAt;
  const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();

  // Extract hook text from strategy / brief / copy pack
  const rawHook =
    (campaign as any)?.campaignStrategy?.hook ||
    (campaign as any)?.copyPack?.hook ||
    (campaign as any)?.creativeBrief?.campaignStrategy?.hook ||
    null;

  const hookType = classifyHookType(rawHook);

  const attributes: PerformanceAttributes = {
    hookType,
    contentType: publishJob.contentType || (campaign as any)?.contentType || 'post',
    language:
      (campaign as any)?.localizationProfile?.primaryLanguage ||
      (campaign as any)?.localization?.primaryLanguage ||
      (campaign as any)?.language ||
      'en',
    tone: (campaign as any)?.brandProfile?.tone || (campaign as any)?.tone || 'friendly',
    offerType: (campaign as any)?.offer?.type || (campaign as any)?.offerType || undefined,
    creativeFormat: publishJob.contentType || 'post',
    postingHour: pubDate.getHours(),
    dayOfWeek: pubDate.getDay(),
    platform: publishJob.platform,
  };

  // Fetch feedback signals from analytics_events and creative_feedback
  const feedback = await fetchFeedbackSignals(
    publishJob.businessId,
    publishJob.campaignId,
    publishJob.jobId
  );

  const nowIso = new Date().toISOString();

  const observation: PerformanceObservation = {
    observationId,
    campaignId: publishJob.campaignId,
    businessId: publishJob.businessId,
    userId: publishJob.userId,
    publishJobId: publishJob.jobId,
    platform: publishJob.platform,
    externalPostId: publishJob.externalPostId || undefined,

    attributes,
    metrics: {
      reach: postPerformance.metrics.reach,
      impressions: postPerformance.metrics.impressions,
      likes: postPerformance.metrics.likes,
      comments: postPerformance.metrics.comments,
      shares: postPerformance.metrics.shares,
      videoViews: postPerformance.metrics.videoViews,
      clicks: postPerformance.metrics.clicks,
    },
    feedback,

    observedAt: postPerformance.fetchedAt || nowIso,
    createdAt: existingObs?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  await setPerformanceObservationDoc(observation);
  return observation;
}

/**
 * Fetches creative feedback (liked/disliked/regenerated) for a campaign / job.
 */
async function fetchFeedbackSignals(
  businessId: string,
  campaignId: string,
  publishJobId: string
): Promise<PerformanceObservationFeedback> {
  const db = admin.firestore();

  const [feedbackSnap, analyticsSnap] = await Promise.all([
    db
      .collection('creative_feedback')
      .where('businessId', '==', businessId)
      .where('campaignId', '==', campaignId)
      .get(),
    db
      .collection('analytics_events')
      .where('businessId', '==', businessId)
      .where('campaignId', '==', campaignId)
      .get(),
  ]);

  let liked = false;
  let disliked = false;
  let regenerated = false;

  for (const doc of feedbackSnap.docs) {
    const data = doc.data() as Record<string, any>;
    if (data['sentiment'] === 'positive') liked = true;
    if (data['sentiment'] === 'negative') disliked = true;
  }

  for (const doc of analyticsSnap.docs) {
    const data = doc.data() as Record<string, any>;
    if (data['eventName'] === 'creative_liked') liked = true;
    if (data['eventName'] === 'creative_disliked') disliked = true;
    if (data['eventName'] === 'campaign_regenerated') regenerated = true;
  }

  return { liked, disliked, regenerated };
}
