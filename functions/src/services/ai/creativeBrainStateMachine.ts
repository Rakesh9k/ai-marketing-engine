import { getVerticalConfigOrDefault, type VerticalConfig } from '../../config/verticals';
import type { CreativeBrainInput } from './creativeBrain.types';

export type KnowledgeResolutionStatus = 'COMPLETE' | 'INFERRED' | 'MISSING' | 'INSUFFICIENT';

export interface KnowledgeResolutionNode {
  readonly id: string;
  readonly label: string;
  readonly status: KnowledgeResolutionStatus;
  readonly materialityScore: number; // 0 to 100 — degree to which missing data impacts creative quality
  readonly source?: string;
  readonly details?: string;
}

export interface KnowledgeResolutionAudit {
  readonly nodes: readonly KnowledgeResolutionNode[];
  readonly overallCompleteness: number; // 0 to 100
  readonly highestMaterialityMissingNode?: KnowledgeResolutionNode;
  readonly sufficientForDirectGeneration: boolean;
}

export type CreativeBrainState =
  | 'INITIAL'
  | 'KNOWLEDGE_AUDIT'
  | 'CUSTOMER_INSIGHT_RESOLUTION'
  | 'OPPORTUNITY_FORMATION'
  | 'CONCEPT_GENERATION'
  | 'CONCEPT_EVALUATION'
  | 'BLUEPRINT_EMISSION';

export interface StateMachineTransitionLog {
  readonly fromState: CreativeBrainState;
  readonly toState: CreativeBrainState;
  readonly reason: string;
  readonly evaluatedNodeId?: string;
  readonly timestamp: string;
}

/**
 * Creative Brain Knowledge-Resolution State Machine
 *
 * Core Architectural Principle:
 * - State Machine decides WHAT IS NEEDED NEXT (materiality-driven transition)
 * - Reasoning Engines decide HOW TO UNDERSTAND IT
 * - Vertical Adaptation is driven by VerticalConfig (dimension weights & CTA rules) rather than separate vertical subclasses
 * - Mitra NEVER asks a question simply because a questionnaire step exists; it resolves only when missing info materially affects creative output.
 */
export class CreativeBrainStateMachine {
  private currentState: CreativeBrainState = 'INITIAL';
  private transitionLogs: StateMachineTransitionLog[] = [];
  private verticalConfig: VerticalConfig;

  constructor(private readonly input: CreativeBrainInput) {
    this.verticalConfig = getVerticalConfigOrDefault(input.vertical);
  }

  public getCurrentState(): CreativeBrainState {
    return this.currentState;
  }

  public getTransitionLogs(): readonly StateMachineTransitionLog[] {
    return this.transitionLogs;
  }

  public getVerticalConfig(): VerticalConfig {
    return this.verticalConfig;
  }

  /**
   * Audits the input context against a Knowledge-Resolution Graph.
   */
  public auditKnowledge(): KnowledgeResolutionAudit {
    const nodes: KnowledgeResolutionNode[] = [];

    // 1. Business & Product Identity
    const hasProduct = Boolean(
      this.input.productContext?.name ||
      this.input.intent.offer.headline ||
      this.input.productUnderstanding?.productSummary
    );
    nodes.push({
      id: 'product_identity',
      label: 'Product / Service Identity',
      status: hasProduct ? 'COMPLETE' : 'MISSING',
      materialityScore: hasProduct ? 0 : 95,
      source: hasProduct ? 'catalog_or_intent' : undefined,
      details: hasProduct ? `Product: ${this.input.productContext?.name || this.input.intent.offer.headline}` : 'Product identity missing',
    });

    // 2. Offer Contract & Pricing Fidelity
    const hasOffer = Boolean(this.input.intent.offer.headline && this.input.intent.offer.price >= 0);
    nodes.push({
      id: 'offer_contract',
      label: 'Offer Contract & Pricing',
      status: hasOffer ? 'COMPLETE' : 'INSUFFICIENT',
      materialityScore: hasOffer ? 0 : 90,
      source: 'campaign_intent',
      details: `Offer: ${this.input.intent.offer.headline} @ ₹${this.input.intent.offer.price}`,
    });

    // 3. Audience Profile & Locality
    const localities = this.input.intent.audience.localities || [];
    const hasAudience = localities.length > 0 || Boolean(this.input.businessBrain.audience?.targetCustomer);
    nodes.push({
      id: 'audience_profile',
      label: 'Target Audience & Locality',
      status: hasAudience ? 'COMPLETE' : 'INFERRED',
      materialityScore: hasAudience ? 0 : 60,
      source: localities.length > 0 ? 'campaign_intent' : 'business_brain',
      details: localities.length > 0 ? `Localities: ${localities.join(', ')}` : 'Inferred general local audience',
    });

    // 4. Customer Motivation & Tension
    const hasExplicitMotivation = Boolean(
      this.input.businessBrain.audience?.preferences ||
      this.input.intent.audience.occasion ||
      this.input.productUnderstanding?.marketingAngles?.length
    );
    nodes.push({
      id: 'customer_motivation',
      label: 'Customer Motivation & Tension',
      status: hasExplicitMotivation ? 'INFERRED' : 'MISSING',
      materialityScore: hasExplicitMotivation ? 20 : 75,
      source: hasExplicitMotivation ? 'product_understanding' : undefined,
      details: hasExplicitMotivation ? 'Derived from marketing angles & occasion' : 'Missing explicit customer tension',
    });

    // 5. Objective & CTA Compliance
    const allowedCTAs = this.verticalConfig.allowedCTAs;
    const isCTAValid = allowedCTAs.includes(this.input.intent.cta);
    nodes.push({
      id: 'objective_cta',
      label: 'Objective & Vertical CTA Compliance',
      status: isCTAValid ? 'COMPLETE' : 'INSUFFICIENT',
      materialityScore: isCTAValid ? 0 : 100, // Highest materiality: factual CTA violation
      source: 'vertical_config',
      details: `CTA ${this.input.intent.cta} is ${isCTAValid ? 'valid' : 'INVALID'} for vertical ${this.input.vertical}`,
    });

    // Overall Completeness Score
    const totalScore = nodes.reduce((sum, n) => sum + (n.status === 'COMPLETE' ? 20 : n.status === 'INFERRED' ? 15 : 0), 0);
    const missingNodes = nodes.filter((n) => n.materialityScore > 30).sort((a, b) => b.materialityScore - a.materialityScore);

    return {
      nodes,
      overallCompleteness: totalScore,
      highestMaterialityMissingNode: missingNodes[0],
      sufficientForDirectGeneration: missingNodes.length === 0,
    };
  }

  /**
   * Advances the State Machine to the next necessary state.
   */
  public determineNextState(audit: KnowledgeResolutionAudit): CreativeBrainState {
    if (this.currentState === 'INITIAL') {
      this.transitionTo('KNOWLEDGE_AUDIT', 'Initiated knowledge audit of Business Brain and Campaign Intent');
      return this.currentState;
    }

    if (this.currentState === 'KNOWLEDGE_AUDIT') {
      if (audit.highestMaterialityMissingNode && audit.highestMaterialityMissingNode.id === 'customer_motivation') {
        this.transitionTo('CUSTOMER_INSIGHT_RESOLUTION', 'Customer motivation missing; resolving customer insight from business context');
        return this.currentState;
      }
      this.transitionTo('OPPORTUNITY_FORMATION', 'Knowledge context sufficient; advancing to Opportunity Formation');
      return this.currentState;
    }

    if (this.currentState === 'CUSTOMER_INSIGHT_RESOLUTION') {
      this.transitionTo('OPPORTUNITY_FORMATION', 'Customer insight resolved; advancing to Opportunity Formation');
      return this.currentState;
    }

    if (this.currentState === 'OPPORTUNITY_FORMATION') {
      this.transitionTo('CONCEPT_GENERATION', 'Opportunity formed; advancing to Candidate Concept Generation');
      return this.currentState;
    }

    if (this.currentState === 'CONCEPT_GENERATION') {
      this.transitionTo('CONCEPT_EVALUATION', 'Candidates generated; advancing to 5-Dimension Concept Evaluation');
      return this.currentState;
    }

    if (this.currentState === 'CONCEPT_EVALUATION') {
      this.transitionTo('BLUEPRINT_EMISSION', 'Winner selected; emitting final Creative Blueprint');
      return this.currentState;
    }

    return this.currentState;
  }

  private transitionTo(nextState: CreativeBrainState, reason: string, evaluatedNodeId?: string): void {
    const log: StateMachineTransitionLog = {
      fromState: this.currentState,
      toState: nextState,
      reason,
      evaluatedNodeId,
      timestamp: new Date().toISOString(),
    };
    this.transitionLogs.push(log);
    this.currentState = nextState;
  }
}
