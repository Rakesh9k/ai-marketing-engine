import type { CreativeBrainRequirement } from './stateMachineTypes';
import type { IndustryCreativeContext } from './industry/industryKnowledge.types';
import { DynamicQuestionEngine } from './questions/creativeQuestion.engine';

export interface ContextualUserQuestion {
  readonly promptId: string;
  readonly question: string;
  readonly options: readonly string[];
  readonly contextReason: string;
}

/**
 * Industry-Agnostic Question Resolver
 *
 * Design Invariant:
 * - Contains ZERO industry-specific branches.
 * - Resolves question templates dynamically via DynamicQuestionEngine & IndustryCreativeContext.
 * - Asks at most ONE high-value contextual question ONLY when missing information materially affects creative quality.
 */
export class QuestionResolver {
  public static resolveHighestValueQuestion(
    requirement: CreativeBrainRequirement,
    industryContext?: IndustryCreativeContext,
    contextSummary: string = 'this campaign'
  ): ContextualUserQuestion {
    const promptId = `q_${requirement.key}_${Date.now()}`;

    const engineResult = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      industryContext,
      contextSummary,
    });

    if (engineResult.question) {
      const q = engineResult.question;
      const options = q.options?.map((o) => o.label) || ['Other'];
      return {
        promptId: q.id,
        question: q.question,
        options,
        contextReason: q.purpose,
      };
    }

    // Generic fallback if engine skips or lacks candidate
    return {
      promptId,
      question: `What is the primary goal for ${contextSummary}?`,
      options: ['Increase Immediate Orders', 'Build Local Brand Awareness', 'Promote Special Deal'],
      contextReason: 'Aligns campaign CTA and offer framing.',
    };
  }
}

