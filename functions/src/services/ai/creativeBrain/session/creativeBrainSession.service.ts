import { CreativeBrainSessionSchema } from './creativeBrainSession.schema';
import type {
  CreativeBrainSession,
  CreativeBrainSessionStatus,
  CreativeBrainDerivedInsight,
  MissingCreativeDimension,
  CreativeBrainStateTransition,
  SelectedConceptReference,
  MixedConcept,
  CreativeBrainConfidence,
} from './creativeBrainSession.types';
import type { CreativeAnswer, CreativeBrainState } from '../questions/creativeQuestion.types';
import type { CreativeOpportunity, CreativeConcept, CreativeBlueprint } from '../../creativeBrain.types';
import type { BusinessBrain } from '../../../../types';
import { CreativeOpportunitySchema } from '../../creativeBrain.types';
import {
  MAX_ALTERNATIVE_DIRECTIONS,
  STALE_OPPORTUNITY_MESSAGE,
  StrategicConfirmationError,
  type CampaignCorrection,
  type CorrectionDimension,
  type OpportunityLedgerEntry,
  type StrategicConfirmationActor,
  type StrategicConfirmationEvent,
  type StrategicConfirmationExpectation,
  type StrategicConfirmationState,
} from './strategicConfirmation.types';
import { triageCorrection, type CorrectionTriage } from './strategicConfirmation.correction';
import {
  buildStrategicConfirmationViewModel,
  type StrategicConfirmationViewModel,
} from './strategicConfirmation.viewModel';

export interface CreateSessionParams {
  sessionId?: string;
  businessId: string;
  ownerUserId?: string;
  campaignId?: string;
  industry?: string;
  subIndustry?: string;
  businessBrainVersion?: number;
  businessBrainUpdatedAt?: string;
  initialIntent: CreativeBrainSession['initialIntent'];
}

export interface ResumeSessionResult {
  session: CreativeBrainSession;
  canResume: boolean;
  nextRequiredAction: 'ANSWER_QUESTION' | 'STRATEGIC_CONFIRMATION' | 'SELECT_CONCEPT' | 'EXECUTE_BLUEPRINT' | 'CONTINUE_REASONING' | 'COMPLETED';
  unresolvedDimensions: readonly MissingCreativeDimension[];
  answeredQuestionsCount: number;
  selectedConcept?: SelectedConceptReference;
  mixedConcept?: MixedConcept;
  finalBlueprint?: CreativeBlueprint;
}

/**
 * Creative Brain Session Service
 *
 * Provides persistence, state tracking, answer recording, derived insight management,
 * concept selection, Business Brain reconciliation, and session resumption.
 *
 * Invariant Rules:
 * 1. Business Brain data is NEVER duplicated inside session. Only businessId & reference metadata.
 * 2. Campaign-scoped answers override business context ONLY within campaign scope.
 * 3. Schema validation is strictly enforced on all writes via Zod.
 * 4. All write methods support idempotency.
 */
export class CreativeBrainSessionService {
  private store = new Map<string, CreativeBrainSession>();

  /**
   * Create a new CreativeBrainSession.
   */
  public async createSession(params: CreateSessionParams): Promise<CreativeBrainSession> {
    const now = new Date().toISOString();
    const sessionId = params.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const initialConfidence: CreativeBrainConfidence = {
      overall: 50,
      objective: 100,
      lastUpdatedAt: now,
    };

    const initialTransition: CreativeBrainStateTransition = {
      from: 'INIT' as CreativeBrainState,
      to: 'INIT' as CreativeBrainState,
      reason: 'Session initialized',
      triggeredBy: 'SYSTEM',
      timestamp: now,
    };

    const newSession: CreativeBrainSession = {
      sessionId,
      ownerUserId: params.ownerUserId,
      businessId: params.businessId,
      campaignId: params.campaignId,
      industry: params.industry,
      subIndustry: params.subIndustry,
      businessRef: {
        businessId: params.businessId,
        businessBrainVersion: params.businessBrainVersion,
        businessBrainUpdatedAt: params.businessBrainUpdatedAt || now,
      },
      initialIntent: params.initialIntent,
      answers: [],
      derivedInsights: [],
      missingDimensions: [],
      confidence: initialConfidence,
      currentState: 'INIT' as CreativeBrainState,
      concepts: [],
      status: 'ACTIVE',
      askedQuestionIds: [],
      skippedQuestionIds: [],
      rejectedQuestionIds: [],
      stateHistory: [initialTransition],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const validated = CreativeBrainSessionSchema.parse(newSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Get an existing session by ID.
   */
  public async getSession(sessionId: string): Promise<CreativeBrainSession | null> {
    const session = this.store.get(sessionId);
    return session || null;
  }

  /**
   * Update an existing session object directly. Increments version and updates timestamp.
   */
  public async updateSession(session: CreativeBrainSession): Promise<CreativeBrainSession> {
    const existing = this.store.get(session.sessionId);
    if (!existing) {
      throw new Error(`Session ${session.sessionId} not found`);
    }

    const updated: CreativeBrainSession = {
      ...session,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updated) as unknown as CreativeBrainSession;
    this.store.set(session.sessionId, validated);
    return validated;
  }

  /**
   * Append a user answer to the session.
   * Idempotent: Returns existing session if same questionId and value exist.
   */
  public async appendAnswer(sessionId: string, answer: CreativeAnswer): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const existingAnswer = session.answers.find((a) => a.questionId === answer.questionId);
    if (existingAnswer && JSON.stringify(existingAnswer.rawAnswer) === JSON.stringify(answer.rawAnswer)) {
      // Idempotent hit: exact same answer already recorded
      return session;
    }

    const updatedAnswers = existingAnswer
      ? session.answers.map((a) => (a.questionId === answer.questionId ? answer : a))
      : [...session.answers, answer];

    const askedSet = new Set(session.askedQuestionIds);
    askedSet.add(answer.questionId);

    const now = new Date().toISOString();
    const transition: CreativeBrainStateTransition = {
      from: session.currentState,
      to: session.currentState,
      reason: `Answer recorded for question: ${answer.questionId}`,
      triggeredBy: 'USER_ANSWER',
      timestamp: now,
    };

    const updatedSession: CreativeBrainSession = {
      ...session,
      answers: updatedAnswers,
      askedQuestionIds: Array.from(askedSet),
      stateHistory: [...session.stateHistory, transition],
      status: 'ACTIVE',
      version: session.version + 1,
      updatedAt: now,
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Record or update a derived insight on the session.
   */
  public async recordDerivedInsight(
    sessionId: string,
    insight: Omit<CreativeBrainDerivedInsight, 'createdAt' | 'updatedAt'> | CreativeBrainDerivedInsight
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const now = new Date().toISOString();
    const fullInsight: CreativeBrainDerivedInsight = {
      ...insight,
      createdAt: (insight as CreativeBrainDerivedInsight).createdAt || now,
      updatedAt: now,
    };

    const existingIdx = session.derivedInsights.findIndex((i) => i.id === fullInsight.id || i.dimension === fullInsight.dimension);
    const updatedInsights = existingIdx >= 0
      ? session.derivedInsights.map((item, idx) => (idx === existingIdx ? fullInsight : item))
      : [...session.derivedInsights, fullInsight];

    const updatedSession: CreativeBrainSession = {
      ...session,
      derivedInsights: updatedInsights,
      version: session.version + 1,
      updatedAt: now,
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Record or update a missing creative dimension on the session.
   */
  public async recordMissingDimension(
    sessionId: string,
    dimension: MissingCreativeDimension
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const existingIdx = session.missingDimensions.findIndex((d) => d.dimension === dimension.dimension);
    const updatedDimensions = existingIdx >= 0
      ? session.missingDimensions.map((item, idx) => (idx === existingIdx ? dimension : item))
      : [...session.missingDimensions, dimension];

    const updatedSession: CreativeBrainSession = {
      ...session,
      missingDimensions: updatedDimensions,
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Transition session state.
   */
  public async updateState(
    sessionId: string,
    newState: CreativeBrainState,
    reason: string,
    triggeredBy: CreativeBrainStateTransition['triggeredBy'] = 'SYSTEM'
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.currentState === newState) {
      return session;
    }

    const now = new Date().toISOString();
    const transition: CreativeBrainStateTransition = {
      from: session.currentState,
      to: newState,
      reason,
      triggeredBy,
      timestamp: now,
    };

    let status: CreativeBrainSessionStatus = session.status;
    if (newState === ('CONCEPT_SELECTION' as unknown)) {
      status = 'CONCEPT_SELECTION';
    } else if (newState === ('BLUEPRINT_LOCKED' as unknown)) {
      status = 'BLUEPRINT_LOCKED';
    } else if (newState === ('EXECUTION_READY' as unknown)) {
      status = 'EXECUTION_READY';
    } else if (newState === ('WAITING_FOR_USER' as unknown)) {
      status = 'WAITING_FOR_USER';
    }

    const updatedSession: CreativeBrainSession = {
      ...session,
      currentState: newState,
      status,
      stateHistory: [...session.stateHistory, transition],
      version: session.version + 1,
      updatedAt: now,
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Save creative opportunity.
   */
  public async saveOpportunity(
    sessionId: string,
    opportunity: CreativeOpportunity
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Once a strategic confirmation exists the active opportunity may only change through lockOpportunity /
    // chooseDirection, which keep the ledger and revision honest.
    if (session.strategicConfirmation && session.strategicConfirmation.lockedOpportunityId !== opportunity.opportunityId) {
      throw new StrategicConfirmationError(
        'INVALID_TRANSITION',
        'Use lockOpportunity to replace an opportunity that is under strategic confirmation.'
      );
    }

    const updatedSession: CreativeBrainSession = {
      ...session,
      creativeOpportunity: opportunity,
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Save candidate concepts.
   */
  public async saveConcepts(
    sessionId: string,
    concepts: readonly CreativeConcept[]
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Phase 9 hard gate: with a locked opportunity, concepts are only persisted after confirmation, and only
    // for the confirmed opportunity.
    if (session.creativeOpportunity) {
      this.assertConfirmed(session);
      const confirmedId = session.strategicConfirmation!.lockedOpportunityId;
      if (concepts.some((c) => c.opportunityId !== confirmedId)) {
        throw new StrategicConfirmationError(
          'CONFIRMATION_REQUIRED',
          'Concepts must reference the confirmed opportunity.'
        );
      }
    }

    const updatedSession: CreativeBrainSession = {
      ...session,
      concepts,
      status: 'CONCEPT_SELECTION',
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Select a candidate concept. Idempotent.
   */
  public async selectConcept(
    sessionId: string,
    conceptId: string,
    source: 'USER' | 'SYSTEM' = 'USER'
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.selectedConcept?.conceptId === conceptId && session.selectedConcept.selectionSource === source) {
      return session;
    }

    const selectedRef: SelectedConceptReference = {
      conceptId,
      selectedAt: new Date().toISOString(),
      selectionSource: source,
    };

    const transition: CreativeBrainStateTransition = {
      from: session.currentState,
      to: session.currentState,
      reason: `Concept ${conceptId} selected by ${source}`,
      triggeredBy: 'USER_SELECTION',
      timestamp: new Date().toISOString(),
    };

    const updatedSession: CreativeBrainSession = {
      ...session,
      selectedConcept: selectedRef,
      stateHistory: [...session.stateHistory, transition],
      status: session.finalBlueprint ? 'BLUEPRINT_LOCKED' : 'REFINEMENT',
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Create and record a mixed concept.
   */
  public async createMixedConcept(
    sessionId: string,
    mixedConcept: Omit<MixedConcept, 'createdAt'>
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const fullMixed: MixedConcept = {
      ...mixedConcept,
      createdAt: new Date().toISOString(),
    };

    const updatedSession: CreativeBrainSession = {
      ...session,
      mixedConcept: fullMixed,
      status: 'REFINEMENT',
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Save final creative blueprint.
   */
  public async saveBlueprint(
    sessionId: string,
    blueprint: CreativeBlueprint
  ): Promise<CreativeBrainSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession: CreativeBrainSession = {
      ...session,
      finalBlueprint: blueprint,
      status: 'BLUEPRINT_LOCKED',
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(sessionId, validated);
    return validated;
  }

  /**
   * Reconcile session with updated Business Brain.
   * If Business Brain changed since session start:
   *  - Mark derived insights relying on Business Brain as SUPERSEDED.
   *  - Update businessRef timestamp.
   *  - Leaves Business Brain 100% unmutated.
   */
  public async reconcileSessionWithBusinessBrain(
    sessionIdOrSession: string | CreativeBrainSession,
    businessBrain: BusinessBrain
  ): Promise<CreativeBrainSession> {
    const session = typeof sessionIdOrSession === 'string'
      ? await this.getSession(sessionIdOrSession)
      : sessionIdOrSession;

    if (!session) {
      throw new Error('Session not found for reconciliation');
    }

    const brainUpdatedAt = (businessBrain as any).updatedAt || new Date().toISOString();
    const isBrainUpdated = session.businessRef.businessBrainUpdatedAt !== brainUpdatedAt;

    if (!isBrainUpdated) {
      return session;
    }

    const updatedInsights: CreativeBrainDerivedInsight[] = session.derivedInsights.map((insight) => {
      if (insight.source === 'BUSINESS_BRAIN') {
        return {
          ...insight,
          status: 'SUPERSEDED' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return insight;
    });

    const updatedSession: CreativeBrainSession = {
      ...session,
      businessRef: {
        ...session.businessRef,
        businessBrainUpdatedAt: brainUpdatedAt,
      },
      derivedInsights: updatedInsights,
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = CreativeBrainSessionSchema.parse(updatedSession) as unknown as CreativeBrainSession;
    this.store.set(session.sessionId, validated);
    return validated;
  }

  /**
   * Resume an interrupted campaign session.
   * Evaluates state, missing dimensions, and next required action.
   */
  public async resumeSession(sessionId: string): Promise<ResumeSessionResult> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const unresolvedDimensions = session.missingDimensions.filter(
      (d) => d.recommendedAction === 'ASK' || d.state === 'UNKNOWN' || d.state === 'CONFLICTING'
    );

    let nextRequiredAction: ResumeSessionResult['nextRequiredAction'] = 'CONTINUE_REASONING';

    const confirmation = session.strategicConfirmation;
    if (session.finalBlueprint) {
      nextRequiredAction = 'EXECUTE_BLUEPRINT';
    } else if (session.creativeOpportunity && confirmation && confirmation.status !== 'CONFIRMED') {
      nextRequiredAction = 'STRATEGIC_CONFIRMATION';
    } else if (session.selectedConcept || session.mixedConcept) {
      nextRequiredAction = 'CONTINUE_REASONING';
    } else if (session.concepts && session.concepts.length > 0) {
      nextRequiredAction = 'SELECT_CONCEPT';
    } else if (unresolvedDimensions.length > 0 && session.status === 'WAITING_FOR_USER') {
      nextRequiredAction = 'ANSWER_QUESTION';
    } else if (session.status === 'COMPLETED') {
      nextRequiredAction = 'COMPLETED';
    }

    return {
      session,
      canResume: session.status !== 'ABANDONED' && session.status !== 'FAILED',
      nextRequiredAction,
      unresolvedDimensions,
      answeredQuestionsCount: session.answers.length,
      selectedConcept: session.selectedConcept,
      mixedConcept: session.mixedConcept,
      finalBlueprint: session.finalBlueprint,
    };
  }

  // ==========================================================================
  // PHASE 9 — STRATEGIC CONFIRMATION
  //
  // Invariant: no concept generation until the user has confirmed the locked opportunity. Enforced here (and in
  // saveConcepts / beginConceptGeneration), never only in the UI. The server re-validates ownership, campaign,
  // opportunity id and revision on every action; the client is trusted for none of them.
  // ==========================================================================

  private requireConfirmationSession(
    sessionId: string,
    actor: StrategicConfirmationActor
  ): { session: CreativeBrainSession; confirmation: StrategicConfirmationState } {
    const session = this.store.get(sessionId);
    if (!session) {
      throw new StrategicConfirmationError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }
    if (!session.ownerUserId || session.ownerUserId !== actor.userId) {
      throw new StrategicConfirmationError('FORBIDDEN', 'Session does not belong to this user.');
    }
    if (actor.campaignId && actor.campaignId !== session.campaignId) {
      throw new StrategicConfirmationError('CAMPAIGN_MISMATCH', 'Session does not belong to this campaign.');
    }
    const confirmation = session.strategicConfirmation;
    if (!session.creativeOpportunity || !confirmation) {
      throw new StrategicConfirmationError('NO_LOCKED_OPPORTUNITY', 'No locked opportunity to confirm.');
    }
    return { session, confirmation };
  }

  private assertFresh(
    session: CreativeBrainSession,
    confirmation: StrategicConfirmationState,
    expected: StrategicConfirmationExpectation
  ): void {
    if (
      expected.opportunityId !== confirmation.lockedOpportunityId ||
      expected.opportunityRevision !== confirmation.opportunityRevision ||
      session.creativeOpportunity?.opportunityId !== confirmation.lockedOpportunityId
    ) {
      throw new StrategicConfirmationError('STALE_OPPORTUNITY', STALE_OPPORTUNITY_MESSAGE);
    }
  }

  private assertConfirmed(session: CreativeBrainSession): void {
    const confirmation = session.strategicConfirmation;
    if (
      !confirmation ||
      confirmation.status !== 'CONFIRMED' ||
      confirmation.recomputeRequired ||
      session.creativeOpportunity?.opportunityId !== confirmation.lockedOpportunityId
    ) {
      throw new StrategicConfirmationError(
        'CONFIRMATION_REQUIRED',
        'The strategic direction has not been confirmed; concept generation is blocked.'
      );
    }
  }

  private commitConfirmation(
    session: CreativeBrainSession,
    confirmation: StrategicConfirmationState,
    extra: Partial<CreativeBrainSession> = {},
    transition?: { to: CreativeBrainState; reason: string; triggeredBy: CreativeBrainStateTransition['triggeredBy'] }
  ): CreativeBrainSession {
    const now = new Date().toISOString();
    const history = transition
      ? [
          ...session.stateHistory,
          {
            from: session.currentState,
            to: transition.to,
            reason: transition.reason,
            triggeredBy: transition.triggeredBy,
            timestamp: now,
          } satisfies CreativeBrainStateTransition,
        ]
      : session.stateHistory;

    const updated: CreativeBrainSession = {
      ...session,
      ...extra,
      currentState: transition?.to ?? session.currentState,
      stateHistory: history,
      strategicConfirmation: confirmation,
      version: session.version + 1,
      updatedAt: now,
    };
    const validated = CreativeBrainSessionSchema.parse(updated) as unknown as CreativeBrainSession;
    this.store.set(session.sessionId, validated);
    return validated;
  }

  private newEvent(
    session: CreativeBrainSession,
    confirmation: StrategicConfirmationState,
    action: StrategicConfirmationEvent['action'],
    actor: StrategicConfirmationActor,
    metadata: Omit<NonNullable<StrategicConfirmationEvent['metadata']>, 'source'> = {}
  ): StrategicConfirmationEvent {
    return {
      id: `sce_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId: session.campaignId,
      sessionId: session.sessionId,
      opportunityId: confirmation.lockedOpportunityId,
      opportunityRevision: confirmation.opportunityRevision,
      action,
      createdAt: new Date().toISOString(),
      metadata: { source: actor.source ?? 'USER', ...metadata },
    };
  }

  private validateOpportunity(opportunity: CreativeOpportunity): void {
    if (!CreativeOpportunitySchema.safeParse(opportunity).success) {
      throw new StrategicConfirmationError('MALFORMED_OPPORTUNITY', 'The opportunity failed schema validation.');
    }
    buildStrategicConfirmationViewModel(opportunity); // throws MALFORMED_OPPORTUNITY on a missing statement
  }

  /**
   * Lock an opportunity for confirmation (or replace the active one after a material correction / chosen
   * alternative). Idempotent for the same opportunityId: a refresh or retry never regenerates or re-versions it.
   * A replaced opportunity is kept in the ledger as SUPERSEDED, never mutated.
   */
  public async lockOpportunity(
    sessionId: string,
    opportunity: CreativeOpportunity,
    actor: StrategicConfirmationActor
  ): Promise<CreativeBrainSession> {
    const session = this.store.get(sessionId);
    if (!session) throw new StrategicConfirmationError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    if (!session.ownerUserId || session.ownerUserId !== actor.userId) {
      throw new StrategicConfirmationError('FORBIDDEN', 'Session does not belong to this user.');
    }
    if (actor.campaignId && actor.campaignId !== session.campaignId) {
      throw new StrategicConfirmationError('CAMPAIGN_MISMATCH', 'Session does not belong to this campaign.');
    }
    this.validateOpportunity(opportunity);

    const existing = session.strategicConfirmation;
    if (existing?.lockedOpportunityId === opportunity.opportunityId) return session;
    if (existing?.ledger.some((e) => e.opportunity.opportunityId === opportunity.opportunityId)) {
      throw new StrategicConfirmationError(
        'INVALID_TRANSITION',
        'This opportunity was already used in this session; use chooseDirection to return to it.'
      );
    }

    const now = new Date().toISOString();
    const superseded: OpportunityLedgerEntry[] = (existing?.ledger ?? []).map((entry) =>
      entry.role === 'SUPERSEDED'
        ? entry
        : {
            ...entry,
            role: 'SUPERSEDED' as const,
            supersededAt: now,
            supersededReason: `Replaced by ${opportunity.opportunityId}`,
          }
    );

    const confirmation: StrategicConfirmationState = {
      status: 'PENDING',
      lockedOpportunityId: opportunity.opportunityId,
      opportunityRevision: (existing?.opportunityRevision ?? 0) + 1,
      events: existing?.events ?? [],
      corrections: existing?.corrections ?? [],
      ledger: [...superseded, { opportunity, role: 'ACTIVE', recordedAt: now }],
    };

    return this.commitConfirmation(
      session,
      confirmation,
      {
        creativeOpportunity: opportunity,
        // Concepts and selections belonged to the superseded opportunity.
        concepts: [],
        selectedConcept: undefined,
        mixedConcept: undefined,
        status: 'WAITING_FOR_USER',
      },
      { to: 'OPPORTUNITY', reason: `Opportunity ${opportunity.opportunityId} locked; awaiting strategic confirmation`, triggeredBy: 'SYSTEM' }
    );
  }

  /** What the "Here's what I understood" screen renders. Re-opening it after a refresh returns the same opportunity. */
  public async getStrategicConfirmation(
    sessionId: string,
    actor: StrategicConfirmationActor
  ): Promise<{
    viewModel: StrategicConfirmationViewModel;
    expectation: StrategicConfirmationExpectation;
    status: StrategicConfirmationState['status'];
    alternatives: StrategicConfirmationViewModel[];
  }> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    return {
      viewModel: buildStrategicConfirmationViewModel(session.creativeOpportunity),
      expectation: {
        opportunityId: confirmation.lockedOpportunityId,
        opportunityRevision: confirmation.opportunityRevision,
      },
      status: confirmation.status,
      alternatives: confirmation.ledger
        .filter((e) => e.role === 'ALTERNATIVE')
        .map((e) => buildStrategicConfirmationViewModel(e.opportunity)),
    };
  }

  /** "That's right". Idempotent: a second call returns the existing confirmation without a second event. */
  public async confirmStrategy(
    sessionId: string,
    expected: StrategicConfirmationExpectation,
    actor: StrategicConfirmationActor
  ): Promise<{ session: CreativeBrainSession; alreadyConfirmed: boolean }> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    this.assertFresh(session, confirmation, expected);

    if (confirmation.status === 'CONFIRMED') return { session, alreadyConfirmed: true };
    if (confirmation.status === 'CHANGE_REQUESTED' || confirmation.recomputeRequired) {
      throw new StrategicConfirmationError(
        'INVALID_TRANSITION',
        'A correction is waiting to be applied; the strategy must be re-evaluated before it can be confirmed.'
      );
    }

    const event = this.newEvent(session, confirmation, 'CONFIRMED', actor);
    const now = event.createdAt;
    const updated = this.commitConfirmation(
      session,
      {
        ...confirmation,
        status: 'CONFIRMED',
        events: [...confirmation.events, event],
        confirmedAt: now,
        confirmedEventId: event.id,
      },
      { status: 'ACTIVE' },
      { to: 'CONCEPT_GENERATION', reason: `Strategy ${confirmation.lockedOpportunityId} confirmed by user`, triggeredBy: 'USER_SELECTION' }
    );
    return { session: updated, alreadyConfirmed: false };
  }

  /**
   * "Change something". Never edits Business Brain facts: a price/fact claim the authority does not back is
   * routed to the existing Business Brain correction path and leaves the campaign context untouched.
   * Material corrections are recorded as campaign-level learning and flag the opportunity for re-evaluation
   * (the caller re-runs the existing Opportunity Engine and calls lockOpportunity). Cosmetic ones do not.
   */
  public async requestChange(
    sessionId: string,
    expected: StrategicConfirmationExpectation,
    correction: { dimension: CorrectionDimension; text: string; knownPrices?: readonly number[] },
    actor: StrategicConfirmationActor
  ): Promise<{
    session: CreativeBrainSession;
    outcome: 'RECOMPUTE_REQUIRED' | 'COSMETIC_NOTED' | 'BUSINESS_FACT_CONFLICT';
    triage: CorrectionTriage;
  }> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    this.assertFresh(session, confirmation, expected);
    this.assertNoConceptsStarted(confirmation);

    const text = correction.text.trim();
    if (!text || text.length > 1000) {
      throw new StrategicConfirmationError('INVALID_TRANSITION', 'A correction must be 1–1000 characters.');
    }

    const triage = triageCorrection(correction.dimension, text, { knownPrices: correction.knownPrices });

    if (triage.businessFactConflict) {
      const event = this.newEvent(session, confirmation, 'REQUESTED_CHANGE', actor, {
        dimension: correction.dimension,
        routedTo: 'BUSINESS_BRAIN_CORRECTION',
      });
      const updated = this.commitConfirmation(session, { ...confirmation, events: [...confirmation.events, event] });
      return { session: updated, outcome: 'BUSINESS_FACT_CONFLICT', triage };
    }

    const event = this.newEvent(session, confirmation, 'REQUESTED_CHANGE', actor, { dimension: correction.dimension });
    const record: CampaignCorrection = {
      id: `corr_${event.id}`,
      opportunityId: confirmation.lockedOpportunityId,
      dimension: correction.dimension,
      text,
      materiality: triage.materiality,
      affectedDimensions: triage.affectedDimensions,
      createdAt: event.createdAt,
    };

    if (triage.materiality === 'COSMETIC') {
      const updated = this.commitConfirmation(session, {
        ...confirmation,
        events: [...confirmation.events, event],
        corrections: [...confirmation.corrections, record],
      });
      return { session: updated, outcome: 'COSMETIC_NOTED', triage };
    }

    const { confirmedAt: _a, confirmedEventId: _b, ...unconfirmed } = confirmation;
    const updated = this.commitConfirmation(
      session,
      {
        ...unconfirmed,
        status: 'CHANGE_REQUESTED',
        events: [...confirmation.events, event],
        corrections: [...confirmation.corrections, record],
        recomputeRequired: { affectedDimensions: triage.affectedDimensions },
      },
      { status: 'WAITING_FOR_USER' },
      { to: 'OPPORTUNITY', reason: `User correction (${correction.dimension}) requires strategic re-evaluation`, triggeredBy: 'USER_ANSWER' }
    );
    return { session: updated, outcome: 'RECOMPUTE_REQUIRED', triage };
  }

  /** "Let's explore another direction". Preserves the current opportunity; no concepts are generated. */
  public async requestAlternative(
    sessionId: string,
    expected: StrategicConfirmationExpectation,
    actor: StrategicConfirmationActor
  ): Promise<CreativeBrainSession> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    this.assertFresh(session, confirmation, expected);
    this.assertNoConceptsStarted(confirmation);
    if (confirmation.status === 'ALTERNATIVE_REQUESTED') return session;
    if (confirmation.recomputeRequired) {
      throw new StrategicConfirmationError('INVALID_TRANSITION', 'Re-evaluate the corrected strategy first.');
    }

    const event = this.newEvent(session, confirmation, 'EXPLORE_ALTERNATIVE', actor);
    const { confirmedAt: _a, confirmedEventId: _b, ...unconfirmed } = confirmation;
    return this.commitConfirmation(
      session,
      { ...unconfirmed, status: 'ALTERNATIVE_REQUESTED', events: [...confirmation.events, event] },
      { status: 'WAITING_FOR_USER' }
    );
  }

  /**
   * Attach an alternative opportunity produced by the existing Opportunity Engine. It gets its own id, is held
   * beside the active opportunity (which stays untouched), and is capped at MAX_ALTERNATIVE_DIRECTIONS.
   */
  public async registerAlternative(
    sessionId: string,
    expected: StrategicConfirmationExpectation,
    alternative: CreativeOpportunity,
    actor: StrategicConfirmationActor
  ): Promise<CreativeBrainSession> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    this.assertFresh(session, confirmation, expected);
    if (confirmation.status !== 'ALTERNATIVE_REQUESTED') {
      throw new StrategicConfirmationError('INVALID_TRANSITION', 'No alternative direction was requested.');
    }
    this.validateOpportunity(alternative);

    if (confirmation.ledger.some((e) => e.opportunity.opportunityId === alternative.opportunityId)) {
      const existing = confirmation.ledger.find((e) => e.opportunity.opportunityId === alternative.opportunityId);
      if (existing?.role === 'ALTERNATIVE') return session; // idempotent retry
      throw new StrategicConfirmationError('INVALID_TRANSITION', 'An alternative must have its own opportunityId.');
    }
    if (confirmation.ledger.filter((e) => e.role === 'ALTERNATIVE').length >= MAX_ALTERNATIVE_DIRECTIONS) {
      throw new StrategicConfirmationError('ALTERNATIVE_LIMIT', 'Alternative direction limit reached.');
    }

    return this.commitConfirmation(session, {
      ...confirmation,
      ledger: [
        ...confirmation.ledger,
        { opportunity: alternative, role: 'ALTERNATIVE', recordedAt: new Date().toISOString() },
      ],
    });
  }

  /**
   * The user picks A (current) or an alternative. Choosing an alternative supersedes A in the ledger and bumps the
   * revision; either way confirmation is required again before any concept is generated.
   */
  public async chooseDirection(
    sessionId: string,
    expected: StrategicConfirmationExpectation,
    selectedOpportunityId: string,
    actor: StrategicConfirmationActor
  ): Promise<CreativeBrainSession> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    this.assertFresh(session, confirmation, expected);
    if (confirmation.status !== 'ALTERNATIVE_REQUESTED') {
      throw new StrategicConfirmationError('INVALID_TRANSITION', 'No alternative direction is being compared.');
    }

    const event = this.newEvent(session, confirmation, 'DIRECTION_SELECTED', actor, { selectedOpportunityId });

    if (selectedOpportunityId === confirmation.lockedOpportunityId) {
      return this.commitConfirmation(
        session,
        { ...confirmation, status: 'PENDING', events: [...confirmation.events, event] },
        { status: 'WAITING_FOR_USER' }
      );
    }

    const chosen = confirmation.ledger.find(
      (e) => e.role === 'ALTERNATIVE' && e.opportunity.opportunityId === selectedOpportunityId
    );
    if (!chosen) {
      throw new StrategicConfirmationError('INVALID_TRANSITION', 'That direction is not one of the options.');
    }

    const now = event.createdAt;
    const ledger: OpportunityLedgerEntry[] = confirmation.ledger.map((entry) => {
      if (entry.opportunity.opportunityId === selectedOpportunityId) return { ...entry, role: 'ACTIVE' as const };
      if (entry.role === 'SUPERSEDED') return entry;
      return {
        ...entry,
        role: 'SUPERSEDED' as const,
        supersededAt: now,
        supersededReason:
          entry.role === 'ACTIVE' ? `Alternative ${selectedOpportunityId} selected` : 'Alternative not selected',
      };
    });

    return this.commitConfirmation(
      session,
      {
        ...confirmation,
        status: 'PENDING',
        lockedOpportunityId: selectedOpportunityId,
        opportunityRevision: confirmation.opportunityRevision + 1,
        events: [...confirmation.events, event],
        ledger,
      },
      { creativeOpportunity: chosen.opportunity, status: 'WAITING_FOR_USER' },
      { to: 'OPPORTUNITY', reason: `Direction ${selectedOpportunityId} selected; awaiting strategic confirmation`, triggeredBy: 'USER_SELECTION' }
    );
  }

  private assertNoConceptsStarted(confirmation: StrategicConfirmationState): void {
    if (confirmation.conceptGenerationStartedAt) {
      throw new StrategicConfirmationError(
        'INVALID_TRANSITION',
        'Concept generation has already started for the confirmed strategy.'
      );
    }
  }

  /** Orchestration gate: throws unless the active opportunity is locked AND confirmed. Never touches credits. */
  public async assertConceptGenerationAllowed(
    sessionId: string,
    actor: StrategicConfirmationActor
  ): Promise<CreativeOpportunity> {
    const { session } = this.requireConfirmationSession(sessionId, actor);
    this.assertConfirmed(session);
    return session.creativeOpportunity as CreativeOpportunity;
  }

  /**
   * Claim the single concept-generation run for the confirmed opportunity. A second claim (double click, retry,
   * stale tab) is told `alreadyStarted` and must not generate again.
   */
  public async beginConceptGeneration(
    sessionId: string,
    actor: StrategicConfirmationActor
  ): Promise<{ session: CreativeBrainSession; opportunity: CreativeOpportunity; alreadyStarted: boolean }> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    this.assertConfirmed(session);
    const opportunity = session.creativeOpportunity as CreativeOpportunity;
    if (confirmation.conceptGenerationStartedAt) return { session, opportunity, alreadyStarted: true };

    const claimed = this.commitConfirmation(session, {
      ...confirmation,
      conceptGenerationStartedAt: new Date().toISOString(),
    });
    return { session: claimed, opportunity, alreadyStarted: false };
  }

  /** Release the claim after a failed run that produced no concepts, so a retry is possible. */
  public async releaseConceptGeneration(
    sessionId: string,
    actor: StrategicConfirmationActor
  ): Promise<CreativeBrainSession> {
    const { session, confirmation } = this.requireConfirmationSession(sessionId, actor);
    if (session.concepts.length > 0 || !confirmation.conceptGenerationStartedAt) return session;
    const { conceptGenerationStartedAt: _c, ...released } = confirmation;
    return this.commitConfirmation(session, released);
  }

  /** Campaign-level corrections (never Business Brain knowledge) to feed the next opportunity evaluation. */
  public getCampaignCorrections(session: CreativeBrainSession): readonly CampaignCorrection[] {
    return session.strategicConfirmation?.corrections ?? [];
  }

  /**
   * Clear in-memory session store (used for unit testing).
   */
  public clearStore(): void {
    this.store.clear();
  }
}

export const creativeBrainSessionService = new CreativeBrainSessionService();
