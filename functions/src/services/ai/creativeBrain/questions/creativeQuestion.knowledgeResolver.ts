import type { BusinessBrain } from '../../../../types';
import type { CreativeBrainCampaignIntent } from '../../creativeBrain.types';
import type { IndustryCreativeContext } from '../industry/industryKnowledge.types';
import type {
  KnownCreativeFact,
  KnownContextMap,
  CreativeAnswer,
} from './creativeQuestion.types';

export interface KnowledgeResolverParams {
  readonly businessBrain?: BusinessBrain;
  readonly productContext?: {
    readonly productId?: string;
    readonly name: string;
    readonly description?: string;
    readonly price?: number;
    readonly category?: string;
  };
  readonly campaignIntent?: CreativeBrainCampaignIntent;
  readonly previousAnswers?: readonly CreativeAnswer[];
  readonly industryContext?: IndustryCreativeContext;
}

export interface DimensionState {
  readonly status: 'KNOWN' | 'PARTIALLY_KNOWN' | 'INFERRED' | 'CONFLICTING' | 'UNKNOWN';
  readonly primaryFact?: KnownCreativeFact;
  readonly conflictFacts?: readonly KnownCreativeFact[];
  readonly confidence: number;
}

export class CreativeKnowledgeResolver {
  public static normalizeContext(params: KnowledgeResolverParams): KnownContextMap {
    const map: Record<string, KnownCreativeFact> = {};
    const { businessBrain, productContext, campaignIntent, previousAnswers, industryContext } = params;

    // 1. Authoritative Business Brain Facts (Priority 100)
    if (businessBrain) {
      if (businessBrain.identity?.name) {
        map['business_name'] = {
          dimension: 'business_name',
          value: businessBrain.identity.name,
          source: 'BUSINESS_BRAIN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'BUSINESS',
        };
      }
      if (businessBrain.identity?.industry) {
        map['industry'] = {
          dimension: 'industry',
          value: businessBrain.identity.industry,
          source: 'BUSINESS_BRAIN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'BUSINESS',
        };
      }
      if (businessBrain.audience?.targetCustomer) {
        map['audience'] = {
          dimension: 'audience',
          value: businessBrain.audience.targetCustomer,
          source: 'BUSINESS_BRAIN',
          authority: 'AUTHORITATIVE',
          confidence: 0.95,
          scope: 'BUSINESS',
        };
      }
      if (businessBrain.brand?.tone) {
        map['tone'] = {
          dimension: 'tone',
          value: businessBrain.brand.tone,
          source: 'BUSINESS_BRAIN',
          authority: 'AUTHORITATIVE',
          confidence: 0.9,
          scope: 'BUSINESS',
        };
      }
      if (businessBrain.products?.[0]?.name) {
        map['product_name'] = {
          dimension: 'product_name',
          value: businessBrain.products[0].name,
          source: 'BUSINESS_BRAIN',
          authority: 'AUTHORITATIVE',
          confidence: 0.95,
          scope: 'PRODUCT',
        };
      }
    }

    // 2. Product Context Facts (Priority 95)
    if (productContext) {
      if (productContext.name) {
        map['product_name'] = {
          dimension: 'product_name',
          value: productContext.name,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'PRODUCT',
        };
      }
      if (productContext.price !== undefined) {
        map['price'] = {
          dimension: 'price',
          value: productContext.price,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'PRODUCT',
        };
      }
    }

    // 3. Campaign Intent Parameters (Priority 95 - Campaign Scope)
    if (campaignIntent) {
      const intentAny = campaignIntent as any;
      const objVal = typeof intentAny.objective === 'string' ? intentAny.objective : intentAny.objective?.primaryObjective;
      if (objVal) {
        map['campaign_objective'] = {
          dimension: 'campaign_objective',
          value: objVal,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'CAMPAIGN',
        };
      }
      if (intentAny.offer?.headline) {
        map['offer'] = {
          dimension: 'offer',
          value: intentAny.offer.headline,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 0.95,
          scope: 'CAMPAIGN',
        };
      }
      const audVal = typeof intentAny.audience === 'string' ? intentAny.audience : (intentAny.audience?.primaryAudience || intentAny.audience?.occasion);
      if (audVal) {
        map['audience'] = {
          dimension: 'audience',
          value: audVal,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'CAMPAIGN',
        };
      }
      const occVal = typeof intentAny.occasion === 'string' ? intentAny.occasion : (intentAny.occasion?.primaryOccasion || intentAny.audience?.occasion);
      if (occVal) {
        map['occasion'] = {
          dimension: 'occasion',
          value: occVal,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 0.9,
          scope: 'CAMPAIGN',
        };
      }
    }

    // 4. Previous User Answers (Priority 85)
    if (previousAnswers) {
      for (const ans of previousAnswers) {
        map[ans.dimension] = {
          dimension: ans.dimension,
          value: ans.normalizedValue,
          source: 'PREVIOUS_ANSWER',
          authority: 'SUPPORTING',
          confidence: ans.quality.decisionUsefulness >= 70 ? 0.95 : 0.75,
          scope: 'CREATIVE',
        };
      }
    }

    // 5. Active Subtypes & Inferences from ICKM (Priority 60/30)
    if (industryContext) {
      for (const sub of industryContext.activeSubtypes) {
        if (sub.confidence >= 0.7 && !map['subtype']) {
          map['subtype'] = {
            dimension: 'subtype',
            value: sub.id,
            source: 'INDUSTRY_KNOWLEDGE',
            authority: 'INFERRED',
            confidence: sub.confidence,
            scope: 'BUSINESS',
          };
        }
      }
    }

    return map;
  }

  public static evaluateDimensionState(
    dimension: string,
    knownContext: KnownContextMap,
    conflicts?: readonly KnownCreativeFact[]
  ): DimensionState {
    const fact = knownContext[dimension];

    if (conflicts && conflicts.length > 0) {
      return {
        status: 'CONFLICTING',
        primaryFact: fact,
        conflictFacts: conflicts,
        confidence: 0.5,
      };
    }

    if (!fact) {
      return {
        status: 'UNKNOWN',
        confidence: 0,
      };
    }

    if (fact.authority === 'AUTHORITATIVE' && fact.confidence >= 0.9) {
      return {
        status: 'KNOWN',
        primaryFact: fact,
        confidence: fact.confidence,
      };
    }

    if (fact.authority === 'INFERRED' || fact.confidence < 0.8) {
      return {
        status: 'INFERRED',
        primaryFact: fact,
        confidence: fact.confidence,
      };
    }

    return {
      status: 'PARTIALLY_KNOWN',
      primaryFact: fact,
      confidence: fact.confidence,
    };
  }

  public static detectConflicts(params: KnowledgeResolverParams): readonly KnownCreativeFact[] {
    const conflicts: KnownCreativeFact[] = [];
    const { businessBrain, campaignIntent } = params;

    // Check if campaign offer price conflicts with business brain product price
    if (businessBrain && campaignIntent?.offer?.price !== undefined) {
      const prodMatch = businessBrain.products?.find(
        (p) => p.name.toLowerCase() === campaignIntent.offer?.headline?.toLowerCase()
      );
      if (prodMatch && prodMatch.price !== campaignIntent.offer.price) {
        conflicts.push({
          dimension: 'price',
          value: campaignIntent.offer.price,
          source: 'CURRENT_CAMPAIGN',
          authority: 'AUTHORITATIVE',
          confidence: 1.0,
          scope: 'CAMPAIGN',
        });
      }
    }

    return conflicts;
  }
}
