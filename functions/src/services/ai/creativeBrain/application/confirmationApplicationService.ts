import { CreativeBrainOrchestrator } from "../orchestrator/creativeBrainOrchestrator";
import {
  FirestoreCreativeBrainSessionRepository,
  FirestoreCreativeBrainOperationRepository,
  FirestoreCreativeBrainCheckpointRepository,
  FirestoreStrategicConfirmationRepository,
  FirestoreStrategicDecisionRepository,
  FirestoreCreativeExplorationRepository,
  FirestoreExecutionAuthorizationRepository,
  CreativeBrainPersistenceMappers,
} from "../persistence";
import type {
  BusinessContext,
  CreativeBrainSessionResponse,
  CreateCreativeBrainSessionRequest,
  CreateCreativeBrainSessionResponse,
  GetConfirmationResponse,
  GenerateConfirmationRequest,
  GenerateConfirmationResponse,
  StrategicConfirmationDecisionRequest,
  ExploreDirectionRequest,
  ExploreDirectionResponse,
  StrategicRevisionRequest,
  CreativeBrainOperationResponse,
  ExecutionAuthorization,
  PlatformContext,
  FormatContext,
  CampaignStage,
} from "../types";

export class ConfirmationApplicationService {
  private orchestrator: CreativeBrainOrchestrator;
  private sessionRepo: FirestoreCreativeBrainSessionRepository;
  private operationRepo: FirestoreCreativeBrainOperationRepository;
  private checkpointRepo: FirestoreCreativeBrainCheckpointRepository;
  private confirmationRepo: FirestoreStrategicConfirmationRepository;
  private decisionRepo: FirestoreStrategicDecisionRepository;
  private explorationRepo: FirestoreCreativeExplorationRepository;
  private authRepo: FirestoreExecutionAuthorizationRepository;

  constructor(
    orchestrator?: CreativeBrainOrchestrator,
    sessionRepo?: FirestoreCreativeBrainSessionRepository,
    operationRepo?: FirestoreCreativeBrainOperationRepository,
    checkpointRepo?: FirestoreCreativeBrainCheckpointRepository,
    confirmationRepo?: FirestoreStrategicConfirmationRepository,
    decisionRepo?: FirestoreStrategicDecisionRepository,
    explorationRepo?: FirestoreCreativeExplorationRepository,
    authRepo?: FirestoreExecutionAuthorizationRepository
  ) {
    this.orchestrator = orchestrator || new CreativeBrainOrchestrator();
    this.sessionRepo = sessionRepo || new FirestoreCreativeBrainSessionRepository();
    this.operationRepo = operationRepo || new FirestoreCreativeBrainOperationRepository();
    this.checkpointRepo = checkpointRepo || new FirestoreCreativeBrainCheckpointRepository();
    this.confirmationRepo = confirmationRepo || new FirestoreStrategicConfirmationRepository();
    this.decisionRepo = decisionRepo || new FirestoreStrategicDecisionRepository();
    this.explorationRepo = explorationRepo || new FirestoreCreativeExplorationRepository();
    this.authRepo = authRepo || new FirestoreExecutionAuthorizationRepository();
  }

  public async getSession(tenantId: string, sessionId: string): Promise<CreativeBrainSessionResponse> {
    const sessionDoc = await this.sessionRepo.get(sessionId);
    if (!sessionDoc || sessionDoc.tenantId !== tenantId) {
      throw new Error(`Creative Brain session '${sessionId}' not found for tenant '${tenantId}'.`);
    }

    const session = CreativeBrainPersistenceMappers.mapDocumentToSession(sessionDoc);
    const confirmationDoc = await this.confirmationRepo.get(sessionId, sessionDoc.revision);
    const currentConfirmation = confirmationDoc
      ? CreativeBrainPersistenceMappers.mapDocumentToConfirmation(confirmationDoc)
      : undefined;

    return {
      session,
      currentState: session.currentState,
      revision: sessionDoc.revision,
      currentConfirmation,
    };
  }

  public async createSession(
    tenantId: string,
    businessContext: BusinessContext,
    request: CreateCreativeBrainSessionRequest
  ): Promise<CreateCreativeBrainSessionResponse> {
    const platformContext: PlatformContext = {
      platformId: request.platform || "plat-meta",
      name: request.platform || "Meta",
      supported: true,
      expressionConstraints: {
        aspectRatios: ["1:1", "9:16"],
        textDensity: "LOW",
        contentDensity: "MEDIUM",
        visualPacing: "MODERATE",
        sourceVersion: 1,
        lastVerified: new Date().toISOString(),
      },
    };

    const formatContext: FormatContext = {
      formatId: request.format || "fmt-post",
      name: request.format || "Feed Post",
      type: "POST",
      constraints: [],
    };

    const result = await this.orchestrator.orchestrate({
      business: businessContext,
      objective: request.objective as any,
      platform: platformContext,
      format: formatContext,
      campaignStage: (request.campaignStage as CampaignStage) || "CONVERSION",
    });

    const sessionDoc = CreativeBrainPersistenceMappers.mapSessionToDocument(result.session, tenantId, 1);
    await this.sessionRepo.create(sessionDoc);

    // Save checkpoint
    await this.checkpointRepo.save({
      tenantId,
      sessionId: result.session.sessionId,
      revision: 1,
      state: result.session.currentState,
      sessionSnapshot: result.session,
      policyVersions: [{ entityName: "CreativeBrainPolicy", version: 1 }],
      createdAt: new Date().toISOString(),
    });

    // Save initial confirmation projection
    const confirmation = this.orchestrator.getStrategicConfirmation(result.session);
    const confirmationDoc = CreativeBrainPersistenceMappers.mapConfirmationToDocument(
      confirmation,
      tenantId,
      businessContext.businessId,
      result.session.creativeDirection?.id || `dir_${result.session.sessionId}`,
      1
    );
    await this.confirmationRepo.create(confirmationDoc);

    return {
      sessionId: result.session.sessionId,
      revision: 1,
      state: result.session.currentState,
    };
  }

  public async getConfirmation(tenantId: string, sessionId: string): Promise<GetConfirmationResponse> {
    const sessionRes = await this.getSession(tenantId, sessionId);
    const confirmationDoc = await this.confirmationRepo.get(sessionId, sessionRes.revision);

    if (!confirmationDoc) {
      throw new Error(`Confirmation record not found for session '${sessionId}' at revision ${sessionRes.revision}.`);
    }

    return {
      confirmation: CreativeBrainPersistenceMappers.mapDocumentToConfirmation(confirmationDoc),
    };
  }

  public async generateConfirmation(
    tenantId: string,
    sessionId: string,
    request: GenerateConfirmationRequest
  ): Promise<GenerateConfirmationResponse> {
    // Idempotency check
    const existingOp = await this.operationRepo.findByIdempotencyKey(tenantId, request.idempotencyKey);
    if (existingOp && existingOp.status === "SUCCEEDED") {
      const confirmationRes = await this.getConfirmation(tenantId, sessionId);
      return {
        operationId: existingOp.operationId,
        status: "READY",
        confirmation: confirmationRes.confirmation,
      };
    }

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await this.operationRepo.create({
      tenantId,
      operationId,
      idempotencyKey: request.idempotencyKey,
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
    });

    try {
      const sessionRes = await this.getSession(tenantId, sessionId);
      const confirmation = this.orchestrator.getStrategicConfirmation(sessionRes.session);

      const confirmationDoc = CreativeBrainPersistenceMappers.mapConfirmationToDocument(
        confirmation,
        tenantId,
        sessionRes.session.businessContext.businessId,
        sessionRes.session.creativeDirection?.id || `dir_${sessionId}`,
        request.revision
      );
      await this.confirmationRepo.create(confirmationDoc);
      await this.operationRepo.markSucceeded(operationId, confirmation.confirmationId);

      return {
        operationId,
        status: "READY",
        confirmation,
      };
    } catch (err: any) {
      await this.operationRepo.markFailed(operationId, "CONFIRMATION_GEN_FAILED", err.message);
      return {
        operationId,
        status: "FAILED",
        failure: {
          code: "CONFIRMATION_GEN_FAILED",
          message: err.message,
        },
      };
    }
  }

  public async processDecision(
    tenantId: string,
    sessionId: string,
    request: StrategicConfirmationDecisionRequest
  ): Promise<GenerateConfirmationResponse> {
    const existingOp = await this.operationRepo.findByIdempotencyKey(tenantId, request.idempotencyKey);
    if (existingOp && existingOp.status === "SUCCEEDED") {
      const confirmationRes = await this.getConfirmation(tenantId, sessionId);
      return {
        operationId: existingOp.operationId,
        status: "READY",
        confirmation: confirmationRes.confirmation,
      };
    }

    const sessionRes = await this.getSession(tenantId, sessionId);
    const operationId = `op_dec_${Date.now()}`;
    await this.operationRepo.create({
      tenantId,
      operationId,
      idempotencyKey: request.idempotencyKey,
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
    });

    try {
      const processResult = this.orchestrator.processStrategicConfirmation(
        sessionRes.session,
        request.decision,
        {
          selectedVariantId: request.selectedAlternativeId,
          userNotes: request.userNotes,
        }
      );

      const nextRevision = sessionRes.revision + 1;
      const updatedSessionDoc = CreativeBrainPersistenceMappers.mapSessionToDocument(
        processResult.session,
        tenantId,
        nextRevision
      );
      await this.sessionRepo.update(updatedSessionDoc);

      // Record Decision
      await this.decisionRepo.create({
        tenantId,
        decisionId: `dec_${Date.now()}`,
        sessionId,
        confirmationId: request.confirmationId,
        revision: request.revision,
        decision: request.decision,
        selectedAlternativeId: request.selectedAlternativeId,
        userNotes: request.userNotes,
        createdAt: new Date().toISOString(),
      });

      // Store Execution Authorization if decision is CONFIRM
      if (processResult.authorization) {
        const authDoc = CreativeBrainPersistenceMappers.mapAuthorizationToDocument(
          processResult.authorization,
          tenantId
        );
        await this.authRepo.create(authDoc);
      }

      // Store new confirmation document
      const confirmationDoc = CreativeBrainPersistenceMappers.mapConfirmationToDocument(
        processResult.confirmation,
        tenantId,
        processResult.session.businessContext.businessId,
        processResult.session.creativeDirection?.id || `dir_${sessionId}`,
        nextRevision
      );
      await this.confirmationRepo.create(confirmationDoc);
      await this.operationRepo.markSucceeded(operationId, processResult.confirmation.confirmationId);

      return {
        operationId,
        status: "READY",
        confirmation: processResult.confirmation,
      };
    } catch (err: any) {
      await this.operationRepo.markFailed(operationId, "DECISION_FAILED", err.message);
      return {
        operationId,
        status: "FAILED",
        failure: {
          code: "DECISION_FAILED",
          message: err.message,
        },
      };
    }
  }

  public async exploreDirection(
    tenantId: string,
    sessionId: string,
    request: ExploreDirectionRequest
  ): Promise<ExploreDirectionResponse> {
    const sessionRes = await this.getSession(tenantId, sessionId);
    const operationId = `op_exp_${Date.now()}`;

    try {
      const exploreResult = this.orchestrator.exploreAlternativeDirection(sessionRes.session);
      const nextRevision = sessionRes.revision + 1;

      const updatedSessionDoc = CreativeBrainPersistenceMappers.mapSessionToDocument(
        exploreResult.session,
        tenantId,
        nextRevision
      );
      await this.sessionRepo.update(updatedSessionDoc);

      // Record Exploration
      await this.explorationRepo.create({
        explorationId: `exp_${Date.now()}`,
        tenantId,
        sessionId,
        revision: request.revision,
        sourceConfirmationId: request.confirmationId,
        sourceDirectionId: sessionRes.session.creativeDirection?.id || `dir_${sessionId}`,
        exploredDirectionIds: exploreResult.explorationContext.exploredDirectionIds,
        exploredStrategyTypes: exploreResult.explorationContext.exploredStrategyTypes,
        explorationCount: exploreResult.explorationContext.explorationCount,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      const confirmation = this.orchestrator.getStrategicConfirmation(exploreResult.session);
      const confirmationDoc = CreativeBrainPersistenceMappers.mapConfirmationToDocument(
        confirmation,
        tenantId,
        exploreResult.session.businessContext.businessId,
        exploreResult.session.creativeDirection?.id || `dir_${sessionId}`,
        nextRevision
      );
      await this.confirmationRepo.create(confirmationDoc);

      return {
        operationId,
        status: "READY",
        alternative: confirmation.alternatives[0],
        confirmation,
      };
    } catch (err: any) {
      return {
        operationId,
        status: "FAILED",
        failure: {
          code: "EXPLORE_FAILED",
          message: err.message,
        },
      };
    }
  }

  public async reviseSession(
    tenantId: string,
    sessionId: string,
    request: StrategicRevisionRequest
  ): Promise<GenerateConfirmationResponse> {
    const sessionRes = await this.getSession(tenantId, sessionId);
    const operationId = `op_rev_${Date.now()}`;

    try {
      const revisedSessionResult = await this.orchestrator.revise(sessionRes.session, {
        type: request.type as any,
        timestamp: new Date().toISOString(),
      });

      const revisedSession = revisedSessionResult.session;
      const nextRevision = sessionRes.revision + 1;

      const updatedSessionDoc = CreativeBrainPersistenceMappers.mapSessionToDocument(
        revisedSession,
        tenantId,
        nextRevision
      );
      await this.sessionRepo.update(updatedSessionDoc);

      const confirmation = this.orchestrator.getStrategicConfirmation(revisedSession);
      const confirmationDoc = CreativeBrainPersistenceMappers.mapConfirmationToDocument(
        confirmation,
        tenantId,
        revisedSession.businessContext.businessId,
        revisedSession.creativeDirection?.id || `dir_${sessionId}`,
        nextRevision
      );
      await this.confirmationRepo.create(confirmationDoc);

      return {
        operationId,
        status: "READY",
        confirmation,
      };
    } catch (err: any) {
      return {
        operationId,
        status: "FAILED",
        failure: {
          code: "REVISION_FAILED",
          message: err.message,
        },
      };
    }
  }

  public async getOperationStatus(
    tenantId: string,
    operationId: string
  ): Promise<CreativeBrainOperationResponse> {
    const snapshot = await this.operationRepo.findByIdempotencyKey(tenantId, operationId);
    if (!snapshot) {
      return {
        operationId,
        status: "FAILED",
        failure: {
          code: "OPERATION_NOT_FOUND",
          message: `Operation '${operationId}' not found.`,
        },
      };
    }

    return {
      operationId: snapshot.operationId,
      status: snapshot.status,
      resultReference: snapshot.resultReference,
      failure: snapshot.errorPayload,
    };
  }

  public async getExecutionAuthorization(
    tenantId: string,
    authorizationId: string
  ): Promise<ExecutionAuthorization | null> {
    const authDoc = await this.authRepo.get(authorizationId);
    if (!authDoc || authDoc.tenantId !== tenantId) {
      return null;
    }

    const sessionRes = await this.getSession(tenantId, authDoc.sessionId);
    const confirmation = this.orchestrator.getStrategicConfirmation(sessionRes.session);

    return CreativeBrainPersistenceMappers.mapDocumentToAuthorization(
      authDoc,
      confirmation.recommendedDirection
    );
  }
}
