import type { CreativeQuestionInputType } from './creativeQuestion.types';
import type { CreativeQuestionSession } from './creativeQuestion.types';
import type { ScoredQuestion } from './creativeQuestion.scorer';

export const MAX_DYNAMIC_QUESTIONS_PER_SESSION = 3;

export class QuestionSelector {
  public static selectBestQuestion(
    scoredCandidates: readonly ScoredQuestion[],
    session?: CreativeQuestionSession
  ): ScoredQuestion | undefined {
    // 1. Session Budget Check
    const askedCount = session?.askedQuestionIds.length || 0;
    if (askedCount >= MAX_DYNAMIC_QUESTIONS_PER_SESSION) {
      return undefined;
    }

    // 2. User Fatigue Protection
    const fatigueCount = session?.userFatigueCount || 0;
    const minRequiredIV = fatigueCount >= 2 ? 75 : 51; // Raise bar if user is fatigued

    // 3. Filter candidates
    const validCandidates = scoredCandidates.filter((item) => {
      // Must meet action threshold
      if (item.action !== 'ASK') return false;
      if (item.informationValue < minRequiredIV) return false;

      // Prevent duplicates
      if (session?.askedQuestionIds.includes(item.question.id)) return false;
      if (session?.skippedQuestionIds.includes(item.question.id)) return false;

      return true;
    });

    if (validCandidates.length === 0) {
      return undefined;
    }

    // Select single highest-scoring candidate (One Question Policy)
    const selected = validCandidates[0]!;

    // Refine input type if needed
    const refinedInputType = this.selectInputType(selected.question);

    return {
      ...selected,
      question: {
        ...selected.question,
        inputType: refinedInputType,
      },
    };
  }

  public static selectInputType(question: {
    dimension: string;
    inputType: CreativeQuestionInputType;
    options?: readonly any[];
  }): CreativeQuestionInputType {
    const { dimension, inputType, options } = question;

    if (dimension === 'product' || dimension === 'product_name') {
      return 'product_selector';
    }
    if (dimension === 'service' || dimension === 'service_category') {
      return 'service_selector';
    }
    if (dimension === 'offer') {
      return 'offer_selector';
    }

    // Confirmation question if confirming single high-confidence inference
    if (inputType === 'confirmation') {
      return 'confirmation';
    }

    // Prefer bounded options
    if (options && options.length > 0 && options.length <= 6) {
      return 'single_select';
    }

    if (inputType === 'long_text' && dimension !== 'business_story') {
      return 'short_text'; // Prefer short text over long text
    }

    return inputType;
  }
}
