/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Audit Logging Service
 */

import type { CreativeVersionAuditEvent, ID } from "./creativeVersion.types";
import { CreativeVersionRepository } from "./creativeVersionRepository";

export class CreativeVersionAuditService {
  private repo: CreativeVersionRepository;

  constructor(repo?: CreativeVersionRepository) {
    this.repo = repo || new CreativeVersionRepository();
  }

  public async logEvent(
    action: CreativeVersionAuditEvent["action"],
    itemId: ID,
    actorId: string,
    actorRole: string,
    versionId?: ID,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<CreativeVersionAuditEvent> {
    const event: CreativeVersionAuditEvent = {
      id: `aud_ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId,
      versionId,
      action,
      actorId,
      actorRole,
      timestamp: new Date().toISOString(),
      reason,
      metadata,
    };

    await this.repo.logAuditEvent(event);
    return event;
  }

  public async getAuditHistory(itemId?: ID): Promise<CreativeVersionAuditEvent[]> {
    return this.repo.getAuditEvents(itemId);
  }
}
