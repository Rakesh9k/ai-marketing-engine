/**
 * PHASE 22 — Behavior Event Recorder
 * Server-side event recorder enforcing tenant & business isolation, idempotency check,
 * and completion state verification.
 */

import type { CreativeBehaviorEvent } from './behavior.types';

export class BehaviorRecorder {
  private readonly eventStore: Map<string, CreativeBehaviorEvent[]>; // tenantId:businessId -> events
  private readonly processedIdempotencyKeys: Set<string>;

  constructor() {
    this.eventStore = new Map<string, CreativeBehaviorEvent[]>();
    this.processedIdempotencyKeys = new Set<string>();
  }

  /**
   * Records a user behavior event with server-side validation and idempotency protection.
   */
  public recordEvent(event: CreativeBehaviorEvent): CreativeBehaviorEvent | null {
    // 1. Idempotency Protection
    const key = event.idempotencyKey || event.id;
    if (this.processedIdempotencyKeys.has(key)) {
      // Event already recorded (duplicate execution/retry)
      return null;
    }

    // 2. Validate Tenant & Business IDs
    if (!event.tenantId || !event.businessId) {
      throw new Error('Tenant ID and Business ID are mandatory for behavior event recording');
    }

    // 3. Ignore failed system actions for negative preference generation
    if (event.systemActionCompleted === false && event.eventType.includes('REGENERATED')) {
      // Record raw event with metadata but do not process for negative signal
      event.metadata = { ...event.metadata, ignoredForPreference: true };
    }

    this.processedIdempotencyKeys.add(key);

    const storeKey = `${event.tenantId}:${event.businessId}`;
    const existing = this.eventStore.get(storeKey) || [];
    existing.unshift(event); // Newest first
    this.eventStore.set(storeKey, existing);

    return event;
  }

  /**
   * Retrieves recorded events for a specific business.
   */
  public getEvents(tenantId: string, businessId: string): CreativeBehaviorEvent[] {
    const storeKey = `${tenantId}:${businessId}`;
    return this.eventStore.get(storeKey) || [];
  }

  /**
   * Clears event store (for unit testing).
   */
  public clear(): void {
    this.eventStore.clear();
    this.processedIdempotencyKeys.clear();
  }
}
