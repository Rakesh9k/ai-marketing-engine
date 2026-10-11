import type { CreativeQuestion } from './creativeQuestion.types';

/**
 * Reusable Registry for Generic Creative Questions
 *
 * Design Invariants:
 * - 0 industry-specific branches (no 'if restaurant', 'if salon', 'if real estate').
 * - Provides generic, structured question definitions across standard decision dimensions.
 */
export class CreativeQuestionRegistry {
  private static readonly questions: Map<string, CreativeQuestion> = new Map();

  public static initializeDefaultQuestions(): void {
    if (this.questions.size > 0) return;

    const defaults: CreativeQuestion[] = [
      {
        id: 'q_gen_audience',
        dimension: 'audience',
        question: 'Who are you most trying to attract with {{productName}} in this campaign?',
        purpose: 'Defines target customer motivation, visual tone, and message framing.',
        inputType: 'single_select',
        required: false,
        priority: 75,
        userEffort: 5, // single_select = low effort
        decisionImpact: 85,
        creativeRelevance: 90,
        affectsStates: ['AUDIENCE_REASONING', 'OPPORTUNITY_DISCOVERY'],
        affectsDecisions: ['hook', 'tone', 'visual_subject', 'creative_territory'],
        answerImpact: {
          decisionImpact: 85,
          creativeRelevance: 90,
          affectedDimensions: ['audience', 'motivation'],
          affectedStates: ['AUDIENCE_REASONING'],
          potentialStrategyChanges: ['Changes primary hook from value to lifestyle or occasion'],
        },
      },
      {
        id: 'q_gen_occasion',
        dimension: 'occasion',
        question: 'What occasion or moment are customers most likely buying {{productName}} for?',
        purpose: 'Determines whether to emphasize urgency, celebration, daily habit, or gift-giving.',
        inputType: 'single_select',
        required: false,
        priority: 65,
        userEffort: 5,
        decisionImpact: 75,
        creativeRelevance: 80,
        affectsStates: ['OFFER_REASONING', 'CREATIVE_BLUEPRINT_FORMATION'],
        affectsDecisions: ['hook', 'offer_positioning', 'seasonal_urgency'],
        answerImpact: {
          decisionImpact: 75,
          creativeRelevance: 80,
          affectedDimensions: ['occasion'],
          affectedStates: ['OFFER_REASONING'],
          potentialStrategyChanges: ['Pivots copy to event-based urgency'],
        },
      },
      {
        id: 'q_gen_motivation',
        dimension: 'customer_motivation',
        question: 'What matters most to the customer when choosing {{productName}}?',
        purpose: 'Identifies primary emotional driver (Value, Convenience, Experience, Quality, Trust).',
        inputType: 'single_select',
        options: [
          { id: 'opt_val', label: 'Best Price / Great Value', value: 'value', source: 'SYSTEM' },
          { id: 'opt_conv', label: 'Convenience & Speed', value: 'convenience', source: 'SYSTEM' },
          { id: 'opt_qual', label: 'Top Quality & Craftsmanship', value: 'quality', source: 'SYSTEM' },
          { id: 'opt_exp', label: 'Unique Experience & Ambiance', value: 'experience', source: 'SYSTEM' },
          { id: 'opt_tru', label: 'Trust & Proven Results', value: 'trust', source: 'SYSTEM' },
          { id: 'opt_other', label: 'Other', value: 'other', source: 'SYSTEM' },
        ],
        required: false,
        priority: 70,
        userEffort: 5,
        decisionImpact: 80,
        creativeRelevance: 85,
        affectsStates: ['OPPORTUNITY_DISCOVERY', 'CONCEPT_GENERATION'],
        affectsDecisions: ['creative_territory', 'differentiator', 'message_hierarchy'],
        answerImpact: {
          decisionImpact: 80,
          creativeRelevance: 85,
          affectedDimensions: ['customer_motivation'],
          affectedStates: ['OPPORTUNITY_DISCOVERY'],
          potentialStrategyChanges: ['Determines core differentiator angle in Stage 3'],
        },
      },
      {
        id: 'q_gen_creative_direction',
        dimension: 'desired_creative_direction',
        question: 'Which creative style best fits what you want to communicate?',
        purpose: 'Guides visual theme, color contrast, and headline punchiness.',
        inputType: 'single_select',
        options: [
          { id: 'opt_bold', label: 'Bold & High Urgency (Discount/Offer Focus)', value: 'bold_urgency', source: 'SYSTEM' },
          { id: 'opt_eleg', label: 'Elegant & Premium (Showcase Quality)', value: 'elegant_premium', source: 'SYSTEM' },
          { id: 'opt_warm', label: 'Warm & Relatable (Community/Family Vibe)', value: 'warm_community', source: 'SYSTEM' },
          { id: 'opt_mod', label: 'Modern & Minimalist (Clean/Direct)', value: 'modern_minimal', source: 'SYSTEM' },
        ],
        required: false,
        priority: 55,
        userEffort: 5,
        decisionImpact: 65,
        creativeRelevance: 75,
        affectsStates: ['CONCEPT_EVALUATION', 'CREATIVE_BLUEPRINT_FORMATION'],
        affectsDecisions: ['visual_direction', 'color_palette', 'typography_tone'],
        answerImpact: {
          decisionImpact: 65,
          creativeRelevance: 75,
          affectedDimensions: ['desired_creative_direction'],
          affectedStates: ['CONCEPT_GENERATION'],
          potentialStrategyChanges: ['Sets visual directives in Stage 6 & Stage 7'],
        },
      },
    ];

    for (const q of defaults) {
      this.questions.set(q.id, q);
    }
  }

  public static register(question: CreativeQuestion): void {
    this.questions.set(question.id, question);
  }

  public static get(questionId: string): CreativeQuestion | undefined {
    this.initializeDefaultQuestions();
    return this.questions.get(questionId);
  }

  public static findByDimension(dimension: string): readonly CreativeQuestion[] {
    this.initializeDefaultQuestions();
    return Array.from(this.questions.values()).filter((q) => q.dimension === dimension);
  }

  public static getAll(): readonly CreativeQuestion[] {
    this.initializeDefaultQuestions();
    return Array.from(this.questions.values());
  }
}
