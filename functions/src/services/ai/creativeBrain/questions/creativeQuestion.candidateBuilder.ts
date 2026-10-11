import type { IndustryCreativeContext } from '../industry/industryKnowledge.types';
import type { CreativeBrainState, CreativeQuestion, KnownContextMap, CreativeQuestionOption } from './creativeQuestion.types';
import { CreativeQuestionRegistry } from './creativeQuestion.registry';

export class CandidateQuestionBuilder {
  public static buildCandidates(
    state: CreativeBrainState,
    knownContext: KnownContextMap,
    industryContext?: IndustryCreativeContext,
    contextSummary: string = 'this campaign'
  ): readonly CreativeQuestion[] {
    const candidates: CreativeQuestion[] = [];
    const registered = CreativeQuestionRegistry.getAll();

    // 1. Convert Registered Generic Questions into Candidate Questions
    for (const regQ of registered) {
      // Check if state is relevant
      if (regQ.affectsStates.includes(state) || regQ.affectsStates.length === 0) {
        const text = regQ.question.replace('{{productName}}', contextSummary);
        const options = this.populateOptions(regQ.dimension, regQ.options, industryContext);

        candidates.push({
          ...regQ,
          question: text,
          options,
        });
      }
    }

    // 2. Convert ICKM Candidate Questions into CreativeQuestion Candidates
    if (industryContext) {
      for (const icCandidate of industryContext.questionCandidates) {
        const dimensionKey = icCandidate.dimensionKey || icCandidate.category;

        // Ensure we don't duplicate questions if already built from registry
        if (!candidates.some((c) => c.dimension === dimensionKey)) {
          const text = icCandidate.promptTemplate.replace('{{productName}}', contextSummary);
          const options: CreativeQuestionOption[] = icCandidate.options.map((optText, idx) => ({
            id: `opt_ic_${icCandidate.id}_${idx}`,
            label: optText,
            value: optText.toLowerCase().replace(/[-\s]+/g, '_'),
            source: 'INDUSTRY_KNOWLEDGE',
          }));

          // Add 'Other' option
          if (!options.some((o) => o.value === 'other')) {
            options.push({
              id: `opt_ic_${icCandidate.id}_other`,
              label: 'Other',
              value: 'other',
              source: 'SYSTEM',
            });
          }

          candidates.push({
            id: `q_ic_${icCandidate.id}`,
            dimension: dimensionKey,
            question: text,
            purpose: icCandidate.contextReason,
            inputType: 'single_select',
            options,
            required: false,
            priority: icCandidate.decisionImpact,
            userEffort: icCandidate.userEffort || 5,
            decisionImpact: icCandidate.decisionImpact,
            creativeRelevance: icCandidate.creativeRelevance,
            affectsStates: icCandidate.affectsStates as CreativeBrainState[],
            affectsDecisions: ['hook', 'creative_territory', 'differentiator'],
            answerImpact: {
              decisionImpact: icCandidate.decisionImpact,
              creativeRelevance: icCandidate.creativeRelevance,
              affectedDimensions: [dimensionKey],
              affectedStates: icCandidate.affectsStates as CreativeBrainState[],
            },
            metadata: {
              source: 'INDUSTRY_KNOWLEDGE',
              industryKnowledgeVersion: industryContext.sourceTrace.knowledgeVersion,
            },
          });
        }
      }
    }

    return candidates;
  }

  private static populateOptions(
    dimension: string,
    existingOptions?: readonly CreativeQuestionOption[],
    industryContext?: IndustryCreativeContext
  ): readonly CreativeQuestionOption[] {
    if (existingOptions && existingOptions.length > 0) {
      return existingOptions;
    }

    const options: CreativeQuestionOption[] = [];

    if (industryContext && dimension === 'audience') {
      for (const aud of industryContext.audiencePatterns) {
        options.push({
          id: `opt_aud_${aud.id}`,
          label: aud.label,
          description: aud.description,
          value: aud.id,
          source: 'INDUSTRY_KNOWLEDGE',
        });
      }
    } else if (industryContext && dimension === 'occasion') {
      for (const occ of industryContext.occasionPatterns) {
        options.push({
          id: `opt_occ_${occ.id}`,
          label: occ.label,
          value: occ.id,
          source: 'INDUSTRY_KNOWLEDGE',
        });
      }
    }

    if (options.length > 0 && !options.some((o) => o.value === 'other')) {
      options.push({
        id: `opt_${dimension}_other`,
        label: 'Other',
        value: 'other',
        source: 'SYSTEM',
      });
    }

    return options;
  }
}
