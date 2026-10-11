/**
 * PHASE 23 — Creative UX Master Service Facade
 * Public API facade for Creative Brain Progressive Disclosure UX.
 * Provides intuitive session lifecycle methods for clients and API endpoints.
 */

import { ProgressiveUXOrchestrator } from './progressiveUXOrchestrator';
import type { BusinessContextPayload } from './uxQuestionComposer';
import type {
  CreativeUXState,
  CreativeUXAnswer,
  ConceptMixComponentSelection,
} from './creativeUX.types';

export class CreativeUXService {
  private orchestrator: ProgressiveUXOrchestrator;

  constructor(orchestrator?: ProgressiveUXOrchestrator) {
    this.orchestrator = orchestrator || new ProgressiveUXOrchestrator();
  }

  /**
   * Register business context payload (e.g. from Business Brain).
   */
  public registerBusinessContext(context: BusinessContextPayload): void {
    this.orchestrator.registerBusinessContext(context);
  }

  /**
   * Start a new progressive disclosure creative session.
   */
  public startSession(
    tenantId: string,
    businessId: string,
    initialPrompt?: string,
    customContext?: Partial<BusinessContextPayload>
  ): CreativeUXState {
    return this.orchestrator.startSession(tenantId, businessId, initialPrompt, customContext);
  }

  /**
   * Retrieve active state for a session.
   */
  public getSessionState(sessionId: string): CreativeUXState | undefined {
    return this.orchestrator.getSessionState(sessionId);
  }

  /**
   * Answer a stage question in the current session.
   */
  public answerQuestion(sessionId: string, answer: CreativeUXAnswer): CreativeUXState {
    return this.orchestrator.answerQuestion(sessionId, answer);
  }

  /**
   * Confirm or adjust the synthesized strategic opportunity.
   */
  public confirmOpportunity(
    sessionId: string,
    approved: boolean,
    adjustments?: string
  ): CreativeUXState {
    return this.orchestrator.confirmOpportunity(sessionId, approved, adjustments);
  }

  /**
   * Select a candidate concept.
   */
  public selectConcept(sessionId: string, conceptId: string): CreativeUXState {
    return this.orchestrator.selectConcept(sessionId, conceptId);
  }

  /**
   * Perform concept mixing across candidate concepts.
   */
  public mixConcepts(
    sessionId: string,
    selections: ConceptMixComponentSelection[]
  ): CreativeUXState {
    return this.orchestrator.mixConcepts(sessionId, selections);
  }

  /**
   * Approve final Creative Blueprint and initiate execution handoff.
   */
  public approveBlueprint(sessionId: string): CreativeUXState {
    return this.orchestrator.approveBlueprint(sessionId);
  }
}
