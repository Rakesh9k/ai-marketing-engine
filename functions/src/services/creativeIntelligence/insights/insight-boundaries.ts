import { buildProhibition, type ProhibitionSpec } from '../psychology';
import type { EntityOfType } from '../ontology';

/**
 * Prohibitions specific to insight work. Insight reasoning can go wrong ethically in a different way from persuasion:
 * by stereotyping a culture, exploiting insecurity, inventing a pain point, or presenting a hypothesis as a proven cause.
 * Prohibitions, never techniques.
 */
type AntiPattern = EntityOfType<'anti_pattern'>;

const INSIGHT_PROHIBITIONS: readonly ProhibitionSpec[] = [
  { id: 'cultural-stereotyping', name: 'Cultural Stereotyping', what: 'Treating a culture, region, religion, gender or community as a uniform group with fixed preferences.', why: 'Replaces evidence about a specific audience with a stereotype, and can offend or exclude.', when: 'whenever a claim about a community is stated as universal or not scoped to an audience and evidence', alternative: 'Scope the insight to a specific audience and context, mark it as a hypothesis, and validate it' },
  { id: 'exploiting-insecurity', name: 'Exploiting Insecurity', what: 'Using an insight about self-doubt, shame, status anxiety or fear of inadequacy to push a purchase.', why: 'Turns understanding of a vulnerability into leverage against the person.', when: 'whenever the opportunity depends on making the audience feel inadequate', alternative: 'Address the underlying need honestly and show real value without shaming' },
  { id: 'manufactured-pain-point', name: 'Manufactured Pain Point', what: 'Inventing or inflating a problem the audience does not actually experience in order to sell a solution.', why: 'Creates distress to justify an offer.', when: 'whenever there is no evidence that the audience experiences the problem', alternative: 'Start from a problem the audience genuinely has, supported by evidence' },
  { id: 'unsupported-causal-claim', name: 'Unsupported Causal Claim', what: 'Presenting an interpretation of behavior, or a campaign correlation, as proven cause.', why: 'Overfits one explanation and hides alternatives, leading to confident but wrong strategy.', when: 'whenever causation is asserted without evidence that rules out alternative explanations', alternative: 'State the insight as a hypothesis, list alternative explanations and test it' },
  { id: 'social-pressure-tactics', name: 'Social Pressure Tactics', what: 'Using belonging or group insights to imply exclusion, ridicule or fear of rejection for those who do not buy.', why: 'Converts a need for connection into coercion.', when: 'whenever not buying is framed as social failure', alternative: 'Invite belonging positively and leave the choice free' },
  { id: 'targeting-vulnerability', name: 'Targeting Vulnerability', what: 'Aiming messages at people in crisis, distress, grief, illness or financial desperation because the insight shows they are easier to move.', why: 'Exploits reduced capacity for informed choice.', when: 'whenever the audience is in a vulnerable situation and the message increases pressure', alternative: 'Offer clear, calm, honest help and reduce pressure in vulnerable situations' },
];

export const INSIGHT_ANTI_PATTERNS: readonly AntiPattern[] = INSIGHT_PROHIBITIONS.map(buildProhibition);
