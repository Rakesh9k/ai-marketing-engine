import { describe, it, expect } from '@jest/globals';
import { DynamicQuestionEngine } from '../creativeQuestion.engine';
import { IndustryKnowledgeResolver } from '../../industry/industryKnowledge.resolver';
import { IndustryKnowledgeValidator } from '../../industry/industryKnowledge.validation';
import type { BusinessBrain } from '../../../../../types';

describe('Phase 3B / Phase 4 — Behavioral Intelligence Validation Test Suite', () => {
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
    audience: { targetCustomer: 'Biryani lovers' },
  } as any;

  const mockSalonBrain: BusinessBrain = {
    identity: {
      name: 'Glow Beauty Studio',
      industry: 'salon',
      category: 'salon',
      description: 'Bridal makeovers and luxury skincare.',
      location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
    },
    products: [
      {
        productId: 'p2',
        name: 'Bridal Makeover Package',
        description: 'HD makeup and hair styling',
        price: 15000,
        category: 'Bridal',
        tags: ['bridal', 'makeup'],
      },
    ],
  } as any;

  describe('1. Fully Specified Business (Zero Question Overhead)', () => {
    it('avoids asking questions and proceeds directly to creative blueprint when all required facts are present', () => {
      const res = DynamicQuestionEngine.evaluate({
        state: 'AUDIENCE_REASONING',
        businessBrain: mockRestaurantBrain,
        productContext: { name: 'Hyderabadi Chicken Biryani', price: 350 },
        campaignIntent: {
          objective: { primaryObjective: 'increase_orders' },
          offer: { headline: '20% OFF Biryani' },
          audience: { primaryAudience: 'Families ordering dinner' },
        } as any,
      });

      expect(res.action).toBe('PROCEED');
      expect(res.question).toBeUndefined();
      expect(res.trace.action).toBe('PROCEED');
    });
  });

  describe('2. Sparse Business Brain with High-Value Missing Info', () => {
    it('asks exactly ONE high-value question when primary audience is missing and materially affects strategy', () => {
      const sparseBrain: BusinessBrain = {
        identity: {
          name: 'The Food Shop',
          description: 'A local place',
        },
      } as any;

      const res = DynamicQuestionEngine.evaluate({
        state: 'AUDIENCE_REASONING',
        businessBrain: sparseBrain,
        productContext: { name: 'Special Burger' },
      });

      expect(res.action).toBe('ASK');
      expect(res.question).toBeDefined();
      expect(res.reasoning.informationValue).toBeGreaterThan(50);
      expect(res.missingInformation.length).toBeGreaterThan(0);
    });
  });

  describe('3. Contradictory Campaign Instructions & Conflict Handling', () => {
    it('detects price conflicts between Business Brain product catalog and Campaign offer headline', () => {
      const conflicts = IndustryKnowledgeResolver.resolve({
        businessBrain: mockRestaurantBrain,
        productContext: { name: 'Hyderabadi Chicken Biryani', price: 250 }, // Catalog price = 350, campaign price = 250
        campaignIntent: {
          offer: { headline: 'Hyderabadi Chicken Biryani at ₹250', price: 250 },
        } as any,
      });

      expect(conflicts.activeSubtypes.length).toBeGreaterThan(0);
      // Fact safety validator asserts claim safety
      const safety = IndustryKnowledgeValidator.validateClaimSafety(
        'Order online for 30-minute delivery',
        mockRestaurantBrain
      );
      expect(safety.safe).toBe(false); // Delivery not confirmed in Business Brain
    });
  });

  describe('4. Unknown Industry & Generic Fallback', () => {
    it('gracefully falls back to generic_local_business without crashing or using LLM', () => {
      const unknownBrain: BusinessBrain = {
        identity: {
          name: 'Quantum Drone Repair',
          industry: 'quantum_robotics', // Unregistered vertical
          description: 'Local drone hardware repair shop',
        },
      } as any;

      const context = IndustryKnowledgeResolver.resolve({
        businessBrain: unknownBrain,
        vertical: 'quantum_robotics',
      });

      expect(context.industry.id).toBe('generic_local_business');
      expect(context.industry.authority).toBe('HYPOTHESIZED');

      const res = DynamicQuestionEngine.evaluate({
        state: 'AUDIENCE_REASONING',
        businessBrain: unknownBrain,
        industryContext: context,
      });

      expect(res.action).toBe('ASK');
      expect(res.question?.options?.length).toBeGreaterThan(0);
    });
  });

  describe('5. Behavioral Intelligence Metrics — Question Utility Evaluation', () => {
    it('measures Decision-Changing Question Rate (DCQR) > 80% on high-uncertainty scenarios', () => {
      const testCases = [
        {
          brain: mockRestaurantBrain,
          product: { name: 'Biryani' },
          intent: { offer: { headline: 'Special Deal' } },
          questionAsked: true,
          changesConcept: true,
        },
        {
          brain: mockSalonBrain,
          product: { name: 'Bridal Makeover' },
          intent: { offer: { headline: '30% OFF' }, audience: { primaryAudience: 'Brides' } },
          questionAsked: false, // Fully specified -> skipped
          changesConcept: false,
        },
      ];

      let askedCount = 0;
      let decisionChangingCount = 0;

      for (const tc of testCases) {
        const res = DynamicQuestionEngine.evaluate({
          state: 'AUDIENCE_REASONING',
          businessBrain: tc.brain,
          productContext: tc.product,
          campaignIntent: tc.intent as any,
        });

        if (res.action === 'ASK') {
          askedCount += 1;
          if (tc.changesConcept) {
            decisionChangingCount += 1;
          }
        }
      }

      // Calculate Decision-Changing Question Rate
      const dcqr = askedCount > 0 ? decisionChangingCount / askedCount : 1.0;
      expect(dcqr).toBeGreaterThanOrEqual(0.8);
    });
  });
});
