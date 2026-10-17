import type { AssetType, BusinessCategory, CampaignAsset } from '@/types';
import { quickIdeasFor, type QuickIdea } from '@/features/campaign/quickIdeas';

/** Plain-language names for what a finished campaign can contain. */
const ASSET_LABELS: [AssetType, string, string][] = [
  ['poster', 'poster', 'posters'],
  ['caption', 'caption', 'captions'],
  ['headline', 'headline', 'headlines'],
  ['ad_copy', 'ad copy', 'ad copies'],
  ['story', 'story', 'stories'],
  ['reel', 'reel', 'reels'],
  ['whatsapp', 'WhatsApp message', 'WhatsApp messages'],
  ['cta', 'call to action', 'calls to action'],
];

/** "3 posters, 2 captions and 1 WhatsApp message", counted from the campaign's real assets only. */
export function summariseAssets(assets: Pick<CampaignAsset, 'type'>[]): string {
  const counts = new Map<AssetType, number>();
  for (const a of assets) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  const parts: string[] = [];
  for (const [type, one, many] of ASSET_LABELS) {
    const n = counts.get(type);
    if (n) parts.push(`${n} ${n === 1 ? one : many}`);
  }
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Starting points for the next campaign. They suggest a direction only and never invent a fact (see quickIdeas). */
export function nextCampaignIdeas(
  category: BusinessCategory | null | undefined,
  excludeObjective?: string
): QuickIdea[] {
  return quickIdeasFor(category)
    .filter((i) => i.objective !== excludeObjective)
    .slice(0, 2);
}
