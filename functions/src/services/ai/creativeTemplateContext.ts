import type {
  CreativeTemplate,
  CreativeObjective,
  BusinessCategory,
  BrandCreativeContext,
  LanguageCode,
  RegionalStyle,
  SavedStyleContext,
} from '../../types';
import { creativeTemplateRegistry } from '../creativeTemplateRegistry';

export interface ProductContext {
  name: string;
  description?: string;
  price?: number;
  category?: string;
}

export interface OfferContext {
  headline: string;
  description?: string;
  price: number;
  originalPrice?: number;
  type: string;
  validityStart?: string;
  validityEnd?: string;
  terms?: string;
}

export interface AudienceContext {
  localities: string[];
  ageRange?: { min: number; max: number };
  occasion?: string;
}

export interface BusinessBrainContext {
  name: string;
  category: BusinessCategory;
  description: string;
  location: {
    city: string;
    state: string;
    locality?: string;
  };
  contact: {
    whatsapp?: string;
    phone?: string;
  };
}

export interface LocalizationContext {
  primaryLanguage?: LanguageCode;
  secondaryLanguage?: LanguageCode;
  regionalStyle?: RegionalStyle;
  languageMixing?: string;
}

export interface CampaignConstraints {
  requiredElements?: string[];
  prohibitedElements?: string[];
  maxLength?: number;
  requiredCta?: string;
}

export interface CreativeTemplateContext {
  template: CreativeTemplate;
  objective: CreativeObjective;
  businessBrain: BusinessBrainContext;
  product: ProductContext;
  offer?: OfferContext;
  audience?: AudienceContext;
  brand: BrandCreativeContext;
  localization?: LocalizationContext;
  campaignConstraints: CampaignConstraints;
  savedStyle?: SavedStyleContext;
  creativePreferences?: import('./creativeContextSelector').CreativePreferenceContext;
}

export class TemplateContextValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateContextValidationError';
  }
}

export interface BuildTemplateContextInput {
  templateId: string;
  objective: CreativeObjective;
  businessBrain: import('../../types').BusinessBrain;
  brandCreativeContext: BrandCreativeContext;
  productName: string;
  productDescription?: string;
  productPrice?: number;
  productCategory?: string;
  offerHeadline?: string;
  offerDescription?: string;
  offerPrice?: number;
  offerOriginalPrice?: number;
  offerType?: string;
  offerValidityStart?: string;
  offerValidityEnd?: string;
  offerTerms?: string;
  audienceLocalities?: string[];
  audienceAgeRange?: { min: number; max: number };
  audienceOccasion?: string;
  campaignConstraints?: CampaignConstraints;
  savedStyle?: SavedStyleContext;
  creativePreferences?: import('./creativeContextSelector').CreativePreferenceContext;
}

export function buildCreativeTemplateContext(
  input: BuildTemplateContextInput
): CreativeTemplateContext {
  const template = creativeTemplateRegistry.getCreativeTemplate(input.templateId);
  if (!template) {
    throw new TemplateContextValidationError(`Template not found: ${input.templateId}`);
  }
  if (!template.active) {
    throw new TemplateContextValidationError(`Template is inactive: ${input.templateId}`);
  }

  if (!template.objectives.includes(input.objective)) {
    throw new TemplateContextValidationError(
      `Objective ${input.objective} is not supported by template ${template.id}`
    );
  }

  const businessCategory = input.businessBrain?.identity?.category as BusinessCategory;
  if (template.compatibleVerticals && template.compatibleVerticals.length > 0) {
    if (businessCategory && !template.compatibleVerticals.includes(businessCategory)) {
      throw new TemplateContextValidationError(
        `Vertical ${businessCategory} is not supported by template ${template.id}`
      );
    }
  }

  if (!input.productName) {
    throw new TemplateContextValidationError(`Product name is required for template context`);
  }
  const product: ProductContext = {
    name: input.productName,
    description: input.productDescription,
    price: input.productPrice,
    category: input.productCategory,
  };

  let offer: OfferContext | undefined = undefined;
  if (
    input.offerHeadline &&
    input.offerPrice !== undefined &&
    input.offerType &&
    input.offerValidityStart &&
    input.offerValidityEnd
  ) {
    offer = {
      headline: input.offerHeadline,
      description: input.offerDescription,
      price: input.offerPrice,
      originalPrice: input.offerOriginalPrice,
      type: input.offerType,
      validityStart: input.offerValidityStart,
      validityEnd: input.offerValidityEnd,
      terms: input.offerTerms,
    };
  } else {
    const hasOfferRequired = template.structure.grammar.some(
      (g: any) => g.role === 'offer' && g.required
    );
    if (hasOfferRequired) {
      throw new TemplateContextValidationError(
        `Template ${template.id} requires an offer, but offer details are incomplete`
      );
    }
  }

  const hasProductRequired = template.structure.grammar.some(
    (g: any) => g.role === 'product' && g.required
  );
  if (hasProductRequired && !product.name) {
    throw new TemplateContextValidationError(
      `Template ${template.id} requires a product, but product is missing`
    );
  }

  if (!input.businessBrain?.identity) {
    throw new TemplateContextValidationError(`Business brain identity is missing`);
  }
  const businessBrain: BusinessBrainContext = {
    name: input.businessBrain.identity.name,
    category: input.businessBrain.identity.category,
    description: input.businessBrain.identity.description,
    location: input.businessBrain.identity.location,
    contact: input.businessBrain.identity.contact,
  };

  let audience: AudienceContext | undefined = undefined;
  if (input.audienceLocalities && input.audienceLocalities.length > 0) {
    audience = {
      localities: input.audienceLocalities,
      ageRange: input.audienceAgeRange,
      occasion: input.audienceOccasion,
    };
  }

  let localization: LocalizationContext | undefined = undefined;
  if (input.businessBrain?.localization) {
    localization = {
      primaryLanguage: input.businessBrain.localization.primaryLanguage,
      secondaryLanguage: input.businessBrain.localization.secondaryLanguage,
      regionalStyle: input.businessBrain.localization.regionalStyle,
      languageMixing: input.businessBrain.localization.languageMixing,
    };
  }

  const constraints: CampaignConstraints = input.campaignConstraints || {
    requiredElements: [],
    prohibitedElements: [],
  };

  return {
    template,
    objective: input.objective,
    businessBrain,
    product,
    offer,
    audience,
    brand: input.brandCreativeContext,
    localization,
    campaignConstraints: constraints,
    savedStyle: input.savedStyle,
    creativePreferences: input.creativePreferences,
  };
}
