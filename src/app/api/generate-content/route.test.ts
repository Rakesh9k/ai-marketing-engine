import { POST } from './route';
import * as verifyModule from '@/lib/server/auth/verifyRequest';
import * as rateLimitModule from '@/lib/server/rateLimit';

jest.mock('@/lib/server/auth/verifyRequest');
jest.mock('@/lib/server/rateLimit');

const mockVerifyServerRequest = verifyModule.verifyServerRequest as jest.MockedFunction<
  typeof verifyModule.verifyServerRequest
>;
const mockVerifyTenantAccess = verifyModule.verifyTenantAccess as jest.MockedFunction<
  typeof verifyModule.verifyTenantAccess
>;
const mockCheckRateLimit = rateLimitModule.checkRateLimit as jest.MockedFunction<
  typeof rateLimitModule.checkRateLimit
>;
const mockRateLimitExceededResponse =
  rateLimitModule.rateLimitExceededResponse as jest.MockedFunction<
    typeof rateLimitModule.rateLimitExceededResponse
  >;

describe('POST /api/generate-content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when request authentication fails', async () => {
    mockVerifyServerRequest.mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as any,
    });

    const req = new Request('http://localhost:3000/api/generate-content', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Coffee Special' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when input validation fails', async () => {
    mockVerifyServerRequest.mockResolvedValueOnce({
      success: true,
      principal: { uid: 'user_1', decodedToken: {} as any },
    });

    const req = new Request('http://localhost:3000/api/generate-content', {
      method: 'POST',
      body: JSON.stringify({ topic: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when tenant authorization fails', async () => {
    mockVerifyServerRequest.mockResolvedValueOnce({
      success: true,
      principal: { uid: 'user_attacker', decodedToken: {} as any },
    });
    mockVerifyTenantAccess.mockResolvedValueOnce({
      authorized: false,
      reason: 'Not a member of business',
    });

    const req = new Request('http://localhost:3000/api/generate-content', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Espresso', businessId: 'biz_other' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockVerifyServerRequest.mockResolvedValueOnce({
      success: true,
      principal: { uid: 'user_1', decodedToken: {} as any },
    });
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60000,
    });
    mockRateLimitExceededResponse.mockReturnValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }) as any
    );

    const req = new Request('http://localhost:3000/api/generate-content', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Espresso' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('returns 200 with generated content when request is valid and authorized', async () => {
    mockVerifyServerRequest.mockResolvedValueOnce({
      success: true,
      principal: { uid: 'user_1', decodedToken: {} as any },
    });
    mockCheckRateLimit.mockResolvedValueOnce({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000,
    });

    const req = new Request('http://localhost:3000/api/generate-content', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Organic Cold Brew', contentType: 'headline' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain('Organic Cold Brew');
  });
});
