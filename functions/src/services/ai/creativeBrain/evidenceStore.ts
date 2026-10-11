import type { BusinessBrain } from '../../../types';
import type {
  CreativeBrainEvidence,
  EvidenceFactuality,
  EvidenceSource,
} from './stateMachineTypes';

/**
 * Creative Brain Evidence Store & Truth Hierarchy Resolver
 *
 * Rules:
 * 1. Business Brain facts have 100% authority (AUTHORITATIVE).
 * 2. Explicit current campaign input has 95% authority (AUTHORITATIVE).
 * 3. Historical preferences are supporting evidence (70% authority) — NEVER override current user instructions.
 * 4. AI Inferences have 60% authority (INFERRED).
 * 5. Creative Hypotheses have 40% authority (HYPOTHESIS) — NEVER converted into authoritative business fact.
 */
export class EvidenceStore {
  private store: Map<string, CreativeBrainEvidence> = new Map();

  constructor(businessBrain?: BusinessBrain, campaignIntent?: any) {
    if (businessBrain) {
      this.populateFromBusinessBrain(businessBrain);
    }
    if (campaignIntent) {
      this.populateFromCampaignIntent(campaignIntent);
    }
  }

  public setEvidence(
    key: string,
    value: unknown,
    source: EvidenceSource,
    authority: number,
    confidence: number,
    factuality: EvidenceFactuality
  ): void {
    const existing = this.store.get(key);
    if (existing && existing.authority > authority) {
      // Existing evidence has higher authority — do not overwrite higher authority fact
      return;
    }

    this.store.set(key, {
      key,
      value,
      source,
      authority,
      confidence,
      factuality,
      timestamp: new Date().toISOString(),
    });
  }

  public getEvidence(key: string): CreativeBrainEvidence | undefined {
    return this.store.get(key);
  }

  public hasEvidence(key: string): boolean {
    const ev = this.store.get(key);
    return Boolean(ev && ev.value !== undefined && ev.value !== null && ev.value !== '');
  }

  public getAllEvidence(): readonly CreativeBrainEvidence[] {
    return Array.from(this.store.values());
  }

  private populateFromBusinessBrain(brain: BusinessBrain): void {
    if (brain.identity?.name) {
      this.setEvidence('business_name', brain.identity.name, 'BUSINESS_BRAIN', 100, 100, 'AUTHORITATIVE');
    }
    if (brain.identity?.category) {
      this.setEvidence('business_category', brain.identity.category, 'BUSINESS_BRAIN', 100, 100, 'AUTHORITATIVE');
    }
    if (brain.identity?.location) {
      this.setEvidence('business_location', brain.identity.location, 'BUSINESS_BRAIN', 100, 100, 'AUTHORITATIVE');
    }
    if (brain.brand?.tone) {
      this.setEvidence('brand_tone', brain.brand.tone, 'BUSINESS_BRAIN', 95, 100, 'AUTHORITATIVE');
    }
    if (brain.audience?.targetCustomer) {
      this.setEvidence('target_customer', brain.audience.targetCustomer, 'BUSINESS_BRAIN', 90, 95, 'AUTHORITATIVE');
      this.setEvidence('target_audience', brain.audience.targetCustomer, 'BUSINESS_BRAIN', 90, 95, 'AUTHORITATIVE');
    }
    if (brain.audience?.preferences) {
      this.setEvidence('customer_motivation', brain.audience.preferences, 'BUSINESS_BRAIN', 90, 95, 'AUTHORITATIVE');
    }
    if (brain.products?.length) {
      this.setEvidence('product_identity', brain.products[0]!.name, 'BUSINESS_BRAIN', 100, 100, 'AUTHORITATIVE');
    }
  }

  private populateFromCampaignIntent(intent: any): void {
    if (intent.objective) {
      this.setEvidence('campaign_objective', intent.objective, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.offer?.headline) {
      this.setEvidence('offer_headline', intent.offer.headline, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
      this.setEvidence('offer_contract', intent.offer.headline, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.offer?.price !== undefined) {
      this.setEvidence('offer_price', intent.offer.price, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.offer?.originalPrice !== undefined) {
      this.setEvidence('offer_original_price', intent.offer.originalPrice, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.cta) {
      this.setEvidence('target_cta', intent.cta, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.audience?.localities?.length) {
      this.setEvidence('target_localities', intent.audience.localities, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
      this.setEvidence('target_audience', intent.audience.localities, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.audience?.occasion) {
      this.setEvidence('customer_motivation', intent.audience.occasion, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
    if (intent.localization?.audienceDescription) {
      this.setEvidence('target_audience', intent.localization.audienceDescription, 'CURRENT_CAMPAIGN', 95, 100, 'AUTHORITATIVE');
    }
  }
}
