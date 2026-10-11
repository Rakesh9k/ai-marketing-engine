/**
 * PHASE 27 — Industry Pack Registry
 * Central repository registering and serving versioned Industry Creative Intelligence Packs.
 */

import type { IndustryCreativePack, IndustryType } from '../industryPack.types';
import { RESTAURANT_PACK_V1 } from '../packs/restaurant.pack';
import { SALON_PACK_V1 } from '../packs/salon.pack';
import { REAL_ESTATE_PACK_V1 } from '../packs/realEstate.pack';
import { GENERIC_LOCAL_PACK_V1 } from '../packs/generic.pack';

export class IndustryPackRegistry {
  private packs: Map<string, IndustryCreativePack> = new Map();

  constructor() {
    this.register(RESTAURANT_PACK_V1);
    this.register(SALON_PACK_V1);
    this.register(REAL_ESTATE_PACK_V1);
    this.register(GENERIC_LOCAL_PACK_V1);
  }

  /**
   * Registers an industry pack.
   */
  public register(pack: IndustryCreativePack): void {
    const key = `${pack.industry}_${pack.version}`.toUpperCase();
    this.packs.set(key, pack);
    this.packs.set(pack.id, pack);
  }

  /**
   * Retrieves active pack by industry type and optional version.
   */
  public get(industry: IndustryType, version: string = '1.0.0'): IndustryCreativePack | null {
    const key = `${industry}_${version}`.toUpperCase();
    if (this.packs.has(key)) {
      return this.packs.get(key)!;
    }
    // Fallback to active pack for industry
    for (const pack of this.packs.values()) {
      if (pack.industry === industry && pack.status === 'ACTIVE') {
        return pack;
      }
    }
    return null;
  }

  /**
   * Retrieves pack by its exact ID.
   */
  public getById(packId: string): IndustryCreativePack | null {
    return this.packs.get(packId) || null;
  }

  /**
   * Lists all active packs.
   */
  public listActive(): IndustryCreativePack[] {
    const active: IndustryCreativePack[] = [];
    for (const pack of this.packs.values()) {
      if (pack.status === 'ACTIVE' && !active.some((p) => p.id === pack.id)) {
        active.push(pack);
      }
    }
    return active;
  }
}
