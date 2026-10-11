import { calendarPlanningService } from './calendarPlanningService';
import { getTextAI } from '../ai/factory/aiProviderFactory';

jest.mock('../ai/factory/aiProviderFactory', () => ({
  getTextAI: jest.fn(),
}));

describe('calendarPlanningService', () => {
  const mockBusiness = {
    businessId: 'biz-test-123',
    userId: 'user-test-123',
    name: 'Hyd Biryani House',
    category: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana' },
    businessBrain: {
      products: [
        { productId: 'prod-1', name: 'Special Chicken Biryani', category: 'main', price: 350 },
      ],
      businessRules: { offerValidityRules: '10% OFF on weekends' },
    },
    settings: { timezone: 'Asia/Kolkata' },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a 30-day marketing plan with 13 items for three_per_week frequency', async () => {
    const mockAIOutput = {
      planTitle: '30-Day Biryani Growth Plan',
      strategySummary: 'Focus on signature dish and weekend offers',
      items: Array.from({ length: 13 }, (_, i) => ({
        dayOffset: i * 2,
        contentType: 'post' as const,
        strategy: 'Product spotlight',
        topic: `Biryani Special Item #${i + 1}`,
        hook: `Hook #${i + 1}`,
        callToAction: 'Order now',
        suggestedTime: '19:30',
        productId: 'prod-1',
        productName: 'Special Chicken Biryani',
        offerHeadline: '10% OFF on weekends',
      })),
    };

    (getTextAI as jest.Mock).mockReturnValue({
      generateStructured: jest.fn().mockResolvedValue(mockAIOutput),
    });

    const result = await calendarPlanningService.generatePlan(
      mockBusiness,
      {
        businessId: 'biz-test-123',
        goal: 'get_customers',
        frequency: 'three_per_week',
        startDate: '2026-10-01',
        timezone: 'Asia/Kolkata',
      },
      'user-test-123'
    );

    expect(result.plan.totalItems).toBe(13);
    expect(result.plan.frequency).toBe('three_per_week');
    // The plan records the model that really wrote it (the configured text model), not a stale alias.
    expect(result.plan.metadata?.aiModel).toBe(
      process.env['GEMINI_TEXT_MODEL'] || 'gemini-3.1-flash-lite'
    );
    expect(result.items.length).toBe(13);
    expect(result.items[0]?.topic).toBe('Biryani Special Item #1');
    expect(result.items[0]?.scheduledDate).toBe('2026-10-01');
  });

  it('generates 30 items for daily frequency', async () => {
    const mockAIOutput = {
      planTitle: 'Daily Marketing Plan',
      strategySummary: 'Daily content',
      items: Array.from({ length: 30 }, (_, i) => ({
        dayOffset: i,
        contentType: i % 2 === 0 ? ('post' as const) : ('reel' as const),
        strategy: 'Daily angle',
        topic: `Daily Post #${i + 1}`,
        hook: `Daily Hook #${i + 1}`,
        callToAction: 'Book now',
        suggestedTime: '19:30',
      })),
    };

    (getTextAI as jest.Mock).mockReturnValue({
      generateStructured: jest.fn().mockResolvedValue(mockAIOutput),
    });

    const result = await calendarPlanningService.generatePlan(
      mockBusiness,
      {
        businessId: 'biz-test-123',
        goal: 'build_awareness',
        frequency: 'daily',
        startDate: '2026-10-01',
        timezone: 'Asia/Kolkata',
      },
      'user-test-123'
    );

    expect(result.plan.totalItems).toBe(30);
    expect(result.items.length).toBe(30);
  });
});
