import type { BusinessBrain } from '../../../../types';
import type { CreativeBrainCampaignIntent } from '../../creativeBrain.types';
import type { IndustryCreativeContext } from '../industry/industryKnowledge.types';
import type { CreativeBrainState } from './creativeQuestion.types';
import type {
  DynamicQuestionEngineResult,
  CreativeInformationSufficiency,
  CreativeQuestionSession,
  CreativeAnswer,
  InferredCreativeValue,
} from './creativeQuestion.types';
import { CreativeKnowledgeResolver } from './creativeQuestion.knowledgeResolver';
import { CandidateQuestionBuilder } from './creativeQuestion.candidateBuilder';
import { QuestionScorer } from './creativeQuestion.scorer';
import { QuestionSelector } from './creativeQuestion.selector';
import { InformationGainEngine } from './informationGain.engine';
import { DynamicQuestionTracer } from './creativeQuestion.trace';

export interface DynamicQuestionEngineInput {
  readonly state: CreativeBrainState;
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
  readonly session?: CreativeQuestionSession;
  readonly industryContext?: IndustryCreativeContext;
  readonly contextSummary?: string;
}

export class DynamicQuestionEngine {
  public static evaluate(input: DynamicQuestionEngineInput): DynamicQuestionEngineResult {
    const {
      state,
      businessBrain,
      productContext,
      campaignIntent,
      previousAnswers,
      session,
      industryContext,
      contextSummary = 'this campaign',
    } = input;

    // 1. Normalize Context & Build Known Facts Map
    const knownContext = CreativeKnowledgeResolver.normalizeContext({
      businessBrain,
      productContext,
      campaignIntent,
      previousAnswers,
      industryContext,
    });

    const knownDimensions = Object.keys(knownContext);

    // 2. Check Creative Information Sufficiency
    const sufficiency = this.evaluateSufficiency(knownContext, state);

    // 3. If Sufficient, PROCEED without Asking Questions
    if (sufficiency.sufficient && sufficiency.recommendation === 'PROCEED') {
      const trace = DynamicQuestionTracer.createTrace({
        state,
        knownDimensions,
        missingDimensions: sufficiency.missingHighImpactDimensions,
        candidates: [],
        action: 'PROCEED',
        industryKnowledgeVersion: industryContext?.sourceTrace.knowledgeVersion,
      });

      return {
        action: 'PROCEED',
        missingInformation: [],
        sufficiency,
        reasoning: {
          summary: 'Context contains sufficient information to make strategic creative decisions without asking the user.',
        },
        trace,
      };
    }

    // 4. Build Candidate Questions
    const candidateQuestions = CandidateQuestionBuilder.buildCandidates(
      state,
      knownContext,
      industryContext,
      contextSummary
    );

    // 5. Score Candidates using Information Value Formula & Information Gain Engine
    const scoredCandidates = candidateQuestions.map((q) =>
      QuestionScorer.scoreQuestion(q, state, knownContext)
    );

    const rankedCandidates = QuestionScorer.rankCandidates(scoredCandidates);
    const missingInformation = rankedCandidates.map((c) => c.missingInfo);

    // Phase 5: Evaluate Information Gain & Decision Divergence
    const evaluatedGainItems = InformationGainEngine.evaluateCandidates(
      rankedCandidates,
      knownContext
    );

    // HARD INVARIANT: Zero-Gain Question Rule (filter out questions with 0 material decision change)
    const validGainItems = InformationGainEngine.filterZeroGainQuestions(evaluatedGainItems);
    const gainFilteredScoredCandidates = validGainItems.map((item) => item.scoredQuestion);

    // 6. Select Best Single Question (One Question Policy, Budget, & Information Gain)
    const selectedItem = QuestionSelector.selectBestQuestion(gainFilteredScoredCandidates, session);

    // 7. Collect Inferred Values if Action is INFER
    const inferredValues: InferredCreativeValue[] = [];
    for (const item of rankedCandidates) {
      if (item.action === 'INFER') {
        inferredValues.push({
          dimension: item.question.dimension,
          value: `inferred_${item.question.dimension}`,
          confidence: 0.6,
          source: 'INDUSTRY_KNOWLEDGE_INFERENCE',
        });
      }
    }

    // 8. Determine Final Engine Action
    let finalAction: 'ASK' | 'INFER' | 'SKIP' | 'PROCEED' | 'FALLBACK' = 'SKIP';
    if (selectedItem) {
      finalAction = 'ASK';
    } else if (inferredValues.length > 0) {
      finalAction = 'INFER';
    } else if (sufficiency.sufficient) {
      finalAction = 'PROCEED';
    } else {
      finalAction = 'SKIP';
    }

    // 9. Build Trace & Return Result
    const trace = DynamicQuestionTracer.createTrace({
      state,
      knownDimensions,
      missingDimensions: missingInformation.map((m) => m.dimension),
      candidates: rankedCandidates,
      selected: selectedItem,
      action: finalAction,
      industryKnowledgeVersion: industryContext?.sourceTrace.knowledgeVersion,
    });

    return {
      action: finalAction,
      question: selectedItem?.question,
      inferredValues: inferredValues.length > 0 ? inferredValues : undefined,
      missingInformation,
      sufficiency,
      reasoning: {
        summary: selectedItem
          ? `Selected highest Information Value question '${selectedItem.question.id}' (IV=${selectedItem.informationValue}).`
          : 'No candidate question met the required Information Value threshold for user effort.',
        selectedReason: selectedItem?.question.purpose,
        informationValue: selectedItem?.informationValue,
      },
      trace,
    };
  }

  public static evaluateSufficiency(
    knownContext: ReturnType<typeof CreativeKnowledgeResolver.normalizeContext>,
    _state: CreativeBrainState
  ): CreativeInformationSufficiency {
    // Critical dimensions required for creative opportunity formation
    const hasProduct = Boolean(knownContext['product_name']);
    const hasOffer = Boolean(knownContext['offer']);
    const hasObjective = Boolean(knownContext['campaign_objective']);
    const hasAudience = Boolean(knownContext['audience']);

    const missingHighImpact: string[] = [];
    if (!hasProduct) missingHighImpact.push('product_name');
    if (!hasOffer) missingHighImpact.push('offer');
    if (!hasObjective) missingHighImpact.push('campaign_objective');
    if (!hasAudience) missingHighImpact.push('audience');

    // Sufficient if we have product/offer + objective/business OR product + offer + audience
    const CoreSufficient = hasProduct && (hasOffer || hasObjective);

    if (CoreSufficient && missingHighImpact.length <= 1) {
      return {
        sufficient: true,
        confidence: 0.9,
        missingHighImpactDimensions: missingHighImpact,
        blockingDecisions: [],
        recommendation: 'PROCEED',
      };
    }

    return {
      sufficient: false,
      confidence: 0.5,
      missingHighImpactDimensions: missingHighImpact,
      blockingDecisions: missingHighImpact.map((dim) => `decision_${dim}`),
      recommendation: 'ASK',
    };
  }
}
