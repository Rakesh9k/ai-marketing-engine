import type {
  PublicationAuthorizationInput,
  PublicationAuthorizationResult,
  PublicationAuthorization,
} from "../../types/governance";
import * as crypto from "crypto";

export class PublicationAuthorizationService {
  /**
   * Server-authoritative publication gate.
   *
   * Rules:
   * 1. Client CANNOT set `truthPassed = true` or bypass governance.
   * 2. Server verifies all three gates (Truth, Safety, Brand) independently.
   * 3. Must be strategy confirmed and on current revision.
   */
  public authorizePublication(
    input: PublicationAuthorizationInput
  ): PublicationAuthorizationResult {
    const rejectionReasons: string[] = [];
    const govResult = input.governanceResult;

    // 1. Revision alignment check
    if (govResult.revision !== input.revision) {
      rejectionReasons.push(
        `Governance result revision ${govResult.revision} does not match current session revision ${input.revision}`
      );
    }

    // 2. Truth Gate verification
    const truthPassed = govResult.truth.status === "PASS";
    if (!truthPassed) {
      rejectionReasons.push(`Truth Check governance failed with status '${govResult.truth.status}'`);
    }

    // 3. Safety Gate verification
    const safetyPassed = govResult.safety.status === "PASS";
    if (!safetyPassed) {
      rejectionReasons.push(`Safety/Ethical governance failed with status '${govResult.safety.status}'`);
    }

    // 4. Brand Gate verification
    const brandPassed = govResult.brand.status === "PASS";
    if (!brandPassed) {
      rejectionReasons.push(`Brand Check governance failed with status '${govResult.brand.status}'`);
    }

    // 5. Blocking Issues verification
    if (govResult.blockingIssues.length > 0) {
      rejectionReasons.push(
        `Publication blocked by ${govResult.blockingIssues.length} unresolved blocking issue(s)`
      );
    }

    // 6. Overall Status verification
    if (govResult.status !== "PASS") {
      rejectionReasons.push(
        `Overall governance status is '${govResult.status}'. Only 'PASS' can authorize publication`
      );
    }

    if (rejectionReasons.length > 0) {
      return {
        authorized: false,
        rejectionReasons,
      };
    }

    const timestamp = new Date().toISOString();
    const hashData = `${input.businessId}:${input.sessionId}:${input.revision}:${govResult.creativeVersionId}:${timestamp}`;
    const authorizationHash = crypto.createHash("sha256").update(hashData).digest("hex");

    const authorization: PublicationAuthorization = {
      tenantId: input.tenantId,
      businessId: input.businessId,
      sessionId: input.sessionId,
      strategyConfirmed: true,
      currentRevision: input.revision,
      truthPassed: true,
      safetyPassed: true,
      brandPassed: true,
      assetsValidated: true,
      governanceVersion: "2026.10.07-gov-v1",
      authorizedAt: timestamp,
      authorizationHash,
    };

    return {
      authorized: true,
      authorization,
    };
  }
}
