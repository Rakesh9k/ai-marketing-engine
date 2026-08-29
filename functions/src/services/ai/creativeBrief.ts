import type {
  BusinessProfile,
  BrandProfile,
  LocalizationProfile,
  Product,
  BusinessRules,
  CampaignObjective,
  OfferType,
  CTAType,
} from '../../types';

/**
 * CreativeBrief - Centralized typed creative brief for image generation
 *
 * Derived from:
 * - Business Brain (BusinessProfile, BrandProfile, LocalizationProfile, BusinessRules)
 * - Product
 * - Offer
 * - Campaign Strategy
 * - Copy Pack
 * - Visual Direction
 */
export interface CreativeBrief {
  /** Campaign objective */
  readonly objective: string;

  /** Product being marketed */
  readonly product: {
    readonly id: string;
    readonly name: string;
    readonly imageUrl: string;
    readonly description?: string;
    readonly price: number;
    readonly originalPrice?: number;
    readonly category: string;
    readonly visualAttributes?: ProductVisualAttributes;
  };

  /** Offer details */
  readonly offer?: {
    readonly title?: string;
    readonly description?: string;
    readonly price: number;
    readonly originalPrice?: number;
    readonly discount?: string;
    readonly type: OfferType;
    readonly validity?: string;
    readonly terms?: string;
  };

  /** Brand identity */
  readonly brand: {
    readonly colors?: readonly string[];
    readonly tone?: string;
    readonly visualStyle?: string;
    readonly logoUrl?: string;
    readonly fonts?: {
      readonly heading?: string;
      readonly body?: string;
    };
  };

  /** Localization context */
  readonly localization: {
    readonly language: string;
    readonly region?: string;
    readonly regionalStyle?: string;
    readonly contentStyle?: string;
    readonly audienceDescription?: string;
    readonly languageMixing?: string;
    readonly slangPreference?: string;
  };

  /** Visual direction for creative */
  readonly visualDirection: {
    readonly composition?: string;
    readonly background?: string;
    readonly lighting?: string;
    readonly mood?: string;
    readonly typography?: string;
    readonly props?: readonly string[];
    readonly styleGuidance?: string;
  };

  /** Elements that MUST appear in the creative */
  readonly requiredElements?: readonly string[];

  /** Elements that MUST NOT appear in the creative */
  readonly prohibitedElements?: readonly string[];

  /** Generation mode */
  readonly generationMode: 'product_ad' | 'social_post' | 'story' | 'campaign_creative';

  /** Aspect ratio for the output */
  readonly aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';

  /** Copy pack reference for text overlays */
  readonly copyPack?: CopyPackReference;

  /** Campaign strategy reference */
  readonly campaignStrategy?: CampaignStrategyReference;

  /** CTA type for the campaign */
  readonly cta?: CTAType;
}

import type { ProductVisualAttributes } from '../../types';

/**
 * Reference to copy pack for text overlays
 */
export interface CopyPackReference {
  readonly headlines?: readonly string[];
  readonly primaryAdCopy?: readonly string[];
  readonly cta?: string;
  readonly offerText?: string;
}

/**
 * Reference to campaign strategy for creative direction
 */
export interface CampaignStrategyReference {
  readonly angle?: string;
  readonly hook?: string;
  readonly creativeDirection?: {
    readonly visualStyle?: string;
    readonly mood?: string;
    readonly compositionHints?: readonly string[];
  };
  readonly ctaStrategy?: {
    readonly primary?: string;
    readonly urgency?: string;
    readonly valueProposition?: string;
  };
}

/**
 * Input for building a creative brief
 */
export interface CreativeBriefInput {
  /** Business context from Business Brain */
  readonly businessProfile: BusinessProfile;
  /** Brand context from Brand Kit */
  readonly brandProfile: BrandProfile;
  /** Localization profile */
  readonly localizationProfile: LocalizationProfile;
  /** Product being marketed */
  readonly product: Product;
  /** Campaign objective */
  readonly objective: CampaignObjective;
  /** Offer details */
  readonly offer: {
    readonly headline: string;
    readonly description?: string;
    readonly price: number;
    readonly originalPrice?: number;
    readonly type: OfferType;
    readonly validityStart: string;
    readonly validityEnd: string;
    readonly terms?: string;
  };
  /** Campaign strategy output */
  readonly campaignStrategy?: CampaignStrategyReference;
  /** Copy pack output */
  readonly copyPack?: CopyPackReference;
  /** Visual direction preferences */
  readonly visualDirection?: Partial<CreativeBrief['visualDirection']>;
  /** Generation mode */
  readonly generationMode: CreativeBrief['generationMode'];
  /** Aspect ratio */
  readonly aspectRatio: CreativeBrief['aspectRatio'];
  /** Business rules */
  readonly businessRules: BusinessRules;
  /** CTA type */
  readonly cta: CTAType;
}

/**
 * Build a CreativeBrief from structured input
 */
export function buildCreativeBrief(input: CreativeBriefInput): CreativeBrief {
  const { product, offer, localizationProfile, brandProfile, businessProfile, campaignStrategy, copyPack, visualDirection, generationMode, aspectRatio } = input;

  // Determine primary product image
  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const productImageUrl = primaryImage?.url || '';

  // Build brand colors array
  const brandColors = [
    brandProfile.colors?.primary,
    brandProfile.colors?.secondary,
    brandProfile.colors?.accent,
    brandProfile.colors?.background,
    brandProfile.colors?.text,
  ].filter((c): c is string => Boolean(c));

  // Build required elements based on business rules and campaign type
  const requiredElements = buildRequiredElements(input);
  const prohibitedElements = buildProhibitedElements(input);

  return {
    objective: input.objective,
    product: {
      id: product.productId,
      name: product.name,
      imageUrl: productImageUrl,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      category: product.category,
      visualAttributes: product.attributes as unknown as ProductVisualAttributes,
    },
    offer: {
      title: offer.headline,
      description: offer.description,
      price: offer.price,
      originalPrice: offer.originalPrice,
      discount: offer.originalPrice
        ? `${Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)}%`
        : undefined,
      type: offer.type,
      validity: `${new Date(offer.validityStart).toLocaleDateString()} - ${new Date(offer.validityEnd).toLocaleDateString()}`,
      terms: offer.terms,
    },
    brand: {
      colors: brandColors,
      tone: brandProfile.brandTone,
      visualStyle: brandProfile.visualPreferences,
      logoUrl: brandProfile.logo?.url,
      fonts: {
        heading: brandProfile.fonts?.heading,
        body: brandProfile.fonts?.body,
      },
    },
    localization: {
      language: localizationProfile.primaryLanguage,
      region: localizationProfile.state,
      regionalStyle: localizationProfile.regionalStyle,
      contentStyle: localizationProfile.campaignStyle,
      audienceDescription: localizationProfile.audienceDescription,
      languageMixing: localizationProfile.languageMixing,
      slangPreference: localizationProfile.slangPreference,
    },
    visualDirection: {
      composition: visualDirection?.composition,
      background: visualDirection?.background,
      lighting: visualDirection?.lighting || 'warm, appetizing, natural light',
      mood: visualDirection?.mood || 'crave-inducing, authentic, local pride',
      typography: visualDirection?.typography,
      props: visualDirection?.props,
      styleGuidance: visualDirection?.styleGuidance,
    },
    requiredElements,
    prohibitedElements,
    generationMode,
    aspectRatio,
    copyPack,
    campaignStrategy,
  };
}

/**
 * Build required elements based on campaign context
 */
function buildRequiredElements(input: CreativeBriefInput): readonly string[] {
  const elements: string[] = [];

  // Product must be recognizable
  elements.push(`Product: ${input.product.name} (must match uploaded image)`);

  // Business identity
  elements.push(`Business name: ${input.businessProfile.businessName}`);

  // Offer price
  elements.push(`Offer price: ₹${input.offer.price}`);

  // CTA
  elements.push(`CTA: ${formatCTA(input.cta)}`);

  // WhatsApp number if contact info allowed
  if (input.businessRules.communication.contactInformationAllowed) {
    elements.push('WhatsApp number placeholder');
  }

  // Location
  if (input.businessProfile.locality) {
    elements.push(`Location: ${input.businessProfile.locality}`);
  }

  // Brand colors
  if (input.brandProfile.colors.primary) {
    elements.push(`Brand primary color: ${input.brandProfile.colors.primary}`);
  }

  // Localization-specific required elements
  if (input.localizationProfile.regionalStyle === 'hyderabadi') {
    elements.push('Hyderabadi cultural cues (copper handi, biryani presentation style)');
  }

  return elements;
}

/**
 * Build prohibited elements based on business rules
 */
function buildProhibitedElements(input: CreativeBriefInput): readonly string[] {
  const elements: string[] = [];

  // Factuality rules
  if (input.businessRules.factuality.prohibitInventedProducts) {
    elements.push('Different product than specified');
    elements.push('Different packaging than in source image');
    elements.push('Different dish/food item');
  }

  if (input.businessRules.factuality.prohibitInventedClaims) {
    elements.push('"Best in city" or similar superlatives');
    elements.push('Fake reviews or ratings');
    elements.push('Invented health claims');
  }

  if (input.businessRules.factuality.requireExplicitPricing) {
    elements.push(`Any price other than ₹${input.offer.price}`);
    elements.push('Original price different from Business Brain');
  }

  // Communication rules
  if (!input.businessRules.communication.contactInformationAllowed) {
    elements.push('Phone numbers, addresses, emails');
  }

  if (input.businessRules.communication.operatingHoursRespectRequired) {
    elements.push('Invented opening/closing hours');
  }

  // Brand restrictions
  input.businessRules.communication.brandRestrictions.forEach((restriction) => {
    elements.push(restriction);
  });

  // Generic prohibitions
  elements.push('Competitor brands or logos');
  elements.push('Copyrighted characters or celebrities');
  elements.push('Medical/health claims');
  elements.push('Misleading urgency ("only 2 left", "ends in 1 hour")');
  elements.push('Fake scarcity claims');
  elements.push('Invented delivery radius or times');

  return elements;
}

/**
 * Format CTA for human-readable required elements
 */
function formatCTA(cta: CTAType): string {
  const ctaMap: Record<CTAType, string> = {
    order_whatsapp: 'Order on WhatsApp',
    book_table: 'Book a Table',
    view_menu: 'View Menu',
    call_now: 'Call Now',
    get_directions: 'Get Directions',
  };
  return ctaMap[cta] || cta;
}

/**
 * Visual direction presets for common campaign types
 */
export const VISUAL_DIRECTION_PRESETS: Record<string, Partial<CreativeBrief['visualDirection']>> = {
  clean: {
    composition: 'centered product, clean negative space',
    background: 'solid brand color or subtle gradient',
    lighting: 'bright, even, studio lighting',
    mood: 'clean, professional, trustworthy',
    typography: 'minimal, brand font, high contrast',
  },
  premium: {
    composition: 'hero product with premium props, rule of thirds',
    background: 'dark, textured (marble, wood, matte)',
    lighting: 'dramatic, directional, rim lighting on product',
    mood: 'luxury, exclusive, sophisticated',
    typography: 'elegant serif, gold/foil accents',
  },
  minimal: {
    composition: 'extreme negative space, product only',
    background: 'pure white or single brand color',
    lighting: 'soft, shadowless',
    mood: 'calm, focused, essential',
    typography: 'thin sans-serif, lots of breathing room',
  },
  bold: {
    composition: 'dynamic angle, fill frame, high energy',
    background: 'high contrast, brand color blocks',
    lighting: 'high key, saturated colors',
    mood: 'energetic, confident, attention-grabbing',
    typography: 'heavy weight, large, overlapping',
  },
  colorful: {
    composition: 'vibrant props, complementary colors',
    background: 'colorful pattern or gradient',
    lighting: 'bright, saturated, playful shadows',
    mood: 'joyful, festive, energetic',
    typography: 'rounded, playful, multi-color',
  },
  festive: {
    composition: 'celebration elements, warm grouping',
    background: 'warm tones, bokeh lights, traditional patterns',
    lighting: 'golden hour, warm, diya/candle glow',
    mood: 'celebratory, warm, family-oriented',
    typography: 'decorative, traditional influences',
  },
  'food-photography': {
    composition: 'overhead or 45-degree, steam, garnish detail',
    background: 'rustic wood, marble, or blurred kitchen',
    lighting: 'natural window light, steam visible',
    mood: 'appetizing, fresh, authentic',
    typography: 'clean, readable, appetite-focused',
    props: ['copper handi', 'banana leaf', 'mint garnish', 'fried onions', 'lemon wedge'],
  },
  luxury: {
    composition: 'isolated hero, premium surfaces',
    background: 'velvet, brushed metal, stone',
    lighting: 'controlled studio, precise highlights',
    mood: 'exclusive, refined, aspirational',
    typography: 'thin serif, foil, embossed effect',
  },
  modern: {
    composition: 'geometric, asymmetrical, grid-based',
    background: 'gradient mesh, abstract shapes',
    lighting: 'neon accents, rim light, modern',
    mood: 'contemporary, tech-forward, fresh',
    typography: 'geometric sans, variable weights',
  },
  playful: {
    composition: 'dynamic, tilted, motion blur',
    background: 'bright solids, fun patterns',
    lighting: 'bright, colorful gels',
    mood: 'fun, approachable, youthful',
    typography: 'rounded, bouncy, hand-drawn feel',
  },
  local: {
    composition: 'authentic setting, street food vibe',
    background: 'recognizable local landmark/area',
    lighting: 'natural, time-of-day appropriate',
    mood: 'authentic, community-focused, familiar',
    typography: 'vernacular-inspired, bilingual',
    props: ['auto-rickshaw', 'local street sign', 'filter coffee cup', 'newspaper'],
  },
};