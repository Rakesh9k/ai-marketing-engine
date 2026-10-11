import {
  createSchedule,
  cancelSchedule,
  reschedulePost,
  retrySchedule,
  listCampaignScheduledPosts,
} from './schedulingService';
import { httpsCallable } from 'firebase/functions';

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseFunctions: jest.fn(() => ({})),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

describe('Frontend Scheduling Service', () => {
  const mockCallable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);
  });

  it('calls createSchedule Callable function with input', async () => {
    const mockPost = { scheduledPostId: 'sch-1', status: 'scheduled' };
    mockCallable.mockResolvedValueOnce({ data: { success: true, post: mockPost } });

    const result = await createSchedule({
      campaignId: 'camp-1',
      socialConnectionId: 'conn-1',
      platform: 'instagram',
      contentType: 'post',
      scheduledAt: '2026-10-01T10:00:00.000Z',
      timezone: 'Asia/Kolkata',
    });

    expect(result).toEqual(mockPost);
  });

  it('calls cancelSchedule Callable function', async () => {
    const mockPost = { scheduledPostId: 'sch-1', status: 'cancelled' };
    mockCallable.mockResolvedValueOnce({ data: { success: true, post: mockPost } });

    const result = await cancelSchedule('sch-1');
    expect(result).toEqual(mockPost);
  });

  it('calls reschedulePost Callable function', async () => {
    const mockPost = { scheduledPostId: 'sch-1', scheduledAt: '2026-10-02T10:00:00.000Z' };
    mockCallable.mockResolvedValueOnce({ data: { success: true, post: mockPost } });

    const result = await reschedulePost({
      scheduledPostId: 'sch-1',
      newScheduledAt: '2026-10-02T10:00:00.000Z',
      timezone: 'Asia/Kolkata',
    });

    expect(result).toEqual(mockPost);
  });

  it('calls retrySchedule Callable function', async () => {
    const mockPost = { scheduledPostId: 'sch-1', status: 'scheduled' };
    mockCallable.mockResolvedValueOnce({ data: { success: true, post: mockPost } });

    const result = await retrySchedule('sch-1');
    expect(result).toEqual(mockPost);
  });

  it('calls listCampaignScheduledPosts Callable function', async () => {
    const mockPosts = [{ scheduledPostId: 'sch-1' }];
    mockCallable.mockResolvedValueOnce({ data: { success: true, posts: mockPosts } });

    const result = await listCampaignScheduledPosts('camp-1');
    expect(result).toEqual(mockPosts);
  });
});
