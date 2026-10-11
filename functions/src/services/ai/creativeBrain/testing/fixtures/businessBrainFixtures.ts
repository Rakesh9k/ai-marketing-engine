/**
 * PHASE 10.40 — Business Brain Test Fixtures
 * Standard business profiles for testing brand voice, language preferences, positioning, and forbidden rules.
 */

import type { IndustryVertical } from "../../recipes/creativeRecipe.types";

export interface TestBusinessProfile {
  businessId: string;
  tenantId: string;
  name: string;
  industry: IndustryVertical;
  subVertical: string;
  positioning: string;
  brandVoice: {
    tone: string;
    formality: "CASUAL" | "PREMIUM" | "PROFESSIONAL" | "URGENT";
    languagePreference: "ENGLISH_ONLY" | "HINGLISH" | "TELUGU" | "MARATHI";
    forbiddenWords: string[];
    allowedClaims: string[];
  };
  verifiedEvidence: {
    hasTestimonials: boolean;
    hasReviewCount: boolean;
    reviewRating?: number;
    totalCustomers?: number;
    hasStatedExpiry: boolean;
    expiryDate?: string;
    hasInventoryLimit: boolean;
    inventoryCount?: number;
    verifiedClaims: string[];
  };
}

export const FIXTURE_PREMIUM_SALON: TestBusinessProfile = {
  businessId: "biz_salon_001",
  tenantId: "tenant_salon_alpha",
  name: "Aura Luxe Hair & Skin Lounge",
  industry: "SALON",
  subVertical: "Luxury Hair Salon",
  positioning: "Premium neighborhood hair styling & skin sanctuary",
  brandVoice: {
    tone: "Sophisticated, warm, expert",
    formality: "PREMIUM",
    languagePreference: "ENGLISH_ONLY",
    forbiddenWords: ["crazy deal", "cheap", "hurry up", "discount frenzy", "unbeatable price"],
    allowedClaims: ["100% Ammonia-free colors", "Certified master stylists"],
  },
  verifiedEvidence: {
    hasTestimonials: false,
    hasReviewCount: false,
    hasStatedExpiry: false,
    hasInventoryLimit: false,
    verifiedClaims: ["Ammonia-free organic colors", "Certified master stylists"],
  },
};

export const FIXTURE_CASUAL_RESTAURANT: TestBusinessProfile = {
  businessId: "biz_restaurant_001",
  tenantId: "tenant_rest_beta",
  name: "Spicy Route Biryani & Family Kitchen",
  industry: "RESTAURANT",
  subVertical: "Family Dining Restaurant",
  positioning: "Authentic local family dining experience",
  brandVoice: {
    tone: "Welcoming, generous, appetizing",
    formality: "CASUAL",
    languagePreference: "HINGLISH",
    forbiddenWords: ["ultra luxury", "exclusive membership only"],
    allowedClaims: ["Authentic Dum Biryani", "Cooked fresh daily"],
  },
  verifiedEvidence: {
    hasTestimonials: true,
    hasReviewCount: true,
    reviewRating: 4.8,
    totalCustomers: 15000,
    hasStatedExpiry: true,
    expiryDate: "2026-10-31",
    hasInventoryLimit: false,
    verifiedClaims: ["4.8 Star Rated on Google", "Over 15,000 satisfied families served"],
  },
};

export const FIXTURE_REAL_ESTATE_DEVELOPER: TestBusinessProfile = {
  businessId: "biz_re_001",
  tenantId: "tenant_re_gamma",
  name: "Skyline Infra Developers",
  industry: "REAL_ESTATE",
  subVertical: "Suburban Residential Apartments",
  positioning: "Transparent, RERA-approved family township developer",
  brandVoice: {
    tone: "Trustworthy, professional, futuristic",
    formality: "PROFESSIONAL",
    languagePreference: "ENGLISH_ONLY",
    forbiddenWords: ["guaranteed 100% returns", "overnight wealth", "cheap plots"],
    allowedClaims: ["RERA Approved: P02400001234", "10-Min to Financial District"],
  },
  verifiedEvidence: {
    hasTestimonials: true,
    hasReviewCount: false,
    hasStatedExpiry: false,
    hasInventoryLimit: true,
    inventoryCount: 12,
    verifiedClaims: ["RERA Registered P02400001234", "12 Phase-1 units remaining"],
  },
};
