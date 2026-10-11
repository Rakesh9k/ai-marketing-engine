/**
 * PHASE 22 — Creative Behavior Service Facade
 * Master coordinator facade managing user behavior event recording, explicit preferences,
 * preference profiling, and Creative Brain context generation.
 */

import { BehaviorRecorder } from './behaviorRecorder';
import type {
  CreativeBehaviorEvent,
  CreativeBrainPreferenceContext,
  CreativePreferenceOverride,
  CreativePreferenceProfile,
  ExplicitCreativePreference,
} from './behavior.types';
import { PreferenceEngine } from './preferenceEngine';
import { PreferenceProfileService } from './preferenceProfileService';

export class CreativeBehaviorService {
  private readonly recorder: BehaviorRecorder;
  private readonly preferenceEngine: PreferenceEngine;
  private readonly profileService: PreferenceProfileService;

  private readonly explicitStore: Map<string, ExplicitCreativePreference[]>; // businessId -> explicits
  private readonly overrideStore: Map<string, CreativePreferenceOverride[]>; // businessId -> overrides

  constructor(
    recorder?: BehaviorRecorder,
    preferenceEngine?: PreferenceEngine,
    profileService?: PreferenceProfileService
  ) {
    this.recorder = recorder || new BehaviorRecorder();
    this.preferenceEngine = preferenceEngine || new PreferenceEngine();
    this.profileService = profileService || new PreferenceProfileService();

    this.explicitStore = new Map<string, ExplicitCreativePreference[]>();
    this.overrideStore = new Map<string, CreativePreferenceOverride[]>();
  }

  /**
   * Records a user behavior event with server-side validation and idempotency check.
   */
  public recordEvent(event: CreativeBehaviorEvent): CreativeBehaviorEvent | null {
    return this.recorder.recordEvent(event);
  }

  /**
   * Records an explicit user preference statement (confidence = 1.0).
   */
  public recordExplicitPreference(explicit: ExplicitCreativePreference): void {
    const existing = this.explicitStore.get(explicit.businessId) || [];
    existing.unshift(explicit);
    this.explicitStore.set(explicit.businessId, existing);
  }

  /**
   * Registers a user preference override.
   */
  public recordOverride(businessId: string, override: CreativePreferenceOverride): void {
    const existing = this.overrideStore.get(businessId) || [];
    existing.unshift(override);
    this.overrideStore.set(businessId, existing);
  }

  /**
   * Retrieves the aggregated CreativePreferenceProfile for a business.
   */
  public getPreferenceProfile(tenantId: string, businessId: string): CreativePreferenceProfile {
    const events = this.recorder.getEvents(tenantId, businessId);
    const explicits = this.explicitStore.get(businessId) || [];
    const overrides = this.overrideStore.get(businessId) || [];

    const signals = this.preferenceEngine.evaluatePreferences(events, explicits, overrides);
    return this.profileService.buildProfile(businessId, signals);
  }

  /**
   * Builds the compact CreativeBrainPreferenceContext injected into Creative Brain concept synthesis.
   */
  public getPreferenceContextForBrain(tenantId: string, businessId: string): CreativeBrainPreferenceContext {
    const profile = this.getPreferenceProfile(tenantId, businessId);
    const explicits = this.explicitStore.get(businessId) || [];
    const events = this.recorder.getEvents(tenantId, businessId);
    const signals = this.preferenceEngine.evaluatePreferences(events, explicits);

    const relevantSignals = signals
      .filter((s) => s.confidence >= 0.40)
      .map((s) => ({
        dimension: s.dimension,
        preferredValue: s.preferredValue || s.disfavoredValue || '',
        confidence: s.confidence,
        evidenceCount: s.positiveEvidence + s.negativeEvidence,
      }));

    return {
      profile,
      relevantSignals,
      explicitPreferences: explicits,
      exploitRatio: 0.70, // 70% preference-aligned
      exploreRatio: 0.30, // 30% controlled exploration
      advisoryStatement:
        'These user preferences are advisory and must not override Business Brain constraints, Truth checks, or current campaign intent.',
    };
  }

  /**
   * Clears in-memory data (for test cleanup).
   */
  public clear(): void {
    this.recorder.clear();
    this.explicitStore.clear();
    this.overrideStore.clear();
  }
}
