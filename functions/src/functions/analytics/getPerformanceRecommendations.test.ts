import { getPerformanceRecommendations } from './getPerformanceRecommendations';
import { verifyBusinessAccess } from '../../middleware/auth';
import { performanceRecommendationService } from '../../services/recommendation/performanceRecommendationService';
import { HttpsError } from 'firebase-functions/v2/https';

jest.mock('firebase-admin', () => {
  const mockFirestore = () => ({
    collection: () => ({
      doc: () => ({ get: jest.fn().mockResolvedValue({ exists: false }) }),
    }),
  });
  return {
    firestore: mockFirestore,
    initializeApp: jest.fn(),
  };
});
jest.mock('../../middleware/auth');
jest.mock('../../services/recommendation/performanceRecommendationService');
jest.mock('../../utils/logging', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
  logFunctionStart: () => ({ logger: {}, startTime: Date.now() }),
  logFunctionComplete: jest.fn(),
  logFunctionError: jest.fn(),
  generateRequestId: () => 'req-123',
}));

describe('getPerformanceRecommendations Cloud Function', () => {
  const mockContext = {
    userId: 'user-123',
    auth: { uid: 'user-123' },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies business access and returns cached recommendations when refresh is false', async () => {
    (verifyBusinessAccess as jest.Mock).mockResolvedValue(undefined);
    (performanceRecommendationService.getRecommendationsForBusiness as jest.Mock).mockResolvedValue(
      {
        businessId: 'biz-123',
        hasEnoughEvidence: true,
        evidenceLevel: 'moderate',
        sampleSize: 5,
        recommendations: [],
        summaryMessage: 'Summary message',
        generatedAt: '2026-09-29T10:00:00.000Z',
        dataVersion: 1,
      }
    );

    const handler = (getPerformanceRecommendations as any).run || getPerformanceRecommendations;
    const result = await handler({
      data: { businessId: 'biz-123', refresh: false },
      ...mockContext,
    });

    expect(verifyBusinessAccess).toHaveBeenCalledWith('user-123', 'biz-123');
    expect(performanceRecommendationService.getRecommendationsForBusiness).toHaveBeenCalledWith(
      'biz-123'
    );
    expect(result.businessId).toBe('biz-123');
  });

  it('triggers evaluateBusinessRecommendations when refresh is true', async () => {
    (verifyBusinessAccess as jest.Mock).mockResolvedValue(undefined);
    (
      performanceRecommendationService.evaluateBusinessRecommendations as jest.Mock
    ).mockResolvedValue({
      businessId: 'biz-123',
      hasEnoughEvidence: true,
      evidenceLevel: 'high',
      sampleSize: 10,
      recommendations: [],
      summaryMessage: 'Refreshed summary message',
      generatedAt: '2026-09-29T10:05:00.000Z',
      dataVersion: 2,
    });

    const handler = (getPerformanceRecommendations as any).run || getPerformanceRecommendations;
    const result = await handler({
      data: { businessId: 'biz-123', refresh: true },
      ...mockContext,
    });

    expect(verifyBusinessAccess).toHaveBeenCalledWith('user-123', 'biz-123');
    expect(performanceRecommendationService.evaluateBusinessRecommendations).toHaveBeenCalledWith(
      'biz-123'
    );
    expect(result.sampleSize).toBe(10);
  });

  it('throws permission-denied when user does not own business', async () => {
    (verifyBusinessAccess as jest.Mock).mockRejectedValue(
      new HttpsError('permission-denied', 'You do not own this business.')
    );

    const handler = (getPerformanceRecommendations as any).run || getPerformanceRecommendations;

    await expect(
      handler({ data: { businessId: 'biz-other', refresh: false }, ...mockContext })
    ).rejects.toThrow();
  });
});
