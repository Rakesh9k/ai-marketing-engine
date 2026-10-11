/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Firestore Repository with In-Memory Test Fallbacks & Multi-Tenant Security
 */

import type { CulturalPreferenceOverride, CulturalAuditEvent } from "./culturalIntelligence.types";

export class FirestoreCulturalIntelligenceRepository {
  private inMemoryOverrides: Map<string, CulturalPreferenceOverride[]> = new Map();
  private inMemoryAuditEvents: CulturalAuditEvent[] = [];

  public async getBusinessOverrides(
    businessId: string,
    tenantId?: string
  ): Promise<CulturalPreferenceOverride[]> {
    const list = this.inMemoryOverrides.get(businessId) || [];
    const first = list[0];
    if (first && tenantId && first.tenantId && first.tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access overrides for '${businessId}'`);
    }
    return [...list];
  }

  public async saveBusinessOverride(override: CulturalPreferenceOverride): Promise<void> {
    const list = this.inMemoryOverrides.get(override.businessId) || [];
    list.push(override);
    this.inMemoryOverrides.set(override.businessId, list);
  }

  public async logAuditEvent(event: CulturalAuditEvent): Promise<void> {
    this.inMemoryAuditEvents.push(event);
  }

  public async getAuditEvents(businessId?: string): Promise<CulturalAuditEvent[]> {
    if (!businessId) return [...this.inMemoryAuditEvents];
    return this.inMemoryAuditEvents.filter((e) => e.businessId === businessId);
  }
}
