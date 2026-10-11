import { cond, definePrinciple, link, type PsychologyBankEntry } from '../psychology-types';

/**
 * ATTENTION — whether something is noticed, processed or retained long enough for communication to occur.
 * Reference principles only: evidence is NOT attached yet (Phase 10.10), so each is held as a plausible mechanism at
 * confidence "hypothesis". Further concepts in the taxonomy (surprise, contrast, salience …) are planned, not authored.
 */
export const ATTENTION_PRINCIPLES: readonly PsychologyBankEntry[] = [
  definePrinciple(
    {
      id: 'curiosity',
      name: 'Curiosity',
      category: 'attention',
      additionalCategories: ['emotion'],
      domain: 'attention',
      definition: 'A motivational state involving a desire to obtain information or resolve uncertainty, typically when an information gap is perceived as relevant and resolvable.',
      technicalDefinition: 'Information-seeking motivation associated with a perceived gap between what is known and what one wants to know.',
      creativeInterpretation: 'Open a gap the audience genuinely cares about, and close it with something of real value.',
      strategicImplication: 'May be worth considering when the information is useful to this audience and the answer can actually be delivered in the creative or the next step.',
      whatItDoes: 'Can increase information-seeking when an audience perceives a gap that is relevant to them, believes it can be resolved, and has enough motivation to resolve it.',
      whyItMayWork: 'A possible explanation is that a perceived gap between current and desired knowledge motivates people to close it; the effect depends on perceived relevance and on the expectation that the gap will be resolved.',
      explanationBasis: 'plausible_mechanism',
      scope: 'Covers gaps between what is known and wanted. Does not cover clickbait, which opens a gap that is not resolved.',
      whenToUse: [
        'the information is genuinely useful to the audience',
        'the audience has a reason to care about the answer',
        'the eventual information satisfies the expectation the gap created',
        'the gap can be resolved within the experience or its next step',
      ],
      whenNotToUse: [
        'the information is irrelevant to the audience',
        'the gap exists only to earn a click',
        'the implied promise cannot be fulfilled',
        'ambiguity would create distrust',
        cond('audience is in a high-anxiety situation where uncertainty is distressing', 'situation', 'high_anxiety'),
      ],
      intensity: 'moderate',
      intensityLadder: [
        { level: 'low', description: 'A relevant question that the content answers directly.', recommended: true },
        { level: 'moderate', description: 'A partial reveal that the content completes.', recommended: true },
        { level: 'excessive', description: 'Withholding material information to force further engagement.', recommended: false },
      ],
      riskLevel: 'moderate',
      risks: [
        ['A gap that is not satisfied can reduce trust in the business.', 'moderate'],
        ['Repeated gaps can train the audience to ignore them.', 'low'],
      ],
      ethicalBoundary: 'Never create a misleading information gap simply to generate clicks; the resolution must deliver what the gap implied.',
      sensitivity: 'elevated',
      safeApplications: ['A question about something the audience wants to know, answered fully by the content.'],
      prohibitedApplications: ['A teaser whose answer is trivial, irrelevant or absent.', 'Withholding material information to force engagement.'],
      doesNotExplain: ['Whether attention converts into purchase.', 'Interest that persists after the answer is given.'],
      alternativeExplanations: ['Engagement may reflect existing relevance to the topic rather than the gap itself.'],
      vulnerableAudienceGuidance: ['Avoid opening gaps that play on anxiety about health, money or safety.'],
      examples: ['A relevant open question that the content then answers', 'A progressive reveal across a short sequence'],
      antiExamples: ['A teaser that never delivers its promised information', 'A finished headline written for a specific post'],
    },
    [
      link('constrainedBy', 'anti_pattern', 'clickbait-information-gap', { rationale: 'A gap that is not resolved is clickbait, not curiosity.' }),
      link('compatibleWith', 'creative_mechanism', 'curiosity-gap'),
      link('compatibleWith', 'creative_mechanism', 'progressive-reveal'),
      link('oftenCombinedWith', 'psychology', 'novelty'),
    ]
  ),

  definePrinciple(
    {
      id: 'novelty',
      name: 'Novelty',
      category: 'attention',
      domain: 'attention',
      definition: 'The potential attentional value of something that differs from what the audience expects or has recently encountered.',
      technicalDefinition: 'Attentional response associated with stimuli that deviate from expectation or recent experience.',
      creativeInterpretation: 'Make something feel fresh while keeping it understandable and recognisably yours.',
      strategicImplication: 'Consider when there is something genuinely new to say, and when the audience can still recognise the brand and follow the message.',
      whatItDoes: 'Can draw attention to something that differs from what the audience is used to, provided it stays relevant and comprehensible.',
      whyItMayWork: 'A possible explanation is that departures from expectation can prompt reassessment; the benefit tends to depend on relevance and on the audience still being able to understand what is shown.',
      explanationBasis: 'plausible_mechanism',
      scope: 'Covers difference from expectation. Does not treat novelty as automatically beneficial.',
      whenToUse: ['there is genuinely new information, a new product or a new perspective', 'the audience has seen similar communication recently', 'the message stays comprehensible'],
      whenNotToUse: [
        'novelty would obscure the message or the product',
        cond('brand recognition is the main goal and the audience does not yet know the brand', 'objective', 'brand_recognition'),
        cond('the audience needs reassurance and familiarity to trust', 'customer_intent', 'needs_reassurance'),
      ],
      intensity: 'context-dependent',
      riskLevel: 'moderate',
      risks: [['Too much novelty can reduce comprehension, familiarity and trust.', 'moderate']],
      ethicalBoundary: 'Do not present something as new or different when it is not.',
      sensitivity: 'standard',
      safeApplications: ['Introducing a genuinely new offering in a clear way.'],
      prohibitedApplications: ['Claiming novelty that does not exist.'],
      doesNotExplain: ['Whether attention is retained.', 'Whether the audience will trust what is new.'],
      alternativeExplanations: ['Attention may come from relevance or timing rather than difference.'],
      examples: ['A new perspective on a familiar category', 'An unexpected but relevant format'],
      antiExamples: ['Randomness presented as novelty', 'A specific trending format tied to one campaign'],
    },
    [link('oftenCombinedWith', 'psychology', 'curiosity'), link('compatibleWith', 'creative_mechanism', 'pattern-interrupt')]
  ),

  definePrinciple(
    {
      id: 'specificity',
      name: 'Specificity',
      category: 'attention',
      additionalCategories: ['trust'],
      domain: 'perception',
      definition: 'The use of concrete, verifiable detail in place of vague description, which can reduce ambiguity and make information easier to evaluate.',
      technicalDefinition: 'Concreteness of information, associated with lower ambiguity and easier mental representation.',
      creativeInterpretation: 'Say the real, particular thing rather than a general quality word, and only when it is true.',
      strategicImplication: 'May be useful where claims feel generic or the audience is unsure what they will get, and where verified detail exists.',
      whatItDoes: 'Can make a claim easier to picture and to judge, and may support perceived credibility when the detail is verifiable and relevant.',
      whyItMayWork: 'A possible explanation is that concrete detail reduces ambiguity and gives the audience something to evaluate; it can support credibility only when the detail is true.',
      explanationBasis: 'plausible_mechanism',
      scope: 'Covers concreteness. Specificity plus truthfulness may add clarity; specificity alone is not credibility.',
      whenToUse: ['verified, relevant detail exists', 'the audience is evaluating an unfamiliar offer', 'a general claim feels interchangeable with competitors'],
      whenNotToUse: ['the detail cannot be verified', 'the figure would be unrepresentative or out of context', 'precision would imply certainty that does not exist'],
      intensity: 'moderate',
      riskLevel: 'moderate',
      risks: [['False precision can look credible while being untrue.', 'high'], ['Too much detail can overload the audience.', 'low']],
      ethicalBoundary: 'Specific figures and claims must be verified and representative; never invent numbers or precision.',
      sensitivity: 'elevated',
      safeApplications: ['Stating a verified, relevant fact in concrete terms.'],
      prohibitedApplications: ['Inventing statistics or precise-looking figures.', 'Presenting an unrepresentative result as typical.'],
      doesNotExplain: ['Whether the audience will care about the detail.', 'Credibility when the source is doubted.'],
      alternativeExplanations: ['Perceived credibility may come from the source or the brand rather than the detail.'],
      examples: ['A concrete verified fact instead of a vague quality word', 'A named process step instead of general reassurance'],
      antiExamples: ['A precise-looking number with no source', 'A specific figure copied from one campaign'],
    },
    [
      link('constrainedBy', 'anti_pattern', 'invented-statistics'),
      link('compatibleWith', 'creative_mechanism', 'specificity'),
      link('compatibleWith', 'creative_mechanism', 'proof-stack'),
      link('supports', 'marketing_principle', 'make-benefit-concrete'),
    ]
  ),
];
