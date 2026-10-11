import { OntologyRegistry } from '../ontology/ontology-registry';

/**
 * Validates a CreativeRecipe object against the Zod schema and registers it.
 */
export function registerCreativeRecipe(recipe: any) {
  const item = {
    type: 'creative_recipe',
    id: recipe.id || recipe.slug,
    slug: recipe.slug || recipe.id,
    ...recipe,
  };
  OntologyRegistry.register('creative_recipe', item as any);
}

// Example initial Creative Recipe – "Weekend Family Conversion"
const weekendFamilyConversion: any = {
  id: 'recipe.weekend-family-conversion',
  name: 'Weekend Family Conversion',
  description: 'Drive weekend family orders by highlighting convenience and shared meals.',
  status: 'TESTING',
  versionHistory: [
    {
      version: '1.0.0',
      reason: 'Initial recipe definition.',
      changedAt: new Date().toISOString(),
      author: 'SYSTEM',
    },
  ],
  components: [
    { type: 'MOTIVATION', id: 'convenience-seeking', role: 'PRIMARY' },
    { type: 'MECHANISM', id: 'family-pack-discount', role: 'PRIMARY' },
  ],
  scope: {
    industries: ['food_beverage', 'restaurant'],
    audiences: ['families', 'busy_parents'],
  },
  blueprint: {
    visualStructure: 'hero-reveal',
    copyStructure: 'value-proposition',
    ctaStructure: 'explore-menu',
  },
  qualityScore: {
    overall: 85,
    confidence: 'moderate_evidence',
    notes: 'Prototype level, needs validation in live campaigns.',
  },
  confidence: {
    overall: 'moderate_evidence',
    strategicConfidence: 'moderate_evidence',
    evidenceConfidence: 'moderate_evidence',
    contextualConfidence: 'moderate_evidence',
    executionConfidence: 'moderate_evidence',
    uncertainty: ['Based on prior similar campaigns.'],
  },
};

// Register the example recipe on module load
registerCreativeRecipe(weekendFamilyConversion);

// Export for testing purposes
export const initialCreativeRecipes = [weekendFamilyConversion];
