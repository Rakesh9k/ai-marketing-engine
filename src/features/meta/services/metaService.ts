import { callFunction } from '@/services/api';
import type { SocialConnection, PendingMetaPage } from '@/types';

export const metaService = {
  async initiateMetaOAuth(): Promise<{ authUrl: string; stateId: string }> {
    return callFunction<Record<string, never>, { authUrl: string; stateId: string }>({
      functionName: 'initiateMetaOAuth',
      data: {},
    });
  },

  async getPendingMetaPages(
    stateId: string
  ): Promise<{ pages: PendingMetaPage[]; expiresAt: string }> {
    return callFunction<{ stateId: string }, { pages: PendingMetaPage[]; expiresAt: string }>({
      functionName: 'getPendingMetaPages',
      data: { stateId },
    });
  },

  async selectMetaPage(
    stateId: string,
    pageId: string,
    businessId?: string
  ): Promise<{ connection: SocialConnection }> {
    return callFunction<
      { stateId: string; pageId: string; businessId?: string },
      { connection: SocialConnection }
    >({
      functionName: 'selectMetaPage',
      data: { stateId, pageId, businessId },
    });
  },

  async listSocialConnections(businessId?: string): Promise<{ connections: SocialConnection[] }> {
    return callFunction<{ businessId?: string }, { connections: SocialConnection[] }>({
      functionName: 'listSocialConnections',
      data: { businessId },
    });
  },

  async disconnectMetaConnection(connectionId: string): Promise<{ success: boolean }> {
    return callFunction<{ connectionId: string }, { success: boolean }>({
      functionName: 'disconnectMetaConnection',
      data: { connectionId },
    });
  },
};
