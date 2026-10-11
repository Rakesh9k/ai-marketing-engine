/**
 * Phase 29 — Six Canonical Test Businesses
 * Mitra by BrainWise
 */

import type { BusinessBrainSnapshot } from '../evaluation.types';

export interface TestBusinessDefinition {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  location: string;
  snapshot: Partial<BusinessBrainSnapshot>;
}

export const CANONICAL_TEST_BUSINESSES: Record<string, TestBusinessDefinition> = {
  hyderabad_biryani: {
    id: 'hyderabad_biryani',
    name: 'Bawarchi Heritage Biryani',
    industry: 'restaurant',
    subIndustry: 'biryani',
    location: 'Hyderabad',
    snapshot: {
      businessId: 'hyderabad_biryani',
      businessType: 'restaurant',
      subIndustry: 'biryani',
      positioning: 'traditional_hyderabad_biryani',
      location: 'Hyderabad',
      targetAudience: ['families', 'young professionals', 'local food lovers'],
      products: ['chicken biryani', 'mutton biryani', 'family pack feasts'],
      strengths: ['authentic dum preparation', 'generous family portions', 'local heritage reputation'],
      brandTone: ['warm', 'confident', 'hometown_proud'],
      constraints: ['no unsupported historical claims before 1995', 'no fake award claims']
    }
  },

  premium_cafe: {
    id: 'premium_cafe',
    name: 'Roast & Artisan Specialty Café',
    industry: 'restaurant',
    subIndustry: 'specialty_cafe',
    location: 'Hyderabad (Jubilee Hills)',
    snapshot: {
      businessId: 'premium_cafe',
      businessType: 'restaurant',
      subIndustry: 'cafe',
      positioning: 'premium_design_conscious_specialty_cafe',
      location: 'Hyderabad',
      targetAudience: ['young professionals', 'couples', 'remote workers', 'coffee connoisseurs'],
      products: ['single-origin pour-over', 'artisanal avocado toast', 'truffle pastries'],
      strengths: ['aesthetic interior ambience', 'ethically sourced beans', 'expert baristas'],
      brandTone: ['sophisticated', 'warm', 'modern', 'understated'],
      constraints: ['avoid aggressive price discount flyers', 'avoid cheap mass-market messaging']
    }
  },

  cloud_kitchen: {
    id: 'cloud_kitchen',
    name: 'Midnight Craving Cloud Kitchen',
    industry: 'restaurant',
    subIndustry: 'cloud_kitchen',
    location: 'Hyderabad (Hitec City)',
    snapshot: {
      businessId: 'cloud_kitchen',
      businessType: 'restaurant',
      subIndustry: 'cloud_kitchen',
      positioning: 'fast_affordable_delivery_first',
      location: 'Hyderabad',
      targetAudience: ['tech workers', 'students', 'late-night ordering groups'],
      products: ['late night burger boxes', 'loaded fries', 'quick rice bowls'],
      strengths: ['under 30-min delivery', 'budget combo value', 'open till 3 AM'],
      brandTone: ['energetic', 'conversational', 'practical', 'fun'],
      constraints: ['no dining room seating claims', 'delivery radius capped at 8km']
    }
  },

  premium_womens_salon: {
    id: 'premium_womens_salon',
    name: 'Aura Luxury Beauty & Hair Spa',
    industry: 'salon',
    subIndustry: 'hair_skin_salon',
    location: 'Hyderabad (Banjara Hills)',
    snapshot: {
      businessId: 'premium_womens_salon',
      businessType: 'salon',
      subIndustry: 'hair_salon',
      positioning: 'premium_personalized_beauty_experience',
      location: 'Hyderabad',
      targetAudience: ['women 22-45', 'working professionals', 'bridal clients'],
      products: ['balayage color correction', 'hydra-facial detox', 'bridal hair & makeup'],
      strengths: ['certified master stylists', 'individual 15-min consultation', 'Olaplex/Kerastase products'],
      brandTone: ['elegant', 'confident', 'warm', 'attentive'],
      constraints: ['avoid generic budget discount flyers', 'no heavy face-tuning filters in ads']
    }
  },

  budget_unisex_salon: {
    id: 'budget_unisex_salon',
    name: 'QuickCut Express Salon',
    industry: 'salon',
    subIndustry: 'express_barbershop',
    location: 'Hyderabad (Kukatpally)',
    snapshot: {
      businessId: 'budget_unisex_salon',
      businessType: 'salon',
      subIndustry: 'unisex_salon',
      positioning: 'accessible_everyday_grooming',
      location: 'Hyderabad',
      targetAudience: ['students', 'young professionals', 'neighborhood families'],
      products: ['express haircut', 'beard trim & line-up', 'basic hair color'],
      strengths: ['no appointment needed', 'wallet-friendly prices', 'fast 20-min service'],
      brandTone: ['friendly', 'simple', 'direct', 'approachable'],
      constraints: ['no claims of luxury spa ambiance']
    }
  },

  midrange_apartments: {
    id: 'midrange_apartments',
    name: 'Greenwood Park Residences',
    industry: 'real_estate',
    subIndustry: 'residential_apartments',
    location: 'Hyderabad (Gachibowli)',
    snapshot: {
      businessId: 'midrange_apartments',
      businessType: 'real_estate',
      subIndustry: 'residential_sales',
      positioning: 'practical_family_oriented_living',
      location: 'Hyderabad',
      targetAudience: ['first-time home buyers', 'young growing families', 'IT professionals'],
      products: ['2BHK (1250 sqft)', '3BHK (1680 sqft) gated apartments'],
      strengths: ['top-rated school district (2 mins away)', 'gated clubhouse & pool', 'clear RERA title'],
      brandTone: ['trustworthy', 'reassuring', 'clear', 'grounded'],
      constraints: ['no guaranteed ROI return promises', 'no fabricated appreciation claims', 'no fake metro distance claims']
    }
  }
};
