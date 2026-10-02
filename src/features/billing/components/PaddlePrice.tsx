'use client';

import { formattedPrice, type PaddlePricesState } from '../usePaddlePrices';

/**
 * Renders a price exactly as Paddle returned it (`formattedTotals.total`).
 *
 * No formatting, symbol handling, rounding or arithmetic happens here — the string is
 * presentation-ready. While loading it shows a placeholder bar; on failure/unconfigured it
 * shows an explicit "unavailable" — never a hard-coded or computed price.
 */
export function PaddlePrice({
  state,
  priceId,
  className,
}: {
  state: PaddlePricesState;
  priceId: string | undefined;
  className?: string;
}) {
  const value = formattedPrice(state, priceId);
  if (value !== undefined) {
    return <span className={className}>{value}</span>;
  }
  if (state.status === 'loading') {
    return (
      <span
        role="status"
        aria-busy="true"
        aria-label="Loading price"
        className="inline-block h-7 w-24 animate-pulse rounded bg-neutral-200 align-middle"
      />
    );
  }
  return (
    <span className={`${className ?? ''} text-text-tertiary text-base font-semibold`}>
      Price unavailable
    </span>
  );
}

/** Explains why prices are not showing, with a retry for transient failures. */
export function PriceStatusBanner({
  state,
  onRetry,
}: {
  state: PaddlePricesState;
  onRetry: () => void;
}) {
  if (state.status === 'ready' || state.status === 'loading') return null;

  return (
    <div
      role="alert"
      className="border-warning-200 bg-warning-50 text-warning-800 mx-auto mt-6 flex max-w-xl flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center text-sm"
    >
      {state.status === 'unconfigured' ? (
        <>
          <p className="font-semibold">Billing isn&apos;t configured in this environment.</p>
          <p className="text-xs opacity-80">{state.reason}</p>
        </>
      ) : (
        <>
          <p className="font-semibold">We couldn&apos;t load prices right now.</p>
          <p className="text-xs opacity-80">{state.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-bold underline underline-offset-2"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
