import type {
  CreativeAssetPlanDocument,
  CreativeAssetDocument,
  CreativeAssetPlanRepository,
  CreativeAssetRepository,
} from "../types";

export class FirestoreCreativeAssetPlanRepository implements CreativeAssetPlanRepository {
  private plans = new Map<string, CreativeAssetPlanDocument>();

  public async get(assetPlanId: string): Promise<CreativeAssetPlanDocument | null> {
    return this.plans.get(assetPlanId) || null;
  }

  public async getBySession(sessionId: string, revision: number): Promise<CreativeAssetPlanDocument | null> {
    for (const plan of this.plans.values()) {
      if (plan.sessionId === sessionId && plan.revision === revision) {
        return plan;
      }
    }
    return null;
  }

  public async create(plan: CreativeAssetPlanDocument): Promise<void> {
    this.plans.set(plan.assetPlanId, plan);
  }

  public async updateStatus(assetPlanId: string, status: string): Promise<void> {
    const plan = this.plans.get(assetPlanId);
    if (plan) {
      plan.status = status;
      plan.updatedAt = new Date().toISOString();
    }
  }
}

export class FirestoreCreativeAssetRepository implements CreativeAssetRepository {
  private assets = new Map<string, CreativeAssetDocument>();

  public async create(asset: CreativeAssetDocument): Promise<void> {
    this.assets.set(asset.assetId, asset);
  }

  public async get(assetId: string): Promise<CreativeAssetDocument | null> {
    return this.assets.get(assetId) || null;
  }

  public async listByPlan(assetPlanId: string): Promise<CreativeAssetDocument[]> {
    const result: CreativeAssetDocument[] = [];
    for (const asset of this.assets.values()) {
      if (asset.assetPlanId === assetPlanId) {
        result.push(asset);
      }
    }
    return result;
  }
}
