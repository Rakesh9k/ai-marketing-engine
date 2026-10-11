import type { CreativeQuestion, KnownContextMap } from './creativeQuestion.types';
import type { CreativeDecision, AnswerCounterfactualPath, CreativeDecisionChange } from './informationGain.types';
import { DecisionMaterialityEvaluator } from './informationGain.materiality';

export class CounterfactualDecisionEvaluator {
  public static evaluateCounterfactuals(
    question: CreativeQuestion,
    knownContext: KnownContextMap
  ): {
    affectedDecisions: readonly CreativeDecision[];
    answerPaths: readonly AnswerCounterfactualPath[];
    possibleDecisionChanges: readonly CreativeDecisionChange[];
    materialChangeCount: number;
  } {
    const dimension = question.dimension;
    const affectedDecisions = this.mapDimensionToAffectedDecisions(dimension, question.affectsDecisions, knownContext);

    // Build options / candidate answers
    const options = question.options && question.options.length > 0
      ? question.options
      : [
          { id: 'opt_a', label: 'Option A', value: 'option_a', source: 'SYSTEM' as const },
          { id: 'opt_b', label: 'Option B', value: 'option_b', source: 'SYSTEM' as const },
        ];

    const count = options.length;
    const prob = 1 / count;

    const afterByDecision: Record<string, Record<string, unknown>> = {};
    for (const dec of affectedDecisions) {
      afterByDecision[dec] = {};
    }

    const answerPaths: AnswerCounterfactualPath[] = [];

    for (const opt of options) {
      const predictedMap: Record<string, unknown> = {};

      for (const dec of affectedDecisions) {
        const predictedVal = this.predictDecisionValue(dec, dimension, opt.value, knownContext);
        predictedMap[dec] = predictedVal;
        afterByDecision[dec]![opt.value] = predictedVal;
      }

      answerPaths.push({
        answerKey: opt.value,
        label: opt.label,
        probability: prob,
        predictedChanges: [],
        resultingUncertainty: 15, // Answer resolves dimension uncertainty down to 15
      });
    }

    // Evaluate decision changes and materiality across answers
    const possibleDecisionChanges: CreativeDecisionChange[] = [];
    let materialChangeCount = 0;

    for (const dec of affectedDecisions) {
      const beforeVal = knownContext[dec.toLowerCase()]?.value || 'unspecified';
      const change = DecisionMaterialityEvaluator.evaluateChange(
        dec,
        beforeVal,
        afterByDecision[dec] || {}
      );

      possibleDecisionChanges.push(change);
      if (change.materiallyChanges) {
        materialChangeCount += 1;
      }
    }

    return {
      affectedDecisions,
      answerPaths,
      possibleDecisionChanges,
      materialChangeCount,
    };
  }

  private static mapDimensionToAffectedDecisions(
    dimension: string,
    affectsDecisions: readonly string[],
    knownContext: KnownContextMap
  ): readonly CreativeDecision[] {
    const set = new Set<CreativeDecision>();

    if (dimension === 'founding_year') {
      const objVal = String(knownContext['campaign_objective']?.value || '').toLowerCase();
      if (!objVal.includes('anniversary') && !objVal.includes('heritage') && !objVal.includes('legacy')) {
        return []; // 0 affected decisions for non-heritage campaigns
      }
    }

    // Default mapping based on dimension
    if (dimension === 'customer_motivation' || dimension === 'motivation') {
      set.add('CUSTOMER_MOTIVATION');
      set.add('POSITIONING');
      set.add('CREATIVE_TERRITORY');
      set.add('COPY_DIRECTION');
      set.add('VISUAL_DIRECTION');
      set.add('CTA');
    } else if (dimension === 'audience') {
      set.add('AUDIENCE');
      set.add('POSITIONING');
      set.add('CREATIVE_TERRITORY');
      set.add('COPY_DIRECTION');
      set.add('TONE');
    } else if (dimension === 'occasion') {
      set.add('OFFER_FRAMING');
      set.add('CREATIVE_TERRITORY');
      set.add('COPY_DIRECTION');
      set.add('CAMPAIGN_ANGLE');
    } else if (dimension === 'desired_creative_direction') {
      set.add('VISUAL_DIRECTION');
      set.add('IMAGE_STYLE');
      set.add('TONE');
      set.add('FORMAT');
    }

    // Incorporate explicitly passed affectsDecisions strings
    for (const str of affectsDecisions) {
      const upper = str.toUpperCase() as CreativeDecision;
      if (
        [
          'AUDIENCE',
          'OBJECTIVE',
          'POSITIONING',
          'OFFER_FRAMING',
          'CUSTOMER_MOTIVATION',
          'CREATIVE_TERRITORY',
          'EMOTIONAL_DIRECTION',
          'CONCEPT',
          'COPY_DIRECTION',
          'TONE',
          'CTA',
          'VISUAL_DIRECTION',
          'IMAGE_STYLE',
          'FORMAT',
          'TEMPLATE',
          'CAMPAIGN_ANGLE',
        ].includes(upper)
      ) {
        set.add(upper);
      }
    }

    return Array.from(set);
  }

  private static predictDecisionValue(
    decision: CreativeDecision,
    dimension: string,
    answerValue: string,
    _knownContext: KnownContextMap
  ): unknown {
    const val = answerValue.toLowerCase();

    if (decision === 'CUSTOMER_MOTIVATION') {
      return val;
    }

    if (decision === 'POSITIONING') {
      if (val === 'convenience') return 'effortless_speed_positioning';
      if (val === 'experience') return 'indulgent_memorable_experience';
      if (val === 'value') return 'unbeatable_price_value';
      if (val === 'quality') return 'artisanal_craftsmanship';
      if (val === 'trust') return 'proven_reliability';
      return `positioning_${val}`;
    }

    if (decision === 'CREATIVE_TERRITORY') {
      if (val === 'convenience') return 'instant_gratification';
      if (val === 'experience') return 'social_dining_ambiance';
      if (val === 'value') return 'smart_savings';
      return `territory_${val}`;
    }

    if (decision === 'COPY_DIRECTION') {
      if (val === 'convenience') return 'fast_practical_direct';
      if (val === 'experience') return 'evocative_atmospheric_warm';
      if (val === 'value') return 'urgent_discount_headline';
      return `copy_${val}`;
    }

    if (decision === 'VISUAL_DIRECTION') {
      if (val === 'convenience') return 'product_in_use_ordering';
      if (val === 'experience') return 'lifestyle_ambiance_warmth';
      if (val === 'value') return 'bold_price_badge';
      return `visual_${val}`;
    }

    if (decision === 'CTA') {
      if (val === 'convenience') return 'Order Now';
      if (val === 'experience') return 'Book Table';
      if (val === 'value') return 'Claim 20% OFF';
      return `CTA_${val}`;
    }

    return `${decision.toLowerCase()}_${val}`;
  }
}
