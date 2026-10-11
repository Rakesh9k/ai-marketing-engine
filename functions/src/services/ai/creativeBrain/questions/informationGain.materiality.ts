import type { CreativeDecision, CreativeDecisionChange } from './informationGain.types';

export class DecisionMaterialityEvaluator {
  private static readonly STRATEGIC_DECISIONS: readonly CreativeDecision[] = [
    'POSITIONING',
    'CREATIVE_TERRITORY',
    'CUSTOMER_MOTIVATION',
    'AUDIENCE',
    'OBJECTIVE',
    'CAMPAIGN_ANGLE',
  ];

  private static readonly CONCEPTUAL_DECISIONS: readonly CreativeDecision[] = [
    'CONCEPT',
    'EMOTIONAL_DIRECTION',
    'COPY_DIRECTION',
    'VISUAL_DIRECTION',
    'OFFER_FRAMING',
  ];

  public static evaluateChange(
    decision: CreativeDecision,
    before: unknown,
    afterByAnswer: Record<string, unknown>
  ): CreativeDecisionChange {
    const answerValues = Object.values(afterByAnswer);
    const uniqueValues = new Set(answerValues.map((v) => JSON.stringify(v)));

    // If all answer paths produce identical decision values, zero material change!
    if (uniqueValues.size <= 1) {
      return {
        decision,
        before,
        afterByAnswer,
        materiallyChanges: false,
        impact: 0,
      };
    }

    // Determine impact weight by decision tier
    let impact = 30;
    if (this.STRATEGIC_DECISIONS.includes(decision)) {
      impact = 90;
    } else if (this.CONCEPTUAL_DECISIONS.includes(decision)) {
      impact = 70;
    } else {
      impact = 45;
    }

    // Check if change is purely cosmetic
    const isCosmeticOnly = this.isCosmeticChange(before, answerValues);
    const materiallyChanges = !isCosmeticOnly && impact >= 40;

    return {
      decision,
      before,
      afterByAnswer,
      materiallyChanges,
      impact: materiallyChanges ? impact : 0,
    };
  }

  private static isCosmeticChange(before: unknown, afterValues: readonly unknown[]): boolean {
    const cosmeticTokens = ['align_left', 'align_center', 'uppercase', 'lowercase', 'margin_top', 'font_size'];
    const beforeStr = String(before ?? '').toLowerCase();

    for (const val of afterValues) {
      const valStr = String(val ?? '').toLowerCase();
      if (cosmeticTokens.some((tok) => beforeStr.includes(tok) || valStr.includes(tok))) {
        return true;
      }
    }

    return false;
  }
}
