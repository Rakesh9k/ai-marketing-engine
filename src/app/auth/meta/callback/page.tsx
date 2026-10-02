'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MetaCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateId = searchParams.get('stateId');
  const error = searchParams.get('error');

  useEffect(() => {
    if (stateId) {
      router.replace(`/settings/social?stateId=${encodeURIComponent(stateId)}`);
    }
  }, [stateId, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          <h2 className="text-lg font-bold">Meta Connection Error</h2>
          <p className="mt-2 text-sm">{error}</p>
          <button
            onClick={() => router.push('/settings/social')}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Return to Social Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-64 flex-col items-center justify-center space-y-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Completing Meta authentication...
      </p>
    </div>
  );
}

export default function MetaCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Loading callback...
        </div>
      }
    >
      <MetaCallbackHandler />
    </Suspense>
  );
}
