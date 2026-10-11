/**
 * PHASE 26 — Strategic Tension Master Service Facade
 * Public API facade for Strategic Tension Detection & Resolution.
 * Connects detector, classifier, resolver, behavioral tracking, and creative memory.
 */

import type {
  StrategicTension,
  StrategicTensionMemory,
} from './strategicTension.types';
import type { BusinessProfileSnapshot } from './strategicTensionDetector';
import { StrategicTensionDetector } from './strategicTensionDetector';
import type { TensionResolutionOutcome } from './strategicTensionResolver';
import { StrategicTensionResolver } from './strategicTensionResolver';

export class StrategicTensionService {
  private detector: StrategicTensionDetector = new StrategicTensionDetector();
  private resolver: StrategicTensionResolver = new StrategicTensionResolver();

  private activeTensions: Map<string, StrategicTension> = new Map();
  private memoryRecords: Map<string, StrategicTensionMemory[]> = new Map();

  /**
   * Evaluates user instruction against Business Brain positioning and returns tension if present.
   */
  public evaluateTension(
    tenantId: string,
    businessId: string,
    campaignId: string,
    userInstruction: string,
    profile: BusinessProfileSnapshot
  ): StrategicTension | null {
    const tension = this.detector.detectTension(
      tenantId,
      businessId,
      campaignId,
      userInstruction,
      profile
    );

    if (tension) {
      this.activeTensions.set(campaignId, tension);
    } else {
      this.activeTensions.delete(campaignId);
    }

    return tension;
  }

  /**
   * Resolves detected tension based on user's choice.
   */
  public resolveTension(
    campaignId: string,
    selectedOptionId: string
  ): TensionResolutionOutcome {
    const tension = this.activeTensions.get(campaignId);
    if (!tension) {
      throw new Error(`No active strategic tension found for campaign ${campaignId}`);
    }

    const outcome = this.resolver.resolveTension(tension, selectedOptionId);

    // Save memory record
    const bizMemories = this.memoryRecords.get(tension.businessId) || [];
    bizMemories.push(outcome.memoryRecord);
    this.memoryRecords.set(tension.businessId, bizMemories);

    this.activeTensions.delete(campaignId);
    return outcome;
  }

  /**
   * Retrieves active tension for a campaign.
   */
  public getActiveTension(campaignId: string): StrategicTension | undefined {
    return this.activeTensions.get(campaignId);
  }

  /**
   * Retrieves tension history for a business.
   */
  public getTensionHistory(businessId: string): StrategicTensionMemory[] {
    return this.memoryRecords.get(businessId) || [];
  }
}
