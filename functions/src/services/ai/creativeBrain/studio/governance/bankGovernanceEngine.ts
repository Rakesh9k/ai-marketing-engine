import type {
  CreativeBankItem,
  StudioAdminRole,
  CreativeBankStatus,
  StudioAuditLogEntry,
} from "../../types/studio";

/**
 * Phase 10.29 — Bank Governance Engine
 *
 * Enforces server-authoritative permission checks, human review requirements for AI drafts,
 * deprecation safety checks, and immutable audit logging.
 */
export class BankGovernanceEngine {
  /**
   * Role Permission Hierarchy Check
   */
  static canPerformAction(
    role: StudioAdminRole,
    action: "VIEW" | "EDIT" | "APPROVE" | "DEPRECATE" | "MERGE" | "SUPER_ADMIN"
  ): boolean {
    switch (action) {
      case "VIEW":
        return true; // All roles can view
      case "EDIT":
        return ["CREATIVE_EDITOR", "CREATIVE_REVIEWER", "CREATIVE_ADMIN", "CREATIVE_SUPER_ADMIN"].includes(role);
      case "APPROVE":
      case "DEPRECATE":
        return ["CREATIVE_REVIEWER", "CREATIVE_ADMIN", "CREATIVE_SUPER_ADMIN"].includes(role);
      case "MERGE":
        return ["CREATIVE_ADMIN", "CREATIVE_SUPER_ADMIN"].includes(role);
      case "SUPER_ADMIN":
        return role === "CREATIVE_SUPER_ADMIN";
      default:
        return false;
    }
  }

  /**
   * Enforces AI Draft Promotion Rule: AI drafts MUST NOT be set to VALIDATED without human review.
   */
  static validateStatusTransition(
    item: CreativeBankItem,
    targetStatus: CreativeBankStatus,
    role: StudioAdminRole
  ): { allowed: boolean; reason?: string } {
    if (targetStatus === "VALIDATED") {
      if (item.sourceType === "AI_GENERATED" || item.sourceType === "AI_DISCOVERED") {
        if (!["CREATIVE_REVIEWER", "CREATIVE_ADMIN", "CREATIVE_SUPER_ADMIN"].includes(role)) {
          return {
            allowed: false,
            reason: `AI-generated or AI-discovered items require human approval by a CREATIVE_REVIEWER or higher before becoming VALIDATED.`,
          };
        }
      }
    }

    if (targetStatus === "DEPRECATED" && !this.canPerformAction(role, "DEPRECATE")) {
      return {
        allowed: false,
        reason: `Role [${role}] lacks permission to deprecate Creative Bank items.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Creates an audit log entry for a mutation
   */
  static createAuditEntry(
    actor: string,
    role: StudioAdminRole,
    action: StudioAuditLogEntry["action"],
    itemId: string,
    before?: Record<string, any>,
    after?: Record<string, any>,
    reason?: string
  ): StudioAuditLogEntry {
    return {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actor,
      role,
      timestamp: new Date().toISOString(),
      action,
      itemId,
      before,
      after,
      reason,
    };
  }
}
