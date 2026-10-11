import type { GenerationPipelineInput } from './pipeline';

/**
 * Where each important fact in a campaign came from. Stored with the campaign so "where did this price / this
 * phone number / this language come from?" is answered by reading the campaign, not by reading code.
 *
 * Two origins only, because the architecture has two: facts the owner entered FOR THIS CAMPAIGN (the wizard), and
 * facts held by the Business Brain (with the provenance the server recorded). Anything unknown is simply absent:
 * a missing entry means Mitra did not know it, and the pipeline did not make it up.
 */
export interface FactSource {
  fact: string;
  value: string;
  origin: 'campaign_request' | 'business_brain';
  /** USER_CONFIRMED, DERIVED_FROM_WHATSAPP, SYSTEM_DEFAULT, OWNER_ENTERED_FOR_CAMPAIGN, or NOT_RECORDED (older Brains). */
  provenance: string;
}

type BrainFacts = Record<string, { source?: string } | undefined>;

export function buildFactSources(
  input: GenerationPipelineInput,
  brainFacts: BrainFacts = {}
): FactSource[] {
  const out: FactSource[] = [];
  const fromCampaign = (fact: string, value: unknown, provenance = 'OWNER_ENTERED_FOR_CAMPAIGN') => {
    if (value === undefined || value === null || value === '') return;
    out.push({ fact, value: String(value), origin: 'campaign_request', provenance });
  };
  const fromBrain = (fact: string, path: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    const source = brainFacts[path]?.source;
    out.push({
      fact,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      origin: 'business_brain',
      // No record means no one recorded where it came from (set in an editor, or an older Brain): say so.
      provenance: source ?? 'NOT_RECORDED',
    });
  };

  fromCampaign('product', input.productName);
  fromCampaign('offer.price', input.offerPrice);
  fromCampaign('offer.originalPrice', input.offerOriginalPrice);
  fromCampaign('offer.type', input.offerType);
  if (input.offerValidityStart && input.offerValidityEnd) {
    fromCampaign(
      'offer.validity',
      `${input.offerValidityStart} to ${input.offerValidityEnd}`,
      input.offerValiditySource === 'whole_campaign'
        ? 'OWNER_CHOSE_WHOLE_CAMPAIGN'
        : 'OWNER_ENTERED_FOR_CAMPAIGN'
    );
  }
  if (input.duration?.start && input.duration?.end) {
    fromCampaign('campaign.duration', `${input.duration.start} to ${input.duration.end}`);
  }
  fromCampaign('campaign.cta', input.cta);
  fromCampaign('campaign.language', input.localizationProfile?.primaryLanguage);
  fromCampaign('campaign.regionalStyle', input.localizationProfile?.regionalStyle);

  const brain = input.businessBrain as
    | {
        identity?: { name?: string; location?: { city?: string; state?: string }; contact?: { phone?: string; whatsapp?: string } };
        audience?: { targetCustomer?: string };
        positioning?: { usp?: string };
        businessRules?: { deliveryRadiusKm?: number; minimumOrder?: number; operatingMode?: string };
      }
    | undefined;
  fromBrain('business.name', 'identity.name', brain?.identity?.name);
  fromBrain('business.city', 'identity.city', brain?.identity?.location?.city);
  fromBrain('business.state', 'identity.state', brain?.identity?.location?.state);
  fromBrain('contact.whatsapp', 'contact.whatsapp', brain?.identity?.contact?.whatsapp);
  fromBrain('contact.phone', 'contact.phone', brain?.identity?.contact?.phone);
  fromBrain('audience', 'audience.primary', brain?.audience?.targetCustomer);
  fromBrain('positioning.usp', 'positioning.usp', brain?.positioning?.usp);
  fromBrain('delivery.radiusKm', 'businessRules.deliveryRadiusKm', brain?.businessRules?.deliveryRadiusKm);
  fromBrain('delivery.minimumOrder', 'businessRules.minimumOrder', brain?.businessRules?.minimumOrder);
  fromBrain('operatingMode', 'businessRules.operatingMode', brain?.businessRules?.operatingMode);
  return out;
}
