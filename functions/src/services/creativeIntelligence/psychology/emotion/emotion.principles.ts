import { cond, definePrinciple, link, type PsychologyBankEntry } from '../psychology-types';

/** EMOTION — states or responses to a situation, not a creative colour. */
export const EMOTION_PRINCIPLES: readonly PsychologyBankEntry[] = [
  definePrinciple(
    {
      id: 'relief',
      name: 'Relief',
      category: 'emotion',
      domain: 'emotion',
      definition: 'The emotional response to reduced tension, uncertainty, effort or anxiety.',
      technicalDefinition: 'A positive affective response following the removal or reduction of an aversive state.',
      creativeInterpretation: 'Recognise the effort or worry the audience feels, then show the real way it is reduced.',
      strategicImplication: 'Relevant where the audience carries a real burden — effortful choices, uncertainty or risk — that the offer genuinely lightens.',
      whatItDoes: 'Can make a solution feel more meaningful when the audience recognises the problem, effort or uncertainty it relieves.',
      whyItMayWork: 'A possible explanation is that a benefit is felt more strongly when it removes something unpleasant the audience already experiences; this depends on the audience recognising the burden.',
      explanationBasis: 'plausible_mechanism',
      scope: 'Covers the response to reduced burden. Requires a real burden and a real reduction.',
      whenToUse: [
        'the audience experiences real effort, uncertainty or worry',
        'the offer genuinely reduces it',
        cond('a service business where trust or ease is central', 'industry', 'service'),
      ],
      whenNotToUse: [
        'the problem is not felt by the audience',
        'the relief promised is not delivered',
        'intensifying distress would be needed to make relief felt',
        cond('a joyful, celebratory occasion where tension is not the story', 'situation', 'celebration'),
      ],
      intensity: 'moderate',
      riskLevel: 'low',
      risks: [['Amplifying the problem too much can cause distress rather than relief.', 'moderate']],
      ethicalBoundary: 'Do not intensify distress to sell relief; acknowledge the real burden proportionately and deliver the relief promised.',
      sensitivity: 'standard',
      safeApplications: ['Naming a familiar effort and showing a genuinely simpler way.'],
      prohibitedApplications: ['Manufacturing or inflating anxiety to sell relief.'],
      doesNotExplain: ['Purchases motivated by pleasure or aspiration.', 'Whether the audience recognises the burden.'],
      alternativeExplanations: ['Positive response may reflect the solution’s usefulness rather than the emotional contrast.'],
      vulnerableAudienceGuidance: ['With anxious or distressed audiences, lead with reassurance and avoid dwelling on the problem.'],
      examples: ['A recognisable effortful moment followed by a simpler way', 'Reassurance for an uncertain first-time customer'],
      antiExamples: ['Dramatising a problem the audience does not have', 'A specific problem-solution script for one campaign'],
    },
    [
      link('oftenCombinedWith', 'psychology', 'convenience-preference'),
      link('oftenCombinedWith', 'psychology', 'cognitive-load-reduction'),
      link('compatibleWith', 'creative_mechanism', 'choice-simplification'),
      link('compatibleWith', 'creative_mechanism', 'problem-solution'),
      link('supports', 'marketing_principle', 'reduce-perceived-risk'),
    ]
  ),
];
