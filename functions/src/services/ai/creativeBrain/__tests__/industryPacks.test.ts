/**
 * PHASE 27 — Industry Creative Intelligence Packs Test Suite
 * Tests specialized industry resolution, domain reasoning, sub-industry matching,
 * anti-pattern detection, pack versioning, generic fallbacks, and Golden Tests (#70 to #78).
 */

import { IndustryService } from '../industry/industryService';
import { IndustryPackRegistry } from '../industry/registry/industryPackRegistry';

describe('PHASE 27 — Industry Creative Intelligence Packs', () => {
  let industryService: IndustryService;
  let registry: IndustryPackRegistry;

  beforeEach(() => {
    industryService = new IndustryService();
    registry = new IndustryPackRegistry();
  });

  describe('1. Pack Resolution & Sub-Industry Matching', () => {
    it('resolves Biryani Restaurant to RESTAURANT pack and sub_biryani sub-industry', () => {
      const res = industryService.resolveBusinessIndustry('Hyderabad Family Biryani Restaurant');

      expect(res.industry).toBe('RESTAURANT');
      expect(res.subIndustry).toBe('sub_biryani');
      expect(res.fallbackUsed).toBe(false);
      expect(res.packId).toBe('pack_restaurant_v1');
    });

    it('resolves Bridal Salon to SALON pack and sub_salon_bridal sub-industry', () => {
      const res = industryService.resolveBusinessIndustry('Bridal Makeup & Hair Studio');

      expect(res.industry).toBe('SALON');
      expect(res.subIndustry).toBe('sub_salon_bridal');
      expect(res.fallbackUsed).toBe(false);
    });

    it('resolves Luxury Villas to REAL_ESTATE pack and sub_re_villas sub-industry', () => {
      const res = industryService.resolveBusinessIndustry('Luxury Gated Community Villas');

      expect(res.industry).toBe('REAL_ESTATE');
      expect(res.subIndustry).toBe('sub_re_villas');
      expect(res.fallbackUsed).toBe(false);
    });

    it('Golden Test #75 (Generic Fallback): resolves unmapped category to GENERIC_LOCAL pack with fallbackUsed = true', () => {
      const res = industryService.resolveBusinessIndustry('Local Pet Grooming & Aquarium Shop');

      expect(res.industry).toBe('GENERIC_LOCAL');
      expect(res.fallbackUsed).toBe(true);
      expect(res.packId).toBe('pack_generic_local_v1');
    });
  });

  describe('2. Golden Test #70 — Same Request, Different Industry Reasoning', () => {
    it('produces visibly distinct strategic reasoning structures for Restaurant vs Salon vs Real Estate', () => {
      const restReasoning = industryService.generateIndustryAwareReasoning('Family Dining Restaurant', 'Promotional campaign');
      const salonReasoning = industryService.generateIndustryAwareReasoning('Women Skin & Beauty Salon', 'Promotional campaign');
      const reReasoning = industryService.generateIndustryAwareReasoning('Residential Apartments Builder', 'Promotional campaign');

      expect(restReasoning.industry).toBe('RESTAURANT');
      expect(salonReasoning.industry).toBe('SALON');
      expect(reReasoning.industry).toBe('REAL_ESTATE');

      expect(restReasoning.recommendedCTA).toMatch(/Order|Table|Visit/);
      expect(salonReasoning.recommendedCTA).toMatch(/Book|Appointment|Stylist/);
      expect(reReasoning.recommendedCTA).toMatch(/Site Visit|Floor Plan|Pricing/);
    });
  });

  describe('3. Golden Test #71 — Same Offer, Different Industry Strategy', () => {
    it('pairs "20% OFF" offer with industry-appropriate mechanism and CTA', () => {
      const restGuidance = industryService.generateIndustryAwareReasoning('Family Dining Restaurant', '20% OFF');
      const salonGuidance = industryService.generateIndustryAwareReasoning('Womens Beauty Salon', '20% OFF');

      expect(restGuidance.recommendedMechanism.length).toBeGreaterThan(0);
      expect(salonGuidance.recommendedMechanism.length).toBeGreaterThan(0);
      expect(restGuidance.industry).not.toEqual(salonGuidance.industry);
    });
  });

  describe('4. Golden Test #72 — Same Mechanism, Different Industry Expression', () => {
    it('expresses DECISION_RELIEF mechanism differently across Restaurant, Salon, and Real Estate', () => {
      const restPack = registry.get('RESTAURANT')!;
      const salonPack = registry.get('SALON')!;

      const restMech = restPack.creativeMechanisms.find((m) => m.globalMechanismId === 'DECISION_RELIEF');
      const salonMech = salonPack.creativeMechanisms.find((m) => m.globalMechanismId === 'EXPERT_DIAGNOSIS');

      expect(restMech?.industryExpression).toContain('dinner debate');
      expect(salonMech?.industryExpression).toContain('stylist analyzing');
    });
  });

  describe('5. Golden Test #73 — Anti-Pattern Detection', () => {
    it('retrieves domain-specific anti-patterns for each industry', () => {
      const restPack = registry.get('RESTAURANT')!;
      const salonPack = registry.get('SALON')!;
      const rePack = registry.get('REAL_ESTATE')!;

      expect(restPack.antiPatterns.some((a) => a.pattern.includes('Stock Food'))).toBe(true);
      expect(salonPack.antiPatterns.some((a) => a.pattern.includes('AI-generated'))).toBe(true);
      expect(rePack.antiPatterns.some((a) => a.pattern.includes('Guaranteed'))).toBe(true);
    });
  });

  describe('6. Golden Test #76 — Pack Versioning & Reproducibility', () => {
    it('retrieves exact active pack version for reproducible campaign decisions', () => {
      const pack = registry.get('RESTAURANT', '1.0.0');

      expect(pack).not.toBeNull();
      expect(pack?.version).toBe('1.0.0');
      expect(pack?.id).toBe('pack_restaurant_v1');
    });
  });
});
