import * as crypto from "crypto";
import type {
  CreativeBrainSession,
  ExecutionAuthorization,
  StrategicDirectionSummary,
} from "../types";

export class ExecutionAuthorizationService {
  private secretKey: string;

  constructor(secretKey: string = "mitra_creative_execution_auth_secret_2026") {
    this.secretKey = secretKey;
  }

  /**
   * Issues an ExecutionAuthorization strictly after user confirmation.
   * Throws if session is not in CONFIRMED state or missing confirmation.
   */
  public issueAuthorization(
    session: CreativeBrainSession,
    directionSummary: StrategicDirectionSummary
  ): ExecutionAuthorization {
    if (session.currentState !== "CONFIRMED" && session.currentState !== "EXECUTION_READY") {
      throw new Error(
        `Authorization failed: Session is in state '${session.currentState}'. User confirmation is mandatory before execution authorization.`
      );
    }

    if (!session.userConfirmation || !session.userConfirmation.confirmed) {
      throw new Error("Authorization failed: Missing explicit user confirmation record.");
    }

    const selectedVariantId = session.userConfirmation.selectedVariantId || session.selectedVariant?.id || session.variantSet?.variants[0]?.id;
    if (!selectedVariantId) {
      throw new Error("Authorization failed: No variant selected for execution.");
    }

    const selectedStrategyType = session.selectedVariant?.strategy || session.variantSet?.variants[0]?.strategy || "CONVENIENCE";

    const authorizationId = `auth_${session.sessionId}_${Date.now()}`;
    const authorizedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hour authorization window

    const signaturePayload = `${session.sessionId}:${authorizationId}:${selectedVariantId}:${selectedStrategyType}:${authorizedAt}`;
    const signature = crypto.createHmac("sha256", this.secretKey).update(signaturePayload).digest("hex");

    return {
      authorizationId,
      sessionId: session.sessionId,
      confirmationId: session.userConfirmation.confirmedAt ? `conf_${session.sessionId}` : `conf_${Date.now()}`,
      selectedVariantId,
      selectedStrategyType,
      approvedDirectionSummary: directionSummary,
      authorizedAt,
      expiresAt,
      signature,
    };
  }

  /**
   * Verifies an ExecutionAuthorization payload signature.
   */
  public verifyAuthorization(authorization: ExecutionAuthorization): boolean {
    if (!authorization.authorizationId || !authorization.sessionId || !authorization.signature) {
      return false;
    }

    // Check expiration
    if (new Date(authorization.expiresAt).getTime() < Date.now()) {
      return false;
    }

    const signaturePayload = `${authorization.sessionId}:${authorization.authorizationId}:${authorization.selectedVariantId}:${authorization.selectedStrategyType}:${authorization.authorizedAt}`;
    const expectedSignature = crypto.createHmac("sha256", this.secretKey).update(signaturePayload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(authorization.signature), Buffer.from(expectedSignature));
  }
}
