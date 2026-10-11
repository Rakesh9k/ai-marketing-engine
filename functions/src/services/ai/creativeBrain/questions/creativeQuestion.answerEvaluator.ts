import type { CreativeAnswer, CreativeQuestion, CreativeQuestionSession } from './creativeQuestion.types';

export class AnswerEvaluator {
  public static evaluateAnswer(
    question: CreativeQuestion,
    rawAnswer: unknown
  ): CreativeAnswer {
    const timestamp = new Date().toISOString();
    const strVal = String(rawAnswer ?? '').trim();

    // Check if skipped
    if (!strVal || strVal.toLowerCase() === 'skip') {
      return {
        questionId: question.id,
        dimension: question.dimension,
        rawAnswer,
        normalizedValue: undefined,
        quality: {
          specificity: 'low',
          completeness: 'low',
          decisionUsefulness: 0,
        },
        timestamp,
      };
    }

    // Measure specificity
    let specificity: 'high' | 'medium' | 'low' = 'medium';
    const genericAnswers = ['everyone', 'all', 'anyone', 'general', 'normal', 'good', 'cheap'];
    if (genericAnswers.includes(strVal.toLowerCase())) {
      specificity = 'low';
    } else if (strVal.length > 20 || question.options?.some((o) => o.value === strVal)) {
      specificity = 'high';
    }

    // Estimate decision usefulness (0..100)
    let decisionUsefulness = 75;
    if (specificity === 'high') decisionUsefulness = 95;
    else if (specificity === 'low') decisionUsefulness = 35;

    return {
      questionId: question.id,
      dimension: question.dimension,
      rawAnswer,
      normalizedValue: strVal,
      quality: {
        specificity,
        completeness: 'high',
        decisionUsefulness,
      },
      timestamp,
    };
  }

  public static updateSessionWithAnswer(
    session: CreativeQuestionSession,
    answer: CreativeAnswer
  ): CreativeQuestionSession {
    const isLowQuality = answer.quality.decisionUsefulness < 40;
    const isSkipped = answer.normalizedValue === undefined;

    const userFatigueCount = (isLowQuality || isSkipped)
      ? session.userFatigueCount + 1
      : Math.max(0, session.userFatigueCount - 1);

    const askedQuestionIds = session.askedQuestionIds.includes(answer.questionId)
      ? session.askedQuestionIds
      : [...session.askedQuestionIds, answer.questionId];

    const skippedQuestionIds = isSkipped
      ? [...session.skippedQuestionIds, answer.questionId]
      : session.skippedQuestionIds;

    const answers = [...session.answers.filter((a) => a.questionId !== answer.questionId), answer];

    return {
      ...session,
      askedQuestionIds,
      answers,
      skippedQuestionIds,
      userFatigueCount,
      timestamp: new Date().toISOString(),
    };
  }
}
