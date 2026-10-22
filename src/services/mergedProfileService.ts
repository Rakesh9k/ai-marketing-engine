// Service to fetch merged profile data (business, brand, design) in parallel

import { businessService } from '@/services/database';
import { brandKitService } from '@/services/database';
import { designService } from '@/services/database';
import type { Business, BrandKit, DesignIdentity } from '@/types';

/**
 * Fetches business, brand, and design data for a given user ID.
 * Returns an object containing the three entities (or null if not found).
 */
export const mergedProfileService = {
  async fetchAll(userId: string): Promise<{
    business: Business | null;
    brand: BrandKit | null;
    design: DesignIdentity | null;
  }> {
    const [business, brand, design] = await Promise.all([
      businessService.getByUserId(userId).catch(() => null),
      brandKitService.getByUserId(userId).catch(() => null),
      designService.getByUserId(userId).catch(() => null),
    ]);
    return { business, brand, design };
  },
};
