import type { BusinessBrain } from '../../../../types';
import type { CreativeBrainCampaignIntent } from '../../creativeBrain.types';
import type {
  IndustryCreativeContext,
  KnowledgeAuthorityLevel,
  SubtypeResolution,
  CustomerDimensionKnowledge,
  CreativeDimensionKnowledge,
  MarketingObjectiveKnowledge,
  CreativeTerritoryKnowledge,
} from './industryKnowledge.types';
import { industryKnowledgeRegistry } from './industryKnowledge.registry';

export interface IndustryResolutionParams {
  readonly businessBrain?: BusinessBrain;
  readonly productContext?: {
    readonly productId?: string;
    readonly name: string;
    readonly description?: string;
    readonly price?: number;
    readonly category?: string;
    readonly images?: readonly string[];
  };
  readonly campaignIntent?: CreativeBrainCampaignIntent;
  readonly vertical?: string;
}

export class IndustryKnowledgeResolver {
  public static resolve(params: IndustryResolutionParams): IndustryCreativeContext {
    const { businessBrain, productContext, campaignIntent, vertical } = params;

    // 1. Determine Industry ID & Authority
    const { industryId, confidence: industryConfidence, authority } = this.determineIndustryId(
      businessBrain,
      vertical
    );

    const knowledge = industryKnowledgeRegistry.getIndustry(industryId);
    const requestedIndustry = vertical || businessBrain?.identity?.industry || businessBrain?.identity?.category;
    const fallbackUsed = Boolean(requestedIndustry && !industryKnowledgeRegistry.hasIndustry(requestedIndustry));

    // 2. Detect & Resolve Subtypes
    const activeSubtypes = this.detectSubtypes(
      knowledge,
      businessBrain,
      productContext,
      campaignIntent
    );

    // 3. Deterministically Merge Knowledge Base + Active Subtypes
    const activeCustomerDimensions = this.mergeCustomerDimensions(knowledge, activeSubtypes);
    const activeCreativeDimensions = this.mergeCreativeDimensions(knowledge, activeSubtypes);
    const relevantObjectives = this.mergeObjectives(knowledge, activeSubtypes);
    const relevantTerritories = this.mergeTerritories(knowledge, activeSubtypes);
    const audiencePatterns = knowledge.audiencePatterns;
    const occasionPatterns = knowledge.occasionPatterns;
    const offerPatterns = knowledge.offerPatterns;
    const trustSignals = knowledge.trustSignals;
    const questionCandidates = knowledge.questionCandidates;

    const sourceTrace = {
      industryId: knowledge.industryId,
      industryConfidence,
      matchedSubtypes: activeSubtypes.map((s) => s.id),
      knowledgeVersion: knowledge.metadata.version,
      fallbackUsed,
      timestamp: new Date().toISOString(),
    };

    return {
      industry: {
        id: knowledge.industryId,
        displayName: knowledge.displayName,
        confidence: industryConfidence,
        authority,
      },
      activeSubtypes,
      activeCustomerDimensions,
      activeCreativeDimensions,
      relevantObjectives,
      relevantTerritories,
      audiencePatterns,
      occasionPatterns,
      offerPatterns,
      trustSignals,
      questionCandidates,
      sourceTrace,
    };
  }

  private static determineIndustryId(
    brain?: BusinessBrain,
    vertical?: string
  ): { industryId: string; confidence: number; authority: KnowledgeAuthorityLevel } {
    // 1. Authoritative Business Brain Industry
    const rawIndustry = brain?.identity?.industry;
    if (rawIndustry) {
      const normalized = this.normalize(rawIndustry);
      if (industryKnowledgeRegistry.hasIndustry(normalized)) {
        return { industryId: normalized, confidence: 1.0, authority: 'CONFIRMED' };
      }
      if (normalized.includes('restaurant') || normalized.includes('food') || normalized.includes('dining')) {
        return { industryId: 'restaurant', confidence: 0.95, authority: 'CONFIRMED' };
      }
      if (normalized.includes('salon') || normalized.includes('spa') || normalized.includes('beauty')) {
        return { industryId: 'salon', confidence: 0.95, authority: 'CONFIRMED' };
      }
      if (normalized.includes('real_estate') || normalized.includes('property') || normalized.includes('realty')) {
        return { industryId: 'real_estate', confidence: 0.95, authority: 'CONFIRMED' };
      }
    }

    // 2. Authoritative Business Brain Category
    if (brain?.identity?.category) {
      const cat = this.normalize(brain.identity.category);
      if (industryKnowledgeRegistry.hasIndustry(cat)) {
        return { industryId: cat, confidence: 0.95, authority: 'CONFIRMED' };
      }
      if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) {
        return { industryId: 'restaurant', confidence: 0.9, authority: 'CONFIRMED' };
      }
      if (cat.includes('salon') || cat.includes('spa') || cat.includes('beauty')) {
        return { industryId: 'salon', confidence: 0.9, authority: 'CONFIRMED' };
      }
      if (cat.includes('real_estate') || cat.includes('property') || cat.includes('realty')) {
        return { industryId: 'real_estate', confidence: 0.9, authority: 'CONFIRMED' };
      }
    }

    // 3. Campaign-scoped caller vertical hint (used only when Business Brain lacks industry/category)
    if (vertical) {
      const normalizedVert = this.normalize(vertical);
      if (industryKnowledgeRegistry.hasIndustry(normalizedVert)) {
        return { industryId: normalizedVert, confidence: 0.85, authority: 'INFERRED' };
      }
    }

    // 4. Fallback Generic Local Business
    return {
      industryId: 'generic_local_business',
      confidence: 0.5,
      authority: 'HYPOTHESIZED',
    };
  }

  private static detectSubtypes(
    knowledge: ReturnType<typeof industryKnowledgeRegistry.getIndustry>,
    brain?: BusinessBrain,
    productContext?: IndustryResolutionParams['productContext'],
    campaignIntent?: CreativeBrainCampaignIntent
  ): readonly SubtypeResolution[] {
    const resolutions: SubtypeResolution[] = [];

    const productCorpus = [
      productContext?.name || '',
      productContext?.description || '',
      productContext?.category || '',
    ].join(' ').toLowerCase();

    const businessCorpus = [
      brain?.identity?.category || '',
      brain?.identity?.description || '',
      ...(brain?.products?.map((p: any) => `${p.name} ${p.description || ''} ${p.category || ''}`) || []),
    ].join(' ').toLowerCase();

    const campaignCorpus = [
      campaignIntent?.offer?.headline || '',
    ].join(' ').toLowerCase();

    for (const subtype of knowledge.subtypes) {
      let matchedCount = 0;
      const matchedSources = new Set<string>();

      for (const kw of subtype.keywords) {
        const kwLower = kw.toLowerCase();

        if (productCorpus.includes(kwLower)) {
          matchedCount += 1;
          matchedSources.add('PRODUCT_CONTEXT');
        }
        if (businessCorpus.includes(kwLower)) {
          matchedCount += 1;
          matchedSources.add('BUSINESS_DESCRIPTION');
        }
        if (campaignCorpus.includes(kwLower)) {
          matchedCount += 1;
          matchedSources.add('CAMPAIGN_OFFER');
        }
      }

      if (matchedCount > 0) {
        const confidence = Math.min(0.95, 0.6 + matchedCount * 0.15);
        const primarySource = matchedSources.has('PRODUCT_CONTEXT')
          ? 'PRODUCT_CONTEXT'
          : matchedSources.has('BUSINESS_DESCRIPTION')
          ? 'BUSINESS_DESCRIPTION'
          : 'CAMPAIGN_OFFER';

        resolutions.push({
          id: subtype.id,
          confidence,
          source: primarySource,
          authority: 'INFERRED',
        });
      }
    }

    // Sort descending by confidence
    return resolutions.sort((a, b) => b.confidence - a.confidence);
  }

  private static mergeCustomerDimensions(
    knowledge: ReturnType<typeof industryKnowledgeRegistry.getIndustry>,
    activeSubtypes: readonly SubtypeResolution[]
  ): readonly CustomerDimensionKnowledge[] {
    const map = new Map<string, CustomerDimensionKnowledge>();

    // Base dimensions
    for (const dim of knowledge.customerDimensions) {
      map.set(dim.id, dim);
    }

    // Boost or add subtype dimensions
    for (const subtypeRes of activeSubtypes) {
      const subtypeDef = knowledge.subtypes.find((s) => s.id === subtypeRes.id);
      if (subtypeDef?.relevantDimensions) {
        for (const dimId of subtypeDef.relevantDimensions) {
          const existing = map.get(dimId);
          if (existing) {
            map.set(dimId, {
              ...existing,
              decisionImpact: Math.min(100, existing.decisionImpact + 5),
              creativeRelevance: Math.min(100, existing.creativeRelevance + 5),
            });
          }
        }
      }
    }

    return Array.from(map.values());
  }

  private static mergeCreativeDimensions(
    knowledge: ReturnType<typeof industryKnowledgeRegistry.getIndustry>,
    _activeSubtypes: readonly SubtypeResolution[]
  ): readonly CreativeDimensionKnowledge[] {
    const map = new Map<string, CreativeDimensionKnowledge>();
    for (const dim of knowledge.creativeDimensions) {
      map.set(dim.id, dim);
    }
    return Array.from(map.values());
  }

  private static mergeObjectives(
    knowledge: ReturnType<typeof industryKnowledgeRegistry.getIndustry>,
    _activeSubtypes: readonly SubtypeResolution[]
  ): readonly MarketingObjectiveKnowledge[] {
    const map = new Map<string, MarketingObjectiveKnowledge>();
    for (const obj of knowledge.marketingObjectives) {
      map.set(obj.id, obj);
    }
    return Array.from(map.values()).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  private static mergeTerritories(
    knowledge: ReturnType<typeof industryKnowledgeRegistry.getIndustry>,
    _activeSubtypes: readonly SubtypeResolution[]
  ): readonly CreativeTerritoryKnowledge[] {
    const map = new Map<string, CreativeTerritoryKnowledge>();
    for (const terr of knowledge.creativeTerritories) {
      map.set(terr.id, terr);
    }
    return Array.from(map.values());
  }

  private static normalize(id: string): string {
    return id.toLowerCase().trim().replace(/[-\s]+/g, '_');
  }
}
