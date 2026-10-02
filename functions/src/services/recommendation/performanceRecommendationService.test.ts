import { PerformanceRecommendationService } from './performanceRecommendationService';
import * as firestoreModule from '../firestore';
import type { PerformanceObservation } from '../../types/recommendation';

jest.mock('../firestore');
jest.mock('../../utils/logging', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  logFunctionStart: () => ({ logger: {}, startTime: Date.now() }),
  logFunctionComplete: jest.fn(),
  logFunctionError: jest.fn(),
}));

describe('PerformanceRecommendationService', () => {
  let service: PerformanceRecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PerformanceRecommendationService();
  });

  describe('evaluateBusinessRecommendations', () => {
    it('returns insufficient_data when sample size is less than 3 (Small Sample Guardrail)', async () => {
      const mockObservations: PerformanceObservation[] = [
        {
          observationId: 'obs-1',
          campaignId: 'camp-1',
          businessId: 'biz-1',
          userId: 'user-1',
          platform: 'instagram',
          attributes: { contentType: 'reel', language: 'te_en', hookType: 'price' },
          metrics: { reach: 1000, videoViews: 800, likes: 50 },
          observedAt: '2026-09-29T10:00:00.000Z',
          createdAt: '2026-09-29T10:00:00.000Z',
          updatedAt: '2026-09-29T10:00:00.000Z',
        },
      ];

      (firestoreModule.listPerformanceObservationsForBusiness as jest.Mock).mockResolvedValue(
        mockObservations
      );
      (firestoreModule.setPerformanceRecommendationDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.evaluateBusinessRecommendations('biz-1');

      expect(result.hasEnoughEvidence).toBe(false);
      expect(result.evidenceLevel).toBe('insufficient_data');
      expect(result.sampleSize).toBe(1);
      expect(result.recommendations).toEqual([]);
      expect(result.summaryMessage).toContain("We're still learning");
    });

    it('evaluates patterns across multiple campaigns when sample size >= 3', async () => {
      const mockObservations: PerformanceObservation[] = [
        {
          observationId: 'obs-1',
          campaignId: 'camp-1',
          businessId: 'biz-1',
          userId: 'user-1',
          platform: 'instagram',
          attributes: {
            contentType: 'reel',
            language: 'te_en',
            hookType: 'price',
            postingHour: 19,
          },
          metrics: { reach: 3500, videoViews: 2800, likes: 180, comments: 12 },
          feedback: { liked: true },
          observedAt: '2026-09-20T19:00:00.000Z',
          createdAt: '2026-09-20T19:00:00.000Z',
          updatedAt: '2026-09-20T19:00:00.000Z',
        },
        {
          observationId: 'obs-2',
          campaignId: 'camp-2',
          businessId: 'biz-1',
          userId: 'user-1',
          platform: 'instagram',
          attributes: {
            contentType: 'reel',
            language: 'te_en',
            hookType: 'price',
            postingHour: 20,
          },
          metrics: { reach: 4100, videoViews: 3200, likes: 210, comments: 15 },
          feedback: { liked: true },
          observedAt: '2026-09-22T20:00:00.000Z',
          createdAt: '2026-09-22T20:00:00.000Z',
          updatedAt: '2026-09-22T20:00:00.000Z',
        },
        {
          observationId: 'obs-3',
          campaignId: 'camp-3',
          businessId: 'biz-1',
          userId: 'user-1',
          platform: 'instagram',
          attributes: {
            contentType: 'post',
            language: 'en',
            hookType: 'question',
            postingHour: 13,
          },
          metrics: { reach: 400, likes: 10, comments: 1 },
          feedback: { disliked: true },
          observedAt: '2026-09-25T13:00:00.000Z',
          createdAt: '2026-09-25T13:00:00.000Z',
          updatedAt: '2026-09-25T13:00:00.000Z',
        },
      ];

      (firestoreModule.listPerformanceObservationsForBusiness as jest.Mock).mockResolvedValue(
        mockObservations
      );
      (firestoreModule.setPerformanceRecommendationDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.evaluateBusinessRecommendations('biz-1');

      expect(result.hasEnoughEvidence).toBe(true);
      expect(result.sampleSize).toBe(3);
      expect(result.evidenceLevel).toBe('low');
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Verify correlation-focused safe phrasing (no false certainty / causation claims)
      const reasons = result.recommendations.map((r) => r.reason).join(' ');
      expect(reasons).not.toMatch(/will guarantee|will perform|causes|100% success/i);
      expect(reasons).toMatch(/received|shown|demonstrated|perform well/i);
    });

    it('builds generation recommendation context correctly', async () => {
      const mockResult = {
        businessId: 'biz-1',
        hasEnoughEvidence: true,
        evidenceLevel: 'moderate' as const,
        sampleSize: 6,
        summaryMessage: 'Summary message',
        generatedAt: '2026-09-29T10:00:00.000Z',
        dataVersion: 1,
        recommendations: [
          {
            recommendedContentType: 'reel' as const,
            recommendedLanguage: 'te_en' as const,
            reason: 'Reels in Telugu + English have shown strong audience engagement.',
            confidence: 'moderate' as const,
            evidenceCount: 4,
          },
        ],
      };

      (firestoreModule.getPerformanceRecommendationDoc as jest.Mock).mockResolvedValue(mockResult);

      const genContext = await service.buildGenerationRecommendationContext('biz-1');

      expect(genContext.hasRecommendations).toBe(true);
      expect(genContext.evidenceLevel).toBe('moderate');
      expect(genContext.sampleSize).toBe(6);
      expect(genContext.guidancePrompt).toContain('HISTORICAL PERFORMANCE OBSERVATIONS');
      expect(genContext.guidancePrompt).toContain('Telugu + English');
      expect(genContext.recommendedAttributes?.contentType).toBe('reel');
      expect(genContext.recommendedAttributes?.language).toBe('te_en');
    });
  });
});
