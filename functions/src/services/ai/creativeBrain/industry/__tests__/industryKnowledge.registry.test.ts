import { describe, it, expect } from '@jest/globals';
import { IndustryKnowledgeRegistry } from '../industryKnowledge.registry';
import type { IndustryCreativeKnowledge } from '../industryKnowledge.types';

describe('Phase 3 — Industry Knowledge Registry Test Suite', () => {
  const registry = IndustryKnowledgeRegistry.getInstance();

  it('should retrieve registered standard industries correctly', () => {
    expect(registry.hasIndustry('restaurant')).toBe(true);
    expect(registry.hasIndustry('salon')).toBe(true);
    expect(registry.hasIndustry('real_estate')).toBe(true);
    expect(registry.hasIndustry('generic_local_business')).toBe(true);

    const restaurant = registry.getIndustry('restaurant');
    expect(restaurant.industryId).toBe('restaurant');
    expect(restaurant.subtypes.length).toBeGreaterThan(0);
  });

  it('should gracefully degrade to generic_local_business for unknown industry', () => {
    const unknownId = 'pet_services_clinic';
    expect(registry.hasIndustry(unknownId)).toBe(false);

    const fallback = registry.getIndustry(unknownId);
    expect(fallback.industryId).toBe('generic_local_business');
    expect(fallback.customerDimensions.length).toBeGreaterThan(0);
  });

  it('should support dynamic registration of new industry models without modifying state machine code', () => {
    const newIndustry: IndustryCreativeKnowledge = {
      industryId: 'gym_fitness',
      displayName: 'Gym & Fitness Center',
      subtypes: [
        { id: 'crossfit', displayName: 'CrossFit Box', keywords: ['crossfit', 'hiit'] },
      ],
      marketingObjectives: [
        { id: 'free_trial', label: 'Free Trial Pass', description: 'Promote 3-day free workout pass', priorityScore: 90, primaryCreativeTerritories: ['transformation'] },
      ],
      customerDimensions: [
        { id: 'fitness_goal', label: 'Fitness Goal', description: 'Weight loss vs muscle gain', decisionImpact: 90, creativeRelevance: 90, typicalUncertainty: 30 },
      ],
      creativeDimensions: [
        { id: 'stamina_boost', label: 'Energy Boost', decisionImpact: 85, creativeRelevance: 85, description: 'Energy boost' },
      ],
      offerPatterns: [
        { id: 'membership_discount', label: 'Annual Membership Offer', urgencyPotential: 80, valuePotential: 90, trustSensitivity: 30 },
      ],
      creativeTerritories: [
        { id: 'transformation', label: 'Body Transformation', family: 'empowerment', description: 'Physical result', emotionalDriver: 'proud', strategicRole: 'Motivate signup' },
      ],
      audiencePatterns: [
        { id: 'gym_goers', label: 'Fitness Enthusiasts', description: 'Regular workout seekers', typicalNeed: 'Modern equipment' },
      ],
      occasionPatterns: [
        { id: 'new_year', label: 'New Year Resolution', urgencyLevel: 'high' },
      ],
      trustSignals: [
        { id: 'certified_trainers', label: 'Certified Personal Trainers', sensitivity: 90, description: 'Expert guidance' },
      ],
      questionCandidates: [
        {
          id: 'q_gym_goal',
          dimensionKey: 'fitness_goal',
          category: 'motivation',
          promptTemplate: 'What is the primary fitness goal for {{productName}}?',
          options: ['Weight Loss & Fat Burn', 'Muscle Building & Strength', 'Overall Wellness & Stamina'],
          contextReason: 'Materially clarifies workout focus.',
          decisionImpact: 85,
          creativeRelevance: 90,
          userEffort: 20,
          affectsStates: ['CUSTOMER_INSIGHT', 'CREATIVE_TERRITORY'],
        },
      ],
      metadata: {
        version: '1.0.0',
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      },
    };

    registry.registerIndustry(newIndustry);

    expect(registry.hasIndustry('gym_fitness')).toBe(true);
    const retrieved = registry.getIndustry('gym_fitness');
    expect(retrieved.displayName).toBe('Gym & Fitness Center');
  });
});
