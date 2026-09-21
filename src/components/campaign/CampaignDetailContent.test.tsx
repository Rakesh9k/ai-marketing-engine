import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business, Campaign, CampaignAsset } from '@/types';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, priority: _priority, sizes: _sizes, ...rest }: any) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...rest} />
  ),
}));

const regenerateAssetMock = jest.fn().mockResolvedValue({ assetId: 'x' });
const isAssetRegeneratingMock = jest.fn().mockReturnValue(false);
jest.mock('@/hooks/useRegenerateAsset', () => ({
  useRegenerateAsset: () => ({
    regenerateAsset: regenerateAssetMock,
    isAssetRegenerating: isAssetRegeneratingMock,
  }),
}));

const copyToClipboardMock = jest.fn().mockResolvedValue(true);
jest.mock('@/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copyToClipboard: copyToClipboardMock,
    formatAssetForCopy: (asset: any, type: string) => {
      if (type === 'headline') return asset.content?.text;
      if (type === 'caption')
        return `${asset.content?.text}\n\n${(asset.content?.hashtags || []).join(' ')}`;
      if (type === 'whatsapp') return asset.content?.message;
      return JSON.stringify(asset.content);
    },
    isItemCopied: () => false,
    isItemCopying: () => false,
  }),
}));

const showToastMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const trackEventMock = jest.fn();
const recordWhatsAppClickMock = jest.fn();
jest.mock('@/lib/analytics/trackEvent', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  recordWhatsAppClick: (...args: unknown[]) => recordWhatsAppClickMock(...args),
}));

const callFunctionMock = jest.fn().mockResolvedValue({
  whatsappClicks: 0,
  inquiries: null,
  inquiriesAvailable: false,
});
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

const windowOpenMock = jest.fn();

import { CampaignDetailContent } from './CampaignDetailContent';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    name: 'Test Restaurant',
    category: 'restaurant',
    location: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
    },
    contact: {
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
    },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Business;
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaignId: 'camp_1',
    businessId: 'biz_1',
    userId: 'user_1',
    objective: 'weekend_offer',
    offer: {
      headline: 'Weekend Biryani Special',
      description: 'Our signature biryani, this weekend only.',
      price: 299,
      originalPrice: 332,
      type: 'percentage',
      validityStart: '2026-03-10T00:00:00.000Z',
      validityEnd: '2026-03-15T00:00:00.000Z',
      terms: 'Dine-in only',
    },
    duration: { start: '2026-03-10T00:00:00.000Z', end: '2026-03-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localization: {
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      locality: 'Kondapur',
      primaryLanguage: 'en',
      secondaryLanguage: 'en',
      languageMixing: 'minimal',
      regionalStyle: 'hyderabadi',
      slangPreference: 'light',
      audienceDescription: 'Local food lovers',
      brandTone: 'friendly',
      campaignStyle: 'funny',
      contentFormat: 'poster',
    },
    status: 'verified',
    creditsReserved: 140,
    creditsUsed: 140,
    metadata: {
      idempotencyKey: 'key-1',
      truthCheckStatus: 'PASS',
      truthCheckSummary: 'All facts verified.',
      truthCheckResult: {
        status: 'PASS',
        checkedAt: new Date().toISOString(),
        summary: 'All facts verified.',
        checks: [{ category: 'price', status: 'PASS', reason: 'Price matches exactly' }],
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Campaign;
}

function makeAssets(): CampaignAsset[] {
  return [
    {
      assetId: 'asset_headline_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'headline',
      index: 0,
      content: { text: 'Your next favourite biryani is here.', characterCount: 36, variant: 'A' },
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      assetId: 'asset_caption_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'caption',
      index: 0,
      content: {
        text: 'Weekend biryani cravings, sorted.',
        hashtags: ['#HyderabadFood', '#BiryaniLovers'],
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      assetId: 'asset_whatsapp_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'whatsapp',
      index: 0,
      content: {
        message: 'Hi! Get our Weekend Biryani Special at ₹299.',
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      assetId: 'asset_story_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'story',
      index: 0,
      content: {
        overallTheme: 'Weekend craving',
        frames: [{ copy: 'Craving something special?', visualCue: 'Steam rising from biryani' }],
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      assetId: 'asset_story_0_frame_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'story',
      index: 0,
      content: {},
      imageUrl: 'https://storage.example.com/story-frame-0.svg',
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      assetId: 'asset_reel_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'reel',
      index: 0,
      content: {
        hook: 'That biryani smell hits different.',
        scenes: [
          { description: 'Kitchen prep shot', visualDirection: 'close-up steam', duration: '3s' },
        ],
        productReveal: 'Full biryani reveal',
        cta: 'Order on WhatsApp',
        caption: 'Weekend special, limited time.',
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      assetId: 'asset_poster_0',
      campaignId: 'camp_1',
      businessId: 'biz_1',
      type: 'poster',
      index: 0,
      content: {},
      imageUrl: 'https://storage.example.com/poster-0.svg',
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
  ] as CampaignAsset[];
}

describe('CampaignDetailContent — customer-facing marketing content (Phase 8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.open = windowOpenMock;
  });

  it('renders the headline as readable text, not as a JSON array', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getByText('Your next favourite biryani is here.')).toBeInTheDocument();
  });

  it('renders the caption text and hashtags', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getByText('Weekend biryani cravings, sorted.')).toBeInTheDocument();
    expect(screen.getByText('#HyderabadFood #BiryaniLovers')).toBeInTheDocument();
  });

  it('renders the offer from campaign.offer (not from AI copy text)', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getByText('₹299')).toBeInTheDocument();
    expect(screen.getByText('₹332')).toBeInTheDocument();
  });

  it('renders the WhatsApp message as readable text with a Share on WhatsApp action', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        business={makeBusiness()}
      />
    );
    expect(screen.getByText('Hi! Get our Weekend Biryani Special at ₹299.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /share on whatsapp/i }).length).toBeGreaterThan(0);
  });

  it('renders the story concept frames individually, not as a raw array', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getByText('Craving something special?')).toBeInTheDocument();
    expect(screen.getByText(/Weekend craving/)).toBeInTheDocument();
  });

  it('renders the reel concept hook/scenes/cta clearly', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getByText(/That biryani smell hits different\./)).toBeInTheDocument();
    expect(screen.getByText('Kitchen prep shot')).toBeInTheDocument();
  });

  it('renders the generated creative as an actual image, not as a storagePath/imageUrl string', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    const images = screen.getAllByRole('img');
    expect(
      images.some((img) => img.getAttribute('src') === 'https://storage.example.com/poster-0.svg')
    ).toBe(true);
    expect(screen.queryByText(/storagePath/i)).not.toBeInTheDocument();
    expect(screen.queryByText('https://storage.example.com/poster-0.svg')).not.toBeInTheDocument();
  });

  it('renders a Verified Truth Check badge when the backend status is PASS', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });

  it('Phase 13: shows a stale-verification warning when isVerificationStale is true, without changing the underlying Verified badge', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        isVerificationStale={true}
      />
    );
    // The historical PASS result itself is untouched...
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    // ...but the page must make clear it may no longer reflect current
    // business/product data (Phase 13 §22: never let a stale verification
    // misleadingly appear as currently valid).
    expect(screen.getAllByText(/may be outdated/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/business or product details have changed since this campaign was verified/i)
    ).toBeInTheDocument();
  });

  it('Phase 13: does NOT show a stale-verification warning when isVerificationStale is false/absent', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.queryByText(/may be outdated/i)).not.toBeInTheDocument();
  });

  it('NEVER shows "Verified" when the backend Truth Check status is FAIL', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign({ status: 'failed' })}
        assets={makeAssets()}
        truthCheckStatus="FAIL"
      />
    );
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
  });

  it('shows "Needs Review" (not Verified) for REVIEW_REQUIRED', () => {
    // status: 'generated' matches how generateCampaignStrategy.ts actually
    // derives campaign.status from a REVIEW_REQUIRED Truth Check result —
    // a campaign never has status 'verified' alongside a non-PASS Truth
    // Check in real data.
    render(
      <CampaignDetailContent
        campaign={makeCampaign({ status: 'generated' })}
        assets={makeAssets()}
        truthCheckStatus="REVIEW_REQUIRED"
      />
    );
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getAllByText('Needs Review').length).toBeGreaterThan(0);
  });

  it('never renders raw JSON anywhere on the page', () => {
    const { container } = render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(container.querySelector('pre')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/"text":|"content":|\{\s*"/);
  });

  it('handles a campaign with no assets at all without showing undefined/null/{}/[] anywhere', () => {
    const { container } = render(
      <CampaignDetailContent campaign={makeCampaign()} assets={[]} truthCheckStatus={undefined} />
    );
    expect(container.textContent).not.toMatch(/\bundefined\b|\bnull\b/);
    expect(screen.getAllByText(/no .* generated|hasn't run/i).length).toBeGreaterThan(0);
  });

  it('does not display a superseded (replaced-by-regeneration) asset — only the active version', () => {
    const assets = makeAssets();
    const superseded: CampaignAsset = {
      ...assets[0]!,
      assetId: 'asset_headline_old',
      status: 'superseded',
      content: { text: 'OLD stale headline that should not appear' },
    };
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={[...assets, superseded]}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.queryByText('OLD stale headline that should not appear')).not.toBeInTheDocument();
  });

  it('regenerate calls the existing regenerateAsset hook with the correct campaign/asset identifiers (no second regeneration system)', async () => {
    const user = userEvent.setup();
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );

    const headlineSection = screen
      .getByText('Your next favourite biryani is here.')
      .closest('div')!;
    const regenerateButton = within(headlineSection.parentElement as HTMLElement).getByRole(
      'button',
      {
        name: /regenerate/i,
      }
    );
    await user.click(regenerateButton);

    expect(regenerateAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'camp_1',
        assetId: 'asset_headline_0',
        assetType: 'headline',
      })
    );
  });

  it('disables the regenerate button while that asset is already regenerating (prevents duplicate clicks)', () => {
    isAssetRegeneratingMock.mockImplementation((assetId: string) => assetId === 'asset_headline_0');
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    const buttons = screen.getAllByRole('button', { name: /regenerating/i });
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeDisabled();
  });
});

describe('CampaignDetailContent — Download + WhatsApp (Phase 9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.open = windowOpenMock;
  });

  it('excludes a failed-regeneration asset — only the still-active valid asset is shown/downloadable', () => {
    const assets = makeAssets();
    const failedRegeneration: CampaignAsset = {
      ...assets[0]!,
      assetId: 'asset_headline_failed_regen',
      status: 'failed',
      content: { text: 'FAILED regeneration content that must not appear' },
    };
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={[...assets, failedRegeneration]}
        truthCheckStatus="PASS"
      />
    );
    expect(
      screen.queryByText('FAILED regeneration content that must not appear')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Your next favourite biryani is here.')).toBeInTheDocument();
  });

  it('builds the WhatsApp share URL from the business’s own authoritative phone number, not from the AI-generated waLink', async () => {
    const user = userEvent.setup();
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        business={makeBusiness({
          contact: { phone: '+91 98765 43210', whatsapp: '+91 98765 43210' },
        })}
      />
    );
    const [shareButton] = screen.getAllByRole('button', { name: /share on whatsapp/i });
    await user.click(shareButton!);

    expect(windowOpenMock).toHaveBeenCalledTimes(1);
    const [url, target, features] = windowOpenMock.mock.calls[0]!;
    expect(url).toBe(
      'https://wa.me/919876543210?text=' +
        encodeURIComponent('Hi! Get our Weekend Biryani Special at ₹299.')
    );
    expect(target).toBe('_blank');
    expect(features).toContain('noopener');

    // Round-trip check: the encoded text decodes back to the exact original
    // campaign message (per the phase's golden-test requirement), not a
    // hand-rolled or partially-encoded string.
    const encodedText = new URL(url).searchParams.get('text');
    expect(encodedText).toBe('Hi! Get our Weekend Biryani Special at ₹299.');
  });

  it('shows "WhatsApp isn’t available" and does not open a window when the business has no usable phone number', async () => {
    const user = userEvent.setup();
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        business={makeBusiness({ contact: { phone: '', whatsapp: '' } })}
      />
    );
    const [shareButton] = screen.getAllByRole('button', { name: /share on whatsapp/i });
    await user.click(shareButton!);

    expect(windowOpenMock).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringMatching(/isn.t available|unavailable/i),
      'error'
    );
  });

  it('does not open WhatsApp based on a missing business prop (fails gracefully, never guesses a number)', async () => {
    const user = userEvent.setup();
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        business={null}
      />
    );
    const [shareButton] = screen.getAllByRole('button', { name: /share on whatsapp/i });
    await user.click(shareButton!);
    expect(windowOpenMock).not.toHaveBeenCalled();
  });

  it('records a whatsapp_clicked analytics event with the real campaign_id and creative_id, but never blocks opening WhatsApp on it', async () => {
    const user = userEvent.setup();
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        business={makeBusiness()}
      />
    );
    const [shareButton] = screen.getAllByRole('button', { name: /share on whatsapp/i });
    await user.click(shareButton!);

    expect(windowOpenMock).toHaveBeenCalled();
    expect(recordWhatsAppClickMock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz_1',
        campaignId: 'camp_1',
        assetId: 'asset_whatsapp_0',
        clickId: expect.any(String),
      })
    );
  });

  it('opens WhatsApp before attempting analytics — analytics can never gate the primary action', async () => {
    const callOrder: string[] = [];
    windowOpenMock.mockImplementationOnce(() => callOrder.push('window.open'));
    recordWhatsAppClickMock.mockImplementationOnce(() => callOrder.push('recordWhatsAppClick'));
    const user = userEvent.setup();
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
        business={makeBusiness()}
      />
    );
    const [shareButton] = screen.getAllByRole('button', { name: /share on whatsapp/i });
    await user.click(shareButton!);

    expect(callOrder).toEqual(['window.open', 'recordWhatsAppClick']);
  });

  it('records an asset_downloaded event with the correct campaign_id/asset_id after a creative image download', async () => {
    const user = userEvent.setup();
    (global as any).fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['fake-image-bytes'])),
    });
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    window.URL.revokeObjectURL = jest.fn();

    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    const downloadButton = screen.getByRole('button', { name: /download poster 1/i });
    await user.click(downloadButton);

    expect(trackEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'asset_downloaded',
        businessId: 'biz_1',
        campaignId: 'camp_1',
        assetId: 'asset_poster_0',
      })
    );
  });

  it('downloads the creative image even when the analytics event fails (analytics never blocks download)', async () => {
    const user = userEvent.setup();
    (global as any).fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['fake-image-bytes'])),
    });
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    window.URL.revokeObjectURL = jest.fn();
    trackEventMock.mockImplementation(() => {
      throw new Error('analytics backend unreachable');
    });

    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    const downloadButton = screen.getByRole('button', { name: /download poster 1/i });
    await user.click(downloadButton);

    expect(showToastMock).toHaveBeenCalledWith('Image downloaded', 'success');
    // A throwing analytics call must not be mistaken for a download
    // failure — the "couldn't download" error toast must never fire here.
    expect(showToastMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/couldn.t download/i),
      'error'
    );
  });

  it('renders campaign copy as readable sections (Headline/Caption/Offer/WhatsApp/Story/Reel), matching only this campaign’s actual content', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    // The visible page already is the "copy" content — this asserts the
    // exact same real campaign fields (not another campaign's, not
    // invented placeholder text) are what's present, since Download Copy
    // assembles its file from these same rendered assets.
    expect(screen.getByText('Your next favourite biryani is here.')).toBeInTheDocument();
    expect(screen.getByText('Weekend biryani cravings, sorted.')).toBeInTheDocument();
    expect(screen.getByText('₹299')).toBeInTheDocument();
    expect(screen.getByText('Hi! Get our Weekend Biryani Special at ₹299.')).toBeInTheDocument();
    expect(screen.getByText('Craving something special?')).toBeInTheDocument();
    expect(screen.getByText(/That biryani smell hits different\./)).toBeInTheDocument();
  });

  it('uses "Download Copy" labeling, not "Download Campaign" or "Download ZIP" (ZIP is not supported by this architecture)', () => {
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.getByRole('button', { name: /download copy/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download zip/i })).not.toBeInTheDocument();
  });
});

describe('CampaignDetailContent — Performance panel (Phase 34)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a real whatsappClicks count from the backend, never a client-invented number', async () => {
    callFunctionMock.mockResolvedValueOnce({
      whatsappClicks: 7,
      inquiries: null,
      inquiriesAvailable: false,
    });
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'getCampaignPerformance',
      data: { businessId: 'biz_1', campaignId: 'camp_1' },
    });
  });

  it('shows "Not available" for inquiries — never a fabricated 0, and never derived from clicks/downloads', async () => {
    callFunctionMock.mockResolvedValueOnce({
      whatsappClicks: 12,
      inquiries: null,
      inquiriesAvailable: false,
    });
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(screen.queryByText('Inquiries')?.parentElement?.textContent).not.toMatch(/\b0\b/);
  });

  it('shows a real, known zero for whatsappClicks when no click has ever been recorded (not "unknown")', async () => {
    callFunctionMock.mockResolvedValueOnce({
      whatsappClicks: 0,
      inquiries: null,
      inquiriesAvailable: false,
    });
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(await screen.findByText('WhatsApp clicks')).toBeInTheDocument();
    const clicksValue = await screen.findByText('0');
    expect(clicksValue).toBeInTheDocument();
  });

  it('renders no Performance panel at all while the backend call has not resolved (never shows a placeholder 0)', () => {
    callFunctionMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <CampaignDetailContent
        campaign={makeCampaign()}
        assets={makeAssets()}
        truthCheckStatus="PASS"
      />
    );
    expect(screen.queryByText('Performance')).not.toBeInTheDocument();
  });
});
