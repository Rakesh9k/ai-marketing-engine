import { verifyServerRequest, verifyTenantAccess } from './verifyRequest';

jest.mock('./firebaseAdmin', () => {
  const mockVerifyIdToken = jest.fn();
  const mockGetDoc = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGetDoc }));
  const mockCollection = jest.fn(() => ({ doc: mockDoc }));

  return {
    getAdminAuth: () => ({
      verifyIdToken: mockVerifyIdToken,
    }),
    getAdminFirestore: () => ({
      collection: mockCollection,
    }),
    __mockVerifyIdToken: mockVerifyIdToken,
    __mockGetDoc: mockGetDoc,
  };
});

const { __mockVerifyIdToken, __mockGetDoc } = require('./firebaseAdmin');

describe('verifyServerRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without Authorization header', async () => {
    const req = new Request('http://localhost:3000/api/test', { method: 'POST' });
    const result = await verifyServerRequest(req);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('rejects requests with malformed Authorization header', async () => {
    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    const result = await verifyServerRequest(req);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('rejects requests with invalid ID token', async () => {
    __mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));
    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid_token' },
    });
    const result = await verifyServerRequest(req);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('authenticates valid Bearer ID token', async () => {
    const mockDecoded = { uid: 'user_123', email: 'user@example.com', role: 'business_owner' };
    __mockVerifyIdToken.mockResolvedValueOnce(mockDecoded);

    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid_token_xyz' },
    });

    const result = await verifyServerRequest(req);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.principal.uid).toBe('user_123');
      expect(result.principal.email).toBe('user@example.com');
    }
  });
});

describe('verifyTenantAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies access if business does not exist', async () => {
    __mockGetDoc.mockResolvedValueOnce({ exists: false });
    const res = await verifyTenantAccess('user_1', 'biz_nonexistent');
    expect(res.authorized).toBe(false);
    expect(res.reason).toBe('Business not found');
  });

  it('grants access if user is direct owner', async () => {
    __mockGetDoc.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: 'user_owner_1', name: 'My Business' }),
    });
    const res = await verifyTenantAccess('user_owner_1', 'biz_1');
    expect(res.authorized).toBe(true);
  });

  it('denies access if user is not owner or agency member', async () => {
    __mockGetDoc
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'user_owner_1', name: 'My Business' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'user' }),
      });
    const res = await verifyTenantAccess('user_attacker', 'biz_1');
    expect(res.authorized).toBe(false);
  });
});
