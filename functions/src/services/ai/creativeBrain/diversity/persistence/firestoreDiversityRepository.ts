import type { CreativeFingerprint, CreativeDiversityProfile } from "../types";

export class FirestoreDiversityRepository {
  private inMemoryFingerprints: Map<string, CreativeFingerprint[]> = new Map();
  private inMemoryProfiles: Map<string, CreativeDiversityProfile> = new Map();

  /**
   * Saves a completed campaign fingerprint.
   */
  public async saveFingerprint(fingerprint: CreativeFingerprint): Promise<void> {
    const list = this.inMemoryFingerprints.get(fingerprint.businessId) || [];
    list.push(fingerprint);
    this.inMemoryFingerprints.set(fingerprint.businessId, list);
  }

  /**
   * Retrieves recent fingerprints for a business.
   */
  public async getRecentFingerprints(
    businessId: string,
    limit: number = 10
  ): Promise<CreativeFingerprint[]> {
    const list = this.inMemoryFingerprints.get(businessId) || [];
    return list.slice(-limit);
  }

  /**
   * Saves or updates a CreativeDiversityProfile.
   */
  public async saveProfile(profile: CreativeDiversityProfile): Promise<void> {
    this.inMemoryProfiles.set(profile.businessId, profile);
  }

  /**
   * Retrieves profile for a business.
   */
  public async getProfile(businessId: string): Promise<CreativeDiversityProfile | null> {
    return this.inMemoryProfiles.get(businessId) || null;
  }

  /**
   * Clears in-memory store (for testing).
   */
  public clearInMemoryState(): void {
    this.inMemoryFingerprints.clear();
    this.inMemoryProfiles.clear();
  }
}
