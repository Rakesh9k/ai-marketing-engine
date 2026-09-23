import { z } from 'zod';
import { generateStructuredText } from './index';
import type { SelectedCreativeContext } from './creativeContextSelector';
import type { CreativeTemplate, CreativeObjective } from '../../types';

export const ReelShotSchema = z.object({
  purpose: z.string(),
  visualIntent: z.string(),
  productTreatment: z.string(),
  messagingPurpose: z.string(),
  ctaPlacement: z.string().optional()
});
export type ReelShot = z.infer<typeof ReelShotSchema>;

export const AdaptedCreativePlanSchema = z.object({
  hook: z.string().min(5),
  messaging: z.array(z.string().min(5)).min(1),
  visualDirection: z.string().min(5),
  composition: z.string().min(5),
  productTreatment: z.string().min(5),
  brandTreatment: z.string().min(5),
  localizationApproach: z.string().optional(),
  cta: z.string().optional(),
  reelSequence: z.array(ReelShotSchema).optional()
});
export type AdaptedCreativePlan = z.infer<typeof AdaptedCreativePlanSchema>;

export interface TemplateAdaptationInput {
  template: CreativeTemplate;
  selectedContext: SelectedCreativeContext;
  objective: CreativeObjective;
}

export class TemplateAdaptationPlanner {
  async adapt(input: TemplateAdaptationInput): Promise<AdaptedCreativePlan> {
    const prompt = this.buildPrompt(input);
    const plan = await generateStructuredText(prompt, AdaptedCreativePlanSchema, { temperature: 0.3 });
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
4. Keep the plan business-specific based on the Selected Context, but do NOT mutate the template's core grammar.
5. Respect any localization constraints if provided in the context.`;
  }

  private validate(plan: AdaptedCreativePlan, input: TemplateAdaptationInput) {
    if (input.template.type === 'reel') {
      if (!plan.reelSequence || plan.reelSequence.length === 0) {
        throw new Error('Reel templates require a reelSequence in the adapted plan.');
      }
    }
    const hasCtaRole = input.template.structure.grammar?.some((g: any) => g.role === 'cta');
    if (hasCtaRole && !plan.cta) {
      throw new Error('Template grammar requires a CTA but none was provided in the plan.');
    }
  }
}
