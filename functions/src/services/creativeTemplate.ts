import { z } from 'zod';
import type {
  CreativeTemplate,
  CreativeTemplateType,
  CreativeObjective,
  CreativeGrammarRole,
  CreativeGrammarStep,
  CreativeTemplateSource,
  CreativeStructure,
  VisualEmphasis,
  VisualComposition,
  VisualGrammar,
  AdaptationCondition,
  AdaptationAction,
  AdaptationRule,
  TemplateConstraints,
  BusinessCategory,
  CTAType,
} from '../types';
import { VERTICAL_CONFIGS } from '../config/verticals';

/**
 * Domain-level validation for the CreativeTemplate model (Phase 2
 * foundation, Phase 3 complete schema). No Firestore/AI/rendering
 * dependency — this module must be constructible and testable in
 * complete isolation from Business Brain, BrandKit, BrandCreativeContext,
 * and every generation pipeline.
 */

export const CREATIVE_TEMPLATE_TYPES: readonly CreativeTemplateType[] = ['post', 'reel'];

export const CREATIVE_OBJECTIVES: readonly CreativeObjective[] = [
  'awareness',
  'engagement',
  'conversion',
  'launch',
  'promotion',
  'retention',
];

export const CREATIVE_GRAMMAR_ROLES: readonly CreativeGrammarRole[] = [
  'hook',
  'context',
  'setup',
  'problem',
  'product',
  'benefit',
  'proof',
  'differentiator',
  'offer',
  'payoff',
  'urgency',
  'social-proof',
  'objection',
  'emotion',
  'cta',
  'closing',
];

export const CREATIVE_TEMPLATE_SOURCES: readonly CreativeTemplateSource[] = ['system', 'user'];

export const VISUAL_EMPHASES: readonly VisualEmphasis[] = [
  'product-led',
  'text-led',
  'image-led',
  'offer-led',
];

export const VISUAL_COMPOSITIONS: readonly VisualComposition[] = [
  'hero-product',
  'split-composition',
  'editorial',
  'minimal',
  'high-contrast',
];

const ADAPTATION_ACTION_VERBS = [
  'include',
  'exclude',
  'emphasize',
  'deemphasize',
  'prioritize',
  'fallback',
] as const;

/** Reuses the repository's one existing BusinessCategory taxonomy (functions/src/config/verticals.ts) rather than a hand-duplicated list. */
export const BUSINESS_CATEGORIES: readonly BusinessCategory[] = Object.keys(
  VERTICAL_CONFIGS
) as BusinessCategory[];

const CTA_TYPES: readonly CTAType[] = [
  'order_whatsapp',
  'book_table',
  'view_menu',
  'call_now',
  'get_directions',
  'book_appointment',
];

const grammarRoleSchema = z.enum(
  CREATIVE_GRAMMAR_ROLES as [CreativeGrammarRole, ...CreativeGrammarRole[]]
);

const creativeGrammarStepSchema: z.ZodType<CreativeGrammarStep> = z.object({
  id: z.string().min(1),
  role: grammarRoleSchema,
  purpose: z.string().min(1),
  required: z.boolean(),
});

function uniqueIdsRefinement(
  steps: { id: string }[],
  ctx: z.RefinementCtx,
  basePath: (string | number)[],
  label: string
): void {
  const seen = new Set<string>();
  steps.forEach((step, index) => {
    if (seen.has(step.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate ${label} id "${step.id}" — ids must be unique within a template`,
        path: [...basePath, index, 'id'],
      });
    }
    seen.add(step.id);
  });
}

const postStructureSchema = z.object({
  type: z.literal('post'),
  grammar: z.array(creativeGrammarStepSchema).min(1, 'grammar must contain at least one step'),
});

const reelStructureSchema = z.object({
  type: z.literal('reel'),
  grammar: z.array(creativeGrammarStepSchema).min(1, 'grammar must contain at least one step'),
});

export const creativeStructureSchema: z.ZodType<CreativeStructure> = z.discriminatedUnion('type', [
  postStructureSchema,
  reelStructureSchema,
]);

export const visualGrammarSchema: z.ZodType<VisualGrammar> = z.object({
  emphasis: z.enum(VISUAL_EMPHASES as [VisualEmphasis, ...VisualEmphasis[]]),
  composition: z.enum(VISUAL_COMPOSITIONS as [VisualComposition, ...VisualComposition[]]),
});

const adaptationConditionSchema: z.ZodType<AdaptationCondition> = z.discriminatedUnion('check', [
  z.object({ check: z.literal('offerAvailable') }),
  z.object({ check: z.literal('proofAvailable') }),
  z.object({ check: z.literal('productImageAvailable') }),
  z.object({
    check: z.literal('vertical'),
    equals: z.enum(BUSINESS_CATEGORIES as [BusinessCategory, ...BusinessCategory[]]),
  }),
  z.object({
    check: z.literal('ctaType'),
    equals: z.enum(CTA_TYPES as [CTAType, ...CTAType[]]),
  }),
]);

const adaptationActionSchema: z.ZodType<AdaptationAction> = z.discriminatedUnion('action', [
  z.object({ action: z.literal('include'), role: grammarRoleSchema }),
  z.object({ action: z.literal('exclude'), role: grammarRoleSchema }),
  z.object({ action: z.literal('emphasize'), role: grammarRoleSchema }),
  z.object({ action: z.literal('deemphasize'), role: grammarRoleSchema }),
  z.object({ action: z.literal('prioritize'), role: grammarRoleSchema }),
  z.object({ action: z.literal('fallback'), role: grammarRoleSchema, to: grammarRoleSchema }),
]);

export const adaptationRuleSchema: z.ZodType<AdaptationRule> = z.object({
  id: z.string().min(1),
  condition: adaptationConditionSchema,
  action: adaptationActionSchema,
});

const postConstraintsSchema = z.object({
  type: z.literal('post'),
  minSections: z.number().int().min(1),
  maxSections: z.number().int().min(1),
  maxTextDensity: z.enum(['low', 'medium', 'high']).optional(),
});

const reelConstraintsSchema = z.object({
  type: z.literal('reel'),
  minSections: z.number().int().min(1),
  maxSections: z.number().int().min(1),
  minDurationSeconds: z.number().positive(),
  maxDurationSeconds: z.number().positive(),
});

// z.discriminatedUnion requires plain ZodObject members (not ZodEffects), so
// the minSections<=maxSections / minDuration<=maxDuration cross-field checks
// are applied via superRefine AFTER the union is built, not on each branch.
export const templateConstraintsSchema: z.ZodType<TemplateConstraints> = z
  .discriminatedUnion('type', [postConstraintsSchema, reelConstraintsSchema])
  .superRefine((c, ctx) => {
    if (c.minSections > c.maxSections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minSections cannot exceed maxSections',
        path: ['minSections'],
      });
    }
    if (c.type === 'reel' && c.minDurationSeconds > c.maxDurationSeconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minDurationSeconds cannot exceed maxDurationSeconds',
        path: ['minDurationSeconds'],
      });
    }
  });

export const creativeTemplateSchema: z.ZodType<CreativeTemplate> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    type: z.enum(CREATIVE_TEMPLATE_TYPES as [CreativeTemplateType, ...CreativeTemplateType[]]),
    objectives: z
      .array(z.enum(CREATIVE_OBJECTIVES as [CreativeObjective, ...CreativeObjective[]]))
      .min(1, 'objectives must contain at least one CreativeObjective'),
    compatibleVerticals: z
      .array(z.enum(BUSINESS_CATEGORIES as [BusinessCategory, ...BusinessCategory[]]))
      .min(1, 'compatibleVerticals must contain at least one BusinessCategory'),
    structure: creativeStructureSchema,
    visualGrammar: visualGrammarSchema,
    adaptationRules: z.array(adaptationRuleSchema),
    constraints: templateConstraintsSchema,
    version: z.number().int().min(1),
    active: z.boolean(),
    source: z.enum(
      CREATIVE_TEMPLATE_SOURCES as [CreativeTemplateSource, ...CreativeTemplateSource[]]
    ),
  })
  .superRefine((template, ctx) => {
    uniqueIdsRefinement(template.structure.grammar, ctx, ['structure', 'grammar'], 'grammar step');
    uniqueIdsRefinement(template.adaptationRules, ctx, ['adaptationRules'], 'adaptation rule');

    if (template.structure.type !== template.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `structure.type ("${template.structure.type}") must match template.type ("${template.type}")`,
        path: ['structure', 'type'],
      });
    }

    if (template.constraints.type !== template.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `constraints.type ("${template.constraints.type}") must match template.type ("${template.type}")`,
        path: ['constraints', 'type'],
      });
    }

    const sectionCount = template.structure.grammar.length;
    if (
      sectionCount < template.constraints.minSections ||
      sectionCount > template.constraints.maxSections
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `structure.grammar has ${sectionCount} step(s), outside constraints range [${template.constraints.minSections}, ${template.constraints.maxSections}]`,
        path: ['structure', 'grammar'],
      });
    }
  });

export interface CreativeTemplateValidationResult {
  valid: boolean;
  errors: string[];
  template?: CreativeTemplate;
}

/** Validates an unknown value against the CreativeTemplate contract, never throwing. */
export function validateCreativeTemplate(input: unknown): CreativeTemplateValidationResult {
  const result = creativeTemplateSchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [], template: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}

// Re-exported for callers that only need the closed vocabulary of adaptation-action verbs
// (e.g. tests) without importing the full discriminated-union schema.
export { ADAPTATION_ACTION_VERBS };
