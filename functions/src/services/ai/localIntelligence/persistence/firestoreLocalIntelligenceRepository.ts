/**
 * PHASE 10.34 — Build Local Intelligence
 * Firestore Repository with In-Memory Test Fallbacks & Multi-Tenant Security
 */

import type {
  LocalMarketProfile,
  BusinessCatchment,
  LocalAuditEvent,
} from "../localIntelligence.types";
import { HYDERABAD_MARKET_PROFILE } from "../seed/hyderabadSeed";

export class FirestoreLocalIntelligenceRepository {
  private inMemoryProfiles: Map<string, LocalMarketProfile> = new Map();
  private inMemoryCatchments: Map<string, BusinessCatchment> = new Map();
  private inMemoryAuditEvents: LocalAuditEvent[] = [];

  constructor() {
    this.inMemoryProfiles.set("hyderabad", HYDERABAD_MARKET_PROFILE);
    this.inMemoryProfiles.set("mkt_hyderabad", HYDERABAD_MARKET_PROFILE);
  }

  public async getMarketProfile(cityIdOrMarketId: string): Promise<LocalMarketProfile | undefined> {
    const key = cityIdOrMarketId.trim().toLowerCase();
    return this.inMemoryProfiles.get(key) || this.inMemoryProfiles.get(`mkt_${key}`);
  }

  public async saveMarketProfile(profile: LocalMarketProfile): Promise<void> {
    this.inMemoryProfiles.set(profile.id, profile);
    this.inMemoryProfiles.set(profile.cityId.toLowerCase(), profile);
  }

  public async getBusinessCatchment(
    businessId: string,
    tenantId?: string
  ): Promise<BusinessCatchment | undefined> {
    const catchment = this.inMemoryCatchments.get(businessId);
    if (catchment && tenantId && catchment.tenantId && catchment.tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access catchment for '${businessId}'`);
    }
    return catchment;
  }

  public async saveBusinessCatchment(catchment: BusinessCatchment): Promise<void> {
    this.inMemoryCatchments.set(catchment.businessId, catchment);
  }

  public async logAuditEvent(event: LocalAuditEvent): Promise<void> {
    this.inMemoryAuditEvents.push(event);
  }

  public async getAuditEvents(businessId?: string): Promise<LocalAuditEvent[]> {
    if (!businessId) return [...this.inMemoryAuditEvents];
    return this.inMemoryAuditEvents.filter((e) => e.businessId === businessId);
  }
}
