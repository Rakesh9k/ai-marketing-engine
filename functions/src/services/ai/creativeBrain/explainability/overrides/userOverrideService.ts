import type { UserOverrideRecord } from "../../types/explainability";
import { FirestoreTraceRepository } from "../persistence/firestoreTraceRepository";

export class UserOverrideService {
  private repository: FirestoreTraceRepository;
  private memoryOverrides: Map<string, UserOverrideRecord[]> = new Map();

  constructor(repository?: FirestoreTraceRepository) {
    this.repository = repository || new FirestoreTraceRepository();
  }

  /**
   * Records a user override when a human rejects the recommended option in favor of an alternative.
   */
  public async recordOverride(override: UserOverrideRecord): Promise<void> {
    if (!override.id) {
      override.id = `ovr_${override.decisionId}_${Date.now()}`;
    }
    if (!override.createdAt) {
      override.createdAt = new Date().toISOString();
    }

    try {
      await this.repository.saveUserOverride(override);
    } catch {
      // Memory fallback for tests/offline
    }

    const tenantKey = override.tenantId || "default";
    const existing = this.memoryOverrides.get(tenantKey) || [];
    existing.push(override);
    this.memoryOverrides.set(tenantKey, existing);
  }

  /**
   * Retrieves recorded user overrides for a specific tenant.
   */
  public async getOverridesForTenant(tenantId: string): Promise<UserOverrideRecord[]> {
    try {
      const fromRepo = await this.repository.getUserOverrides(tenantId);
      if (fromRepo && fromRepo.length > 0) return fromRepo;
    } catch {
      // Memory fallback
    }
    return this.memoryOverrides.get(tenantId) || [];
  }
}
