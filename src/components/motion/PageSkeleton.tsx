import { ShimmerLoader } from './ShimmerLoader';

interface PageSkeletonProps {
  /** cards: stat row + card grid; list: stacked rows; form: label/field pairs */
  variant?: 'cards' | 'list' | 'form';
  /** Accessible name announced to screen readers. */
  label?: string;
  className?: string;
}

/** Content-shaped loading placeholder for data-loading page states. */
export function PageSkeleton({
  variant = 'cards',
  label = 'Loading',
  className = '',
}: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 ${className}`.trim()}
    >
      <div className="space-y-2">
        <ShimmerLoader width="min(260px, 60%)" height="28px" />
        <ShimmerLoader width="min(420px, 85%)" height="14px" />
      </div>

      {variant === 'cards' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <ShimmerLoader key={i} height="84px" borderRadius="16px" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ShimmerLoader key={i} height="168px" borderRadius="20px" />
            ))}
          </div>
        </>
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ShimmerLoader key={i} height="72px" borderRadius="16px" />
          ))}
        </div>
      )}

      {variant === 'form' && (
        <div className="max-w-2xl space-y-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <ShimmerLoader width="120px" height="12px" />
              <ShimmerLoader height="44px" borderRadius="12px" />
            </div>
          ))}
        </div>
      )}

      <span className="sr-only">{label}…</span>
    </div>
  );
}
