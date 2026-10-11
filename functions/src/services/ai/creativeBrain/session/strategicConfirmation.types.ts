import type { CreativeOpportunity } from '../../creativeBrain.types';

// ============================================================================
// PHASE 9 — STRATEGIC CONFIRMATION
//
// A human confirmation boundary around an already-locked Phase 8 CreativeOpportunity.
// It lives INSIDE the Phase 7 CreativeBrainSession (no second session/document) and is a
// sub-state of the canonical `OPPORTUNITY` state (no new top-level state).
// ============================================================================

export type StrategicConfirmationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHANGE_REQUESTED'
  | 'ALTERNATIVE_REQUESTED';

export type StrategicConfirmationAction =
  | 'CONFIRMED'
  | 'REQUESTED_CHANGE'
  | 'EXPLORE_ALTERNATIVE'
  | 'DIRECTION_SELECTED';

/** The part of the opportunity the user says is wrong. `wording` is purely cosmetic. */
export type CorrectionDimension =
  | 'audience'
  | 'objective'
  | 'offer'
  | 'direction'
  | 'wording'
  | 'other';

export type CorrectionMateriality = 'MATERIAL' | 'COSMETIC';

export interface StrategicConfirmationEvent {
  readonly id: string;
  readonly campaignId?: string;
  readonly sessionId: string;
  readonly opportunityId: string;
  readonly opportunityRevision: number;
  readonly action: StrategicConfirmationAction;
  readonly createdAt: string;
  readonly metadata?: {
    readonly source?: string;
    readonly dimension?: CorrectionDimension;
    readonly routedTo?: 'BUSINESS_BRAIN_CORRECTION';
    readonly selectedOpportunityId?: string;
  };
}

export interface CampaignCorrection {
  readonly id: string;
  readonly opportunityId: string;
  readonly dimension: CorrectionDimension;
  readonly text: string;
  readonly materiality: CorrectionMateriality;
  readonly affectedDimensions: readonly string[];
  readonly createdAt: string;
}

export type OpportunityLedgerRole = 'ACTIVE' | 'ALTERNATIVE' | 'SUPERSEDED';

/** Every opportunity the session has held, so "why did Mitra make this campaign?" stays answerable. */
export interface OpportunityLedgerEntry {
  readonly opportunity: CreativeOpportunity;
  readonly role: OpportunityLedgerRole;
  readonly recordedAt: string;
  readonly supersededAt?: string;
  readonly supersededReason?: string;
}

export interface StrategicConfirmationState {
  readonly status: StrategicConfirmationStatus;
  readonly lockedOpportunityId: string;
  /** Incremented every time the active opportunity changes. Guards stale tabs / stale requests. */
  readonly opportunityRevision: number;
  readonly events: readonly StrategicConfirmationEvent[];
  readonly corrections: readonly CampaignCorrection[];
  readonly ledger: readonly OpportunityLedgerEntry[];
  readonly confirmedAt?: string;
  readonly confirmedEventId?: string;
  /** Set when a material correction needs the existing Opportunity Engine to re-run. */
  readonly recomputeRequired?: { readonly affectedDimensions: readonly string[] };
  /** Idempotency claim: concept generation for the confirmed opportunity has started. */
  readonly conceptGenerationStartedAt?: string;
}

/** What the client must echo back so the server can detect a stale screen. */
export interface StrategicConfirmationExpectation {
  readonly opportunityId: string;
  readonly opportunityRevision: number;
}

export interface StrategicConfirmationActor {
  readonly userId: string;
  readonly campaignId?: string;
  readonly source?: string;
}

export type StrategicConfirmationErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'FORBIDDEN'
  | 'CAMPAIGN_MISMATCH'
  | 'NO_LOCKED_OPPORTUNITY'
  | 'MALFORMED_OPPORTUNITY'
  | 'STALE_OPPORTUNITY'
  | 'CONFIRMATION_REQUIRED'
  | 'INVALID_TRANSITION'
  | 'ALTERNATIVE_LIMIT';

export class StrategicConfirmationError extends Error {
  constructor(
    public readonly code: StrategicConfirmationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'StrategicConfirmationError';
  }
}

export const STALE_OPPORTUNITY_MESSAGE =
  "Current strategy has changed. Let's refresh what I understood.";

/** At most this many alternative directions are held at once — "another direction", not a brainstorm. */
export const MAX_ALTERNATIVE_DIRECTIONS = 2;

/** Product-learning events. Wiring to the analytics service happens with the callable (see Phase 9 report). */
export const STRATEGIC_CONFIRMATION_ANALYTICS: Readonly<Record<StrategicConfirmationAction, string>> = {
  CONFIRMED: 'creative_opportunity_confirmed',
  REQUESTED_CHANGE: 'creative_opportunity_changed',
  EXPLORE_ALTERNATIVE: 'creative_opportunity_alternative_requested',
  DIRECTION_SELECTED: 'creative_opportunity_alternative_selected',
};
