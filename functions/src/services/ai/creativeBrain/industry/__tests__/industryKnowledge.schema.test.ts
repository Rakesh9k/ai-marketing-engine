import { describe, it, expect } from '@jest/globals';
import { IndustryCreativeKnowledgeSchema } from '../industryKnowledge.schema';
import { RESTAURANT_KNOWLEDGE } from '../restaurant.knowledge';
import { SALON_KNOWLEDGE } from '../salon.knowledge';
import { REAL_ESTATE_KNOWLEDGE } from '../realEstate.knowledge';
import { GENERIC_LOCAL_BUSINESS_KNOWLEDGE } from '../generic.knowledge';

describe('Phase 3 — Industry Creative Knowledge Schema Test Suite', () => {
  it('should validate RESTAURANT_KNOWLEDGE schema cleanly', () => {
    const result = IndustryCreativeKnowledgeSchema.safeParse(RESTAURANT_KNOWLEDGE);
    expect(result.success).toBe(true);
  });

  it('should validate SALON_KNOWLEDGE schema cleanly', () => {
    const result = IndustryCreativeKnowledgeSchema.safeParse(SALON_KNOWLEDGE);
    expect(result.success).toBe(true);
  });

  it('should validate REAL_ESTATE_KNOWLEDGE schema cleanly', () => {
    const result = IndustryCreativeKnowledgeSchema.safeParse(REAL_ESTATE_KNOWLEDGE);
    expect(result.success).toBe(true);
  });

  it('should validate GENERIC_LOCAL_BUSINESS_KNOWLEDGE schema cleanly', () => {
    const result = IndustryCreativeKnowledgeSchema.safeParse(GENERIC_LOCAL_BUSINESS_KNOWLEDGE);
    expect(result.success).toBe(true);
  });

  it('should reject invalid industry knowledge schema missing required fields', () => {
    const invalidKnowledge = {
      industryId: 'broken',
      displayName: 'Broken Knowledge',
      // Missing subtypes, objectives, etc.
    };
    const result = IndustryCreativeKnowledgeSchema.safeParse(invalidKnowledge);
    expect(result.success).toBe(false);
  });
});
