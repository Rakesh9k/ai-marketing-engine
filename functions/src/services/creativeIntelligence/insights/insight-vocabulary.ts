import {
  AUDIENCE_SITUATION_IDS,
  MARKETING_PRINCIPLE_IDS,
  MECHANISM_INDUSTRIES,
  MECHANISM_OBJECTIVES,
  MECHANISM_PRODUCT_TYPES,
} from '../mechanisms';

/**
 * Controlled vocabularies for the Insight Pattern Library (Phase 10.4). Motivations are ingredients, not insights:
 * an id here is a pointer to the human motivation involved, never a complete explanation. They become ontology edges
 * when `human_motivation` entities exist; until then `referenceCoverage()` reports them as unresolved.
 */
export const MOTIVATION_IDS = [
  'convenience', 'simplicity', 'comfort', 'confidence', 'certainty', 'control', 'autonomy', 'belonging', 'harmony', 'security',
  'family-protection', 'status', 'recognition', 'identity', 'self-expression', 'achievement', 'progress', 'pleasure', 'relief',
  'curiosity', 'fairness', 'thrift', 'competence', 'time-saving', 'care',
] as const;

/** What stands between the person and the desired outcome (spec §12). */
export const BARRIER_TYPES = [
  'functional', 'emotional', 'cognitive', 'financial', 'social', 'behavioral', 'informational', 'trust', 'time', 'effort', 'risk',
  'choice-overload', 'availability', 'access', 'confidence',
] as const;

export const INSIGHT_OBJECTIVES = MECHANISM_OBJECTIVES;
export const INSIGHT_INDUSTRIES = MECHANISM_INDUSTRIES;
export const INSIGHT_PRODUCT_TYPES = MECHANISM_PRODUCT_TYPES;
export const INSIGHT_AUDIENCE_SITUATIONS = AUDIENCE_SITUATION_IDS;
export const INSIGHT_PRINCIPLES = MARKETING_PRINCIPLE_IDS;

export type InsightVocabularyKind = 'motivation' | 'barrier' | 'objective' | 'industry' | 'productType' | 'situation' | 'principle';

export const INSIGHT_VOCABULARIES: Readonly<Record<InsightVocabularyKind, readonly string[]>> = {
  motivation: MOTIVATION_IDS,
  barrier: BARRIER_TYPES,
  objective: INSIGHT_OBJECTIVES,
  industry: INSIGHT_INDUSTRIES,
  productType: INSIGHT_PRODUCT_TYPES,
  situation: INSIGHT_AUDIENCE_SITUATIONS,
  principle: INSIGHT_PRINCIPLES,
};
