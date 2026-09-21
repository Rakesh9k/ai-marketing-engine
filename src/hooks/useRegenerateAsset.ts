'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase/client';
import type { CampaignAsset, AssetType } from '@/types';
import { useToast } from '@/hooks/useToast';

interface RegenerateAssetOptions {
  campaignId: string;
  assetId: string;
  assetType: AssetType;
  regenerationInstruction?: string;
  idempotencyKey: string;
}

interface RegenerateAssetResult {
  assetId: string;
  asset: CampaignAsset;
  truthCheckStatus: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  truthCheckSummary?: string;
  creditsUsed: number;
}

export function useRegenerateAsset() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // getFirebaseFunctions() returns undefined during SSR (no `window`), so this
  // must not throw here — only when regenerateAsset() is actually invoked
  // client-side, otherwise every page rendering this hook 500s on first load.
  const functions = useMemo(() => getFirebaseFunctions(), []);

  const regenerateAsset = useCallback(
    async (options: RegenerateAssetOptions): Promise<RegenerateAssetResult | null> => {
      if (!user) {
        setError('User not authenticated');
        showToast('Please sign in to regenerate assets', 'error');
        return null;
      }

      if (!functions) {
        setError('Firebase Functions not initialized');
        showToast('Something went wrong. Please refresh and try again.', 'error');
        return null;
      }

      const assetKey = `${options.assetType}-${options.assetId}`;
      setIsRegenerating(assetKey);
      setError(null);

      try {
        const regenerateFn = httpsCallable<RegenerateAssetOptions, RegenerateAssetResult>(
          functions,
          'regenerateAsset'
        );

        const result = await regenerateFn({
          ...options,
          idempotencyKey: crypto.randomUUID(),
        });

        showToast(
          `Asset regenerated successfully (${result.data.creditsUsed} credits used)`,
          'success'
        );
        return result.data;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to regenerate asset';
        setError(errorMessage);

        if (err.code === 'failed-precondition' || err.code === 'resource-exhausted') {
          showToast('Insufficient credits to regenerate this asset', 'error');
        } else {
          showToast(errorMessage, 'error');
        }
        return null;
      } finally {
        setIsRegenerating(null);
      }
    },
    [user, showToast, functions]
  );

  return {
    regenerateAsset,
    isRegenerating,
    error,
    isAssetRegenerating: (assetId: string, assetType: AssetType) =>
      isRegenerating === `${assetType}-${assetId}`,
  };
}
