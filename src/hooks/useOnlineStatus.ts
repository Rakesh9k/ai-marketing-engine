'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/**
 * `navigator.onLine` as reactive state. It is only a hint (true does not guarantee the
 * server is reachable), so it is used to *report* a lost connection, never to block actions.
 * The server snapshot is `true` so SSR and the first client render agree.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
}
