/**
 * Phase 28 — Master Creative Bank Service Facade
 * Mitra by BrainWise
 */

import type {
  CreativeBankQuery,
  CreativeBankRetrievalResult,
  CreativeMechanism,
  MechanismComposition
} from './bank.types';
import {
  getAllMechanisms,
  getMechanismById,
  getMechanismsByIndustry
} from './mechanisms';
import {
  MechanismRetrievalEngine,
  recordMechanismUsage,
  getBusinessMechanismUsage
} from './mechanismRetrievalEngine';

export class CreativeBankService {
  /**
   * Retrieve a mechanism by ID
   */
  public getMechanism(id: string): CreativeMechanism | undefined {
    return getMechanismById(id);
  }

  /**
   * Query and rank mechanisms using context and Phase 22 explore/exploit logic
   */
  public queryMechanisms(query: CreativeBankQuery): CreativeBankRetrievalResult {
    return MechanismRetrievalEngine.retrieve(query);
  }

  /**
   * Manually compose a primary mechanism with 0–2 secondary mechanisms
   */
  public composeMechanisms(
    primaryId: string,
    secondaryIds: string[] = []
  ): MechanismComposition {
    const primary = this.getMechanism(primaryId);
    if (!primary) {
      throw new Error(`[CreativeBankService] Primary mechanism "${primaryId}" not found in bank`);
    }

    const secondaries: CreativeMechanism[] = secondaryIds
      .map((id) => this.getMechanism(id))
      .filter((m): m is CreativeMechanism => m !== undefined)
      .slice(0, 2);

    return MechanismRetrievalEngine.composeMechanisms([primary, ...secondaries]);
  }

  /**
   * Record that a business used a mechanism for fatigue tracking
   */
  public recordMechanismUsage(businessId: string, mechanismId: string): void {
    recordMechanismUsage(businessId, mechanismId);
  }

  /**
   * Get mechanism usage history for a business
   */
  public getUsageHistory(businessId: string): { mechanismId: string; usedAt: number }[] {
    return getBusinessMechanismUsage(businessId);
  }

  /**
   * Detect semantic duplicates among a set of mechanisms
   */
  public detectSemanticDuplicates(mechanisms: CreativeMechanism[]): {
    isDuplicate: boolean;
    duplicatePairs: [string, string][];
  } {
    const duplicatePairs: [string, string][] = [];

    for (let i = 0; i < mechanisms.length; i++) {
      for (let j = i + 1; j < mechanisms.length; j++) {
        const m1 = mechanisms[i];
        const m2 = mechanisms[j];

        // Check if triggers and primary categories are identical
        const sameCategory =
          m1.category.length === m2.category.length &&
          m1.category.every((c) => m2.category.includes(c));

        const sameTrigger = m1.trigger.toLowerCase() === m2.trigger.toLowerCase();

        if (sameCategory && sameTrigger && m1.id !== m2.id) {
          duplicatePairs.push([m1.id, m2.id]);
        }
      }
    }

    return {
      isDuplicate: duplicatePairs.length > 0,
      duplicatePairs
    };
  }

  /**
   * Get all core V1 mechanisms
   */
  public getAllMechanisms(): CreativeMechanism[] {
    return getAllMechanisms();
  }

  /**
   * Get mechanisms available for a specific industry
   */
  public getMechanismsByIndustry(industry: string): CreativeMechanism[] {
    return getMechanismsByIndustry(industry);
  }
}

export const creativeBankService = new CreativeBankService();
