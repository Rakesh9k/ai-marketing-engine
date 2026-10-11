/**
 * PHASE 17 — Strategy Lock Service
 * Freezes approved strategic blueprint parameters and generates SHA-256 strategic hash.
 */

import * as crypto from 'crypto';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { StrategicFields, StrategyLock } from './strategyFidelity.types';

export class StrategyLockService {
  /**
   * Extracts immutable strategic fields from a CreativeBlueprint.
   */
  public extractStrategicFields(blueprint: CreativeBlueprint): StrategicFields {
    return {
      campaignObjective: blueprint.campaignObjective?.primary || 'awareness',
      audience: blueprint.audience?.primaryAudience || 'general_audience',
      creativeOpportunity: blueprint.creativeOpportunity?.opportunity || 'generic_opportunity',
      coreConcept: blueprint.coreConcept?.name || 'unnamed_concept',
      humanInsight: blueprint.coreConcept?.humanInsight || '',
      creativeMechanism: blueprint.creativeMechanism?.primaryMechanism || '',
      emotionalDirection: blueprint.emotionalDirection?.primaryEmotion || '',
      messageHierarchy: [
        blueprint.messageHierarchy?.primaryMessage || '',
        ...(blueprint.messageHierarchy?.supportingMessages || []),
      ].filter(Boolean),
      offerStrategicRole: blueprint.offer?.strategicRole || 'none',
    };
  }

  /**
   * Computes deterministic SHA-256 strategic hash over canonicalized strategic fields.
   */
  public computeStrategicHash(fields: StrategicFields): string {
    const canonicalString = JSON.stringify({
      campaignObjective: fields.campaignObjective.trim().toLowerCase(),
      audience: fields.audience.trim().toLowerCase(),
      creativeOpportunity: fields.creativeOpportunity.trim().toLowerCase(),
      coreConcept: fields.coreConcept.trim().toLowerCase(),
      humanInsight: fields.humanInsight.trim().toLowerCase(),
      creativeMechanism: fields.creativeMechanism.trim().toLowerCase(),
      emotionalDirection: fields.emotionalDirection.trim().toLowerCase(),
      messageHierarchy: fields.messageHierarchy.map((m) => m.trim().toLowerCase()).sort(),
      offerStrategicRole: fields.offerStrategicRole.trim().toLowerCase(),
    });

    return crypto.createHash('sha256').update(canonicalString).digest('hex');
  }

  /**
   * Creates a new StrategyLock freezing the approved blueprint.
   */
  public createLock(blueprint: CreativeBlueprint, version: number = 1): StrategyLock {
    const immutableFields = this.extractStrategicFields(blueprint);
    const strategicHash = this.computeStrategicHash(immutableFields);
    const lockId = `lock_${blueprint.id}_v${version}_${Date.now()}`;

    return {
      id: lockId,
      blueprintId: blueprint.id,
      strategicHash,
      lockedAt: new Date().toISOString(),
      version,
      immutableFields,
      status: 'LOCKED',
    };
  }

  /**
   * Verifies if a given StrategyLock accurately matches the current blueprint's strategic fields.
   */
  public verifyLock(lock: StrategyLock, blueprint: CreativeBlueprint): boolean {
    if (lock.blueprintId !== blueprint.id) {
      return false;
    }

    if (lock.status !== 'LOCKED') {
      return false;
    }

    const currentFields = this.extractStrategicFields(blueprint);
    const currentHash = this.computeStrategicHash(currentFields);

    return currentHash === lock.strategicHash;
  }
}
