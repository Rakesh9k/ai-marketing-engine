import type {
  CreativeBrainSession,
  StrategicConfirmation,
  ExecutionAuthorization,
  CreativeBrainSessionDocument,
  StrategicConfirmationDocument,
  ExecutionAuthorizationDocument,
} from "../types";

export class CreativeBrainPersistenceMappers {
  public static mapSessionToDocument(
    session: CreativeBrainSession,
    tenantId: string,
    revision: number = 1
  ): CreativeBrainSessionDocument {
    return {
      tenantId,
      businessId: session.businessContext.businessId,
      sessionId: session.sessionId,
      revision,
      currentState: session.currentState,
      sessionData: session,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  public static mapDocumentToSession(doc: CreativeBrainSessionDocument): CreativeBrainSession {
    return doc.sessionData;
  }

  public static mapConfirmationToDocument(
    confirmation: StrategicConfirmation,
    tenantId: string,
    businessId: string,
    sourceDirectionId: string,
    revision: number = 1
  ): StrategicConfirmationDocument {
    return {
      tenantId,
      businessId,
      sessionId: confirmation.sessionId,
      revision,
      strategyRevision: confirmation.strategyRevision || revision,
      confirmationId: confirmation.confirmationId,
      state: confirmation.state,
      status: confirmation.status,
      strategyState: confirmation.strategyState,
      executionState: confirmation.executionState,
      confidence: confirmation.confidence,
      source: {
        directionId: sourceDirectionId,
      },
      summary: confirmation.summary,
      opportunity: confirmation.opportunity,
      recommendedDirection: confirmation.recommendedDirection,
      alternatives: confirmation.alternatives,
      explanation: confirmation.explanation,
      policyVersions: [{ entityName: "StrategicConfirmationPolicy", version: 1 }],
      createdAt: confirmation.createdAt,
      updatedAt: confirmation.updatedAt,
    };
  }

  public static mapDocumentToConfirmation(doc: StrategicConfirmationDocument): StrategicConfirmation {
    return {
      confirmationId: doc.confirmationId,
      sessionId: doc.sessionId,
      revision: doc.revision || 1,
      strategyRevision: doc.strategyRevision || doc.revision || 1,
      state: (doc.state as any) || doc.status,
      status: doc.status,
      strategyState: doc.strategyState || "READY",
      executionState: doc.executionState || "NOT_AUTHORIZED",
      summary: doc.summary,
      opportunity: doc.opportunity,
      recommendedDirection: doc.recommendedDirection,
      alternatives: doc.alternatives,
      explanation: doc.explanation,
      confidence: doc.confidence || "HIGH",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  public static mapAuthorizationToDocument(
    auth: ExecutionAuthorization,
    tenantId: string
  ): ExecutionAuthorizationDocument {
    return {
      tenantId,
      authorizationId: auth.authorizationId,
      sessionId: auth.sessionId,
      confirmationId: auth.confirmationId,
      selectedVariantId: auth.selectedVariantId,
      selectedStrategyType: auth.selectedStrategyType,
      signature: auth.signature,
      authorizedAt: auth.authorizedAt,
      expiresAt: auth.expiresAt,
      consumed: false,
    };
  }

  public static mapDocumentToAuthorization(
    doc: ExecutionAuthorizationDocument,
    directionSummary: any
  ): ExecutionAuthorization {
    return {
      authorizationId: doc.authorizationId,
      sessionId: doc.sessionId,
      confirmationId: doc.confirmationId,
      selectedVariantId: doc.selectedVariantId,
      selectedStrategyType: doc.selectedStrategyType,
      approvedDirectionSummary: directionSummary,
      authorizedAt: doc.authorizedAt,
      expiresAt: doc.expiresAt,
      signature: doc.signature,
    };
  }
}
