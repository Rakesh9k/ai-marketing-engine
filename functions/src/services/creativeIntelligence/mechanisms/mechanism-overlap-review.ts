/**
 * The ontology review the Phase 10.3 brief asks for (§63): concepts that appeared in the reference list but were NOT
 * kept as separate mechanisms, and why. Kept as data so the decisions are auditable and tests can prove the library
 * matches them. The goal is a clean abstraction hierarchy, not a bloated vocabulary.
 */
export type OverlapRuling =
  /** Same abstraction as an existing mechanism; folded into it. */
  | 'merged'
  /** A psychological phenomenon: lives in the Psychology Bank; the mechanism that applies it is named in `into`. */
  | 'psychology'
  /** Kept, under a different name, to remove a misleading or manipulative framing. */
  | 'renamed'
  /** Looked like a duplicate but is a genuinely distinct abstraction. */
  | 'distinct';

export interface OverlapDecision {
  readonly concept: string;
  readonly ruling: OverlapRuling;
  /** Mechanism id(s) that hold the concept (for `psychology`: the mechanism(s) that apply it). */
  readonly into: readonly string[];
  readonly rationale: string;
}

export const OVERLAP_REVIEW: readonly OverlapDecision[] = [
  // Curiosity cluster
  { concept: 'information-gap', ruling: 'psychology', into: ['curiosity-gap'], rationale: 'The perceived gap is the psychological phenomenon; Curiosity Gap is the communication method that uses it.' },
  { concept: 'open-loop', ruling: 'merged', into: ['curiosity-gap'], rationale: 'An open loop is a variant structure of Curiosity Gap (incomplete information resolved later), not a separate method.' },
  { concept: 'information-reveal', ruling: 'merged', into: ['progressive-reveal'], rationale: 'Revealing information in sequence is Progressive Reveal; a bare reveal is a structure step, not a mechanism.' },
  { concept: 'progressive-reveal', ruling: 'distinct', into: ['progressive-reveal'], rationale: 'Sequencing disclosure across a message is distinct from withholding one piece of valuable information (Curiosity Gap).' },
  // Transformation cluster
  { concept: 'before-after', ruling: 'merged', into: ['transformation'], rationale: 'Before/After is the visual structure of Transformation; Before/After/Bridge is kept as a framework.' },
  { concept: 'before-after-bridge', ruling: 'distinct', into: ['before-after-bridge'], rationale: 'A recognised framework (kind "framework") that adds the bridge to the offer; classified as a framework, not a psychological mechanism.' },
  { concept: 'customer-journey', ruling: 'distinct', into: ['customer-journey'], rationale: 'Sequencing real experience across stages differs from showing a single change (Transformation).' },
  // Social-proof cluster
  { concept: 'social-proof', ruling: 'psychology', into: ['volume-social-proof', 'review-stack', 'ugc', 'customer-testimonial'], rationale: 'Social proof is a Psychology Bank principle; these are the distinct methods of presenting genuine social evidence.' },
  { concept: 'customer-evidence', ruling: 'merged', into: ['customer-testimonial', 'case-study'], rationale: 'Too generic: it is a customer testimonial (a voice) or a case study (a documented case).' },
  { concept: 'volume-social-proof', ruling: 'distinct', into: ['volume-social-proof'], rationale: 'Scale of adoption needs order data; review stack needs reviews; UGC needs customer-made content — distinct required assets and failure modes.' },
  // Pricing cluster
  { concept: 'anchoring', ruling: 'psychology', into: ['price-anchor', 'value-stack'], rationale: 'Anchoring is the phenomenon; Price Anchor and Value Stack are methods that may use a real reference point.' },
  { concept: 'price-framing', ruling: 'merged', into: ['payment-framing', 'daily-cost-breakdown'], rationale: 'Too broad; the concrete methods are Payment Framing and Daily Cost Breakdown.' },
  { concept: 'good-better-best', ruling: 'merged', into: ['tiered-pricing'], rationale: 'A three-level instance of Tiered Pricing.' },
  { concept: 'comparison', ruling: 'renamed', into: ['offer-comparison'], rationale: 'Renamed to separate offer comparison (pricing) from Comparative Proof (evidence about quality).' },
  { concept: 'decoy-pricing', ruling: 'distinct', into: ['decoy-pricing'], rationale: 'Kept only with a strict boundary: every option must be a genuine, purchasable offer.' },
  // Psychology phenomena the reference listed as mechanisms
  { concept: 'reciprocity', ruling: 'psychology', into: ['value-first-giving'], rationale: 'Phenomenon; the method is giving genuine value first.' },
  { concept: 'commitment-and-consistency', ruling: 'psychology', into: ['small-commitment-ladder'], rationale: 'Phenomenon; the method is an easy, reversible first step.' },
  { concept: 'endowment', ruling: 'psychology', into: ['free-trial', 'sample-offer'], rationale: 'Phenomenon; applied honestly through trials and samples.' },
  { concept: 'ikea-effect', ruling: 'psychology', into: ['co-creation'], rationale: 'Phenomenon; the method is inviting real customer contribution.' },
  { concept: 'framing', ruling: 'psychology', into: ['reframe'], rationale: 'Phenomenon; the method is an accurate reframe.' },
  { concept: 'contrast', ruling: 'psychology', into: ['side-by-side-contrast'], rationale: 'Phenomenon; the method is a fair side-by-side presentation.' },
  { concept: 'specificity', ruling: 'psychology', into: ['concrete-specifics'], rationale: 'Phenomenon; the method is verified concrete detail.' },
  { concept: 'familiarity', ruling: 'psychology', into: ['familiar-cue-consistency'], rationale: 'Phenomenon; the method is consistent recognisable cues.' },
  { concept: 'novelty', ruling: 'psychology', into: ['novel-angle'], rationale: 'Phenomenon; the method is a fresh relevant angle.' },
  { concept: 'labeling', ruling: 'renamed', into: ['audience-callout'], rationale: 'Renamed: naming the audience to help self-selection, without the labelling-as-manipulation connotation.' },
  { concept: 'status-play', ruling: 'renamed', into: ['identity-projection'], rationale: 'Renamed: aspirational identity connection, not status anxiety or shaming.' },
  { concept: 'perspective-shift', ruling: 'merged', into: ['customer-pov', 'reframe'], rationale: 'Viewing from another vantage is Customer POV; changing the meaning of a fact is Reframe.' },
  { concept: 'choice-reduction', ruling: 'psychology', into: ['choice-simplification'], rationale: 'Choice Reduction is a Psychology Bank principle; Choice Simplification is the communication method.' },
  // Narrative cluster
  { concept: 'origin-of-the-enemy', ruling: 'renamed', into: ['shared-problem-origin'], rationale: 'Renamed to explain where a problem comes from without casting an enemy.' },
  // Proof cluster
  { concept: 'freshness-demonstration', ruling: 'merged', into: ['demonstration'], rationale: 'An execution of Demonstration applied to a freshness claim.' },
  { concept: 'live-product-demo', ruling: 'distinct', into: ['live-product-demo'], rationale: 'Real-time, unedited demonstration has a different credibility profile and risk from a recorded one.' },
  { concept: 'community-proof', ruling: 'merged', into: ['neighborhood-proof', 'community-story'], rationale: 'Local evidence is Neighbourhood Proof; a shared local narrative is Community Story.' },
  // Urgency cluster
  { concept: 'closing-window', ruling: 'merged', into: ['availability-window'], rationale: 'A period before a known close is an availability window.' },
  { concept: 'reservation-window', ruling: 'merged', into: ['availability-window'], rationale: 'The period in which reservations are open is an availability window.' },
  { concept: 'first-100-buyers', ruling: 'merged', into: ['early-bird'], rationale: 'A numeric early-commitment offer; the count must be real.' },
];
