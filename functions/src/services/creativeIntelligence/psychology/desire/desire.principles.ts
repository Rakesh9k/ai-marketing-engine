import { cond, definePrinciple, link, type PsychologyBankEntry } from '../psychology-types';

/**
 * DESIRE — how wanting an outcome may shape perception, evaluation or behavior. The Human Motivation layer stays the
 * motivation ontology; entries here explain the psychological effect of a desire, not the desire itself.
 */
export const DESIRE_PRINCIPLES: readonly PsychologyBankEntry[] = [
  definePrinciple(
    {
      id: 'convenience-preference',
      name: 'Convenience Preference',
      category: 'desire',
      additionalCategories: ['decision'],
      domain: 'motivation',
      definition: 'A preference for reduced time, effort, complexity or friction when obtaining an outcome.',
      technicalDefinition: 'A tendency to weight effort and time costs when evaluating options, associated with effort reduction and cognitive ease.',
      creativeInterpretation: 'Show how much easier the outcome becomes, rather than only what the outcome is.',
      strategicImplication: 'Worth considering when the audience is time-poor or the choice or process is effortful, and when the offer genuinely reduces effort.',
      whatItDoes: 'Can shift attention from price or features to the effort saved, when the audience is time-constrained or the process feels burdensome.',
      whyItMayWork: 'A possible explanation is that effort and time are costs people weigh; when an option visibly lowers them, it may look more attractive, depending on the audience and the situation.',
      explanationBasis: 'plausible_mechanism',
      scope: 'Covers preference for lower effort. Does not assume everyone values speed over quality or exploration.',
      whenToUse: [
        cond('the audience is time-constrained', 'situation', 'time_constrained'),
        cond('the choice or process is effortful', 'decision_complexity', 'high'),
        'the offer genuinely reduces effort',
      ],
      whenNotToUse: [
        cond('the purchase is valued for the experience or process itself', 'customer_intent', 'experience_driven'),
        'the convenience claim cannot be delivered',
        'over-relying on ease would undermine perceived quality or differentiation',
      ],
      intensity: 'moderate',
      riskLevel: 'low',
      risks: [['Familiar ease can reduce discovery and differentiation.', 'low'], ['Convenience promises that are not met damage trust.', 'moderate']],
      ethicalBoundary: 'Only claim convenience the business can actually deliver, and do not hide complexity that the person needs to know.',
      sensitivity: 'standard',
      safeApplications: ['Showing a genuinely simpler path to the outcome.'],
      prohibitedApplications: ['Claiming ease or speed that is not delivered.', 'Concealing conditions behind a simple-looking offer.'],
      doesNotExplain: ['Whether the audience values the outcome.', 'Choices where exploration or control matters more than effort.'],
      alternativeExplanations: ['Interest may reflect price sensitivity or a lack of alternatives rather than convenience.'],
      examples: ['Highlighting the effort removed from a choice or process', 'Making the next step visibly small'],
      antiExamples: ['A speed claim that cannot be kept', 'A specific delivery-time promise copied from one campaign'],
    },
    [
      link('oftenCombinedWith', 'psychology', 'cognitive-load-reduction'),
      link('oftenCombinedWith', 'psychology', 'choice-reduction'),
      link('compatibleWith', 'creative_mechanism', 'choice-simplification'),
      link('supports', 'marketing_principle', 'make-decision-easier'),
      link('supports', 'human_motivation', 'convenience'),
    ]
  ),
];
