import { metaService } from './metaService';
import { callFunction } from '@/services/api';

jest.mock('@/services/api', () => ({
  callFunction: jest.fn(),
}));

describe('metaService', () => {
  const mockCallFunction = callFunction as jest.MockedFunction<typeof callFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initiateMetaOAuth calls initiateMetaOAuth function', async () => {
    mockCallFunction.mockResolvedValueOnce({
      authUrl: 'https://facebook.com/dialog/oauth?...',
      stateId: 'state-123',
    });

    const res = await metaService.initiateMetaOAuth();
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'initiateMetaOAuth',
      data: {},
    });
    expect(res).toEqual({
      authUrl: 'https://facebook.com/dialog/oauth?...',
      stateId: 'state-123',
    });
  });

  it('getPendingMetaPages calls getPendingMetaPages function', async () => {
    mockCallFunction.mockResolvedValueOnce({
      pages: [
        {
          pageId: 'page-1',
          pageName: 'My Restaurant',
        },
      ],
      expiresAt: '2026-09-28T22:00:00.000Z',
    });

    const res = await metaService.getPendingMetaPages('state-123');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'getPendingMetaPages',
      data: { stateId: 'state-123' },
    });
    expect(res.pages).toHaveLength(1);
    expect(res.pages?.[0]?.pageName).toBe('My Restaurant');
  });

  it('selectMetaPage calls selectMetaPage function', async () => {
    const mockConnection = {
      connectionId: 'conn-1',
      userId: 'user-1',
      provider: 'meta' as const,
      status: 'active' as const,
      facebookPage: { id: 'page-1', name: 'My Restaurant' },
      instagram: { id: 'ig-1', username: 'myrestaurant' },
      permissions: ['pages_show_list'],
      tokenReference: 'metaCredentials/conn-1',
      connectedAt: '2026-09-28T21:45:00.000Z',
      updatedAt: '2026-09-28T21:45:00.000Z',
      metadata: { metaApiVersion: 'v21.0' },
    };

    mockCallFunction.mockResolvedValueOnce({ connection: mockConnection });

    const res = await metaService.selectMetaPage('state-123', 'page-1', 'biz-1');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'selectMetaPage',
      data: { stateId: 'state-123', pageId: 'page-1', businessId: 'biz-1' },
    });
    expect(res.connection).toEqual(mockConnection);
  });

  it('listSocialConnections calls listSocialConnections function', async () => {
    mockCallFunction.mockResolvedValueOnce({ connections: [] });

    const res = await metaService.listSocialConnections('biz-1');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'listSocialConnections',
      data: { businessId: 'biz-1' },
    });
    expect(res.connections).toEqual([]);
  });

  it('disconnectMetaConnection calls disconnectMetaConnection function', async () => {
    mockCallFunction.mockResolvedValueOnce({ success: true });

    const res = await metaService.disconnectMetaConnection('conn-1');
    expect(mockCallFunction).toHaveBeenCalledWith({
      functionName: 'disconnectMetaConnection',
      data: { connectionId: 'conn-1' },
    });
    expect(res.success).toBe(true);
  });
});
