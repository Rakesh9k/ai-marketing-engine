import type { 
  CreativeTemplate, 
  BrandCreativeContext,
  CreativeObjective
} from '../../types';
import type { 
  BusinessBrainContext,
  ProductContext,
  OfferContext,
  AudienceContext,
  LocalizationContext,
  CreativeTemplateContext
} from './creativeTemplateContext';

export type CreativeTask = 
  | 'business_understanding'
  | 'product_understanding'
  | 'campaign_strategy'
  | 'localization_strategy'
  | 'creative_copy'
  | 'image_prompt'
  | 'image_generation'
  | 'reel_shot_plan'
  | 'truth_check';

export type CreativeContextKey =
  | 'brand'
  | 'product'
  | 'offer'
  | 'audience'
  | 'localization'
  | 'businessRules'
  | 'visualPreferences'
  | 'logo'
  | 'colors'
  | 'cta'
  | 'approvedHumor'
  | 'shotConstraints';

export interface SelectedTemplateContext {
  id: string;
  type: 'post' | 'reel';
  name: string;
  objective: CreativeObjective;
  structure: any;
  visualGrammar: any;
  constraints: any;
}

export interface BusinessRulesContext {
  // Empty for now, but typed for future expansion
}

export interface LogoContext {
  primaryUrl?: string;
  secondaryUrl?: string;
}
export interface BrandColorsContext {
  primary?: string;
  secondary?: string;
  accent?: string;
}
export interface CTAContext {
  text?: string;
  type?: string;
}
export interface ApprovedHumorContext {
  examples?: string[];
}
export interface ShotConstraintsContext {
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  minSections?: number;
  maxSections?: number;
}

export interface SelectedCreativeContext {
  task: CreativeTask;
  template: SelectedTemplateContext;
  context: {
    brand?: BrandCreativeContext;
    product?: ProductContext;
    offer?: OfferContext;
    audience?: AudienceContext;
    localization?: LocalizationContext;
    businessRules?: BusinessRulesContext;
    visualPreferences?: string;
    logo?: LogoContext;
    colors?: BrandColorsContext;
    cta?: CTAContext;
    approvedHumor?: ApprovedHumorContext;
    shotConstraints?: ShotConstraintsContext;
  };
  missingRequired: readonly CreativeContextKey[];
}

export interface CreativeContextSelectionPlan {
  task: CreativeTask;
  required: readonly CreativeContextKey[];
  optional: readonly CreativeContextKey[];
}

export interface SelectCreativeContextInput {
  task: CreativeTask;
  templateContext: CreativeTemplateContext;
}

const TASK_REQUIREMENTS: Record<CreativeTask, { required: CreativeContextKey[], optional: CreativeContextKey[] }> = {
  business_understanding: {
    required: ['brand'],
    optional: ['localization', 'businessRules']
  },
  product_understanding: {
    required: ['brand', 'product'],
    optional: ['audience', 'localization', 'businessRules']
  },
  campaign_strategy: {
    required: ['brand', 'product'],
    optional: ['offer', 'audience', 'localization', 'businessRules']
  },
  localization_strategy: {
    required: ['brand', 'product', 'localization'],
    optional: ['audience', 'businessRules']
  },
  creative_copy: {
    required: ['brand', 'product'],
    optional: ['cta', 'offer', 'audience', 'localization', 'businessRules', 'approvedHumor']
  },
  image_prompt: {
    required: ['product', 'visualPreferences'],
    optional: ['brand', 'logo', 'colors', 'localization']
  },
  image_generation: {
    required: ['product', 'visualPreferences', 'logo', 'colors'],
    optional: ['brand', 'localization']
  },
  reel_shot_plan: {
    required: ['brand', 'product', 'visualPreferences', 'shotConstraints'],
    optional: ['offer', 'audience', 'localization', 'logo', 'colors']
  },
  truth_check: {
    required: ['brand', 'product'],
    optional: ['offer', 'businessRules']
  }
};

export function getSelectionPlan(task: CreativeTask, templateContext: CreativeTemplateContext): CreativeContextSelectionPlan {
  const baseReqs = TASK_REQUIREMENTS[task];
  const required = new Set<CreativeContextKey>(baseReqs.required);
  const optional = new Set<CreativeContextKey>(baseReqs.optional);

  const isRelevant = (key: CreativeContextKey) => baseReqs.required.includes(key) || baseReqs.optional.includes(key);

  // Augment based on template structure
  const grammar = templateContext.template.structure.grammar;
  
  if (isRelevant('offer')) {
    const hasOffer = grammar.some((g: any) => g.role === 'offer' || g.role === 'promotion');
    if (hasOffer) {
      if (grammar.find((g: any) => (g.role === 'offer' || g.role === 'promotion') && g.required)) {
        required.add('offer');
        optional.delete('offer');
      } else {
        optional.add('offer');
      }
    } else {
      // If template doesn't even have offer in grammar, it's irrelevant
      optional.delete('offer');
      required.delete('offer');
    }
  }

  if (isRelevant('cta')) {
    const hasCta = grammar.some((g: any) => g.role === 'cta');
    if (hasCta) {
      if (grammar.find((g: any) => g.role === 'cta' && g.required)) {
        required.add('cta');
        optional.delete('cta');
      } else {
        optional.add('cta');
      }
    } else {
      optional.delete('cta');
      required.delete('cta');
    }
  }

  // Template constraints
  if (templateContext.template.type === 'reel' && isRelevant('shotConstraints')) {
    required.add('shotConstraints');
  }

  return {
    task,
    required: Array.from(required),
    optional: Array.from(optional)
  };
}

export function selectCreativeContext(input: SelectCreativeContextInput): SelectedCreativeContext {
  const plan = getSelectionPlan(input.task, input.templateContext);
  const selectedContext: any = {};
  const missingRequired: CreativeContextKey[] = [];

  const checkAndAssign = (key: CreativeContextKey, value: any) => {
    if (plan.required.includes(key)) {
      if (value !== undefined && value !== null) {
        selectedContext[key] = value;
      } else {
        missingRequired.push(key);
      }
    } else if (plan.optional.includes(key)) {
      if (value !== undefined && value !== null) {
        selectedContext[key] = value;
      }
    }
  };

  checkAndAssign('brand', input.templateContext.brand);
  checkAndAssign('product', input.templateContext.product);
  checkAndAssign('offer', input.templateContext.offer);
  checkAndAssign('audience', input.templateContext.audience);
  checkAndAssign('localization', input.templateContext.localization);
  
  // cta is derived from campaignConstraints
  const cta: CTAContext | undefined = input.templateContext.campaignConstraints?.requiredCta ? { text: input.templateContext.campaignConstraints.requiredCta } : undefined;
  checkAndAssign('cta', cta);

  // visualPreferences, logo, colors are derived from brand
  const visualPreferences: string | undefined = input.templateContext.brand?.visualPreferences;
  checkAndAssign('visualPreferences', visualPreferences);

  const logo: LogoContext | undefined = input.templateContext.brand?.logo ? {
    primaryUrl: input.templateContext.brand.logo.primaryUrl,
    secondaryUrl: input.templateContext.brand.logo.secondaryUrl
  } : undefined;
  checkAndAssign('logo', logo);

  const colors: BrandColorsContext | undefined = input.templateContext.brand?.colors ? {
    primary: input.templateContext.brand.colors.primary,
    secondary: (input.templateContext.brand.colors as any).secondary,
    accent: (input.templateContext.brand.colors as any).accent
  } : undefined;
  checkAndAssign('colors', colors);

  // shotConstraints
  const shotConstraints: ShotConstraintsContext | undefined = input.templateContext.template.constraints ? {
    minDurationSeconds: (input.templateContext.template.constraints as any).minDurationSeconds,
    maxDurationSeconds: (input.templateContext.template.constraints as any).maxDurationSeconds,
    minSections: input.templateContext.template.constraints.minSections,
    maxSections: input.templateContext.template.constraints.maxSections,
  } : undefined;
  checkAndAssign('shotConstraints', shotConstraints);

  checkAndAssign('businessRules', undefined);
  checkAndAssign('approvedHumor', undefined);

  const selectedTemplate: SelectedTemplateContext = {
    id: input.templateContext.template.id,
    type: input.templateContext.template.type,
    name: input.templateContext.template.name,
    objective: input.templateContext.objective,
    structure: input.templateContext.template.structure,
    visualGrammar: input.templateContext.template.visualGrammar,
    constraints: input.templateContext.template.constraints,
  };

  return {
    task: input.task,
    template: selectedTemplate,
    context: selectedContext,
    missingRequired
  };
}
