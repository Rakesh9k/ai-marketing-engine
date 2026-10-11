import { z } from 'zod';
import { generateStructuredText } from './index';
import type { SelectedCreativeContext } from './creativeContextSelector';
import type { CreativeTemplate, CreativeObjective, CreativeGrammarRole } from '../../types';

const creativeGrammarRoleSchema = z.enum([
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
] as [CreativeGrammarRole, ...CreativeGrammarRole[]]);

export const ReelShotSchema = z.object({
  role: creativeGrammarRoleSchema,
  purpose: z.string(),
  visualIntent: z.string(),
  productTreatment: z.string(),
  messagingPurpose: z.string(),
  ctaPlacement: z.string().optional(),
});
export type ReelShot = z.infer<typeof ReelShotSchema>;

export const AdaptedCreativePlanSchema = z.object({
  hook: z.string().min(5),
  messaging: z.array(z.string().min(5)).min(1),
  visualDirection: z.string().min(5),
  composition: z.string().min(5),
  productTreatment: z.string().min(5),
  brandTreatment: z.string().min(5),
  coveredRoles: z.array(creativeGrammarRoleSchema).min(1),
  localizationApproach: z.string().optional(),
  cta: z.string().optional(),
  reelSequence: z.array(ReelShotSchema).optional(),
});
export type AdaptedCreativePlan = z.infer<typeof AdaptedCreativePlanSchema>;

/**
 * The model is only constrained by this text (generateStructured sends no response schema), so the
 * exact top-level keys must be spelled out. Without it the model chose its own key names and
 * every generation failed schema validation ("hook", "messaging", "visualDirection" ... undefined)
 * before any copy or image was produced. tests assert every schema key appears here.
 */
export const ADAPTED_PLAN_OUTPUT_FORMAT = `OUTPUT FORMAT:
Return ONLY one JSON object (no markdown, no commentary) with EXACTLY these top-level keys:
- "hook": string, the strategic intent of the opening (5+ characters)
- "messaging": array of strings, one strategic message intent per line (at least 1, each 5+ characters)
- "visualDirection": string, the overall visual intent (5+ characters)
- "composition": string, how the frame is composed (5+ characters)
- "productTreatment": string, how the product is shown (5+ characters)
- "brandTreatment": string, how the brand/business identity appears (5+ characters)
- "coveredRoles": array of semantic roles taken ONLY from the Grammar Structure (at least 1)
- "localizationApproach": optional string
- "cta": optional string, how the call to action is represented (required when the grammar requires a CTA)
- "reelSequence": optional array, REQUIRED for reel templates and omitted for posts, each item an object with
  "role" (a Grammar Structure role), "purpose", "visualIntent", "productTreatment", "messagingPurpose" (all strings)
  and optional "ctaPlacement" (string)`;

export interface TemplateAdaptationInput {
  template: CreativeTemplate;
  selectedContext: SelectedCreativeContext;
  objective: CreativeObjective;
}

export function validateTemplateSpecificOutput(
  plan: AdaptedCreativePlan,
  input: TemplateAdaptationInput
): AdaptedCreativePlan {
  const grammar = input.template.structure.grammar ?? [];
  const requiredRoles = new Set(grammar.filter((step) => step.required).map((step) => step.role));
  const templateRoles = new Set(grammar.map((step) => step.role));
  const coveredRoles = new Set(plan.coveredRoles);

  for (const role of coveredRoles) {
    if (!templateRoles.has(role)) {
      throw new Error(`Plan covers ${role}, which is not part of the selected template grammar.`);
    }
  }

  for (const role of requiredRoles) {
    if (!coveredRoles.has(role)) {
      const label = role === 'cta' ? 'CTA' : role;
      throw new Error(
        `Template grammar requires the ${label} role but the plan does not cover it.`
      );
    }
  }

  if (input.template.type === 'reel') {
    if (!plan.reelSequence || plan.reelSequence.length === 0) {
      throw new Error('Reel templates require a reelSequence in the adapted plan.');
    }

    const minSections = input.template.constraints.minSections ?? 1;
    if (plan.reelSequence.length < minSections) {
      throw new Error(
        `Reel template requires at least ${minSections} shots; got ${plan.reelSequence.length}.`
      );
    }

    const maxSections = input.template.constraints.maxSections ?? Number.MAX_SAFE_INTEGER;
    if (plan.reelSequence.length > maxSections) {
      throw new Error(
        `Reel template allows at most ${maxSections} shots; got ${plan.reelSequence.length}.`
      );
    }

    if (requiredRoles.has('hook') && !plan.hook) {
      throw new Error('Template grammar requires a hook but none was provided in the plan.');
    }
    if (requiredRoles.has('cta') && !plan.cta) {
      throw new Error('Template grammar requires a CTA but none was provided in the plan.');
    }

    const sequenceRoles = new Set(plan.reelSequence.map((shot) => shot.role));
    for (const role of sequenceRoles) {
      if (!templateRoles.has(role)) {
        throw new Error(
          `Reel sequence covers ${role}, which is not part of the selected template grammar.`
        );
      }
    }
    for (const role of requiredRoles) {
      if (role !== 'cta' && !sequenceRoles.has(role)) {
        throw new Error(`Reel sequence does not cover the required ${role} role.`);
      }
    }
  }

  if (requiredRoles.has('cta') && !plan.cta) {
    throw new Error('Template grammar requires a CTA but none was provided in the plan.');
  }

  if (requiredRoles.has('hook') && plan.hook.trim().length < 5) {
    throw new Error('Template grammar requires a hook but none was provided in the plan.');
  }

  return plan;
}

export class TemplateAdaptationPlanner {
  async adapt(input: TemplateAdaptationInput): Promise<AdaptedCreativePlan> {
    const prompt = this.buildPrompt(input);
    const plan = await generateStructuredText(prompt, AdaptedCreativePlanSchema, {
      temperature: 0.3,
    });
    this.validate(plan, input);
    return plan;
  }

  private buildPrompt(input: TemplateAdaptationInput): string {
    return `SYSTEM RULES:
You are an expert creative planner. Adapt the provided generic creative template to the specific business context, product, and objective.

Do NOT write final polished user-facing copy (e.g. do not output "Craving Biryani? Order Now!"). Instead, output the structured strategic intent for the copywriter and compositor (e.g. "Lead with strong craving and immediate product desire, finishing with a clear order CTA").

TEMPLATE INFORMATION:
Name: ${input.template.name}
Type: ${input.template.type}
Objective: ${input.objective}
Grammar Structure (Semantic roles required in the creative):
${JSON.stringify(input.template.structure, null, 2)}
Visual Grammar:
${JSON.stringify(input.template.visualGrammar, null, 2)}
Adaptation Rules:
${JSON.stringify(input.template.adaptationRules || [], null, 2)}
Constraints:
${JSON.stringify(input.template.constraints || {}, null, 2)}

SELECTED BUSINESS CONTEXT (Only this context is permitted):
${JSON.stringify(input.selectedContext.context, null, 2)}

INSTRUCTIONS:
1. Map the semantic roles from the Grammar Structure into your messaging and hook.
2. If the Grammar requires an offer or CTA, ensure the plan explicitly includes how to represent it (using the actual offer/CTA context). Do not invent prices or discounts.
3. If this is a 'reel' template, you MUST provide a 'reelSequence' array mapping to the required scenes/shots. For a 'post', omit it.
4. Populate 'coveredRoles' with every semantic role represented by the plan. Use only roles from the Grammar Structure.
5. For each reelSequence shot, populate 'role' with the semantic role that shot fulfills.
6. Keep the plan business-specific based on the Selected Context, but do NOT mutate the template's core grammar.
7. Respect any localization constraints if provided in the context.
8. If a 'savedStyle' is provided in the Selected Context, heavily adapt the creative expression (tone, density, product prominence, humor, CTA style) according to those preferences, without omitting required template elements.

${ADAPTED_PLAN_OUTPUT_FORMAT}`;
  }

  private validate(plan: AdaptedCreativePlan, input: TemplateAdaptationInput) {
    validateTemplateSpecificOutput(plan, input);
  }
}
