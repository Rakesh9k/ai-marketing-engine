/**
 * Controlled vocabularies for the Marketing Mechanism Bank (Phase 10.3).
 *
 * These are reference ids for things that later phases will author as ontology entities (marketing principles 10.5,
 * structures 10.7, assets, audience situations 10.4). Until then a mechanism may only use ids from these lists, so
 * references cannot be misspelled or invented, and each id becomes a real graph edge the moment an ontology entity
 * with that id and type is registered (see `resolveReferenceEdges`).
 */

export const MECHANISM_OBJECTIVES = [
  'awareness', 'attention', 'education', 'trust', 'consideration', 'lead-generation', 'conversion', 'retention', 'upsell', 're-engagement',
] as const;

export const MECHANISM_INDUSTRIES = [
  'restaurant', 'salon', 'real-estate', 'healthcare', 'fitness', 'education', 'saas', 'ecommerce', 'professional-services', 'b2b', 'hospitality', 'retail',
] as const;

export const MECHANISM_PRODUCT_TYPES = [
  'low-ticket', 'high-ticket', 'subscription', 'service', 'physical-product', 'digital-product', 'local-service', 'experience', 'appointment', 'restaurant-offer', 'real-estate-property',
] as const;

export const MECHANISM_FORMATS = ['post', 'carousel', 'reel', 'story', 'ad', 'landing-page', 'whatsapp', 'email', 'video', 'static-image'] as const;

export const AUDIENCE_SITUATION_IDS = [
  'unaware', 'problem-aware', 'solution-aware', 'product-aware', 'high-intent', 'skeptical', 'price-sensitive', 'comparison-shopping',
  'trust-deficient', 'overwhelmed', 'curious', 'first-time-buyer', 'loyal-customer', 'local-community', 'time-pressed', 'undecided',
] as const;

export const MARKETING_PRINCIPLE_IDS = [
  'reduce-uncertainty', 'increase-relevance', 'make-benefit-concrete', 'reduce-perceived-risk', 'make-decision-easier', 'provide-proof',
  'increase-memorability', 'increase-perceived-value', 'match-awareness-level', 'build-familiarity', 'create-identification', 'legitimate-timing',
  'connect-to-situation', 'clarify-offer', 'reduce-price-resistance', 'demonstrate-before-asserting', 'build-credibility', 'encourage-small-step',
  'show-transparency', 'differentiate', 'create-anticipation', 'educate-complexity', 'make-abstract-tangible', 'reinforce-belonging',
  'sustain-attention', 'address-objections', 'reciprocate-value', 'reframe-meaning',
] as const;

export const HOOK_PATTERN_IDS = [
  'question-opening', 'contrarian-claim-opening', 'direct-audience-callout', 'situation-recognition-opening', 'specific-figure-opening',
  'unexpected-statement-opening', 'incomplete-statement-opening', 'visual-reveal-opening', 'problem-statement-opening', 'mistake-callout-opening',
  'behind-the-scenes-opening', 'proof-first-opening', 'myth-statement-opening', 'local-reference-opening', 'before-state-opening', 'offer-first-opening',
] as const;

export const STORY_STRUCTURE_IDS = [
  'tease-reveal-payoff', 'problem-demonstration-result', 'status-quo-failure-discovery-solution', 'before-bridge-after', 'question-answer',
  'mystery-explanation', 'situation-recognition-solution', 'setback-lesson-change', 'origin-conflict-resolution', 'journey-stages', 'day-timeline',
  'step-by-step-process', 'claim-test-result', 'myth-contradiction-truth', 'comparison-winner-reason', 'problem-agitation-solution',
  'attention-interest-desire-action', 'feature-benefit-outcome', 'offer-components-total', 'countdown-to-event', 'challenge-struggle-victory',
  'small-win-escalation', 'proof-explanation-offer', 'community-gathering-story',
] as const;

export const VISUAL_STRUCTURE_IDS = [
  'before-after-split', 'progress-sequence', 'close-up-reveal', 'side-by-side-comparison', 'screen-recording', 'live-demonstration',
  'process-montage', 'proof-wall', 'customer-footage', 'expert-on-camera', 'behind-scenes-footage', 'checklist-layout', 'data-visual',
  'timeline-visual', 'offer-component-layout', 'tier-layout', 'scene-recreation', 'sensory-close-up', 'location-montage', 'countdown-visual',
  'document-showcase', 'single-hero-object',
] as const;

export const COPY_STRUCTURE_IDS = [
  'claim-proof-explanation-cta', 'problem-consequence-solution', 'feature-benefit-outcome-copy', 'objection-validation-proof-resolution',
  'story-lesson-offer', 'question-answer-copy', 'list-with-reasons', 'offer-value-terms-cta', 'comparison-table-copy', 'deadline-reason-cta',
  'testimonial-context-result', 'step-instructions', 'myth-truth-copy', 'plain-terms-summary',
] as const;

export const ASSET_REQUIREMENT_IDS = [
  'real-customer-reviews', 'real-testimonial', 'customer-permission', 'product-footage', 'verified-statistics', 'before-after-images',
  'process-footage', 'pricing-data', 'capacity-information', 'real-credentials', 'real-certification', 'award-documentation',
  'expert-participation', 'genuine-deadline', 'real-inventory-data', 'written-guarantee-terms', 'real-case-data', 'third-party-source',
  'founder-story', 'behind-the-scenes-access', 'location-imagery', 'order-data', 'comparison-data', 'cost-breakdown-data', 'offer-terms',
  'trial-terms', 'community-participation', 'event-details', 'influencer-agreement', 'sample-stock', 'customer-journey-record',
  'tier-definitions', 'cultural-reference', 'audience-insight', 'real-event-timeline',
] as const;

export type MechanismVocabularyKind =
  | 'objective' | 'industry' | 'productType' | 'format' | 'audienceSituation' | 'principle' | 'hook' | 'story' | 'visual' | 'copy' | 'asset';

export const VOCABULARIES: Readonly<Record<MechanismVocabularyKind, readonly string[]>> = {
  objective: MECHANISM_OBJECTIVES,
  industry: MECHANISM_INDUSTRIES,
  productType: MECHANISM_PRODUCT_TYPES,
  format: MECHANISM_FORMATS,
  audienceSituation: AUDIENCE_SITUATION_IDS,
  principle: MARKETING_PRINCIPLE_IDS,
  hook: HOOK_PATTERN_IDS,
  story: STORY_STRUCTURE_IDS,
  visual: VISUAL_STRUCTURE_IDS,
  copy: COPY_STRUCTURE_IDS,
  asset: ASSET_REQUIREMENT_IDS,
};

/** Outcomes are results, not objectives; these must never be used as one (bank §15, §54). */
export const FORBIDDEN_OBJECTIVES: readonly string[] = ['viral', 'guaranteed-sales', 'high-ctr', 'engagement-hack'];

/** Every structure id, for the "structure masquerading as mechanism" check. */
export const ALL_STRUCTURE_IDS: ReadonlySet<string> = new Set([
  ...HOOK_PATTERN_IDS, ...STORY_STRUCTURE_IDS, ...VISUAL_STRUCTURE_IDS, ...COPY_STRUCTURE_IDS,
]);
