import type {
  CreativeFatigueProfile,
  CreativeFrequencyRecord,
  FatigueIntervention,
} from "../fatigue.types";

export class FirestoreFatigueRepository {
  private inMemoryProfiles: Map<string, CreativeFatigueProfile> = new Map();
  private inMemoryFrequencies: Map<string, CreativeFrequencyRecord[]> = new Map();
  private inMemoryInterventions: Map<string, FatigueIntervention[]> = new Map();

  /**
   * Saves or updates a CreativeFatigueProfile.
   */
  public async saveProfile(profile: CreativeFatigueProfile): Promise<void> {
    this.inMemoryProfiles.set(profile.businessId, profile);
  }

  /**
   * Retrieves profile by business ID.
   */
  public async getProfile(businessId: string): Promise<CreativeFatigueProfile | null> {
    return this.inMemoryProfiles.get(businessId) || null;
  }

  /**
   * Saves frequency records for a business.
   */
  public async saveFrequencyRecords(
    businessId: string,
    records: CreativeFrequencyRecord[]
  ): Promise<void> {
    this.inMemoryFrequencies.set(businessId, records);
  }

  /**
   * Retrieves frequency records.
   */
  public async getFrequencyRecords(businessId: string): Promise<CreativeFrequencyRecord[]> {
    return this.inMemoryFrequencies.get(businessId) || [];
  }

  /**
   * Saves fatigue intervention record.
   */
  public async saveIntervention(intervention: FatigueIntervention): Promise<void> {
    const list = this.inMemoryInterventions.get(intervention.businessId) || [];
    list.push(intervention);
    this.inMemoryInterventions.set(intervention.businessId, list);
  }

  /**
   * Retrieves fatigue interventions.
   */
  public async getInterventions(businessId: string): Promise<FatigueIntervention[]> {
    return this.inMemoryInterventions.get(businessId) || [];
  }

  /**
   * Clears in-memory state (for testing).
   */
  public clearInMemoryState(): void {
    this.inMemoryProfiles.clear();
    this.inMemoryFrequencies.clear();
    this.inMemoryInterventions.clear();
  }
}
