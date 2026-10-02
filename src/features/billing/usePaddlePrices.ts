'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { tryGetPaddleClientConfig } from '@/lib/paddle/config';
import { allPriceIds, getPaddleCatalog, type PaddleCatalog } from '@/lib/paddle/catalog';
import { previewPrices, type FormattedPrices } from '@/lib/paddle/initPaddle';

export type PaddlePricesState =
  | { status: 'unconfigured'; reason: string }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; prices: FormattedPrices };

/**
 * Loads Paddle's localized, pre-formatted prices for every configured price ID.
 *
 * Contract: while loading or on failure NO price is available — callers must render a
 * skeleton / error, never a hard-coded or computed substitute.
 *
 * `countryCode` must already be sanitised (undefined => Paddle auto-detects from IP).
 */
export function usePaddlePrices(countryCode?: string): {
  state: PaddlePricesState;
  catalog: PaddleCatalog;
  retry: () => void;
} {
  const catalog = useMemo(() => getPaddleCatalog(), []);
  const [attempt, setAttempt] = useState(0);

  const configProbe = useMemo(() => tryGetPaddleClientConfig(), []);
  const ids = useMemo(() => allPriceIds(catalog), [catalog]);

  const initial: PaddlePricesState = !configProbe.ok
    ? { status: 'unconfigured', reason: configProbe.reason }
    : ids.length === 0
      ? { status: 'unconfigured', reason: 'No Paddle price IDs are configured.' }
      : { status: 'loading' };
  const [state, setState] = useState<PaddlePricesState>(initial);

  useEffect(() => {
    if (initial.status === 'unconfigured') {
      setState(initial);
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    previewPrices(ids, countryCode)
      .then((prices) => {
        if (cancelled) return;
        setState({ status: 'ready', prices });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load prices',
        });
      });
    return () => {
      cancelled = true;
    };
    // `initial` is derived from stable memoised values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, countryCode, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, catalog, retry };
}

/** Paddle's formatted total for a price ID, or undefined if not (yet) available. */
export function formattedPrice(state: PaddlePricesState, priceId: string | undefined) {
  if (state.status !== 'ready' || !priceId) return undefined;
  return state.prices[priceId];
}
