import type { IndustryCreativeKnowledge } from './industryKnowledge.types';
import { IndustryCreativeKnowledgeSchema } from './industryKnowledge.schema';
import { RESTAURANT_KNOWLEDGE } from './restaurant.knowledge';
import { SALON_KNOWLEDGE } from './salon.knowledge';
import { REAL_ESTATE_KNOWLEDGE } from './realEstate.knowledge';
import { GENERIC_LOCAL_BUSINESS_KNOWLEDGE } from './generic.knowledge';

/**
 * Centralized Industry Knowledge Registry
 *
 * Design Rule:
 * No state machine, question resolver, or campaign pipeline code should import
 * specific industry knowledge files directly. All components consume knowledge
 * through the IndustryKnowledgeRegistry or IndustryKnowledgeResolver.
 */
export class IndustryKnowledgeRegistry {
  private static instance: IndustryKnowledgeRegistry;
  private registry: Map<string, IndustryCreativeKnowledge> = new Map();

  private constructor() {
    // Register standard out-of-the-box knowledge models
    this.registerIndustry(RESTAURANT_KNOWLEDGE);
    this.registerIndustry(SALON_KNOWLEDGE);
    this.registerIndustry(REAL_ESTATE_KNOWLEDGE);
    this.registerIndustry(GENERIC_LOCAL_BUSINESS_KNOWLEDGE);
  }

  public static getInstance(): IndustryKnowledgeRegistry {
    if (!IndustryKnowledgeRegistry.instance) {
      IndustryKnowledgeRegistry.instance = new IndustryKnowledgeRegistry();
    }
    return IndustryKnowledgeRegistry.instance;
  }

  public registerIndustry(knowledge: IndustryCreativeKnowledge): void {
    try {
      const validated = IndustryCreativeKnowledgeSchema.parse(knowledge) as IndustryCreativeKnowledge;
      const normalizedId = this.normalizeId(validated.industryId);
      this.registry.set(normalizedId, validated);
    } catch (err: any) {
      console.error(`Failed to register industry '${knowledge?.industryId}':`, err);
    }
  }

  public getIndustry(industryId?: string): IndustryCreativeKnowledge {
    if (!industryId) {
      return GENERIC_LOCAL_BUSINESS_KNOWLEDGE;
    }
    const normalizedId = this.normalizeId(industryId);
    const knowledge = this.registry.get(normalizedId);
    if (knowledge) {
      return knowledge;
    }
    // Universal fallback: if industry is unknown (e.g. gym, pet_services), return generic local business
    return GENERIC_LOCAL_BUSINESS_KNOWLEDGE;
  }

  public hasIndustry(industryId?: string): boolean {
    if (!industryId) return false;
    const normalizedId = this.normalizeId(industryId);
    return this.registry.has(normalizedId);
  }

  public listIndustries(): readonly IndustryCreativeKnowledge[] {
    return Array.from(this.registry.values());
  }

  private normalizeId(id: string): string {
    return id.toLowerCase().trim().replace(/[-\s]+/g, '_');
  }
}

export const industryKnowledgeRegistry = IndustryKnowledgeRegistry.getInstance();
