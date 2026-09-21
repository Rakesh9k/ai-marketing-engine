const setMock = jest.fn().mockResolvedValue(undefined);
const docMock = jest.fn().mockReturnValue({ set: setMock });
const firestoreMock = jest.fn().mockReturnValue({ doc: docMock });

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(
    () => firestoreMock(),
    { FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' } }
  ),
}));

import {
  trackEvent,
  trackAssetDownloaded,
  trackWhatsAppClicked,
  ANALYTICS_EVENTS,
} from './analyticsService';

describe('analyticsService — canonical Phase 21 analytics (reused, not rebuilt, in Phase 9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes to analytics_events/{eventId} with the canonical field shape', async () => {
    await trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICKED, 'user_1', 'biz_1', 'camp_1', 'asset_1', {
      foo: 'bar',
    });

    expect(docMock).toHaveBeenCalledTimes(1);
    const path = docMock.mock.calls[0][0] as string;
    expect(path).toMatch(/^analytics_events\//);

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'whatsapp_clicked',
        userId: 'user_1',
        businessId: 'biz_1',
        campaignId: 'camp_1',
        assetId: 'asset_1',
        metadata: { foo: 'bar' },
      })
    );
  });

  it('trackAssetDownloaded records the correct campaign_id/asset_id and assetType metadata', async () => {
    await trackAssetDownloaded('user_1', 'biz_1', 'camp_test_001', 'creative_test_001', 'poster');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: ANALYTICS_EVENTS.ASSET_DOWNLOADED,
        businessId: 'biz_1',
        campaignId: 'camp_test_001',
        assetId: 'creative_test_001',
        metadata: expect.objectContaining({ assetType: 'poster' }),
      })
    );
  });

  it('trackWhatsAppClicked (golden test §50) records campaign_id and creative_id exactly as given', async () => {
    await trackWhatsAppClicked('user_1', 'biz_1', 'campaign_test_001', 'creative_test_001');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: ANALYTICS_EVENTS.WHATSAPP_CLICKED,
        campaignId: 'campaign_test_001',
        assetId: 'creative_test_001',
      })
    );
  });

  it('never mixes up one campaign’s event with another’s IDs', async () => {
    await trackWhatsAppClicked('user_1', 'biz_A', 'camp_A', 'asset_A');
    const callA = setMock.mock.calls[0][0];

    await trackWhatsAppClicked('user_1', 'biz_B', 'camp_B', 'asset_B');
    const callB = setMock.mock.calls[1][0];

    expect(callA.campaignId).toBe('camp_A');
    expect(callA.campaignId).not.toBe('camp_B');
    expect(callB.campaignId).toBe('camp_B');
    expect(callB.campaignId).not.toBe('camp_A');
  });
});
