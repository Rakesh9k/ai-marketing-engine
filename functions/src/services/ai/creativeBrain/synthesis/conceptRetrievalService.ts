/**
 * PHASE 13 — Concept Retrieval Service
 * Selects only relevant Creative Intelligence Bank entries for a campaign.
 * Prevents full-bank dumps by applying targeted relevance retrieval based on
 * vertical, objective, audience, and campaign intent.
 */

import type { CreativeKnowledgeItem } from '../types/creativeArchitecture.types';
import type { ConceptSynthesisInput } from './synthesis.types';

export class ConceptRetrievalService {
  /**
   * Retrieves a targeted subset of relevant Creative Bank items based on input context.
   */
  public static retrieveRelevantEntries(
    input: ConceptSynthesisInput,
    allKnowledgeItems: CreativeKnowledgeItem[] = []
  ): CreativeKnowledgeItem[] {
    if (!allKnowledgeItems || allKnowledgeItems.length === 0) {
      return this.getFallbackBankEntries(input);
    }

    const targetIndustry = (input.businessBrain.industry || input.businessBrain.subVertical || '').toLowerCase();

    const filtered = allKnowledgeItems.filter((item) => {
      // Industry match or global
      const isGlobal = !item.supportedIndustries || item.supportedIndustries.length === 0 || item.supportedIndustries.includes('all') || item.supportedIndustries.includes('GLOBAL');
      const isIndustryMatch = item.supportedIndustries?.some((ind) => ind.toLowerCase() === targetIndustry);

      return isGlobal || isIndustryMatch;
    });

    // Take top 10 relevant items max
    return filtered.slice(0, 10);
  }

  /**
   * Generates deterministic fallback entries if no external Creative Bank repository is provided.
   */

  public static getFallbackBankEntries(input: ConceptSynthesisInput): CreativeKnowledgeItem[] {
    const industry = input.businessBrain.subVertical || input.businessBrain.industry || 'local_business';

    return [
      {
        id: 'psychology_choice_simplification',
        category: 'PSYCHOLOGY',
        name: 'Choice Simplification',
        description: 'Eliminate decision fatigue by packaging multi-option complexity into one simple decision.',
        version: 1,
        maturity: 'ESTABLISHED',
        supportedIndustries: [industry, 'all'],
      },
      {
        id: 'mechanism_decision_elimination',
        category: 'MECHANISM',
        name: 'Decision Elimination Mechanism',
        description: 'Position the offer as the default zero-debate choice for group or family situations.',
        version: 1,
        maturity: 'ESTABLISHED',
        supportedIndustries: [industry, 'all'],
      },
      {
        id: 'hook_relatable_tension',
        category: 'HOOK',
        name: 'Relatable Everyday Tension Hook',
        description: 'Open by highlighting an undeniable friction point experienced daily by the target audience.',
        version: 1,
        maturity: 'ESTABLISHED',
        supportedIndustries: [industry, 'all'],
      },
      {
        id: 'recipe_problem_reversal',
        category: 'RECIPE',
        name: 'Problem Reversal Recipe',
        description: 'Turn an annoying common situation into an amusing problem that the offer effortlessly solves.',
        version: 1,
        maturity: 'ESTABLISHED',
        supportedIndustries: [industry, 'all'],
      },
      {
        id: 'psychology_social_proof',
        category: 'PSYCHOLOGY',
        name: 'Local Social Proof',
        description: 'Reinforce trust by showing neighborhood customer validation and verified satisfaction.',
        version: 1,
        maturity: 'ESTABLISHED',
        supportedIndustries: [industry, 'all'],
      },
    ];
  }
}
