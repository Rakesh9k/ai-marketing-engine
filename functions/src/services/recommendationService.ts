import type {
  CreativeTemplateType,
  CreativeObjective,
  CreativePreference,
  CreativePreferenceState,
  CreativePreferenceSource,
} from '../types';
import { creativeTemplateRegistry } from './creativeTemplateRegistry';
import { getCreativePreferencesByBusiness } from './firestore';

export type RecommendationReason = 'explicit_preference' | 'approval_history' | 'preference_memory';

export interface TemplateRecommendationViewModel {
  templateId: string;
  displayName: string;
  description?: string;

  reason: {
    type: RecommendationReason;
    evidenceCount?: number;
    message: string;
  };
}

export interface CreativeTemplateRecommendationResult {
  recommended?: TemplateRecommendationViewModel;
  alternatives: TemplateRecommendationViewModel[];
  hasEnoughEvidence: boolean;
}

export interface RecommendCreativeTemplatesInput {
  type?: CreativeTemplateType;
  objective?: CreativeObjective;
  vertical?: string;
  businessId: string;
}

export async function recommendCreativeTemplates(
  input: RecommendCreativeTemplatesInput
): Promise<CreativeTemplateRecommendationResult> {
  // 1. Resolve eligible templates through registry
  const availableTemplates = creativeTemplateRegistry.listCreativeTemplates({
    type: input.type,
    objective: input.objective,
    vertical: input.vertical as any,
  });

  if (availableTemplates.length === 0) {
    return { alternatives: [], hasEnoughEvidence: false };
  }

  // 2. Load established creative preferences
  const preferences = await getCreativePreferencesByBusiness(input.businessId);

  // 3. Determine evidence-backed candidates
  // Filter for 'preferred' templates and map to eligible templates
  const candidates: { template: any; pref: CreativePreference }[] = [];

  for (const pref of preferences) {
    if (pref.preference !== 'preferred') continue;

    // Check if preferred template is in the eligible templates
    const matchingTemplate = availableTemplates.find((t) => t.id === pref.templateId);
    if (matchingTemplate) {
      candidates.push({ template: matchingTemplate, pref });
    }
  }

  // 4. If no candidates, return fallback
  if (candidates.length === 0) {
    return {
      alternatives: [],
      hasEnoughEvidence: false,
    };
  }

  // 5. Sort candidates deterministically:
  // - explicit preference comes first (if they have similar confidence/evidence)
  // - higher confidence
  // - higher evidenceCount
  // - stable template ID (alphabetical)
  candidates.sort((a, b) => {
    if (a.pref.source === 'explicit_user' && b.pref.source !== 'explicit_user') return -1;
    if (b.pref.source === 'explicit_user' && a.pref.source !== 'explicit_user') return 1;

    if (b.pref.confidence !== a.pref.confidence) {
      return b.pref.confidence - a.pref.confidence;
    }

    if (b.pref.evidenceCount !== a.pref.evidenceCount) {
      return b.pref.evidenceCount - a.pref.evidenceCount;
    }

    return a.template.id.localeCompare(b.template.id);
  });

  const generateReason = (pref: CreativePreference): TemplateRecommendationViewModel['reason'] => {
    if (pref.source === 'explicit_user') {
      return {
        type: 'explicit_preference',
        message: 'Because you marked this style as preferred.',
      };
    }

    // Use the actual threshold used in Phase 17
    // A net score >= 2 makes it preferred.
    // We can use the positiveEvidenceCount / evidenceCount directly.
    if (pref.positiveEvidenceCount > 0) {
      return {
        type: 'approval_history',
        evidenceCount: pref.positiveEvidenceCount,
        message: `Because you've approved ${pref.positiveEvidenceCount} ${pref.templateId.replace(/-/g, ' ')} creatives.`,
      };
    }

    return {
      type: 'preference_memory',
      message: 'This template matches your recent creative preferences.',
    };
  };

  const topCandidate = candidates[0];
  if (!topCandidate) {
    return { alternatives: [], hasEnoughEvidence: false };
  }

  const alternatives = candidates.slice(1).map((c) => ({
    templateId: c.template.id,
    displayName: c.template.name,
    description: c.template.description,
    reason: generateReason(c.pref),
  }));

  const recommended: TemplateRecommendationViewModel = {
    templateId: topCandidate.template.id,
    displayName: topCandidate.template.name,
    description: topCandidate.template.description,
    reason: generateReason(topCandidate.pref),
  };

  return {
    recommended,
    alternatives,
    hasEnoughEvidence: true,
  };
}
