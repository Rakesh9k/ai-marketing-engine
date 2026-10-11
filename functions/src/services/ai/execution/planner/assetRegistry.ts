/**
 * PHASE 18 — Asset Registry Service
 * Manages normalized execution assets, supporting both pre-existing asset selection
 * (e.g. logos, brand photos) and newly generated asset storage with full provenance.
 */

import type { AssetProvenance, AssetSourceType, ExecutionAsset } from '../types/execution.types';

export class AssetRegistry {
  private readonly assets: Map<string, ExecutionAsset> = new Map();

  /**
   * Registers a new asset in the execution asset registry.
   */
  public registerAsset(
    campaignId: string,
    type: string,
    source: AssetSourceType,
    storagePath: string,
    mimeType: string,
    dimensions?: { width?: number; height?: number; durationMs?: number },
    metadata?: Record<string, unknown>,
    provenance?: AssetProvenance
  ): ExecutionAsset {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const asset: ExecutionAsset = {
      id,
      campaignId,
      type,
      source,
      storagePath,
      mimeType,
      width: dimensions?.width,
      height: dimensions?.height,
      durationMs: dimensions?.durationMs,
      metadata,
      provenance,
    };

    this.assets.set(id, asset);
    return asset;
  }

  /**
   * Retrieves an asset by ID.
   */
  public getAsset(id: string): ExecutionAsset | undefined {
    return this.assets.get(id);
  }

  /**
   * Finds existing assets by campaign and type.
   */
  public findAssets(campaignId: string, type?: string): ExecutionAsset[] {
    return Array.from(this.assets.values()).filter(
      (a) => a.campaignId === campaignId && (!type || a.type === type)
    );
  }

  /**
   * Clears registry state for testing.
   */
  public clear(): void {
    this.assets.clear();
  }
}
