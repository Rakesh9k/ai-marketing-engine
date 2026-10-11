import { createOntologyRegistry } from '../ontology';
import type { EntityOfType } from '../ontology';

/**
 * Ethical boundaries as DATA (bank §63–67). A dark pattern is an AntiPattern plus an ethical boundary — this module
 * defines the prohibitions; it never generates, ranks or describes how to execute them.
 */
type AntiPattern = EntityOfType<'anti_pattern'>;

export interface ProhibitionSpec {
  id: string;
  name: string;
  what: string;
  why: string;
  when: string;
  alternative: string;
}

const PROHIBITIONS: readonly ProhibitionSpec[] = [
  { id: 'fake-scarcity', name: 'Fake Scarcity', what: 'Claiming limited supply, capacity or access that does not exist.', why: 'Creates a false belief about availability to force a decision.', when: 'whenever the stated limit is not real and verifiable', alternative: 'State the real capacity or stock, or do not use scarcity' },
  { id: 'fake-urgency', name: 'Fake Urgency', what: 'Implying a deadline, event or price change that is not real.', why: 'Manufactures time pressure that the audience cannot verify or avoid.', when: 'whenever the deadline can be moved, repeated or does not exist', alternative: 'Communicate a genuine deadline with its real reason' },
  { id: 'false-countdown', name: 'False Countdown', what: 'A timer or ending-soon signal that resets or has no real end.', why: 'A fabricated deadline presented as a fact.', when: 'whenever the timer is not tied to a real, fixed end', alternative: 'Show the real end date and what changes after it' },
  { id: 'fake-social-proof', name: 'Fake Social Proof', what: 'Invented ratings, customer counts, followers or popularity signals.', why: 'Borrows credibility from people who do not exist or did not say it.', when: 'whenever the signal is not backed by genuine, current data', alternative: 'Use real, relevant evidence, or be transparent that the business is new' },
  { id: 'fabricated-testimonial', name: 'Fabricated Testimonial', what: 'Testimonials that are invented, altered, paid-for without disclosure, or attributed to AI-generated customers presented as real.', why: 'Deceives the audience about real customer experience.', when: 'whenever the person, words or experience are not genuine and disclosed', alternative: 'Collect and quote genuine customer feedback with permission' },
  { id: 'false-authority', name: 'False Authority', what: 'Claiming credentials, endorsements or expertise the business does not hold.', why: 'Substitutes an unearned signal for real expertise.', when: 'whenever the credential or endorsement cannot be verified', alternative: 'Show verifiable experience, process or qualifications' },
  { id: 'invented-statistics', name: 'Invented Statistics', what: 'Specific numbers, percentages or results that are not sourced or verified.', why: 'Precision is mistaken for credibility; the number is a fabrication.', when: 'whenever a figure lacks a verifiable source or is not representative', alternative: 'Use verified figures, or a qualitative claim you can support' },
  { id: 'exaggerated-consequences', name: 'Exaggerated Consequences', what: 'Overstating the loss or harm of not acting to provoke fear.', why: 'Uses fear disproportionate to the real downside.', when: 'whenever the described consequence is unlikely, inflated or catastrophised', alternative: 'Explain the real, proportionate consequence plainly' },
  { id: 'clickbait-information-gap', name: 'Clickbait Information Gap', what: 'An information gap opened to earn attention that the content does not satisfy.', why: 'Breaks the expectation the gap created and erodes trust.', when: 'whenever the payoff is irrelevant, trivial or absent', alternative: 'Open a gap about genuinely useful information and resolve it' },
  { id: 'misleading-before-after', name: 'Misleading Before/After', what: 'A transformation shown with altered conditions, selective editing or non-representative results.', why: 'Implies a result the service does not reliably produce.', when: 'whenever lighting, editing, timing or selection distorts the comparison', alternative: 'Show representative, honestly captured results with context' },
  { id: 'false-guarantee', name: 'False Guarantee', what: 'A guarantee that is not honoured or hides material conditions.', why: 'Offers false assurance to remove perceived risk.', when: 'whenever the guarantee is not real, or its conditions are concealed', alternative: 'State the real terms clearly, or offer a smaller, honest assurance' },
  { id: 'hidden-costs', name: 'Hidden Costs', what: 'Withholding material charges or conditions until late in the decision.', why: 'Hides information the person needs to choose freely.', when: 'whenever a material cost or condition is not disclosed upfront', alternative: 'Show the full price and conditions at the point of decision' },
  { id: 'forced-continuity', name: 'Forced Continuity', what: 'Continuing a charge or commitment after a trial without clear notice or an easy exit.', why: 'Relies on inattention instead of informed choice.', when: 'whenever ending the arrangement is harder than starting it', alternative: 'Make renewal terms and cancellation clear and easy' },
  { id: 'obstruction', name: 'Obstruction', what: 'Making a desired action, such as cancelling or opting out, deliberately difficult.', why: 'Restricts autonomy through friction rather than value.', when: 'whenever friction is added to prevent a legitimate choice', alternative: 'Keep exits as easy as entries' },
  { id: 'confirmshaming', name: 'Confirmshaming', what: 'Wording a decline option to make the person feel ashamed for choosing it.', why: 'Uses shame to override a legitimate choice.', when: 'whenever declining is framed as a personal failing', alternative: 'Offer a neutral, respectful decline option' },
  { id: 'disguised-advertising', name: 'Disguised Advertising', what: 'Promotional content presented as independent opinion or editorial without disclosure.', why: 'Misleads about the source and intent of the message.', when: 'whenever the commercial nature or relationship is not disclosed', alternative: 'Label promotional content and relationships clearly' },
  { id: 'manipulative-defaults', name: 'Manipulative Defaults', what: 'Pre-selected options that favour the business against the likely interest of the person, without clarity.', why: 'Exploits inertia to bypass informed choice.', when: 'whenever the default is not clearly visible and in the person’s interest', alternative: 'Make defaults visible, reasonable and easy to change' },
  { id: 'intentional-confusion', name: 'Intentional Confusion', what: 'Deliberately complicated or ambiguous wording, pricing or layout to obscure what is being agreed to.', why: 'Prevents understanding in order to win a decision.', when: 'whenever complexity serves concealment rather than the audience', alternative: 'Use plain language and a clear structure' },
];

/** Builds an ontology `anti_pattern` entity (always `ethical_prohibition`) from a prohibition spec. */
export const buildProhibition = (p: ProhibitionSpec): AntiPattern => ({
  id: p.id,
  slug: p.id,
  type: 'anti_pattern' as const,
  name: p.name,
  version: 1,
  status: 'active' as const,
  definition: `${p.what} This is a prohibited deceptive or coercive pattern, not a technique.`,
  semanticPurpose: 'Marks a pattern that Mitra must never recommend, and records why.',
  scope: 'Applies to every business, audience and format; there is no context in which it is acceptable.',
  examples: [p.what],
  antiExamples: [`The honest alternative: ${p.alternative.toLowerCase()}`],
  compatibility: [],
  constraints: [{ kind: 'ethical' as const, description: `Never use: ${p.what}` }],
  kind: 'ethical_prohibition' as const,
  whatItIs: p.what,
  whyProblematic: p.why,
  whenProblematic: [p.when],
  alternatives: [p.alternative],
  ethicalConsiderations: ['Persuasion makes real value clearer; this pattern creates a false belief or removes informed choice.'],
});

/** The shipped dark-pattern prohibitions, as ontology `anti_pattern` entities (all `ethical_prohibition`). */
export const DARK_PATTERN_ANTI_PATTERNS: readonly AntiPattern[] = PROHIBITIONS.map(buildProhibition);

/** Persuasion versus deception, per principle (bank §64), in machine-readable form. */
export interface EthicalApplication {
  readonly principleId: string;
  readonly ethical: string;
  readonly unethical: string;
  readonly antiPatternIds: readonly string[];
}

export const ETHICAL_APPLICATIONS: readonly EthicalApplication[] = [
  { principleId: 'scarcity', ethical: 'Genuine limited supply', unethical: 'Fake stock', antiPatternIds: ['fake-scarcity'] },
  { principleId: 'social-proof', ethical: 'Real customer reviews', unethical: 'Fake testimonials', antiPatternIds: ['fake-social-proof', 'fabricated-testimonial'] },
  { principleId: 'authority', ethical: 'Genuine expertise', unethical: 'Fake credentials', antiPatternIds: ['false-authority'] },
  { principleId: 'specificity', ethical: 'Verified numbers', unethical: 'Invented statistics', antiPatternIds: ['invented-statistics'] },
  { principleId: 'urgency', ethical: 'Real deadline', unethical: 'Fake countdown', antiPatternIds: ['fake-urgency', 'false-countdown'] },
  { principleId: 'loss-aversion', ethical: 'Explain a real consequence', unethical: 'Exaggerate consequences', antiPatternIds: ['exaggerated-consequences'] },
  { principleId: 'curiosity', ethical: 'Useful information gap', unethical: 'Clickbait', antiPatternIds: ['clickbait-information-gap'] },
];

/** Where the audience is vulnerable, tactics become more conservative (bank §67). Metadata only; no exploitation strategy. */
export const VULNERABLE_AUDIENCE_CATEGORIES = [
  'children', 'financial_distress', 'health_sensitive', 'high_emotional_vulnerability', 'crisis_situation',
] as const;

export const AUTONOMY_PRINCIPLE = 'Persuasion should improve understanding, not bypass informed choice.';

/** Convenience: an ontology registry preloaded with the prohibitions. */
export function createRegistryWithProhibitions() {
  const registry = createOntologyRegistry();
  for (const a of DARK_PATTERN_ANTI_PATTERNS) registry.register(a);
  return registry;
}
