/**
 * PHASE 27 — Industry Pack Resolver
 * Matches business profiles / categories to specialized Industry Packs & Sub-Industries,
 * or gracefully falls back to GENERIC_LOCAL_PACK.
 */

import type { IndustryPackResolution } from '../industryPack.types';
import { IndustryPackRegistry } from './industryPackRegistry';

export class IndustryPackResolver {
  constructor(private registry: IndustryPackRegistry = new IndustryPackRegistry()) {}

  /**
   * Resolves business category string to specialized IndustryPackResolution.
   */
  public resolveCategory(categoryText?: string): IndustryPackResolution {
    if (!categoryText) {
      return this.getFallbackResolution();
    }

    const lower = categoryText.toLowerCase();

    // Check for explicit unmapped pet/hardware/dry cleaning categories first
    if (this.containsAny(lower, ['pet', 'aquarium', 'hardware', 'dry cleaning', 'laundry', 'plumbing', 'auto repair'])) {
      return this.getFallbackResolution();
    }

    // 1. Restaurant matching
    if (this.containsAny(lower, ['restaurant', 'food', 'biryani', 'cafe', 'café', 'qsr', 'dining', 'kitchen', 'bakery', 'dessert', 'bistro'])) {
      const pack = this.registry.get('RESTAURANT', '1.0.0')!;
      let subIndustry = 'sub_family_restaurant';

      if (lower.includes('biryani')) subIndustry = 'sub_biryani';
      else if (lower.includes('cafe') || lower.includes('café') || lower.includes('coffee')) subIndustry = 'sub_cafe';
      else if (lower.includes('qsr') || lower.includes('fast food')) subIndustry = 'sub_qsr';
      else if (lower.includes('cloud kitchen') || lower.includes('delivery')) subIndustry = 'sub_cloud_kitchen';
      else if (lower.includes('bakery') || lower.includes('dessert') || lower.includes('cake')) subIndustry = 'sub_bakery';

      return {
        industry: 'RESTAURANT',
        subIndustry,
        packId: pack.id,
        packVersion: pack.version,
        confidence: 0.95,
        fallbackUsed: false,
        pack,
      };
    }

    // 2. Salon & Beauty matching
    if (this.containsAny(lower, ['salon', 'beauty', 'barber', 'hair', 'parlor', 'spa', 'makeup', 'bridal', 'skincare'])) {
      const pack = this.registry.get('SALON', '1.0.0')!;
      let subIndustry = 'sub_salon_unisex';

      if (lower.includes('bridal') || lower.includes('makeup')) subIndustry = 'sub_salon_bridal';
      else if (lower.includes('men') || lower.includes('barber')) subIndustry = 'sub_salon_mens';
      else if (lower.includes('women')) subIndustry = 'sub_salon_womens';

      return {
        industry: 'SALON',
        subIndustry,
        packId: pack.id,
        packVersion: pack.version,
        confidence: 0.95,
        fallbackUsed: false,
        pack,
      };
    }

    // 3. Real Estate matching
    if (this.containsAny(lower, ['real estate', 'property', 'apartment', 'villa', 'plot', 'housing', 'builder', 'developer', 'commercial space'])) {
      const pack = this.registry.get('REAL_ESTATE', '1.0.0')!;
      let subIndustry = 'sub_re_apartments';

      if (lower.includes('villa')) subIndustry = 'sub_re_villas';
      else if (lower.includes('plot') || lower.includes('land')) subIndustry = 'sub_re_plotted';
      else if (lower.includes('commercial') || lower.includes('retail shop') || lower.includes('office')) subIndustry = 'sub_re_commercial';

      return {
        industry: 'REAL_ESTATE',
        subIndustry,
        packId: pack.id,
        packVersion: pack.version,
        confidence: 0.95,
        fallbackUsed: false,
        pack,
      };
    }

    // 4. Fallback to Generic Local Business
    return this.getFallbackResolution();
  }

  private getFallbackResolution(): IndustryPackResolution {
    const pack = this.registry.get('GENERIC_LOCAL', '1.0.0')!;
    return {
      industry: 'GENERIC_LOCAL',
      subIndustry: 'sub_generic_service',
      packId: pack.id,
      packVersion: pack.version,
      confidence: 0.60,
      fallbackUsed: true,
      pack,
    };
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }
}
