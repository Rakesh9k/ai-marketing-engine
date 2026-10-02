import { classifyHookType, buildAndSavePerformanceObservation } from './observationBuilder';
import * as firestoreModule from '../firestore';
import type { PublishJob, Campaign, ScheduledPost } from '../../types';
import type { PostPerformanceRecord } from '../../types/meta';

jest.mock('../firestore');
jest.mock('firebase-admin', () => {
  const mockFirestore = () => ({
    collection: () => ({
      where: () => ({
        where: () => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        }),
      }),
    }),
  });
  return {
    firestore: mockFirestore,
  };
});

describe('observationBuilder', () => {
  describe('classifyHookType', () => {
    it('returns unknown for null, undefined, or empty string', () => {
      expect(classifyHookType(null)).toBe('unknown');
      expect(classifyHookType(undefined)).toBe('unknown');
      expect(classifyHookType('')).toBe('unknown');
      expect(classifyHookType('   ')).toBe('unknown');
    });

    it('classifies price hooks accurately', () => {
      expect(classifyHookType('Special weekend discount of 20% off')).toBe('price');
      expect(classifyHookType('Only ₹299 for combo dish')).toBe('price');
      expect(classifyHookType('Unbeatable Rs. 150 price deal')).toBe('price');
    });

    it('classifies question hooks accurately', () => {
      expect(classifyHookType('Looking for authentic biryani in Hyderabad?')).toBe('question');
      expect(classifyHookType('Want to try our new summer drink?')).toBe('question');
    });

    it('classifies problem-solution hooks accurately', () => {
      expect(classifyHookType('Tired of boring weekend meals? We have the fix!')).toBe(
        'problem_solution'
      );
      expect(classifyHookType('Struggling to find real Telugu flavor?')).toBe('problem_solution');
    });

    it('classifies curiosity hooks accurately', () => {
      expect(classifyHookType('Discover the secret recipe behind our house special')).toBe(
        'curiosity'
      );
      expect(classifyHookType('Why everyone is talking about this dish')).toBe('curiosity');
    });

    it('classifies urgency hooks accurately', () => {
      expect(classifyHookType('Hurry! Offer expires tonight!')).toBe('urgency');
      expect(classifyHookType('Today only limited time combo')).toBe('urgency');
    });

    it('classifies local identity hooks accurately', () => {
      expect(classifyHookType('Hyderabadi style authentic biryani adda')).toBe('local_identity');
      expect(classifyHookType('Local Telugu pride in every bite')).toBe('local_identity');
    });

    it('classifies offer-first hooks accurately', () => {
      expect(classifyHookType('Buy 1 Get 1 free weekend combo')).toBe('offer_first');
    });

    it('classifies social proof hooks accurately', () => {
      expect(classifyHookType('Rated #1 most loved restaurant by customers')).toBe('social_proof');
    });

    it('returns unknown for unrecognized hook text', () => {
      expect(classifyHookType('Generic post text here')).toBe('unknown');
    });
  });

  describe('buildAndSavePerformanceObservation', () => {
    const mockPublishJob: PublishJob = {
      jobId: 'job-123',
      campaignId: 'camp-123',
      businessId: 'biz-123',
      userId: 'user-123',
      socialConnectionId: 'conn-123',
      platform: 'instagram',
      contentType: 'reel',
      mediaUrl: 'https://example.com/reel.mp4',
      caption: 'Test caption',
      externalPostId: 'ext-post-123',
      status: 'published',
      attempts: 1,
      maxAttempts: 3,
      idempotencyKey: 'idem-123',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T10:00:00.000Z',
      publishedAt: '2026-09-29T10:00:00.000Z',
    };

    const mockPostPerformance: PostPerformanceRecord = {
      performanceId: 'perf_job-123',
      campaignId: 'camp-123',
      businessId: 'biz-123',
      userId: 'user-123',
      publishJobId: 'job-123',
      platform: 'instagram',
      contentType: 'reel',
      externalPostId: 'ext-post-123',
      status: 'available',
      metrics: {
        reach: 1200,
        impressions: 1500,
        likes: 85,
        comments: 6,
        shares: 12,
        videoViews: 950,
        clicks: null,
      },
      fetchedAt: '2026-09-29T11:00:00.000Z',
      createdAt: '2026-09-29T11:00:00.000Z',
      updatedAt: '2026-09-29T11:00:00.000Z',
    };

    const mockCampaign: any = {
      campaignId: 'camp-123',
      businessId: 'biz-123',
      userId: 'user-123',
      objective: 'weekend_offer',
      localization: {
        primaryLanguage: 'te_en',
        state: 'Telangana',
      },
      campaignStrategy: {
        hook: 'Special weekend discount 20% off',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (firestoreModule.getCampaignDoc as jest.Mock).mockResolvedValue(mockCampaign);
      (firestoreModule.getScheduledPostDoc as jest.Mock).mockResolvedValue(null);
      (firestoreModule.getPerformanceObservationDoc as jest.Mock).mockResolvedValue(null);
      (firestoreModule.setPerformanceObservationDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('extracts attributes, links campaign and metrics, and saves observation', async () => {
      const result = await buildAndSavePerformanceObservation({
        publishJob: mockPublishJob,
        postPerformance: mockPostPerformance,
        campaign: mockCampaign as Campaign,
      });

      expect(result.observationId).toBe('obs_job-123');
      expect(result.campaignId).toBe('camp-123');
      expect(result.businessId).toBe('biz-123');
      expect(result.platform).toBe('instagram');
      expect(result.attributes.hookType).toBe('price');
      expect(result.attributes.contentType).toBe('reel');
      expect(result.attributes.language).toBe('te_en');
      expect(result.attributes.tone).toBe('friendly');
      expect(result.metrics.reach).toBe(1200);
      expect(result.metrics.videoViews).toBe(950);

      expect(firestoreModule.setPerformanceObservationDoc).toHaveBeenCalledWith(result);
    });
  });
});
