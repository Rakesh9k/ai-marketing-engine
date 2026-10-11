import { describe, it, expect } from '@jest/globals';
import { IndustryKnowledgeResolver } from '../industryKnowledge.resolver';
import type { BusinessBrain } from '../../../../../types';

describe('Phase 3 — Industry Knowledge Resolver Test Suite', () => {
  it('should resolve restaurant industry context and detect biryani subtype accurately', () => {
    const brain: BusinessBrain = {
      identity: {
        name: 'Hyderabadi Spice House',
        category: 'restaurant',
        industry: 'restaurant',
        description: 'Authentic Hyderabadi Mutton Biryani delivery',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
      },
      products: [
        {
          productId: 'p1',
          name: 'Special Mutton Dum Biryani',
          description: 'Slow cooked aromatic basmati rice with tender mutton',
          price: 399,
          category: 'biryani',
          tags: ['biryani', 'spicy'],
        },
      ],
      brand: { tone: 'friendly' },
      audience: { targetCustomer: 'Biryani lovers' },
      localization: { primaryLanguage: 'en', regionalStyle: 'hyderabadi' },
      businessRules: {},
      lastSyncedAt: new Date().toISOString(),
      campaignHistory: [],
    } as any;

    const context = IndustryKnowledgeResolver.resolve({ businessBrain: brain, vertical: 'restaurant' });

    expect(context.industry.id).toBe('restaurant');
    expect(context.industry.authority).toBe('CONFIRMED');
    expect(context.activeSubtypes.length).toBeGreaterThan(0);
    expect(context.activeSubtypes[0]!.id).toBe('biryani');
    expect(context.activeSubtypes[0]!.authority).toBe('INFERRED');
    expect(context.sourceTrace.fallbackUsed).toBe(false);
  });

  it('should resolve salon industry context and detect bridal subtype', () => {
    const brain: BusinessBrain = {
      identity: {
        name: 'Glow Beauty Studio',
        category: 'salon',
        description: 'Luxury bridal makeover and skincare lounge',
        location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
      },
      products: [
        {
          productId: 'p2',
          name: 'Royal Bridal Glow Makeover',
          description: 'HD bridal makeup and pre-wedding facial package',
          price: 15000,
          category: 'bridal',
          tags: ['bridal', 'makeup'],
        },
      ],
      brand: { tone: 'luxurious' },
      businessRules: {},
      lastSyncedAt: new Date().toISOString(),
      campaignHistory: [],
    } as any;

    const context = IndustryKnowledgeResolver.resolve({ businessBrain: brain, vertical: 'salon' });

    expect(context.industry.id).toBe('salon');
    expect(context.activeSubtypes.some((s) => s.id === 'bridal')).toBe(true);
    expect(context.relevantTerritories.some((t) => t.id === 'transformation')).toBe(true);
  });

  it('should resolve real estate industry context and detect luxury residential subtype', () => {
    const brain: BusinessBrain = {
      identity: {
        name: 'Skyline Heights Realty',
        category: 'real_estate',
        description: 'Ultra-luxury 3BHK penthouses and sky villas',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Financial District' },
      },
      products: [
        {
          productId: 'p3',
          name: 'Luxury 3BHK Open House',
          description: 'Gated sky villa with 30,000 sq.ft. clubhouse',
          price: 8500000,
          category: 'luxury_residential',
          tags: ['penthouse', 'luxury'],
        },
      ],
      brand: { tone: 'authoritative' },
      businessRules: {},
      lastSyncedAt: new Date().toISOString(),
      campaignHistory: [],
    } as any;

    const context = IndustryKnowledgeResolver.resolve({ businessBrain: brain, vertical: 'real_estate' });

    expect(context.industry.id).toBe('real_estate');
    expect(context.activeSubtypes.some((s) => s.id === 'luxury_residential' || s.id === 'residential')).toBe(true);
    expect(context.relevantTerritories.some((t) => t.id === 'future_lifestyle')).toBe(true);
  });

  it('should fall back safely to generic_local_business for unknown industry', () => {
    const brain: BusinessBrain = {
      identity: {
        name: 'Pet Care Paradise',
        category: 'pet_grooming',
        description: 'Professional dog grooming and pet boarding',
        location: { city: 'Bengaluru', state: 'Karnataka', locality: 'Koramangala' },
      },
      products: [],
      brand: { tone: 'friendly' },
      businessRules: {},
      lastSyncedAt: new Date().toISOString(),
      campaignHistory: [],
    } as any;

    const context = IndustryKnowledgeResolver.resolve({ businessBrain: brain, vertical: 'pet_grooming' });

    expect(context.industry.id).toBe('generic_local_business');
    expect(context.sourceTrace.fallbackUsed).toBe(true);
    expect(context.questionCandidates.length).toBeGreaterThan(0);
  });
});
