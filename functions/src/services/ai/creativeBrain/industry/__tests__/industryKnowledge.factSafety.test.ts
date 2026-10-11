import { IndustryKnowledgeResolver } from '../industryKnowledge.resolver';
import { IndustryKnowledgeValidator } from '../industryKnowledge.validation';
import type { BusinessBrain } from '../../../../../types';

describe('Phase 3 — Knowledge vs Fact Safety & Precedence Boundaries', () => {
  const mockRestaurantBrain: BusinessBrain = {
    identity: {
      name: 'Royal Biryani House',
      industry: 'restaurant',
      category: 'restaurant',
      description: 'Authentic dum biryani cooked with traditional spices.',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
    },
    products: [
      {
        productId: 'p1',
        name: 'Hyderabadi Chicken Biryani',
        description: 'Slow-cooked aromatic dum biryani',
        price: 350,
        category: 'Biryani',
        tags: ['biryani'],
      },
    ],
  } as any;

  const mockSalonBrainWithoutCert: BusinessBrain = {
    identity: {
      name: 'Glow Beauty Lounge',
      industry: 'salon',
      category: 'salon',
      description: 'Relaxing facial treatments and hair styling.',
      location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
    },
    products: [
      {
        productId: 'p2',
        name: 'Hydrating Facial',
        description: 'Deep cleansing facial service',
        price: 1500,
        category: 'Skincare',
        tags: ['facial'],
      },
    ],
  } as any;

  const mockRealEstateBrainWithoutRera: BusinessBrain = {
    identity: {
      name: 'Apex Heights',
      industry: 'real_estate',
      category: 'real_estate',
      description: 'Modern 3BHK apartments with luxury amenities.',
      location: { city: 'Bengaluru', state: 'Karnataka', locality: 'Whitefield' },
    },
    products: [
      {
        productId: 'p3',
        name: '3BHK Luxury Apartment',
        description: 'Spacious 1800 sq ft home in city center',
        price: 12000000,
        category: 'Residential',
        tags: ['apartment'],
      },
    ],
  } as any;

  describe('1. Business Brain Precedence over Caller Vertical Hints', () => {
    it('prioritizes authoritative Business Brain industry when a caller passes conflicting vertical hint', () => {
      const result = IndustryKnowledgeResolver.resolve({
        businessBrain: mockRestaurantBrain,
        vertical: 'salon', // Caller attempting to override restaurant with salon
      });

      expect(result.industry.id).toBe('restaurant');
      expect(result.industry.authority).toBe('CONFIRMED');
      expect(result.industry.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('prioritizes authoritative Business Brain category over caller vertical hint', () => {
      const brainWithCategoryOnly: BusinessBrain = {
        identity: {
          name: 'Food Express',
          category: 'restaurant',
          description: 'Casual fast food joint',
          location: { city: 'Delhi', state: 'Delhi', locality: 'CP' },
        },
      } as any;

      const result = IndustryKnowledgeResolver.resolve({
        businessBrain: brainWithCategoryOnly,
        vertical: 'real_estate',
      });

      expect(result.industry.id).toBe('restaurant');
      expect(result.industry.authority).toBe('CONFIRMED');
    });

    it('marks caller vertical hint as INFERRED when Business Brain lacks industry and category', () => {
      const brainWithoutIndustry: BusinessBrain = {
        identity: {
          name: 'Corner Store',
          description: 'Local neighborhood store',
          location: { city: 'Pune', state: 'Maharashtra', locality: 'Kothrud' },
        },
      } as any;

      const result = IndustryKnowledgeResolver.resolve({
        businessBrain: brainWithoutIndustry,
        vertical: 'salon',
      });

      expect(result.industry.id).toBe('salon');
      expect(result.industry.authority).toBe('INFERRED');
      expect(result.industry.confidence).toBe(0.85);
    });
  });

  describe('2. Subtype Resolution Authority & Source Attribution', () => {
    it('resolves subtype with INFERRED authority and specific source metadata', () => {
      const result = IndustryKnowledgeResolver.resolve({
        businessBrain: mockRestaurantBrain,
        productContext: {
          name: 'Special Hyderabadi Biryani',
          description: 'Traditional dum cooked biryani',
        },
      });

      const biryaniSubtype = result.activeSubtypes.find((s) => s.id === 'biryani');
      expect(biryaniSubtype).toBeDefined();
      expect(biryaniSubtype?.authority).toBe('INFERRED');
      expect(biryaniSubtype?.source).toBe('PRODUCT_CONTEXT');
      expect(biryaniSubtype?.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('3. Knowledge vs Fact Safety Boundaries', () => {
    it('prohibits generating delivery claims when delivery service is unconfirmed in Business Brain', () => {
      const checkResult = IndustryKnowledgeValidator.validateClaimSafety(
        'Order online for fast 30-minute delivery!',
        mockRestaurantBrain
      );

      expect(checkResult.safe).toBe(false);
      expect(checkResult.prohibitedClaim).toBe('30-minute delivery');
      expect(checkResult.reason).toContain('asserts a delivery service fact not confirmed in Business Brain');
    });

    it('allows delivery claims when delivery fact is explicitly present in Business Brain', () => {
      const brainWithDelivery: BusinessBrain = {
        ...mockRestaurantBrain,
        identity: {
          ...mockRestaurantBrain.identity,
          description: 'Authentic dum biryani. Home delivery available on Zomato & Swiggy.',
        },
      } as any;

      const checkResult = IndustryKnowledgeValidator.validateClaimSafety(
        'Fast delivery available now!',
        brainWithDelivery
      );

      expect(checkResult.safe).toBe(true);
    });

    it('prohibits generating clinical certification claims when certification is unconfirmed', () => {
      const checkResult = IndustryKnowledgeValidator.validateClaimSafety(
        'Get treatment by certified experts and clinically proven formulas',
        mockSalonBrainWithoutCert
      );

      expect(checkResult.safe).toBe(false);
      expect(checkResult.prohibitedClaim).toBe('certified experts');
      expect(checkResult.reason).toContain('asserts a regulatory or clinical certification fact');
    });

    it('prohibits generating RERA approval claims when RERA is unconfirmed in Real Estate', () => {
      const checkResult = IndustryKnowledgeValidator.validateClaimSafety(
        'Luxury 3BHK Apartments - RERA Approved Project',
        mockRealEstateBrainWithoutRera
      );

      expect(checkResult.safe).toBe(false);
      expect(checkResult.prohibitedClaim).toBe('rera approved');
      expect(checkResult.reason).toContain('asserts a RERA regulatory approval fact');
    });

    it('allows RERA claims when RERA registration is confirmed in Business Brain', () => {
      const brainWithRera: BusinessBrain = {
        ...mockRealEstateBrainWithoutRera,
        identity: {
          ...mockRealEstateBrainWithoutRera.identity,
          description: 'Modern 3BHK apartments. RERA Approved Registration #PRM/KA/RERA/1251.',
        },
      } as any;

      const checkResult = IndustryKnowledgeValidator.validateClaimSafety(
        'Luxury 3BHK Apartments - RERA Approved Project',
        brainWithRera
      );

      expect(checkResult.safe).toBe(true);
    });
  });
});
